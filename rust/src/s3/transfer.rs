use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{ChecksumAlgorithm, ChecksumMode, ChecksumType, MetadataDirective};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use crc32fast::Hasher as Crc32Hasher;
use fastrand::Rng;
use md5::{Digest as Md5Digest, Md5};
use sha2::Sha256;
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tokio::time::timeout_at;

use crate::deadline::InvocationDeadlines;
use crate::replace::replace_markers_bounded;
use crate::types::{
    AppState, DeploymentRequest, DeploymentStats, MarkerConfig, ObjectMetadata,
    PutObjectRetryJitter, PutObjectRetryOptions, SourceArchive,
};

use super::archive::{
    SourceBlockOptions, SourceBlockStore, UploadBodyState, validate_zip_entry_output,
    validate_zip_entry_size_not_exceeded, zip_entry_body, zip_entry_reader,
};
use super::destination::{DestinationObject, destination_md5_and_size_match};
use super::metadata::{apply_copy_metadata, apply_put_metadata};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{S3_SINGLE_PUT_LIMIT, ZIP_ENTRY_READ_CHUNK_BYTES, source_window_bytes_for_archive};

enum UploadPayload {
    Bytes {
        bytes: Vec<u8>,
        body_state: Arc<UploadBodyState>,
    },
    ZipEntry {
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
        body_state: Arc<UploadBodyState>,
    },
}

pub(super) struct TransferExecution {
    pub(super) stats: Arc<DeploymentStats>,
    pub(super) deadlines: InvocationDeadlines,
}

pub(super) struct ObjectSemantics<'a> {
    pub(super) current: &'a ObjectMetadata,
    pub(super) previous: Option<&'a ObjectMetadata>,
}

