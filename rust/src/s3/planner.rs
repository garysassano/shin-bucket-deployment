use std::collections::{BTreeMap, HashMap, HashSet};
use std::io;

use anyhow::{Context, Result, anyhow};
use async_zip::base::read::seek::ZipFileReader;
use async_zip::{Compression, StoredZipEntry};
use crc32fast::Hasher as Crc32Hasher;
use sha2::{Digest, Sha256};
use tokio::io::AsyncReadExt;

use crate::request::{join_s3_key, normalize_archive_key, source_basename};
use crate::types::{
    AppState, DeploymentManifest, DeploymentRequest, DeploymentStats, Filters, PlannedAction,
    PlannedObject, SourceArchive, TrustedEntryIntegrity,
};

use super::archive::{
    S3RangeReader, SourceBlockOptions, SourceBlockStore, SourceByteBudget, prepare_source_zip,
    validate_zip_entry_output, validate_zip_entry_size_not_exceeded, zip_entry_reader,
};
use super::destination::{DestinationObject, destination_etag_matches, normalize_etag};
use super::{
    EMBEDDED_CATALOG_MAX_BYTES, EMBEDDED_CATALOG_PATH, EMBEDDED_CATALOG_VERSION,
    S3_OBJECT_KEY_MAX_BYTES, S3_SINGLE_COPY_LIMIT, S3_SINGLE_PUT_LIMIT,
    source_window_bytes_for_archive,
};

const RESERVED_CATALOG_V2_PATH: &str = ".shin/catalog.v2.json";

#[derive(Clone, Debug)]
pub(super) struct CopyPlan {
    pub(super) source_bucket: String,
    pub(super) source_key: String,
    pub(super) expected_etag: Option<String>,
    pub(super) destination_key: String,
    pub(super) size: Option<u64>,
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
    pub(super) trusted_integrity: Option<TrustedEntryIntegrity>,
    pub(super) source_offset: u64,
    pub(super) source_span_end: u64,
}

struct ArchivePlanningContext<'a> {
    request: &'a DeploymentRequest,
    filters: &'a Filters,
    stats: &'a DeploymentStats,
    source_budget: std::sync::Arc<SourceByteBudget>,
}

impl ZipEntryPlan {
    pub(super) fn validate_trusted_md5(&self, actual_md5: &str) -> io::Result<()> {
        let Some(expected) = &self.trusted_integrity else {
            return Ok(());
        };
        if expected.size == self.size && expected.md5 == actual_md5 {
            return Ok(());
        }

        tracing::warn!(
            source_index = self.source_index,
            catalog_trust = "failed",
            catalog_reason = "entry_mismatch",
            "source catalog trust evaluated"
        );
        Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "authenticated catalog entry does not match source ZIP bytes for `{}`",
                self.relative_key
            ),
        ))
    }
}

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct EmbeddedCatalog {
    version: u32,
    entries: Vec<EmbeddedCatalogEntry>,
}

#[derive(Debug, serde::Deserialize)]
#[serde(deny_unknown_fields)]
struct EmbeddedCatalogEntry {
    path: String,
    size: u64,
    md5: String,
}

