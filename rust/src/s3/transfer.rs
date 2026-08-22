use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::RequestChecksumCalculation;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::MetadataDirective;
use bytes::Bytes;
use crc32fast::Hasher as Crc32Hasher;
use fastrand::Rng;
use md5::{Digest as Md5Digest, Md5};
use serde::Serialize;
use sha2::Sha256;
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::time::{Instant, sleep_until};

use crate::deadline::{InvocationDeadlines, TaskDrainBudget};
use crate::deployment::{
    DeploymentRequest, PutObjectRetryJitter, PutObjectRetryOptions, SourceArchive,
};
use crate::diagnostics::{
    CopyObjectStats, DeploymentStats, DiagnosticRangeStats, MAX_FAILURE_DIAGNOSTIC_GROUPS,
    MAX_FAILURE_DIAGNOSTIC_LABELS, OTHER_DIAGNOSTIC_LABEL, PutObjectFailureBodyStats,
    PutObjectFailureSourceStats, PutObjectFailureStateStats, PutObjectStats, SourceFetchPhase,
    TransferFetchStats, same_failure_signature,
};
use crate::replace::MarkerReplacements;
use crate::state::AppState;
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, sanitize_diagnostic};

use super::archive::block_store::{SourceAttemptSnapshot, SourceBlockOptions, SourceBlockStore};
use super::archive::budget::SourceByteBudget;
use super::archive::entry::{
    MarkerBodyContext, UploadBodyState, marker_zip_entry_body, plan_marker_zip_entry_spooled,
    validate_zip_entry_output, validate_zip_entry_size_not_exceeded, zip_entry_body,
    zip_entry_reader,
};
use super::content_type::{apply_copy_content_type, apply_put_content_type};
use super::destination::{
    DestinationObject, DestinationWritePrecondition, destination_md5_and_size_match,
    destination_write_precondition,
};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{S3_SINGLE_PUT_LIMIT, ZIP_ENTRY_READ_CHUNK_BYTES, source_window_bytes_for_archive};
use crate::util::{duration_ms, finalize_digest, lock_telemetry};

mod scheduler;

use scheduler::TransferScheduler;

const COPY_RECONCILIATION_METADATA_KEY: &str = "shin-copy-identity";
// Bump whenever the CopyObject output contract changes (for example, inferred metadata).
const COPY_RECONCILIATION_TOKEN_VERSION: &str = "shin-copy-v1";

enum UploadPayload {
    /// A fully materialized body. Produced by the comparison pass when a small entry was
    /// spooled, and by tests.
    Bytes {
        bytes: Bytes,
        body_state: Arc<UploadBodyState>,
    },
    ZipEntry {
        store: Arc<SourceBlockStore>,
        plan: std::sync::Arc<ZipEntryPlan>,
        content_length: u64,
        body_state: Arc<UploadBodyState>,
        body_attempts: Arc<AtomicUsize>,
        marker_replacements: Option<Arc<MarkerReplacements>>,
        deployment_stats: Option<Arc<DeploymentStats>>,
    },
}

pub(super) struct TransferExecution {
    pub(super) stats: Arc<DeploymentStats>,
    pub(super) deadlines: InvocationDeadlines,
}

impl UploadPayload {
    #[cfg(test)]
    fn from_bytes(bytes: Vec<u8>) -> Self {
        let body_state = Arc::new(UploadBodyState::default());
        Self::Bytes {
            bytes: Bytes::from(bytes),
            body_state,
        }
    }

    fn from_spooled_bytes(bytes: Bytes, detailed_failure_diagnostics: bool) -> Self {
        Self::Bytes {
            bytes,
            body_state: Arc::new(UploadBodyState::new(detailed_failure_diagnostics)),
        }
    }

    fn from_zip_entry(
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
        stats: &Arc<DeploymentStats>,
        detailed_failure_diagnostics: bool,
    ) -> Self {
        Self::ZipEntry {
            store,
            plan: std::sync::Arc::new(plan),
            content_length,
            body_state: Arc::new(UploadBodyState::new(detailed_failure_diagnostics)),
            body_attempts: Arc::new(AtomicUsize::new(0)),
            marker_replacements: None,
            deployment_stats: Some(Arc::clone(stats)),
        }
    }

    fn from_marker_zip_entry(
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
        marker_replacements: Arc<MarkerReplacements>,
        deployment_stats: Arc<DeploymentStats>,
        detailed_failure_diagnostics: bool,
    ) -> Self {
        Self::ZipEntry {
            store,
            plan: std::sync::Arc::new(plan),
            content_length,
            body_state: Arc::new(UploadBodyState::new(detailed_failure_diagnostics)),
            body_attempts: Arc::new(AtomicUsize::new(0)),
            marker_replacements: Some(marker_replacements),
            deployment_stats: Some(deployment_stats),
        }
    }

    fn content_length(&self) -> u64 {
        match self {
            UploadPayload::Bytes { bytes, .. } => u64::try_from(bytes.len()).unwrap_or(u64::MAX),
            UploadPayload::ZipEntry { content_length, .. } => *content_length,
        }
    }

    fn body_state(&self) -> &UploadBodyState {
        match self {
            UploadPayload::Bytes { body_state, .. }
            | UploadPayload::ZipEntry { body_state, .. } => body_state,
        }
    }

    fn source_attempt_snapshot(&self) -> Option<SourceAttemptSnapshot> {
        match self {
            UploadPayload::Bytes { .. } => None,
            UploadPayload::ZipEntry { store, .. } => Some(store.attempt_snapshot()),
        }
    }

    fn reset_attempt_diagnostics(&self) {
        self.body_state().reset_attempt_diagnostics();
    }
}

struct PreparedUploadPayload {
    payload: UploadPayload,
    etag: Option<String>,
    /// The payload already holds the decoded bytes, so the upload will not read the
    /// archive again.
    spooled: bool,
    /// This payload is a marker entry whose replaced output was retained during the
    /// comparison pass. `markerReplacement.spooledUploads` counts these, but only once
    /// the caller commits to uploading: an entry skipped by a matching destination ETag
    /// materialized a spool yet issued no PutObject, so the counter must not fire here.
    marker_spooled: bool,
}

struct WriteDiagnostics {
    wire_attempts: AtomicU64,
    failed_attempts: AtomicU64,
    retry_attempts: AtomicU64,
    throttled_attempts: AtomicU64,
    retry_wait_millis: AtomicU64,
    throttle_cooldown_waits: AtomicU64,
    throttle_cooldown_wait_millis: AtomicU64,
    failures_by_error_code: Mutex<BTreeMap<String, u64>>,
    detailed: Option<Box<DetailedWriteDiagnostics>>,
}

#[derive(Default)]
struct DetailedWriteDiagnostics {
    failures_by_sdk_error_kind: Mutex<BTreeMap<String, u64>>,
    failures_by_service_code: Mutex<BTreeMap<String, u64>>,
    failure_states: Mutex<Vec<PutObjectFailureStateStats>>,
    failure_state_overflow_attempts: AtomicU64,
}

impl Default for WriteDiagnostics {
    fn default() -> Self {
        Self::new(false)
    }
}

#[derive(Debug)]
struct WriteDiagnosticsSnapshot {
    wire_attempts: u64,
    failed_attempts: u64,
    retry_attempts: u64,
    throttled_attempts: u64,
    retry_wait_millis: u64,
    throttle_cooldown_waits: u64,
    throttle_cooldown_wait_millis: u64,
    failures_by_error_code: BTreeMap<String, u64>,
    failures_by_sdk_error_kind: BTreeMap<String, u64>,
    failures_by_service_code: BTreeMap<String, u64>,
    failure_states: Vec<PutObjectFailureStateStats>,
    failure_state_overflow_attempts: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PutObjectAttemptFailureEvent<'a> {
    event: &'static str,
    failure: &'a PutObjectFailureStateStats,
}

struct WriteRetryCoordinator {
    throttle_until: Mutex<Option<Instant>>,
    jitter: Mutex<Rng>,
}

struct PutContext<'a> {
    destination_s3: &'a S3Client,
    destination_bucket: &'a str,
    retry: &'a PutObjectRetryOptions,
    retry_coordinator: &'a WriteRetryCoordinator,
    diagnostics: &'a WriteDiagnostics,
    stats: &'a DeploymentStats,
    work_deadline: Instant,
}

struct CopyContext<'a> {
    destination_s3: &'a S3Client,
    destination_bucket: &'a str,
    retry: &'a PutObjectRetryOptions,
    retry_coordinator: &'a WriteRetryCoordinator,
    diagnostics: &'a WriteDiagnostics,
    stats: &'a DeploymentStats,
    work_deadline: Instant,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum CopyOutcome {
    Copied,
    Skipped,
}

fn record_copy_outcome(stats: &DeploymentStats, outcome: CopyOutcome, copied_bytes: u64) {
    match outcome {
        CopyOutcome::Copied => stats.add_copied_object(copied_bytes),
        CopyOutcome::Skipped => stats.add_skipped_object(),
    }
}

pub(super) async fn execute_copy_plans(
    state: &AppState,
    request: &DeploymentRequest,
    copy_plans: Vec<CopyPlan>,
    execution: TransferExecution,
) -> Result<()> {
    let TransferExecution { stats, deadlines } = execution;
    let copy_diagnostics = Arc::new(WriteDiagnostics::new(false));
    let retry_coordinator = Arc::new(WriteRetryCoordinator::new());
    let retry = request.runtime.put_object_retry.clone();
    let mut scheduler = TransferScheduler::new(
        request.runtime.max_parallel_transfers,
        Arc::clone(&stats),
        deadlines,
    );
    let copy_result = async {
        for plan in copy_plans {
            let state = state.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let copied_bytes = plan.size;
            let retry = retry.clone();
            let retry_coordinator = Arc::clone(&retry_coordinator);
            let diagnostics = Arc::clone(&copy_diagnostics);
            let stats = Arc::clone(&stats);

            scheduler
                .spawn(async move {
                    let outcome = copy_source_object(
                        CopyContext {
                            destination_s3: &state.destination_s3,
                            destination_bucket: &destination_bucket,
                            retry: &retry,
                            retry_coordinator: &retry_coordinator,
                            diagnostics: &diagnostics,
                            stats: &stats,
                            work_deadline: deadlines.work(),
                        },
                        &plan,
                    )
                    .await?;
                    record_copy_outcome(&stats, outcome, copied_bytes);
                    Ok(())
                })
                .await?;
        }

        scheduler.finish().await
    }
    .await;
    log_copy_diagnostics(&retry, &copy_diagnostics, &stats);
    copy_result
}

pub(super) async fn upload_zip_entries(
    state: &AppState,
    archives: &[SourceArchive],
    request: &DeploymentRequest,
    zip_plans: BTreeMap<usize, Vec<ZipEntryPlan>>,
    destination_objects: &HashMap<String, DestinationObject>,
    source_budget: Arc<SourceByteBudget>,
    execution: TransferExecution,
) -> Result<()> {
    let TransferExecution { stats, deadlines } = execution;
    let put_diagnostics = Arc::new(WriteDiagnostics::new(state.detailed_failure_diagnostics));
    let put_retry_coordinator = Arc::new(WriteRetryCoordinator::new());
    let mut archive_diagnostics_sources = Vec::new();
    let mut block_stores = Vec::new();
    let mut scheduler = TransferScheduler::new(
        request.runtime.max_parallel_transfers,
        Arc::clone(&stats),
        deadlines,
    );
    let task_drain_budget = scheduler.task_drain_budget();
    let spool_limit_bytes = comparison_spool_limit_bytes(request.runtime.max_parallel_transfers);
    tracing::info!(
        source_global_budget_bytes = source_budget.limit_bytes(),
        comparison_spool_limit_bytes = spool_limit_bytes,
        "configured invocation-global source byte budget"
    );

    let transfer_result = async {
        for (archive_index, plans) in zip_plans {
            let source = archives[archive_index].source.clone();
            archive_diagnostics_sources.push((archive_index, source.clone()));
            let Some(source_index) = plans.first().map(|plan| plan.source_index) else {
                continue;
            };
            debug_assert!(plans.iter().all(|plan| plan.source_index == source_index));
            let has_source_markers = !request.source_markers[source_index].is_empty();
            let plans = plans
                .into_iter()
                .filter(|plan| {
                    !catalog_skips_zip_entry(
                        plan,
                        has_source_markers,
                        destination_objects.get(&plan.relative_key),
                        &stats,
                    )
                })
                .collect::<Vec<_>>();
            if plans.is_empty() {
                continue;
            }
            let marker_replacements = compile_marker_replacements(
                &request.source_markers[source_index],
                &request.source_markers_config[source_index],
            )?;
            let source_window_bytes =
                source_window_bytes_for_archive(&request.runtime, source.len(), plans.len());
            let store = SourceBlockStore::new(
                source.clone(),
                &plans,
                SourceBlockOptions {
                    block_bytes: request.runtime.source_block_bytes,
                    merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
                    get_concurrency: request.runtime.source_get_concurrency,
                    window_bytes: source_window_bytes,
                },
                Arc::clone(&source_budget),
            )?;
            block_stores.push(Arc::clone(&store));
            tracing::info!(
                archive_index,
                source_zip_bytes = source.len(),
                planned_entries = plans.len(),
                source_block_bytes = request.runtime.source_block_bytes,
                source_block_merge_gap_bytes = request.runtime.source_block_merge_gap_bytes,
                source_get_concurrency = request.runtime.source_get_concurrency,
                source_window_bytes,
                max_parallel_transfers = request.runtime.max_parallel_transfers,
                "planned source block schedule"
            );
            let mut scheduler_started = false;
            for plan in plans {
                let task_store = Arc::clone(&store);
                let state = state.clone();
                let destination_bucket = request.dest_bucket_name.clone();
                let marker_replacements = marker_replacements.clone();
                let destination_object = destination_objects.get(&plan.relative_key).cloned();
                let put_diagnostics = put_diagnostics.clone();
                let put_retry_coordinator = put_retry_coordinator.clone();
                let put_retry = request.runtime.put_object_retry.clone();
                let stats = Arc::clone(&stats);

                scheduler
                    .spawn(async move {
                        // transferTaskTotal / transferPrepare / transferPutWait:
                        // the task body encloses the comparison pass and the
                        // destination PUT, so the two sub-spans are disjoint and
                        // their sum is at most the task total at microsecond
                        // resolution for a task that runs to completion; a task
                        // aborted at the work deadline records `transferPrepare`
                        // but never the spans it did not finish. The prepare
                        // span is recorded on every exit from
                        // `prepare_zip_entry_upload` — including the skip and
                        // error paths, which did the same comparison work. These
                        // accumulate per task and are summed across concurrently
                        // running tasks; see the `PhaseMillis` definition site
                        // in `diagnostics.rs` for why they are not a wall-clock
                        // partition of `transfer`.
                        let task_started = std::time::Instant::now();
                        let outcome = async {
                            let prepare_started = std::time::Instant::now();
                            let prepared = prepare_zip_entry_upload(
                                &task_store,
                                &plan,
                                marker_replacements,
                                destination_object.as_ref(),
                                &stats,
                                spool_limit_bytes,
                            )
                            .await;
                            stats.add_transfer_prepare_micros(crate::util::duration_micros(
                                prepare_started.elapsed(),
                            ));
                            let Some(payload) = prepared? else {
                                return Ok(());
                            };

                            let put_started = std::time::Instant::now();
                            let precondition =
                                destination_write_precondition(destination_object.as_ref());
                            let result = upload_payload(
                                PutContext {
                                    destination_s3: &state.destination_s3,
                                    destination_bucket: &destination_bucket,
                                    retry: &put_retry,
                                    retry_coordinator: &put_retry_coordinator,
                                    diagnostics: &put_diagnostics,
                                    stats: &stats,
                                    work_deadline: deadlines.work(),
                                },
                                &plan.destination_key,
                                payload,
                                precondition,
                            )
                            .await;
                            stats.add_transfer_put_wait_micros(crate::util::duration_micros(
                                put_started.elapsed(),
                            ));
                            result
                        }
                        .await;
                        stats.add_transfer_task_total_micros(crate::util::duration_micros(
                            task_started.elapsed(),
                        ));
                        outcome
                    })
                    .await?;
                if !scheduler_started {
                    store.start_scheduler();
                    scheduler_started = true;
                }
            }
        }

        scheduler.finish().await
    }
    .await;
    if let Err(error) = &transfer_result {
        for store in &block_stores {
            store.cancel(format!("transfer scheduling cancelled: {error}"));
        }
    }
    let body_drain_result = abort_and_drain_body_tasks(&block_stores, &task_drain_budget).await;
    for (archive_index, source) in archive_diagnostics_sources {
        log_source_diagnostics(archive_index, &source, &stats);
    }
    log_put_diagnostics(&request.runtime.put_object_retry, &put_diagnostics, &stats);
    match (transfer_result, body_drain_result) {
        (Ok(()), Ok(())) => Ok(()),
        (Err(error), Ok(())) | (Ok(()), Err(error)) => Err(error),
        (Err(error), Err(drain_error)) => {
            Err(error).context(format!("source task cleanup also failed: {drain_error}"))
        }
    }
}

