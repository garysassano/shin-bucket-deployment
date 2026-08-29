use std::sync::Arc;

use anyhow::{Context, Result};
use tokio::time::timeout_at;

use crate::deadline::InvocationDeadlines;
use crate::deployment::{DeploymentRequest, RuntimeOptions};
use crate::diagnostics::DeploymentStats;
use crate::request::compile_filters;
use crate::state::AppState;

pub(crate) mod archive;
#[cfg(feature = "bench-internals")]
#[allow(dead_code)] // linked by the criterion bench target only; the bin build compiles it unused
pub mod bench_internals;
mod content_type;
mod destination;
mod planner;
mod retry;
mod transfer;

pub(crate) use destination::{
    GuardedDeleteContext, GuardedDeleteOutcome, guarded_delete_namespace,
};

pub(crate) const DEFAULT_TRANSFER_MAX_CONCURRENCY: usize = 64;
pub(crate) const DEFAULT_SOURCE_BLOCK_BYTES: usize = 8 * 1024 * 1024;
pub(crate) const DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES: usize = 256 * 1024;
pub(crate) const ZIP_ENTRY_BODY_CHUNK_BYTES: usize = 256 * 1024;
pub(crate) const ZIP_ENTRY_BODY_PIPE_BYTES: usize = 1024 * 1024;
pub(crate) const ZIP_ENTRY_BODY_PIPE_CHUNKS: usize =
    ZIP_ENTRY_BODY_PIPE_BYTES / ZIP_ENTRY_BODY_CHUNK_BYTES;
pub(crate) const ZIP_ENTRY_READ_CHUNK_BYTES: usize = 64 * 1024;
pub(crate) const PUT_OBJECT_MAX_ATTEMPTS: usize = 6;
pub(crate) const PUT_OBJECT_RETRY_BASE_DELAY_MS: u64 = 250;
pub(crate) const PUT_OBJECT_RETRY_MAX_DELAY_MS: u64 = 5_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS: u64 = 1_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS: u64 = 30_000;
pub(crate) const S3_OBJECT_KEY_MAX_BYTES: usize = 1024;
pub(crate) const S3_SINGLE_COPY_LIMIT: u64 = 5 * 1024 * 1024 * 1024;
pub(crate) const S3_SINGLE_PUT_LIMIT: u64 = 5 * 1024 * 1024 * 1024;
const ADAPTIVE_CACHE_BASE_OVERHEAD: u64 = 64 * 1024 * 1024;
const ADAPTIVE_CACHE_WORKER_OVERHEAD: u64 = 12 * 1024 * 1024;
const ADAPTIVE_CACHE_FILE_OVERHEAD: u64 = 2 * 1024;
const ADAPTIVE_CACHE_LARGE_THRESHOLD: u64 = 512 * 1024 * 1024;
const ADAPTIVE_CACHE_LARGE_RSS_SLACK: u64 = 384 * 1024 * 1024;
const ADAPTIVE_CACHE_MAX_WINDOW_BYTES: u64 = 512 * 1024 * 1024;
const ADAPTIVE_SOURCE_GET_MEMORY_STEP_MB: u64 = 256;
const ADAPTIVE_SOURCE_MAX_GET_CONCURRENCY: usize = 8;
const EMBEDDED_CATALOG_PATH: &str = ".shin/catalog.v1.json";
const EMBEDDED_CATALOG_VERSION: u32 = 1;
const EMBEDDED_CATALOG_MAX_BYTES: u64 = 64 * 1024 * 1024;

pub(crate) enum OverlappingPreviousCleanup {
    Retain { prefix: String },
    DeleteStale { prefix: String },
}

impl OverlappingPreviousCleanup {
    fn prefix(&self) -> &str {
        match self {
            Self::Retain { prefix } | Self::DeleteStale { prefix } => prefix,
        }
    }

    /// The prefix whose stale objects the current deployment is authorized to clean
    /// up, or `None` when the overlapping previous namespace must be retained.
    fn previous_cleanup_prefix(&self) -> Option<&str> {
        match self {
            Self::DeleteStale { prefix } => Some(prefix.as_str()),
            Self::Retain { .. } => None,
        }
    }
}

pub(crate) fn adaptive_source_get_concurrency(available_memory_mb: u64) -> usize {
    let slots = available_memory_mb / ADAPTIVE_SOURCE_GET_MEMORY_STEP_MB;
    usize::try_from(slots)
        .unwrap_or(usize::MAX)
        .clamp(1, ADAPTIVE_SOURCE_MAX_GET_CONCURRENCY)
}