pub(super) fn validate_request_lengths(request: &DeploymentRequest) -> Result<()> {
    if request.source_bucket_names.len() != request.source_object_keys.len() {
        return Err(anyhow!(
            "SourceBucketNames and SourceObjectKeys must be the same length"
        ));
    }
    if request.source_catalogs.len() != request.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceCatalogs and SourceBucketNames must be the same length"
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
    stats: &DeploymentStats,
    source_budget: std::sync::Arc<SourceByteBudget>,
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
            stats.add_source_archive(source.len());
            archives.push(SourceArchive {
                source: source.clone(),
            });

            add_archive_entries_to_manifest(
                archive_index,
                source_index,
                source,
                ArchivePlanningContext {
                    request,
                    filters,
                    stats,
                    source_budget: std::sync::Arc::clone(&source_budget),
                },
                &mut manifest,
            )
            .await?;
        } else {
            let relative_key = source_basename(&request.source_object_keys[source_index])?;
            if !filters.should_include(&relative_key) {
                stats.add_filtered_entry();
                continue;
            }
            let (expected_etag, size) = source_object_metadata(
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
                    action: PlannedAction::CopyObject { source_index, size },
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
) -> Result<Vec<CopyPlan>> {
    let mut plans = Vec::new();

    for planned in manifest.values() {
        match planned.action {
            PlannedAction::CopyObject { source_index, size } => {
                let destination_key =
                    join_s3_key(&request.dest_bucket_prefix, &planned.relative_key);
                let content_changed = request.destination_checksum_strategy
                    == crate::types::DestinationChecksumStrategy::KmsSha256
                    || planned.expected_etag.as_deref().is_none_or(|etag| {
                        !destination_etag_matches(destination_objects, &planned.relative_key, etag)
                    });
                if !content_changed {
                    continue;
                }
                validate_copy_object_size(&planned.relative_key, size)?;
                plans.push(CopyPlan {
                    source_bucket: request.source_bucket_names[source_index].clone(),
                    source_key: request.source_object_keys[source_index].clone(),
                    expected_etag: planned.expected_etag.clone(),
                    destination_key,
                    size,
                });
            }
            PlannedAction::ZipEntry { .. } => {}
        }
    }

    Ok(plans)
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
            trusted_integrity,
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
                    trusted_integrity: trusted_integrity.clone(),
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

async fn source_object_metadata(
    state: &AppState,
    bucket: &str,
    key: &str,
) -> Result<(Option<String>, Option<u64>)> {
    let response = state
        .source_s3
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to read source object metadata s3://{bucket}/{key}"))?;

    let size = response
        .content_length()
        .and_then(|size| u64::try_from(size).ok());
    Ok((response.e_tag().and_then(normalize_etag), size))
}

async fn add_archive_entries_to_manifest(
    archive_index: usize,
    source_index: usize,
    source: std::sync::Arc<super::archive::SourceClient>,
    context: ArchivePlanningContext<'_>,
    manifest: &mut DeploymentManifest,
) -> Result<()> {
    let ArchivePlanningContext {
        request,
        filters,
        stats,
        source_budget,
    } = context;
    let reader = S3RangeReader::new(source.clone(), request.runtime.source_block_bytes);
    let reader = ZipFileReader::with_tokio(reader)
        .await
        .context("failed to read zip archive central directory")?;
    let zip_file = reader.file().clone();
    let entries = zip_file.entries();
    validate_archive_directory(entries, source.len())?;
    let catalog = if let Some(expected) = &request.source_catalogs[source_index] {
        match load_authenticated_catalog(
            source.clone(),
            request,
            entries,
            &expected.sha256,
            source_budget,
        )
        .await
        {
            Ok(catalog) => {
                stats.add_trusted_catalog(catalog.len() as u64);
                tracing::info!(
                    source_index,
                    catalog_trust = "trusted",
                    catalog_reason = "catalog_authenticated",
                    "source catalog trust evaluated"
                );
                catalog
            }
            Err(error) => {
                tracing::warn!(
                    source_index,
                    catalog_trust = "failed",
                    catalog_reason = "catalog_mismatch",
                    "source catalog trust evaluated"
                );
                return Err(error.context("authenticated source catalog validation failed"));
            }
        }
    } else {
        stats.add_untrusted_catalog();
        tracing::info!(
            source_index,
            catalog_trust = "untrusted",
            catalog_reason = "absent_binding",
            "source catalog trust evaluated"
        );
        HashMap::new()
    };
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
        if is_reserved_catalog_path(&relative_key) {
            continue;
        }
        if !seen.insert(relative_key.clone()) {
            return Err(anyhow!("duplicate ZIP file path `{relative_key}`"));
        }
        validate_stored_file_entry(stored, &relative_key)?;
        if !filters.should_include(&relative_key) {
            stats.add_filtered_entry();
            continue;
        }
        if !request.source_markers[source_index].is_empty() {
            stats.add_marker_entry();
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
                    trusted_integrity: catalog.get(&relative_key).cloned(),
                    source_offset,
                    source_span_end,
                },
            },
        );
    }

    Ok(())
}