fn catalog_skips_zip_entry(
    plan: &ZipEntryPlan,
    has_source_markers: bool,
    destination_object: Option<&DestinationObject>,
    stats: &DeploymentStats,
) -> bool {
    let skip = !has_source_markers
        && plan
            .trusted_integrity
            .as_ref()
            .zip(destination_object)
            .is_some_and(|(integrity, object)| {
                destination_md5_and_size_match(object, &integrity.md5, integrity.size)
            });
    if skip {
        stats.add_catalog_skip();
    }
    skip
}

async fn prepare_zip_entry_upload(
    store: &Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    marker_replacements: Option<Arc<MarkerReplacements>>,
    destination_object: Option<&DestinationObject>,
    stats: &Arc<DeploymentStats>,
    spool_limit_bytes: u64,
) -> Result<Option<UploadPayload>> {
    if marker_replacements.is_none() && !should_compare_marker_free_entry(plan, destination_object)
    {
        return Ok(Some(UploadPayload::from_zip_entry(
            store.clone(),
            plan.clone(),
            plan.size,
            stats,
            stats.detailed_failure_diagnostics_enabled(),
        )));
    }

    // Every entry admitted to the pre-upload comparison pass is counted exactly once
    // as an MD5 hash attempt, whichever pass runs: marker planning, or the untrusted
    // marker-free fallback. Trusted marker-free entries never reach this point (they
    // are catalog-skipped or validated inline during upload), so the two counters
    // here cover the comparison pass completely. The fallback is also reported
    // separately as `catalog.fallbackHashAttempts`.
    if marker_replacements.is_none() && plan.trusted_integrity.is_none() {
        stats.add_catalog_fallback_hash_attempt();
    } else {
        stats.add_md5_hash_attempt();
    }
    let prepared = prepare_zip_entry_for_comparison(
        store.clone(),
        plan,
        marker_replacements,
        stats,
        spool_limit_bytes,
    )
    .await?;

    if prepared
        .etag
        .as_deref()
        .is_some_and(|etag| destination_object_etag_matches(destination_object, etag))
    {
        stats.add_md5_skip();
        stats.add_skipped_object();
        return Ok(None);
    }

    // The entry is now committed to uploading, so a marker entry that retained its
    // replaced output during comparison counts as a spooled upload here — never in the
    // comparison pass, which also runs for entries the ETag check above skips.
    if prepared.marker_spooled {
        stats.add_marker_spooled_upload();
    }

    // A spooled payload no longer reads the archive, so the source blocks behind it must
    // not be pinned for a replay that will never happen.
    if !prepared.spooled {
        store.retain_zip_entry_for_replay(plan);
    }

    if let Some(etag) = prepared.etag {
        prepared.payload.body_state().record_etag_md5(etag);
    }
    Ok(Some(prepared.payload))
}

/// Total bytes the comparison pass may hold across all in-flight entries. Each scheduled
/// entry spools at most `spool_limit_bytes`, and the scheduler admits at most
/// `max_parallel_transfers` of them, so dividing the two bounds the whole deployment
/// without any runtime accounting.
const COMPARISON_SPOOL_TOTAL_BUDGET_BYTES: u64 = 16 * 1024 * 1024;

fn comparison_spool_limit_bytes(max_parallel_transfers: usize) -> u64 {
    COMPARISON_SPOOL_TOTAL_BUDGET_BYTES / (max_parallel_transfers.max(1) as u64)
}

fn should_compare_marker_free_entry(
    plan: &ZipEntryPlan,
    destination_object: Option<&DestinationObject>,
) -> bool {
    plan.trusted_integrity.is_none()
        && destination_object.is_some_and(|object| object.size == Some(plan.size))
}

async fn copy_source_object(context: CopyContext<'_>, plan: &CopyPlan) -> Result<CopyOutcome> {
    let copy_source = format!(
        "{}/{}",
        plan.source_bucket,
        urlencoding::encode(&plan.source_key).replace('+', "%20")
    );
    let reconciliation_identity = copy_reconciliation_identity(context.destination_bucket, plan);

    if plan.identity_probe
        && destination_matches_copy_identity(
            context.destination_s3,
            context.destination_bucket,
            plan,
            &reconciliation_identity,
            HeadRetries::Enabled,
        )
        .await
            == Some(true)
    {
        tracing::info!(
            destination_key = plan.destination_key,
            "destination already holds this exact copy; skipping"
        );
        return Ok(CopyOutcome::Skipped);
    }

    tracing::info!(
        source_bucket = plan.source_bucket,
        source_key = plan.source_key,
        destination_key = plan.destination_key,
        "copying source object"
    );

    let max_attempts = context.retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        if !context
            .retry_coordinator
            .wait_for_throttle_cooldown_before_deadline(context.diagnostics, context.work_deadline)
            .await
        {
            return Err(anyhow!(
                "destination CopyObject throttle cooldown for {} reaches or exceeds the deployment work deadline",
                sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
            ));
        }
        let request = context
            .destination_s3
            .copy_object()
            .bucket(context.destination_bucket)
            .key(&plan.destination_key)
            .copy_source(&copy_source)
            .copy_source_if_match(quoted_etag(&plan.expected_etag))
            .metadata(COPY_RECONCILIATION_METADATA_KEY, &reconciliation_identity)
            .metadata_directive(MetadataDirective::Replace);
        let request = apply_copy_precondition(request, plan.destination_precondition.as_ref());
        context
            .diagnostics
            .wire_attempts
            .fetch_add(1, Ordering::Relaxed);

        match apply_copy_content_type(request, &plan.destination_key)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
            )
            .send()
            .await
        {
            Ok(_) => return Ok(CopyOutcome::Copied),
            Err(error) => {
                let code = write_error_code(&error);
                let throttled = code
                    .as_deref()
                    .is_some_and(crate::util::is_throttle_error_code);
                context.diagnostics.record_failure(&error, throttled);
                let conditional_conflict = is_conditional_write_conflict(&error);
                if conditional_conflict {
                    context.stats.add_conditional_conflict();
                }
                let retryable = is_retryable_write_error(&error)
                    || is_retryable_conditional_write_conflict(&error);
                if (conditional_conflict || (retryable && attempt == max_attempts))
                    && reconcile_copy(&context, plan, &reconciliation_identity).await
                {
                    return Ok(CopyOutcome::Copied);
                }
                if retryable && attempt < max_attempts {
                    if !wait_for_write_retry_before_deadline(
                        context.retry_coordinator,
                        context.diagnostics,
                        context.retry,
                        attempt,
                        throttled,
                        context.work_deadline,
                    )
                    .await
                    {
                        return Err(error).with_context(|| {
                            format!(
                                "not retrying destination CopyObject for {} because its retry wait reaches or exceeds the deployment work deadline",
                                sanitize_diagnostic(
                                    &plan.destination_key,
                                    MAX_DIAGNOSTIC_VALUE_BYTES
                                )
                            )
                        });
                    }
                    context
                        .diagnostics
                        .retry_attempts
                        .fetch_add(1, Ordering::Relaxed);
                    let diagnostic = sanitize_diagnostic(
                        &write_error_message(&error),
                        MAX_DIAGNOSTIC_VALUE_BYTES,
                    );
                    tracing::warn!(
                        destination_key = plan.destination_key,
                        attempt,
                        max_attempts,
                        error_code = ?code.as_deref(),
                        error = %diagnostic,
                        "destination CopyObject attempt failed; retrying"
                    );
                    continue;
                }
                return Err(error).with_context(|| {
                    format!(
                        "failed to copy {}/{} to {}",
                        sanitize_diagnostic(&plan.source_bucket, MAX_DIAGNOSTIC_VALUE_BYTES),
                        sanitize_diagnostic(&plan.source_key, MAX_DIAGNOSTIC_VALUE_BYTES),
                        sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
                    )
                });
            }
        }
    }

    Err(anyhow!(
        "failed to copy {}",
        sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
    ))
}

fn quoted_etag(etag: &str) -> String {
    format!("\"{etag}\"")
}

fn apply_copy_precondition(
    request: aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder,
    precondition: Option<&DestinationWritePrecondition>,
) -> aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder {
    match precondition {
        Some(DestinationWritePrecondition::IfMatch(etag)) => request.if_match(etag.as_str()),
        Some(DestinationWritePrecondition::IfNoneMatch) => request.if_none_match("*"),
        None => request,
    }
}

