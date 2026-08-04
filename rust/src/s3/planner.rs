use std::borrow::Cow;
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
    SourceBlockOptions, SourceBlockStore, SourceByteBudget, prepare_source_zip,
    prepare_zip_directory_reader, validate_zip_entry_output, validate_zip_entry_size_not_exceeded,
    zip_entry_reader,
};
use super::destination::{
    DestinationObject, DestinationWritePrecondition, destination_etag_matches,
    destination_write_precondition, normalize_etag,
};
use super::{
    EMBEDDED_CATALOG_MAX_BYTES, EMBEDDED_CATALOG_PATH, EMBEDDED_CATALOG_VERSION,
    S3_OBJECT_KEY_MAX_BYTES, S3_SINGLE_COPY_LIMIT, S3_SINGLE_PUT_LIMIT,
    source_window_bytes_for_archive,
};

const RESERVED_CATALOG_V2_PATH: &str = ".shin/catalog.v2.json";

/// Multiplier turning a catalog's declared size into its estimated peak resident cost.
/// See [`catalog_memory_estimate`].
const CATALOG_ALLOCATION_FACTOR: u64 = 4;

#[derive(Clone, Debug)]
pub(super) struct CopyPlan {
    pub(super) source_bucket: String,
    pub(super) source_key: String,
    pub(super) expected_etag: String,
    pub(super) destination_key: String,
    pub(super) destination_precondition: Option<DestinationWritePrecondition>,
    pub(super) size: u64,
    /// A same-sized destination object exists whose `ETag` cannot prove the copy is
    /// current, so one `HeadObject` may still retire this plan. See
    /// [`copy_identity_probe_is_useful`].
    pub(super) identity_probe: bool,
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
    if request.source_bucket_names.is_empty() {
        return Err(anyhow!(
            "SourceBucketNames and SourceObjectKeys must contain at least one source"
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

            insert_manifest_object(
                &mut manifest,
                PlannedObject {
                    relative_key,
                    expected_etag: Some(expected_etag),
                    action: PlannedAction::CopyObject {
                        source_index,
                        size: Some(size),
                    },
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
                let content_changed = planned.expected_etag.as_deref().is_none_or(|etag| {
                    !destination_etag_matches(destination_objects, &planned.relative_key, etag)
                });
                if !content_changed {
                    continue;
                }
                validate_copy_object_size(&planned.relative_key, size)?;
                let expected_etag = planned.expected_etag.clone().ok_or_else(|| {
                    anyhow!(
                        "source metadata for `{}` did not contain a usable ETag",
                        planned.relative_key
                    )
                })?;
                let size = size.ok_or_else(|| {
                    anyhow!(
                        "source metadata for `{}` did not contain a valid content length",
                        planned.relative_key
                    )
                })?;
                let destination_object = destination_objects.get(&planned.relative_key);
                plans.push(CopyPlan {
                    source_bucket: request.source_bucket_names[source_index].clone(),
                    source_key: request.source_object_keys[source_index].clone(),
                    identity_probe: copy_identity_probe_is_useful(
                        destination_object,
                        &expected_etag,
                        size,
                    ),
                    expected_etag,
                    destination_key,
                    destination_precondition: destination_write_precondition(destination_object),
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

/// Decides whether a surviving copy plan deserves one `HeadObject` before the copy.
///
/// The listing-only fast path above compares the source `ETag` against the destination
/// `ETag`. A multipart source defeats that comparison structurally: its `ETag` is
/// `<md5>-<parts>`, while `CopyObject` writes a single-part destination whose `ETag` is a
/// plain MD5. The two can never be equal, so an unchanged multipart source would be
/// recopied on every deployment. A probe is only worth an API call when a destination
/// object of exactly the source's length already exists; anything else has to be copied
/// regardless.
///
fn copy_identity_probe_is_useful(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
    size: u64,
) -> bool {
    let destination_size_matches =
        destination_object.is_some_and(|object| object.size == Some(size));
    destination_size_matches && is_multipart_etag(expected_etag)
}

fn is_multipart_etag(etag: &str) -> bool {
    etag.contains('-')
}

async fn source_object_metadata(
    state: &AppState,
    bucket: &str,
    key: &str,
) -> Result<(String, u64)> {
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
        .and_then(|size| u64::try_from(size).ok())
        .ok_or_else(|| anyhow!("source object metadata did not contain a valid content length"))?;
    let etag = response
        .e_tag()
        .and_then(normalize_etag)
        .ok_or_else(|| anyhow!("source object metadata did not contain a usable ETag"))?;
    Ok((etag, size))
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
    let prepared = prepare_zip_directory_reader(
        source.clone(),
        request.runtime.source_block_bytes,
        std::sync::Arc::clone(&source_budget),
        request.source_catalogs[source_index]
            .as_ref()
            .map(|_| source.len().min(request.runtime.source_block_bytes as u64))
            .unwrap_or(0),
    )
    .await?;
    let central_directory_start = prepared.central_directory_start;
    let _planning_permit = prepared._planning_permit;
    let reader = ZipFileReader::with_tokio(prepared.reader)
        .await
        .context("failed to read zip archive central directory")?;
    let entries = reader.file().entries();
    let source_offsets =
        validate_archive_directory(entries, source.len(), central_directory_start)?;
    let catalog = if let Some(expected) = &request.source_catalogs[source_index] {
        match load_authenticated_catalog(
            source.clone(),
            request,
            entries,
            &source_offsets,
            central_directory_start,
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
    let mut seen = HashSet::new();

    for stored in entries {
        let Some(relative_key) = stored_zip_file_path(stored)? else {
            continue;
        };
        if is_reserved_catalog_path(&relative_key) {
            continue;
        }
        if !seen.insert(relative_key.clone().into_owned()) {
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
        // `source_span_end` is what keeps an entry's bytes out of the central directory:
        // `open_entry_data_reader` refuses a local header or data range extending past it,
        // so a hostile archive fails when the entry is opened rather than reading
        // directory bytes as entry content.
        //
        // The `.min` is defense in depth rather than the operative check — every offset
        // reaching here has already been proven to precede `central_directory_start` by
        // `validate_archive_directory`, so `next_source_offset` cannot return a larger
        // value. It is kept so this span stays self-evidently bounded without depending on
        // a precondition established in another function; don't drop it as redundant.
        let source_span_end = next_source_offset(&source_offsets, source_offset)
            .unwrap_or(central_directory_start)
            .min(central_directory_start);
        if source_span_end <= source_offset {
            return Err(anyhow!(
                "local file source span {source_offset}..{source_span_end} for `{relative_key}` is empty"
            ));
        }

        let trusted_integrity = catalog.get(relative_key.as_ref()).cloned();
        // The map key and `PlannedObject::relative_key` hold the same string. Build the
        // planned object from one clone and move the original into the map, rather than
        // allocating twice per entry.
        let relative_key = relative_key.into_owned();
        let planned = PlannedObject {
            relative_key: relative_key.clone(),
            expected_etag: None,
            action: PlannedAction::ZipEntry {
                archive_index,
                source_index,
                size: stored.uncompressed_size(),
                compressed_size: stored.compressed_size(),
                compression_code: u16::from(stored.compression()),
                crc32: stored.crc32(),
                trusted_integrity,
                source_offset,
                source_span_end,
            },
        };
        insert_manifest_object(manifest, planned);
    }

    Ok(())
}

fn insert_manifest_object(manifest: &mut DeploymentManifest, planned: PlannedObject) {
    let relative_key = planned.relative_key.clone();
    let replacement_source_index = planned_action_source_index(&planned.action);
    if let Some(previous) = manifest.insert(relative_key.clone(), planned) {
        tracing::warn!(
            destination_relative_key = %relative_key,
            previous_source_index = planned_action_source_index(&previous.action),
            replacement_source_index,
            "later source replaces an earlier source destination key"
        );
    }
}

fn planned_action_source_index(action: &PlannedAction) -> usize {
    match action {
        PlannedAction::CopyObject { source_index, .. }
        | PlannedAction::ZipEntry { source_index, .. } => *source_index,
    }
}

async fn load_authenticated_catalog(
    source: std::sync::Arc<super::archive::SourceClient>,
    request: &DeploymentRequest,
    entries: &[StoredZipEntry],
    source_offsets: &[u64],
    central_directory_start: u64,
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
        stored,
        EMBEDDED_CATALOG_PATH.to_string(),
        next_source_offset(source_offsets, stored.header_offset())
            .unwrap_or(central_directory_start)
            .min(central_directory_start),
    )?;

    // Charge the catalog against the source budget before allocating anything for it.
    // Planning is sequential, so the only permit outstanding here is this archive's
    // central-directory reservation: a refusal means the configured budget cannot fit
    // planning and this catalog together, which no amount of waiting would change.
    let catalog_permit = source_budget
        .try_reserve_planning(catalog_memory_estimate(stored.uncompressed_size())?)
        .map_err(|error| catalog_budget_error(error.to_string()))?;
    // The store below still has to fetch at least one block while that permit is held.
    // Checking now turns what would otherwise be a deadlock into an actionable error.
    if !source_budget.can_reserve_additional(catalog_source_block_bytes(request, &plan)) {
        return Err(catalog_budget_error(
            "no room remains for the source block that reads it".to_string(),
        ));
    }

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
    // Reserve the declared size up front. The read loop below refuses to append past
    // `plan.size`, which is that same declared size, so the buffer can never outgrow this
    // capacity and geometric reallocation cannot overshoot what was just charged.
    let mut bytes = Vec::new();
    bytes
        .try_reserve_exact(usize::try_from(stored.uncompressed_size()).map_err(|_| {
            anyhow!("embedded source catalog size does not fit this platform's address space")
        })?)
        .map_err(|_| anyhow!("embedded source catalog buffer could not be allocated"))?;
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
    // The raw buffer and the decoded catalog are simultaneously resident only across the
    // parse above; releasing the raw half here keeps the peak at that parse rather than
    // letting it grow again while the manifest map is built.
    drop(bytes);
    let manifest = validate_catalog_entries(catalog, entries);
    // The surviving map is charged to the central directory's per-entry metadata
    // estimate, so the catalog reservation ends with the transient buffers.
    drop(catalog_permit);
    manifest
}

/// Estimated peak resident bytes for processing a catalog of `uncompressed_size`.
///
/// The raw JSON buffer stays resident while `serde_json` builds the fully owned
/// `EmbeddedCatalog`, so the peak is raw plus decoded. Decoded is *not* bounded by the
/// JSON length: the smallest syntactically valid entry is 62 JSON bytes but decodes to an
/// 88-byte `EmbeddedCatalogEntry` plus its `Vec` capacity slack, and validation only
/// rejects such entries after the whole document has been decoded. The factor matches
/// `DIRECTORY_ALLOCATION_FACTOR` both because that measured worst case needs more than
/// double and because the two decoded-size estimates should not drift apart.
fn catalog_memory_estimate(uncompressed_size: u64) -> Result<u64> {
    uncompressed_size
        .checked_mul(CATALOG_ALLOCATION_FACTOR)
        .ok_or_else(|| anyhow!("embedded source catalog memory estimate overflowed"))
}

/// Bytes the catalog's own block fetch will need on top of the catalog reservation.
///
/// This is one block, not the store's window: the window is a multi-block retention
/// ceiling, while the budget is acquired per fetched block, and a block never exceeds the
/// entry's own source span.
fn catalog_source_block_bytes(request: &DeploymentRequest, plan: &ZipEntryPlan) -> u64 {
    u64::try_from(request.runtime.source_block_bytes)
        .unwrap_or(u64::MAX)
        .min(plan.source_span_end.saturating_sub(plan.source_offset))
}

fn catalog_budget_error(detail: String) -> anyhow::Error {
    anyhow!(
        "the embedded source catalog does not fit the invocation-global source budget: {detail}. \
         Raise `providerLambda.memorySize`, or raise `transfer.advancedTuning.sourceWindowMemoryBudgetMiB` if it was lowered explicitly"
    )
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
                path.into_owned(),
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
        if files
            .insert(path.into_owned(), stored.uncompressed_size())
            .is_some()
        {
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
    source_index: usize,
    stored: &StoredZipEntry,
    relative_key: String,
    source_span_end: u64,
) -> Result<ZipEntryPlan> {
    let source_offset = stored.header_offset();
    if source_offset >= source_len {
        return Err(anyhow!(
            "local file header offset {source_offset} for `{relative_key}` is outside source ZIP length {source_len}"
        ));
    }
    if source_span_end > source_len || source_span_end <= source_offset {
        return Err(anyhow!(
            "local file source span {source_offset}..{source_span_end} for `{relative_key}` is outside source ZIP length {source_len}"
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

/// Borrows out of `stored` when the entry path is already canonical, so the callers that
/// only compare or look the path up never allocate.
fn stored_zip_file_path(stored: &StoredZipEntry) -> Result<Option<Cow<'_, str>>> {
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
    for planned in manifest.values() {
        let destination_key = join_s3_key(&request.dest_bucket_prefix, &planned.relative_key);
        let key_bytes = destination_key.len();
        if key_bytes > S3_OBJECT_KEY_MAX_BYTES {
            return Err(anyhow!(
                "destination key for `{}` is {key_bytes} UTF-8 bytes, larger than the S3 1024-byte limit",
                planned.relative_key
            ));
        }

        match planned.action {
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
            }
            PlannedAction::ZipEntry { size, .. } => {
                if size > S3_SINGLE_PUT_LIMIT {
                    return Err(anyhow!(
                        "entry `{}` is {size} bytes, larger than the S3 single PutObject limit",
                        planned.relative_key
                    ));
                }
            }
        }
    }
    Ok(())
}

/// Validates directory-level invariants and returns the sorted local header offsets
/// that entry source spans are derived from.
fn validate_archive_directory(
    entries: &[StoredZipEntry],
    source_len: u64,
    central_directory_start: u64,
) -> Result<Vec<u64>> {
    if central_directory_start > source_len {
        return Err(anyhow!(
            "source ZIP central directory starts beyond the source object"
        ));
    }
    let mut totals = (0_u64, 0_u64);

    for stored in entries {
        totals =
            checked_archive_totals(totals, stored.compressed_size(), stored.uncompressed_size())?;
        if stored.header_offset() >= central_directory_start {
            return Err(anyhow!(
                "source ZIP central directory references a local header inside the directory"
            ));
        }
    }

    let mut source_offsets = entries
        .iter()
        .map(StoredZipEntry::header_offset)
        .collect::<Vec<_>>();
    source_offsets.sort_unstable();
    ensure_unique_source_offsets(&source_offsets)?;

    Ok(source_offsets)
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
    let size = size.ok_or_else(|| {
        anyhow!("source object `{path}` metadata did not contain a valid content length")
    })?;
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

/// Entry source spans run from one local header offset to the next, so two entries
/// sharing a header offset would receive identical spans. The source block store
/// assumes planned blocks are sorted and disjoint, and an identical span longer than
/// one block breaks that invariant, so reject the archive during planning instead.
fn ensure_unique_source_offsets(sorted_offsets: &[u64]) -> Result<()> {
    if let Some(pair) = sorted_offsets.windows(2).find(|pair| pair[0] == pair[1]) {
        return Err(anyhow!(
            "duplicate ZIP local file header offset {}",
            pair[0]
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::io::{Cursor, Write};
    use std::sync::{Arc, Mutex};

    use async_zip::base::read::seek::ZipFileReader;
    use sha2::{Digest, Sha256};
    use tracing_subscriber::fmt::MakeWriter;
    use tracing_subscriber::layer::SubscriberExt;
    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{
        CATALOG_ALLOCATION_FACTOR, EMBEDDED_CATALOG_MAX_BYTES, EmbeddedCatalog,
        EmbeddedCatalogEntry, S3_SINGLE_COPY_LIMIT, S3_SINGLE_PUT_LIMIT, ZipEntryPlan,
        authenticate_catalog_bytes, authenticated_catalog_entry, catalog_budget_error,
        catalog_memory_estimate, catalog_source_block_bytes, checked_archive_totals,
        collect_copy_plans, collect_zip_entry_plans, ensure_unique_source_offsets,
        insert_manifest_object, validate_archive_directory, validate_catalog_entries,
        validate_deployment_preflight,
    };
    use crate::request::compile_filters;
    use crate::s3::archive::SourceByteBudget;
    use crate::s3::destination::{DestinationObject, DestinationWritePrecondition};
    use crate::types::DeploymentStats;
    use crate::types::{
        DeploymentManifest, DeploymentRequest, MarkerConfig, PlannedAction, PlannedObject,
        PutObjectRetryJitter, PutObjectRetryOptions, RuntimeOptions,
    };

    #[derive(Clone, Default)]
    struct TestWriter(Arc<Mutex<Vec<u8>>>);

    struct TestWriterGuard(Arc<Mutex<Vec<u8>>>);

    impl Write for TestWriterGuard {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            self.0
                .lock()
                .expect("test log buffer")
                .extend_from_slice(bytes);
            Ok(bytes.len())
        }

        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    impl<'writer> MakeWriter<'writer> for TestWriter {
        type Writer = TestWriterGuard;

        fn make_writer(&'writer self) -> Self::Writer {
            TestWriterGuard(Arc::clone(&self.0))
        }
    }

    #[test]
    fn later_source_replaces_collision_and_logs_both_source_indices() {
        let logs = TestWriter::default();
        let subscriber = tracing_subscriber::registry().with(
            tracing_subscriber::fmt::layer()
                .without_time()
                .with_ansi(false)
                .with_writer(logs.clone()),
        );
        let mut manifest = DeploymentManifest::new();

        tracing::subscriber::with_default(subscriber, || {
            for source_index in [2, 7] {
                insert_manifest_object(
                    &mut manifest,
                    PlannedObject {
                        relative_key: "shared/index.html".to_string(),
                        expected_etag: Some(format!("etag-{source_index}")),
                        action: PlannedAction::CopyObject {
                            source_index,
                            size: Some(1),
                        },
                    },
                );
            }
        });

        let retained = manifest
            .get("shared/index.html")
            .expect("collision keeps one planned object");
        assert!(matches!(
            retained.action,
            PlannedAction::CopyObject {
                source_index: 7,
                ..
            }
        ));
        let output = String::from_utf8(logs.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 tracing output");
        assert!(output.contains("later source replaces an earlier source destination key"));
        assert!(output.contains("destination_relative_key=shared/index.html"));
        assert!(output.contains("previous_source_index=2"));
        assert!(output.contains("replacement_source_index=7"));
    }

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
        assert_eq!(plans[0].expected_etag, "abc123");
        assert_eq!(plans[0].destination_key, "site/archive.zip");
        assert_eq!(
            plans[0].destination_precondition,
            Some(DestinationWritePrecondition::IfNoneMatch)
        );
        assert_eq!(plans[0].size, 1024);
        assert!(
            !plans[0].identity_probe,
            "an absent destination object cannot be proven current"
        );
    }

    #[test]
    fn identity_probes_are_planned_only_where_the_etag_comparison_cannot_work() {
        let plan_for = |source_etag: &str, destination: Option<(&str, u64)>| {
            let mut manifest = DeploymentManifest::new();
            manifest.insert(
                "archive.zip".to_string(),
                PlannedObject {
                    relative_key: "archive.zip".to_string(),
                    expected_etag: Some(source_etag.to_string()),
                    action: PlannedAction::CopyObject {
                        source_index: 0,
                        size: Some(1024),
                    },
                },
            );
            let destination_objects = destination
                .map(|(etag, size)| {
                    HashMap::from([(
                        "archive.zip".to_string(),
                        DestinationObject {
                            etag: Some(etag.to_string()),
                            size: Some(size),
                        },
                    )])
                })
                .unwrap_or_default();
            collect_copy_plans(&manifest, &copy_request(), &destination_objects).unwrap()
        };

        // A multipart source ETag can never equal the plain MD5 that CopyObject writes.
        let multipart = plan_for("abc123-4", Some(("abc123", 1024)));
        assert_eq!(multipart.len(), 1);
        assert!(multipart[0].identity_probe);

        // A single-part SSE-S3 mismatch is a real content change; a HEAD cannot retire it.
        let changed = plan_for("abc123", Some(("def456", 1024)));
        assert_eq!(changed.len(), 1);
        assert!(!changed[0].identity_probe);

        // A different length rules the destination out without spending an API call.
        let resized = plan_for("abc123-4", Some(("abc123", 999)));
        assert_eq!(resized.len(), 1);
        assert!(!resized[0].identity_probe);
    }

    #[test]
    fn a_matching_destination_etag_retires_the_copy() {
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

        let unchanged = collect_copy_plans(&manifest, &copy_request(), &destination).unwrap();

        assert!(
            unchanged.is_empty(),
            "an SSE-S3 destination ETag is the source's plaintext MD5, so it settles this \
             from the listing alone"
        );
    }

    #[test]
    fn copy_plans_require_exact_source_metadata_for_guards_and_reconciliation() {
        for (expected_etag, size, expected_message) in [
            (None, Some(1), "usable ETag"),
            (Some("abc123".to_string()), None, "valid content length"),
        ] {
            let manifest = DeploymentManifest::from([(
                "archive.zip".to_string(),
                PlannedObject {
                    relative_key: "archive.zip".to_string(),
                    expected_etag,
                    action: PlannedAction::CopyObject {
                        source_index: 0,
                        size,
                    },
                },
            )]);

            let error = collect_copy_plans(&manifest, &copy_request(), &HashMap::new())
                .expect_err("incomplete source metadata must fail closed");
            assert!(error.to_string().contains(expected_message));
        }
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
    fn a_minimal_catalog_entry_decodes_larger_than_its_json() {
        // The reason CATALOG_ALLOCATION_FACTOR cannot be 2. The smallest syntactically
        // valid entry, including its separating comma, is:
        let json_per_entry = r#"{"path":"","size":0,"md5":"00000000000000000000000000000000"},"#;
        // ...and it decodes to an owned struct plus its 32-byte md5 heap allocation.
        // Nothing rejects it until validate_catalog_entries runs on the whole document.
        let entry_struct = std::mem::size_of::<EmbeddedCatalogEntry>();
        let md5_heap = 32;

        // Even ignoring the Vec, decoded already exceeds the JSON it came from, which is
        // what rules out a factor of 2: it budgets raw (1x) plus at most raw again.
        assert!(
            entry_struct + md5_heap > json_per_entry.len(),
            "a catalog decodes to more owned bytes than its JSON source, \
             so `raw + decoded` cannot fit in 2x the raw size"
        );

        // The documented worst case also allows for the entry Vec carrying up to double
        // the capacity it needs, since serde grows it geometrically while deserializing.
        // Compared as integers scaled by the JSON length so the bound cannot drift.
        let worst_decoded_per_entry = 2 * entry_struct + md5_heap;
        let worst_peak = json_per_entry.len() + worst_decoded_per_entry;
        assert!(
            CATALOG_ALLOCATION_FACTOR as usize * json_per_entry.len() > worst_peak,
            "CATALOG_ALLOCATION_FACTOR ({CATALOG_ALLOCATION_FACTOR}) must stay above the \
             worst-case peak of {worst_peak} bytes per {} JSON bytes",
            json_per_entry.len()
        );
    }

    #[test]
    fn catalog_memory_estimate_is_checked_and_covers_the_declared_size() {
        assert_eq!(
            catalog_memory_estimate(1024).unwrap(),
            1024 * CATALOG_ALLOCATION_FACTOR
        );
        assert!(
            catalog_memory_estimate(u64::MAX).is_err(),
            "a hostile declared size must be rejected rather than wrapping to a small estimate"
        );
    }

    #[test]
    fn catalog_source_block_bytes_uses_a_block_not_the_store_window() {
        let mut request = copy_request();
        request.runtime.source_block_bytes = 8 * 1024 * 1024;
        // The store's window is far larger than one block; charging the window would
        // reject configurations that actually fit.
        assert!(
            crate::s3::source_window_bytes_for_archive(&request.runtime, 512 * 1024 * 1024, 1)
                as u64
                > request.runtime.source_block_bytes as u64
        );

        let wide = catalog_plan(0, 64 * 1024 * 1024);
        assert_eq!(
            catalog_source_block_bytes(&request, &wide),
            request.runtime.source_block_bytes as u64,
            "a wide entry is bounded by the block size"
        );

        let narrow = catalog_plan(1_000, 1_000 + 4_096);
        assert_eq!(
            catalog_source_block_bytes(&request, &narrow),
            4_096,
            "a narrow entry is bounded by its own source span"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn an_unaffordable_catalog_is_refused_immediately_rather_than_awaited() {
        let budget = SourceByteBudget::new(
            32 * 1024 * 1024,
            std::sync::Arc::new(DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget");
        // Exhaust most of the budget the way a held planning reservation would.
        let _held = budget
            .try_reserve_planning(28 * 1024 * 1024)
            .expect("the first reservation fits");

        // Well under the whole budget, so this is contention rather than an oversized
        // request — exactly the case that used to await a permit nothing would release.
        let estimate = catalog_memory_estimate(2 * 1024 * 1024).unwrap();
        assert!(estimate < budget.limit_bytes());

        let started = tokio::time::Instant::now();
        let error = budget
            .try_reserve_planning(estimate)
            .err()
            .expect("a catalog that cannot fit alongside planning must be refused");

        assert_eq!(
            tokio::time::Instant::now(),
            started,
            "the refusal must not enter a wait; on a paused clock any await would advance time"
        );
        assert!(
            error.to_string().contains("exceeds the remaining"),
            "the error must name contention, not an oversized request: {error}"
        );
    }

    #[test]
    fn a_catalog_that_fits_is_admitted_and_releases_on_drop() {
        let budget = SourceByteBudget::new(
            64 * 1024 * 1024,
            std::sync::Arc::new(DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget");
        let estimate = catalog_memory_estimate(4 * 1024 * 1024).unwrap();

        let permit = budget.try_reserve_planning(estimate).expect("it fits");
        assert!(
            !budget.can_reserve_additional(62 * 1024 * 1024),
            "the reservation must actually consume budget while it is held"
        );

        drop(permit);
        assert!(
            budget.can_reserve_additional(62 * 1024 * 1024),
            "dropping the permit must return the budget"
        );
    }

    #[test]
    fn an_unfulfillable_planning_reservation_errors_instead_of_waiting_forever() {
        // The reported defect: a catalog estimate that exceeds what remains after
        // planning, but is still under the whole budget, used to await a permit that
        // nothing would ever release, because planning is sequential.
        let limit = 16 * 1024 * 1024_u64;
        let budget = SourceByteBudget::new(
            usize::try_from(limit).unwrap(),
            std::sync::Arc::new(DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget");
        let planning = 10 * 1024 * 1024;
        let _planning_permit = budget
            .try_reserve_planning(planning)
            .expect("planning fits");

        let catalog_estimate = catalog_memory_estimate(2 * 1024 * 1024).unwrap();
        assert!(catalog_estimate <= limit, "it fits the budget on its own");
        assert!(
            catalog_estimate > limit - planning,
            "but not alongside the planning reservation: this is the hang band"
        );
        assert!(budget.try_reserve_planning(catalog_estimate).is_err());
    }

    #[test]
    fn the_declared_size_cap_keeps_the_catalog_estimate_bounded() {
        // `uncompressed_size` is attacker-controlled, so what makes the estimate safe is
        // that `load_authenticated_catalog` rejects anything above the cap before
        // computing it. That leaves the estimate with a known worst case rather than an
        // arbitrary one, which is the property the budget arithmetic depends on.
        assert_eq!(
            catalog_memory_estimate(EMBEDDED_CATALOG_MAX_BYTES).unwrap(),
            EMBEDDED_CATALOG_MAX_BYTES * CATALOG_ALLOCATION_FACTOR
        );
        // A budget below that worst case must refuse it rather than admit and overshoot.
        let budget = SourceByteBudget::new(
            usize::try_from(EMBEDDED_CATALOG_MAX_BYTES).unwrap(),
            std::sync::Arc::new(DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget");
        assert!(
            budget
                .try_reserve_planning(catalog_memory_estimate(EMBEDDED_CATALOG_MAX_BYTES).unwrap())
                .is_err(),
            "a max-size catalog needs {CATALOG_ALLOCATION_FACTOR}x its own bytes, so it \
             cannot be admitted to a budget of exactly one catalog"
        );
    }

    #[test]
    fn admission_accounts_for_each_reservation_rounding_up_to_a_permit_unit() {
        // Permits are 4 KiB and every acquisition rounds up independently, so three
        // reservations whose bytes sum to under the limit can still be jointly
        // infeasible. This is why admission asks the budget rather than comparing bytes.
        let unit = 4 * 1024_u64;
        let limit = 11 * unit;
        let budget = SourceByteBudget::new(
            usize::try_from(limit).unwrap(),
            std::sync::Arc::new(DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget");

        // Each of these wastes almost a whole unit to rounding.
        let unaligned = 3 * unit + 1;
        let _planning = budget
            .try_reserve_planning(unaligned)
            .expect("planning fits");
        let _catalog = budget
            .try_reserve_planning(unaligned)
            .expect("catalog fits");

        let block = unaligned;
        assert!(
            3 * unaligned < limit,
            "the byte totals say all three fit: {} < {limit}",
            3 * unaligned
        );
        assert!(
            !budget.can_reserve_additional(block),
            "but each rounds up to 4 units, so the first two consume 8 of 11 permits and \
             the block's 4 no longer fit"
        );
    }

    #[test]
    fn a_budget_refusal_names_the_settings_that_resolve_it() {
        // This error is the only thing a user sees when a catalog cannot be admitted, so
        // it has to name the levers rather than just the shortfall.
        let message = catalog_budget_error("nothing fits".to_string()).to_string();

        assert!(message.contains("providerLambda.memorySize"));
        assert!(message.contains("sourceWindowMemoryBudgetMiB"));
        assert!(message.contains("nothing fits"));
    }

    fn catalog_plan(source_offset: u64, source_span_end: u64) -> ZipEntryPlan {
        ZipEntryPlan {
            source_index: 0,
            relative_key: ".shin/catalog.json".to_string(),
            destination_key: ".shin/catalog.json".to_string(),
            size: 0,
            compressed_size: 0,
            compression_code: 0,
            crc32: 0,
            trusted_integrity: None,
            source_offset,
            source_span_end,
        }
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

    /// Reads the real central directory offset out of the end-of-central-directory
    /// record, so tests bound entry spans the way the provider does instead of
    /// fabricating a value that could mask a future bound check.
    fn central_directory_start_of(bytes: &[u8]) -> u64 {
        const END_OF_DIRECTORY_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x05, 0x06];

        let end_of_directory = bytes
            .windows(4)
            .rposition(|window| window == END_OF_DIRECTORY_SIGNATURE)
            .expect("archive must contain an end of central directory record");
        u32::from_le_bytes(
            bytes[end_of_directory + 16..end_of_directory + 20]
                .try_into()
                .expect("central directory offset is four bytes"),
        ) as u64
    }

    /// Builds a two-entry archive and rewrites the second central directory record so
    /// both names point at the first entry's local header. `zip` will not emit this, so
    /// the record has to be patched after the fact. Returns the bytes alongside the
    /// central directory offset, which planning needs to bound entry source spans.
    fn zip_bytes_with_shared_header_offset() -> (Vec<u8>, u64) {
        const CENTRAL_DIRECTORY_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x01, 0x02];
        const HEADER_OFFSET_FIELD: usize = 42;

        let mut bytes = zip_bytes_from_entries(
            &[
                ("first.txt", b"first" as &[u8]),
                ("second.txt", b"second" as &[u8]),
            ],
            false,
        );

        let directory_start = central_directory_start_of(&bytes) as usize;
        let mut cursor = directory_start;

        let mut records = Vec::new();
        while cursor + 46 <= bytes.len() && bytes[cursor..cursor + 4] == CENTRAL_DIRECTORY_SIGNATURE
        {
            records.push(cursor);
            let field = |at: usize| {
                u16::from_le_bytes(
                    bytes[cursor + at..cursor + at + 2]
                        .try_into()
                        .expect("central directory length field is two bytes"),
                ) as usize
            };
            cursor += 46 + field(28) + field(30) + field(32);
        }
        assert_eq!(records.len(), 2, "expected two central directory records");

        let shared: [u8; 4] = bytes
            [records[0] + HEADER_OFFSET_FIELD..records[0] + HEADER_OFFSET_FIELD + 4]
            .try_into()
            .expect("local header offset is four bytes");
        bytes[records[1] + HEADER_OFFSET_FIELD..records[1] + HEADER_OFFSET_FIELD + 4]
            .copy_from_slice(&shared);
        (bytes, directory_start as u64)
    }

    /// Drives the guard through `validate_archive_directory`, the function planning
    /// actually calls, so this fails if the check is ever dropped from that path
    /// rather than only if the helper itself regresses.
    #[tokio::test]
    async fn planning_rejects_zip_entries_sharing_a_local_header_offset() {
        let (bytes, central_directory_start) = zip_bytes_with_shared_header_offset();
        let source_len = bytes.len() as u64;
        let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
        let zip = reader.file().clone();

        let error = validate_archive_directory(zip.entries(), source_len, central_directory_start)
            .expect_err("entries sharing a local header offset must fail closed");
        assert!(
            error
                .to_string()
                .contains("duplicate ZIP local file header offset"),
            "unexpected error: {error}"
        );
    }

    /// The same path must accept a well-formed archive and hand back the sorted
    /// offsets planning derives entry source spans from.
    #[tokio::test]
    async fn archive_directory_validation_returns_sorted_offsets_for_distinct_headers() {
        let bytes = zip_bytes_from_entries(
            &[
                ("first.txt", b"first" as &[u8]),
                ("second.txt", b"second" as &[u8]),
            ],
            false,
        );
        let source_len = bytes.len() as u64;
        let central_directory_start = central_directory_start_of(&bytes);
        let reader = ZipFileReader::with_tokio(Cursor::new(bytes)).await.unwrap();
        let zip = reader.file().clone();

        let mut expected = zip
            .entries()
            .iter()
            .map(|entry| entry.header_offset())
            .collect::<Vec<_>>();
        expected.sort_unstable();

        let offsets =
            validate_archive_directory(zip.entries(), source_len, central_directory_start)
                .expect("a well-formed archive must validate");
        assert_eq!(offsets, expected);
        assert!(
            offsets[1] < central_directory_start,
            "both local headers must precede the real central directory"
        );
        assert!(
            offsets[0] < offsets[1],
            "offsets must be sorted: {offsets:?}"
        );
    }

    #[test]
    fn unique_source_offsets_accept_distinct_offsets() {
        assert!(ensure_unique_source_offsets(&[]).is_ok());
        assert!(ensure_unique_source_offsets(&[7]).is_ok());
        assert!(ensure_unique_source_offsets(&[0, 10, 20]).is_ok());
    }

    #[test]
    fn unique_source_offsets_reject_repeated_offsets() {
        let error = ensure_unique_source_offsets(&[0, 10, 10, 20])
            .expect_err("repeated offsets must fail closed");
        assert!(
            error
                .to_string()
                .contains("duplicate ZIP local file header offset 10"),
            "unexpected error: {error}"
        );
    }
}