pub(crate) fn adaptive_source_window_bytes(
    available_memory_mb: u64,
    source_zip_bytes: u64,
    concurrency: usize,
    zip_file_count: usize,
    source_block_bytes: usize,
    source_get_concurrency: usize,
) -> usize {
    let Some(available_memory_bytes) = available_memory_mb.checked_mul(1024 * 1024) else {
        return usize::try_from(source_zip_bytes).unwrap_or(usize::MAX);
    };
    let concurrency = u64::try_from(concurrency.max(1)).unwrap_or(u64::MAX);
    let zip_file_count = u64::try_from(zip_file_count).unwrap_or(u64::MAX);
    let worker_budget = concurrency.saturating_mul(ADAPTIVE_CACHE_WORKER_OVERHEAD);
    let file_budget = zip_file_count.saturating_mul(ADAPTIVE_CACHE_FILE_OVERHEAD);
    let in_flight_budget = u64::try_from(source_get_concurrency.max(1))
        .unwrap_or(u64::MAX)
        .saturating_mul(u64::try_from(source_block_bytes).unwrap_or(u64::MAX));
    let reserved = ADAPTIVE_CACHE_BASE_OVERHEAD
        .saturating_add(worker_budget)
        .saturating_add(file_budget)
        .saturating_add(in_flight_budget);
    let capacity = available_memory_bytes
        .saturating_sub(reserved)
        .min(source_zip_bytes);
    let capacity = if capacity > ADAPTIVE_CACHE_LARGE_THRESHOLD {
        capacity.saturating_sub(ADAPTIVE_CACHE_LARGE_RSS_SLACK)
    } else {
        capacity
    }
    .min(ADAPTIVE_CACHE_MAX_WINDOW_BYTES);
    let minimum_feed_capacity = u64::try_from(source_block_bytes.max(1))
        .unwrap_or(u64::MAX)
        .saturating_mul(u64::try_from(source_get_concurrency.max(1)).unwrap_or(u64::MAX))
        .min(source_zip_bytes.max(1));
    let capacity = capacity.max(minimum_feed_capacity);

    usize::try_from(capacity).unwrap_or(usize::MAX)
}

pub(crate) fn source_window_bytes_for_archive(
    runtime: &RuntimeOptions,
    source_zip_bytes: u64,
    zip_file_count: usize,
) -> usize {
    let memory_budget_mb = u64::try_from(runtime.source_memory_budget_bytes / (1024 * 1024))
        .unwrap_or(u64::MAX)
        .max(1);
    runtime.source_window_bytes.unwrap_or_else(|| {
        adaptive_source_window_bytes(
            memory_budget_mb,
            source_zip_bytes,
            runtime.max_parallel_transfers,
            zip_file_count,
            runtime.source_block_bytes,
            runtime.source_get_concurrency,
        )
    })
}

