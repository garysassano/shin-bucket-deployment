use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::RequestChecksumCalculation;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{ChecksumAlgorithm, ChecksumMode, ChecksumType, MetadataDirective};
#[cfg(test)]
use base64::Engine as _;
#[cfg(test)]
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
#[cfg(test)]
use bytes::Bytes;
use crc32fast::Hasher as Crc32Hasher;
use fastrand::Rng;
use md5::{Digest as Md5Digest, Md5};
#[cfg(test)]
use sha2::Sha256;
use tokio::io::{AsyncRead, AsyncReadExt};

use crate::deadline::InvocationDeadlines;
use crate::replace::MarkerReplacements;
use crate::types::{
    AppState, DeploymentRequest, DeploymentStats, DestinationChecksumStrategy, MarkerConfig,
    PutObjectRetryJitter, PutObjectRetryOptions, PutObjectStats, SourceArchive,
};

use super::archive::{
    MarkerBodyContext, SourceBlockOptions, SourceBlockStore, SourceByteBudget, UploadBodyState,
    marker_zip_entry_body, plan_marker_zip_entry, validate_zip_entry_output,
    validate_zip_entry_size_not_exceeded, zip_entry_body, zip_entry_reader,
};
use super::content_type::{apply_copy_content_type, apply_put_content_type};
use super::destination::{DestinationObject, destination_md5_and_size_match};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{S3_SINGLE_PUT_LIMIT, ZIP_ENTRY_READ_CHUNK_BYTES, source_window_bytes_for_archive};

mod scheduler;

use scheduler::TransferScheduler;

enum UploadPayload {
    #[cfg(test)]
    Bytes {
        bytes: Bytes,
        body_state: Arc<UploadBodyState>,
    },
    ZipEntry {
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
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

    fn from_zip_entry(
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
    ) -> Self {
        Self::ZipEntry {
            store,
            plan,
            content_length,
            body_state: Arc::new(UploadBodyState::default()),
            body_attempts: Arc::new(AtomicUsize::new(0)),
            marker_replacements: None,
            deployment_stats: None,
        }
    }

    fn from_marker_zip_entry(
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
        marker_replacements: Arc<MarkerReplacements>,
        deployment_stats: Arc<DeploymentStats>,
    ) -> Self {
        Self::ZipEntry {
            store,
            plan,
            content_length,
            body_state: Arc::new(UploadBodyState::default()),
            body_attempts: Arc::new(AtomicUsize::new(0)),
            marker_replacements: Some(marker_replacements),
            deployment_stats: Some(deployment_stats),
        }
    }

    fn content_length(&self) -> u64 {
        match self {
            #[cfg(test)]
            UploadPayload::Bytes { bytes, .. } => u64::try_from(bytes.len()).unwrap_or(u64::MAX),
            UploadPayload::ZipEntry { content_length, .. } => *content_length,
        }
    }

    fn body_state(&self) -> &UploadBodyState {
        match self {
            #[cfg(test)]
            UploadPayload::Bytes { body_state, .. }
            | UploadPayload::ZipEntry { body_state, .. } => body_state,
            #[cfg(not(test))]
            UploadPayload::ZipEntry { body_state, .. } => body_state,
        }
    }

    fn prepare_checksum(&self, _checksum_strategy: DestinationChecksumStrategy) {
        #[cfg(test)]
        if _checksum_strategy == DestinationChecksumStrategy::KmsSha256
            && self.body_state().checksum_sha256().is_none()
            && let UploadPayload::Bytes { bytes, body_state } = self
        {
            body_state.record_checksum_sha256(sha256_base64(bytes));
        }
    }
}

struct PreparedUploadPayload {
    payload: UploadPayload,
    etag: Option<String>,
}

#[derive(Default)]
struct PutDiagnostics {
    wire_attempts: AtomicU64,
    failed_attempts: AtomicU64,
    retry_attempts: AtomicU64,
    throttled_attempts: AtomicU64,
    retry_wait_millis: AtomicU64,
    throttle_cooldown_waits: AtomicU64,
    throttle_cooldown_wait_millis: AtomicU64,
    failures_by_error_code: Mutex<BTreeMap<String, u64>>,
}

#[derive(Debug)]
struct PutDiagnosticsSnapshot {
    wire_attempts: u64,
    failed_attempts: u64,
    retry_attempts: u64,
    throttled_attempts: u64,
    retry_wait_millis: u64,
    throttle_cooldown_waits: u64,
    throttle_cooldown_wait_millis: u64,
    failures_by_error_code: BTreeMap<String, u64>,
}

struct PutRetryCoordinator {
    throttle_until: Mutex<Option<Instant>>,
    jitter: Mutex<Rng>,
}

struct PutContext<'a> {
    destination_s3: &'a S3Client,
    destination_bucket: &'a str,
    checksum_strategy: DestinationChecksumStrategy,
    retry: &'a PutObjectRetryOptions,
    retry_coordinator: &'a PutRetryCoordinator,
    diagnostics: &'a PutDiagnostics,
    stats: &'a DeploymentStats,
}

