use std::collections::{BTreeMap, HashMap, HashSet};

use anyhow::{Context, Result, anyhow};
use async_zip::base::read::seek::ZipFileReader;
use async_zip::{Compression, StoredZipEntry};
use crc32fast::Hasher as Crc32Hasher;
use tokio::io::AsyncReadExt;

use crate::request::{join_s3_key, normalize_archive_key, source_basename};
use crate::types::{
    AppState, DeploymentManifest, DeploymentRequest, Filters, PlannedAction, PlannedObject,
    SourceArchive,
};

use super::archive::{
    S3RangeReader, SourceBlockOptions, SourceBlockStore, prepare_source_zip,
    validate_zip_entry_output, validate_zip_entry_size_not_exceeded, zip_entry_reader,
};
use super::destination::{DestinationObject, destination_etag_matches, normalize_etag};
use super::{
    EMBEDDED_CATALOG_MAX_BYTES, EMBEDDED_CATALOG_PATH, EMBEDDED_CATALOG_VERSION,
    source_window_bytes_for_archive,
};

const S3_SINGLE_PUT_LIMIT: u64 = 5 * 1024 * 1024 * 1024;

#[derive(Clone)]
pub(super) struct CopyPlan {
    pub(super) source_bucket: String,
    pub(super) source_key: String,
    pub(super) destination_key: String,
}

#[derive(Clone, Debug)]
pub(crate) struct ZipEntryPlan {
    pub(super) source_index: usize,
    pub(super) relative_key: String,
    pub(super) destination_key: String,
    pub(super) size: u64,
    pub(super) compressed_size: u64,
    pub(super) compression_code: u16,
    pub(super) crc32: u32,
    pub(super) catalog_md5: Option<String>,
    pub(super) source_offset: u64,
    pub(super) source_span_end: u64,
}

#[derive(serde::Deserialize)]
struct EmbeddedCatalog {
    version: u32,
    entries: Vec<EmbeddedCatalogEntry>,
}

#[derive(serde::Deserialize)]
struct EmbeddedCatalogEntry {
    path: String,
    md5: String,
}

pub(super) fn validate_request_lengths(request: &DeploymentRequest) -> Result<()> {
    if request.source_bucket_names.len() != request.source_object_keys.len() {
        return Err(anyhow!(
            "SourceBucketNames and SourceObjectKeys must be the same length"
        ));
    }
    if request.source_markers.len() != request.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceMarkers and SourceBucketNames must be the same length"
        ));
    }
    if request.source_markers_config.len() != request.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceMarkersConfig and SourceBucketNames must be the same length"
        ));
    }

    Ok(())
}

