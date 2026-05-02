use anyhow::Result;

use crate::request::compile_filters;
use crate::types::{AppState, DeploymentRequest, ObjectMetadata, RuntimeOptions};

pub(crate) mod archive;
mod destination;
mod metadata;
mod planner;
mod transfer;

pub(crate) use destination::{bucket_owned, delete_prefix};

pub(crate) const DEFAULT_MAX_PARALLEL_TRANSFERS: usize = 8;
pub(crate) const DEFAULT_SOURCE_BLOCK_BYTES: usize = 8 * 1024 * 1024;
pub(crate) const DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES: usize = 256 * 1024;
pub(crate) const DEFAULT_SOURCE_WINDOW_MEMORY_BUDGET_MB: u64 = 256;
pub(crate) const ZIP_ENTRY_READ_CHUNK_BYTES: usize = 8 * 1024 * 1024;
pub(crate) const PUT_OBJECT_MAX_ATTEMPTS: usize = 6;
pub(crate) const PUT_OBJECT_RETRY_BASE_DELAY_MS: u64 = 250;
pub(crate) const PUT_OBJECT_RETRY_MAX_DELAY_MS: u64 = 5_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS: u64 = 1_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS: u64 = 30_000;
const ADAPTIVE_CACHE_BASE_OVERHEAD: u64 = 64 * 1024 * 1024;
const ADAPTIVE_CACHE_WORKER_OVERHEAD: u64 = 12 * 1024 * 1024;
const ADAPTIVE_CACHE_FILE_OVERHEAD: u64 = 2 * 1024;
const ADAPTIVE_CACHE_LARGE_THRESHOLD: u64 = 512 * 1024 * 1024;
const ADAPTIVE_CACHE_LARGE_RSS_SLACK: u64 = 384 * 1024 * 1024;
const ADAPTIVE_CACHE_MAX_WINDOW_BYTES: u64 = 512 * 1024 * 1024;
const ADAPTIVE_SOURCE_GET_MEMORY_STEP_MB: u64 = 256;
const ADAPTIVE_SOURCE_MAX_GET_CONCURRENCY: usize = 8;
const EMBEDDED_CATALOG_PATH: &str = ".s3-unspool/catalog.v1.json";
const EMBEDDED_CATALOG_VERSION: u32 = 1;
const EMBEDDED_CATALOG_MAX_BYTES: u64 = 64 * 1024 * 1024;

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
    let minimum_block_capacity = u64::try_from(source_block_bytes.max(1))
        .unwrap_or(u64::MAX)
        .min(source_zip_bytes.max(1));
    let capacity = capacity.max(minimum_block_capacity);

    usize::try_from(capacity).unwrap_or(usize::MAX)
}

pub(crate) fn default_source_window_memory_budget_mb(available_memory_mb: u64) -> u64 {
    if available_memory_mb == 0 {
        DEFAULT_SOURCE_WINDOW_MEMORY_BUDGET_MB
    } else {
        available_memory_mb
    }
}

pub(crate) fn source_window_bytes_for_archive(
    runtime: &RuntimeOptions,
    source_zip_bytes: u64,
    zip_file_count: usize,
) -> usize {
    let memory_budget_mb = if runtime.source_window_memory_budget_mb == 0 {
        runtime.available_memory_mb
    } else {
        runtime.source_window_memory_budget_mb
    };
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

pub(crate) async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    planner::validate_request_lengths(request)?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, deployment_manifest) =
        planner::plan_deployment(state, request, &filters).await?;
    let destination_plan =
        destination::plan_destination(state, request, &filters, &deployment_manifest).await?;

    if request.extract {
        let zip_plans =
            planner::collect_zip_entry_plans(&deployment_manifest, &request.dest_bucket_prefix);
        transfer::upload_zip_entries(
            state,
            &archives,
            request,
            &metadata,
            zip_plans,
            &destination_plan.objects,
        )
        .await?;
    } else {
        let copy_plans =
            planner::collect_copy_plans(&deployment_manifest, request, &destination_plan.objects);
        transfer::execute_copy_plans(
            state,
            &request.dest_bucket_name,
            &metadata,
            copy_plans,
            request.runtime.max_parallel_transfers,
        )
        .await?;
    }

    if request.prune {
        destination::delete_keys(
            state,
            &request.dest_bucket_name,
            &destination_plan.keys_to_delete,
        )
        .await?;
    }

    Ok(())
}