#[derive(Clone, Debug, Eq, PartialEq)]
enum PutPrecondition {
    IfMatch(String),
    IfNoneMatch,
}

pub(super) async fn execute_copy_plans(
    state: &AppState,
    destination_bucket: &str,
    copy_plans: Vec<CopyPlan>,
    max_parallel_transfers: usize,
    execution: TransferExecution,
) -> Result<()> {
    let TransferExecution { stats, deadlines } = execution;
    let mut scheduler =
        TransferScheduler::new(max_parallel_transfers, Arc::clone(&stats), deadlines);

    for plan in copy_plans {
        let state = state.clone();
        let destination_bucket = destination_bucket.to_string();
        let copied_bytes = plan.size.unwrap_or(0);
        let stats = Arc::clone(&stats);

        scheduler
            .spawn(async move {
                copy_source_object(
                    &state,
                    &destination_bucket,
                    &plan.source_bucket,
                    &plan.source_key,
                    plan.expected_etag.as_deref(),
                    &plan.destination_key,
                )
                .await?;
                stats.add_copied_object(copied_bytes);
                Ok(())
            })
            .await?;
    }

    scheduler.finish().await
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
    let put_diagnostics = Arc::new(PutDiagnostics::default());
    let put_retry_coordinator = Arc::new(PutRetryCoordinator::new());
    let mut archive_diagnostics_sources = Vec::new();
    let mut block_stores = Vec::new();
    let mut scheduler = TransferScheduler::new(
        request.runtime.max_parallel_transfers,
        Arc::clone(&stats),
        deadlines,
    );
    tracing::info!(
        source_global_budget_bytes = source_budget.limit_bytes(),
        "configured invocation-global source byte budget"
    );

    let transfer_result = async {
        for (archive_index, plans) in zip_plans {
            let source = archives[archive_index].source.clone();
            archive_diagnostics_sources.push((archive_index, source.clone()));
            let plans = plans
                .into_iter()
                .filter(|plan| {
                    !catalog_skips_zip_entry(
                        plan,
                        &request.source_markers[plan.source_index],
                        destination_objects.get(&plan.relative_key),
                        request.destination_checksum_strategy,
                        &stats,
                    )
                })
                .collect::<Vec<_>>();
            if plans.is_empty() {
                continue;
            }
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
            );
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
                let source_markers = request.source_markers[plan.source_index].clone();
                let source_marker_config = request.source_markers_config[plan.source_index].clone();
                let destination_object = destination_objects.get(&plan.relative_key).cloned();
                let put_diagnostics = put_diagnostics.clone();
                let put_retry_coordinator = put_retry_coordinator.clone();
                let put_retry = request.runtime.put_object_retry.clone();
                let checksum_strategy = request.destination_checksum_strategy;
                let stats = Arc::clone(&stats);

                scheduler
                    .spawn(async move {
                        let Some(payload) = prepare_zip_entry_upload(
                            &task_store,
                            &plan,
                            &source_markers,
                            &source_marker_config,
                            destination_object.as_ref(),
                            checksum_strategy,
                            &stats,
                        )
                        .await?
                        else {
                            return Ok(());
                        };

                        let precondition =
                            put_precondition_for_destination(destination_object.as_ref());
                        upload_payload(
                            PutContext {
                                destination_s3: &state.destination_s3,
                                destination_bucket: &destination_bucket,
                                checksum_strategy,
                                retry: &put_retry,
                                retry_coordinator: &put_retry_coordinator,
                                diagnostics: &put_diagnostics,
                                stats: &stats,
                            },
                            &plan.destination_key,
                            payload,
                            precondition,
                        )
                        .await
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
    let body_drain_result = abort_and_drain_body_tasks(&block_stores, deadlines).await;
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
    source_markers: &HashMap<String, String>,
    destination_object: Option<&DestinationObject>,
    checksum_strategy: DestinationChecksumStrategy,
    stats: &DeploymentStats,
) -> bool {
    let skip = checksum_strategy == DestinationChecksumStrategy::SseS3Etag
        && source_markers.is_empty()
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
    source_markers: &HashMap<String, String>,
    source_marker_config: &MarkerConfig,
    destination_object: Option<&DestinationObject>,
    checksum_strategy: DestinationChecksumStrategy,
    stats: &Arc<DeploymentStats>,
) -> Result<Option<UploadPayload>> {
    if source_markers.is_empty()
        && !should_compare_marker_free_entry(plan, destination_object, checksum_strategy)
    {
        return Ok(Some(UploadPayload::from_zip_entry(
            store.clone(),
            plan.clone(),
            plan.size,
        )));
    }

    if checksum_strategy == DestinationChecksumStrategy::SseS3Etag
        || plan.trusted_integrity.is_some()
    {
        if source_markers.is_empty() && plan.trusted_integrity.is_none() {
            stats.add_catalog_fallback_hash_attempt();
        } else {
            stats.add_md5_hash_attempt();
        }
    }
    let prepared = prepare_zip_entry_for_comparison(
        store.clone(),
        plan,
        source_markers,
        source_marker_config,
        checksum_strategy,
        stats,
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

    store.retain_zip_entry_for_replay(plan);

    if let Some(etag) = prepared.etag {
        prepared.payload.body_state().record_etag_md5(etag);
    }
    Ok(Some(prepared.payload))
}

fn should_compare_marker_free_entry(
    plan: &ZipEntryPlan,
    destination_object: Option<&DestinationObject>,
    checksum_strategy: DestinationChecksumStrategy,
) -> bool {
    checksum_strategy == DestinationChecksumStrategy::SseS3Etag
        && plan.trusted_integrity.is_none()
        && destination_object.is_some_and(|object| object.size == Some(plan.size))
}

async fn copy_source_object(
    state: &AppState,
    destination_bucket: &str,
    source_bucket: &str,
    source_key: &str,
    expected_etag: Option<&str>,
    destination_key: &str,
) -> Result<()> {
    let copy_source = format!(
        "{}/{}",
        source_bucket,
        urlencoding::encode(source_key).replace('+', "%20")
    );

    tracing::info!(
        source_bucket,
        source_key,
        destination_key,
        "copying source object"
    );

    let mut builder = state
        .destination_s3
        .copy_object()
        .bucket(destination_bucket)
        .key(destination_key)
        .copy_source(copy_source)
        .metadata_directive(MetadataDirective::Replace);

    if let Some(etag) = expected_etag {
        builder = builder.copy_source_if_match(quoted_etag(etag));
    }

    apply_copy_content_type(builder, destination_key)
        .send()
        .await
        .with_context(|| {
            format!("failed to copy {source_bucket}/{source_key} to {destination_key}")
        })?;

    Ok(())
}

fn quoted_etag(etag: &str) -> String {
    format!("\"{etag}\"")
}

async fn prepare_zip_entry_for_comparison(
    store: Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    source_marker_config: &MarkerConfig,
    checksum_strategy: DestinationChecksumStrategy,
    stats: &Arc<DeploymentStats>,
) -> Result<PreparedUploadPayload> {
    if source_markers.is_empty() {
        let etag = hash_zip_entry_reader(store.clone(), plan.clone()).await?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::from_zip_entry(store, plan.clone(), plan.size),
            etag: Some(etag),
        })
    } else {
        let replacements = Arc::new(MarkerReplacements::new(
            source_markers,
            source_marker_config,
        )?);
        // PutObject requires an exact length before its retryable body starts. This
        // pass validates and counts without retaining replacement output; only an
        // object that still needs uploading incurs the second streaming pass.
        stats.add_marker_planning_pass();
        let planned = plan_marker_zip_entry(
            store.clone(),
            plan.clone(),
            &replacements,
            checksum_strategy,
        )
        .await?;
        let etag = planned.md5;
        validate_put_object_size(plan, planned.output_bytes)?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::from_marker_zip_entry(
                store,
                plan.clone(),
                planned.output_bytes,
                replacements,
                Arc::clone(stats),
            ),
            etag,
        })
    }
}