async fn load_authenticated_catalog(
    source: std::sync::Arc<super::archive::SourceClient>,
    request: &DeploymentRequest,
    entries: &[StoredZipEntry],
    expected_sha256: &[u8; 32],
    source_budget: std::sync::Arc<SourceByteBudget>,
) -> Result<HashMap<String, TrustedEntryIntegrity>> {
    let stored = authenticated_catalog_entry(entries)?;

    if stored.uncompressed_size() > EMBEDDED_CATALOG_MAX_BYTES
        || stored.compressed_size() > EMBEDDED_CATALOG_MAX_BYTES
    {
        return Err(anyhow!("embedded source catalog exceeds its size limit"));
    }

    let plan = zip_entry_plan(
        source.len(),
        0,
        0,
        stored,
        EMBEDDED_CATALOG_PATH.to_string(),
    )?;
    let store = SourceBlockStore::new(
        source.clone(),
        std::slice::from_ref(&plan),
        SourceBlockOptions {
            block_bytes: request.runtime.source_block_bytes,
            merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
            get_concurrency: request.runtime.source_get_concurrency,
            window_bytes: source_window_bytes_for_archive(&request.runtime, source.len(), 1),
        },
        source_budget,
    );
    let mut reader = zip_entry_reader(store, plan.clone())?;
    let mut bytes = Vec::new();
    let mut crc32 = Crc32Hasher::new();
    let mut total_bytes = 0_u64;
    let mut buffer = vec![0_u8; 64 * 1024];
    loop {
        let read = reader
            .read(&mut buffer)
            .await
            .context("embedded source catalog could not be read")?;
        if read == 0 {
            break;
        }
        let next_bytes = total_bytes.saturating_add(read as u64);
        if next_bytes > EMBEDDED_CATALOG_MAX_BYTES {
            return Err(anyhow!("embedded source catalog exceeds its size limit"));
        }
        validate_zip_entry_size_not_exceeded(&plan, next_bytes)?;
        crc32.update(&buffer[..read]);
        bytes.extend_from_slice(&buffer[..read]);
        total_bytes = next_bytes;
    }
    validate_zip_entry_output(&plan, total_bytes, crc32.finalize())?;
    let catalog = authenticate_catalog_bytes(&bytes, expected_sha256)?;
    validate_catalog_entries(catalog, entries)
}

fn authenticated_catalog_entry(entries: &[StoredZipEntry]) -> Result<&StoredZipEntry> {
    let mut catalogs = Vec::new();
    let mut reserved_v2_count = 0_usize;
    for stored in entries {
        match stored_zip_file_path(stored)?.as_deref() {
            Some(EMBEDDED_CATALOG_PATH) => catalogs.push(stored),
            Some(RESERVED_CATALOG_V2_PATH) => reserved_v2_count += 1,
            _ => {}
        }
    }
    if catalogs.len() != 1 {
        return Err(anyhow!(
            "trusted source must contain exactly one embedded v1 catalog"
        ));
    }
    if reserved_v2_count != 0 {
        return Err(anyhow!(
            "trusted source contains unsupported reserved catalog metadata"
        ));
    }
    Ok(catalogs[0])
}

fn authenticate_catalog_bytes(bytes: &[u8], expected_sha256: &[u8; 32]) -> Result<EmbeddedCatalog> {
    let actual_sha256 = Sha256::digest(bytes);
    if actual_sha256.as_slice() != expected_sha256 {
        return Err(anyhow!(
            "embedded source catalog digest does not match its binding"
        ));
    }

    serde_json::from_slice::<EmbeddedCatalog>(bytes)
        .context("embedded source catalog could not be parsed")
}