fn copy_reconciliation_identity(destination_bucket: &str, plan: &CopyPlan) -> String {
    let mut hasher = Sha256::new();
    for component in [
        COPY_RECONCILIATION_TOKEN_VERSION,
        destination_bucket,
        &plan.destination_key,
        &plan.source_bucket,
        &plan.source_key,
        &plan.expected_etag,
    ] {
        hasher.update(
            u64::try_from(component.len())
                .unwrap_or(u64::MAX)
                .to_be_bytes(),
        );
        hasher.update(component.as_bytes());
    }
    hasher.update(plan.size.to_be_bytes());
    finalize_digest(hasher)
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum HeadRetries {
    Enabled,
    Disabled,
}

/// `HeadObject`s the destination and reports whether it carries exactly the identity this
/// plan writes, at exactly this plan's length. `None` means the HEAD itself failed, which
/// callers must treat as "not proven" rather than as a negative answer.
async fn destination_matches_copy_identity(
    destination_s3: &S3Client,
    destination_bucket: &str,
    plan: &CopyPlan,
    expected_identity: &str,
    retries: HeadRetries,
) -> Option<bool> {
    let request = destination_s3
        .head_object()
        .bucket(destination_bucket)
        .key(&plan.destination_key)
        .customize();
    let request = match retries {
        // The ambiguous-result path is already inside a retry loop that owns the write
        // budget, so its reconciliation HEAD must not retry on its own.
        HeadRetries::Disabled => request.config_override(
            aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
        ),
        HeadRetries::Enabled => request,
    };
    let head = match request.send().await {
        Ok(head) => head,
        Err(error) => {
            let diagnostic = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            tracing::debug!(
                destination_key = plan.destination_key,
                error = %diagnostic,
                "destination HeadObject failed; copy identity is unproven"
            );
            return None;
        }
    };
    let size_matches = head
        .content_length()
        .and_then(|size| u64::try_from(size).ok())
        == Some(plan.size);
    let identity_matches = head
        .metadata()
        .and_then(|metadata| metadata.get(COPY_RECONCILIATION_METADATA_KEY))
        .is_some_and(|identity| identity == expected_identity);
    Some(size_matches && identity_matches)
}

async fn reconcile_copy(
    context: &CopyContext<'_>,
    plan: &CopyPlan,
    expected_identity: &str,
) -> bool {
    match destination_matches_copy_identity(
        context.destination_s3,
        context.destination_bucket,
        plan,
        expected_identity,
        HeadRetries::Disabled,
    )
    .await
    {
        None => {
            tracing::warn!(
                destination_key = plan.destination_key,
                "could not reconcile an ambiguous CopyObject result"
            );
            false
        }
        Some(false) => false,
        Some(true) => {
            tracing::info!(
                destination_key = plan.destination_key,
                "ambiguous CopyObject result matched the intended object"
            );
            true
        }
    }
}

async fn prepare_zip_entry_for_comparison(
    store: Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    marker_replacements: Option<Arc<MarkerReplacements>>,
    stats: &Arc<DeploymentStats>,
    spool_limit_bytes: u64,
) -> Result<PreparedUploadPayload> {
    if let Some(replacements) = marker_replacements {
        // PutObject requires an exact length before its retryable body starts. This
        // pass validates and counts. When the replaced output fits the spool budget it
        // is retained and becomes the retryable body directly, so the upload reuses
        // this single decode; only an output over the cap incurs the second streaming
        // pass (`from_marker_zip_entry`).
        stats.add_marker_planning_pass();
        let (planned, spooled) = plan_marker_zip_entry_spooled(
            store.clone(),
            plan.clone(),
            &replacements,
            spool_limit_bytes,
            Some(TransferFetchStats {
                stats: Arc::clone(stats),
                phase: SourceFetchPhase::Prepare,
            }),
        )
        .await?;
        let etag = Some(planned.md5);
        validate_put_object_size(plan, planned.output_bytes)?;
        // Counting the spooled upload is deferred to the caller: an entry whose ETag
        // matches the destination is skipped without uploading, and must not count.
        let (payload, spooled, marker_spooled) = match spooled {
            Some(bytes) => (
                UploadPayload::from_spooled_bytes(
                    bytes,
                    stats.detailed_failure_diagnostics_enabled(),
                ),
                true,
                true,
            ),
            None => (
                UploadPayload::from_marker_zip_entry(
                    store,
                    plan.clone(),
                    planned.output_bytes,
                    replacements,
                    Arc::clone(stats),
                    stats.detailed_failure_diagnostics_enabled(),
                ),
                false,
                false,
            ),
        };
        Ok(PreparedUploadPayload {
            payload,
            etag,
            spooled,
            marker_spooled,
        })
    } else {
        // The marker-free comparison pass spools decoded output within the budget; a
        // spooled payload no longer reads the archive during upload.
        let hashed =
            hash_zip_entry_reader(store.clone(), plan.clone(), spool_limit_bytes, stats).await?;
        let spooled = hashed.spooled.is_some();
        let payload = match hashed.spooled {
            Some(bytes) => UploadPayload::from_spooled_bytes(
                bytes,
                stats.detailed_failure_diagnostics_enabled(),
            ),
            None => UploadPayload::from_zip_entry(
                store,
                plan.clone(),
                plan.size,
                stats,
                stats.detailed_failure_diagnostics_enabled(),
            ),
        };
        Ok(PreparedUploadPayload {
            payload,
            etag: Some(hashed.etag),
            spooled,
            marker_spooled: false,
        })
    }
}

fn compile_marker_replacements(
    markers: &HashMap<String, String>,
    config: &crate::deployment::MarkerConfig,
) -> Result<Option<Arc<MarkerReplacements>>> {
    if markers.is_empty() {
        Ok(None)
    } else {
        MarkerReplacements::new(markers, config)
            .map(Arc::new)
            .map(Some)
    }
}

async fn upload_payload(
    context: PutContext<'_>,
    destination_key: &str,
    payload: UploadPayload,
    precondition: Option<DestinationWritePrecondition>,
) -> Result<()> {
    let mut last_error = None;

    let max_attempts = context.retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        if !context
            .retry_coordinator
            .wait_for_throttle_cooldown_before_deadline(context.diagnostics, context.work_deadline)
            .await
        {
            return Err(anyhow!(
                "destination PutObject throttle cooldown for {} reaches or exceeds the deployment work deadline",
                sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
            ));
        }
        payload.reset_attempt_diagnostics();
        let body = payload_body(&payload);
        let request = context
            .destination_s3
            .put_object()
            .bucket(context.destination_bucket)
            .key(destination_key);
        let request = apply_put_precondition(request, precondition.as_ref());
        context
            .diagnostics
            .wire_attempts
            .fetch_add(1, Ordering::Relaxed);
        let attempt_started = context
            .diagnostics
            .detailed_failure_diagnostics_enabled()
            .then(Instant::now);

        let result = apply_put_content_type(request, destination_key)
            .body(body)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new()
                    .retry_config(RetryConfig::disabled())
                    // SSE-S3 destinations are proven by ETag, so the provider never asks the
                    // SDK to compute an additional checksum it would not otherwise send.
                    .request_checksum_calculation(RequestChecksumCalculation::WhenRequired),
            )
            .send()
            .await;
        let attempt_elapsed = attempt_started.map_or(Duration::ZERO, |started| started.elapsed());

        match result {
            Ok(_) => {
                context.stats.add_uploaded_object(payload.content_length());
                return Ok(());
            }
            Err(error)
                if !is_conditional_write_conflict(&error)
                    && payload.body_state().validation_error().is_none()
                    && is_retryable_write_error(&error)
                    && attempt < max_attempts =>
            {
                let code = write_error_code(&error);
                let throttled = code
                    .as_deref()
                    .is_some_and(crate::util::is_throttle_error_code);
                context.diagnostics.record_put_failure(
                    &error,
                    throttled,
                    attempt_elapsed,
                    &payload,
                );
                if !wait_for_write_retry_before_deadline(
                    context.retry_coordinator,
                    context.diagnostics,
                    context.retry,
                    attempt,
                    throttled,
                    context.work_deadline,
                )
                .await
                {
                    return Err(error).with_context(|| {
                        format!(
                            "not retrying destination PutObject for {} because its retry wait reaches or exceeds the deployment work deadline",
                            sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
                        )
                    });
                }
                context
                    .diagnostics
                    .retry_attempts
                    .fetch_add(1, Ordering::Relaxed);
                let diagnostic =
                    sanitize_diagnostic(&write_error_message(&error), MAX_DIAGNOSTIC_VALUE_BYTES);
                tracing::warn!(
                    destination_key,
                    attempt,
                    max_attempts,
                    error_code = ?code.as_deref(),
                    error = %diagnostic,
                    "destination PutObject attempt failed; retrying"
                );
                last_error = Some(error);
            }
            Err(error) => {
                let throttled = write_error_code(&error)
                    .as_deref()
                    .is_some_and(crate::util::is_throttle_error_code);
                context.diagnostics.record_put_failure(
                    &error,
                    throttled,
                    attempt_elapsed,
                    &payload,
                );
                if is_conditional_write_conflict(&error) {
                    context.stats.add_conditional_conflict();
                    if reconcile_conditional_put(&context, destination_key, &payload).await {
                        context.stats.add_uploaded_object(payload.content_length());
                        return Ok(());
                    }
                }
                if let Some(validation_error) = payload.body_state().validation_error() {
                    return Err(anyhow!(validation_error.to_string())).with_context(|| {
                        format!(
                            "source validation failed while uploading {}",
                            sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
                        )
                    });
                }
                return Err(error).with_context(|| {
                    format!(
                        "failed to upload {}",
                        sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
                    )
                });
            }
        }
    }

    Err(last_error.map(|error| anyhow!(error)).unwrap_or_else(|| {
        anyhow!(
            "failed to upload {}",
            sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
        )
    }))
}

fn apply_put_precondition(
    request: aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder,
    precondition: Option<&DestinationWritePrecondition>,
) -> aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder {
    match precondition {
        Some(DestinationWritePrecondition::IfMatch(etag)) => request.if_match(etag.as_str()),
        Some(DestinationWritePrecondition::IfNoneMatch) => request.if_none_match("*"),
        None => request,
    }
}

fn is_conditional_write_conflict<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
    if let SdkError::ServiceError(service) = error {
        let status = service.raw().status().as_u16();
        if status == 409 || status == 412 {
            return true;
        }
    }

    matches!(
        write_error_code(error).as_deref(),
        Some("ConditionalRequestConflict" | "PreconditionFailed")
    )
}

fn is_retryable_conditional_write_conflict<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
    if let SdkError::ServiceError(service) = error
        && service.raw().status().as_u16() == 409
    {
        return true;
    }
    write_error_code(error).as_deref() == Some("ConditionalRequestConflict")
}

fn payload_body(payload: &UploadPayload) -> ByteStream {
    match payload {
        UploadPayload::Bytes { bytes, .. } => ByteStream::from(bytes.clone()),
        UploadPayload::ZipEntry {
            store,
            plan,
            content_length,
            body_state,
            body_attempts,
            marker_replacements,
            deployment_stats,
        } => match (marker_replacements, deployment_stats) {
            (Some(marker_replacements), Some(deployment_stats)) => marker_zip_entry_body(
                store.clone(),
                plan.clone(),
                *content_length,
                Arc::clone(body_state),
                Arc::clone(body_attempts),
                MarkerBodyContext {
                    replacements: Arc::clone(marker_replacements),
                    stats: Arc::clone(deployment_stats),
                },
                Some(TransferFetchStats {
                    stats: Arc::clone(deployment_stats),
                    phase: SourceFetchPhase::Put,
                }),
            ),
            _ => zip_entry_body(
                store.clone(),
                plan.clone(),
                *content_length,
                Arc::clone(body_state),
                Arc::clone(body_attempts),
                deployment_stats.as_ref().map(|stats| TransferFetchStats {
                    stats: Arc::clone(stats),
                    phase: SourceFetchPhase::Put,
                }),
            ),
        },
    }
}

async fn reconcile_conditional_put(
    context: &PutContext<'_>,
    destination_key: &str,
    payload: &UploadPayload,
) -> bool {
    let Some(expected_identity) = payload.body_state().etag_md5() else {
        return false;
    };
    let head = match context
        .destination_s3
        .head_object()
        .bucket(context.destination_bucket)
        .key(destination_key)
        .send()
        .await
    {
        Ok(head) => head,
        Err(error) => {
            let diagnostic = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            tracing::warn!(
                destination_key,
                error = %diagnostic,
                "could not reconcile an ambiguous conditional PutObject result"
            );
            return false;
        }
    };

    let size_matches = head
        .content_length()
        .and_then(|size| u64::try_from(size).ok())
        == Some(payload.content_length());
    let content_identity_matches =
        head.e_tag().map(|etag| etag.trim_matches('"')) == Some(expected_identity);
    if !size_matches || !content_identity_matches {
        return false;
    }
    tracing::info!(
        destination_key,
        "conditional PutObject conflict matched the intended object"
    );
    true
}

fn destination_object_etag_matches(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
) -> bool {
    destination_object.and_then(|object| object.etag.as_deref()) == Some(expected_etag)
}

fn validate_put_object_size(plan: &ZipEntryPlan, output_len: u64) -> Result<()> {
    if output_len > S3_SINGLE_PUT_LIMIT {
        return Err(anyhow!(
            "marker-expanded entry `{}` is {output_len} bytes, larger than the S3 single PutObject limit",
            sanitize_diagnostic(&plan.relative_key, MAX_DIAGNOSTIC_VALUE_BYTES)
        ));
    }
    Ok(())
}

async fn hash_zip_entry_reader(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    spool_limit_bytes: u64,
    stats: &Arc<DeploymentStats>,
) -> Result<HashedZipEntry> {
    // The comparison pass is a prepare-phase read, so its source fetch waits
    // land in `transferPrepareSourceWait`.
    let reader = zip_entry_reader(
        store,
        plan.clone(),
        Some(TransferFetchStats {
            stats: Arc::clone(stats),
            phase: SourceFetchPhase::Prepare,
        }),
    )?;
    let (etag, _, _, spooled) = digest_async_reader(reader, &plan, spool_limit_bytes).await?;
    Ok(HashedZipEntry {
        etag,
        spooled: spooled.map(Bytes::from),
    })
}

struct HashedZipEntry {
    etag: String,
    /// Decoded output, retained only when the entry fit the spool limit. Reusing it turns
    /// the comparison pass and the upload into one decode instead of two.
    spooled: Option<Bytes>,
}

async fn digest_async_reader(
    mut reader: Pin<Box<dyn AsyncRead + Send>>,
    plan: &ZipEntryPlan,
    spool_limit_bytes: u64,
) -> Result<(String, u64, u32, Option<Vec<u8>>)> {
    let mut hasher = Md5::new();
    let mut crc32 = Crc32Hasher::new();
    let mut bytes = 0_u64;
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];
    // The declared size is authoritative here: `validate_zip_entry_output` rejects any
    // entry whose decoded length disagrees with it, so a hostile archive cannot use a
    // small declared size to spool a large body.
    let mut spool = (plan.size <= spool_limit_bytes)
        .then(|| Vec::with_capacity(usize::try_from(plan.size).unwrap_or(0)));

    loop {
        let bytes_read = reader.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        let next_bytes = bytes.saturating_add(bytes_read as u64);
        validate_zip_entry_size_not_exceeded(plan, next_bytes)?;
        hasher.update(&buffer[..bytes_read]);
        crc32.update(&buffer[..bytes_read]);
        if let Some(spool) = spool.as_mut() {
            spool.extend_from_slice(&buffer[..bytes_read]);
        }
        bytes = next_bytes;
    }

    let crc32 = crc32.finalize();
    validate_zip_entry_output(plan, bytes, crc32)?;
    let md5 = finalize_digest(hasher);
    plan.validate_trusted_md5(&md5)?;
    Ok((md5, bytes, crc32, spool))
}

#[cfg(test)]
async fn read_async_reader_to_vec(
    mut reader: Pin<Box<dyn AsyncRead + Send>>,
    plan: &ZipEntryPlan,
) -> Result<(Vec<u8>, u64, u32)> {
    let mut bytes = Vec::new();
    let mut md5 = plan.trusted_integrity.is_some().then(Md5::new);
    let mut crc32 = Crc32Hasher::new();
    let mut total_bytes = 0_u64;
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        let next_bytes = total_bytes.saturating_add(bytes_read as u64);
        validate_zip_entry_size_not_exceeded(plan, next_bytes)?;
        if let Some(md5) = md5.as_mut() {
            md5.update(&buffer[..bytes_read]);
        }
        crc32.update(&buffer[..bytes_read]);
        bytes.extend_from_slice(&buffer[..bytes_read]);
        total_bytes = next_bytes;
    }

    let crc32 = crc32.finalize();
    validate_zip_entry_output(plan, total_bytes, crc32)?;
    if let Some(md5) = md5 {
        plan.validate_trusted_md5(&finalize_digest(md5))?;
    }
    Ok((bytes, total_bytes, crc32))
}

#[cfg(test)]
fn md5_hex(bytes: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(bytes);
    finalize_digest(hasher)
}

async fn abort_and_drain_body_tasks(
    stores: &[Arc<SourceBlockStore>],
    drain_budget: &TaskDrainBudget,
) -> Result<()> {
    let mut first_error = None;
    for store in stores {
        if let Err(error) = store
            .abort_and_drain_body_tasks(drain_budget.deadline())
            .await
            && first_error.is_none()
        {
            first_error = Some(error);
        }
    }
    first_error.map_or(Ok(()), Err)
}

fn write_retry_cap_millis(attempt: usize, throttled: bool, retry: &PutObjectRetryOptions) -> u64 {
    let (base, max) = write_retry_delay_bounds(throttled, retry);
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    base.saturating_mul(multiplier).min(max)
}

fn is_retryable_write_error<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
    match error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            status == 408
                || status == 429
                || status >= 500
                || service.err().code().is_some_and(|code| {
                    crate::util::is_throttle_error_code(code)
                        || matches!(
                            code,
                            "InternalError" | "RequestTimeout" | "RequestTimeoutException"
                        )
                })
        }
        SdkError::TimeoutError(_) | SdkError::DispatchFailure(_) => true,
        SdkError::ResponseError(response) => {
            let status = response.raw().status().as_u16();
            status == 408 || status == 429 || status >= 500
        }
        SdkError::ConstructionFailure(_) => false,
        _ => false,
    }
}

