use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
#[serde(deny_unknown_fields)]
pub(crate) struct MarkerConfig {
    #[serde(default, deserialize_with = "crate::util::deserialize_boolish")]
    pub(crate) json_escape: bool,
}

#[derive(Clone, Debug)]
pub(crate) struct DeploymentRequest {
    pub(crate) source_bucket_names: Vec<String>,
    pub(crate) source_object_keys: Vec<String>,
    pub(crate) source_catalogs: Vec<Option<TrustedSourceCatalog>>,
    pub(crate) source_markers: Vec<HashMap<String, String>>,
    pub(crate) source_markers_config: Vec<MarkerConfig>,
    pub(crate) dest_bucket_name: String,
    pub(crate) dest_bucket_prefix: String,
    pub(crate) extract: bool,
    pub(crate) delete_current_objects_on_delete: bool,
    pub(crate) distribution_id: Option<String>,
    pub(crate) distribution_paths: Vec<String>,
    pub(crate) wait_for_distribution_invalidation: bool,
    pub(crate) delete_stale_objects_on_deployment: bool,
    pub(crate) exclude: Vec<String>,
    pub(crate) include: Vec<String>,
    pub(crate) output_object_keys: bool,
    pub(crate) destination_bucket_arn: Option<String>,
    pub(crate) destination_owner_id: String,
    pub(crate) delete_previous_objects_on_change: Option<DeletePreviousObjectsOnChange>,
    pub(crate) invalidate_previous_distribution_on_change: Option<String>,
    pub(crate) archive_expansion: ArchiveExpansionLimits,
    pub(crate) runtime: RuntimeOptions,
}

#[cfg(test)]
impl DeploymentRequest {
    /// Shared defaults for the common single-archive, single-destination test shape.
    /// Module-local test builders that need different policies override fields
    /// directly (`DeploymentRequest` fields are `pub(crate)`), so a test keeps the
    /// values that are its point while the rest of the boilerplate lives here.
    pub(crate) fn for_test() -> Self {
        DeploymentRequest {
            source_bucket_names: vec!["source".to_string()],
            source_object_keys: vec!["source.zip".to_string()],
            source_catalogs: vec![None],
            source_markers: vec![HashMap::new()],
            source_markers_config: vec![MarkerConfig::default()],
            dest_bucket_name: "destination".to_string(),
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
            destination_owner_id: "owner".to_string(),
            delete_previous_objects_on_change: None,
            invalidate_previous_distribution_on_change: None,
            archive_expansion: ArchiveExpansionLimits {
                max_uncompressed_entry_bytes: 1024 * 1024 * 1024,
                max_compression_ratio: 100,
            },
            runtime: test_runtime_options(),
        }
    }
}

/// Deterministic runtime profile for unit tests: a single parallel transfer, no retry
/// backoff, and a small source block so tests stay exact and fast.
#[cfg(test)]
pub(crate) fn test_runtime_options() -> RuntimeOptions {
    RuntimeOptions {
        available_memory_mb: 1024,
        max_parallel_transfers: 1,
        source_block_bytes: 1024,
        source_block_merge_gap_bytes: 0,
        source_get_concurrency: 1,
        source_window_bytes: None,
        source_memory_budget_bytes: 256 * 1024 * 1024,
        put_object_retry: PutObjectRetryOptions {
            max_attempts: 1,
            retry_base_delay_ms: 0,
            retry_max_delay_ms: 0,
            slowdown_retry_base_delay_ms: 0,
            slowdown_retry_max_delay_ms: 0,
            jitter: PutObjectRetryJitter::None,
        },
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) struct ArchiveExpansionLimits {
    pub(crate) max_uncompressed_entry_bytes: u64,
    pub(crate) max_compression_ratio: u64,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct TrustedSourceCatalog {
    pub(crate) sha256: [u8; 32],
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct TrustedEntryIntegrity {
    pub(crate) size: u64,
    pub(crate) md5: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DeletePreviousObjectsOnChange {
    pub(crate) bucket_name: String,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct PreviousDestination {
    pub(crate) bucket_name: String,
    pub(crate) bucket_prefix: String,
    pub(crate) distribution_id: Option<String>,
    pub(crate) distribution_paths: Vec<String>,
    pub(crate) owner_id: String,
}

#[derive(Clone, Debug)]
pub(crate) struct RuntimeOptions {
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) source_block_bytes: usize,
    pub(crate) source_block_merge_gap_bytes: usize,
    pub(crate) source_get_concurrency: usize,
    pub(crate) source_window_bytes: Option<usize>,
    pub(crate) source_memory_budget_bytes: usize,
    pub(crate) put_object_retry: PutObjectRetryOptions,
}

#[derive(Clone, Debug)]
pub(crate) struct PutObjectRetryOptions {
    pub(crate) max_attempts: usize,
    pub(crate) retry_base_delay_ms: u64,
    pub(crate) retry_max_delay_ms: u64,
    pub(crate) slowdown_retry_base_delay_ms: u64,
    pub(crate) slowdown_retry_max_delay_ms: u64,
    pub(crate) jitter: PutObjectRetryJitter,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(crate) enum PutObjectRetryJitter {
    Full,
    None,
}

#[derive(Clone)]
pub(crate) struct Filters {
    pub(crate) exclude: Vec<globset::GlobMatcher>,
    pub(crate) include: Vec<globset::GlobMatcher>,
}

pub(crate) struct PlannedObject {
    pub(crate) relative_key: String,
    pub(crate) expected_etag: Option<String>,
    pub(crate) action: PlannedAction,
}

pub(crate) enum PlannedAction {
    CopyObject {
        source_index: usize,
        size: Option<u64>,
    },
    ZipEntry {
        archive_index: usize,
        source_index: usize,
        size: u64,
        compressed_size: u64,
        compression_code: u16,
        crc32: u32,
        trusted_integrity: Option<TrustedEntryIntegrity>,
        source_offset: u64,
        source_span_end_exclusive: u64,
    },
}

pub(crate) type DeploymentManifest = BTreeMap<String, PlannedObject>;

pub(crate) struct SourceArchive {
    pub(crate) source: Arc<crate::s3::archive::SourceClient>,
}
