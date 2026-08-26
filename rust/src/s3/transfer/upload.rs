use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::RequestChecksumCalculation;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::primitives::ByteStream;
use bytes::Bytes;
use crc32fast::Hasher as Crc32Hasher;
use md5::{Digest as Md5Digest, Md5};
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::time::Instant;

use crate::deadline::TaskDrainBudget;
use crate::deployment::{DeploymentRequest, PutObjectRetryOptions, SourceArchive};
use crate::diagnostics::{DeploymentStats, SourceFetchPhase, TransferFetchStats};
use crate::replace::MarkerReplacements;
use crate::state::AppState;
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, finalize_digest, sanitize_diagnostic};

use super::super::archive::block_store::{
    SourceAttemptSnapshot, SourceBlockOptions, SourceBlockStore,
};
use super::super::archive::budget::SourceByteBudget;
use super::super::archive::entry::{
    MarkerBodyContext, UploadBodyState, marker_zip_entry_body, plan_marker_zip_entry_spooled,
    validate_zip_entry_output, validate_zip_entry_size_not_exceeded, zip_entry_body,
    zip_entry_reader,
};
use super::super::content_type::apply_put_content_type;
use super::super::destination::{
    DestinationObject, DestinationWritePrecondition, destination_md5_and_size_match,
    destination_write_precondition,
};
use super::super::planner::ZipEntryPlan;
use super::super::{
    S3_SINGLE_PUT_LIMIT, ZIP_ENTRY_READ_CHUNK_BYTES, source_window_bytes_for_archive,
};
use super::TransferExecution;
use super::diagnostics::{
    WriteDiagnostics, WriteRetryCoordinator, is_conditional_write_conflict,
    is_retryable_conditional_write_conflict, is_retryable_write_error, log_put_diagnostics,
    log_source_diagnostics, wait_for_write_retry_before_deadline, write_error_code,
    write_error_message,
};
use super::scheduler::TransferScheduler;

pub(super) enum UploadPayload {
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

impl UploadPayload {
    #[cfg(test)]
    pub(super) fn from_bytes(bytes: Vec<u8>) -> Self {
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

    pub(super) fn body_state(&self) -> &UploadBodyState {
        match self {
            UploadPayload::Bytes { body_state, .. }
            | UploadPayload::ZipEntry { body_state, .. } => body_state,
        }
    }

    pub(super) fn source_attempt_snapshot(&self) -> Option<SourceAttemptSnapshot> {
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

pub(super) struct PutContext<'a> {
    pub(super) destination_s3: &'a S3Client,
    pub(super) destination_bucket: &'a str,
    pub(super) retry: &'a PutObjectRetryOptions,
    pub(super) retry_coordinator: &'a WriteRetryCoordinator,
    pub(super) diagnostics: &'a WriteDiagnostics,
    pub(super) stats: &'a DeploymentStats,
    pub(super) work_deadline: Instant,
}

pub(in crate::s3) async fn upload_zip_entries(
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

pub(super) fn catalog_skips_zip_entry(
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

pub(super) async fn prepare_zip_entry_upload(
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
pub(super) const COMPARISON_SPOOL_TOTAL_BUDGET_BYTES: u64 = 16 * 1024 * 1024;

pub(super) fn comparison_spool_limit_bytes(max_parallel_transfers: usize) -> u64 {
    COMPARISON_SPOOL_TOTAL_BUDGET_BYTES / (max_parallel_transfers.max(1) as u64)
}

pub(super) fn should_compare_marker_free_entry(
    plan: &ZipEntryPlan,
    destination_object: Option<&DestinationObject>,
) -> bool {
    plan.trusted_integrity.is_none()
        && destination_object.is_some_and(|object| object.size == Some(plan.size))
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

pub(super) fn compile_marker_replacements(
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

pub(super) async fn upload_payload(
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
            Err(error) => {
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
                let conditional_conflict = is_conditional_write_conflict(&error);
                if conditional_conflict {
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
                let retryable = if conditional_conflict {
                    is_retryable_conditional_write_conflict(&error)
                } else {
                    is_retryable_write_error(&error)
                };
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
                                "not retrying destination PutObject for {} because its retry wait reaches or exceeds the deployment work deadline",
                                sanitize_diagnostic(destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
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
                        destination_key,
                        attempt,
                        max_attempts,
                        error_code = ?code.as_deref(),
                        error = %diagnostic,
                        "destination PutObject attempt failed; retrying"
                    );
                    last_error = Some(error);
                    continue;
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

pub(super) fn payload_body(payload: &UploadPayload) -> ByteStream {
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
    // The PUT loop owns the retry budget, so reconciliation is one wire attempt.
    let head = match context
        .destination_s3
        .head_object()
        .bucket(context.destination_bucket)
        .key(destination_key)
        .customize()
        .config_override(aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()))
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

pub(super) async fn digest_async_reader(
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
pub(super) async fn read_async_reader_to_vec(
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
pub(super) fn md5_hex(bytes: &[u8]) -> String {
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
