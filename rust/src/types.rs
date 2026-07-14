use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Instant;

use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use reqwest::Client as HttpClient;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Value};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) source_s3: S3Client,
    pub(crate) destination_s3: S3Client,
    pub(crate) cloudfront: CloudFrontClient,
    pub(crate) http: HttpClient,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MarkerConfig {
    #[serde(default, deserialize_with = "deserialize_boolish")]
    pub(crate) json_escape: bool,
}

fn deserialize_boolish<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    struct BoolishVisitor;

    impl serde::de::Visitor<'_> for BoolishVisitor {
        type Value = bool;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("a boolean or a string containing true or false")
        }

        fn visit_bool<E>(self, value: bool) -> std::result::Result<Self::Value, E> {
            Ok(value)
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            match value.to_ascii_lowercase().as_str() {
                "true" => Ok(true),
                "false" => Ok(false),
                _ => Err(E::invalid_value(serde::de::Unexpected::Str(value), &self)),
            }
        }
    }

    deserializer.deserialize_any(BoolishVisitor)
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
    pub(crate) destination_checksum_strategy: DestinationChecksumStrategy,
    pub(crate) delete_stale_objects_on_deployment: bool,
    pub(crate) exclude: Vec<String>,
    pub(crate) include: Vec<String>,
    pub(crate) output_object_keys: bool,
    pub(crate) destination_bucket_arn: Option<String>,
    pub(crate) destination_owner_id: Option<String>,
    pub(crate) delete_previous_objects_on_change: Option<DeletePreviousObjectsOnChange>,
    pub(crate) invalidate_previous_distribution_on_change: Option<String>,
    pub(crate) runtime: RuntimeOptions,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum DestinationChecksumStrategy {
    SseS3Etag,
    KmsSha256,
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
    pub(crate) owner_id: Option<String>,
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
        source_span_end: u64,
    },
}

pub(crate) type DeploymentManifest = BTreeMap<String, PlannedObject>;

pub(crate) struct SourceArchive {
    pub(crate) source: Arc<crate::s3::archive::SourceClient>,
}

#[derive(Default)]
pub(crate) struct DeploymentStats {
    started: OnceInstant,
    plan_millis: AtomicU64,
    destination_list_millis: AtomicU64,
    transfer_millis: AtomicU64,
    delete_millis: AtomicU64,
    cloudfront_millis: AtomicU64,
    old_prefix_delete_millis: AtomicU64,
    source_archives: AtomicU64,
    source_zip_bytes: AtomicU64,
    planned_entries: AtomicU64,
    filtered_entries: AtomicU64,
    marker_entries: AtomicU64,
    destination_objects: AtomicU64,
    destination_metadata_retained: AtomicU64,
    destination_page_objects_high_water: AtomicU64,
    delete_objects: AtomicU64,
    delete_batches: AtomicU64,
    uploaded_objects: AtomicU64,
    uploaded_bytes: AtomicU64,
    skipped_objects: AtomicU64,
    conditional_conflicts: AtomicU64,
    copied_objects: AtomicU64,
    copied_bytes: AtomicU64,
    md5_hash_attempts: AtomicU64,
    md5_skips: AtomicU64,
    catalog_skips: AtomicU64,
    marker_planning_passes: AtomicU64,
    marker_upload_passes: AtomicU64,
    source_planned_blocks: AtomicU64,
    source_planned_bytes: AtomicU64,
    source_fetched_blocks: AtomicU64,
    source_fetched_bytes: AtomicU64,
    source_get_attempts: AtomicU64,
    source_get_retries: AtomicU64,
    source_get_throttled_attempts: AtomicU64,
    source_get_retryable_errors: AtomicU64,
    source_get_permanent_errors: AtomicU64,
    source_get_request_errors: AtomicU64,
    source_get_body_errors: AtomicU64,
    source_get_short_body_errors: AtomicU64,
    source_get_errors: AtomicU64,
    source_block_hits: AtomicU64,
    source_block_misses: AtomicU64,
    source_block_refetches: AtomicU64,
    source_block_waits: AtomicU64,
    source_block_waits_fetching: AtomicU64,
    source_block_waits_capacity: AtomicU64,
    source_replay_claims: AtomicU64,
    source_replay_claims_after_release: AtomicU64,
    source_replay_claims_after_failure: AtomicU64,
    source_body_attempts: AtomicU64,
    source_body_replays: AtomicU64,
    source_active_gets_high_water: AtomicU64,
    source_active_readers_high_water: AtomicU64,
    source_resident_bytes_high_water: AtomicU64,
    source_global_budget_bytes: AtomicU64,
    source_global_resident_bytes: AtomicU64,
    source_global_resident_bytes_high_water: AtomicU64,
    transfer_scheduled_objects: AtomicU64,
    transfer_completed_objects: AtomicU64,
    transfer_failed_objects: AtomicU64,
    transfer_cancelled_objects: AtomicU64,
    transfer_panicked_objects: AtomicU64,
    transfer_in_flight_high_water: AtomicU64,
    put_wire_attempts: AtomicU64,
    put_failed_attempts: AtomicU64,
    put_retry_attempts: AtomicU64,
    put_throttled_attempts: AtomicU64,
    put_retry_wait_millis: AtomicU64,
    put_throttle_cooldown_waits: AtomicU64,
    put_throttle_cooldown_wait_millis: AtomicU64,
}