impl UploadPayload {
    fn from_bytes(bytes: Vec<u8>) -> Self {
        let body_state = Arc::new(UploadBodyState::default());
        body_state.record_checksum(sha256_base64(&bytes));
        Self::Bytes { bytes, body_state }
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
}

struct PreparedUploadPayload {
    payload: UploadPayload,
    etag: String,
}

#[derive(Default)]
struct PutDiagnostics {
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
    metadata: &'a ObjectMetadata,
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
    metadata: &ObjectMetadata,
    copy_plans: Vec<CopyPlan>,
    max_parallel_transfers: usize,
    execution: TransferExecution,
) -> Result<()> {
    let TransferExecution { stats, deadlines } = execution;
    let semaphore = Arc::new(Semaphore::new(max_parallel_transfers.max(1)));
    let mut tasks = JoinSet::new();

    for plan in copy_plans {
        let permit = match timeout_at(deadlines.work(), semaphore.clone().acquire_owned()).await {
            Ok(permit) => permit.context("failed to acquire copy semaphore")?,
            Err(_) => {
                abort_and_drain_transfer_tasks(&mut tasks, deadlines).await?;
                return Err(transfer_deadline_error());
            }
        };
        let state = state.clone();
        let metadata = metadata.clone();
        let destination_bucket = destination_bucket.to_string();
        let copied_bytes = plan.size.unwrap_or(0);
        let stats = Arc::clone(&stats);

        tasks.spawn(async move {
            let _permit = permit;
            copy_source_object(
                &state,
                &destination_bucket,
                &plan.source_bucket,
                &plan.source_key,
                plan.expected_etag.as_deref(),
                &plan.destination_key,
                &metadata,
            )
            .await?;
            stats.add_copied_object(copied_bytes);
            Ok(())
        });
    }

    join_transfer_tasks(tasks, deadlines).await
}

pub(super) async fn upload_zip_entries(
    state: &AppState,
    archives: &[SourceArchive],
    request: &DeploymentRequest,
    semantics: ObjectSemantics<'_>,
    zip_plans: BTreeMap<usize, Vec<ZipEntryPlan>>,
    destination_objects: &HashMap<String, DestinationObject>,
    execution: TransferExecution,
) -> Result<()> {
    let ObjectSemantics {
        current: metadata,
        previous: previous_metadata,
    } = semantics;
    let TransferExecution { stats, deadlines } = execution;
    let semaphore = Arc::new(Semaphore::new(
        request.runtime.max_parallel_transfers.max(1),
    ));
    let put_diagnostics = Arc::new(PutDiagnostics::default());
    let put_retry_coordinator = Arc::new(PutRetryCoordinator::new());
    let mut archive_diagnostics_sources = Vec::new();
    let mut block_stores = Vec::new();
    let mut tasks = JoinSet::new();

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
                    previous_metadata.is_none_or(|previous| {
                        !previous.semantically_matches(metadata, &plan.destination_key)
                    }),
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
        let scheduler_store = store.clone();
        for plan in plans {
            let permit = match timeout_at(deadlines.work(), semaphore.clone().acquire_owned()).await
            {
                Ok(permit) => permit.context("failed to acquire upload semaphore")?,
                Err(_) => {
                    abort_and_drain_transfer_tasks(&mut tasks, deadlines).await?;
                    abort_and_drain_body_tasks(&block_stores, deadlines).await?;
                    return Err(transfer_deadline_error());
                }
            };
            let store = store.clone();
            let state = state.clone();
            let metadata = metadata.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let source_markers = request.source_markers[plan.source_index].clone();
            let source_marker_config = request.source_markers_config[plan.source_index].clone();
            let destination_object = destination_objects.get(&plan.relative_key).cloned();
            let put_diagnostics = put_diagnostics.clone();
            let put_retry_coordinator = put_retry_coordinator.clone();
            let put_retry = request.runtime.put_object_retry.clone();
            let metadata_changed = previous_metadata.is_none_or(|previous| {
                !previous.semantically_matches(&metadata, &plan.destination_key)
            });
            let stats = Arc::clone(&stats);

            tasks.spawn(async move {
                let _permit = permit;
                let Some(payload) = prepare_zip_entry_upload(
                    &store,
                    &plan,
                    &source_markers,
                    &source_marker_config,
                    destination_object.as_ref(),
                    metadata_changed,
                    &stats,
                )
                .await?
                else {
                    return Ok(());
                };

                let precondition = put_precondition_for_destination(destination_object.as_ref());
                upload_payload(
                    PutContext {
                        destination_s3: &state.destination_s3,
                        destination_bucket: &destination_bucket,
                        metadata: &metadata,
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
            });
        }
        tasks.spawn(async move {
            scheduler_store.run_scheduler().await;
            Ok(())
        });
    }

    let transfer_result = join_transfer_tasks(tasks, deadlines).await;
    let body_drain_result = abort_and_drain_body_tasks(&block_stores, deadlines).await;
    for (archive_index, source) in archive_diagnostics_sources {
        log_source_diagnostics(archive_index, &source, &stats);
    }
    log_put_diagnostics(&request.runtime.put_object_retry, &put_diagnostics, &stats);
    transfer_result?;
    body_drain_result
}

pub(super) async fn preflight_marker_outputs(
    archives: &[SourceArchive],
    request: &DeploymentRequest,
    zip_plans: &BTreeMap<usize, Vec<ZipEntryPlan>>,
    deadlines: InvocationDeadlines,
) -> Result<()> {
    for (archive_index, plans) in zip_plans {
        let marked_plans = plans
            .iter()
            .filter(|plan| !request.source_markers[plan.source_index].is_empty())
            .cloned()
            .collect::<Vec<_>>();
        if marked_plans.is_empty() {
            continue;
        }

        let source = archives
            .get(*archive_index)
            .with_context(|| {
                format!("missing source archive for marker preflight {archive_index}")
            })?
            .source
            .clone();
        let source_window_bytes =
            source_window_bytes_for_archive(&request.runtime, source.len(), marked_plans.len());
        let store = SourceBlockStore::new(
            source,
            &marked_plans,
            SourceBlockOptions {
                block_bytes: request.runtime.source_block_bytes,
                merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
                get_concurrency: request.runtime.source_get_concurrency,
                window_bytes: source_window_bytes,
            },
        );
        let mut scheduler = tokio::spawn(store.clone().run_scheduler());
        let validation = timeout_at(deadlines.work(), async {
            for plan in &marked_plans {
                prepare_zip_entry_for_comparison(
                    store.clone(),
                    plan,
                    &request.source_markers[plan.source_index],
                    &request.source_markers_config[plan.source_index],
                )
                .await?;
            }
            Ok::<(), anyhow::Error>(())
        })
        .await;

        match validation {
            Ok(Ok(())) => {
                timeout_at(deadlines.work(), &mut scheduler)
                    .await
                    .context("marker preflight scheduler exceeded the deployment work deadline")?
                    .context("marker preflight scheduler panicked")?;
            }
            Ok(Err(error)) => {
                scheduler.abort();
                let _ = scheduler.await;
                return Err(error).context("marker replacement preflight failed");
            }
            Err(_) => {
                scheduler.abort();
                let _ = scheduler.await;
                return Err(anyhow!(
                    "marker replacement preflight exceeded the deployment work deadline"
                ));
            }
        }
    }

    Ok(())
}

fn catalog_skips_zip_entry(
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    destination_object: Option<&DestinationObject>,
    metadata_changed: bool,
    stats: &DeploymentStats,
) -> bool {
    let skip = !metadata_changed
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
    metadata_changed: bool,
    stats: &DeploymentStats,
) -> Result<Option<UploadPayload>> {
    if source_markers.is_empty() && destination_object.is_none() {
        return Ok(Some(UploadPayload::from_zip_entry(
            store.clone(),
            plan.clone(),
            plan.size,
        )));
    }

    if source_markers.is_empty()
        && (metadata_changed || (plan.trusted_integrity.is_some() && destination_object.is_some()))
    {
        return Ok(Some(UploadPayload::from_zip_entry(
            store.clone(),
            plan.clone(),
            plan.size,
        )));
    }

    if source_markers.is_empty()
        && destination_object
            .and_then(|object| object.size)
            .is_some_and(|size| size != plan.size)
    {
        return Ok(Some(UploadPayload::from_zip_entry(
            store.clone(),
            plan.clone(),
            plan.size,
        )));
    }

    stats.add_md5_hash_attempt();
    let prepared =
        prepare_zip_entry_for_comparison(store.clone(), plan, source_markers, source_marker_config)
            .await?;

    if prepared_upload_matches_destination(destination_object, &prepared.etag, metadata_changed) {
        stats.add_md5_skip();
        stats.add_skipped_object();
        return Ok(None);
    }

    if source_markers.is_empty() {
        store.retain_zip_entry_for_replay(plan);
    }

    Ok(Some(prepared.payload))
}

async fn copy_source_object(
    state: &AppState,
    destination_bucket: &str,
    source_bucket: &str,
    source_key: &str,
    expected_etag: Option<&str>,
    destination_key: &str,
    metadata: &ObjectMetadata,
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
        .checksum_algorithm(ChecksumAlgorithm::Sha256)
        .metadata_directive(MetadataDirective::Replace);

    if let Some(etag) = expected_etag {
        builder = builder.copy_source_if_match(quoted_etag(etag));
    }

    apply_copy_metadata(builder, metadata, destination_key)
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
) -> Result<PreparedUploadPayload> {
    if source_markers.is_empty() {
        let etag = hash_zip_entry_reader(store.clone(), plan.clone()).await?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::from_zip_entry(store, plan.clone(), plan.size),
            etag,
        })
    } else {
        let bytes = read_zip_entry_to_vec(store, plan.clone()).await?;
        let replaced = replace_markers_bounded(
            bytes,
            source_markers,
            source_marker_config,
            usize::try_from(S3_SINGLE_PUT_LIMIT).unwrap_or(usize::MAX),
        )?;
        let etag = md5_hex(&replaced);
        validate_put_object_size(plan, replaced.len())?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::from_bytes(replaced),
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
    let mut last_error = None;

    let max_attempts = context.retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        if attempt > 1 {
            retain_payload_for_replay(&payload);
        }
        context
            .retry_coordinator
            .wait_for_throttle_cooldown(context.diagnostics)
            .await;
        let body = payload_body(&payload);
        let request = context
            .destination_s3
            .put_object()
            .bucket(context.destination_bucket)
            .key(destination_key)
            .checksum_algorithm(ChecksumAlgorithm::Sha256);
        let request = apply_put_precondition(request, precondition.as_ref());

        match apply_put_metadata(request, context.metadata, destination_key)
            .body(body)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
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

fn payload_body(payload: &UploadPayload) -> ByteStream {
    match payload {
        UploadPayload::Bytes { bytes, .. } => ByteStream::from(bytes.clone()),
        UploadPayload::ZipEntry {
            store,
            plan,
            content_length,
            body_state,
        } => zip_entry_body(
            store.clone(),
            plan.clone(),
            *content_length,
            Arc::clone(body_state),
        ),
    }
}

fn retain_payload_for_replay(payload: &UploadPayload) {
    if let UploadPayload::ZipEntry { store, plan, .. } = payload {
        store.retain_zip_entry_for_replay(plan);
    }
}

async fn reconcile_conditional_put(
    context: &PutContext<'_>,
    destination_key: &str,
    payload: &UploadPayload,
) -> bool {
    let Some(expected_checksum) = payload.body_state().checksum_sha256() else {
        return false;
    };
    let head = match context
        .destination_s3
        .head_object()
        .bucket(context.destination_bucket)
        .key(destination_key)
        .checksum_mode(ChecksumMode::Enabled)
        .send()
        .await
    {
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
    let checksum_matches = head.checksum_sha256() == Some(expected_checksum)
        && head.checksum_type() == Some(&ChecksumType::FullObject);
    let metadata_matches = context.metadata.matches_head_object(&head, destination_key);
    if !size_matches || !checksum_matches || !metadata_matches {
        return false;
    }

    let acl = match context
        .destination_s3
        .get_object_acl()
        .bucket(context.destination_bucket)
        .key(destination_key)
        .send()
        .await
    {
        Ok(acl) => acl,
        Err(error) => {
            tracing::warn!(
                destination_key,
                error = %error,
                "could not verify the ACL while reconciling an ambiguous PutObject result"
            );
            return false;
        }
    };
    let bucket_owner_id = if context.metadata.requires_bucket_owner_acl_identity() {
        match context
            .destination_s3
            .get_bucket_acl()
            .bucket(context.destination_bucket)
            .send()
            .await
        {
            Ok(bucket_acl) => bucket_acl
                .owner()
                .and_then(|owner| owner.id())
                .map(ToOwned::to_owned),
            Err(error) => {
                tracing::warn!(
                    destination_key,
                    error = %error,
                    "could not identify the bucket owner while reconciling an ambiguous PutObject result"
                );
                return false;
            }
        }
    } else {
        None
    };
    let reconciled = context
        .metadata
        .matches_object_acl(&acl, bucket_owner_id.as_deref());
    if reconciled {
        tracing::info!(
            destination_key,
            "conditional PutObject conflict matched the exact intended object"
        );
    }
    reconciled
}

fn destination_object_etag_matches(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
) -> bool {
    destination_object.and_then(|object| object.etag.as_deref()) == Some(expected_etag)
}

fn prepared_upload_matches_destination(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
    metadata_changed: bool,
) -> bool {
    !metadata_changed && destination_object_etag_matches(destination_object, expected_etag)
}

fn validate_put_object_size(plan: &ZipEntryPlan, output_len: usize) -> Result<()> {
    let output_len = u64::try_from(output_len)
        .map_err(|_| anyhow!("marker-expanded output size cannot be represented safely"))?;
    if output_len > S3_SINGLE_PUT_LIMIT {
        return Err(anyhow!(
            "marker-expanded entry `{}` is {output_len} bytes, larger than the S3 single PutObject limit",
            plan.relative_key
        ));
    }
    Ok(())
}

fn sha256_base64(bytes: &[u8]) -> String {
    BASE64_STANDARD.encode(Sha256::digest(bytes))
}

async fn hash_zip_entry_reader(store: Arc<SourceBlockStore>, plan: ZipEntryPlan) -> Result<String> {
    let reader = zip_entry_reader(store, plan.clone())?;
    let (etag, _, _) = digest_async_reader(reader, &plan).await?;
    Ok(etag)
}

async fn read_zip_entry_to_vec(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
) -> Result<Vec<u8>> {
    let reader = zip_entry_reader(store, plan.clone())?;
    let (bytes, _, _) = read_async_reader_to_vec(reader, &plan).await?;
    Ok(bytes)
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

async fn read_async_reader_to_vec(
    mut reader: Pin<Box<dyn AsyncRead + Send>>,
    plan: &ZipEntryPlan,
) -> Result<(Vec<u8>, u64, u32)> {
    let mut bytes = Vec::new();
    let mut md5 = Md5::new();
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
        md5.update(&buffer[..bytes_read]);
        crc32.update(&buffer[..bytes_read]);
        bytes.extend_from_slice(&buffer[..bytes_read]);
        total_bytes = next_bytes;
    }

    let crc32 = crc32.finalize();
    validate_zip_entry_output(plan, total_bytes, crc32)?;
    plan.validate_trusted_md5(&finalize_md5(md5))?;
    Ok((bytes, total_bytes, crc32))
}

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

async fn join_transfer_tasks(
    mut tasks: JoinSet<Result<()>>,
    deadlines: InvocationDeadlines,
) -> Result<()> {
    loop {
        let next = match timeout_at(deadlines.work(), tasks.join_next()).await {
            Ok(next) => next,
            Err(_) => {
                abort_and_drain_transfer_tasks(&mut tasks, deadlines).await?;
                return Err(transfer_deadline_error());
            }
        };
        let Some(result) = next else {
            return Ok(());
        };

        match result {
            Ok(Ok(())) => {}
            Ok(Err(error)) => {
                abort_and_drain_transfer_tasks(&mut tasks, deadlines).await?;
                return Err(error);
            }
            Err(error) => {
                abort_and_drain_transfer_tasks(&mut tasks, deadlines).await?;
                return Err(error).context("transfer task panicked or was cancelled");
            }
        }
    }
}

async fn abort_and_drain_transfer_tasks(
    tasks: &mut JoinSet<Result<()>>,
    deadlines: InvocationDeadlines,
) -> Result<()> {
    tasks.abort_all();
    timeout_at(deadlines.bounded_drain(), async {
        while tasks.join_next().await.is_some() {}
    })
    .await
    .context("transfer tasks did not drain before the deployment drain deadline")?;
    Ok(())
}

async fn abort_and_drain_body_tasks(
    stores: &[Arc<SourceBlockStore>],
    deadlines: InvocationDeadlines,
) -> Result<()> {
    for store in stores {
        store
            .abort_and_drain_body_tasks(deadlines.bounded_drain())
            .await?;
    }
    Ok(())
}

fn transfer_deadline_error() -> anyhow::Error {
    anyhow!("S3 transfer work exceeded the deployment work deadline")
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
    stats.add_put_stats(
        diagnostics.failed_attempts,
        diagnostics.retry_attempts,
        diagnostics.throttled_attempts,
        diagnostics.retry_wait_millis,
        diagnostics.throttle_cooldown_waits,
        diagnostics.throttle_cooldown_wait_millis,
    );
    tracing::info!(
        max_attempts = retry.max_attempts,
        retry_base_delay_ms = retry.retry_base_delay_ms,
        retry_max_delay_ms = retry.retry_max_delay_ms,
        slowdown_retry_base_delay_ms = retry.slowdown_retry_base_delay_ms,
        slowdown_retry_max_delay_ms = retry.slowdown_retry_max_delay_ms,
        retry_jitter = ?retry.jitter,
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
    use std::collections::HashMap;
    use std::future::pending;
    use std::io::Cursor;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, Ordering};
    use std::time::Duration;

    use anyhow::Result;
    use aws_sdk_s3::primitives::SdkBody;
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};
    use tokio::task::JoinSet;
    use tokio::time::Instant as TokioInstant;

    use super::super::destination::DestinationObject;
    use crate::deadline::InvocationDeadlines;
    use crate::s3::planner::ZipEntryPlan;
    use crate::types::{
        DeploymentStats, ObjectMetadata, PutObjectRetryJitter, PutObjectRetryOptions,
        TrustedEntryIntegrity,
    };

    use super::{
        PutContext, PutDiagnostics, PutPrecondition, PutRetryCoordinator, UploadPayload,
        catalog_skips_zip_entry, digest_async_reader, duration_millis_u64, join_transfer_tasks,
        md5_hex, prepared_upload_matches_destination, put_precondition_for_destination,
        put_retry_cap_millis, quoted_etag, read_async_reader_to_vec, sha256_base64, upload_payload,
    };

    struct DropSignal(Arc<AtomicBool>);

    impl Drop for DropSignal {
        fn drop(&mut self) {
            self.0.store(true, Ordering::Release);
        }
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
            &Default::default(),
            Some(&object),
            false,
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
            false,
            &stats,
        ));
        assert!(!catalog_skips_zip_entry(
            &plan,
            &Default::default(),
            Some(&object),
            true,
            &stats,
        ));
    }