fn validate_catalog_entries(
    catalog: EmbeddedCatalog,
    zip_entries: &[StoredZipEntry],
) -> Result<HashMap<String, TrustedEntryIntegrity>> {
    if catalog.version != EMBEDDED_CATALOG_VERSION {
        return Err(anyhow!(
            "embedded source catalog uses an unsupported version"
        ));
    }

    let mut result = HashMap::new();
    for entry in catalog.entries {
        let path = normalize_archive_key(&entry.path)?;
        if path != entry.path {
            return Err(anyhow!(
                "embedded source catalog contains a non-canonical path"
            ));
        }
        if is_reserved_catalog_path(&path) {
            return Err(anyhow!(
                "embedded source catalog contains a reserved metadata path"
            ));
        }
        if !is_lowercase_md5(&entry.md5) {
            return Err(anyhow!(
                "embedded source catalog contains a malformed MD5 digest"
            ));
        }
        if result
            .insert(
                path,
                TrustedEntryIntegrity {
                    size: entry.size,
                    md5: entry.md5,
                },
            )
            .is_some()
        {
            return Err(anyhow!("embedded source catalog contains a duplicate path"));
        }
    }

    let mut files = HashMap::new();
    for stored in zip_entries {
        let Some(path) = stored_zip_file_path(stored)? else {
            continue;
        };
        if is_reserved_catalog_path(&path) {
            continue;
        }
        validate_stored_file_entry(stored, &path)?;
        if files.insert(path, stored.uncompressed_size()).is_some() {
            return Err(anyhow!(
                "source ZIP contains a duplicate normalized file path"
            ));
        }
    }

    if result.len() != files.len() {
        return Err(anyhow!(
            "embedded source catalog and source ZIP file sets do not match"
        ));
    }
    for (path, integrity) in &result {
        let Some(zip_size) = files.get(path) else {
            return Err(anyhow!(
                "embedded source catalog and source ZIP file sets do not match"
            ));
        };
        if *zip_size != integrity.size {
            return Err(anyhow!(
                "embedded source catalog entry size does not match the source ZIP"
            ));
        }
    }

    Ok(result)
}

fn is_reserved_catalog_path(path: &str) -> bool {
    path == EMBEDDED_CATALOG_PATH || path == RESERVED_CATALOG_V2_PATH
}