async fn upload_payload(
    context: PutContext<'_>,
    destination_key: &str,
    payload: UploadPayload,
    precondition: Option<PutPrecondition>,
) -> Result<()> {
    payload.prepare_checksum(context.checksum_strategy);
    let mut last_error = None;

    let max_attempts = context.retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        context
            .retry_coordinator
            .wait_for_throttle_cooldown(context.diagnostics)
            .await;
        let body = payload_body(&payload, context.checksum_strategy);
        let mut request = context
            .destination_s3
            .put_object()
            .bucket(context.destination_bucket)
            .key(destination_key);
        if context.checksum_strategy == DestinationChecksumStrategy::KmsSha256 {
            request = request.checksum_algorithm(ChecksumAlgorithm::Sha256);
            if let Some(checksum) = payload.body_state().checksum_sha256() {
                request = request.checksum_sha256(checksum);
            }
        }
        let request = apply_put_precondition(request, precondition.as_ref());
        let request_checksum_calculation = request_checksum_calculation(
            context.checksum_strategy,
            payload.body_state().checksum_sha256().is_some(),
        );
        context
            .diagnostics
            .wire_attempts
            .fetch_add(1, Ordering::Relaxed);

        match apply_put_content_type(request, destination_key)
            .body(body)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new()
                    .retry_config(RetryConfig::disabled())
                    .request_checksum_calculation(request_checksum_calculation),
            )
            .send()
            .await
        {
            Ok(_) => {
                context.stats.add_uploaded_object(payload.content_length());
                return Ok(());
            }
            Err(error)
                if !is_conditional_put_conflict(&error)
                    && payload.body_state().validation_error().is_none()
                    && is_retryable_put_error(&error)
                    && attempt < max_attempts =>
            {
                let code = put_error_code(&error);
                let throttled = code.as_deref().is_some_and(is_put_throttle_error_code);
                context.diagnostics.record_failure(&error, throttled);
                context
                    .diagnostics
                    .retry_attempts
                    .fetch_add(1, Ordering::Relaxed);
                tracing::warn!(
                    destination_key,
                    attempt,
                    max_attempts,
                    error_code = ?code.as_deref(),
                    error = %put_error_message(&error),
                    "destination PutObject attempt failed; retrying"
                );
                let delay =
                    context
                        .retry_coordinator
                        .retry_delay(attempt, throttled, context.retry);
                if throttled {
                    context.retry_coordinator.extend_throttle_cooldown(delay);
                } else {
                    context
                        .diagnostics
                        .retry_wait_millis
                        .fetch_add(duration_millis_u64(delay), Ordering::Relaxed);
                    tokio::time::sleep(delay).await;
                }
                last_error = Some(error);
            }
            Err(error) => {
                let throttled = put_error_code(&error)
                    .as_deref()
                    .is_some_and(is_put_throttle_error_code);
                context.diagnostics.record_failure(&error, throttled);
                if is_conditional_put_conflict(&error) {
                    context.stats.add_conditional_conflict();
                    if reconcile_conditional_put(&context, destination_key, &payload).await {
                        context.stats.add_uploaded_object(payload.content_length());
                        return Ok(());
                    }
                }
                if let Some(validation_error) = payload.body_state().validation_error() {
                    return Err(anyhow!(validation_error.to_string())).with_context(|| {
                        format!("source validation failed while uploading {destination_key}")
                    });
                }
                return Err(error).with_context(|| format!("failed to upload {destination_key}"));
            }
        }
    }

    Err(last_error
        .map(|error| anyhow!(error))
        .unwrap_or_else(|| anyhow!("failed to upload {destination_key}")))
}