    #[test]
    fn metadata_changes_disable_hash_based_extracted_entry_skips() {
        let object = DestinationObject {
            etag: Some("5d41402abc4b2a76b9719d911017c592".to_string()),
            size: Some(5),
        };

        assert!(prepared_upload_matches_destination(
            Some(&object),
            "5d41402abc4b2a76b9719d911017c592",
            false,
        ));
        assert!(!prepared_upload_matches_destination(
            Some(&object),
            "5d41402abc4b2a76b9719d911017c592",
            true,
        ));
    }

    #[tokio::test]
    async fn ambiguous_put_failure_then_conflict_converges_only_for_exact_committed_object() {
        let exact_checksum = sha256_base64(b"hello");
        let exact_headers = vec![
            ("content-length", "5"),
            ("content-type", "text/plain"),
            ("x-amz-checksum-sha256", exact_checksum.as_str()),
            ("x-amz-checksum-type", "FULL_OBJECT"),
            ("x-amz-meta-release", "stable"),
        ];

        let (result, requests) = run_ambiguous_put(exact_headers).await;
        result.expect("an exact committed object should reconcile");
        assert_eq!(requests, vec!["PUT", "PUT", "HEAD", "GET"]);

        for mismatched_headers in [
            vec![
                ("content-length", "6"),
                ("content-type", "text/plain"),
                ("x-amz-checksum-sha256", exact_checksum.as_str()),
                ("x-amz-checksum-type", "FULL_OBJECT"),
                ("x-amz-meta-release", "stable"),
            ],
            vec![
                ("content-length", "5"),
                ("content-type", "text/plain"),
                (
                    "x-amz-checksum-sha256",
                    "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
                ),
                ("x-amz-checksum-type", "FULL_OBJECT"),
                ("x-amz-meta-release", "stable"),
            ],
            vec![
                ("content-length", "5"),
                ("content-type", "text/plain"),
                ("x-amz-checksum-sha256", exact_checksum.as_str()),
                ("x-amz-checksum-type", "FULL_OBJECT"),
                ("x-amz-meta-release", "canary"),
            ],
        ] {
            let (result, requests) = run_ambiguous_put(mismatched_headers).await;
            assert!(result.is_err());
            assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        }

        let (result, requests) = run_ambiguous_put_with_acl(
            vec![
                ("content-length", "5"),
                ("content-type", "text/plain"),
                ("x-amz-checksum-sha256", exact_checksum.as_str()),
                ("x-amz-checksum-type", "FULL_OBJECT"),
                ("x-amz-meta-release", "stable"),
            ],
            public_read_acl_xml(),
        )
        .await;
        assert!(result.is_err());
        assert_eq!(requests, vec!["PUT", "PUT", "HEAD", "GET"]);
    }

