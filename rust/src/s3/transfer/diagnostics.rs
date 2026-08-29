use std::collections::BTreeMap;
use std::sync::Mutex;
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::Duration;

use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use serde::Serialize;
use tokio::time::Instant;

use crate::deployment::PutObjectRetryOptions;
use crate::diagnostics::{
    CopyObjectStats, DeploymentStats, DiagnosticRangeStats, MAX_FAILURE_DIAGNOSTIC_GROUPS,
    MAX_FAILURE_DIAGNOSTIC_LABELS, OTHER_DIAGNOSTIC_LABEL, PutObjectFailureBodyStats,
    PutObjectFailureSourceStats, PutObjectFailureStateStats, PutObjectStats,
    same_failure_signature,
};
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, duration_ms, lock_telemetry, sanitize_diagnostic};

use super::super::archive::SourceClient;
use super::super::retry::{RetryCoordinator, RetryDiagnostics, is_retryable_http_status};
use super::upload::UploadPayload;

pub(super) struct WriteDiagnostics {
    pub(super) wire_attempts: AtomicU64,
    pub(super) failed_attempts: AtomicU64,
    pub(super) retry_attempts: AtomicU64,
    pub(super) throttled_attempts: AtomicU64,
    pub(super) retry_wait_millis: AtomicU64,
    pub(super) throttle_cooldown_waits: AtomicU64,
    pub(super) throttle_cooldown_wait_millis: AtomicU64,
    pub(super) failures_by_error_code: Mutex<BTreeMap<String, u64>>,
    pub(super) detailed: Option<Box<DetailedWriteDiagnostics>>,
}

#[derive(Default)]
pub(super) struct DetailedWriteDiagnostics {
    pub(super) failures_by_sdk_error_kind: Mutex<BTreeMap<String, u64>>,
    pub(super) failures_by_service_code: Mutex<BTreeMap<String, u64>>,
    pub(super) failure_states: Mutex<Vec<PutObjectFailureStateStats>>,
    pub(super) failure_state_overflow_attempts: AtomicU64,
}

impl Default for WriteDiagnostics {
    fn default() -> Self {
        Self::new(false)
    }
}

#[derive(Debug)]
pub(super) struct WriteDiagnosticsSnapshot {
    pub(super) wire_attempts: u64,
    pub(super) failed_attempts: u64,
    pub(super) retry_attempts: u64,
    pub(super) throttled_attempts: u64,
    pub(super) retry_wait_millis: u64,
    pub(super) throttle_cooldown_waits: u64,
    pub(super) throttle_cooldown_wait_millis: u64,
    pub(super) failures_by_error_code: BTreeMap<String, u64>,
    pub(super) failures_by_sdk_error_kind: BTreeMap<String, u64>,
    pub(super) failures_by_service_code: BTreeMap<String, u64>,
    pub(super) failure_states: Vec<PutObjectFailureStateStats>,
    pub(super) failure_state_overflow_attempts: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct PutObjectAttemptFailureEvent<'a> {
    event: &'static str,
    failure: &'a PutObjectFailureStateStats,
}

pub(super) fn is_conditional_write_conflict<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
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

pub(super) fn is_retryable_conditional_write_conflict<E: ProvideErrorMetadata>(
    error: &SdkError<E>,
) -> bool {
    if let SdkError::ServiceError(service) = error
        && service.raw().status().as_u16() == 409
    {
        return true;
    }
    write_error_code(error).as_deref() == Some("ConditionalRequestConflict")
}

pub(super) fn is_retryable_write_error<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
    match error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            is_retryable_http_status(status)
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
            is_retryable_http_status(status)
        }
        SdkError::ConstructionFailure(_) => false,
        _ => false,
    }
}

pub(super) async fn wait_for_write_retry_before_deadline(
    coordinator: &RetryCoordinator,
    diagnostics: &WriteDiagnostics,
    retry: &PutObjectRetryOptions,
    attempt: usize,
    throttled: bool,
    work_deadline: Instant,
) -> bool {
    coordinator
        .wait_for_retry_before_deadline(diagnostics, retry, attempt, throttled, work_deadline)
        .await
}

impl WriteDiagnostics {
    pub(super) fn new(detailed_failure_diagnostics: bool) -> Self {
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

    pub(super) fn detailed_failure_diagnostics_enabled(&self) -> bool {
        self.detailed.is_some()
    }

    pub(super) fn record_failure<E: ProvideErrorMetadata>(
        &self,
        error: &SdkError<E>,
        throttled: bool,
    ) {
        self.failed_attempts.fetch_add(1, Ordering::Relaxed);
        if throttled {
            self.throttled_attempts.fetch_add(1, Ordering::Relaxed);
        }
        let code = write_error_code(error).unwrap_or_else(|| write_error_kind(error).to_string());
        let mut failures = lock_telemetry(&self.failures_by_error_code);
        *failures.entry(code).or_default() += 1;
    }

    pub(super) fn record_put_failure<E: ProvideErrorMetadata>(
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

    pub(super) fn snapshot(&self) -> WriteDiagnosticsSnapshot {
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

impl RetryDiagnostics for WriteDiagnostics {
    fn record_retry(&self, _throttled: bool) {
        // Write attempt counts remain coupled to their operation outcomes.
    }

    fn record_retry_wait(&self, delay: Duration) {
        self.retry_wait_millis
            .fetch_add(duration_ms(delay), Ordering::Relaxed);
    }

    fn record_throttle_cooldown_sleep(&self, delay: Duration) {
        self.throttle_cooldown_waits.fetch_add(1, Ordering::Relaxed);
        self.throttle_cooldown_wait_millis
            .fetch_add(duration_ms(delay), Ordering::Relaxed);
    }

    fn record_throttle_retry_wait(&self, _elapsed: Duration) {
        // Write diagnostics retain each actual shared-cooldown sleep instead.
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

pub(super) fn record_bounded_diagnostic_count(
    target: &Mutex<BTreeMap<String, u64>>,
    label: String,
) {
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

pub(super) fn sanitize_diagnostic_label(value: &str) -> String {
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

pub(super) fn dispatch_failure_kind<E>(error: &SdkError<E>) -> Option<&'static str> {
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

pub(super) fn serialize_put_attempt_failure(
    failure: &PutObjectFailureStateStats,
) -> serde_json::Result<String> {
    serde_json::to_string(&PutObjectAttemptFailureEvent {
        event: "shin_put_object_attempt_failure",
        failure,
    })
}

pub(super) fn write_error_kind<E>(error: &SdkError<E>) -> &'static str {
    match error {
        SdkError::ConstructionFailure(_) => "ConstructionFailure",
        SdkError::TimeoutError(_) => "TimeoutError",
        SdkError::DispatchFailure(_) => "DispatchFailure",
        SdkError::ResponseError(_) => "ResponseError",
        SdkError::ServiceError(_) => "ServiceError",
        _ => "SdkError",
    }
}

pub(super) fn log_source_diagnostics(
    archive_index: usize,
    source: &SourceClient,
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

pub(super) fn log_put_diagnostics(
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

pub(super) fn log_copy_diagnostics(
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

pub(super) fn write_error_code<E: ProvideErrorMetadata>(error: &SdkError<E>) -> Option<String> {
    match error {
        SdkError::ServiceError(service) => service.err().code().map(ToOwned::to_owned),
        _ => None,
    }
}

pub(super) fn write_error_message<E>(error: &SdkError<E>) -> String
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