struct OnceInstant(Instant);

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentStatsSnapshot<'a> {
    pub(crate) event: &'static str,
    pub(crate) schema_version: u8,
    pub(crate) request_type: &'a str,
    pub(crate) status: &'a str,
    pub(crate) extract: bool,
    pub(crate) destination_checksum_strategy: DestinationChecksumStrategy,
    pub(crate) delete_stale_objects_on_deployment: bool,
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) duration_ms: u64,
    pub(crate) phase_ms: PhaseMillis,
    pub(crate) counts: DeploymentCounts,
    pub(crate) bytes: DeploymentBytes,
    pub(crate) transfer: TransferStats,
    pub(crate) marker_replacement: MarkerReplacementStats,
    pub(crate) source: SourceStats,
    pub(crate) put_object: PutObjectStats,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PhaseMillis {
    pub(crate) plan: u64,
    pub(crate) destination_list: u64,
    pub(crate) transfer: u64,
    pub(crate) delete: u64,
    pub(crate) cloudfront: u64,
    pub(crate) old_prefix_delete: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentCounts {
    pub(crate) source_archives: u64,
    pub(crate) planned_entries: u64,
    pub(crate) filtered_entries: u64,
    pub(crate) marker_entries: u64,
    pub(crate) destination_objects: u64,
    pub(crate) destination_metadata_retained: u64,
    pub(crate) destination_page_objects_high_water: u64,
    pub(crate) delete_objects: u64,
    pub(crate) delete_batches: u64,
    pub(crate) uploaded_objects: u64,
    pub(crate) skipped_objects: u64,
    pub(crate) conditional_conflicts: u64,
    pub(crate) copied_objects: u64,
    pub(crate) md5_hash_attempts: u64,
    pub(crate) md5_skips: u64,
    pub(crate) catalog_skips: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentBytes {
    pub(crate) source_zip: u64,
    pub(crate) uploaded: u64,
    pub(crate) copied: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SourceStats {
    pub(crate) planned_blocks: u64,
    pub(crate) planned_bytes: u64,
    pub(crate) fetched_blocks: u64,
    pub(crate) fetched_bytes: u64,
    pub(crate) get_attempts: u64,
    pub(crate) get_retries: u64,
    pub(crate) get_throttled_attempts: u64,
    pub(crate) get_retryable_errors: u64,
    pub(crate) get_permanent_errors: u64,
    pub(crate) get_request_errors: u64,
    pub(crate) get_body_errors: u64,
    pub(crate) get_short_body_errors: u64,
    pub(crate) get_errors: u64,
    pub(crate) block_hits: u64,
    pub(crate) block_misses: u64,
    pub(crate) block_refetches: u64,
    pub(crate) block_waits: u64,
    pub(crate) block_waits_fetching: u64,
    pub(crate) block_waits_capacity: u64,
    pub(crate) replay_claims: u64,
    pub(crate) replay_claims_after_release: u64,
    pub(crate) replay_claims_after_failure: u64,
    pub(crate) body_attempts: u64,
    pub(crate) body_replays: u64,
    pub(crate) active_gets_high_water: u64,
    pub(crate) active_readers_high_water: u64,
    pub(crate) resident_bytes_high_water: u64,
    pub(crate) global_budget_bytes: u64,
    pub(crate) global_resident_bytes_current: u64,
    pub(crate) global_resident_bytes_high_water: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransferStats {
    pub(crate) scheduled_objects: u64,
    pub(crate) completed_objects: u64,
    pub(crate) failed_objects: u64,
    pub(crate) cancelled_objects: u64,
    pub(crate) panicked_objects: u64,
    pub(crate) in_flight_high_water: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MarkerReplacementStats {
    pub(crate) strategy: &'static str,
    pub(crate) semantics: &'static str,
    pub(crate) planned_passes_per_upload: u8,
    pub(crate) planning_passes: u64,
    pub(crate) upload_passes: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectStats {
    pub(crate) wire_attempts: u64,
    pub(crate) failed_attempts: u64,
    pub(crate) retry_attempts: u64,
    pub(crate) throttled_attempts: u64,
    pub(crate) retry_wait_ms: u64,
    pub(crate) throttle_cooldown_waits: u64,
    pub(crate) throttle_cooldown_wait_ms: u64,
}

impl Default for OnceInstant {
    fn default() -> Self {
        Self(Instant::now())
    }
}

impl DeploymentStats {
    pub(crate) fn add_plan_millis(&self, millis: u64) {
        self.plan_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_destination_list_millis(&self, millis: u64) {
        self.destination_list_millis
            .fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_millis(&self, millis: u64) {
        self.transfer_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_delete_millis(&self, millis: u64) {
        self.delete_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_cloudfront_millis(&self, millis: u64) {
        self.cloudfront_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_old_prefix_delete_millis(&self, millis: u64) {
        self.old_prefix_delete_millis
            .fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_source_archive(&self, source_zip_bytes: u64) {
        self.source_archives.fetch_add(1, Ordering::Relaxed);
        self.source_zip_bytes
            .fetch_add(source_zip_bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_planned_entries(&self, count: u64) {
        self.planned_entries.fetch_add(count, Ordering::Relaxed);
    }

    pub(crate) fn add_filtered_entry(&self) {
        self.filtered_entries.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_entry(&self) {
        self.marker_entries.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_destination_objects(&self, count: u64) {
        self.destination_objects.fetch_add(count, Ordering::Relaxed);
    }

    pub(crate) fn set_destination_metadata_retained(&self, count: u64) {
        self.destination_metadata_retained
            .store(count, Ordering::Relaxed);
    }

    pub(crate) fn record_destination_page_objects(&self, count: u64) {
        self.destination_page_objects_high_water
            .fetch_max(count, Ordering::Relaxed);
    }

    pub(crate) fn add_delete_objects(&self, count: u64) {
        if count > 0 {
            self.delete_objects.fetch_add(count, Ordering::Relaxed);
            self.delete_batches.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub(crate) fn add_uploaded_object(&self, bytes: u64) {
        self.uploaded_objects.fetch_add(1, Ordering::Relaxed);
        self.uploaded_bytes.fetch_add(bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_skipped_object(&self) {
        self.skipped_objects.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_conditional_conflict(&self) {
        self.conditional_conflicts.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_copied_object(&self, bytes: u64) {
        self.copied_objects.fetch_add(1, Ordering::Relaxed);
        self.copied_bytes.fetch_add(bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_md5_hash_attempt(&self) {
        self.md5_hash_attempts.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_md5_skip(&self) {
        self.md5_skips.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_catalog_skip(&self) {
        self.catalog_skips.fetch_add(1, Ordering::Relaxed);
        self.add_skipped_object();
    }

    pub(crate) fn add_marker_planning_pass(&self) {
        self.marker_planning_passes.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_upload_pass(&self) {
        self.marker_upload_passes.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_source_stats(&self, stats: &crate::s3::archive::SourceDiagnosticsSnapshot) {
        self.source_planned_blocks
            .fetch_add(stats.planned_blocks, Ordering::Relaxed);
        self.source_planned_bytes
            .fetch_add(stats.planned_source_bytes, Ordering::Relaxed);
        self.source_fetched_blocks
            .fetch_add(stats.fetched_blocks, Ordering::Relaxed);
        self.source_fetched_bytes
            .fetch_add(stats.fetched_source_bytes, Ordering::Relaxed);
        self.source_get_attempts
            .fetch_add(stats.source_get_attempts, Ordering::Relaxed);
        self.source_get_retries
            .fetch_add(stats.source_get_retries, Ordering::Relaxed);
        self.source_get_throttled_attempts
            .fetch_add(stats.source_get_throttled_attempts, Ordering::Relaxed);
        self.source_get_retryable_errors
            .fetch_add(stats.source_get_retryable_errors, Ordering::Relaxed);
        self.source_get_permanent_errors
            .fetch_add(stats.source_get_permanent_errors, Ordering::Relaxed);
        self.source_get_request_errors
            .fetch_add(stats.source_get_request_errors, Ordering::Relaxed);
        self.source_get_body_errors
            .fetch_add(stats.source_get_body_errors, Ordering::Relaxed);
        self.source_get_short_body_errors
            .fetch_add(stats.source_get_short_body_errors, Ordering::Relaxed);
        self.source_get_errors
            .fetch_add(stats.source_get_errors, Ordering::Relaxed);
        self.source_block_hits
            .fetch_add(stats.block_hits, Ordering::Relaxed);
        self.source_block_misses
            .fetch_add(stats.block_misses, Ordering::Relaxed);
        self.source_block_refetches
            .fetch_add(stats.block_refetches, Ordering::Relaxed);
        self.source_block_waits
            .fetch_add(stats.block_waits, Ordering::Relaxed);
        self.source_block_waits_fetching
            .fetch_add(stats.block_waits_fetching, Ordering::Relaxed);
        self.source_block_waits_capacity
            .fetch_add(stats.block_waits_capacity, Ordering::Relaxed);
        self.source_replay_claims
            .fetch_add(stats.replay_claims, Ordering::Relaxed);
        self.source_replay_claims_after_release
            .fetch_add(stats.replay_claims_after_release, Ordering::Relaxed);
        self.source_replay_claims_after_failure
            .fetch_add(stats.replay_claims_after_failure, Ordering::Relaxed);
        self.source_body_attempts
            .fetch_add(stats.body_attempts, Ordering::Relaxed);
        self.source_body_replays
            .fetch_add(stats.body_replays, Ordering::Relaxed);
        self.source_active_gets_high_water
            .fetch_max(stats.active_gets_high_water, Ordering::Relaxed);
        self.source_active_readers_high_water
            .fetch_max(stats.active_readers_high_water, Ordering::Relaxed);
        self.source_resident_bytes_high_water
            .fetch_max(stats.resident_bytes_high_water, Ordering::Relaxed);
    }

    pub(crate) fn configure_source_global_budget(&self, bytes: u64) {
        self.source_global_budget_bytes
            .store(bytes, Ordering::Relaxed);
    }

    pub(crate) fn acquire_source_global_bytes(&self, bytes: u64) {
        let resident = self
            .source_global_resident_bytes
            .fetch_add(bytes, Ordering::AcqRel)
            .saturating_add(bytes);
        self.source_global_resident_bytes_high_water
            .fetch_max(resident, Ordering::Relaxed);
    }

    pub(crate) fn release_source_global_bytes(&self, bytes: u64) {
        let previous = self
            .source_global_resident_bytes
            .fetch_sub(bytes, Ordering::AcqRel);
        debug_assert!(
            previous >= bytes,
            "global source byte accounting underflowed"
        );
    }

    #[cfg(test)]
    pub(crate) fn source_global_memory_for_test(&self) -> (u64, u64, u64) {
        (
            self.source_global_budget_bytes.load(Ordering::Relaxed),
            self.source_global_resident_bytes.load(Ordering::Relaxed),
            self.source_global_resident_bytes_high_water
                .load(Ordering::Relaxed),
        )
    }

    pub(crate) fn add_transfer_scheduled_object(&self, in_flight: usize) {
        self.transfer_scheduled_objects
            .fetch_add(1, Ordering::Relaxed);
        self.transfer_in_flight_high_water.fetch_max(
            u64::try_from(in_flight).unwrap_or(u64::MAX),
            Ordering::Relaxed,
        );
    }

    pub(crate) fn add_transfer_completed_object(&self) {
        self.transfer_completed_objects
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_failed_object(&self, panicked: bool) {
        self.transfer_failed_objects.fetch_add(1, Ordering::Relaxed);
        if panicked {
            self.transfer_panicked_objects
                .fetch_add(1, Ordering::Relaxed);
        }
    }

    pub(crate) fn add_transfer_cancelled_object(&self) {
        self.transfer_cancelled_objects
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_put_stats(&self, stats: &PutObjectStats) {
        self.put_wire_attempts
            .fetch_add(stats.wire_attempts, Ordering::Relaxed);
        self.put_failed_attempts
            .fetch_add(stats.failed_attempts, Ordering::Relaxed);
        self.put_retry_attempts
            .fetch_add(stats.retry_attempts, Ordering::Relaxed);
        self.put_throttled_attempts
            .fetch_add(stats.throttled_attempts, Ordering::Relaxed);
        self.put_retry_wait_millis
            .fetch_add(stats.retry_wait_ms, Ordering::Relaxed);
        self.put_throttle_cooldown_waits
            .fetch_add(stats.throttle_cooldown_waits, Ordering::Relaxed);
        self.put_throttle_cooldown_wait_millis
            .fetch_add(stats.throttle_cooldown_wait_ms, Ordering::Relaxed);
    }

    pub(crate) fn snapshot<'a>(
        &'a self,
        request_type: &'a str,
        status: &'a str,
        request: &DeploymentRequest,
    ) -> DeploymentStatsSnapshot<'a> {
        DeploymentStatsSnapshot {
            event: "shin_deployment_summary",
            schema_version: 2,
            request_type,
            status,
            extract: request.extract,
            destination_checksum_strategy: request.destination_checksum_strategy,
            delete_stale_objects_on_deployment: request.delete_stale_objects_on_deployment,
            available_memory_mb: request.runtime.available_memory_mb,
            max_parallel_transfers: request.runtime.max_parallel_transfers,
            duration_ms: duration_ms(self.started.0.elapsed()),
            phase_ms: PhaseMillis {
                plan: self.plan_millis.load(Ordering::Relaxed),
                destination_list: self.destination_list_millis.load(Ordering::Relaxed),
                transfer: self.transfer_millis.load(Ordering::Relaxed),
                delete: self.delete_millis.load(Ordering::Relaxed),
                cloudfront: self.cloudfront_millis.load(Ordering::Relaxed),
                old_prefix_delete: self.old_prefix_delete_millis.load(Ordering::Relaxed),
            },
            counts: DeploymentCounts {
                source_archives: self.source_archives.load(Ordering::Relaxed),
                planned_entries: self.planned_entries.load(Ordering::Relaxed),
                filtered_entries: self.filtered_entries.load(Ordering::Relaxed),
                marker_entries: self.marker_entries.load(Ordering::Relaxed),
                destination_objects: self.destination_objects.load(Ordering::Relaxed),
                destination_metadata_retained: self
                    .destination_metadata_retained
                    .load(Ordering::Relaxed),
                destination_page_objects_high_water: self
                    .destination_page_objects_high_water
                    .load(Ordering::Relaxed),
                delete_objects: self.delete_objects.load(Ordering::Relaxed),
                delete_batches: self.delete_batches.load(Ordering::Relaxed),
                uploaded_objects: self.uploaded_objects.load(Ordering::Relaxed),
                skipped_objects: self.skipped_objects.load(Ordering::Relaxed),
                conditional_conflicts: self.conditional_conflicts.load(Ordering::Relaxed),
                copied_objects: self.copied_objects.load(Ordering::Relaxed),
                md5_hash_attempts: self.md5_hash_attempts.load(Ordering::Relaxed),
                md5_skips: self.md5_skips.load(Ordering::Relaxed),
                catalog_skips: self.catalog_skips.load(Ordering::Relaxed),
            },
            bytes: DeploymentBytes {
                source_zip: self.source_zip_bytes.load(Ordering::Relaxed),
                uploaded: self.uploaded_bytes.load(Ordering::Relaxed),
                copied: self.copied_bytes.load(Ordering::Relaxed),
            },
            transfer: TransferStats {
                scheduled_objects: self.transfer_scheduled_objects.load(Ordering::Relaxed),
                completed_objects: self.transfer_completed_objects.load(Ordering::Relaxed),
                failed_objects: self.transfer_failed_objects.load(Ordering::Relaxed),
                cancelled_objects: self.transfer_cancelled_objects.load(Ordering::Relaxed),
                panicked_objects: self.transfer_panicked_objects.load(Ordering::Relaxed),
                in_flight_high_water: self.transfer_in_flight_high_water.load(Ordering::Relaxed),
            },
            marker_replacement: MarkerReplacementStats {
                strategy: "planning-plus-retryable-stream",
                semantics: "leftmost-longest-non-recursive",
                planned_passes_per_upload: 2,
                planning_passes: self.marker_planning_passes.load(Ordering::Relaxed),
                upload_passes: self.marker_upload_passes.load(Ordering::Relaxed),
            },
            source: SourceStats {
                planned_blocks: self.source_planned_blocks.load(Ordering::Relaxed),
                planned_bytes: self.source_planned_bytes.load(Ordering::Relaxed),
                fetched_blocks: self.source_fetched_blocks.load(Ordering::Relaxed),
                fetched_bytes: self.source_fetched_bytes.load(Ordering::Relaxed),
                get_attempts: self.source_get_attempts.load(Ordering::Relaxed),
                get_retries: self.source_get_retries.load(Ordering::Relaxed),
                get_throttled_attempts: self.source_get_throttled_attempts.load(Ordering::Relaxed),
                get_retryable_errors: self.source_get_retryable_errors.load(Ordering::Relaxed),
                get_permanent_errors: self.source_get_permanent_errors.load(Ordering::Relaxed),
                get_request_errors: self.source_get_request_errors.load(Ordering::Relaxed),
                get_body_errors: self.source_get_body_errors.load(Ordering::Relaxed),
                get_short_body_errors: self.source_get_short_body_errors.load(Ordering::Relaxed),
                get_errors: self.source_get_errors.load(Ordering::Relaxed),
                block_hits: self.source_block_hits.load(Ordering::Relaxed),
                block_misses: self.source_block_misses.load(Ordering::Relaxed),
                block_refetches: self.source_block_refetches.load(Ordering::Relaxed),
                block_waits: self.source_block_waits.load(Ordering::Relaxed),
                block_waits_fetching: self.source_block_waits_fetching.load(Ordering::Relaxed),
                block_waits_capacity: self.source_block_waits_capacity.load(Ordering::Relaxed),
                replay_claims: self.source_replay_claims.load(Ordering::Relaxed),
                replay_claims_after_release: self
                    .source_replay_claims_after_release
                    .load(Ordering::Relaxed),
                replay_claims_after_failure: self
                    .source_replay_claims_after_failure
                    .load(Ordering::Relaxed),
                body_attempts: self.source_body_attempts.load(Ordering::Relaxed),
                body_replays: self.source_body_replays.load(Ordering::Relaxed),
                active_gets_high_water: self.source_active_gets_high_water.load(Ordering::Relaxed),
                active_readers_high_water: self
                    .source_active_readers_high_water
                    .load(Ordering::Relaxed),
                resident_bytes_high_water: self
                    .source_resident_bytes_high_water
                    .load(Ordering::Relaxed),
                global_budget_bytes: self.source_global_budget_bytes.load(Ordering::Relaxed),
                global_resident_bytes_current: self
                    .source_global_resident_bytes
                    .load(Ordering::Relaxed),
                global_resident_bytes_high_water: self
                    .source_global_resident_bytes_high_water
                    .load(Ordering::Relaxed),
            },
            put_object: PutObjectStats {
                wire_attempts: self.put_wire_attempts.load(Ordering::Relaxed),
                failed_attempts: self.put_failed_attempts.load(Ordering::Relaxed),
                retry_attempts: self.put_retry_attempts.load(Ordering::Relaxed),
                throttled_attempts: self.put_throttled_attempts.load(Ordering::Relaxed),
                retry_wait_ms: self.put_retry_wait_millis.load(Ordering::Relaxed),
                throttle_cooldown_waits: self.put_throttle_cooldown_waits.load(Ordering::Relaxed),
                throttle_cooldown_wait_ms: self
                    .put_throttle_cooldown_wait_millis
                    .load(Ordering::Relaxed),
            },
        }
    }
}

pub(crate) fn duration_ms(duration: std::time::Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

pub(crate) struct ResponsePayload {
    pub(crate) physical_resource_id: String,
    pub(crate) reason: Option<String>,
    pub(crate) data: Map<String, Value>,
}
