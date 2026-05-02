use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::operation::put_object::PutObjectError;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::MetadataDirective;
use crc32fast::Hasher as Crc32Hasher;
use md5::{Digest as Md5Digest, Md5};
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

use crate::replace::replace_markers;
use crate::types::{
    AppState, DeploymentRequest, MarkerConfig, ObjectMetadata, PutObjectRetryOptions, SourceArchive,
};

use super::archive::{
    SourceBlockOptions, SourceBlockStore, validate_zip_entry_output,
    validate_zip_entry_size_not_exceeded, zip_entry_body, zip_entry_reader,
};
use super::destination::{DestinationObject, destination_md5_and_size_match};
use super::metadata::{apply_copy_metadata, apply_put_metadata};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{ZIP_ENTRY_READ_CHUNK_BYTES, source_window_bytes_for_archive};

enum UploadPayload {
    Bytes {
        bytes: Vec<u8>,
    },
    ZipEntry {
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
    },
}

enum PutCondition {
    IfNoneMatch,
    IfMatch(String),
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
    failures_by_error_code: Mutex<BTreeMap<String, u64>>,
}

#[derive(Debug)]
struct PutDiagnosticsSnapshot {
    failed_attempts: u64,
    retry_attempts: u64,
    throttled_attempts: u64,
    retry_wait_millis: u64,
    failures_by_error_code: BTreeMap<String, u64>,
}

pub(super) async fn execute_copy_plans(
    state: &AppState,
    destination_bucket: &str,
    metadata: &ObjectMetadata,
    copy_plans: Vec<CopyPlan>,
    max_parallel_transfers: usize,
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(max_parallel_transfers.max(1)));
    let mut tasks = JoinSet::new();

    for plan in copy_plans {
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .context("failed to acquire copy semaphore")?;
        let state = state.clone();
        let metadata = metadata.clone();
        let destination_bucket = destination_bucket.to_string();

        tasks.spawn(async move {
            let _permit = permit;
            copy_source_object(
                &state,
                &destination_bucket,
                &plan.source_bucket,
                &plan.source_key,
                &plan.destination_key,
                &metadata,
            )
            .await
        });
    }

    join_transfer_tasks(tasks).await
}