fn write_retry_delay_bounds(throttled: bool, retry: &PutObjectRetryOptions) -> (u64, u64) {
    if throttled {
        (
            retry.slowdown_retry_base_delay_ms,
            retry.slowdown_retry_max_delay_ms,
        )
    } else {
        (retry.retry_base_delay_ms, retry.retry_max_delay_ms)
    }
}

fn full_jitter_delay(cap_millis: u64, jitter: u64) -> Duration {
    if cap_millis == 0 {
        return Duration::ZERO;
    }
    Duration::from_millis(jitter % cap_millis.saturating_add(1))
}

async fn wait_for_write_retry_before_deadline(
    coordinator: &WriteRetryCoordinator,
    diagnostics: &WriteDiagnostics,
    retry: &PutObjectRetryOptions,
    attempt: usize,
    throttled: bool,
    work_deadline: Instant,
) -> bool {
    let delay = coordinator.retry_delay(attempt, throttled, retry);
    if throttled {
        coordinator.extend_throttle_cooldown(delay);
        coordinator
            .wait_for_throttle_cooldown_before_deadline(diagnostics, work_deadline)
            .await
    } else {
        let now = Instant::now();
        let Some(wake) = now.checked_add(delay) else {
            return false;
        };
        if wake >= work_deadline {
            return false;
        }
        sleep_until(wake).await;
        diagnostics
            .retry_wait_millis
            .fetch_add(duration_ms(delay), Ordering::Relaxed);
        true
    }
}

impl WriteDiagnostics {
    fn new(detailed_failure_diagnostics: bool) -> Self {
        Self {
            wire_attempts: AtomicU64::new(0),
            failed_attempts: AtomicU64::new(0),
            retry_attempts: AtomicU64::new(0),
            throttled_attempts: AtomicU64::new(0),
            retry_wait_millis: AtomicU64::new(0),
            throttle_cooldown_waits: AtomicU64::new(0),
            throttle_cooldown_wait_millis: AtomicU64::new(0),
            failures_by_error_code: Mutex::new(BTreeMap::new()),
            detailed: detailed_failure_diagnostics
                .then(|| Box::new(DetailedWriteDiagnostics::default())),
        }
    }

    fn detailed_failure_diagnostics_enabled(&self) -> bool {
        self.detailed.is_some()
    }

    fn record_failure<E: ProvideErrorMetadata>(&self, error: &SdkError<E>, throttled: bool) {
        self.failed_attempts.fetch_add(1, Ordering::Relaxed);
        if throttled {
            self.throttled_attempts.fetch_add(1, Ordering::Relaxed);
        }
        let code = write_error_code(error).unwrap_or_else(|| write_error_kind(error).to_string());
        let mut failures = lock_telemetry(&self.failures_by_error_code);
        *failures.entry(code).or_default() += 1;
    }

    fn record_put_failure<E: ProvideErrorMetadata>(
        &self,
        error: &SdkError<E>,
        throttled: bool,
        elapsed: Duration,
        payload: &UploadPayload,
    ) {
        self.record_failure(error, throttled);
        let Some(detailed) = &self.detailed else {
            return;
        };

        let sdk_error_kind = write_error_kind(error).to_string();
        let service_code = write_error_code(error).map(|code| sanitize_diagnostic_label(&code));
        let dispatch_failure_kind = dispatch_failure_kind(error).map(str::to_string);
        record_bounded_diagnostic_count(
            &detailed.failures_by_sdk_error_kind,
            sdk_error_kind.clone(),
        );
        if let Some(code) = &service_code {
            record_bounded_diagnostic_count(&detailed.failures_by_service_code, code.clone());
        }

        let body_snapshot = payload.body_state().attempt_snapshot();
        let source_snapshot = body_snapshot
            .as_ref()
            .and_then(|body| body.source_at_receiver_drop.clone())
            .or_else(|| payload.source_attempt_snapshot());
        let failure = PutObjectFailureStateStats {
            count: 1,
            sdk_error_kind,
            dispatch_failure_kind,
            service_code,
            elapsed_ms: DiagnosticRangeStats::single(duration_ms(elapsed)),
            body: match body_snapshot {
                Some(body) => PutObjectFailureBodyStats {
                    attempt_observed: true,
                    replay: body.replay,
                    producer_stage: body.producer_stage.to_string(),
                    final_frame_delivered: body.final_frame_delivered,
                    producer_completed: body.producer_completed,
                    body_error_observed: body.body_error_observed,
                    receiver_dropped: body.receiver_dropped,
                    receiver_drop_aborted_producer: body.receiver_drop_aborted_producer,
                    attempt_number: DiagnosticRangeStats::single(body.attempt_number),
                    bytes_emitted: DiagnosticRangeStats::single(body.bytes_emitted),
                    remaining_bytes: DiagnosticRangeStats::single(body.remaining_bytes),
                },
                None => PutObjectFailureBodyStats::not_observed(),
            },
            source: match source_snapshot {
                Some(source) => PutObjectFailureSourceStats {
                    observed: true,
                    local_window_bytes: DiagnosticRangeStats::single(source.local_window_bytes),
                    local_committed_bytes: DiagnosticRangeStats::single(
                        source.local_committed_bytes,
                    ),
                    local_resident_bytes: DiagnosticRangeStats::single(source.local_resident_bytes),
                    local_capacity_waiters: DiagnosticRangeStats::single(
                        source.local_capacity_waiters,
                    ),
                    global_budget_bytes: DiagnosticRangeStats::single(source.global_budget_bytes),
                    global_resident_bytes: DiagnosticRangeStats::single(
                        source.global_resident_bytes,
                    ),
                    global_available_permits: DiagnosticRangeStats::single(
                        source.global_available_permits,
                    ),
                    global_permit_unit_bytes: DiagnosticRangeStats::single(
                        source.global_permit_unit_bytes,
                    ),
                    global_permit_waiters: DiagnosticRangeStats::single(
                        source.global_permit_waiters,
                    ),
                    active_fetches: DiagnosticRangeStats::single(source.active_fetches),
                },
                None => PutObjectFailureSourceStats::not_observed(),
            },
        };
        log_put_attempt_failure(&failure);

        let mut failures = lock_telemetry(&detailed.failure_states);
        if let Some(existing) = failures
            .iter_mut()
            .find(|existing| same_failure_signature(existing, &failure))
        {
            existing.merge(&failure);
        } else if failures.len() < MAX_FAILURE_DIAGNOSTIC_GROUPS {
            failures.push(failure);
        } else {
            detailed
                .failure_state_overflow_attempts
                .fetch_add(1, Ordering::Relaxed);
        }
    }

    fn snapshot(&self) -> WriteDiagnosticsSnapshot {
        WriteDiagnosticsSnapshot {
            wire_attempts: self.wire_attempts.load(Ordering::Relaxed),
            failed_attempts: self.failed_attempts.load(Ordering::Relaxed),
            retry_attempts: self.retry_attempts.load(Ordering::Relaxed),
            throttled_attempts: self.throttled_attempts.load(Ordering::Relaxed),
            retry_wait_millis: self.retry_wait_millis.load(Ordering::Relaxed),
            throttle_cooldown_waits: self.throttle_cooldown_waits.load(Ordering::Relaxed),
            throttle_cooldown_wait_millis: self
                .throttle_cooldown_wait_millis
                .load(Ordering::Relaxed),
            failures_by_error_code: lock_telemetry(&self.failures_by_error_code).clone(),
            failures_by_sdk_error_kind: self
                .detailed
                .as_ref()
                .map_or_else(BTreeMap::new, |detailed| {
                    lock_telemetry(&detailed.failures_by_sdk_error_kind).clone()
                }),
            failures_by_service_code: self
                .detailed
                .as_ref()
                .map_or_else(BTreeMap::new, |detailed| {
                    lock_telemetry(&detailed.failures_by_service_code).clone()
                }),
            failure_states: self.detailed.as_ref().map_or_else(Vec::new, |detailed| {
                lock_telemetry(&detailed.failure_states).clone()
            }),
            failure_state_overflow_attempts: self.detailed.as_ref().map_or(0, |detailed| {
                detailed
                    .failure_state_overflow_attempts
                    .load(Ordering::Relaxed)
            }),
        }
    }
}

impl DiagnosticRangeStats {
    fn single(value: u64) -> Self {
        Self {
            min: value,
            max: value,
            total: value,
        }
    }
}

impl PutObjectFailureBodyStats {
    fn not_observed() -> Self {
        Self {
            attempt_observed: false,
            replay: false,
            producer_stage: "not-observed".to_string(),
            final_frame_delivered: false,
            producer_completed: false,
            body_error_observed: false,
            receiver_dropped: false,
            receiver_drop_aborted_producer: false,
            attempt_number: DiagnosticRangeStats::single(0),
            bytes_emitted: DiagnosticRangeStats::single(0),
            remaining_bytes: DiagnosticRangeStats::single(0),
        }
    }
}

impl PutObjectFailureSourceStats {
    fn not_observed() -> Self {
        Self {
            observed: false,
            local_window_bytes: DiagnosticRangeStats::single(0),
            local_committed_bytes: DiagnosticRangeStats::single(0),
            local_resident_bytes: DiagnosticRangeStats::single(0),
            local_capacity_waiters: DiagnosticRangeStats::single(0),
            global_budget_bytes: DiagnosticRangeStats::single(0),
            global_resident_bytes: DiagnosticRangeStats::single(0),
            global_available_permits: DiagnosticRangeStats::single(0),
            global_permit_unit_bytes: DiagnosticRangeStats::single(0),
            global_permit_waiters: DiagnosticRangeStats::single(0),
            active_fetches: DiagnosticRangeStats::single(0),
        }
    }
}

fn record_bounded_diagnostic_count(target: &Mutex<BTreeMap<String, u64>>, label: String) {
    let mut counts = lock_telemetry(target);
    if let Some(count) = counts.get_mut(&label) {
        *count = count.saturating_add(1);
    } else if label != OTHER_DIAGNOSTIC_LABEL
        && counts.len() < MAX_FAILURE_DIAGNOSTIC_LABELS.saturating_sub(1)
    {
        counts.insert(label, 1);
    } else {
        let count = counts
            .entry(OTHER_DIAGNOSTIC_LABEL.to_string())
            .or_default();
        *count = count.saturating_add(1);
    }
}

fn sanitize_diagnostic_label(value: &str) -> String {
    const MAX_LABEL_BYTES: usize = 64;
    if !value
        .as_bytes()
        .first()
        .is_some_and(u8::is_ascii_alphabetic)
        || value.len() > MAX_LABEL_BYTES
        || !value.bytes().all(|byte| byte.is_ascii_alphanumeric())
    {
        OTHER_DIAGNOSTIC_LABEL.to_string()
    } else {
        value.to_string()
    }
}

fn dispatch_failure_kind<E>(error: &SdkError<E>) -> Option<&'static str> {
    let SdkError::DispatchFailure(dispatch) = error else {
        return None;
    };
    Some(if dispatch.is_timeout() {
        "timeout"
    } else if dispatch.is_io() {
        "io"
    } else if dispatch.is_user() {
        "user"
    } else {
        "other"
    })
}

fn log_put_attempt_failure(failure: &PutObjectFailureStateStats) {
    match serialize_put_attempt_failure(failure) {
        Ok(attempt_failure) => {
            tracing::warn!(attempt_failure, "shin PutObject attempt failure");
        }
        Err(error) => {
            let error = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            tracing::warn!(error = %error, "failed to serialize PutObject attempt failure");
        }
    }
}

fn serialize_put_attempt_failure(
    failure: &PutObjectFailureStateStats,
) -> serde_json::Result<String> {
    serde_json::to_string(&PutObjectAttemptFailureEvent {
        event: "shin_put_object_attempt_failure",
        failure,
    })
}

impl WriteRetryCoordinator {
    fn new() -> Self {
        Self {
            throttle_until: Mutex::new(None),
            jitter: Mutex::new(Rng::new()),
        }
    }

    async fn wait_for_throttle_cooldown_before_deadline(
        &self,
        diagnostics: &WriteDiagnostics,
        work_deadline: Instant,
    ) -> bool {
        loop {
            let wait = {
                let throttle_until = self
                    .throttle_until
                    .lock()
                    .expect("write retry coordinator mutex should not be poisoned");
                throttle_until.and_then(|deadline| {
                    deadline
                        .checked_duration_since(Instant::now())
                        .map(|delay| (deadline, delay))
                })
            };
            let Some((wake, delay)) = wait else {
                return true;
            };
            if delay.is_zero() {
                return true;
            }
            if wake >= work_deadline {
                return false;
            }

            sleep_until(wake).await;
            diagnostics
                .throttle_cooldown_waits
                .fetch_add(1, Ordering::Relaxed);
            diagnostics
                .throttle_cooldown_wait_millis
                .fetch_add(duration_ms(delay), Ordering::Relaxed);
        }
    }

    fn retry_delay(
        &self,
        attempt: usize,
        throttled: bool,
        retry: &PutObjectRetryOptions,
    ) -> Duration {
        let delay_millis = write_retry_cap_millis(attempt, throttled, retry);
        match retry.jitter {
            PutObjectRetryJitter::Full => full_jitter_delay(delay_millis, self.next_jitter()),
            PutObjectRetryJitter::None => Duration::from_millis(delay_millis),
        }
    }

    fn extend_throttle_cooldown(&self, delay: Duration) {
        if delay.is_zero() {
            return;
        }

        let now = Instant::now();
        let deadline = now.checked_add(delay).unwrap_or(now);
        let mut throttle_until = self
            .throttle_until
            .lock()
            .expect("write retry coordinator mutex should not be poisoned");
        if throttle_until.is_none_or(|current| deadline > current) {
            *throttle_until = Some(deadline);
        }
    }

    fn next_jitter(&self) -> u64 {
        self.jitter
            .lock()
            .expect("write retry jitter mutex should not be poisoned")
            .u64(..)
    }
}

fn write_error_kind<E>(error: &SdkError<E>) -> &'static str {
    match error {
        SdkError::ConstructionFailure(_) => "ConstructionFailure",
        SdkError::TimeoutError(_) => "TimeoutError",
        SdkError::DispatchFailure(_) => "DispatchFailure",
        SdkError::ResponseError(_) => "ResponseError",
        SdkError::ServiceError(_) => "ServiceError",
        _ => "SdkError",
    }
}

