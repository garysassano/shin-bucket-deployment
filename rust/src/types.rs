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
    pub(crate) source_markers: Vec<HashMap<String, String>>,
    pub(crate) source_markers_config: Vec<MarkerConfig>,
    pub(crate) dest_bucket_name: String,
    pub(crate) dest_bucket_prefix: String,
    pub(crate) extract: bool,
    pub(crate) retain_on_delete: bool,
    pub(crate) distribution_id: Option<String>,
    pub(crate) distribution_paths: Vec<String>,
    pub(crate) wait_for_distribution_invalidation: bool,
    pub(crate) user_metadata: HashMap<String, String>,
    pub(crate) system_metadata: HashMap<String, String>,
    pub(crate) prune: bool,
    pub(crate) exclude: Vec<String>,
    pub(crate) include: Vec<String>,
    pub(crate) output_object_keys: bool,
    pub(crate) destination_bucket_arn: Option<String>,
    pub(crate) runtime: RuntimeOptions,
}

#[derive(Clone, Debug)]
pub(crate) struct RuntimeOptions {
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) source_block_bytes: usize,
    pub(crate) source_block_merge_gap_bytes: usize,
    pub(crate) source_get_concurrency: usize,
    pub(crate) source_window_bytes: Option<usize>,
    pub(crate) source_window_memory_budget_mb: u64,
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

#[derive(Clone)]
pub(crate) struct ObjectMetadata {
    pub(crate) user_metadata: HashMap<String, String>,
    pub(crate) cache_control: Option<String>,
    pub(crate) content_disposition: Option<String>,
    pub(crate) content_encoding: Option<String>,
    pub(crate) content_language: Option<String>,
    pub(crate) content_type: Option<String>,
    pub(crate) server_side_encryption: Option<String>,
    pub(crate) storage_class: Option<String>,
    pub(crate) website_redirect_location: Option<String>,
    pub(crate) sse_kms_key_id: Option<String>,
    pub(crate) acl: Option<String>,
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
        catalog_md5: Option<String>,
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
    delete_objects: AtomicU64,
    delete_batches: AtomicU64,
    uploaded_objects: AtomicU64,
    uploaded_bytes: AtomicU64,
    skipped_objects: AtomicU64,
    copied_objects: AtomicU64,
    copied_bytes: AtomicU64,
    md5_hash_attempts: AtomicU64,
    md5_skips: AtomicU64,
    catalog_skips: AtomicU64,
    source_planned_blocks: AtomicU64,
    source_planned_bytes: AtomicU64,
    source_fetched_blocks: AtomicU64,
    source_fetched_bytes: AtomicU64,
    source_get_attempts: AtomicU64,
    source_get_retries: AtomicU64,
    source_get_errors: AtomicU64,
    source_block_hits: AtomicU64,
    source_block_misses: AtomicU64,
    source_block_refetches: AtomicU64,
    source_block_waits: AtomicU64,
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
    pub(crate) request_type: &'a str,
    pub(crate) status: &'a str,
    pub(crate) extract: bool,
    pub(crate) prune: bool,
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) duration_ms: u64,
    pub(crate) phase_ms: PhaseMillis,
    pub(crate) counts: DeploymentCounts,
    pub(crate) bytes: DeploymentBytes,
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
    pub(crate) delete_objects: u64,
    pub(crate) delete_batches: u64,
    pub(crate) uploaded_objects: u64,
    pub(crate) skipped_objects: u64,
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
    pub(crate) get_errors: u64,
    pub(crate) block_hits: u64,
    pub(crate) block_misses: u64,
    pub(crate) block_refetches: u64,
    pub(crate) block_waits: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectStats {
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
    }

    pub(crate) fn add_put_stats(
        &self,
        failed_attempts: u64,
        retry_attempts: u64,
        throttled_attempts: u64,
        retry_wait_millis: u64,
        throttle_cooldown_waits: u64,
        throttle_cooldown_wait_millis: u64,
    ) {
        self.put_failed_attempts
            .fetch_add(failed_attempts, Ordering::Relaxed);
        self.put_retry_attempts
            .fetch_add(retry_attempts, Ordering::Relaxed);
        self.put_throttled_attempts
            .fetch_add(throttled_attempts, Ordering::Relaxed);
        self.put_retry_wait_millis
            .fetch_add(retry_wait_millis, Ordering::Relaxed);
        self.put_throttle_cooldown_waits
            .fetch_add(throttle_cooldown_waits, Ordering::Relaxed);
        self.put_throttle_cooldown_wait_millis
            .fetch_add(throttle_cooldown_wait_millis, Ordering::Relaxed);
    }

    pub(crate) fn snapshot<'a>(
        &'a self,
        request_type: &'a str,
        status: &'a str,
        request: &DeploymentRequest,
    ) -> DeploymentStatsSnapshot<'a> {
        DeploymentStatsSnapshot {
            event: "rbd_deployment_summary",
            request_type,
            status,
            extract: request.extract,
            prune: request.prune,
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
                delete_objects: self.delete_objects.load(Ordering::Relaxed),
                delete_batches: self.delete_batches.load(Ordering::Relaxed),
                uploaded_objects: self.uploaded_objects.load(Ordering::Relaxed),
                skipped_objects: self.skipped_objects.load(Ordering::Relaxed),
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
            source: SourceStats {
                planned_blocks: self.source_planned_blocks.load(Ordering::Relaxed),
                planned_bytes: self.source_planned_bytes.load(Ordering::Relaxed),
                fetched_blocks: self.source_fetched_blocks.load(Ordering::Relaxed),
                fetched_bytes: self.source_fetched_bytes.load(Ordering::Relaxed),
                get_attempts: self.source_get_attempts.load(Ordering::Relaxed),
                get_retries: self.source_get_retries.load(Ordering::Relaxed),
                get_errors: self.source_get_errors.load(Ordering::Relaxed),
                block_hits: self.source_block_hits.load(Ordering::Relaxed),
                block_misses: self.source_block_misses.load(Ordering::Relaxed),
                block_refetches: self.source_block_refetches.load(Ordering::Relaxed),
                block_waits: self.source_block_waits.load(Ordering::Relaxed),
            },
            put_object: PutObjectStats {
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