fn request_checksum_calculation(
    checksum_strategy: DestinationChecksumStrategy,
    checksum_precomputed: bool,
) -> RequestChecksumCalculation {
    if checksum_strategy == DestinationChecksumStrategy::KmsSha256 && !checksum_precomputed {
        // Streaming ZIP entries do not have a checksum until their first complete read. Ask the
        // SDK to place SHA-256 in an aws-chunked trailer while UploadBodyState independently hashes
        // the same bytes for ambiguous-write reconciliation. Byte-backed payloads and retries use
        // the already-computed header instead and avoid a second hash calculation.
        RequestChecksumCalculation::WhenSupported
    } else {
        RequestChecksumCalculation::WhenRequired
    }
}

fn put_precondition_for_destination(
    destination_object: Option<&DestinationObject>,
) -> Option<PutPrecondition> {
    match destination_object {
        None => Some(PutPrecondition::IfNoneMatch),
        Some(object) => object
            .etag
            .as_deref()
            .map(|etag| PutPrecondition::IfMatch(quote_etag(etag))),
    }
}

fn quote_etag(etag: &str) -> String {
    format!("\"{}\"", etag.trim_matches('"'))
}

fn apply_put_precondition(
    request: aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder,
    precondition: Option<&PutPrecondition>,
) -> aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder {
    match precondition {
        Some(PutPrecondition::IfMatch(etag)) => request.if_match(etag.as_str()),
        Some(PutPrecondition::IfNoneMatch) => request.if_none_match("*"),
        None => request,
    }
}

fn is_conditional_put_conflict(error: &SdkError<PutObjectError>) -> bool {
    if let SdkError::ServiceError(service) = error {
        let status = service.raw().status().as_u16();
        if status == 409 || status == 412 {
            return true;
        }
    }

    matches!(
        put_error_code(error).as_deref(),
        Some("ConditionalRequestConflict" | "PreconditionFailed")
    )
}

fn payload_body(
    payload: &UploadPayload,
    checksum_strategy: DestinationChecksumStrategy,
) -> ByteStream {
    match payload {
        #[cfg(test)]
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
                checksum_strategy,
                Arc::clone(body_attempts),
                MarkerBodyContext {
                    replacements: Arc::clone(marker_replacements),
                    stats: Arc::clone(deployment_stats),
                },
            ),
            _ => zip_entry_body(
                store.clone(),
                plan.clone(),
                *content_length,
                Arc::clone(body_state),
                checksum_strategy,
                Arc::clone(body_attempts),
            ),
        },
    }
}