fn log_source_diagnostics(
    archive_index: usize,
    source: &super::archive::SourceClient,
    stats: &DeploymentStats,
) {
    let diagnostics = source.diagnostics();
    stats.add_source_stats(&diagnostics);
    tracing::info!(
        archive_index,
        source_zip_bytes = diagnostics.source_zip_bytes,
        planned_entries = diagnostics.planned_entries,
        planned_blocks = diagnostics.planned_blocks,
        planned_source_bytes = diagnostics.planned_source_bytes,
        source_block_bytes = diagnostics.source_block_bytes,
        source_block_merge_gap_bytes = diagnostics.source_block_merge_gap_bytes,
        source_get_concurrency = diagnostics.source_get_concurrency,
        source_window_bytes = diagnostics.source_window_bytes,
        fetched_blocks = diagnostics.fetched_blocks,
        fetched_source_bytes = diagnostics.fetched_source_bytes,
        source_amplification = diagnostics.source_amplification,
        source_get_attempts = diagnostics.source_get_attempts,
        source_get_retries = diagnostics.source_get_retries,
        source_get_request_errors = diagnostics.source_get_request_errors,
        source_get_body_errors = diagnostics.source_get_body_errors,
        source_get_short_body_errors = diagnostics.source_get_short_body_errors,
        source_get_throttled_attempts = diagnostics.source_get_throttled_attempts,
        source_get_retryable_errors = diagnostics.source_get_retryable_errors,
        source_get_permanent_errors = diagnostics.source_get_permanent_errors,
        source_get_errors = diagnostics.source_get_errors,
        block_hits = diagnostics.block_hits,
        block_waits = diagnostics.block_waits,
        block_waits_fetching = diagnostics.block_waits_fetching,
        block_waits_capacity = diagnostics.block_waits_capacity,
        block_releases = diagnostics.block_releases,
        block_misses = diagnostics.block_misses,
        block_refetches = diagnostics.block_refetches,
        replay_claims = diagnostics.replay_claims,
        replay_claims_after_release = diagnostics.replay_claims_after_release,
        replay_claims_after_failure = diagnostics.replay_claims_after_failure,
        body_attempts = diagnostics.body_attempts,
        body_replays = diagnostics.body_replays,
        active_gets_high_water = diagnostics.active_gets_high_water,
        active_readers_high_water = diagnostics.active_readers_high_water,
        resident_bytes_high_water = diagnostics.resident_bytes_high_water,
        "source block diagnostics"
    );
}

fn log_put_diagnostics(
    retry: &PutObjectRetryOptions,
    diagnostics: &WriteDiagnostics,
    stats: &DeploymentStats,
) {
    let diagnostics = diagnostics.snapshot();
    stats.add_put_stats(&PutObjectStats {
        wire_attempts: diagnostics.wire_attempts,
        failed_attempts: diagnostics.failed_attempts,
        retry_attempts: diagnostics.retry_attempts,
        throttled_attempts: diagnostics.throttled_attempts,
        retry_wait_ms: diagnostics.retry_wait_millis,
        throttle_cooldown_waits: diagnostics.throttle_cooldown_waits,
        throttle_cooldown_wait_ms: diagnostics.throttle_cooldown_wait_millis,
        failures_by_sdk_error_kind: diagnostics.failures_by_sdk_error_kind.clone(),
        failures_by_service_code: diagnostics.failures_by_service_code.clone(),
        failure_states: diagnostics.failure_states.clone(),
        failure_state_overflow_attempts: diagnostics.failure_state_overflow_attempts,
    });
    tracing::info!(
        max_attempts = retry.max_attempts,
        retry_base_delay_ms = retry.retry_base_delay_ms,
        retry_max_delay_ms = retry.retry_max_delay_ms,
        slowdown_retry_base_delay_ms = retry.slowdown_retry_base_delay_ms,
        slowdown_retry_max_delay_ms = retry.slowdown_retry_max_delay_ms,
        retry_jitter = ?retry.jitter,
        wire_attempts = diagnostics.wire_attempts,
        failed_attempts = diagnostics.failed_attempts,
        retry_attempts = diagnostics.retry_attempts,
        throttled_attempts = diagnostics.throttled_attempts,
        retry_wait_millis = diagnostics.retry_wait_millis,
        throttle_cooldown_waits = diagnostics.throttle_cooldown_waits,
        throttle_cooldown_wait_millis = diagnostics.throttle_cooldown_wait_millis,
        failures_by_error_code = ?diagnostics.failures_by_error_code,
        "destination PutObject diagnostics"
    );
}

fn log_copy_diagnostics(
    retry: &PutObjectRetryOptions,
    diagnostics: &WriteDiagnostics,
    stats: &DeploymentStats,
) {
    let diagnostics = diagnostics.snapshot();
    // Reuse the snapshot already taken for the log line so the structured summary
    // carries the same counters without a second pass over the diagnostics.
    stats.add_copy_stats(&CopyObjectStats {
        wire_attempts: diagnostics.wire_attempts,
        failed_attempts: diagnostics.failed_attempts,
        retry_attempts: diagnostics.retry_attempts,
        throttled_attempts: diagnostics.throttled_attempts,
        retry_wait_ms: diagnostics.retry_wait_millis,
        throttle_cooldown_waits: diagnostics.throttle_cooldown_waits,
        throttle_cooldown_wait_ms: diagnostics.throttle_cooldown_wait_millis,
    });
    tracing::info!(
        max_attempts = retry.max_attempts,
        retry_base_delay_ms = retry.retry_base_delay_ms,
        retry_max_delay_ms = retry.retry_max_delay_ms,
        slowdown_retry_base_delay_ms = retry.slowdown_retry_base_delay_ms,
        slowdown_retry_max_delay_ms = retry.slowdown_retry_max_delay_ms,
        retry_jitter = ?retry.jitter,
        wire_attempts = diagnostics.wire_attempts,
        failed_attempts = diagnostics.failed_attempts,
        retry_attempts = diagnostics.retry_attempts,
        throttled_attempts = diagnostics.throttled_attempts,
        retry_wait_millis = diagnostics.retry_wait_millis,
        throttle_cooldown_waits = diagnostics.throttle_cooldown_waits,
        throttle_cooldown_wait_millis = diagnostics.throttle_cooldown_wait_millis,
        failures_by_error_code = ?diagnostics.failures_by_error_code,
        "destination CopyObject diagnostics"
    );
}

fn write_error_code<E: ProvideErrorMetadata>(error: &SdkError<E>) -> Option<String> {
    match error {
        SdkError::ServiceError(service) => service.err().code().map(ToOwned::to_owned),
        _ => None,
    }
}