pub(super) async fn upload_zip_entries(
    state: &AppState,
    archives: &[SourceArchive],
    request: &DeploymentRequest,
    metadata: &ObjectMetadata,
    zip_plans: BTreeMap<usize, Vec<ZipEntryPlan>>,
    destination_objects: &HashMap<String, DestinationObject>,
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(
        request.runtime.max_parallel_transfers.max(1),
    ));
    let put_diagnostics = Arc::new(PutDiagnostics::default());
    let mut archive_diagnostics_sources = Vec::new();
    let mut tasks = JoinSet::new();

    for (archive_index, plans) in zip_plans {
        let source = archives[archive_index].source.clone();
        let plans = plans
            .into_iter()
            .filter(|plan| {
                !catalog_skips_zip_entry(
                    plan,
                    &request.source_markers[plan.source_index],
                    destination_objects.get(&plan.relative_key),
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
        archive_diagnostics_sources.push((archive_index, source.clone()));
        let scheduler = store.start_scheduler();
        for plan in plans {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .context("failed to acquire upload semaphore")?;
            let store = store.clone();
            let state = state.clone();
            let metadata = metadata.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let source_markers = request.source_markers[plan.source_index].clone();
            let source_marker_config = request.source_markers_config[plan.source_index].clone();
            let destination_object = destination_objects.get(&plan.relative_key).cloned();
            let put_diagnostics = put_diagnostics.clone();
            let put_retry = request.runtime.put_object_retry.clone();

            tasks.spawn(async move {
                let _permit = permit;
                let Some(payload) = prepare_zip_entry_upload(
                    &store,
                    &plan,
                    &source_markers,
                    &source_marker_config,
                    destination_object.as_ref(),
                )
                .await?
                else {
                    return Ok(());
                };

                upload_payload(
                    &state,
                    &destination_bucket,
                    &plan.destination_key,
                    &metadata,
                    put_condition(destination_object.as_ref())?,
                    payload,
                    &put_retry,
                    &put_diagnostics,
                )
                .await
            });
        }
        tasks.spawn(async move {
            scheduler
                .await
                .context("source block scheduler panicked or was cancelled")?;
            Ok(())
        });
    }

    join_transfer_tasks(tasks).await?;
    for (archive_index, source) in archive_diagnostics_sources {
        log_source_diagnostics(archive_index, &source);
    }
    log_put_diagnostics(&request.runtime.put_object_retry, &put_diagnostics);
    Ok(())
}

fn catalog_skips_zip_entry(
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    destination_object: Option<&DestinationObject>,
) -> bool {
    source_markers.is_empty()
        && plan
            .catalog_md5
            .as_deref()
            .zip(destination_object)
            .is_some_and(|(md5, object)| destination_md5_and_size_match(object, md5, plan.size))
}

async fn prepare_zip_entry_upload(
    store: &Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    source_marker_config: &MarkerConfig,
    destination_object: Option<&DestinationObject>,
) -> Result<Option<UploadPayload>> {
    if source_markers.is_empty() && destination_object.is_none() {
        return Ok(Some(UploadPayload::ZipEntry {
            store: store.clone(),
            plan: plan.clone(),
            content_length: plan.size,
        }));
    }

    if source_markers.is_empty() && plan.catalog_md5.is_some() && destination_object.is_some() {
        return Ok(Some(UploadPayload::ZipEntry {
            store: store.clone(),
            plan: plan.clone(),
            content_length: plan.size,
        }));
    }

    if source_markers.is_empty()
        && destination_object
            .and_then(|object| object.size)
            .is_some_and(|size| size != plan.size)
    {
        return Ok(Some(UploadPayload::ZipEntry {
            store: store.clone(),
            plan: plan.clone(),
            content_length: plan.size,
        }));
    }

    let prepared =
        prepare_zip_entry_for_comparison(store.clone(), plan, source_markers, source_marker_config)
            .await?;

    if destination_object_etag_matches(destination_object, &prepared.etag) {
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

    let builder = state
        .destination_s3
        .copy_object()
        .bucket(destination_bucket)
        .key(destination_key)
        .copy_source(copy_source)
        .metadata_directive(MetadataDirective::Replace);

    apply_copy_metadata(builder, metadata, destination_key)
        .send()
        .await
        .with_context(|| {
            format!("failed to copy {source_bucket}/{source_key} to {destination_key}")
        })?;

    Ok(())
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
            payload: UploadPayload::ZipEntry {
                store,
                plan: plan.clone(),
                content_length: plan.size,
            },
            etag,
        })
    } else {
        let bytes = read_zip_entry_to_vec(store, plan.clone()).await?;
        let replaced = replace_markers(bytes, source_markers, source_marker_config)?;
        let etag = md5_hex(&replaced);
        Ok(PreparedUploadPayload {
            payload: UploadPayload::Bytes { bytes: replaced },
            etag,
        })
    }
}

async fn upload_payload(
    state: &AppState,
    destination_bucket: &str,
    destination_key: &str,
    metadata: &ObjectMetadata,
    condition: PutCondition,
    payload: UploadPayload,
    retry: &PutObjectRetryOptions,
    diagnostics: &PutDiagnostics,
) -> Result<()> {
    let mut last_error = None;

    let max_attempts = retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        if attempt > 1 {
            retain_payload_for_replay(&payload);
        }
        let body = payload_body(&payload);
        let mut request = state
            .destination_s3
            .put_object()
            .bucket(destination_bucket)
            .key(destination_key);

        request = match &condition {
            PutCondition::IfNoneMatch => request.if_none_match("*"),
            PutCondition::IfMatch(etag) => request.if_match(etag),
        };

        match apply_put_metadata(request, metadata, destination_key)
            .body(body)
            .send()
            .await
        {
            Ok(_) => return Ok(()),
            Err(error) if is_conditional_put_conflict(&error) => {
                let throttled = put_error_code(&error)
                    .as_deref()
                    .is_some_and(is_put_throttle_error_code);
                diagnostics.record_failure(&error, throttled);
                return Err(anyhow!(
                    "conditional upload conflict for {destination_key}: {}",
                    put_error_message(&error)
                ));
            }
            Err(error) if attempt < max_attempts => {
                let code = put_error_code(&error);
                let throttled = code.as_deref().is_some_and(is_put_throttle_error_code);
                diagnostics.record_failure(&error, throttled);
                diagnostics.retry_attempts.fetch_add(1, Ordering::Relaxed);
                tracing::warn!(
                    destination_key,
                    attempt,
                    max_attempts,
                    error_code = ?code.as_deref(),
                    error = %put_error_message(&error),
                    "destination PutObject attempt failed; retrying"
                );
                let delay = put_retry_delay(attempt, throttled, retry);
                diagnostics.retry_wait_millis.fetch_add(
                    u64::try_from(delay.as_millis()).unwrap_or(u64::MAX),
                    Ordering::Relaxed,
                );
                tokio::time::sleep(delay).await;
                last_error = Some(error);
            }
            Err(error) => {
                let throttled = put_error_code(&error)
                    .as_deref()
                    .is_some_and(is_put_throttle_error_code);
                diagnostics.record_failure(&error, throttled);
                return Err(error).with_context(|| format!("failed to upload {destination_key}"));
            }
        }
    }

    Err(last_error
        .map(|error| anyhow!(error))
        .unwrap_or_else(|| anyhow!("failed to upload {destination_key}")))
}