async fn reconcile_conditional_put(
    context: &PutContext<'_>,
    destination_key: &str,
    payload: &UploadPayload,
) -> bool {
    let expected_identity = match context.checksum_strategy {
        DestinationChecksumStrategy::SseS3Etag => payload.body_state().etag_md5(),
        DestinationChecksumStrategy::KmsSha256 => payload.body_state().checksum_sha256(),
    };
    let Some(expected_identity) = expected_identity else {
        return false;
    };
    let mut head_request = context
        .destination_s3
        .head_object()
        .bucket(context.destination_bucket)
        .key(destination_key);
    if context.checksum_strategy == DestinationChecksumStrategy::KmsSha256 {
        head_request = head_request.checksum_mode(ChecksumMode::Enabled);
    }
    let head = match head_request.send().await {
        Ok(head) => head,
        Err(error) => {
            tracing::warn!(
                destination_key,
                error = %error,
                "could not reconcile an ambiguous conditional PutObject result"
            );
            return false;
        }
    };

    let size_matches = head
        .content_length()
        .and_then(|size| u64::try_from(size).ok())
        == Some(payload.content_length());
    let content_identity_matches = match context.checksum_strategy {
        DestinationChecksumStrategy::SseS3Etag => {
            head.e_tag().map(|etag| etag.trim_matches('"')) == Some(expected_identity)
        }
        DestinationChecksumStrategy::KmsSha256 => {
            head.checksum_sha256() == Some(expected_identity)
                && head.checksum_type() == Some(&ChecksumType::FullObject)
        }
    };
    if !size_matches || !content_identity_matches {
        return false;
    }
    tracing::info!(
        destination_key,
        strategy = ?context.checksum_strategy,
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
            plan.relative_key
        ));
    }
    Ok(())
}

#[cfg(test)]
fn sha256_base64(bytes: &[u8]) -> String {
    BASE64_STANDARD.encode(Sha256::digest(bytes))
}

async fn hash_zip_entry_reader(store: Arc<SourceBlockStore>, plan: ZipEntryPlan) -> Result<String> {
    let reader = zip_entry_reader(store, plan.clone())?;
    let (etag, _, _) = digest_async_reader(reader, &plan).await?;
    Ok(etag)
}

async fn digest_async_reader(
    mut reader: Pin<Box<dyn AsyncRead + Send>>,
    plan: &ZipEntryPlan,
) -> Result<(String, u64, u32)> {
    let mut hasher = Md5::new();
    let mut crc32 = Crc32Hasher::new();
    let mut bytes = 0_u64;
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        let next_bytes = bytes.saturating_add(bytes_read as u64);
        validate_zip_entry_size_not_exceeded(plan, next_bytes)?;
        hasher.update(&buffer[..bytes_read]);
        crc32.update(&buffer[..bytes_read]);
        bytes = next_bytes;
    }

    let crc32 = crc32.finalize();
    validate_zip_entry_output(plan, bytes, crc32)?;
    let md5 = finalize_md5(hasher);
    plan.validate_trusted_md5(&md5)?;
    Ok((md5, bytes, crc32))
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
        plan.validate_trusted_md5(&finalize_md5(md5))?;
    }
    Ok((bytes, total_bytes, crc32))
}

#[cfg(test)]
fn md5_hex(bytes: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(bytes);
    finalize_md5(hasher)
}

fn finalize_md5(hasher: Md5) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let digest = hasher.finalize();
    let bytes: &[u8] = digest.as_ref();
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

async fn abort_and_drain_body_tasks(
    stores: &[Arc<SourceBlockStore>],
    deadlines: InvocationDeadlines,
) -> Result<()> {
    let mut first_error = None;
    for store in stores {
        if let Err(error) = store
            .abort_and_drain_body_tasks(deadlines.bounded_drain())
            .await
            && first_error.is_none()
        {
            first_error = Some(error);
        }
    }
    first_error.map_or(Ok(()), Err)
}

fn put_retry_cap_millis(attempt: usize, throttled: bool, retry: &PutObjectRetryOptions) -> u64 {
    let (base, max) = put_retry_delay_bounds(throttled, retry);
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    base.saturating_mul(multiplier).min(max)
}