fn write_error_message<E>(error: &SdkError<E>) -> String
where
    E: ProvideErrorMetadata + std::fmt::Display,
{
    match error {
        SdkError::ServiceError(service) => service
            .err()
            .message()
            .unwrap_or("service error")
            .to_string(),
        SdkError::ConstructionFailure(error) => format!("construction failure: {error:?}"),
        SdkError::TimeoutError(error) => format!("timeout: {error:?}"),
        SdkError::DispatchFailure(error) => format!("dispatch failure: {error:?}"),
        SdkError::ResponseError(error) => format!("response error: {error:?}"),
        _ => error.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use std::collections::{BTreeMap, HashMap};
    use std::io::{Cursor, Write};
    use std::panic::{AssertUnwindSafe, catch_unwind};
    use std::sync::atomic::AtomicUsize;
    use std::sync::{Arc, Mutex};

    use anyhow::Result;
    use aws_sdk_s3::error::ConnectorError;
    use aws_sdk_s3::operation::put_object::PutObjectError;
    use aws_sdk_s3::primitives::{ByteStream, SdkBody};
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};
    use tracing::instrument::WithSubscriber as _;
    use tracing_subscriber::fmt::MakeWriter;
    use tracing_subscriber::layer::SubscriberExt;

    use super::super::destination::{
        DestinationObject, DestinationWritePrecondition, destination_write_precondition,
    };
    use crate::deadline::InvocationDeadlines;
    use crate::deployment::{
        DeploymentRequest, MarkerConfig, PutObjectRetryJitter, PutObjectRetryOptions,
        SourceArchive, TrustedEntryIntegrity,
    };
    use crate::diagnostics::DeploymentStats;
    use crate::replace::MarkerReplacements;
    use crate::s3::archive::block_store::{SourceBlockOptions, SourceBlockStore};
    use crate::s3::archive::budget::SourceByteBudget;
    use crate::s3::archive::entry::{MarkerBodyContext, UploadBodyState, marker_zip_entry_body};
    use crate::s3::archive::prepare_source_zip;
    use crate::s3::archive::tests::{
        ready_store_for_plan_with_claims, zip_from_entry, zip_plan_from_archive,
    };
    use crate::s3::planner::{CopyPlan, ZipEntryPlan};
    use crate::s3::source_window_bytes_for_archive;
    use crate::state::test_app_state_with_replay;
    use crate::util::{duration_ms, finalize_digest};
    use md5::{Digest as Md5Digest, Md5};
    use std::time::Duration;
    use tokio::time::Instant as TokioInstant;

    use super::{
        COMPARISON_SPOOL_TOTAL_BUDGET_BYTES, COPY_RECONCILIATION_METADATA_KEY, CopyContext,
        CopyOutcome, PutContext, TransferExecution, UploadPayload, WriteDiagnostics,
        WriteDiagnosticsSnapshot, WriteRetryCoordinator, catalog_skips_zip_entry,
        comparison_spool_limit_bytes, compile_marker_replacements, copy_reconciliation_identity,
        copy_source_object, digest_async_reader, dispatch_failure_kind, log_copy_diagnostics,
        log_put_diagnostics, md5_hex, payload_body, prepare_zip_entry_upload, quoted_etag,
        read_async_reader_to_vec, record_bounded_diagnostic_count, record_copy_outcome,
        sanitize_diagnostic_label, serialize_put_attempt_failure, should_compare_marker_free_entry,
        upload_payload, upload_zip_entries, write_error_kind, write_retry_cap_millis,
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

    fn test_log_subscriber(writer: TestWriter) -> impl tracing::Subscriber + Send + Sync + 'static {
        tracing_subscriber::registry().with(
            tracing_subscriber::fmt::layer()
                .without_time()
                .with_ansi(false)
                .with_writer(writer),
        )
    }

    fn poison_telemetry<T>(telemetry: &Mutex<T>) {
        let panic = catch_unwind(AssertUnwindSafe(|| {
            let _guard = telemetry.lock().expect("initial telemetry lock");
            panic!("injected telemetry writer panic");
        }));
        assert!(panic.is_err());
        assert!(telemetry.is_poisoned());
    }

    #[test]
    fn pre_callback_put_diagnostics_aggregate_after_telemetry_poisoning() {
        let diagnostics = WriteDiagnostics::new(true);
        poison_telemetry(&diagnostics.failures_by_error_code);
        let detailed = diagnostics
            .detailed
            .as_ref()
            .expect("detailed diagnostics enabled");
        poison_telemetry(&detailed.failures_by_sdk_error_kind);
        poison_telemetry(&detailed.failures_by_service_code);
        poison_telemetry(&detailed.failure_states);

        let stats = DeploymentStats::new(true);
        log_put_diagnostics(&test_retry_options(), &diagnostics, &stats);

        assert!(diagnostics.failures_by_error_code.is_poisoned());
        assert!(detailed.failures_by_sdk_error_kind.is_poisoned());
        assert!(detailed.failures_by_service_code.is_poisoned());
        assert!(detailed.failure_states.is_poisoned());
    }

    #[test]
    fn md5_hex_matches_known_digest() {
        assert_eq!(
            md5_hex(b"hello"),
            "5d41402abc4b2a76b9719d911017c592".to_string()
        );
    }

    #[test]
    fn only_authenticated_catalog_integrity_enables_sparse_skips() {
        let object = DestinationObject {
            etag: Some("5d41402abc4b2a76b9719d911017c592".to_string()),
            size: Some(5),
        };
        let stats = DeploymentStats::default();
        let mut plan = integrity_plan(b"hello", None);

        assert!(!catalog_skips_zip_entry(
            &plan,
            false,
            Some(&object),
            &stats,
        ));

        plan.trusted_integrity = Some(TrustedEntryIntegrity {
            size: 5,
            md5: "5d41402abc4b2a76b9719d911017c592".to_string(),
        });
        assert!(catalog_skips_zip_entry(&plan, false, Some(&object), &stats,));
    }

    #[test]
    fn compiled_marker_replacements_are_shared_without_cloning_the_matcher() {
        let markers = HashMap::from([("marker".to_string(), "value".to_string())]);
        let replacements = compile_marker_replacements(&markers, &Default::default())
            .expect("marker replacements should compile")
            .expect("non-empty markers should produce replacements");
        let shared = Arc::clone(&replacements);

        assert!(Arc::ptr_eq(&replacements, &shared));
        assert!(
            compile_marker_replacements(&HashMap::new(), &Default::default())
                .expect("empty markers should be accepted")
                .is_none()
        );
    }

    #[test]
    fn an_untrusted_entry_is_compared_when_the_destination_length_already_matches() {
        let plan = integrity_plan(b"hello", None);
        let object = DestinationObject {
            etag: Some("5d41402abc4b2a76b9719d911017c592".to_string()),
            size: Some(5),
        };

        assert!(should_compare_marker_free_entry(&plan, Some(&object)));
        assert!(
            !should_compare_marker_free_entry(
                &plan,
                Some(&DestinationObject {
                    etag: object.etag.clone(),
                    size: Some(6),
                })
            ),
            "a different length is settled from the listing without hashing"
        );
    }

    #[tokio::test]
    async fn sse_s3_conflict_reconciliation_uses_md5_etag_without_acl_reads() {
        let exact_headers = vec![
            ("content-length", "5"),
            ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
        ];
        let (result, requests, checksum_mode_requested) = run_ambiguous_put(exact_headers).await;
        result.expect("an exact SSE-S3 object should reconcile");
        assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        assert!(!checksum_mode_requested);

        for mismatched_headers in [
            vec![
                ("content-length", "6"),
                ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
            ],
            vec![
                ("content-length", "5"),
                ("etag", "\"00000000000000000000000000000000\""),
            ],
        ] {
            let (result, requests, _) = run_ambiguous_put(mismatched_headers).await;
            assert!(result.is_err());
            assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        }
    }

    #[tokio::test]
    async fn permanent_put_4xx_is_not_retried() {
        let replay = StaticReplayClient::new(vec![error_event(400, "InvalidRequest")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let retry = test_retry_options();

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"]
        );
        let request = replay.actual_requests().next().expect("one PUT request");
        for checksum_header in [
            "x-amz-sdk-checksum-algorithm",
            "x-amz-checksum-crc32",
            "x-amz-checksum-crc32c",
            "x-amz-checksum-crc64nvme",
            "x-amz-checksum-sha1",
            "x-amz-checksum-sha256",
        ] {
            assert!(
                request.headers().get(checksum_header).is_none(),
                "ordinary SSE-S3 PUT unexpectedly sent {checksum_header}"
            );
        }
        assert_eq!(request.headers().get("content-type"), Some("text/plain"));
    }

    #[tokio::test]
    async fn copy_sets_guards_reconciliation_identity_and_content_type_without_a_checksum() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let expected_identity = copy_reconciliation_identity("destination", &plan);
        let (result, replay, diagnostics) =
            run_test_copy(vec![copy_success_event()], plan, 2).await;
        result.expect("copy should succeed");

        let request = replay.actual_requests().next().expect("one COPY request");
        assert_eq!(request.headers().get("content-type"), Some("text/plain"));
        assert_eq!(
            request.headers().get("x-amz-metadata-directive"),
            Some("REPLACE")
        );
        assert_eq!(
            request.headers().get("x-amz-copy-source-if-match"),
            Some("\"source-etag\"")
        );
        assert_eq!(request.headers().get("if-none-match"), Some("*"));
        assert_eq!(
            request
                .headers()
                .get(format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}")),
            Some(expected_identity.as_str())
        );
        assert!(request.headers().get("x-amz-checksum-algorithm").is_none());
        assert!(
            request
                .headers()
                .get("x-amz-sdk-checksum-algorithm")
                .is_none()
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 0);
    }

    #[test]
    fn copy_reconciliation_identity_is_opaque_and_binds_the_complete_operation() {
        let baseline = test_copy_plan(None);
        let identity = copy_reconciliation_identity("destination", &baseline);
        assert_eq!(identity.len(), 64);
        assert!(
            identity
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        );
        for changed in [
            CopyPlan {
                source_bucket: "other-source".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                source_key: "other.zip".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                expected_etag: "other-etag".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                destination_key: "site/other.txt".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                size: baseline.size + 1,
                ..baseline.clone()
            },
        ] {
            assert_ne!(
                copy_reconciliation_identity("destination", &changed),
                identity
            );
        }
        assert_ne!(
            copy_reconciliation_identity("other-destination", &baseline),
            identity
        );
    }

    #[tokio::test]
    async fn copy_retries_are_provider_owned_and_one_sdk_attempt_each() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![error_event(200, "InternalError"), copy_success_event()],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        result.expect("provider retry should succeed");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            2,
            "the client is configured for three SDK attempts, so two requests prove SDK retries were disabled and the provider owned both attempts"
        );
        assert_eq!(diagnostics.wire_attempts, 2);
        assert_eq!(diagnostics.failed_attempts, 1);
        assert_eq!(diagnostics.retry_attempts, 1);
    }

    #[tokio::test(start_paused = true)]
    async fn copy_retry_that_cannot_fit_preserves_the_slowdown_error() {
        let replay = StaticReplayClient::new(vec![error_event(503, "SlowDown")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 30_000,
            retry_max_delay_ms: 30_000,
            slowdown_retry_base_delay_ms: 30_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        let error = copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            &test_copy_plan(None),
        )
        .await
        .expect_err("a CopyObject retry wait beyond the work deadline must be rejected");

        let message = format!("{error:#}");
        assert!(message.contains("not retrying destination CopyObject"));
        assert!(message.contains("SlowDown"));
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.retry_attempts, 0);
        assert_eq!(snapshot.throttled_attempts, 1);
        assert_eq!(snapshot.throttle_cooldown_waits, 0);
    }

    #[tokio::test]
    async fn copy_existing_destination_uses_if_match_guard() {
        let (result, replay, _) = run_test_copy(
            vec![copy_success_event()],
            test_copy_plan(Some(DestinationWritePrecondition::IfMatch(
                "\"destination-etag\"".to_string(),
            ))),
            1,
        )
        .await;

        result.expect("guarded copy should succeed");
        let request = replay.actual_requests().next().expect("one COPY request");
        assert_eq!(
            request.headers().get("if-match"),
            Some("\"destination-etag\"")
        );
        assert!(request.headers().get("if-none-match").is_none());
    }

    #[tokio::test]
    async fn permanent_copy_failure_is_not_retried() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![error_event(400, "InvalidRequest")],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 1);
        assert_eq!(diagnostics.retry_attempts, 0);
    }

    #[tokio::test]
    async fn final_ambiguous_copy_reconciles_exact_marker_and_size() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(500, "InternalError"),
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ],
            plan,
            1,
        )
        .await;

        result.expect("exact destination marker should reconcile the lost copy response");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD"]
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 1);
    }

    #[tokio::test]
    async fn conditional_copy_conflict_reconciles_only_the_intended_object() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(412, "PreconditionFailed"),
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ],
            plan,
            2,
        )
        .await;

        result.expect("the matching marker should prove an earlier copy succeeded");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(diagnostics.retry_attempts, 0);
    }

    #[tokio::test]
    async fn copy_retries_a_409_when_reconciliation_finds_no_completed_write() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
                copy_success_event(),
            ],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        result.expect("a transient conditional conflict should be retried");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            2
        );
        assert_eq!(diagnostics.retry_attempts, 1);
    }

    #[tokio::test]
    async fn ambiguous_copy_reconciliation_fails_closed_on_marker_or_size_mismatch() {
        for headers in [
            vec![
                ("content-length".to_string(), "5".to_string()),
                (
                    format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}"),
                    "different-copy".to_string(),
                ),
            ],
            vec![
                ("content-length".to_string(), "6".to_string()),
                (
                    format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}"),
                    copy_reconciliation_identity("destination", &test_copy_plan(None)),
                ),
            ],
        ] {
            let owned_headers = headers
                .iter()
                .map(|(name, value)| (name.as_str(), value.as_str()))
                .collect();
            let (result, replay, _) = run_test_copy(
                vec![error_event(500, "InternalError"), head_event(owned_headers)],
                test_copy_plan(None),
                1,
            )
            .await;
            assert!(result.is_err());
            assert_eq!(
                replay
                    .actual_requests()
                    .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                    .count(),
                1
            );
        }
    }

    #[tokio::test]
    async fn identity_probe_retires_a_copy_whose_destination_already_matches() {
        let plan = test_copy_plan_with_identity_probe();
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![head_event(vec![
                ("content-length", "5"),
                (metadata_header.as_str(), identity.as_str()),
            ])],
            plan,
            2,
        )
        .await;

        assert_eq!(
            result.expect("a matching identity token proves the copy is current"),
            CopyOutcome::Skipped
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["HEAD"],
            "a proven-current destination must cost one HeadObject and no CopyObject"
        );
        assert_eq!(diagnostics.wire_attempts, 0);
    }

    #[tokio::test]
    async fn identity_probe_fails_closed_and_copies_when_the_destination_is_unproven() {
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let identity =
            copy_reconciliation_identity("destination", &test_copy_plan_with_identity_probe());
        for (label, probe_event) in [
            (
                "a foreign token",
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), "written-by-something-else"),
                ]),
            ),
            ("an absent token", head_event(vec![("content-length", "5")])),
            (
                "a token recorded against a different length",
                head_event(vec![
                    ("content-length", "6"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ),
            ("a failed HeadObject", error_event(403, "AccessDenied")),
        ] {
            let (result, replay, _) = run_test_copy(
                vec![probe_event, copy_success_event()],
                test_copy_plan_with_identity_probe(),
                2,
            )
            .await;

            assert_eq!(
                result.unwrap_or_else(|error| panic!("{label} should still copy: {error:#}")),
                CopyOutcome::Copied,
                "{label} must not retire the copy"
            );
            let copies = replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .collect::<Vec<_>>();
            assert_eq!(
                copies.len(),
                1,
                "{label} must fall through to exactly one CopyObject"
            );
            assert_eq!(
                copies[0].headers().get("if-match"),
                Some("\"destination-etag\""),
                "{label} must still guard the fallthrough copy with the listed destination ETag"
            );
        }
    }

    #[test]
    fn a_skipped_copy_is_accounted_as_skipped_rather_than_copied() {
        let stats = DeploymentStats::default();
        record_copy_outcome(&stats, CopyOutcome::Skipped, 4096);
        record_copy_outcome(&stats, CopyOutcome::Copied, 4096);

        let request = summary_request();
        let snapshot = stats.snapshot("Create", "success", &request);
        assert_eq!(snapshot.counts.skipped_objects, 1);
        assert_eq!(snapshot.counts.copied_objects, 1);
        assert_eq!(
            snapshot.bytes.copied, 4096,
            "a skipped copy must not inflate transferred bytes"
        );
    }

    #[tokio::test]
    async fn a_copy_without_an_identity_probe_issues_no_head() {
        let (result, replay, _) =
            run_test_copy(vec![copy_success_event()], test_copy_plan(None), 2).await;

        assert_eq!(
            result.expect("an unprobed copy should proceed directly"),
            CopyOutcome::Copied
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"],
            "the listing-only fast path must not pay for a HeadObject"
        );
    }

    #[tokio::test]
    async fn each_application_put_attempt_uses_one_sdk_attempt() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(true);
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let writer = TestWriter::default();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .with_subscriber(test_log_subscriber(writer.clone()))
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"]
        );
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.failed_attempts, 1);
        assert_eq!(
            snapshot.failures_by_sdk_error_kind.get("ServiceError"),
            Some(&1)
        );
        assert_eq!(
            snapshot.failures_by_service_code.get("InternalError"),
            Some(&1)
        );
        assert_eq!(snapshot.failure_states.len(), 1);
        assert_eq!(snapshot.failure_state_overflow_attempts, 0);
        let failure = &snapshot.failure_states[0];
        assert_eq!(failure.sdk_error_kind, "ServiceError");
        assert_eq!(failure.service_code.as_deref(), Some("InternalError"));
        assert!(failure.dispatch_failure_kind.is_none());
        assert!(!failure.body.attempt_observed);
        assert!(!failure.source.observed);

        let event = serialize_put_attempt_failure(failure).expect("serializable failure event");
        let parsed: serde_json::Value = serde_json::from_str(&event).expect("failure event JSON");
        assert_eq!(parsed["event"], "shin_put_object_attempt_failure");
        assert_eq!(parsed["failure"]["sdkErrorKind"], "ServiceError");
        for forbidden in [
            "file.txt",
            "destination",
            "requestId",
            "test error",
            "arn:aws",
            "etag",
        ] {
            assert!(
                !event.contains(forbidden),
                "immediate failure event retained forbidden value {forbidden}"
            );
        }
        let logs = String::from_utf8(writer.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 trace output");
        let immediate_event_lines = logs
            .lines()
            .filter(|line| line.contains("shin_put_object_attempt_failure"))
            .collect::<Vec<_>>();
        assert_eq!(immediate_event_lines.len(), 1);
        let immediate_event_line = immediate_event_lines[0];
        for forbidden in ["file.txt", "destination", "requestId", "arn:aws", "etag"] {
            assert!(
                !immediate_event_line.contains(forbidden),
                "immediate failure log retained forbidden value {forbidden}"
            );
        }
    }

    #[tokio::test]
    async fn disabled_put_diagnostics_keep_basic_counters_without_detailed_state() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(false);
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let writer = TestWriter::default();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .with_subscriber(test_log_subscriber(writer.clone()))
        .await;

        assert!(result.is_err());
        assert_eq!(replay.actual_requests().count(), 1);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.wire_attempts, 1);
        assert_eq!(snapshot.failed_attempts, 1);
        assert_eq!(
            snapshot.failures_by_error_code.get("InternalError"),
            Some(&1)
        );
        assert!(snapshot.failures_by_sdk_error_kind.is_empty());
        assert!(snapshot.failures_by_service_code.is_empty());
        assert!(snapshot.failure_states.is_empty());
        assert_eq!(snapshot.failure_state_overflow_attempts, 0);
        let logs = String::from_utf8(writer.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 trace output");
        assert!(!logs.contains("shin_put_object_attempt_failure"));
    }

    #[test]
    fn put_failure_classification_uses_fixed_sdk_and_dispatch_kinds() {
        for (connector, expected) in [
            (
                ConnectorError::timeout(Box::new(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "timeout detail",
                ))),
                "timeout",
            ),
            (
                ConnectorError::io(Box::new(std::io::Error::other("io detail"))),
                "io",
            ),
            (
                ConnectorError::user(Box::new(std::io::Error::other("user detail"))),
                "user",
            ),
            (
                ConnectorError::other(Box::new(std::io::Error::other("other detail")), None),
                "other",
            ),
        ] {
            let error = aws_sdk_s3::error::SdkError::<PutObjectError>::dispatch_failure(connector);
            assert_eq!(write_error_kind(&error), "DispatchFailure");
            assert_eq!(dispatch_failure_kind(&error), Some(expected));
        }

        let timeout = aws_sdk_s3::error::SdkError::<PutObjectError>::timeout_error(
            std::io::Error::new(std::io::ErrorKind::TimedOut, "timeout detail"),
        );
        assert_eq!(write_error_kind(&timeout), "TimeoutError");
        assert_eq!(dispatch_failure_kind(&timeout), None);
    }

    #[test]
    fn diagnostic_label_maps_reserve_the_other_bucket() {
        let counts = Mutex::new(BTreeMap::new());
        for index in 0..40 {
            record_bounded_diagnostic_count(&counts, format!("Code{index}"));
        }
        let counts = counts.lock().expect("diagnostic counts");
        assert_eq!(counts.len(), 32);
        assert_eq!(counts.get("Other"), Some(&9));
        assert_eq!(
            sanitize_diagnostic_label("RequestTimeout"),
            "RequestTimeout"
        );
        assert_eq!(sanitize_diagnostic_label("1RequestTimeout"), "Other");
        assert_eq!(sanitize_diagnostic_label("Request-Timeout"), "Other");
    }

    #[tokio::test]
    async fn put_failure_groups_are_bounded_with_explicit_overflow() {
        let events = (0..33)
            .map(|index| error_event(500, &format!("Code{index}")))
            .collect();
        let replay = StaticReplayClient::new(events);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(true);
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 33;

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(replay.actual_requests().count(), 33);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.failed_attempts, 33);
        assert_eq!(snapshot.failure_states.len(), 32);
        assert_eq!(snapshot.failure_state_overflow_attempts, 1);
        assert_eq!(
            snapshot.failures_by_sdk_error_kind.get("ServiceError"),
            Some(&33)
        );
        assert_eq!(snapshot.failures_by_service_code.len(), 32);
        assert_eq!(snapshot.failures_by_service_code.get("Other"), Some(&2));
    }

    #[tokio::test]
    async fn comparison_pass_spools_only_entries_within_the_limit() {
        let bytes = b"comparison output bytes";
        let plan = integrity_plan(bytes, None);

        let (_, _, _, spooled) =
            digest_async_reader(Box::pin(Cursor::new(bytes)), &plan, bytes.len() as u64)
                .await
                .expect("entry at the limit is spooled");
        assert_eq!(spooled.as_deref(), Some(&bytes[..]));

        let (_, _, _, not_spooled) =
            digest_async_reader(Box::pin(Cursor::new(bytes)), &plan, bytes.len() as u64 - 1)
                .await
                .expect("entry over the limit still hashes");
        assert!(not_spooled.is_none());
    }

    #[tokio::test]
    async fn marker_comparison_spools_small_entries_and_skips_the_second_pass() {
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        // One claim for the planning read and one for the reference second-pass body.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 2);
        let stats = Arc::new(DeploymentStats::default());

        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            expected.len() as u64,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let UploadPayload::Bytes { bytes, .. } = &payload else {
            panic!("an output within the spool cap must become a spooled Bytes payload");
        };
        assert_eq!(bytes.as_ref(), expected);

        // Planning ran once and the upload pass was skipped: planning 1 / upload 0.
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
        assert_eq!(summary.marker_replacement.spooled_uploads, 1);

        // A spooled payload never reads the archive again, so the caller skipped
        // `retain_zip_entry_for_replay` and no upload body was ever polled.
        let source = store.source_diagnostics_snapshot();
        assert_eq!(source.replay_claims, 0);
        assert_eq!(source.body_attempts, 0);

        // Byte-exactness against the second pass: the marker body the streaming
        // variant would have produced must equal the spooled bytes exactly.
        let body_state = Arc::new(UploadBodyState::default());
        let body = marker_zip_entry_body(
            Arc::clone(&store),
            plan,
            expected.len() as u64,
            Arc::clone(&body_state),
            Arc::new(AtomicUsize::new(0)),
            MarkerBodyContext {
                replacements,
                stats: Arc::new(DeploymentStats::default()),
            },
            None,
        );
        let second_pass = ByteStream::new(body.into_inner())
            .collect()
            .await
            .expect("reference marker body")
            .into_bytes();
        assert_eq!(second_pass.as_ref(), expected);
        assert_eq!(second_pass.as_ref(), bytes.as_ref());
    }

    #[tokio::test]
    async fn marker_spooled_entry_skipped_by_matching_etag_is_not_counted_as_an_upload() {
        // A re-deploy of unchanged marker content: the replaced output fits the spool
        // and its MD5 matches the destination ETag, so the entry is skipped without a
        // PutObject. `spooledUploads` counts uploads, so it must stay 0 here even though
        // the comparison pass materialized a spool.
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        let mut etag_hasher = Md5::new();
        etag_hasher.update(expected);
        // finalize_digest is the exact function production uses to derive the ETag,
        // so this matching value cannot drift from what the comparison pass computes.
        let matching_etag = finalize_digest(etag_hasher);
        let destination = DestinationObject {
            etag: Some(matching_etag),
            size: Some(expected.len() as u64),
        };
        // Only the comparison/planning read happens; the skip returns before any upload.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 1);
        let stats = Arc::new(DeploymentStats::default());

        let result = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            Some(&destination),
            &stats,
            expected.len() as u64,
        )
        .await
        .expect("marker prepare must succeed");

        assert!(result.is_none(), "a matching ETag must skip the upload");

        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(
            summary.marker_replacement.spooled_uploads, 0,
            "a skipped entry issued no PutObject, so it is not a spooled upload"
        );
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
    }

    #[tokio::test]
    async fn marker_comparison_falls_back_to_streaming_when_the_output_exceeds_the_cap() {
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        // One claim for the planning read and one for the upload body poll below.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 2);
        let stats = Arc::new(DeploymentStats::default());

        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            expected.len() as u64 - 1,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let UploadPayload::ZipEntry {
            content_length,
            marker_replacements,
            ..
        } = &payload
        else {
            panic!("an output over the spool cap must keep the streaming marker payload");
        };
        assert_eq!(*content_length, expected.len() as u64);
        assert!(
            marker_replacements.is_some(),
            "the streaming payload must carry the marker replacements"
        );

        // The spooled counter stays put: only the planning pass ran so far.
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
        assert_eq!(summary.marker_replacement.spooled_uploads, 0);

        // The streaming payload replays from the archive, so the caller retained it
        // with a replay claim for the upload body.
        let source = store.source_diagnostics_snapshot();
        assert_eq!(source.replay_claims, 1);

        // The streaming body still produces the exact replaced output.
        let uploaded = payload_body(&payload)
            .collect()
            .await
            .expect("streaming marker body")
            .into_bytes();
        assert_eq!(uploaded.as_ref(), expected);
    }

    /// Drives a real transfer of one marker entry through `upload_zip_entries`
    /// (scheduler, source block fetch, comparison pass, destination PUT) so the
    /// transfer sub-timings come from the instrumented task body rather than
    /// being hand-seeded. The prepare and put spans must be nonzero, their sum
    /// must fit inside the enclosing task total at microsecond resolution —
    /// this task runs to completion, which is the precondition the containment
    /// relation documents at the `PhaseMillis` definition site — and the
    /// marker planning read must record a prepare-phase source fetch wait.
    /// The replaced output fits the spool budget, so the PUT body is spooled
    /// bytes and no put-phase source fetch can occur. Removing any
    /// accumulation site below must make one of these assertions fail.
    #[tokio::test]
    async fn transfer_sub_timings_cover_prepare_put_and_source_fetch_waits() {
        let zip = zip_from_entry(
            "marker.txt",
            format!("{}TOKEN{}", "x".repeat(4 * 1024), "y".repeat(4 * 1024)).as_bytes(),
        );
        let plan = zip_plan_from_archive(&zip, "marker.txt");

        // The store `upload_zip_entries` builds fetches the entry's source span
        // through the source client, so the replay serves the ranged GET, the
        // metadata HEAD (via `prepare_source_zip`), and the destination PUT.
        let source_span =
            zip[plan.source_offset as usize..plan.source_span_end_exclusive as usize].to_vec();
        let replay = StaticReplayClient::new(vec![
            head_event(vec![
                (
                    "content-length",
                    Box::leak(zip.len().to_string().into_boxed_str()),
                ),
                ("etag", "\"test-source-etag\""),
            ]),
            range_success_event(source_span, plan.source_offset, zip.len() as u64),
            put_success_event(),
        ]);
        let state = test_app_state_with_replay(replay.clone());
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let archives = vec![SourceArchive { source }];
        let mut request = DeploymentRequest::for_test();
        request.extract = true;
        request.source_markers[0] =
            HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]);
        request.source_markers_config[0] = MarkerConfig::default();
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");

        upload_zip_entries(
            &state,
            &archives,
            &request,
            BTreeMap::from([(0_usize, vec![plan])]),
            &HashMap::new(),
            source_budget,
            TransferExecution {
                stats: Arc::clone(&stats),
                deadlines: InvocationDeadlines::from_remaining_at(
                    TokioInstant::now(),
                    Duration::from_secs(120),
                ),
            },
        )
        .await
        .expect("synthetic transfer run succeeds");

        let (task_total, prepare, put, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare > 0,
            "the comparison pass must be measured, got {prepare} us"
        );
        assert!(
            put > 0,
            "the destination PUT must be measured, got {put} us"
        );
        assert!(
            prepare.saturating_add(put) <= task_total,
            "prepare ({prepare} us) + put ({put} us) must fit inside the task total \
             ({task_total} us)"
        );
        assert!(
            prepare_source_wait > 0,
            "the marker planning read must record its prepare-phase source \
             fetch wait, got {prepare_source_wait} us"
        );
        assert_eq!(
            put_source_wait, 0,
            "a spooled body never reads the archive during the PUT, so no \
             put-phase fetch wait may be recorded"
        );
    }

    /// The task body's skip path (a destination ETag matches the freshly
    /// computed comparison ETag, so the entry is not uploaded) still did the
    /// full comparison read, decode, and hash — that work is how the ETag was
    /// computed — and `transferPrepare` must record it. This is the regression
    /// test for the `let-else` early return that used to skip the prepare
    /// accumulation. The replay serves no PUT event, so an attempted upload
    /// exhausts it and fails the run.
    #[tokio::test]
    async fn transfer_prepare_records_the_skipped_entry_comparison_pass() {
        let content = format!("{}TOKEN{}", "x".repeat(4 * 1024), "y".repeat(4 * 1024));
        let zip = zip_from_entry("marker.txt", content.as_bytes());
        let plan = zip_plan_from_archive(&zip, "marker.txt");

        // The store `upload_zip_entries` builds fetches the entry's source span
        // through the source client, so the replay serves the metadata HEAD and
        // the comparison ranged GET, and nothing else: the skip must return
        // before any destination PUT.
        let source_span =
            zip[plan.source_offset as usize..plan.source_span_end_exclusive as usize].to_vec();
        let replay = StaticReplayClient::new(vec![
            head_event(vec![
                (
                    "content-length",
                    Box::leak(zip.len().to_string().into_boxed_str()),
                ),
                ("etag", "\"test-source-etag\""),
            ]),
            range_success_event(source_span, plan.source_offset, zip.len() as u64),
        ]);
        let state = test_app_state_with_replay(replay.clone());
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let archives = vec![SourceArchive { source }];
        let mut request = DeploymentRequest::for_test();
        request.extract = true;
        // No markers: the marker-free comparison pass runs because the
        // destination object carries the exact size, and the freshly computed
        // ETag matches the destination, which is the skip condition.
        let destination = DestinationObject {
            etag: Some(md5_hex(content.as_bytes())),
            size: Some(content.len() as u64),
        };
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");

        upload_zip_entries(
            &state,
            &archives,
            &request,
            BTreeMap::from([(0_usize, vec![plan])]),
            &HashMap::from([("marker.txt".to_string(), destination)]),
            source_budget,
            TransferExecution {
                stats: Arc::clone(&stats),
                deadlines: InvocationDeadlines::from_remaining_at(
                    TokioInstant::now(),
                    Duration::from_secs(120),
                ),
            },
        )
        .await
        .expect("synthetic transfer run succeeds");

        let (_, prepare, put, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare > 0,
            "the skipped comparison pass must still be measured, got {prepare} us"
        );
        assert!(
            prepare_source_wait > 0,
            "the skipped comparison read must record its prepare-phase source \
             fetch wait, got {prepare_source_wait} us"
        );
        assert_eq!(
            put, 0,
            "a skipped entry issues no PUT, so no put span may be recorded"
        );
        assert_eq!(
            put_source_wait, 0,
            "a skipped entry has no upload body, so no put-phase fetch wait \
             may be recorded"
        );
    }

    /// A streaming (non-spooled) upload body generates its content during the
    /// PUT, so its source block fetches must be attributed to the put phase
    /// (`transferPutSourceWait`) rather than the prepare phase. The replaced
    /// output exceeds the spool cap, so `prepare_zip_entry_upload` returns the
    /// streaming marker payload; the comparison pass that produced it records
    /// the prepare-phase wait, and driving the upload body — the same
    /// `ByteStream` the destination PUT polls — records the put-phase wait.
    /// The store is the real network-backed store, and the single per-block
    /// claim is consumed by the comparison reader, so the body pass re-fetches
    /// every block from the source instead of hitting a cache: both waits are
    /// real source round-trips.
    #[tokio::test]
    async fn transfer_put_source_wait_records_streaming_upload_body_fetches() {
        let content = format!("{}TOKEN{}", "x".repeat(64 * 1024), "y".repeat(64 * 1024));
        let zip = zip_from_entry("marker.txt", content.as_bytes());
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );

        // The replay serves the metadata HEAD, then one ranged GET per source
        // block for the comparison pass, then the same GETs again for the
        // streaming body pass. The real store computes one claim per block, and
        // `retain_zip_entry_for_replay` re-arms a released block, so the body
        // pass genuinely re-fetches.
        let mut events = vec![head_event(vec![
            (
                "content-length",
                Box::leak(zip.len().to_string().into_boxed_str()),
            ),
            ("etag", "\"test-source-etag\""),
        ])];
        for _ in 0..2 {
            let mut start = plan.source_offset;
            while start < plan.source_span_end_exclusive {
                let end = (start + 1024).min(plan.source_span_end_exclusive);
                events.push(range_success_event(
                    zip[start as usize..end as usize].to_vec(),
                    start,
                    zip.len() as u64,
                ));
                start = end;
            }
        }
        let state = test_app_state_with_replay(StaticReplayClient::new(events));
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let request = DeploymentRequest::for_test();
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");
        let window_bytes = source_window_bytes_for_archive(&request.runtime, source.len(), 1);
        let store = SourceBlockStore::new(
            Arc::clone(&source),
            std::slice::from_ref(&plan),
            SourceBlockOptions {
                block_bytes: request.runtime.source_block_bytes,
                merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
                get_concurrency: request.runtime.source_get_concurrency,
                window_bytes,
            },
            Arc::clone(&source_budget),
        )
        .expect("store constructs");

        // The replaced output (128 KiB plus the replacement delta) exceeds the
        // cap, so the payload stays streaming and reads the archive again
        // during upload.
        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            64 * 1024,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let (_, _, _, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare_source_wait > 0,
            "the comparison pass must record its prepare-phase source fetch \
             wait, got {prepare_source_wait} us"
        );
        assert_eq!(put_source_wait, 0, "nothing has driven the upload body yet");

        let uploaded = payload_body(&payload)
            .collect()
            .await
            .expect("streaming marker body")
            .into_bytes();

        let (_, _, _, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            put_source_wait > 0,
            "the streaming upload body must record put-phase source fetch \
             waits, got {put_source_wait} us"
        );
        assert!(
            prepare_source_wait > 0,
            "the comparison pass wait must survive the upload pass, got \
             {prepare_source_wait} us"
        );
        assert_eq!(
            uploaded.as_ref(),
            content.replace("TOKEN", "expanded-value").as_bytes()
        );
    }

    #[test]
    fn comparison_spool_limit_bounds_the_whole_deployment() {
        for concurrency in [1_usize, 32, 64, 128, 256] {
            let per_entry = comparison_spool_limit_bytes(concurrency);
            assert!(
                per_entry * concurrency as u64 <= COMPARISON_SPOOL_TOTAL_BUDGET_BYTES,
                "concurrency {concurrency} exceeds the total spool budget"
            );
        }
        // Degenerate configurations must not divide by zero or spool without bound.
        assert_eq!(
            comparison_spool_limit_bytes(0),
            COMPARISON_SPOOL_TOTAL_BUDGET_BYTES
        );
    }

    #[tokio::test]
    async fn trusted_md5_is_checked_for_comparison_and_marker_materialization_reads() {
        let bytes = b"authenticated bytes";
        let correct = md5_hex(bytes);
        let valid = integrity_plan(bytes, Some(correct));

        digest_async_reader(Box::pin(Cursor::new(bytes)), &valid, 0)
            .await
            .expect("comparison read should validate");
        read_async_reader_to_vec(Box::pin(Cursor::new(bytes)), &valid)
            .await
            .expect("marker materialization read should validate");

        let invalid = integrity_plan(bytes, Some("00000000000000000000000000000000".to_string()));
        let comparison_error = digest_async_reader(Box::pin(Cursor::new(bytes)), &invalid, 0)
            .await
            .expect_err("comparison read must reject mismatched bytes");
        let marker_error = read_async_reader_to_vec(Box::pin(Cursor::new(bytes)), &invalid)
            .await
            .expect_err("marker read must reject mismatched bytes");
        for error in [comparison_error, marker_error] {
            let message = error.to_string();
            assert!(!message.contains("00000000000000000000000000000000"));
            assert!(!message.contains(&md5_hex(bytes)));
            assert!(!message.contains("authenticated bytes"));
        }
    }

    #[test]
    fn put_precondition_uses_if_none_match_for_missing_destination() {
        assert_eq!(
            destination_write_precondition(None),
            Some(DestinationWritePrecondition::IfNoneMatch)
        );
    }

    #[test]
    fn put_precondition_uses_if_match_for_known_destination_etag() {
        let object = DestinationObject {
            etag: Some("abc123".to_string()),
            size: Some(10),
        };

        assert_eq!(
            destination_write_precondition(Some(&object)),
            Some(DestinationWritePrecondition::IfMatch(
                "\"abc123\"".to_string()
            ))
        );
    }

    #[test]
    fn put_precondition_falls_back_without_destination_etag() {
        let object = DestinationObject {
            etag: None,
            size: Some(10),
        };

        assert_eq!(destination_write_precondition(Some(&object)), None);
    }

    #[test]
    fn quoted_etag_wraps_normalized_copy_source_etag() {
        assert_eq!(quoted_etag("abc123"), "\"abc123\"".to_string());
    }

    #[test]
    fn object_write_retry_cap_uses_capped_exponential_delays() {
        let retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(write_retry_cap_millis(1, false, &retry), 250);
        assert_eq!(write_retry_cap_millis(2, false, &retry), 500);
        assert_eq!(write_retry_cap_millis(3, false, &retry), 1_000);
        assert_eq!(write_retry_cap_millis(4, false, &retry), 1_000);
        assert_eq!(write_retry_cap_millis(2, true, &retry), 2_000);
    }

    #[test]
    fn object_write_retry_delay_supports_full_jitter_and_no_jitter() {
        let coordinator = WriteRetryCoordinator::new();
        let mut retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(
            duration_ms(coordinator.retry_delay(3, false, &retry)),
            1_000
        );

        retry.jitter = PutObjectRetryJitter::Full;
        assert!(duration_ms(coordinator.retry_delay(3, false, &retry)) <= 1_000);
    }

    #[tokio::test(start_paused = true)]
    async fn write_retry_that_cannot_fit_preserves_the_s3_error() {
        for (status, code, throttled) in [(500, "InternalError", false), (503, "SlowDown", true)] {
            let replay = StaticReplayClient::new(vec![error_event(status, code)]);
            let client = replay_s3_client(replay.clone());
            let diagnostics = WriteDiagnostics::default();
            let stats = DeploymentStats::default();
            let retry_coordinator = WriteRetryCoordinator::new();
            let retry = PutObjectRetryOptions {
                max_attempts: 2,
                retry_base_delay_ms: 30_000,
                retry_max_delay_ms: 30_000,
                slowdown_retry_base_delay_ms: 30_000,
                slowdown_retry_max_delay_ms: 30_000,
                jitter: PutObjectRetryJitter::None,
            };

            let error = upload_payload(
                PutContext {
                    destination_s3: &client,
                    destination_bucket: "destination",
                    retry: &retry,
                    retry_coordinator: &retry_coordinator,
                    diagnostics: &diagnostics,
                    stats: &stats,
                    work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
                },
                "file.txt",
                test_payload(),
                None,
            )
            .await
            .expect_err("a retry wait at or beyond the work deadline must be rejected");

            let message = format!("{error:#}");
            assert!(message.contains("not retrying destination PutObject"));
            assert!(message.contains("deployment work deadline"));
            assert!(message.contains(code), "missing {code} in {message}");
            assert_eq!(replay.actual_requests().count(), 1);
            let snapshot = diagnostics.snapshot();
            assert_eq!(snapshot.failed_attempts, 1);
            assert_eq!(snapshot.retry_attempts, 0);
            assert_eq!(snapshot.retry_wait_millis, 0);
            assert_eq!(snapshot.throttled_attempts, u64::from(throttled));
            assert_eq!(snapshot.throttle_cooldown_waits, 0);
            assert_eq!(snapshot.throttle_cooldown_wait_millis, 0);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn shared_throttle_cooldown_stops_new_writes_before_the_work_deadline() {
        let replay = StaticReplayClient::new(vec![]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        retry_coordinator.extend_throttle_cooldown(std::time::Duration::from_secs(30));
        let retry = test_retry_options();

        let error = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await
        .expect_err("a shared cooldown beyond the work deadline must stop admission");

        assert!(
            error
                .to_string()
                .contains("destination PutObject throttle cooldown for file.txt")
        );
        assert_eq!(replay.actual_requests().count(), 0);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.wire_attempts, 0);
        assert_eq!(snapshot.throttle_cooldown_waits, 0);
        assert_eq!(snapshot.throttle_cooldown_wait_millis, 0);
    }

    #[tokio::test(start_paused = true)]
    async fn write_retry_that_fits_before_the_deadline_still_retries() {
        let replay =
            StaticReplayClient::new(vec![error_event(500, "InternalError"), put_success_event()]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 500,
            retry_max_delay_ms: 500,
            slowdown_retry_base_delay_ms: 500,
            slowdown_retry_max_delay_ms: 500,
            jitter: PutObjectRetryJitter::None,
        };

        upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await
        .expect("a retry wait that fits before the work deadline should succeed");

        assert_eq!(replay.actual_requests().count(), 2);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.retry_attempts, 1);
        assert_eq!(snapshot.retry_wait_millis, 500);
    }

    fn integrity_plan(bytes: &[u8], md5: Option<String>) -> ZipEntryPlan {
        ZipEntryPlan {
            crc32: crc32fast::hash(bytes),
            trusted_integrity: md5.map(|md5| TrustedEntryIntegrity {
                size: bytes.len() as u64,
                md5,
            }),
            ..ZipEntryPlan::for_test("entry.txt", bytes.len() as u64, 0, bytes.len() as u64)
        }
    }

    async fn run_ambiguous_put(headers: Vec<(&str, &str)>) -> (Result<()>, Vec<String>, bool) {
        let replay = StaticReplayClient::new(vec![
            error_event(500, "InternalError"),
            error_event(412, "PreconditionFailed"),
            head_event(headers),
        ]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let retry = test_retry_options();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            Some(DestinationWritePrecondition::IfNoneMatch),
        )
        .await;
        let requests = replay
            .actual_requests()
            .map(|request| request.method().to_string())
            .collect();
        let checksum_mode_requested = replay.actual_requests().any(|request| {
            request.method() == "HEAD" && request.headers().get("x-amz-checksum-mode").is_some()
        });
        (result, requests, checksum_mode_requested)
    }

    async fn run_test_copy(
        events: Vec<ReplayEvent>,
        plan: CopyPlan,
        max_attempts: usize,
    ) -> (
        Result<CopyOutcome>,
        StaticReplayClient,
        WriteDiagnosticsSnapshot,
    ) {
        let replay = StaticReplayClient::new(events);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = max_attempts;
        let result = copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            &plan,
        )
        .await;
        (result, replay, diagnostics.snapshot())
    }

    fn test_copy_plan(destination_precondition: Option<DestinationWritePrecondition>) -> CopyPlan {
        CopyPlan {
            source_bucket: "source".to_string(),
            source_key: "archive.zip".to_string(),
            expected_etag: "source-etag".to_string(),
            destination_key: "site/file.txt".to_string(),
            destination_precondition,
            size: 5,
            identity_probe: false,
        }
    }

    fn test_copy_plan_with_identity_probe() -> CopyPlan {
        CopyPlan {
            identity_probe: true,
            ..test_copy_plan(Some(DestinationWritePrecondition::IfMatch(
                "\"destination-etag\"".to_string(),
            )))
        }
    }

    fn replay_s3_client(replay: StaticReplayClient) -> aws_sdk_s3::Client {
        let config = aws_sdk_s3::Config::builder()
            .behavior_version_latest()
            .region(aws_sdk_s3::config::Region::new("us-east-1"))
            .credentials_provider(aws_sdk_s3::config::Credentials::new(
                "test-access-key",
                "test-secret-key",
                None,
                None,
                "shin-bucket-deployment-test",
            ))
            .endpoint_url("https://s3.test")
            .force_path_style(true)
            .retry_config(aws_sdk_s3::config::retry::RetryConfig::standard().with_max_attempts(3))
            .http_client(replay)
            .build();
        aws_sdk_s3::Client::from_conf(config)
    }

    fn error_event(status: u16, code: &str) -> ReplayEvent {
        let body = format!("<Error><Code>{code}</Code><Message>test error</Message></Error>");
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(status)
                .header("content-type", "application/xml")
                .body(SdkBody::from(body.into_bytes()))
                .unwrap(),
        )
    }

    fn head_event(headers: Vec<(&str, &str)>) -> ReplayEvent {
        let mut response = Response::builder().status(200);
        for (name, value) in headers {
            response = response.header(name, value);
        }
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            response.body(SdkBody::empty()).unwrap(),
        )
    }

    fn copy_success_event() -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(200)
                .header("content-type", "application/xml")
                .body(SdkBody::from(
                    b"<CopyObjectResult><ETag>&quot;copied&quot;</ETag><LastModified>2026-07-12T00:00:00Z</LastModified></CopyObjectResult>"
                        .to_vec(),
                ))
                .unwrap(),
        )
    }

    fn put_success_event() -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(200)
                .body(SdkBody::empty())
                .unwrap(),
        )
    }

    fn range_success_event(bytes: Vec<u8>, start: u64, source_len: u64) -> ReplayEvent {
        let len = bytes.len();
        let end = start + len as u64 - 1;
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(206)
                .header("content-length", len)
                .header("content-range", format!("bytes {start}-{end}/{source_len}"))
                .body(SdkBody::from(bytes))
                .unwrap(),
        )
    }

    fn test_payload() -> UploadPayload {
        let payload = UploadPayload::from_bytes(b"hello".to_vec());
        payload.body_state().record_etag_md5(md5_hex(b"hello"));
        payload
    }

    fn test_retry_options() -> PutObjectRetryOptions {
        PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 0,
            retry_max_delay_ms: 0,
            slowdown_retry_base_delay_ms: 0,
            slowdown_retry_max_delay_ms: 0,
            jitter: PutObjectRetryJitter::None,
        }
    }

    fn test_work_deadline() -> tokio::time::Instant {
        tokio::time::Instant::now() + std::time::Duration::from_secs(120)
    }

    fn summary_request() -> crate::deployment::DeploymentRequest {
        crate::deployment::DeploymentRequest {
            source_object_keys: vec!["archive.zip".to_string()],
            destination_owner_id: "summary-owner".to_string(),
            ..crate::deployment::DeploymentRequest::for_test()
        }
    }

    /// Drives a real replayed copy (one failure, one success) so the counters come
    /// from `WriteDiagnostics` rather than being hand-seeded, then runs the bridge
    /// and asserts each one lands on the matching `copyObject` summary field. A
    /// mis-mapped field would pass a hand-seeded test but fail this one.
    #[tokio::test(start_paused = true)]
    async fn copy_diagnostics_reach_the_deployment_summary() {
        // A throttled failure with nonzero backoff, so the throttle and wait counters
        // are also nonzero: zero-to-zero comparisons would not catch a field swap.
        // One throttled failure and one transient failure: throttled retries record
        // cooldown waits while transient retries record `retry_wait_millis`, so both
        // are needed to make all seven counters nonzero.
        let replay = StaticReplayClient::new(vec![
            error_event(503, "SlowDown"),
            error_event(200, "InternalError"),
            copy_success_event(),
        ]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = WriteRetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 3,
            retry_base_delay_ms: 10,
            retry_max_delay_ms: 10,
            slowdown_retry_base_delay_ms: 250,
            slowdown_retry_max_delay_ms: 250,
            jitter: PutObjectRetryJitter::None,
        };

        copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            &test_copy_plan(None),
        )
        .await
        .expect("provider retry should succeed");

        let request = summary_request();
        let before = stats.snapshot("Create", "success", &request);
        assert_eq!(
            before.copy_object.wire_attempts, 0,
            "the summary must stay empty until the diagnostics bridge runs"
        );

        log_copy_diagnostics(&retry, &diagnostics, &stats);

        let observed = diagnostics.snapshot();
        let after = stats.snapshot("Create", "success", &request);
        assert_eq!(after.copy_object.wire_attempts, observed.wire_attempts);
        assert_eq!(after.copy_object.failed_attempts, observed.failed_attempts);
        assert_eq!(after.copy_object.retry_attempts, observed.retry_attempts);
        assert_eq!(
            after.copy_object.throttled_attempts,
            observed.throttled_attempts
        );
        assert_eq!(after.copy_object.retry_wait_ms, observed.retry_wait_millis);
        assert_eq!(
            after.copy_object.throttle_cooldown_waits,
            observed.throttle_cooldown_waits
        );
        assert_eq!(
            after.copy_object.throttle_cooldown_wait_ms,
            observed.throttle_cooldown_wait_millis
        );

        // The replayed copy really did throttle, retry, and wait, so the mapping
        // assertions above are not comparing zero against zero.
        assert_eq!(after.copy_object.wire_attempts, 3);
        assert_eq!(after.copy_object.failed_attempts, 2);
        assert_eq!(after.copy_object.retry_attempts, 2);
        assert_eq!(after.copy_object.throttled_attempts, 1);
        assert!(
            after.copy_object.retry_wait_ms > 0,
            "the transient retry must record backoff time"
        );
        assert!(
            after.copy_object.throttle_cooldown_waits > 0
                && after.copy_object.throttle_cooldown_wait_ms > 0,
            "the throttled retry must record cooldown waits"
        );
        // Copies must not leak into the PutObject section.
        assert_eq!(after.put_object.wire_attempts, 0);
    }
}