fn payload_body(payload: &UploadPayload) -> ByteStream {
    match payload {
        UploadPayload::Bytes { bytes } => ByteStream::from(bytes.clone()),
        UploadPayload::ZipEntry {
            store,
            plan,
            content_length,
        } => zip_entry_body(store.clone(), plan.clone(), *content_length),
    }
}

fn retain_payload_for_replay(payload: &UploadPayload) {
    if let UploadPayload::ZipEntry { store, plan, .. } = payload {
        store.retain_zip_entry_for_replay(plan);
    }
}

fn destination_object_etag_matches(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
) -> bool {
    destination_object.and_then(|object| object.etag.as_deref()) == Some(expected_etag)
}

fn put_condition(destination_object: Option<&DestinationObject>) -> Result<PutCondition> {
    match destination_object {
        None => Ok(PutCondition::IfNoneMatch),
        Some(object) => object
            .if_match
            .clone()
            .map(PutCondition::IfMatch)
            .ok_or_else(|| anyhow!("destination object exists but was listed without an ETag")),
    }
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
    Ok((finalize_md5(hasher), bytes, crc32))
}

async fn read_async_reader_to_vec(
    mut reader: Pin<Box<dyn AsyncRead + Send>>,
    plan: &ZipEntryPlan,
) -> Result<(Vec<u8>, u64, u32)> {
    let mut bytes = Vec::new();
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
        crc32.update(&buffer[..bytes_read]);
        bytes.extend_from_slice(&buffer[..bytes_read]);
        total_bytes = next_bytes;
    }

    let crc32 = crc32.finalize();
    validate_zip_entry_output(plan, total_bytes, crc32)?;
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

async fn join_transfer_tasks(mut tasks: JoinSet<Result<()>>) -> Result<()> {
    while let Some(result) = tasks.join_next().await {
        result.context("transfer task panicked or was cancelled")??;
    }

    Ok(())
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

fn put_retry_delay(attempt: usize, throttled: bool, retry: &PutObjectRetryOptions) -> Duration {
    let (base, max) = if throttled {
        (
            retry.slowdown_retry_base_delay_ms,
            retry.slowdown_retry_max_delay_ms,
        )
    } else {
        (retry.retry_base_delay_ms, retry.retry_max_delay_ms)
    };
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    Duration::from_millis(base.saturating_mul(multiplier).min(max))
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
            failures_by_error_code: self
                .failures_by_error_code
                .lock()
                .expect("put diagnostics mutex should not be poisoned")
                .clone(),
        }
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

fn log_source_diagnostics(archive_index: usize, source: &super::archive::SourceClient) {
    let diagnostics = source.diagnostics();
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
        block_releases = diagnostics.block_releases,
        block_misses = diagnostics.block_misses,
        block_refetches = diagnostics.block_refetches,
        active_gets_high_water = diagnostics.active_gets_high_water,
        "source block diagnostics"
    );
}

fn log_put_diagnostics(retry: &PutObjectRetryOptions, diagnostics: &PutDiagnostics) {
    let diagnostics = diagnostics.snapshot();
    tracing::info!(
        max_attempts = retry.max_attempts,
        retry_base_delay_ms = retry.retry_base_delay_ms,
        retry_max_delay_ms = retry.retry_max_delay_ms,
        slowdown_retry_base_delay_ms = retry.slowdown_retry_base_delay_ms,
        slowdown_retry_max_delay_ms = retry.slowdown_retry_max_delay_ms,
        failed_attempts = diagnostics.failed_attempts,
        retry_attempts = diagnostics.retry_attempts,
        throttled_attempts = diagnostics.throttled_attempts,
        retry_wait_millis = diagnostics.retry_wait_millis,
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
    use super::md5_hex;

    #[test]
    fn md5_hex_matches_known_digest() {
        assert_eq!(
            md5_hex(b"hello"),
            "5d41402abc4b2a76b9719d911017c592".to_string()
        );
    }
}