fn is_lowercase_md5(value: &str) -> bool {
    value.len() == 32
        && value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
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
        trusted_integrity: None,
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

pub(super) fn validate_deployment_preflight(
    request: &DeploymentRequest,
    manifest: &DeploymentManifest,
) -> Result<()> {
    let mut total_output_bytes = 0_u64;
    for planned in manifest.values() {
        let destination_key = join_s3_key(&request.dest_bucket_prefix, &planned.relative_key);
        let key_bytes = destination_key.len();
        if key_bytes > S3_OBJECT_KEY_MAX_BYTES {
            return Err(anyhow!(
                "destination key for `{}` is {key_bytes} UTF-8 bytes, larger than the S3 1024-byte limit",
                planned.relative_key
            ));
        }

        let size = match planned.action {
            PlannedAction::CopyObject { source_index, size } => {
                request
                    .source_bucket_names
                    .get(source_index)
                    .ok_or_else(|| {
                        anyhow!("copy plan references missing source index {source_index}")
                    })?;
                request
                    .source_object_keys
                    .get(source_index)
                    .ok_or_else(|| {
                        anyhow!("copy plan references missing source index {source_index}")
                    })?;
                validate_copy_object_size(&planned.relative_key, size)?;
                size
            }
            PlannedAction::ZipEntry { size, .. } => {
                if size > S3_SINGLE_PUT_LIMIT {
                    return Err(anyhow!(
                        "entry `{}` is {size} bytes, larger than the S3 single PutObject limit",
                        planned.relative_key
                    ));
                }
                Some(size)
            }
        };
        if let Some(size) = size {
            total_output_bytes = total_output_bytes
                .checked_add(size)
                .ok_or_else(|| anyhow!("deployment output size arithmetic overflowed"))?;
        }
    }
    Ok(())
}

fn validate_archive_directory(entries: &[StoredZipEntry], source_len: u64) -> Result<()> {
    let _entry_count = u64::try_from(entries.len())
        .map_err(|_| anyhow!("source ZIP entry count cannot be represented safely"))?;
    let mut totals = (0_u64, 0_u64);

    for stored in entries {
        totals =
            checked_archive_totals(totals, stored.compressed_size(), stored.uncompressed_size())?;
        let span_end = stored
            .header_offset()
            .checked_add(stored.header_size())
            .and_then(|offset| offset.checked_add(stored.compressed_size()))
            .ok_or_else(|| anyhow!("source ZIP central directory arithmetic overflowed"))?;
        if span_end > source_len {
            return Err(anyhow!(
                "source ZIP central directory references data beyond the source object"
            ));
        }
    }

    Ok(())
}

fn checked_archive_totals(
    current: (u64, u64),
    compressed_size: u64,
    uncompressed_size: u64,
) -> Result<(u64, u64)> {
    Ok((
        current
            .0
            .checked_add(compressed_size)
            .ok_or_else(|| anyhow!("source ZIP compressed-size total overflowed"))?,
        current
            .1
            .checked_add(uncompressed_size)
            .ok_or_else(|| anyhow!("source ZIP uncompressed-size total overflowed"))?,
    ))
}

fn validate_copy_object_size(path: &str, size: Option<u64>) -> Result<()> {
    let Some(size) = size else {
        return Ok(());
    };
    if size > S3_SINGLE_COPY_LIMIT {
        return Err(anyhow!(
            "source object `{path}` is {size} bytes, larger than the S3 single CopyObject limit"
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
    use std::collections::HashMap;
    use std::io::{Cursor, Write};

    use async_zip::base::read::seek::ZipFileReader;
    use sha2::{Digest, Sha256};
    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{
        EmbeddedCatalog, EmbeddedCatalogEntry, S3_SINGLE_COPY_LIMIT, S3_SINGLE_PUT_LIMIT,
        authenticate_catalog_bytes, authenticated_catalog_entry, checked_archive_totals,
        collect_copy_plans, collect_zip_entry_plans, validate_catalog_entries,
        validate_deployment_preflight,
    };
    use crate::request::compile_filters;
    use crate::s3::destination::DestinationObject;
    use crate::types::{
        DeploymentManifest, DeploymentRequest, DestinationChecksumStrategy, MarkerConfig,
        PlannedAction, PlannedObject, PutObjectRetryJitter, PutObjectRetryOptions, RuntimeOptions,
    };

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
                    trusted_integrity: None,
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
                    trusted_integrity: None,
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
    fn copy_plans_carry_source_etag_for_conditional_copy() {
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "archive.zip".to_string(),
            PlannedObject {
                relative_key: "archive.zip".to_string(),
                expected_etag: Some("abc123".to_string()),
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: Some(1024),
                },
            },
        );

        let request = copy_request();
        let plans = collect_copy_plans(&manifest, &request, &HashMap::new()).expect("valid copy");

        assert_eq!(plans.len(), 1);
        assert_eq!(plans[0].expected_etag.as_deref(), Some("abc123"));
        assert_eq!(plans[0].destination_key, "site/archive.zip");
    }

    #[test]
    fn kms_destinations_bypass_matching_destination_etags() {
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "archive.zip".to_string(),
            PlannedObject {
                relative_key: "archive.zip".to_string(),
                expected_etag: Some("abc123".to_string()),
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: Some(1024),
                },
            },
        );
        let destination = HashMap::from([(
            "archive.zip".to_string(),
            DestinationObject {
                etag: Some("abc123".to_string()),
                size: Some(1024),
            },
        )]);
        let request = copy_request();
        let unchanged = collect_copy_plans(&manifest, &request, &destination).unwrap();
        assert!(unchanged.is_empty());

        let mut kms_request = request;
        kms_request.destination_checksum_strategy = DestinationChecksumStrategy::KmsSha256;
        let kms = collect_copy_plans(&manifest, &kms_request, &destination).unwrap();
        assert_eq!(kms.len(), 1, "KMS destination ETags are not plaintext MD5");
    }

    #[test]
    fn destination_key_preflight_uses_the_complete_utf8_byte_length() {
        let request = copy_request();
        let manifest = manifest_with_key(&"é".repeat(512));
        validate_deployment_preflight(&request, &manifest)
            .expect_err("prefix plus a 1024-byte relative key must exceed the limit");

        let mut root_request = request;
        root_request.dest_bucket_prefix.clear();
        validate_deployment_preflight(&root_request, &manifest)
            .expect("an exact 1024-byte UTF-8 key is valid");

        let oversized = manifest_with_key(&format!("{}a", "é".repeat(512)));
        assert!(validate_deployment_preflight(&root_request, &oversized).is_err());
    }

    #[test]
    fn archive_aggregate_size_arithmetic_is_checked() {
        assert_eq!(checked_archive_totals((1, 2), 3, 4).unwrap(), (4, 6));
        assert!(checked_archive_totals((u64::MAX, 0), 1, 0).is_err());
        assert!(checked_archive_totals((0, u64::MAX), 0, 1).is_err());
    }

    #[test]
    fn deployment_preflight_rejects_entries_larger_than_single_put_limit() {
        let request = copy_request();
        let manifest = DeploymentManifest::from([(
            "large.bin".to_string(),
            PlannedObject {
                relative_key: "large.bin".to_string(),
                expected_etag: None,
                action: PlannedAction::ZipEntry {
                    archive_index: 0,
                    source_index: 0,
                    size: S3_SINGLE_PUT_LIMIT + 1,
                    compressed_size: 1,
                    compression_code: 0,
                    crc32: 0,
                    trusted_integrity: None,
                    source_offset: 0,
                    source_span_end: 1,
                },
            },
        )]);

        assert!(validate_deployment_preflight(&request, &manifest).is_err());
    }

    #[test]
    fn copy_plans_reject_sources_larger_than_single_copy_limit() {
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "large.bin".to_string(),
            PlannedObject {
                relative_key: "large.bin".to_string(),
                expected_etag: Some("abc123".to_string()),
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: Some(S3_SINGLE_COPY_LIMIT + 1),
                },
            },
        );

        let request = copy_request();
        let error = collect_copy_plans(&manifest, &request, &HashMap::new())
            .expect_err("oversized source should be rejected");

        assert!(
            error
                .to_string()
                .contains("larger than the S3 single CopyObject limit")
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
    fn catalog_bytes_require_the_bound_sha256_and_strict_json() {
        let bytes = br#"{"version":1,"entries":[]}"#;
        let expected: [u8; 32] = Sha256::digest(bytes).into();

        let catalog = authenticate_catalog_bytes(bytes, &expected).expect("authenticated catalog");
        assert_eq!(catalog.version, 1);

        let wrong = [0x42; 32];
        let error = authenticate_catalog_bytes(bytes, &wrong).expect_err("wrong binding must fail");
        assert!(!error.to_string().contains(&hex_string(&wrong)));

        let unknown = br#"{"version":1,"entries":[],"secret":"do-not-log"}"#;
        let unknown_digest: [u8; 32] = Sha256::digest(unknown).into();
        let error = authenticate_catalog_bytes(unknown, &unknown_digest)
            .expect_err("unknown fields must fail");
        assert!(!error.to_string().contains("do-not-log"));

        let unknown_entry = br#"{"version":1,"entries":[{"path":"index","size":1,"md5":"00000000000000000000000000000000","extra":"do-not-log"}]}"#;
        let unknown_entry_digest: [u8; 32] = Sha256::digest(unknown_entry).into();
        let error = authenticate_catalog_bytes(unknown_entry, &unknown_entry_digest)
            .expect_err("unknown entry fields must fail");
        assert!(!error.to_string().contains("do-not-log"));
    }

    #[tokio::test]
    async fn trusted_sources_require_exactly_one_v1_catalog_and_no_reserved_v2_entry() {
        for (entries, should_succeed) in [
            (vec![("index.html", b"index" as &[u8])], false),
            (
                vec![
                    (".shin/catalog.v1.json", b"one" as &[u8]),
                    (".shin//catalog.v1.json", b"two" as &[u8]),
                ],
                false,
            ),
            (
                vec![
                    (".shin/catalog.v1.json", b"one" as &[u8]),
                    (".shin/catalog.v2.json", b"two" as &[u8]),
                ],
                false,
            ),
            (vec![(".shin/catalog.v1.json", b"one" as &[u8])], true),
        ] {
            let bytes = zip_bytes_from_entries(&entries, false);
            let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
            let zip = reader.file().clone();
            assert_eq!(
                authenticated_catalog_entry(zip.entries()).is_ok(),
                should_succeed
            );
        }
    }

    #[tokio::test]
    async fn authenticated_catalog_requires_a_strict_one_to_one_zip_mapping() {
        let bytes = zip_bytes_from_entries(
            &[
                ("index.html", b"index" as &[u8]),
                (".shin/catalog.v1.json", b"catalog" as &[u8]),
            ],
            false,
        );
        let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
        let zip = reader.file().clone();
        let valid = || EmbeddedCatalog {
            version: 1,
            entries: vec![EmbeddedCatalogEntry {
                path: "index.html".to_string(),
                size: 5,
                md5: "6a992d5529f459a44fee58c733255e86".to_string(),
            }],
        };

        let mapped = validate_catalog_entries(valid(), zip.entries()).expect("valid mapping");
        assert_eq!(mapped["index.html"].size, 5);

        let mut wrong_version = valid();
        wrong_version.version = 2;
        assert!(validate_catalog_entries(wrong_version, zip.entries()).is_err());

        let mut wrong_size = valid();
        wrong_size.entries[0].size = 6;
        assert!(validate_catalog_entries(wrong_size, zip.entries()).is_err());

        let mut malformed_md5 = valid();
        malformed_md5.entries[0].md5 = "ABCDEF".repeat(5) + "AB";
        assert!(validate_catalog_entries(malformed_md5, zip.entries()).is_err());

        let mut non_canonical = valid();
        non_canonical.entries[0].path = "nested/../index.html".to_string();
        assert!(validate_catalog_entries(non_canonical, zip.entries()).is_err());

        let mut duplicate = valid();
        duplicate.entries.push(EmbeddedCatalogEntry {
            path: "index.html".to_string(),
            size: 5,
            md5: "6a992d5529f459a44fee58c733255e86".to_string(),
        });
        assert!(validate_catalog_entries(duplicate, zip.entries()).is_err());

        let mut extra = valid();
        extra.entries.push(EmbeddedCatalogEntry {
            path: "extra.html".to_string(),
            size: 5,
            md5: "6a992d5529f459a44fee58c733255e86".to_string(),
        });
        assert!(validate_catalog_entries(extra, zip.entries()).is_err());

        let missing = EmbeddedCatalog {
            version: 1,
            entries: Vec::new(),
        };
        assert!(validate_catalog_entries(missing, zip.entries()).is_err());
    }

    #[tokio::test]
    async fn provider_mapping_accepts_small_entries_with_zip64_metadata() {
        let bytes = zip_bytes_from_entries(
            &[
                ("index.html", b"index" as &[u8]),
                (".shin/catalog.v1.json", b"catalog" as &[u8]),
            ],
            true,
        );
        let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
        let zip = reader.file().clone();
        let catalog = EmbeddedCatalog {
            version: 1,
            entries: vec![EmbeddedCatalogEntry {
                path: "index.html".to_string(),
                size: 5,
                md5: "6a992d5529f459a44fee58c733255e86".to_string(),
            }],
        };

        validate_catalog_entries(catalog, zip.entries()).expect("ZIP64 mapping should validate");
    }

    #[tokio::test]
    async fn authenticated_mapping_rejects_duplicate_normalized_zip_paths() {
        let bytes = zip_bytes_from_entries(
            &[
                ("a\\b.txt", b"first" as &[u8]),
                ("a/b.txt", b"second" as &[u8]),
                (".shin/catalog.v1.json", b"catalog" as &[u8]),
            ],
            false,
        );
        let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
        let zip = reader.file().clone();
        let catalog = EmbeddedCatalog {
            version: 1,
            entries: vec![EmbeddedCatalogEntry {
                path: "a/b.txt".to_string(),
                size: 5,
                md5: "8b04d5e3775d298e78455efc5ca404d5".to_string(),
            }],
        };

        assert!(validate_catalog_entries(catalog, zip.entries()).is_err());
    }

    fn copy_request() -> DeploymentRequest {
        DeploymentRequest {
            source_bucket_names: vec!["source-bucket".to_string()],
            source_object_keys: vec!["assets/archive.zip".to_string()],
            source_catalogs: vec![None],
            source_markers: vec![HashMap::new()],
            source_markers_config: vec![MarkerConfig::default()],
            dest_bucket_name: "destination-bucket".to_string(),
            dest_bucket_prefix: "site".to_string(),
            extract: false,
            delete_current_objects_on_delete: false,
            distribution_id: None,
            distribution_paths: vec!["/*".to_string()],
            wait_for_distribution_invalidation: true,
            destination_checksum_strategy: DestinationChecksumStrategy::SseS3Etag,
            delete_stale_objects_on_deployment: true,
            exclude: Vec::new(),
            include: Vec::new(),
            output_object_keys: true,
            destination_bucket_arn: None,
            destination_owner_id: Some("test-owner".to_string()),
            delete_previous_objects_on_change: None,
            invalidate_previous_distribution_on_change: None,
            runtime: RuntimeOptions {
                available_memory_mb: 1024,
                max_parallel_transfers: 1,
                source_block_bytes: 8 * 1024 * 1024,
                source_block_merge_gap_bytes: 256 * 1024,
                source_get_concurrency: 1,
                source_window_bytes: None,
                source_memory_budget_bytes: 256 * 1024 * 1024,
                put_object_retry: PutObjectRetryOptions {
                    max_attempts: 1,
                    retry_base_delay_ms: 1,
                    retry_max_delay_ms: 1,
                    slowdown_retry_base_delay_ms: 1,
                    slowdown_retry_max_delay_ms: 1,
                    jitter: PutObjectRetryJitter::None,
                },
            },
        }
    }

    fn manifest_with_key(key: &str) -> DeploymentManifest {
        DeploymentManifest::from([(
            key.to_string(),
            PlannedObject {
                relative_key: key.to_string(),
                expected_etag: None,
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: Some(1),
                },
            },
        )])
    }

    fn zip_from_entries(entries: &[(&str, &[u8])]) -> zip::ZipArchive<Cursor<Vec<u8>>> {
        let bytes = zip_bytes_from_entries(entries, false);
        zip::ZipArchive::new(Cursor::new(bytes)).unwrap()
    }

    fn zip_bytes_from_entries(entries: &[(&str, &[u8])], zip64: bool) -> Vec<u8> {
        let cursor = Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(cursor);
        let options = SimpleFileOptions::default().large_file(zip64);

        for (name, bytes) in entries {
            writer.start_file(name, options).unwrap();
            writer.write_all(bytes).unwrap();
        }

        writer.finish().unwrap().into_inner()
    }

    fn hex_string(bytes: &[u8]) -> String {
        bytes.iter().map(|byte| format!("{byte:02x}")).collect()
    }
}