    #[tokio::test]
    async fn permanent_put_4xx_is_not_retried() {
        let replay = StaticReplayClient::new(vec![error_event(400, "InvalidRequest")]);
        let client = replay_s3_client(replay.clone());
        let metadata = test_metadata();
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let retry = test_retry_options();

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                metadata: &metadata,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            UploadPayload::from_bytes(b"hello".to_vec()),
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
    async fn each_application_put_attempt_uses_one_sdk_attempt() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let metadata = test_metadata();
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                metadata: &metadata,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            UploadPayload::from_bytes(b"hello".to_vec()),
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

    #[tokio::test(start_paused = true)]
    async fn deadline_aborts_and_drains_spawned_transfer_tasks() {
        let dropped = Arc::new(AtomicBool::new(false));
        let mut tasks = JoinSet::<Result<()>>::new();
        let task_dropped = Arc::clone(&dropped);
        tasks.spawn(async move {
            let _signal = DropSignal(task_dropped);
            pending::<()>().await;
            Ok(())
        });

        let result = join_transfer_tasks(
            tasks,
            InvocationDeadlines::from_remaining_at(
                TokioInstant::now(),
                Duration::from_secs(50) + Duration::from_millis(10),
            ),
        )
        .await;

        assert!(result.is_err());
        assert!(dropped.load(Ordering::Acquire));
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

    async fn run_ambiguous_put(headers: Vec<(&str, &str)>) -> (Result<()>, Vec<String>) {
        run_ambiguous_put_with_acl(headers, private_acl_xml()).await
    }

    async fn run_ambiguous_put_with_acl(
        headers: Vec<(&str, &str)>,
        acl_xml: &'static str,
    ) -> (Result<()>, Vec<String>) {
        let replay = StaticReplayClient::new(vec![
            error_event(500, "InternalError"),
            error_event(412, "PreconditionFailed"),
            head_event(headers),
            acl_event(acl_xml),
        ]);
        let client = replay_s3_client(replay.clone());
        let metadata = test_metadata();
        let diagnostics = PutDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = PutRetryCoordinator::new();
        let retry = test_retry_options();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                metadata: &metadata,
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
            },
            "file.txt",
            UploadPayload::from_bytes(b"hello".to_vec()),
            Some(PutPrecondition::IfNoneMatch),
        )
        .await;
        let requests = replay
            .actual_requests()
            .map(|request| request.method().to_string())
            .collect();
        (result, requests)
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

    fn acl_event(xml: &'static str) -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(200)
                .header("content-type", "application/xml")
                .body(SdkBody::from(xml.as_bytes()))
                .unwrap(),
        )
    }

    fn private_acl_xml() -> &'static str {
        r#"<AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Owner><ID>owner</ID></Owner><AccessControlList><Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser"><ID>owner</ID></Grantee><Permission>FULL_CONTROL</Permission></Grant></AccessControlList></AccessControlPolicy>"#
    }

    fn public_read_acl_xml() -> &'static str {
        r#"<AccessControlPolicy xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Owner><ID>owner</ID></Owner><AccessControlList><Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="CanonicalUser"><ID>owner</ID></Grantee><Permission>FULL_CONTROL</Permission></Grant><Grant><Grantee xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:type="Group"><URI>http://acs.amazonaws.com/groups/global/AllUsers</URI></Grantee><Permission>READ</Permission></Grant></AccessControlList></AccessControlPolicy>"#
    }

    fn test_metadata() -> ObjectMetadata {
        ObjectMetadata {
            user_metadata: HashMap::from([("release".to_string(), "stable".to_string())]),
            cache_control: None,
            content_disposition: None,
            content_encoding: None,
            content_language: None,
            content_type: None,
            server_side_encryption: None,
            storage_class: None,
            website_redirect_location: None,
            sse_kms_key_id: None,
            acl: None,
        }
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