fn is_retryable_put_error(error: &SdkError<PutObjectError>) -> bool {
    match error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            status == 408
                || status == 429
                || status >= 500
                || service.err().code().is_some_and(is_put_throttle_error_code)
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

fn put_retry_delay_bounds(throttled: bool, retry: &PutObjectRetryOptions) -> (u64, u64) {
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

fn duration_millis_u64(duration: Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

impl PutDiagnostics {
    fn record_failure(&self, error: &SdkError<PutObjectError>, throttled: bool) {
        self.failed_attempts.fetch_add(1, Ordering::Relaxed);
        if throttled {
            self.throttled_attempts.fetch_add(1, Ordering::Relaxed);
        }
        let code = put_error_code(error).unwrap_or_else(|| put_error_kind(error).to_string());
        let mut failures = self
            .failures_by_error_code
            .lock()
            .expect("put diagnostics mutex should not be poisoned");
        *failures.entry(code).or_default() += 1;
    }

    fn snapshot(&self) -> PutDiagnosticsSnapshot {
        PutDiagnosticsSnapshot {
            wire_attempts: self.wire_attempts.load(Ordering::Relaxed),
            failed_attempts: self.failed_attempts.load(Ordering::Relaxed),
            retry_attempts: self.retry_attempts.load(Ordering::Relaxed),
            throttled_attempts: self.throttled_attempts.load(Ordering::Relaxed),
            retry_wait_millis: self.retry_wait_millis.load(Ordering::Relaxed),
            throttle_cooldown_waits: self.throttle_cooldown_waits.load(Ordering::Relaxed),
            throttle_cooldown_wait_millis: self
                .throttle_cooldown_wait_millis
                .load(Ordering::Relaxed),
            failures_by_error_code: self
                .failures_by_error_code
                .lock()
                .expect("put diagnostics mutex should not be poisoned")
                .clone(),
        }
    }
}

impl PutRetryCoordinator {
    fn new() -> Self {
        Self {
            throttle_until: Mutex::new(None),
            jitter: Mutex::new(Rng::new()),
        }
    }

    async fn wait_for_throttle_cooldown(&self, diagnostics: &PutDiagnostics) {
        loop {
            let delay = {
                let throttle_until = self
                    .throttle_until
                    .lock()
                    .expect("put retry coordinator mutex should not be poisoned");
                throttle_until.and_then(|deadline| deadline.checked_duration_since(Instant::now()))
            };
            let Some(delay) = delay else {
                return;
            };
            if delay.is_zero() {
                return;
            }

            diagnostics
                .throttle_cooldown_waits
                .fetch_add(1, Ordering::Relaxed);
            diagnostics
                .throttle_cooldown_wait_millis
                .fetch_add(duration_millis_u64(delay), Ordering::Relaxed);
            tokio::time::sleep(delay).await;
        }
    }

    fn retry_delay(
        &self,
        attempt: usize,
        throttled: bool,
        retry: &PutObjectRetryOptions,
    ) -> Duration {
        let delay_millis = put_retry_cap_millis(attempt, throttled, retry);
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
            .expect("put retry coordinator mutex should not be poisoned");
        if throttle_until.is_none_or(|current| deadline > current) {
            *throttle_until = Some(deadline);
        }
    }

    fn next_jitter(&self) -> u64 {
        self.jitter
            .lock()
            .expect("put retry jitter mutex should not be poisoned")
            .u64(..)
    }
}

fn put_error_kind(error: &SdkError<PutObjectError>) -> &'static str {
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
    diagnostics: &PutDiagnostics,
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

fn is_put_throttle_error_code(code: &str) -> bool {
    matches!(
        code,
        "SlowDown"
            | "Throttling"
            | "ThrottlingException"
            | "TooManyRequestsException"
            | "RequestLimitExceeded"
            | "RequestThrottled"
            | "RequestThrottledException"
            | "ProvisionedThroughputExceededException"
            | "BandwidthLimitExceeded"
    )
}

fn put_error_code(error: &SdkError<PutObjectError>) -> Option<String> {
    match error {
        SdkError::ServiceError(service) => service.err().code().map(ToOwned::to_owned),
        _ => None,
    }
}

fn put_error_message(error: &SdkError<PutObjectError>) -> String {
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
    use std::io::Cursor;

    use anyhow::Result;
    use aws_sdk_s3::primitives::SdkBody;
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};

    use super::super::destination::DestinationObject;
    use crate::s3::planner::ZipEntryPlan;
    use crate::types::{
        AppState, DeploymentStats, DestinationChecksumStrategy, PutObjectRetryJitter,
        PutObjectRetryOptions, TrustedEntryIntegrity,
    };

    use super::{
        PutContext, PutDiagnostics, PutPrecondition, PutRetryCoordinator, UploadPayload,
        catalog_skips_zip_entry, copy_source_object, digest_async_reader, duration_millis_u64,
        md5_hex, put_precondition_for_destination, put_retry_cap_millis, quoted_etag,
        read_async_reader_to_vec, request_checksum_calculation, sha256_base64,
        should_compare_marker_free_entry, upload_payload,
    };

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
            &Default::default(),
            Some(&object),
            DestinationChecksumStrategy::SseS3Etag,
            &stats,
        ));

        plan.trusted_integrity = Some(TrustedEntryIntegrity {
            size: 5,
            md5: "5d41402abc4b2a76b9719d911017c592".to_string(),
        });
        assert!(catalog_skips_zip_entry(
            &plan,
            &Default::default(),
            Some(&object),
            DestinationChecksumStrategy::SseS3Etag,
            &stats,
        ));
        assert!(!catalog_skips_zip_entry(
            &plan,
            &Default::default(),
            Some(&object),
            DestinationChecksumStrategy::KmsSha256,
            &stats,
        ));
    }

    #[test]
    fn kms_existing_untrusted_entries_skip_the_useless_md5_comparison_pass() {
        let plan = integrity_plan(b"hello", None);
        let object = DestinationObject {
            etag: Some("kms-etag-is-not-plaintext-md5".to_string()),
            size: Some(5),
        };

        assert!(should_compare_marker_free_entry(
            &plan,
            Some(&object),
            DestinationChecksumStrategy::SseS3Etag,
        ));
        assert!(!should_compare_marker_free_entry(
            &plan,
            Some(&object),
            DestinationChecksumStrategy::KmsSha256,
        ));
    }

    #[tokio::test]
    async fn sse_s3_conflict_reconciliation_uses_md5_etag_without_acl_reads() {
        let exact_headers = vec![
            ("content-length", "5"),
            ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
        ];
        let (result, requests, checksum_mode_requested) =
            run_ambiguous_put(DestinationChecksumStrategy::SseS3Etag, exact_headers).await;
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
            let (result, requests, _) =
                run_ambiguous_put(DestinationChecksumStrategy::SseS3Etag, mismatched_headers).await;
            assert!(result.is_err());
            assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        }
    }

    #[tokio::test]
    async fn kms_conflict_reconciliation_requires_full_object_sha256() {
        let exact_checksum = sha256_base64(b"hello");
        let exact_headers = vec![
            ("content-length", "5"),
            ("x-amz-checksum-sha256", exact_checksum.as_str()),
            ("x-amz-checksum-type", "FULL_OBJECT"),
        ];

        let (result, requests, checksum_mode_requested) =
            run_ambiguous_put(DestinationChecksumStrategy::KmsSha256, exact_headers).await;
        result.expect("an exact KMS object should reconcile");
        assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        assert!(checksum_mode_requested);

        for mismatched_headers in [
            vec![
                ("content-length", "6"),
                ("x-amz-checksum-sha256", exact_checksum.as_str()),
                ("x-amz-checksum-type", "FULL_OBJECT"),
            ],
            vec![
                ("content-length", "5"),
                (
                    "x-amz-checksum-sha256",
                    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                ),
                ("x-amz-checksum-type", "FULL_OBJECT"),
            ],
            vec![
                ("content-length", "5"),
                ("x-amz-checksum-sha256", exact_checksum.as_str()),
                ("x-amz-checksum-type", "COMPOSITE"),
            ],
        ] {
            let (result, requests, _) =
                run_ambiguous_put(DestinationChecksumStrategy::KmsSha256, mismatched_headers).await;
            assert!(result.is_err());
            assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        }
    }

    #[tokio::test]
    async fn permanent_put_4xx_is_not_retried() {
        let replay = StaticReplayClient::new(vec![error_event(400, "InvalidRequest")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let retry = test_retry_options();

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                checksum_strategy: DestinationChecksumStrategy::SseS3Etag,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            test_payload(DestinationChecksumStrategy::SseS3Etag),
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
    async fn kms_byte_put_sends_precomputed_sha256_checksum() {
        let replay = StaticReplayClient::new(vec![error_event(400, "InvalidRequest")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                checksum_strategy: DestinationChecksumStrategy::KmsSha256,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            test_payload(DestinationChecksumStrategy::KmsSha256),
            None,
        )
        .await;

        assert!(result.is_err());
        let request = replay.actual_requests().next().expect("one PUT request");
        assert_eq!(
            request.headers().get("x-amz-sdk-checksum-algorithm"),
            Some("SHA256")
        );
        assert_eq!(
            request.headers().get("x-amz-checksum-sha256"),
            Some(sha256_base64(b"hello").as_str())
        );
    }

    #[test]
    fn only_first_streaming_kms_attempt_enables_sdk_checksum_calculation() {
        assert_eq!(
            request_checksum_calculation(DestinationChecksumStrategy::KmsSha256, false),
            aws_sdk_s3::config::RequestChecksumCalculation::WhenSupported
        );
        for (strategy, checksum_precomputed) in [
            (DestinationChecksumStrategy::KmsSha256, true),
            (DestinationChecksumStrategy::SseS3Etag, false),
            (DestinationChecksumStrategy::SseS3Etag, true),
        ] {
            assert_eq!(
                request_checksum_calculation(strategy, checksum_precomputed),
                aws_sdk_s3::config::RequestChecksumCalculation::WhenRequired
            );
        }
    }

    #[tokio::test]
    async fn copy_sets_inferred_content_type_without_requesting_a_checksum() {
        let replay = StaticReplayClient::new(vec![copy_success_event()]);
        let destination_s3 = replay_s3_client(replay.clone());
        let state = AppState {
            source_s3: destination_s3.clone(),
            destination_s3,
            cloudfront: aws_sdk_cloudfront::Client::from_conf(
                aws_sdk_cloudfront::Config::builder()
                    .behavior_version_latest()
                    .region(aws_sdk_cloudfront::config::Region::new("us-east-1"))
                    .credentials_provider(aws_sdk_cloudfront::config::Credentials::new(
                        "test-access-key",
                        "test-secret-key",
                        None,
                        None,
                        "shin-bucket-deployment-test",
                    ))
                    .build(),
            ),
            http: reqwest::Client::new(),
        };

        copy_source_object(
            &state,
            "destination",
            "source",
            "archive.zip",
            Some("source-etag"),
            "site/file.txt",
        )
        .await
        .expect("copy should succeed");

        let request = replay.actual_requests().next().expect("one COPY request");
        assert_eq!(request.headers().get("content-type"), Some("text/plain"));
        assert_eq!(
            request.headers().get("x-amz-metadata-directive"),
            Some("REPLACE")
        );
        assert!(request.headers().get("x-amz-checksum-algorithm").is_none());
        assert!(
            request
                .headers()
                .get("x-amz-sdk-checksum-algorithm")
                .is_none()
        );
    }

    #[tokio::test]
    async fn each_application_put_attempt_uses_one_sdk_attempt() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                checksum_strategy: DestinationChecksumStrategy::SseS3Etag,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            test_payload(DestinationChecksumStrategy::SseS3Etag),
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
    }

    #[tokio::test]
    async fn trusted_md5_is_checked_for_comparison_and_marker_materialization_reads() {
        let bytes = b"authenticated bytes";
        let correct = md5_hex(bytes);
        let valid = integrity_plan(bytes, Some(correct));

        digest_async_reader(Box::pin(Cursor::new(bytes)), &valid)
            .await
            .expect("comparison read should validate");
        read_async_reader_to_vec(Box::pin(Cursor::new(bytes)), &valid)
            .await
            .expect("marker materialization read should validate");

        let invalid = integrity_plan(bytes, Some("00000000000000000000000000000000".to_string()));
        let comparison_error = digest_async_reader(Box::pin(Cursor::new(bytes)), &invalid)
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
            put_precondition_for_destination(None),
            Some(PutPrecondition::IfNoneMatch)
        );
    }

    #[test]
    fn put_precondition_uses_if_match_for_known_destination_etag() {
        let object = DestinationObject {
            etag: Some("abc123".to_string()),
            size: Some(10),
        };

        assert_eq!(
            put_precondition_for_destination(Some(&object)),
            Some(PutPrecondition::IfMatch("\"abc123\"".to_string()))
        );
    }

    #[test]
    fn put_precondition_falls_back_without_destination_etag() {
        let object = DestinationObject {
            etag: None,
            size: Some(10),
        };

        assert_eq!(put_precondition_for_destination(Some(&object)), None);
    }

    #[test]
    fn quoted_etag_wraps_normalized_copy_source_etag() {
        assert_eq!(quoted_etag("abc123"), "\"abc123\"".to_string());
    }

    #[test]
    fn put_retry_cap_uses_capped_exponential_delays() {
        let retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(put_retry_cap_millis(1, false, &retry), 250);
        assert_eq!(put_retry_cap_millis(2, false, &retry), 500);
        assert_eq!(put_retry_cap_millis(3, false, &retry), 1_000);
        assert_eq!(put_retry_cap_millis(4, false, &retry), 1_000);
        assert_eq!(put_retry_cap_millis(2, true, &retry), 2_000);
    }

    #[test]
    fn put_retry_delay_supports_full_jitter_and_no_jitter() {
        let coordinator = PutRetryCoordinator::new();
        let mut retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(
            duration_millis_u64(coordinator.retry_delay(3, false, &retry)),
            1_000
        );

        retry.jitter = PutObjectRetryJitter::Full;
        assert!(duration_millis_u64(coordinator.retry_delay(3, false, &retry)) <= 1_000);
    }

    fn integrity_plan(bytes: &[u8], md5: Option<String>) -> ZipEntryPlan {
        ZipEntryPlan {
            source_index: 0,
            relative_key: "entry.txt".to_string(),
            destination_key: "entry.txt".to_string(),
            size: bytes.len() as u64,
            compressed_size: bytes.len() as u64,
            compression_code: 0,
            crc32: crc32fast::hash(bytes),
            trusted_integrity: md5.map(|md5| TrustedEntryIntegrity {
                size: bytes.len() as u64,
                md5,
            }),
            source_offset: 0,
            source_span_end: bytes.len() as u64,
        }
    }

    async fn run_ambiguous_put(
        checksum_strategy: DestinationChecksumStrategy,
        headers: Vec<(&str, &str)>,
    ) -> (Result<()>, Vec<String>, bool) {
        let replay = StaticReplayClient::new(vec![
            error_event(500, "InternalError"),
            error_event(412, "PreconditionFailed"),
            head_event(headers),
        ]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let retry = test_retry_options();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                checksum_strategy,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            test_payload(checksum_strategy),
            Some(PutPrecondition::IfNoneMatch),
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

    fn test_payload(checksum_strategy: DestinationChecksumStrategy) -> UploadPayload {
        let payload = UploadPayload::from_bytes(b"hello".to_vec());
        payload.body_state().record_etag_md5(md5_hex(b"hello"));
        if checksum_strategy == DestinationChecksumStrategy::KmsSha256 {
            payload.prepare_checksum(checksum_strategy);
        }
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
}