pub(super) async fn plan_deployment(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
) -> Result<(Vec<SourceArchive>, DeploymentManifest)> {
    let mut archives = Vec::new();
    let mut manifest = DeploymentManifest::new();

    for source_index in 0..request.source_bucket_names.len() {
        if request.extract {
            let source = prepare_source_zip(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;
            let archive_index = archives.len();
            archives.push(SourceArchive {
                source: source.clone(),
            });

            add_archive_entries_to_manifest(
                archive_index,
                source_index,
                source,
                request,
                filters,
                &mut manifest,
            )
            .await?;
        } else {
            let relative_key = source_basename(&request.source_object_keys[source_index])?;
            if !filters.should_include(&relative_key) {
                continue;
            }
            let expected_etag = source_object_etag(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;

            manifest.insert(
                relative_key.clone(),
                PlannedObject {
                    relative_key,
                    expected_etag,
                    action: PlannedAction::CopyObject { source_index },
                },
            );
        }
    }

    Ok((archives, manifest))
}

pub(super) fn collect_copy_plans(
    manifest: &DeploymentManifest,
    request: &DeploymentRequest,
    destination_objects: &HashMap<String, DestinationObject>,
) -> Vec<CopyPlan> {
    manifest
        .values()
        .filter_map(|planned| match planned.action {
            PlannedAction::CopyObject { source_index }
                if planned.expected_etag.as_deref().is_none_or(|etag| {
                    !destination_etag_matches(destination_objects, &planned.relative_key, etag)
                }) =>
            {
                Some(CopyPlan {
                    source_bucket: request.source_bucket_names[source_index].clone(),
                    source_key: request.source_object_keys[source_index].clone(),
                    destination_key: join_s3_key(
                        &request.dest_bucket_prefix,
                        &planned.relative_key,
                    ),
                })
            }
            PlannedAction::ZipEntry { .. } => None,
            PlannedAction::CopyObject { .. } => None,
        })
        .collect()
}

pub(super) fn collect_zip_entry_plans(
    manifest: &DeploymentManifest,
    destination_prefix: &str,
) -> BTreeMap<usize, Vec<ZipEntryPlan>> {
    let mut grouped = BTreeMap::<usize, Vec<ZipEntryPlan>>::new();

    for planned in manifest.values() {
        if let PlannedAction::ZipEntry {
            archive_index,
            source_index,
            size,
            compressed_size,
            compression_code,
            crc32,
            catalog_md5,
            source_offset,
            source_span_end,
        } = &planned.action
        {
            grouped
                .entry(*archive_index)
                .or_default()
                .push(ZipEntryPlan {
                    source_index: *source_index,
                    relative_key: planned.relative_key.clone(),
                    destination_key: join_s3_key(destination_prefix, &planned.relative_key),
                    size: *size,
                    compressed_size: *compressed_size,
                    compression_code: *compression_code,
                    crc32: *crc32,
                    catalog_md5: catalog_md5.clone(),
                    source_offset: *source_offset,
                    source_span_end: *source_span_end,
                });
        }
    }

    for plans in grouped.values_mut() {
        plans.sort_by_key(|plan| plan.source_offset);
    }

    grouped
}

async fn source_object_etag(state: &AppState, bucket: &str, key: &str) -> Result<Option<String>> {
    let response = state
        .source_s3
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to read source object metadata s3://{bucket}/{key}"))?;

    Ok(response.e_tag().and_then(normalize_etag))
}

async fn add_archive_entries_to_manifest(
    archive_index: usize,
    source_index: usize,
    source: std::sync::Arc<super::archive::SourceClient>,
    request: &DeploymentRequest,
    filters: &Filters,
    manifest: &mut DeploymentManifest,
) -> Result<()> {
    let reader = S3RangeReader::new(source.clone(), request.runtime.source_block_bytes);
    let reader = ZipFileReader::with_tokio(reader)
        .await
        .context("failed to read zip archive central directory")?;
    let zip_file = reader.file().clone();
    let entries = zip_file.entries();
    let catalog = load_embedded_catalog(source.clone(), request, entries).await;
    let mut source_offsets = entries
        .iter()
        .map(StoredZipEntry::header_offset)
        .collect::<Vec<_>>();
    source_offsets.sort_unstable();
    let mut seen = HashSet::new();

    for stored in entries {
        let Some(relative_key) = stored_zip_file_path(stored)? else {
            continue;
        };
        if relative_key == EMBEDDED_CATALOG_PATH {
            continue;
        }
        if !seen.insert(relative_key.clone()) {
            return Err(anyhow!("duplicate ZIP file path `{relative_key}`"));
        }
        validate_stored_file_entry(stored, &relative_key)?;
        if !filters.should_include(&relative_key) {
            continue;
        }

        let source_offset = stored.header_offset();
        if source_offset >= source.len() {
            return Err(anyhow!(
                "local file header offset {source_offset} for `{relative_key}` is outside source ZIP length {}",
                source.len()
            ));
        }
        let payload_span_end = source_offset
            .checked_add(stored.header_size())
            .and_then(|offset| offset.checked_add(stored.compressed_size()))
            .ok_or_else(|| {
                anyhow!("central directory entry source span overflowed for `{relative_key}`")
            })?;
        if payload_span_end > source.len() {
            return Err(anyhow!(
                "central directory entry `{relative_key}` source span ends at {payload_span_end}, beyond source ZIP length {}",
                source.len()
            ));
        }
        let source_span_end = next_source_offset(&source_offsets, source_offset)
            .unwrap_or(payload_span_end)
            .min(payload_span_end);
        if source_span_end <= source_offset {
            return Err(anyhow!(
                "local file source span {source_offset}..{source_span_end} for `{relative_key}` is empty"
            ));
        }

        manifest.insert(
            relative_key.clone(),
            PlannedObject {
                relative_key: relative_key.clone(),
                expected_etag: None,
                action: PlannedAction::ZipEntry {
                    archive_index,
                    source_index,
                    size: stored.uncompressed_size(),
                    compressed_size: stored.compressed_size(),
                    compression_code: u16::from(stored.compression()),
                    crc32: stored.crc32(),
                    catalog_md5: catalog.get(&relative_key).cloned(),
                    source_offset,
                    source_span_end,
                },
            },
        );
    }

    Ok(())
}

async fn load_embedded_catalog(
    source: std::sync::Arc<super::archive::SourceClient>,
    request: &DeploymentRequest,
    entries: &[StoredZipEntry],
) -> HashMap<String, String> {
    let Some(stored) = entries.iter().find(|stored| {
        stored_zip_file_path(stored).ok().flatten().as_deref() == Some(EMBEDDED_CATALOG_PATH)
    }) else {
        return HashMap::new();
    };

    if stored.uncompressed_size() > EMBEDDED_CATALOG_MAX_BYTES
        || stored.compressed_size() > EMBEDDED_CATALOG_MAX_BYTES
    {
        tracing::debug!(
            catalog_size = stored.uncompressed_size(),
            catalog_compressed_size = stored.compressed_size(),
            "embedded source catalog is too large"
        );
        return HashMap::new();
    }

    let Ok(plan) = zip_entry_plan(
        source.len(),
        0,
        0,
        stored,
        EMBEDDED_CATALOG_PATH.to_string(),
    ) else {
        tracing::debug!("embedded source catalog could not be planned");
        return HashMap::new();
    };
    let store = SourceBlockStore::new(
        source.clone(),
        std::slice::from_ref(&plan),
        SourceBlockOptions {
            block_bytes: request.runtime.source_block_bytes,
            merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
            get_concurrency: request.runtime.source_get_concurrency,
            window_bytes: source_window_bytes_for_archive(&request.runtime, source.len(), 1),
        },
    );
    let Ok(mut reader) = zip_entry_reader(store, plan.clone()) else {
        tracing::debug!("embedded source catalog could not be opened");
        return HashMap::new();
    };
    let mut bytes = Vec::new();
    let mut crc32 = Crc32Hasher::new();
    let mut total_bytes = 0_u64;
    let mut buffer = vec![0_u8; 64 * 1024];
    loop {
        let read = match reader.read(&mut buffer).await {
            Ok(read) => read,
            Err(error) => {
                tracing::debug!(%error, "embedded source catalog could not be read");
                return HashMap::new();
            }
        };
        if read == 0 {
            break;
        }
        let next_bytes = total_bytes.saturating_add(read as u64);
        if next_bytes > EMBEDDED_CATALOG_MAX_BYTES
            || validate_zip_entry_size_not_exceeded(&plan, next_bytes).is_err()
        {
            tracing::debug!("embedded source catalog exceeded size limit while reading");
            return HashMap::new();
        }
        crc32.update(&buffer[..read]);
        bytes.extend_from_slice(&buffer[..read]);
        total_bytes = next_bytes;
    }
    if let Err(error) = validate_zip_entry_output(&plan, total_bytes, crc32.finalize()) {
        tracing::debug!(%error, "embedded source catalog failed ZIP validation");
        return HashMap::new();
    }

    match serde_json::from_slice::<EmbeddedCatalog>(&bytes) {
        Ok(catalog) => catalog_md5_by_path(catalog),
        Err(error) => {
            tracing::debug!(%error, "embedded source catalog could not be parsed");
            HashMap::new()
        }
    }
}

fn catalog_md5_by_path(catalog: EmbeddedCatalog) -> HashMap<String, String> {
    if catalog.version != EMBEDDED_CATALOG_VERSION {
        return HashMap::new();
    }

    let mut result = HashMap::new();
    for entry in catalog.entries {
        let Ok(path) = normalize_archive_key(&entry.path) else {
            continue;
        };
        if path == EMBEDDED_CATALOG_PATH {
            continue;
        }
        let Some(md5) = normalize_etag(&entry.md5) else {
            continue;
        };
        result.insert(path, md5);
    }
    result
}

fn zip_entry_plan(
    source_len: u64,
    _archive_index: usize,
    source_index: usize,
    stored: &StoredZipEntry,
    relative_key: String,
) -> Result<ZipEntryPlan> {
    let source_offset = stored.header_offset();
    if source_offset >= source_len {
        return Err(anyhow!(
            "local file header offset {source_offset} for `{relative_key}` is outside source ZIP length {source_len}"
        ));
    }
    let source_span_end = source_offset
        .checked_add(stored.header_size())
        .and_then(|offset| offset.checked_add(stored.compressed_size()))
        .ok_or_else(|| {
            anyhow!("central directory entry source span overflowed for `{relative_key}`")
        })?;
    if source_span_end > source_len {
        return Err(anyhow!(
            "central directory entry `{relative_key}` source span ends at {source_span_end}, beyond source ZIP length {source_len}"
        ));
    }

    Ok(ZipEntryPlan {
        source_index,
        relative_key: relative_key.clone(),
        destination_key: relative_key,
        size: stored.uncompressed_size(),
        compressed_size: stored.compressed_size(),
        compression_code: u16::from(stored.compression()),
        crc32: stored.crc32(),
        catalog_md5: None,
        source_offset,
        source_span_end,
    })
}

fn stored_zip_file_path(stored: &StoredZipEntry) -> Result<Option<String>> {
    let raw_path = stored.filename().as_str().map_err(|err| {
        anyhow!(
            "invalid ZIP entry path {:?}: {err}",
            stored.filename().as_bytes()
        )
    })?;
    let normalized = normalize_archive_key(raw_path)?;
    if raw_path.ends_with('/') {
        Ok(None)
    } else {
        Ok(Some(normalized))
    }
}

fn validate_stored_file_entry(stored: &StoredZipEntry, path: &str) -> Result<()> {
    match stored.compression() {
        Compression::Stored | Compression::Deflate => {}
        other => {
            return Err(anyhow!(
                "unsupported compression method {other:?} for `{path}`"
            ));
        }
    }

    let size = stored.uncompressed_size();
    if size > S3_SINGLE_PUT_LIMIT {
        return Err(anyhow!(
            "entry `{path}` is {size} bytes, larger than the S3 single PutObject limit"
        ));
    }

    Ok(())
}

fn next_source_offset(sorted_offsets: &[u64], offset: u64) -> Option<u64> {
    let index = sorted_offsets.partition_point(|candidate| *candidate <= offset);
    sorted_offsets.get(index).copied()
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};

    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{
        EmbeddedCatalog, EmbeddedCatalogEntry, catalog_md5_by_path, collect_zip_entry_plans,
    };
    use crate::request::compile_filters;
    use crate::types::{DeploymentManifest, PlannedAction, PlannedObject};

    #[test]
    fn zip_entry_plans_are_grouped_and_sorted_by_source_offset() {
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "b.txt".to_string(),
            PlannedObject {
                relative_key: "b.txt".to_string(),
                expected_etag: None,
                action: PlannedAction::ZipEntry {
                    archive_index: 0,
                    source_index: 0,
                    size: 1,
                    compressed_size: 1,
                    compression_code: 0,
                    crc32: 0,
                    catalog_md5: None,
                    source_offset: 100,
                    source_span_end: 120,
                },
            },
        );
        manifest.insert(
            "a.txt".to_string(),
            PlannedObject {
                relative_key: "a.txt".to_string(),
                expected_etag: None,
                action: PlannedAction::ZipEntry {
                    archive_index: 0,
                    source_index: 0,
                    size: 1,
                    compressed_size: 1,
                    compression_code: 0,
                    crc32: 0,
                    catalog_md5: None,
                    source_offset: 10,
                    source_span_end: 30,
                },
            },
        );

        let plans = collect_zip_entry_plans(&manifest, "site");

        assert_eq!(
            plans[&0]
                .iter()
                .map(|plan| (plan.source_offset, plan.destination_key.as_str()))
                .collect::<Vec<_>>(),
            vec![(10, "site/a.txt"), (100, "site/b.txt")]
        );
    }

    #[test]
    fn compile_filters_keeps_existing_glob_behavior() {
        let filters = compile_filters(&["*.map".to_string()], &[]).unwrap();

        assert!(!filters.should_include("debug.map"));
        assert!(filters.should_include("index.html"));
    }

    #[test]
    fn zip_test_fixture_still_builds() {
        let mut zip = zip_from_entries(&[("index.html", b"index" as &[u8])]);
        assert_eq!(zip.len(), 1);
        assert_eq!(zip.by_index(0).unwrap().name(), "index.html");
    }

    #[test]
    fn embedded_catalog_normalizes_valid_md5_entries() {
        let catalog = EmbeddedCatalog {
            version: 1,
            entries: vec![
                EmbeddedCatalogEntry {
                    path: "index.html".to_string(),
                    md5: "\"ABC123\"".to_string(),
                },
                EmbeddedCatalogEntry {
                    path: ".s3-unspool/catalog.v1.json".to_string(),
                    md5: "ignored".to_string(),
                },
            ],
        };

        let catalog = catalog_md5_by_path(catalog);

        assert_eq!(
            catalog.get("index.html").map(String::as_str),
            Some("abc123")
        );
        assert!(!catalog.contains_key(".s3-unspool/catalog.v1.json"));
    }

    fn zip_from_entries(entries: &[(&str, &[u8])]) -> zip::ZipArchive<Cursor<Vec<u8>>> {
        let cursor = Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(cursor);
        let options = SimpleFileOptions::default();

        for (name, bytes) in entries {
            writer.start_file(name, options).unwrap();
            writer.write_all(bytes).unwrap();
        }

        let cursor = writer.finish().unwrap();
        zip::ZipArchive::new(Cursor::new(cursor.into_inner())).unwrap()
    }
}