pub(crate) async fn deploy(
    state: &AppState,
    request: &DeploymentRequest,
    overlapping_previous_cleanup: Option<&OverlappingPreviousCleanup>,
    stats: Arc<DeploymentStats>,
    deadlines: InvocationDeadlines,
) -> Result<()> {
    let started = std::time::Instant::now();
    let previous_cleanup_prefix =
        overlapping_previous_cleanup.and_then(OverlappingPreviousCleanup::previous_cleanup_prefix);
    planner::validate_request_lengths(request)?;
    let source_budget = archive::budget::SourceByteBudget::new(
        request.runtime.source_memory_budget_bytes,
        Arc::clone(&stats),
        state.detailed_failure_diagnostics,
    )?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let (archives, deployment_manifest) = timeout_at(
        deadlines.work(),
        planner::plan_deployment(state, request, &filters, &stats, Arc::clone(&source_budget)),
    )
    .await
    .context("S3 deployment planning exceeded the deployment work deadline")??;
    // planValidation (phase-level half): the deployment preflight over the
    // whole manifest. The per-archive halves (directory validation and
    // catalog-to-ZIP validation) are charged in `s3/planner.rs`; see the
    // accounting rules at the `PhaseMillis` definition site in `diagnostics.rs`.
    let started_validation = std::time::Instant::now();
    planner::validate_deployment_preflight(request, &deployment_manifest)?;
    stats.add_plan_validation_micros(crate::util::duration_micros(started_validation.elapsed()));
    let zip_plans = request.extract.then(|| {
        planner::collect_zip_entry_plans(&deployment_manifest, &request.dest_bucket_prefix)
    });
    stats.add_planned_entries(
        u64::try_from(deployment_manifest.len())
            .context("deployment manifest entry count cannot be represented safely")?,
    );
    stats.add_plan_millis(crate::util::duration_ms(started.elapsed()));

    let started = std::time::Instant::now();
    let destination_plan = timeout_at(
        deadlines.work(),
        destination::plan_destination(
            state,
            request,
            overlapping_previous_cleanup.map(OverlappingPreviousCleanup::prefix),
            previous_cleanup_prefix,
            &filters,
            &deployment_manifest,
            &stats,
        ),
    )
    .await
    .context("S3 destination planning exceeded the deployment work deadline")??;
    stats.add_destination_list_millis(crate::util::duration_ms(started.elapsed()));

    let started = std::time::Instant::now();
    if let Some(zip_plans) = zip_plans {
        transfer::upload_zip_entries(
            state,
            &archives,
            request,
            zip_plans,
            &destination_plan.objects,
            source_budget,
            transfer::TransferExecution {
                stats: Arc::clone(&stats),
                deadlines,
            },
        )
        .await?;
    } else {
        let copy_plans =
            planner::collect_copy_plans(&deployment_manifest, request, &destination_plan.objects)?;
        transfer::execute_copy_plans(
            state,
            request,
            copy_plans,
            transfer::TransferExecution {
                stats: Arc::clone(&stats),
                deadlines,
            },
        )
        .await?;
    }
    stats.add_transfer_millis(crate::util::duration_ms(started.elapsed()));

    timeout_at(
        deadlines.work(),
        destination::delete_stale_objects(
            state,
            destination::StaleCleanupContext {
                request,
                protected_prefix: overlapping_previous_cleanup
                    .map(OverlappingPreviousCleanup::prefix),
                previous_cleanup_prefix,
                filters: &filters,
                manifest: &deployment_manifest,
                destination_plan: &destination_plan,
                stats: &stats,
                work_deadline: deadlines.work(),
            },
        ),
    )
    .await
    .context("stale S3 object cleanup exceeded the deployment work deadline")??;

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::Arc;
    use std::time::Duration;

    use aws_smithy_http_client::test_util::StaticReplayClient;
    use serde_json::json;
    use tokio::time::Instant as TokioInstant;

    use crate::deadline::InvocationDeadlines;
    use crate::diagnostics::DeploymentStats;
    use crate::request::{RawDeploymentRequest, parse_request_with_memory};

    use super::{adaptive_source_window_bytes, deploy};

    #[test]
    fn observed_failure_configuration_preserves_source_feed_capacity() {
        const MIB: usize = 1024 * 1024;
        const SOURCE_BUDGET_MIB: u64 = 2048 / 2;

        assert_eq!(
            adaptive_source_window_bytes(SOURCE_BUDGET_MIB, 84 * MIB as u64, 128, 32, 8 * MIB, 8,),
            64 * MIB,
        );
    }

    #[test]
    fn adaptive_source_feed_floor_does_not_exceed_the_archive() {
        const MIB: usize = 1024 * 1024;

        assert_eq!(
            adaptive_source_window_bytes(512, 17 * MIB as u64, 128, 442, 8 * MIB, 8),
            17 * MIB,
        );
    }

    #[tokio::test]
    async fn empty_sources_are_rejected_before_any_s3_request() {
        let replay = StaticReplayClient::new(Vec::new());
        let state = crate::state::test_app_state_with_replay(replay.clone());
        let raw: RawDeploymentRequest = serde_json::from_value(json!({
            "SourceBucketNames": [],
            "SourceObjectKeys": [],
            "Destination": {
                "BucketName": "destination"
            },
            "DestinationOwnerId": "integration-owner",
            "SourceProcessing": {
                "MaxUncompressedEntryBytes": 1073741824,
                "MaxCompressionRatio": 100
            },
            "DestinationLifecycle": {
                "OnDeploy": {
                    "DeleteStaleObjects": true
                },
                "OnChange": {},
                "OnDelete": {}
            },
            "CloudfrontInvalidation": {},
            "Transfer": {
                "AdvancedTuning": {
                    "DestinationWriteRetry": {}
                }
            }
        }))
        .expect("empty source request should deserialize");
        let request = parse_request_with_memory(raw, "1024")
            .expect("empty source request should reach deploy guard");

        let error = deploy(
            &state,
            &request,
            None,
            Arc::new(DeploymentStats::default()),
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        )
        .await
        .expect_err("empty sources must fail closed");

        assert!(error.to_string().contains("at least one source"));
        assert_eq!(replay.actual_requests().count(), 0);
    }
}
