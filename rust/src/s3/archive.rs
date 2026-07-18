use std::collections::{BTreeMap, VecDeque};
use std::io;
use std::panic::AssertUnwindSafe;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Context as TaskContext, Poll};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use aws_sdk_s3::operation::get_object::GetObjectError;
use bytes::Bytes;
use futures_util::FutureExt;
use futures_util::stream::{FuturesUnordered, StreamExt};
use tokio::io::{AsyncBufRead, AsyncRead, AsyncSeek, ReadBuf, SeekFrom};
use tokio::sync::futures::OwnedNotified;
use tokio::sync::{Notify, OwnedSemaphorePermit, Semaphore};
use tokio::task::{AbortHandle, JoinSet};
use tokio::time::{Instant, timeout_at};

use crate::types::{AppState, DeploymentStats};

use super::planner::ZipEntryPlan;

mod directory;
mod entry;

pub(crate) use directory::prepare_zip_directory_reader;
#[cfg(test)]
use entry::{
    LOCAL_FILE_HEADER_LEN, open_entry_data_reader, send_marker_zip_entry_chunks,
    send_zip_entry_chunks,
};
pub(crate) use entry::{
    MarkerBodyContext, UploadBodyState, marker_zip_entry_body, plan_marker_zip_entry,
    validate_zip_entry_output, validate_zip_entry_size_not_exceeded, zip_entry_body,
    zip_entry_reader,
};

const GET_OBJECT_MAX_ATTEMPTS: usize = 3;
const SOURCE_BUDGET_PERMIT_UNIT_BYTES: u64 = 4 * 1024;

#[derive(Clone, Debug)]
pub(crate) struct SourceClient {
    client: Client,
    bucket: String,
    key: String,
    len: u64,
    etag: Option<String>,
    diagnostics: Arc<SourceDiagnostics>,
}

#[derive(Debug)]
pub(crate) struct SourceDiagnostics {
    source_zip_bytes: u64,
    planned_entries: AtomicU64,
    planned_blocks: AtomicU64,
    planned_source_bytes: AtomicU64,
    source_block_bytes: AtomicU64,
    source_block_merge_gap_bytes: AtomicU64,
    source_get_concurrency: AtomicU64,
    source_window_bytes: AtomicU64,
    fetched_blocks: AtomicU64,
    source_get_attempts: AtomicU64,
    source_get_retries: AtomicU64,
    source_get_request_errors: AtomicU64,
    source_get_body_errors: AtomicU64,
    source_get_short_body_errors: AtomicU64,
    source_get_throttled_attempts: AtomicU64,
    source_get_retryable_errors: AtomicU64,
    source_get_permanent_errors: AtomicU64,
    source_get_errors: AtomicU64,
    fetched_source_bytes: AtomicU64,
    block_hits: AtomicU64,
    block_waits: AtomicU64,
    block_waits_fetching: AtomicU64,
    block_waits_capacity: AtomicU64,
    block_releases: AtomicU64,
    block_misses: AtomicU64,
    block_refetches: AtomicU64,
    replay_claims: AtomicU64,
    replay_claims_after_release: AtomicU64,
    replay_claims_after_failure: AtomicU64,
    body_attempts: AtomicU64,
    body_replays: AtomicU64,
    active_gets: AtomicU64,
    active_gets_high_water: AtomicU64,
    active_readers: AtomicU64,
    active_readers_high_water: AtomicU64,
    resident_bytes_high_water: AtomicU64,
    local_capacity_waiters: AtomicU64,
}

#[derive(Debug)]
pub(crate) struct SourceDiagnosticsSnapshot {
    pub(crate) source_zip_bytes: u64,
    pub(crate) planned_entries: u64,
    pub(crate) planned_blocks: u64,
    pub(crate) planned_source_bytes: u64,
    pub(crate) source_block_bytes: u64,
    pub(crate) source_block_merge_gap_bytes: u64,
    pub(crate) source_get_concurrency: u64,
    pub(crate) source_window_bytes: u64,
    pub(crate) fetched_blocks: u64,
    pub(crate) source_get_attempts: u64,
    pub(crate) source_get_retries: u64,
    pub(crate) source_get_request_errors: u64,
    pub(crate) source_get_body_errors: u64,
    pub(crate) source_get_short_body_errors: u64,
    pub(crate) source_get_throttled_attempts: u64,
    pub(crate) source_get_retryable_errors: u64,
    pub(crate) source_get_permanent_errors: u64,
    pub(crate) source_get_errors: u64,
    pub(crate) fetched_source_bytes: u64,
    pub(crate) source_amplification: f64,
    pub(crate) block_hits: u64,
    pub(crate) block_waits: u64,
    pub(crate) block_waits_fetching: u64,
    pub(crate) block_waits_capacity: u64,
    pub(crate) block_releases: u64,
    pub(crate) block_misses: u64,
    pub(crate) block_refetches: u64,
    pub(crate) replay_claims: u64,
    pub(crate) replay_claims_after_release: u64,
    pub(crate) replay_claims_after_failure: u64,
    pub(crate) body_attempts: u64,
    pub(crate) body_replays: u64,
    pub(crate) active_gets_high_water: u64,
    pub(crate) active_readers_high_water: u64,
    pub(crate) resident_bytes_high_water: u64,
}

struct ActiveSourceGetGuard {
    diagnostics: Arc<SourceDiagnostics>,
}

struct LocalCapacityWaitGuard {
    diagnostics: Arc<SourceDiagnostics>,
}

pub(super) struct EntryAttemptClaim {
    store: Arc<SourceBlockStore>,
    indices: Vec<usize>,
    armed: bool,
}

struct SourceFetchReservation {
    store: Arc<SourceBlockStore>,
    index: usize,
    block: SourceBlockRange,
    restore_replay_priority: bool,
    armed: bool,
}

#[derive(Debug)]
pub(crate) struct SourceHead {
    len: u64,
    etag: Option<String>,
}

pub(crate) struct S3RangeReader {
    source: Arc<SourceClient>,
    position: u64,
    chunk_size: usize,
    buffer_start: u64,
    buffer: Bytes,
    in_flight: Option<Pin<Box<dyn Future<Output = io::Result<Bytes>> + Send>>>,
    in_flight_start: u64,
    preloaded: BTreeMap<u64, Bytes>,
}

#[derive(Clone, Copy, Debug)]
struct SourceBlockRange {
    start: u64,
    end: u64,
}

pub(crate) struct SourceBlockStore {
    source: Arc<SourceClient>,
    blocks: Vec<SourceBlockRange>,
    state: Mutex<SourceBlockState>,
    notify: Arc<Notify>,
    capacity_notify: Arc<Notify>,
    cancel_notify: Arc<Notify>,
    budget: Arc<SourceByteBudget>,
    source_get_concurrency: usize,
    window_bytes: u64,
    fetch_semaphore: Semaphore,
    body_tasks: Mutex<JoinSet<()>>,
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct SourceBlockOptions {
    pub(crate) block_bytes: usize,
    pub(crate) merge_gap_bytes: usize,
    pub(crate) get_concurrency: usize,
    pub(crate) window_bytes: usize,
}

struct SourceBlockState {
    slots: Vec<SourceBlockSlot>,
    window_committed_bytes: u64,
    resident_bytes: u64,
    failure: Option<String>,
}

struct SourceBlockSlot {
    remaining_claims: usize,
    live_claims: usize,
    replay_priority: bool,
    budget_permit: Option<SourceBudgetPermit>,
    status: SourceBlockStatus,
}

enum SourceBlockStatus {
    Pending,
    Reserving,
    Fetching,
    Ready(Bytes),
    Released,
    Failed(String),
}

pub(crate) struct SourceByteBudget {
    limit_bytes: u64,
    permit_unit_bytes: u64,
    semaphore: Arc<Semaphore>,
    stats: Arc<DeploymentStats>,
    capacity_waiters: Option<AtomicU64>,
}

struct SourceBudgetPermit {
    bytes: u64,
    _permit: OwnedSemaphorePermit,
    budget: Arc<SourceByteBudget>,
}

struct SourceBudgetWaitGuard {
    budget: Arc<SourceByteBudget>,
}

#[derive(Clone, Debug)]
pub(crate) struct SourceAttemptSnapshot {
    pub(crate) local_window_bytes: u64,
    pub(crate) local_committed_bytes: u64,
    pub(crate) local_resident_bytes: u64,
    pub(crate) local_capacity_waiters: u64,
    pub(crate) global_budget_bytes: u64,
    pub(crate) global_resident_bytes: u64,
    pub(crate) global_available_permits: u64,
    pub(crate) global_permit_unit_bytes: u64,
    pub(crate) global_permit_waiters: u64,
    pub(crate) active_fetches: u64,
}

pub(crate) struct SourcePlanningPermit {
    _permit: SourceBudgetPermit,
}

struct RangeGetError {
    source: io::Error,
    retryable: bool,
    throttled: bool,
}

pub(crate) async fn prepare_source_zip(
    state: &AppState,
    bucket: &str,
    key: &str,
) -> Result<Arc<SourceClient>> {
    let head = head_source(state, bucket, key).await?;

    Ok(Arc::new(SourceClient {
        client: state.source_s3.clone(),
        bucket: bucket.to_string(),
        key: key.to_string(),
        len: head.len,
        etag: head.etag,
        diagnostics: Arc::new(SourceDiagnostics::new(head.len)),
    }))
}

async fn head_source(state: &AppState, bucket: &str, key: &str) -> Result<SourceHead> {
    tracing::info!(bucket, key, "reading source archive metadata");

    let output = state
        .source_s3
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to read source archive metadata s3://{bucket}/{key}"))?;

    let len = output
        .content_length()
        .ok_or_else(|| anyhow!("source archive s3://{bucket}/{key} is missing content length"))?;
    let len = u64::try_from(len)
        .with_context(|| format!("source archive s3://{bucket}/{key} has negative length {len}"))?;

    Ok(SourceHead {
        len,
        etag: output.e_tag().map(ToOwned::to_owned),
    })
}

impl SourceClient {
    pub(crate) fn len(&self) -> u64 {
        self.len
    }

    pub(crate) fn diagnostics(&self) -> SourceDiagnosticsSnapshot {
        self.diagnostics.snapshot()
    }

    async fn get_range(&self, start: u64, end: u64) -> io::Result<Bytes> {
        if end < start {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("invalid S3 range: start {start} is greater than end {end}"),
            ));
        }
        if start >= self.len || end >= self.len {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "S3 range bytes={start}-{end} is outside source object length {}",
                    self.len
                ),
            ));
        }

        for attempt in 1..=GET_OBJECT_MAX_ATTEMPTS {
            self.diagnostics
                .source_get_attempts
                .fetch_add(1, Ordering::Relaxed);
            if attempt > 1 {
                self.diagnostics
                    .source_get_retries
                    .fetch_add(1, Ordering::Relaxed);
            }
            match self.fetch_range_once(start, end).await {
                Ok(bytes) => return Ok(bytes),
                Err(error) if error.retryable && attempt < GET_OBJECT_MAX_ATTEMPTS => {
                    self.diagnostics
                        .source_get_retryable_errors
                        .fetch_add(1, Ordering::Relaxed);
                    if error.throttled {
                        self.diagnostics
                            .source_get_throttled_attempts
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    tokio::time::sleep(Duration::from_millis(100 * attempt as u64)).await;
                }
                Err(error) => {
                    if error.retryable {
                        self.diagnostics
                            .source_get_retryable_errors
                            .fetch_add(1, Ordering::Relaxed);
                    } else {
                        self.diagnostics
                            .source_get_permanent_errors
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    if error.throttled {
                        self.diagnostics
                            .source_get_throttled_attempts
                            .fetch_add(1, Ordering::Relaxed);
                    }
                    self.diagnostics
                        .source_get_errors
                        .fetch_add(1, Ordering::Relaxed);
                    return Err(error.source);
                }
            }
        }

        Err(io::Error::other("S3 ranged GetObject failed"))
    }

    async fn fetch_range_once(
        &self,
        start: u64,
        end: u64,
    ) -> std::result::Result<Bytes, RangeGetError> {
        let _active_get = self.diagnostics.track_active_get();
        let mut request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&self.key)
            .range(format!("bytes={start}-{end}"));

        if let Some(etag) = &self.etag {
            request = request.if_match(etag);
        }

        let output = request
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
            )
            .send()
            .await
            .map_err(|error| {
                self.diagnostics
                    .source_get_request_errors
                    .fetch_add(1, Ordering::Relaxed);
                range_get_request_error(error)
            })?;

        output
            .body
            .collect()
            .await
            .map(|bytes| bytes.into_bytes())
            .map_err(|err| {
                self.diagnostics
                    .source_get_body_errors
                    .fetch_add(1, Ordering::Relaxed);
                RangeGetError {
                    source: io::Error::other(format!("S3 range body read failed: {err}")),
                    retryable: true,
                    throttled: false,
                }
            })
            .and_then(|bytes| {
                let expected_len = usize::try_from(end - start + 1).map_err(|_| {
                    RangeGetError {
                        source: io::Error::new(
                            io::ErrorKind::InvalidInput,
                            "S3 range is too large",
                        ),
                        retryable: false,
                        throttled: false,
                    }
                })?;
                if bytes.len() == expected_len {
                    Ok(bytes)
                } else {
                    self.diagnostics
                        .source_get_short_body_errors
                        .fetch_add(1, Ordering::Relaxed);
                    Err(RangeGetError {
                        source: io::Error::new(
                            io::ErrorKind::UnexpectedEof,
                            format!(
                                "S3 range bytes={start}-{end} returned {} bytes, expected {expected_len}",
                                bytes.len()
                            ),
                        ),
                        retryable: true,
                        throttled: false,
                    })
                }
            })
    }
}

fn range_get_request_error(error: SdkError<GetObjectError>) -> RangeGetError {
    let (retryable, throttled) = match &error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            let throttled = service.err().code().is_some_and(is_s3_throttle_error_code);
            (
                status == 408 || status == 429 || status >= 500 || throttled,
                throttled,
            )
        }
        SdkError::TimeoutError(_) | SdkError::DispatchFailure(_) => (true, false),
        SdkError::ResponseError(response) => {
            let status = response.raw().status().as_u16();
            (
                status == 408 || status == 429 || status >= 500,
                status == 429,
            )
        }
        SdkError::ConstructionFailure(_) => (false, false),
        _ => (false, false),
    };

    RangeGetError {
        source: io::Error::other(format!("S3 ranged GetObject failed: {error}")),
        retryable,
        throttled,
    }
}

fn is_s3_throttle_error_code(code: &str) -> bool {
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

impl SourceDiagnostics {
    fn new(source_zip_bytes: u64) -> Self {
        Self {
            source_zip_bytes,
            planned_entries: AtomicU64::new(0),
            planned_blocks: AtomicU64::new(0),
            planned_source_bytes: AtomicU64::new(0),
            source_block_bytes: AtomicU64::new(0),
            source_block_merge_gap_bytes: AtomicU64::new(0),
            source_get_concurrency: AtomicU64::new(0),
            source_window_bytes: AtomicU64::new(0),
            fetched_blocks: AtomicU64::new(0),
            source_get_attempts: AtomicU64::new(0),
            source_get_retries: AtomicU64::new(0),
            source_get_request_errors: AtomicU64::new(0),
            source_get_body_errors: AtomicU64::new(0),
            source_get_short_body_errors: AtomicU64::new(0),
            source_get_throttled_attempts: AtomicU64::new(0),
            source_get_retryable_errors: AtomicU64::new(0),
            source_get_permanent_errors: AtomicU64::new(0),
            source_get_errors: AtomicU64::new(0),
            fetched_source_bytes: AtomicU64::new(0),
            block_hits: AtomicU64::new(0),
            block_waits: AtomicU64::new(0),
            block_waits_fetching: AtomicU64::new(0),
            block_waits_capacity: AtomicU64::new(0),
            block_releases: AtomicU64::new(0),
            block_misses: AtomicU64::new(0),
            block_refetches: AtomicU64::new(0),
            replay_claims: AtomicU64::new(0),
            replay_claims_after_release: AtomicU64::new(0),
            replay_claims_after_failure: AtomicU64::new(0),
            body_attempts: AtomicU64::new(0),
            body_replays: AtomicU64::new(0),
            active_gets: AtomicU64::new(0),
            active_gets_high_water: AtomicU64::new(0),
            active_readers: AtomicU64::new(0),
            active_readers_high_water: AtomicU64::new(0),
            resident_bytes_high_water: AtomicU64::new(0),
            local_capacity_waiters: AtomicU64::new(0),
        }
    }

    fn record_plan(
        &self,
        options: SourceBlockOptions,
        blocks: &[SourceBlockRange],
        entries: usize,
    ) {
        self.planned_entries
            .store(entries as u64, Ordering::Relaxed);
        self.planned_blocks
            .store(blocks.len() as u64, Ordering::Relaxed);
        self.planned_source_bytes.store(
            blocks
                .iter()
                .map(|block| block.len())
                .fold(0_u64, u64::saturating_add),
            Ordering::Relaxed,
        );
        self.source_block_bytes
            .store(options.block_bytes as u64, Ordering::Relaxed);
        self.source_block_merge_gap_bytes
            .store(options.merge_gap_bytes as u64, Ordering::Relaxed);
        self.source_get_concurrency
            .store(options.get_concurrency as u64, Ordering::Relaxed);
        self.source_window_bytes
            .store(options.window_bytes as u64, Ordering::Relaxed);
    }

    fn track_active_get(self: &Arc<Self>) -> ActiveSourceGetGuard {
        let active = self.active_gets.fetch_add(1, Ordering::AcqRel) + 1;
        update_high_water(&self.active_gets_high_water, active);
        ActiveSourceGetGuard {
            diagnostics: Arc::clone(self),
        }
    }

    fn track_local_capacity_wait(self: &Arc<Self>) -> LocalCapacityWaitGuard {
        self.local_capacity_waiters.fetch_add(1, Ordering::AcqRel);
        LocalCapacityWaitGuard {
            diagnostics: Arc::clone(self),
        }
    }

    fn snapshot(&self) -> SourceDiagnosticsSnapshot {
        let planned_source_bytes = self.planned_source_bytes.load(Ordering::Relaxed);
        let fetched_source_bytes = self.fetched_source_bytes.load(Ordering::Relaxed);
        let source_amplification = if planned_source_bytes == 0 {
            0.0
        } else {
            fetched_source_bytes as f64 / planned_source_bytes as f64
        };

        SourceDiagnosticsSnapshot {
            source_zip_bytes: self.source_zip_bytes,
            planned_entries: self.planned_entries.load(Ordering::Relaxed),
            planned_blocks: self.planned_blocks.load(Ordering::Relaxed),
            planned_source_bytes,
            source_block_bytes: self.source_block_bytes.load(Ordering::Relaxed),
            source_block_merge_gap_bytes: self.source_block_merge_gap_bytes.load(Ordering::Relaxed),
            source_get_concurrency: self.source_get_concurrency.load(Ordering::Relaxed),
            source_window_bytes: self.source_window_bytes.load(Ordering::Relaxed),
            fetched_blocks: self.fetched_blocks.load(Ordering::Relaxed),
            source_get_attempts: self.source_get_attempts.load(Ordering::Relaxed),
            source_get_retries: self.source_get_retries.load(Ordering::Relaxed),
            source_get_request_errors: self.source_get_request_errors.load(Ordering::Relaxed),
            source_get_body_errors: self.source_get_body_errors.load(Ordering::Relaxed),
            source_get_short_body_errors: self.source_get_short_body_errors.load(Ordering::Relaxed),
            source_get_throttled_attempts: self
                .source_get_throttled_attempts
                .load(Ordering::Relaxed),
            source_get_retryable_errors: self.source_get_retryable_errors.load(Ordering::Relaxed),
            source_get_permanent_errors: self.source_get_permanent_errors.load(Ordering::Relaxed),
            source_get_errors: self.source_get_errors.load(Ordering::Relaxed),
            fetched_source_bytes,
            source_amplification,
            block_hits: self.block_hits.load(Ordering::Relaxed),
            block_waits: self.block_waits.load(Ordering::Relaxed),
            block_waits_fetching: self.block_waits_fetching.load(Ordering::Relaxed),
            block_waits_capacity: self.block_waits_capacity.load(Ordering::Relaxed),
            block_releases: self.block_releases.load(Ordering::Relaxed),
            block_misses: self.block_misses.load(Ordering::Relaxed),
            block_refetches: self.block_refetches.load(Ordering::Relaxed),
            replay_claims: self.replay_claims.load(Ordering::Relaxed),
            replay_claims_after_release: self.replay_claims_after_release.load(Ordering::Relaxed),
            replay_claims_after_failure: self.replay_claims_after_failure.load(Ordering::Relaxed),
            body_attempts: self.body_attempts.load(Ordering::Relaxed),
            body_replays: self.body_replays.load(Ordering::Relaxed),
            active_gets_high_water: self.active_gets_high_water.load(Ordering::Relaxed),
            active_readers_high_water: self.active_readers_high_water.load(Ordering::Relaxed),
            resident_bytes_high_water: self.resident_bytes_high_water.load(Ordering::Relaxed),
        }
    }

    fn record_resident_bytes(&self, resident_bytes: u64) {
        update_high_water(&self.resident_bytes_high_water, resident_bytes);
    }

    fn record_reader_started(&self) {
        let active = self.active_readers.fetch_add(1, Ordering::Relaxed) + 1;
        update_high_water(&self.active_readers_high_water, active);
    }

    fn record_reader_finished(&self) {
        self.active_readers.fetch_sub(1, Ordering::Relaxed);
    }

    fn record_wait_fetching(&self) {
        self.block_waits.fetch_add(1, Ordering::Relaxed);
        self.block_waits_fetching.fetch_add(1, Ordering::Relaxed);
    }

    fn record_wait_capacity(&self) {
        self.block_waits.fetch_add(1, Ordering::Relaxed);
        self.block_waits_capacity.fetch_add(1, Ordering::Relaxed);
    }

    fn record_replay_claim(&self) {
        self.replay_claims.fetch_add(1, Ordering::Relaxed);
    }

    fn record_replay_claim_after_release(&self) {
        self.replay_claims_after_release
            .fetch_add(1, Ordering::Relaxed);
        self.block_refetches.fetch_add(1, Ordering::Relaxed);
    }

    fn record_replay_claim_after_failure(&self) {
        self.replay_claims_after_failure
            .fetch_add(1, Ordering::Relaxed);
    }

    fn record_body_started(&self, replay: bool) {
        self.body_attempts.fetch_add(1, Ordering::Relaxed);
        if replay {
            self.body_replays.fetch_add(1, Ordering::Relaxed);
        }
    }
}

fn update_high_water(target: &AtomicU64, candidate: u64) {
    let mut current = target.load(Ordering::Relaxed);
    while candidate > current {
        match target.compare_exchange_weak(current, candidate, Ordering::Relaxed, Ordering::Relaxed)
        {
            Ok(_) => break,
            Err(next) => current = next,
        }
    }
}

impl Drop for ActiveSourceGetGuard {
    fn drop(&mut self) {
        self.diagnostics.active_gets.fetch_sub(1, Ordering::AcqRel);
    }
}

impl Drop for LocalCapacityWaitGuard {
    fn drop(&mut self) {
        self.diagnostics
            .local_capacity_waiters
            .fetch_sub(1, Ordering::AcqRel);
    }
}

impl EntryAttemptClaim {
    pub(super) fn activate(mut self) -> io::Result<VecDeque<usize>> {
        self.store.activate_reader(&self.indices)?;
        self.armed = false;
        Ok(std::mem::take(&mut self.indices).into())
    }
}

impl Drop for EntryAttemptClaim {
    fn drop(&mut self) {
        if self.armed {
            self.store.release_entry_attempt(&self.indices);
        }
    }
}

impl SourceFetchReservation {
    async fn fetch(mut self) {
        let result = match self.store.fetch_semaphore.acquire().await {
            Ok(_permit) => {
                self.store
                    .source
                    .get_range(self.block.start, self.block.end)
                    .await
            }
            Err(_) => Err(io::Error::other("source fetch semaphore is closed")),
        };
        self.store.finish_fetch(self.index, self.block, result);
        self.armed = false;
    }
}

impl Drop for SourceFetchReservation {
    fn drop(&mut self) {
        if self.armed {
            self.store
                .rollback_fetch(self.index, self.block, self.restore_replay_priority);
        }
    }
}

impl SourceByteBudget {
    pub(crate) fn new(
        limit_bytes: usize,
        stats: Arc<DeploymentStats>,
        detailed_failure_diagnostics: bool,
    ) -> Arc<Self> {
        assert!(limit_bytes > 0, "source byte budget must be positive");
        let limit_bytes = u64::try_from(limit_bytes).expect("usize source budget fits u64");
        let permit_unit_bytes = SOURCE_BUDGET_PERMIT_UNIT_BYTES.min(limit_bytes);
        let permit_count = usize::try_from(limit_bytes / permit_unit_bytes)
            .expect("source budget permit count fits usize");
        stats.configure_source_global_budget(limit_bytes);
        Arc::new(Self {
            limit_bytes,
            permit_unit_bytes,
            semaphore: Arc::new(Semaphore::new(permit_count)),
            stats,
            capacity_waiters: detailed_failure_diagnostics.then(|| AtomicU64::new(0)),
        })
    }

    pub(crate) fn limit_bytes(&self) -> u64 {
        self.limit_bytes
    }

    async fn reserve_planning(self: &Arc<Self>, bytes: u64) -> io::Result<SourcePlanningPermit> {
        let cancel = Arc::new(Notify::new());
        self.acquire(bytes, enabled_notification(&cancel))
            .await
            .map(|permit| SourcePlanningPermit { _permit: permit })
    }

    async fn acquire(
        self: &Arc<Self>,
        bytes: u64,
        cancel_wait: EnabledNotification,
    ) -> io::Result<SourceBudgetPermit> {
        if bytes == 0 || bytes > self.limit_bytes {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "source block of {bytes} bytes does not fit the {}-byte invocation-global budget",
                    self.limit_bytes
                ),
            ));
        }
        let permits = bytes.div_ceil(self.permit_unit_bytes);
        let permits = u32::try_from(permits).map_err(|_| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "source block budget permit count exceeds the semaphore limit",
            )
        })?;
        let permit = if self.capacity_waiters.is_some() {
            let acquisition = Arc::clone(&self.semaphore).acquire_many_owned(permits);
            tokio::pin!(acquisition);
            match futures_util::poll!(&mut acquisition) {
                Poll::Ready(permit) => {
                    permit.map_err(|_| io::Error::other("source byte budget is closed"))?
                }
                Poll::Pending => {
                    let _waiter = SourceBudgetWaitGuard::new(Arc::clone(self));
                    tokio::select! {
                        permit = &mut acquisition => permit.map_err(|_| io::Error::other("source byte budget is closed"))?,
                        () = cancel_wait => return Err(io::Error::other("source block reservation was cancelled")),
                    }
                }
            }
        } else {
            tokio::select! {
                permit = Arc::clone(&self.semaphore).acquire_many_owned(permits) =>
                    permit.map_err(|_| io::Error::other("source byte budget is closed"))?,
                () = cancel_wait => return Err(io::Error::other("source block reservation was cancelled")),
            }
        };
        self.stats.acquire_source_global_bytes(bytes);
        Ok(SourceBudgetPermit {
            bytes,
            _permit: permit,
            budget: Arc::clone(self),
        })
    }
}

impl SourceBudgetWaitGuard {
    fn new(budget: Arc<SourceByteBudget>) -> Self {
        budget
            .capacity_waiters
            .as_ref()
            .expect("waiter tracking is enabled")
            .fetch_add(1, Ordering::AcqRel);
        Self { budget }
    }
}

impl Drop for SourceBudgetWaitGuard {
    fn drop(&mut self) {
        self.budget
            .capacity_waiters
            .as_ref()
            .expect("waiter tracking is enabled")
            .fetch_sub(1, Ordering::AcqRel);
    }
}

impl Drop for SourceBudgetPermit {
    fn drop(&mut self) {
        self.budget.stats.release_source_global_bytes(self.bytes);
    }
}

impl S3RangeReader {
    fn with_preloaded(
        source: Arc<SourceClient>,
        chunk_size: usize,
        preloaded: BTreeMap<u64, Bytes>,
    ) -> Self {
        Self {
            source,
            position: 0,
            chunk_size: chunk_size.max(1),
            buffer_start: 0,
            buffer: Bytes::new(),
            in_flight: None,
            in_flight_start: 0,
            preloaded,
        }
    }

    fn available(&self) -> Option<&[u8]> {
        let buffer_end = self.buffer_start.saturating_add(self.buffer.len() as u64);
        if self.position >= self.buffer_start && self.position < buffer_end {
            let offset = (self.position - self.buffer_start) as usize;
            Some(&self.buffer[offset..])
        } else {
            None
        }
    }

    fn start_fetch(&mut self) -> bool {
        let chunk_size = self.chunk_size.max(1) as u64;
        let start = align_down(self.position, chunk_size);
        let end = self
            .source
            .len
            .saturating_sub(1)
            .min(start.saturating_add(chunk_size - 1));
        if let Some(bytes) = self.preloaded.remove(&start) {
            self.buffer_start = start;
            self.buffer = bytes;
            self.in_flight = None;
            return true;
        }
        let source = Arc::clone(&self.source);
        self.in_flight_start = start;
        self.in_flight = Some(Box::pin(async move { source.get_range(start, end).await }));
        false
    }

    fn poll_fetch(&mut self, cx: &mut TaskContext<'_>) -> Poll<io::Result<()>> {
        if self.position >= self.source.len {
            return Poll::Ready(Ok(()));
        }

        if self.in_flight.is_none() && self.start_fetch() {
            return Poll::Ready(Ok(()));
        }

        let fetched = match self
            .in_flight
            .as_mut()
            .expect("in-flight source fetch exists")
            .poll_unpin(cx)
        {
            Poll::Pending => return Poll::Pending,
            Poll::Ready(result) => result?,
        };

        self.buffer_start = self.in_flight_start;
        self.buffer = fetched;
        self.in_flight = None;

        if self.buffer.is_empty() {
            return Poll::Ready(Err(io::Error::new(
                io::ErrorKind::UnexpectedEof,
                "S3 range request returned no data before EOF",
            )));
        }

        Poll::Ready(Ok(()))
    }
}

impl SourceBlockStore {
    pub(crate) fn new(
        source: Arc<SourceClient>,
        plans: &[ZipEntryPlan],
        options: SourceBlockOptions,
        budget: Arc<SourceByteBudget>,
    ) -> Arc<Self> {
        let block_bytes = options.block_bytes.max(1);
        let get_concurrency = options.get_concurrency.max(1);
        let options = SourceBlockOptions {
            block_bytes,
            get_concurrency,
            ..options
        };
        let blocks = plan_source_blocks(
            source.len(),
            plans,
            options.block_bytes,
            options.merge_gap_bytes,
        );
        source
            .diagnostics
            .record_plan(options, &blocks, plans.len());
        Arc::new(Self {
            source,
            state: Mutex::new(SourceBlockState {
                slots: initial_claim_counts(&blocks, plans)
                    .into_iter()
                    .map(|remaining_claims| SourceBlockSlot {
                        remaining_claims,
                        live_claims: 0,
                        replay_priority: false,
                        budget_permit: None,
                        status: SourceBlockStatus::Pending,
                    })
                    .collect(),
                window_committed_bytes: 0,
                resident_bytes: 0,
                failure: None,
            }),
            blocks,
            notify: Arc::new(Notify::new()),
            capacity_notify: Arc::new(Notify::new()),
            cancel_notify: Arc::new(Notify::new()),
            budget,
            source_get_concurrency: options.get_concurrency,
            window_bytes: options.window_bytes.max(options.block_bytes) as u64,
            fetch_semaphore: Semaphore::new(options.get_concurrency),
            body_tasks: Mutex::new(JoinSet::new()),
        })
    }

    pub(crate) fn start_scheduler(self: &Arc<Self>) {
        let store = Arc::clone(self);
        let _ = self.spawn_body_task(async move {
            let outcome = AssertUnwindSafe(Arc::clone(&store).run_scheduler())
                .catch_unwind()
                .await;
            match outcome {
                Ok(Ok(())) => {}
                Ok(Err(error)) => store.cancel(format!("source block scheduler failed: {error}")),
                Err(_) => store.cancel("source block scheduler panicked"),
            }
        });
    }

    pub(crate) fn attempt_snapshot(&self) -> SourceAttemptSnapshot {
        let state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        SourceAttemptSnapshot {
            local_window_bytes: self.window_bytes,
            local_committed_bytes: state.window_committed_bytes,
            local_resident_bytes: state.resident_bytes,
            local_capacity_waiters: self
                .source
                .diagnostics
                .local_capacity_waiters
                .load(Ordering::Acquire),
            global_budget_bytes: self.budget.limit_bytes,
            global_resident_bytes: self.budget.stats.source_global_resident_bytes_current(),
            global_available_permits: u64::try_from(self.budget.semaphore.available_permits())
                .unwrap_or(u64::MAX),
            global_permit_unit_bytes: self.budget.permit_unit_bytes,
            global_permit_waiters: self
                .budget
                .capacity_waiters
                .as_ref()
                .map_or(0, |waiters| waiters.load(Ordering::Acquire)),
            active_fetches: self.source.diagnostics.active_gets.load(Ordering::Acquire),
        }
    }

    async fn run_scheduler(self: Arc<Self>) -> io::Result<()> {
        let mut tasks = FuturesUnordered::new();
        let mut next_index = 0_usize;

        loop {
            while tasks.len() < self.source_get_concurrency && next_index < self.blocks.len() {
                let index = next_index;
                next_index += 1;
                let Some(reservation) =
                    self.reserve_fetch(index, SourceFetchMode::Prefetch).await?
                else {
                    continue;
                };
                tasks.push(async move {
                    reservation.fetch().await;
                });
            }

            if tasks.next().await.is_none() {
                break;
            }
        }

        Ok(())
    }

    pub(crate) fn cancel(&self, reason: impl Into<String>) {
        let reason = reason.into();
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if state.failure.is_none() {
            state.failure = Some(reason.clone());
        }
        state.window_committed_bytes = 0;
        state.resident_bytes = 0;
        for slot in &mut state.slots {
            slot.budget_permit.take();
            if !matches!(slot.status, SourceBlockStatus::Released) {
                slot.status = SourceBlockStatus::Failed(reason.clone());
            }
        }
        drop(state);
        self.fetch_semaphore.close();
        self.notify.notify_waiters();
        self.capacity_notify.notify_waiters();
        self.cancel_notify.notify_waiters();
    }

    pub(crate) async fn abort_and_drain_body_tasks(&self, deadline: Instant) -> Result<()> {
        let mut tasks = {
            let mut tasks = self
                .body_tasks
                .lock()
                .expect("source body task mutex should not be poisoned");
            std::mem::replace(&mut *tasks, JoinSet::new())
        };

        tasks.abort_all();

        timeout_at(deadline, async {
            while let Some(result) = tasks.join_next().await {
                match result {
                    Ok(()) => {}
                    Err(error) if error.is_cancelled() => {}
                    Err(error) => return Err(error).context("source body task panicked"),
                }
            }
            Ok(())
        })
        .await
        .context("source body tasks did not drain before the deployment drain deadline")?
    }

    fn spawn_body_task(&self, task: impl Future<Output = ()> + Send + 'static) -> AbortHandle {
        let mut tasks = self
            .body_tasks
            .lock()
            .expect("source body task mutex should not be poisoned");
        while let Some(result) = tasks.try_join_next() {
            if let Err(error) = result
                && !error.is_cancelled()
            {
                tracing::error!(error = %error, "source body task panicked");
            }
        }
        tasks.spawn(task)
    }

    async fn reserve_fetch(
        self: &Arc<Self>,
        index: usize,
        mode: SourceFetchMode,
    ) -> io::Result<Option<SourceFetchReservation>> {
        if self.blocks.get(index).is_none() {
            return Ok(None);
        }
        let (block, cancel_wait, restore_replay_priority) = loop {
            let wait = {
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if let Some(error) = &state.failure {
                    return Err(io::Error::other(error.clone()));
                }
                if state.slots[index].remaining_claims == 0 {
                    return Ok(None);
                }
                match state.slots[index].status {
                    SourceBlockStatus::Pending => {}
                    SourceBlockStatus::Reserving
                    | SourceBlockStatus::Fetching
                    | SourceBlockStatus::Ready(_)
                    | SourceBlockStatus::Released
                    | SourceBlockStatus::Failed(_) => return Ok(None),
                }

                let block = self.blocks[index];
                let block_len = block.len();
                let target_window = self.window_bytes.max(block_len);
                // The local window bounds speculative scheduler retention. A body
                // replay may need an earlier block after that block was released,
                // while later prefetched blocks occupy the complete window. Let
                // demand reads borrow unused invocation-global budget so the replay
                // can make progress; the shared semaphore remains the hard memory
                // bound.
                if (mode == SourceFetchMode::Demand && state.slots[index].replay_priority)
                    || state.window_committed_bytes.saturating_add(block_len) <= target_window
                {
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_add(block_len);
                    let restore_replay_priority = state.slots[index].replay_priority;
                    state.slots[index].replay_priority = false;
                    state.slots[index].status = SourceBlockStatus::Reserving;
                    break (
                        block,
                        enabled_notification(&self.cancel_notify),
                        restore_replay_priority,
                    );
                }

                enabled_notification(&self.capacity_notify)
            };
            if self.budget.capacity_waiters.is_some() {
                let _waiter = self.source.diagnostics.track_local_capacity_wait();
                wait.await;
            } else {
                wait.await;
            }
        };

        let mut reservation = SourceFetchReservation {
            store: Arc::clone(self),
            index,
            block,
            restore_replay_priority,
            armed: true,
        };

        let permit = match Arc::clone(&self.budget)
            .acquire(block.len(), cancel_wait)
            .await
        {
            Ok(permit) => permit,
            Err(error) => {
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if matches!(state.slots[index].status, SourceBlockStatus::Reserving) {
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block.len());
                    state.slots[index].status = SourceBlockStatus::Failed(error.to_string());
                }
                reservation.armed = false;
                drop(state);
                self.notify.notify_waiters();
                self.capacity_notify.notify_waiters();
                return Err(error);
            }
        };

        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if let Some(error) = &state.failure {
            reservation.armed = false;
            return Err(io::Error::other(error.clone()));
        }
        if state.slots[index].remaining_claims == 0
            || !matches!(state.slots[index].status, SourceBlockStatus::Reserving)
        {
            if matches!(state.slots[index].status, SourceBlockStatus::Reserving) {
                state.window_committed_bytes =
                    state.window_committed_bytes.saturating_sub(block.len());
                state.slots[index].status = SourceBlockStatus::Released;
            }
            reservation.armed = false;
            drop(state);
            self.capacity_notify.notify_waiters();
            return Ok(None);
        }
        state.resident_bytes = state.resident_bytes.saturating_add(block.len());
        self.source
            .diagnostics
            .record_resident_bytes(state.resident_bytes);
        state.slots[index].budget_permit = Some(permit);
        state.slots[index].status = SourceBlockStatus::Fetching;
        drop(state);
        self.notify.notify_waiters();
        Ok(Some(reservation))
    }

    fn rollback_fetch(&self, index: usize, block: SourceBlockRange, restore_replay_priority: bool) {
        let mut rolled_back = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            let reserving = matches!(state.slots[index].status, SourceBlockStatus::Reserving);
            let fetching = matches!(state.slots[index].status, SourceBlockStatus::Fetching);
            if reserving || fetching {
                state.window_committed_bytes =
                    state.window_committed_bytes.saturating_sub(block.len());
                if fetching {
                    state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                    state.slots[index].budget_permit.take();
                }
                state.slots[index].replay_priority |= restore_replay_priority;
                state.slots[index].status = SourceBlockStatus::Pending;
                rolled_back = true;
            }
        }
        if rolled_back {
            self.notify.notify_waiters();
            self.capacity_notify.notify_waiters();
        }
    }

    fn finish_fetch(&self, index: usize, block: SourceBlockRange, result: io::Result<Bytes>) {
        let mut release_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            if state.failure.is_some()
                || !matches!(state.slots[index].status, SourceBlockStatus::Fetching)
            {
                return;
            }
            match result {
                Ok(bytes) => {
                    self.source
                        .diagnostics
                        .fetched_blocks
                        .fetch_add(1, Ordering::Relaxed);
                    self.source.diagnostics.fetched_source_bytes.fetch_add(
                        u64::try_from(bytes.len()).unwrap_or(u64::MAX),
                        Ordering::Relaxed,
                    );
                    if state.slots[index].remaining_claims == 0
                        && state.slots[index].live_claims == 0
                    {
                        state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                        state.window_committed_bytes =
                            state.window_committed_bytes.saturating_sub(block.len());
                        state.slots[index].budget_permit.take();
                        state.slots[index].status = SourceBlockStatus::Released;
                        self.source
                            .diagnostics
                            .block_releases
                            .fetch_add(1, Ordering::Relaxed);
                        release_capacity = true;
                    } else {
                        state.slots[index].status = SourceBlockStatus::Ready(bytes);
                    }
                }
                Err(error) => {
                    state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block.len());
                    state.slots[index].budget_permit.take();
                    state.slots[index].status = SourceBlockStatus::Failed(error.to_string());
                    release_capacity = true;
                }
            }
        }
        self.notify.notify_waiters();
        if release_capacity {
            self.capacity_notify.notify_waiters();
        }
    }

    fn activate_reader(&self, indices: &[usize]) -> io::Result<()> {
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if let Some(error) = &state.failure {
            return Err(io::Error::other(error.clone()));
        }
        for &index in indices {
            let Some(slot) = state.slots.get(index) else {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "source claim references an unknown block",
                ));
            };
            if slot.remaining_claims == 0 {
                return Err(io::Error::other(
                    "source block has no remaining planned claims",
                ));
            }
            if matches!(slot.status, SourceBlockStatus::Released) {
                return Err(io::Error::other(
                    "source block was already released before the reader was admitted",
                ));
            }
        }
        for &index in indices {
            state.slots[index].live_claims = state.slots[index].live_claims.saturating_add(1);
        }
        self.source.diagnostics.record_reader_started();
        Ok(())
    }

    pub(super) fn claim_zip_entry_attempt(
        self: &Arc<Self>,
        plan: &ZipEntryPlan,
    ) -> EntryAttemptClaim {
        EntryAttemptClaim {
            store: Arc::clone(self),
            indices: self.block_indices_for_span(plan.source_offset, plan.source_span_end),
            armed: true,
        }
    }

    fn release_entry_attempt(&self, indices: &[usize]) {
        let mut notify_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            for &index in indices {
                let Some(slot) = state.slots.get(index) else {
                    continue;
                };
                if slot.remaining_claims == 0 {
                    continue;
                }
                state.slots[index].remaining_claims -= 1;
                if state.slots[index].remaining_claims != 0 || state.slots[index].live_claims != 0 {
                    continue;
                }
                if matches!(state.slots[index].status, SourceBlockStatus::Ready(_)) {
                    state.slots[index].budget_permit.take();
                    state.slots[index].status = SourceBlockStatus::Released;
                    self.source
                        .diagnostics
                        .block_releases
                        .fetch_add(1, Ordering::Relaxed);
                    let block_len = self.blocks[index].len();
                    state.resident_bytes = state.resident_bytes.saturating_sub(block_len);
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block_len);
                    notify_capacity = true;
                } else if matches!(
                    state.slots[index].status,
                    SourceBlockStatus::Pending
                        | SourceBlockStatus::Reserving
                        | SourceBlockStatus::Fetching
                ) {
                    state.slots[index].replay_priority = true;
                }
            }
        }
        if notify_capacity {
            self.capacity_notify.notify_waiters();
        }
    }

    pub(crate) fn retain_zip_entry_for_replay(&self, plan: &ZipEntryPlan) {
        self.add_replay_claims(plan.source_offset, plan.source_span_end);
    }

    fn add_replay_claims(&self, start: u64, end_exclusive: u64) {
        let indices = self.block_indices_for_span(start, end_exclusive);
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if state.failure.is_some() {
            return;
        }
        for index in indices {
            self.source.diagnostics.record_replay_claim();
            let Some(slot) = state.slots.get_mut(index) else {
                continue;
            };
            slot.remaining_claims = slot.remaining_claims.saturating_add(1);
            slot.replay_priority = true;
            if matches!(
                slot.status,
                SourceBlockStatus::Released | SourceBlockStatus::Failed(_)
            ) {
                if matches!(slot.status, SourceBlockStatus::Released) {
                    self.source.diagnostics.record_replay_claim_after_release();
                } else {
                    self.source.diagnostics.record_replay_claim_after_failure();
                }
                slot.status = SourceBlockStatus::Pending;
            }
        }
        self.notify.notify_waiters();
    }

    async fn slice_from(
        self: &Arc<Self>,
        position: u64,
        end_exclusive: u64,
    ) -> io::Result<BlockSlice> {
        let index = self.block_index_at(position).ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::UnexpectedEof,
                format!("no planned source block covers offset {position}"),
            )
        })?;
        let block = self.blocks[index];
        let slice_end_exclusive = block.end_exclusive().min(end_exclusive);

        loop {
            let action = {
                let state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if let Some(error) = &state.failure {
                    return Err(io::Error::other(error.clone()));
                }
                match &state.slots[index].status {
                    SourceBlockStatus::Ready(bytes) => {
                        self.source
                            .diagnostics
                            .block_hits
                            .fetch_add(1, Ordering::Relaxed);
                        let offset = usize::try_from(position - block.start).map_err(|_| {
                            io::Error::new(io::ErrorKind::InvalidInput, "source offset too large")
                        })?;
                        let len =
                            usize::try_from(slice_end_exclusive - position).map_err(|_| {
                                io::Error::new(
                                    io::ErrorKind::InvalidInput,
                                    "source range too large",
                                )
                            })?;
                        let end = offset.checked_add(len).ok_or_else(|| {
                            io::Error::new(io::ErrorKind::InvalidInput, "source range overflowed")
                        })?;
                        return Ok(BlockSlice {
                            bytes: bytes.slice(offset..end),
                        });
                    }
                    SourceBlockStatus::Failed(message) => {
                        return Err(io::Error::other(message.clone()));
                    }
                    SourceBlockStatus::Released => {
                        self.source
                            .diagnostics
                            .block_misses
                            .fetch_add(1, Ordering::Relaxed);
                        return Err(io::Error::other(
                            "source block was released before all claimed bytes were consumed",
                        ));
                    }
                    SourceBlockStatus::Fetching => {
                        self.source.diagnostics.record_wait_fetching();
                        SourceBlockAction::Wait(enabled_notification(&self.notify))
                    }
                    SourceBlockStatus::Reserving => {
                        self.source.diagnostics.record_wait_capacity();
                        SourceBlockAction::Wait(enabled_notification(&self.notify))
                    }
                    SourceBlockStatus::Pending => {
                        if state.slots[index].remaining_claims == 0 {
                            return Err(io::Error::other(
                                "source block has no remaining planned claims",
                            ));
                        }
                        self.source
                            .diagnostics
                            .block_misses
                            .fetch_add(1, Ordering::Relaxed);
                        SourceBlockAction::Reserve
                    }
                }
            };

            match action {
                SourceBlockAction::Reserve => {
                    if let Some(reservation) =
                        self.reserve_fetch(index, SourceFetchMode::Demand).await?
                    {
                        reservation.fetch().await;
                    }
                }
                SourceBlockAction::Wait(wait) => {
                    wait.await;
                }
            }
        }
    }

    fn block_index_at(&self, position: u64) -> Option<usize> {
        let index = self.blocks.partition_point(|block| block.start <= position);
        if index == 0 {
            return None;
        }
        let block_index = index - 1;
        let block = self.blocks[block_index];
        (position <= block.end).then_some(block_index)
    }

    fn block_indices_for_span(&self, start: u64, end_exclusive: u64) -> Vec<usize> {
        block_indices_for_span(&self.blocks, start, end_exclusive)
    }

    fn block_end(&self, index: usize) -> Option<u64> {
        self.blocks.get(index).map(|block| block.end)
    }

    fn release_block_reader(&self, index: usize) {
        if self.blocks.get(index).is_none() {
            return;
        }
        let mut notify_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            let slot = &mut state.slots[index];
            if slot.live_claims == 0 {
                return;
            }
            slot.live_claims -= 1;
            slot.remaining_claims = slot.remaining_claims.saturating_sub(1);
            if slot.remaining_claims == 0
                && matches!(
                    slot.status,
                    SourceBlockStatus::Pending
                        | SourceBlockStatus::Reserving
                        | SourceBlockStatus::Fetching
                )
            {
                slot.replay_priority = true;
            }
            if slot.live_claims == 0
                && slot.remaining_claims == 0
                && matches!(slot.status, SourceBlockStatus::Ready(_))
            {
                slot.budget_permit.take();
                slot.status = SourceBlockStatus::Released;
                self.source
                    .diagnostics
                    .block_releases
                    .fetch_add(1, Ordering::Relaxed);
                state.resident_bytes = state
                    .resident_bytes
                    .saturating_sub(self.blocks[index].len());
                state.window_committed_bytes = state
                    .window_committed_bytes
                    .saturating_sub(self.blocks[index].len());
                notify_capacity = true;
            }
        }
        if notify_capacity {
            self.capacity_notify.notify_waiters();
        }
    }
}

enum SourceBlockAction {
    Reserve,
    Wait(EnabledNotification),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum SourceFetchMode {
    Prefetch,
    Demand,
}

type EnabledNotification = Pin<Box<OwnedNotified>>;

fn enabled_notification(notify: &Arc<Notify>) -> EnabledNotification {
    let mut wait = Box::pin(Arc::clone(notify).notified_owned());
    wait.as_mut().enable();
    wait
}

struct BlockSlice {
    bytes: Bytes,
}

impl SourceBlockRange {
    fn len(self) -> u64 {
        self.end - self.start + 1
    }

    fn end_exclusive(self) -> u64 {
        self.end.saturating_add(1)
    }
}

fn plan_source_blocks(
    source_len: u64,
    plans: &[ZipEntryPlan],
    block_bytes: usize,
    merge_gap_bytes: usize,
) -> Vec<SourceBlockRange> {
    if source_len == 0 {
        return Vec::new();
    }

    let block_size = block_bytes.max(1) as u64;
    let merge_gap = merge_gap_bytes as u64;
    let mut spans = plans
        .iter()
        .filter_map(|plan| {
            let start = plan.source_offset.min(source_len);
            let end = plan.source_span_end.min(source_len);
            (start < end).then_some((start, end))
        })
        .collect::<Vec<_>>();
    spans.sort_unstable();

    let mut coalesced = Vec::<(u64, u64)>::new();
    for (start, end) in spans {
        let Some((current_start, current_end)) = coalesced.last_mut() else {
            coalesced.push((start, end));
            continue;
        };
        let gap = start.saturating_sub(*current_end);
        let proposed_end = (*current_end).max(end);
        if gap <= merge_gap && proposed_end.saturating_sub(*current_start) <= block_size {
            *current_end = proposed_end;
        } else {
            coalesced.push((start, end));
        }
    }

    let mut blocks = Vec::new();
    for (start, end) in coalesced {
        let mut block_start = start;
        while block_start < end {
            let block_end_exclusive = block_start.saturating_add(block_size).min(end);
            blocks.push(SourceBlockRange {
                start: block_start,
                end: block_end_exclusive - 1,
            });
            block_start = block_end_exclusive;
        }
    }

    blocks
}

fn initial_claim_counts(blocks: &[SourceBlockRange], plans: &[ZipEntryPlan]) -> Vec<usize> {
    let mut counts = vec![0_usize; blocks.len()];
    for plan in plans {
        for index in block_indices_for_span(blocks, plan.source_offset, plan.source_span_end) {
            counts[index] = counts[index].saturating_add(1);
        }
    }
    counts
}

fn block_indices_for_span(
    blocks: &[SourceBlockRange],
    start: u64,
    end_exclusive: u64,
) -> Vec<usize> {
    if start >= end_exclusive {
        return Vec::new();
    }
    let first = blocks.partition_point(|block| block.end < start);
    let past_last = blocks.partition_point(|block| block.start < end_exclusive);
    (first..past_last.max(first)).collect()
}

impl AsyncRead for S3RangeReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.position >= self.source.len || buf.remaining() == 0 {
            return Poll::Ready(Ok(()));
        }

        if self.available().is_none() {
            std::task::ready!(self.poll_fetch(cx))?;
        }

        let available = self.available().unwrap_or_default();
        let len = available.len().min(buf.remaining());
        buf.put_slice(&available[..len]);
        self.position += len as u64;
        Poll::Ready(Ok(()))
    }
}

impl AsyncBufRead for S3RangeReader {
    fn poll_fill_buf(self: Pin<&mut Self>, cx: &mut TaskContext<'_>) -> Poll<io::Result<&[u8]>> {
        let this = self.get_mut();

        if this.position >= this.source.len {
            return Poll::Ready(Ok(&[]));
        }

        if this.available().is_none() {
            std::task::ready!(this.poll_fetch(cx))?;
        }

        let buffer_end = this.buffer_start.saturating_add(this.buffer.len() as u64);
        if this.position >= this.buffer_start && this.position < buffer_end {
            let offset = (this.position - this.buffer_start) as usize;
            Poll::Ready(Ok(&this.buffer[offset..]))
        } else {
            Poll::Ready(Ok(&[]))
        }
    }

    fn consume(mut self: Pin<&mut Self>, amt: usize) {
        let consumed = amt.min(self.available().unwrap_or_default().len());
        self.position = self.position.saturating_add(consumed as u64);
    }
}

impl AsyncSeek for S3RangeReader {
    fn start_seek(mut self: Pin<&mut Self>, position: SeekFrom) -> io::Result<()> {
        let len = self.source.len as i128;
        let current = self.position as i128;
        let next = match position {
            SeekFrom::Start(offset) => offset as i128,
            SeekFrom::End(offset) => len + offset as i128,
            SeekFrom::Current(offset) => current + offset as i128,
        };

        if next < 0 {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "seek before start of S3 object",
            ));
        }

        self.position = next as u64;
        self.in_flight = None;
        Ok(())
    }

    fn poll_complete(self: Pin<&mut Self>, _cx: &mut TaskContext<'_>) -> Poll<io::Result<u64>> {
        Poll::Ready(Ok(self.position))
    }
}

fn align_down(value: u64, block_size: u64) -> u64 {
    value - (value % block_size)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::future::pending;
    use std::io::Write;
    use std::pin::Pin;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
    use std::task::{Context, Poll};
    use std::time::Duration;

    use aws_sdk_s3::primitives::SdkBody;
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use base64::Engine as _;
    use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
    use futures_util::task::AtomicWaker;
    use http::{Request, Response};
    use http_body::{Body as _, Frame, SizeHint};
    use proptest::prelude::*;
    use tokio::io::AsyncReadExt;
    use tokio::sync::Semaphore;
    use tokio::time::Instant;
    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{
        LOCAL_FILE_HEADER_LEN, SourceClient, SourceDiagnostics, UploadBodyState,
        block_indices_for_span, marker_zip_entry_body, plan_marker_zip_entry, plan_source_blocks,
        prepare_zip_directory_reader, range_get_request_error, send_marker_zip_entry_chunks,
        send_zip_entry_chunks, zip_entry_body, zip_entry_reader,
    };
    use crate::replace::MarkerReplacements;
    use crate::s3::archive::{
        SourceBlockOptions, SourceBlockRange, SourceBlockSlot, SourceBlockState, SourceBlockStatus,
        SourceFetchMode,
    };
    use crate::s3::planner::ZipEntryPlan;
    use crate::s3::{DEFAULT_SOURCE_BLOCK_BYTES, DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES};
    use crate::types::{
        DeploymentStats, DestinationChecksumStrategy, MarkerConfig, TrustedEntryIntegrity,
    };

    const INFO_ZIP_FIXTURE: &str =
        include_str!("../../test-fixtures/external-zips/info-zip.zip.b64");
    const PYTHON_FORCE_ZIP64_FIXTURE: &str =
        include_str!("../../test-fixtures/external-zips/python-force-zip64.zip.b64");

    struct DropSignal(Arc<AtomicBool>);

    struct PendingResponseBody {
        started: Arc<AtomicBool>,
        dropped: Arc<AtomicBool>,
        content_length: u64,
    }

    struct GatedResponseBody {
        started: Arc<AtomicBool>,
        released: Arc<AtomicBool>,
        waker: Arc<AtomicWaker>,
        bytes: Option<bytes::Bytes>,
    }

    impl http_body::Body for PendingResponseBody {
        type Data = bytes::Bytes;
        type Error = std::io::Error;

        fn poll_frame(
            self: Pin<&mut Self>,
            _cx: &mut Context<'_>,
        ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
            self.started.store(true, Ordering::Release);
            Poll::Pending
        }

        fn size_hint(&self) -> SizeHint {
            SizeHint::with_exact(self.content_length)
        }
    }

    impl Drop for PendingResponseBody {
        fn drop(&mut self) {
            self.dropped.store(true, Ordering::Release);
        }
    }

    impl http_body::Body for GatedResponseBody {
        type Data = bytes::Bytes;
        type Error = std::io::Error;

        fn poll_frame(
            mut self: Pin<&mut Self>,
            cx: &mut Context<'_>,
        ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
            self.started.store(true, Ordering::Release);
            if !self.released.load(Ordering::Acquire) {
                self.waker.register(cx.waker());
                if !self.released.load(Ordering::Acquire) {
                    return Poll::Pending;
                }
            }
            Poll::Ready(self.bytes.take().map(|bytes| Ok(Frame::data(bytes))))
        }

        fn size_hint(&self) -> SizeHint {
            SizeHint::with_exact(self.bytes.as_ref().map_or(0, |bytes| bytes.len() as u64))
        }
    }

    #[tokio::test]
    async fn external_zip_local_extra_fields_stream_with_directory_bounds() {
        for (encoded, expected, expected_local_extra, expected_central_extra) in [
            (
                INFO_ZIP_FIXTURE,
                b"info-zip external archive\n" as &[u8],
                28_u16,
                24_u16,
            ),
            (
                PYTHON_FORCE_ZIP64_FIXTURE,
                b"python force_zip64 external archive\n" as &[u8],
                20_u16,
                0_u16,
            ),
        ] {
            let bytes = BASE64_STANDARD.decode(encoded.trim()).unwrap();
            let central_directory_start = bytes
                .windows(4)
                .position(|window| window == b"PK\x01\x02")
                .expect("central directory signature")
                as u64;
            let reader = async_zip::base::read::seek::ZipFileReader::with_tokio(
                std::io::Cursor::new(bytes.clone()),
            )
            .await
            .expect("fixture central directory");
            let stored = &reader.file().entries()[0];
            let source_offset = stored.header_offset();
            let local_extra_offset = usize::try_from(source_offset).unwrap() + 28;
            let central_extra_offset = usize::try_from(central_directory_start).unwrap() + 30;
            assert_eq!(
                u16::from_le_bytes([bytes[local_extra_offset], bytes[local_extra_offset + 1]]),
                expected_local_extra
            );
            assert_eq!(
                u16::from_le_bytes([bytes[central_extra_offset], bytes[central_extra_offset + 1]]),
                expected_central_extra
            );

            let plan = ZipEntryPlan {
                source_index: 0,
                relative_key: "index.html".to_string(),
                destination_key: "index.html".to_string(),
                size: stored.uncompressed_size(),
                compressed_size: stored.compressed_size(),
                compression_code: u16::from(stored.compression()),
                crc32: stored.crc32(),
                trusted_integrity: None,
                source_offset,
                source_span_end: central_directory_start,
            };
            let store = ready_store_for_plan(&bytes, &plan);
            let mut entry = zip_entry_reader(store, plan).expect("fixture entry reader");
            let mut output = Vec::new();
            entry.read_to_end(&mut output).await.unwrap();

            assert_eq!(output, expected);
        }
    }

    #[tokio::test]
    async fn directory_preflight_reuses_its_single_source_request_and_accounts_memory() {
        for encoded in [INFO_ZIP_FIXTURE, PYTHON_FORCE_ZIP64_FIXTURE] {
            let bytes = BASE64_STANDARD.decode(encoded.trim()).unwrap();
            let replay = StaticReplayClient::new(vec![get_success_bytes(bytes.clone())]);
            let source = replay_source_client(replay.clone(), bytes.len() as u64);
            let stats = Arc::new(DeploymentStats::default());
            let budget = super::SourceByteBudget::new(64 * 1024 * 1024, Arc::clone(&stats), false);

            let prepared = prepare_zip_directory_reader(source, 8 * 1024 * 1024, budget, 0)
                .await
                .expect("directory preflight");
            let planning_permit = prepared._planning_permit;
            let reader = async_zip::base::read::seek::ZipFileReader::with_tokio(prepared.reader)
                .await
                .expect("preloaded parser");

            assert_eq!(reader.file().entries().len(), 1);
            assert_eq!(replay.actual_requests().count(), 1);
            let (_, current, high_water) = stats.source_global_memory_for_test();
            assert!(current > bytes.len() as u64);
            assert_eq!(current, high_water);

            drop(reader);
            drop(planning_permit);
            assert_eq!(stats.source_global_memory_for_test().1, 0);
        }
    }

    #[tokio::test]
    async fn completed_entry_reader_drops_its_source_block_slice_before_releasing_capacity() {
        let zip = zip_from_entry("buffer.txt", b"source buffer lifetime");
        let plan = zip_plan_from_archive(&zip, "buffer.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let mut reader = super::open_entry_data_reader(store, plan)
            .await
            .expect("entry data reader");
        let mut compressed = Vec::new();

        reader.read_to_end(&mut compressed).await.unwrap();

        assert!(!compressed.is_empty());
        assert_eq!(reader.buffered_source_bytes_for_test(), 0);
    }

    impl Drop for DropSignal {
        fn drop(&mut self) {
            self.0.store(true, Ordering::Release);
        }
    }

    #[test]
    fn source_blocks_are_sorted_coalesced_and_split() {
        let plans = vec![
            plan_with_span("b.txt", 9 * 1024 * 1024, 18 * 1024 * 1024),
            plan_with_span("a.txt", 0, 1024),
            plan_with_span("near.txt", 128 * 1024, 256 * 1024),
        ];

        let blocks = plan_source_blocks(
            32 * 1024 * 1024,
            &plans,
            DEFAULT_SOURCE_BLOCK_BYTES,
            DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES,
        );

        assert_eq!(blocks[0].start, 0);
        assert_eq!(blocks[0].end, 256 * 1024 - 1);
        assert_eq!(blocks[1].start, 9 * 1024 * 1024);
        assert_eq!(blocks[1].end, 17 * 1024 * 1024 - 1);
        assert_eq!(blocks[2].start, 17 * 1024 * 1024);
        assert_eq!(blocks[2].end, 18 * 1024 * 1024 - 1);
    }

    proptest! {
        #[test]
        fn indexed_block_spans_match_the_linear_reference(
            shapes in prop::collection::vec((0_u16..128, 1_u16..256), 0..64),
            query_start in 0_u64..20_000,
            query_len in 0_u64..5_000,
        ) {
            let mut cursor = 0_u64;
            let blocks = shapes
                .into_iter()
                .map(|(gap, len)| {
                    cursor = cursor.saturating_add(u64::from(gap));
                    let block = SourceBlockRange {
                        start: cursor,
                        end: cursor.saturating_add(u64::from(len) - 1),
                    };
                    cursor = block.end.saturating_add(1);
                    block
                })
                .collect::<Vec<_>>();
            let query_end = query_start.saturating_add(query_len);
            let expected = if query_start >= query_end {
                Vec::new()
            } else {
                blocks
                    .iter()
                    .enumerate()
                    .filter_map(|(index, block)| {
                        (block.start < query_end && query_start < block.end_exclusive())
                            .then_some(index)
                    })
                    .collect::<Vec<_>>()
            };

            prop_assert_eq!(
                block_indices_for_span(&blocks, query_start, query_end),
                expected
            );
        }
    }

    #[tokio::test]
    async fn invocation_budget_bounds_multiple_sources_and_cancel_releases_permits() {
        let stats = Arc::new(crate::types::DeploymentStats::default());
        let budget = super::SourceByteBudget::new(64, Arc::clone(&stats), true);
        let first = pending_store_for_span(48, Arc::clone(&budget));
        let second = pending_store_for_span(48, budget);

        let first_reservation = first
            .reserve_fetch(0, SourceFetchMode::Prefetch)
            .await
            .unwrap()
            .expect("first source reservation");
        assert_eq!(stats.source_global_memory_for_test(), (64, 48, 48));
        assert_eq!(first.attempt_snapshot().global_permit_waiters, 0);

        let waiting_store = Arc::clone(&second);
        let waiting = tokio::spawn(async move {
            waiting_store
                .reserve_fetch(0, SourceFetchMode::Prefetch)
                .await
        });
        wait_for_test_condition(|| second.attempt_snapshot().global_permit_waiters == 1).await;
        assert!(!waiting.is_finished());
        assert_eq!(second.attempt_snapshot().global_permit_waiters, 1);

        first.cancel("injected first-source cancellation");
        let second_reservation = tokio::time::timeout(Duration::from_secs(1), waiting)
            .await
            .expect("second source reservation should be unblocked")
            .expect("second source reservation task")
            .expect("second source reservation")
            .expect("second source block");
        assert_eq!(stats.source_global_memory_for_test(), (64, 48, 48));
        assert_eq!(second.attempt_snapshot().global_permit_waiters, 0);

        second.cancel("test complete");
        assert_eq!(stats.source_global_memory_for_test(), (64, 0, 48));
        drop((first_reservation, second_reservation));
    }

    #[tokio::test(start_paused = true)]
    async fn replay_demand_borrows_global_capacity_when_the_local_window_is_full() {
        const BLOCK_BYTES: usize = 4 * 1024;
        let stats = Arc::new(crate::types::DeploymentStats::default());
        let budget = super::SourceByteBudget::new(BLOCK_BYTES * 2, Arc::clone(&stats), false);
        let plans = [
            plan_with_span("early.txt", 0, BLOCK_BYTES as u64),
            plan_with_span("later.txt", BLOCK_BYTES as u64, (BLOCK_BYTES * 2) as u64),
        ];
        let source = Arc::new(super::SourceClient {
            client: dummy_s3_client(),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len: (BLOCK_BYTES * 2) as u64,
            etag: None,
            diagnostics: Arc::new(SourceDiagnostics::new((BLOCK_BYTES * 2) as u64)),
        });
        let store = super::SourceBlockStore::new(
            source,
            &plans,
            SourceBlockOptions {
                block_bytes: BLOCK_BYTES,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: BLOCK_BYTES,
            },
            budget,
        );

        let later = store
            .reserve_fetch(1, SourceFetchMode::Prefetch)
            .await
            .expect("later prefetch reservation")
            .expect("later block");
        let later_block = later.block;
        std::mem::forget(later);
        store.finish_fetch(
            1,
            later_block,
            Ok(bytes::Bytes::from(vec![0_u8; BLOCK_BYTES])),
        );
        assert!(
            tokio::time::timeout(
                Duration::from_millis(1),
                store.reserve_fetch(0, SourceFetchMode::Demand),
            )
            .await
            .is_err(),
            "an ordinary demand read must still honor the local window"
        );
        {
            let mut state = store.state.lock().expect("source block state");
            state.slots[0].remaining_claims = 0;
            state.slots[0].status = SourceBlockStatus::Released;
        }
        store.add_replay_claims(0, BLOCK_BYTES as u64);

        let replay = tokio::time::timeout(
            Duration::from_secs(1),
            store.reserve_fetch(0, SourceFetchMode::Demand),
        )
        .await
        .expect("replay demand must not wait behind the local prefetch window")
        .expect("replay reservation")
        .expect("replay block");

        assert_eq!(replay.block.start, 0);
        assert_eq!(
            store
                .state
                .lock()
                .expect("source block state")
                .window_committed_bytes,
            (BLOCK_BYTES * 2) as u64
        );
        assert_eq!(
            stats.source_global_memory_for_test(),
            (
                (BLOCK_BYTES * 2) as u64,
                (BLOCK_BYTES * 2) as u64,
                (BLOCK_BYTES * 2) as u64
            )
        );

        store.cancel("test complete");
        assert_eq!(stats.source_global_memory_for_test().1, 0);
    }

    #[tokio::test]
    async fn zip_entry_reader_decompresses_and_validates_crc() {
        let zip = zip_from_entry("index.txt", b"hello zipped world");
        let plan = zip_plan_from_archive(&zip, "index.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let mut reader = zip_entry_reader(store, plan).unwrap();
        let mut output = Vec::new();

        reader.read_to_end(&mut output).await.unwrap();

        assert_eq!(output, b"hello zipped world");
    }

    #[tokio::test]
    async fn zip_entry_reader_rejects_crc_mismatch() {
        let zip = zip_from_entry("bad.txt", b"hello zipped world");
        let mut plan = zip_plan_from_archive(&zip, "bad.txt");
        plan.crc32 ^= 1;
        let store = ready_store_for_plan(&zip, &plan);
        let (sender, _receiver) = tokio::sync::mpsc::channel(1);

        let error = send_zip_entry_chunks(
            store,
            plan,
            sender,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .unwrap_err();

        assert!(error.to_string().contains("CRC32"));
    }

    #[tokio::test]
    async fn direct_stream_withholds_completion_when_authenticated_md5_mismatches() {
        let zip = zip_from_entry("tampered.txt", b"tampered source bytes");
        let mut plan = zip_plan_from_archive(&zip, "tampered.txt");
        plan.trusted_integrity = Some(TrustedEntryIntegrity {
            size: plan.size,
            md5: "00000000000000000000000000000000".to_string(),
        });
        let store = ready_store_for_plan(&zip, &plan);
        let (sender, mut receiver) = tokio::sync::mpsc::channel(1);

        let error = send_zip_entry_chunks(
            store,
            plan,
            sender,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .expect_err("trusted MD5 mismatch must fail the body");

        assert!(error.to_string().contains("authenticated catalog entry"));
        assert!(
            !error
                .to_string()
                .contains("00000000000000000000000000000000")
        );
        assert!(receiver.try_recv().is_err());
    }

    #[tokio::test]
    async fn streamed_checksum_work_is_selected_by_destination_strategy() {
        let zip = zip_from_entry("index.txt", b"hello zipped world");

        let sse_plan = zip_plan_from_archive(&zip, "index.txt");
        let sse_store = ready_store_for_plan(&zip, &sse_plan);
        let (sse_sender, _sse_receiver) = tokio::sync::mpsc::channel(2);
        let sse_state = Arc::new(UploadBodyState::default());
        send_zip_entry_chunks(
            sse_store,
            sse_plan,
            sse_sender,
            Arc::clone(&sse_state),
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .expect("SSE-S3 stream");
        assert!(sse_state.etag_md5().is_some());
        assert!(sse_state.checksum_sha256().is_none());

        let kms_plan = zip_plan_from_archive(&zip, "index.txt");
        let kms_store = ready_store_for_plan(&zip, &kms_plan);
        let (kms_sender, _kms_receiver) = tokio::sync::mpsc::channel(2);
        let kms_state = Arc::new(UploadBodyState::default());
        send_zip_entry_chunks(
            kms_store,
            kms_plan,
            kms_sender,
            Arc::clone(&kms_state),
            DestinationChecksumStrategy::KmsSha256,
        )
        .await
        .expect("KMS stream");
        assert!(kms_state.etag_md5().is_none());
        assert!(kms_state.checksum_sha256().is_some());
    }

    #[tokio::test]
    async fn marker_planning_streams_exact_length_and_rejects_crc_failure() {
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let replacements = MarkerReplacements::new(
            &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
            &MarkerConfig::default(),
        )
        .expect("marker automaton");
        let store = ready_store_for_plan(&zip, &plan);

        let result = plan_marker_zip_entry(
            store,
            plan.clone(),
            &replacements,
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .expect("marker planning pass");

        assert_eq!(
            result.output_bytes,
            b"before expanded-value after".len() as u64
        );
        assert!(result.md5.is_some());
        assert!(result.sha256.is_none());

        let mut invalid = plan;
        invalid.crc32 ^= 1;
        let invalid_store = ready_store_for_plan(&zip, &invalid);
        let error = plan_marker_zip_entry(
            invalid_store,
            invalid,
            &replacements,
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .expect_err("marker planning must preserve CRC validation");
        assert!(error.to_string().contains("CRC32"));
    }

    #[tokio::test]
    async fn marker_upload_stream_is_retryable_and_withholds_the_final_chunk_until_validation() {
        let zip = zip_from_entry("marker.txt", b"TOKEN and TOKEN");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "replacement".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        let output = b"replacement and replacement";
        let store = ready_store_for_plan_with_claims(&zip, &plan, 4);
        let body_state = Arc::new(UploadBodyState::default());
        let body_attempts = Arc::new(AtomicUsize::new(0));
        let body = marker_zip_entry_body(
            Arc::clone(&store),
            plan,
            output.len() as u64,
            Arc::clone(&body_state),
            DestinationChecksumStrategy::SseS3Etag,
            body_attempts,
            super::MarkerBodyContext {
                replacements,
                stats: Arc::new(DeploymentStats::default()),
            },
        );
        let sdk_body = body.into_inner();
        let replay = sdk_body.try_clone().expect("retryable marker body");

        let first = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
            .collect()
            .await
            .expect("first marker body")
            .into_bytes();
        let second = aws_sdk_s3::primitives::ByteStream::new(replay)
            .collect()
            .await
            .expect("replayed marker body")
            .into_bytes();

        assert_eq!(first.as_ref(), output);
        assert_eq!(second.as_ref(), output);
        assert!(body_state.etag_md5().is_some());
        let diagnostics = store.source.diagnostics.snapshot();
        assert_eq!(diagnostics.body_attempts, 2);
        assert_eq!(diagnostics.body_replays, 1);
    }

    #[tokio::test]
    async fn marker_upload_crc_failure_releases_no_final_body_frame() {
        let zip = zip_from_entry("marker.txt", b"TOKEN");
        let mut plan = zip_plan_from_archive(&zip, "marker.txt");
        plan.crc32 ^= 1;
        let store = ready_store_for_plan(&zip, &plan);
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "replacement".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        let (sender, mut receiver) = tokio::sync::mpsc::channel(2);

        let error = send_marker_zip_entry_chunks(
            store,
            plan,
            b"replacement".len() as u64,
            replacements,
            sender,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
        )
        .await
        .expect_err("CRC failure must fail the marker body");

        assert!(error.to_string().contains("CRC32"));
        assert!(receiver.try_recv().is_err());
    }

    #[tokio::test]
    async fn marker_upload_stops_when_body_receiver_is_dropped() {
        let zip = zip_from_entry("marker.txt", b"TOKEN");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let output = "x".repeat(crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES * 8);
        let store = ready_store_for_plan(&zip, &plan);
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), output.clone())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        let (sender, receiver) = tokio::sync::mpsc::channel(1);
        drop(receiver);

        let completed = tokio::time::timeout(
            Duration::from_secs(1),
            send_marker_zip_entry_chunks(
                store,
                plan,
                output.len() as u64,
                replacements,
                sender,
                Arc::new(UploadBodyState::default()),
                DestinationChecksumStrategy::SseS3Etag,
            ),
        )
        .await;

        assert!(
            completed.is_ok(),
            "marker producer hung after its body receiver was dropped"
        );
    }

    #[tokio::test]
    async fn unpolled_retryable_body_clones_create_no_source_work() {
        let zip = zip_from_entry("lazy.txt", b"lazy body");
        let plan = zip_plan_from_archive(&zip, "lazy.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let body_state = Arc::new(UploadBodyState::default());
        let body_attempts = Arc::new(AtomicUsize::new(0));
        let body = zip_entry_body(
            Arc::clone(&store),
            plan,
            9,
            body_state,
            DestinationChecksumStrategy::SseS3Etag,
            body_attempts,
        );
        let sdk_body = body.into_inner();
        let unpolled_clone = sdk_body.try_clone().expect("retryable body clone");

        let before = store.source.diagnostics.snapshot();
        assert_eq!(before.body_attempts, 0);
        assert_eq!(before.body_replays, 0);
        assert_eq!(before.replay_claims, 0);
        assert_eq!(before.active_readers_high_water, 0);
        drop(unpolled_clone);

        let bytes = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
            .collect()
            .await
            .expect("polled body")
            .into_bytes();
        assert_eq!(bytes.as_ref(), b"lazy body");
        let after = store.source.diagnostics.snapshot();
        assert_eq!(after.body_attempts, 1);
        assert_eq!(after.body_replays, 0);
        assert_eq!(after.replay_claims, 0);
        assert_eq!(after.active_readers_high_water, 1);
    }

    #[tokio::test]
    async fn unpolled_retryable_clone_does_not_overwrite_consumed_attempt_state() {
        let zip = zip_from_entry("snapshot.txt", b"snapshot body");
        let plan = zip_plan_from_archive(&zip, "snapshot.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let body_state = Arc::new(UploadBodyState::new(true));
        let body = zip_entry_body(
            Arc::clone(&store),
            plan,
            b"snapshot body".len() as u64,
            Arc::clone(&body_state),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        );
        let sdk_body = body.into_inner();
        let unpolled_clone = sdk_body.try_clone().expect("retryable body clone");

        let bytes = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
            .collect()
            .await
            .expect("consumed body")
            .into_bytes();
        assert_eq!(bytes.as_ref(), b"snapshot body");
        wait_for_test_condition(|| {
            body_state
                .attempt_snapshot()
                .is_some_and(|snapshot| snapshot.producer_completed)
        })
        .await;
        let before = body_state
            .attempt_snapshot()
            .expect("consumed attempt snapshot");

        drop(unpolled_clone);

        let after = body_state
            .attempt_snapshot()
            .expect("unpolled clone must not clear the snapshot");
        assert_eq!(after.attempt_number, before.attempt_number);
        assert_eq!(after.producer_stage, "complete");
        assert!(after.producer_completed);
        assert_eq!(after.bytes_emitted, b"snapshot body".len() as u64);
        assert_eq!(after.remaining_bytes, 0);
        assert!(after.final_frame_delivered);
        assert!(!after.receiver_dropped);
        assert!(!after.receiver_drop_aborted_producer);
        assert!(after.source_at_receiver_drop.is_none());
    }

    #[tokio::test]
    async fn abandoned_polled_upload_body_releases_claims_without_retry() {
        let zip = zip_from_entry("abandoned.txt", b"abandoned body");
        let plan = zip_plan_from_archive(&zip, "abandoned.txt");
        let block_bytes = usize::try_from(plan.source_span_end - plan.source_offset).unwrap();
        let stats = Arc::new(DeploymentStats::default());
        let budget = super::SourceByteBudget::new(block_bytes, Arc::clone(&stats), false);
        let held_capacity = budget
            .reserve_planning(block_bytes as u64)
            .await
            .expect("hold the complete source budget");
        let store = super::SourceBlockStore::new(
            Arc::new(super::SourceClient {
                client: dummy_s3_client(),
                bucket: "bucket".to_string(),
                key: "archive.zip".to_string(),
                len: zip.len() as u64,
                etag: None,
                diagnostics: Arc::new(SourceDiagnostics::new(zip.len() as u64)),
            }),
            std::slice::from_ref(&plan),
            SourceBlockOptions {
                block_bytes,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: block_bytes,
            },
            budget,
        );
        let body_state = Arc::new(UploadBodyState::default());
        let mut body = zip_entry_body(
            Arc::clone(&store),
            plan.clone(),
            plan.size,
            Arc::clone(&body_state),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        )
        .into_inner();

        let mut context = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(&mut body).poll_frame(&mut context).is_pending());
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if matches!(
                    store.state.lock().expect("source block state").slots[0].status,
                    SourceBlockStatus::Reserving
                ) {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("polled body producer should wait on global capacity");

        drop(body);

        assert!(
            body_state.attempt_snapshot().is_none(),
            "production-disabled diagnostics must not publish an attempt snapshot"
        );

        let released = tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                let released = {
                    let state = store.state.lock().expect("source block state");
                    let slot = &state.slots[0];
                    matches!(slot.status, SourceBlockStatus::Pending)
                        && slot.remaining_claims == 0
                        && slot.live_claims == 0
                        && state.window_committed_bytes == 0
                        && state.resident_bytes == 0
                };
                if released {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await;
        if released.is_err() {
            let state = store.state.lock().expect("source block state");
            let slot = &state.slots[0];
            let status = match &slot.status {
                SourceBlockStatus::Pending => "Pending",
                SourceBlockStatus::Reserving => "Reserving",
                SourceBlockStatus::Fetching => "Fetching",
                SourceBlockStatus::Ready(_) => "Ready",
                SourceBlockStatus::Released => "Released",
                SourceBlockStatus::Failed(_) => "Failed",
            };
            panic!(
                "abandoned body retained producer state: status={status}, remaining_claims={}, live_claims={}, window_committed_bytes={}, resident_bytes={}",
                slot.remaining_claims,
                slot.live_claims,
                state.window_committed_bytes,
                state.resident_bytes
            );
        }

        assert_eq!(
            stats.source_global_memory_for_test().1,
            block_bytes as u64,
            "only the deliberately held planning capacity should remain"
        );
        drop(held_capacity);
        assert_eq!(stats.source_global_memory_for_test().1, 0);
    }

    #[tokio::test]
    async fn abandoned_polled_upload_body_captures_detailed_state_before_abort() {
        let zip = zip_from_entry("abandoned-detailed.txt", b"abandoned detailed body");
        let plan = zip_plan_from_archive(&zip, "abandoned-detailed.txt");
        let block_bytes = usize::try_from(plan.source_span_end - plan.source_offset).unwrap();
        let stats = Arc::new(DeploymentStats::new(true));
        let budget = super::SourceByteBudget::new(block_bytes, Arc::clone(&stats), true);
        let held_capacity = budget
            .reserve_planning(block_bytes as u64)
            .await
            .expect("hold the complete source budget");
        let store = super::SourceBlockStore::new(
            Arc::new(super::SourceClient {
                client: dummy_s3_client(),
                bucket: "bucket".to_string(),
                key: "archive.zip".to_string(),
                len: zip.len() as u64,
                etag: None,
                diagnostics: Arc::new(SourceDiagnostics::new(zip.len() as u64)),
            }),
            std::slice::from_ref(&plan),
            SourceBlockOptions {
                block_bytes,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: block_bytes,
            },
            budget,
        );
        let body_state = Arc::new(UploadBodyState::new(true));
        let mut body = zip_entry_body(
            Arc::clone(&store),
            plan.clone(),
            plan.size,
            Arc::clone(&body_state),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        )
        .into_inner();

        let mut context = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(&mut body).poll_frame(&mut context).is_pending());
        tokio::time::timeout(Duration::from_secs(1), async {
            loop {
                if matches!(
                    store.state.lock().expect("source block state").slots[0].status,
                    SourceBlockStatus::Reserving
                ) && store.attempt_snapshot().global_permit_waiters == 1
                {
                    break;
                }
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("polled body producer should wait on global capacity");

        drop(body);

        let dropped = body_state
            .attempt_snapshot()
            .expect("dropped receiver should publish its detailed attempt");
        assert_eq!(dropped.attempt_number, 1);
        assert!(!dropped.replay);
        assert_eq!(dropped.bytes_emitted, 0);
        assert_eq!(dropped.remaining_bytes, plan.size);
        assert_eq!(dropped.producer_stage, "reading-source");
        assert!(!dropped.final_frame_delivered);
        assert!(!dropped.producer_completed);
        assert!(!dropped.body_error_observed);
        assert!(dropped.receiver_dropped);
        assert!(dropped.receiver_drop_aborted_producer);
        let source = dropped
            .source_at_receiver_drop
            .expect("source state must be captured before producer abort");
        assert_eq!(source.local_window_bytes, block_bytes as u64);
        assert_eq!(source.local_committed_bytes, block_bytes as u64);
        assert_eq!(source.local_resident_bytes, 0);
        assert_eq!(source.local_capacity_waiters, 0);
        assert_eq!(source.global_budget_bytes, block_bytes as u64);
        assert_eq!(source.global_resident_bytes, block_bytes as u64);
        assert_eq!(source.global_available_permits, 0);
        assert_eq!(source.global_permit_waiters, 1);
        assert_eq!(source.active_fetches, 0);

        wait_for_test_condition(|| {
            let state = store.state.lock().expect("source block state");
            let slot = &state.slots[0];
            matches!(slot.status, SourceBlockStatus::Pending)
                && slot.remaining_claims == 0
                && slot.live_claims == 0
                && state.window_committed_bytes == 0
                && state.resident_bytes == 0
        })
        .await;
        drop(held_capacity);
        assert_eq!(stats.source_global_memory_for_test().1, 0);
    }

    #[tokio::test]
    async fn completed_upload_body_reports_end_before_terminal_poll() {
        let expected = b"complete body";
        let zip = zip_from_entry("complete.txt", expected);
        let plan = zip_plan_from_archive(&zip, "complete.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let mut body = zip_entry_body(
            Arc::clone(&store),
            plan,
            expected.len() as u64,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        )
        .into_inner();

        assert!(!body.is_end_stream());
        assert_eq!(body.size_hint().exact(), Some(expected.len() as u64));

        let mut received = Vec::new();
        while received.len() < expected.len() {
            let frame = std::future::poll_fn(|cx| Pin::new(&mut body).poll_frame(cx))
                .await
                .expect("body frame before declared length")
                .expect("valid body frame");
            received.extend_from_slice(frame.data_ref().expect("data frame"));
        }

        assert_eq!(received, expected);
        assert!(body.is_end_stream());
        assert_eq!(body.size_hint().exact(), Some(0));

        let state = store.state.lock().expect("source block state");
        for slot in &state.slots {
            assert!(matches!(slot.status, SourceBlockStatus::Released));
            assert_eq!(slot.remaining_claims, 0);
            assert_eq!(slot.live_claims, 0);
        }
        assert_eq!(state.window_committed_bytes, 0);
        assert_eq!(state.resident_bytes, 0);
        drop(state);
        drop(body);
    }

    #[tokio::test]
    async fn empty_upload_body_completes_on_terminal_poll() {
        let zip = zip_from_entry("empty.txt", b"");
        let plan = zip_plan_from_archive(&zip, "empty.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let mut body = zip_entry_body(
            Arc::clone(&store),
            plan,
            0,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        )
        .into_inner();

        assert!(!body.is_end_stream());
        assert_eq!(body.size_hint().exact(), Some(0));
        assert!(
            std::future::poll_fn(|cx| Pin::new(&mut body).poll_frame(cx))
                .await
                .is_none()
        );
        assert!(body.is_end_stream());
        drop(body);

        let state = store.state.lock().expect("source block state");
        assert!(
            state
                .slots
                .iter()
                .all(|slot| matches!(slot.status, SourceBlockStatus::Released))
        );
    }

    #[tokio::test]
    async fn dropped_upload_body_cancels_global_capacity_wait_and_replays() {
        let zip = zip_from_entry("capacity.txt", b"capacity replay");
        let plan = zip_plan_from_archive(&zip, "capacity.txt");
        let block_bytes = usize::try_from(plan.source_span_end - plan.source_offset).unwrap();
        let response_bytes =
            zip[plan.source_offset as usize..plan.source_span_end as usize].to_vec();
        let replay = StaticReplayClient::new(vec![get_range_success_bytes(
            response_bytes,
            plan.source_offset,
            zip.len() as u64,
        )]);
        let stats = Arc::new(DeploymentStats::default());
        let budget = super::SourceByteBudget::new(block_bytes, Arc::clone(&stats), false);
        let held_capacity = budget
            .reserve_planning(block_bytes as u64)
            .await
            .expect("hold the complete source budget");
        let store = pending_replay_store(
            &zip,
            &plan,
            replay.clone(),
            Arc::clone(&budget),
            block_bytes,
        );
        let body = zip_entry_body(
            Arc::clone(&store),
            plan.clone(),
            plan.size,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        );
        let mut first = body.into_inner();
        let mut replay_body = first.try_clone().expect("retryable ZIP body");

        poll_body_once(&mut first);
        wait_for_test_condition(|| {
            matches!(
                store.state.lock().expect("source block state").slots[0].status,
                SourceBlockStatus::Reserving
            )
        })
        .await;
        drop(first);
        poll_body_once(&mut replay_body);
        wait_for_test_condition(|| {
            let state = store.state.lock().expect("source block state");
            matches!(state.slots[0].status, SourceBlockStatus::Reserving)
                && state.slots[0].remaining_claims == 1
                && !state.slots[0].replay_priority
        })
        .await;
        let diagnostics = store.source.diagnostics.snapshot();
        assert_eq!(diagnostics.body_attempts, 2);
        assert_eq!(diagnostics.body_replays, 1);
        assert_eq!(stats.source_global_memory_for_test().1, block_bytes as u64);

        drop(held_capacity);
        let bytes = tokio::time::timeout(
            Duration::from_secs(1),
            aws_sdk_s3::primitives::ByteStream::new(replay_body).collect(),
        )
        .await
        .expect("replayed body should not hang after capacity cancellation")
        .expect("replayed body after capacity cancellation")
        .into_bytes();

        assert_eq!(bytes.as_ref(), b"capacity replay");
        assert_eq!(replay.actual_requests().count(), 1);
        assert_eq!(stats.source_global_memory_for_test().1, 0);
        assert_replayed_body_released(&store);
    }

    #[tokio::test]
    async fn dropped_upload_body_cancels_ranged_get_and_replays() {
        const BLOCK_BYTES: usize = 64;
        let expected = (0..512)
            .map(|index| (index % 251) as u8)
            .collect::<Vec<_>>();
        let zip = stored_zip_from_entry("range.txt", &expected);
        let plan = zip_plan_from_archive(&zip, "range.txt");
        let blocks = plan_source_blocks(
            zip.len() as u64,
            std::slice::from_ref(&plan),
            BLOCK_BYTES,
            0,
        );
        assert!(blocks.len() > 2);
        let get_started = Arc::new(AtomicBool::new(false));
        let get_dropped = Arc::new(AtomicBool::new(false));
        let replay_get_started = Arc::new(AtomicBool::new(false));
        let replay_get_released = Arc::new(AtomicBool::new(false));
        let replay_get_waker = Arc::new(AtomicWaker::new());
        let mut events = vec![
            get_block_success_event(&zip, blocks[0]),
            get_pending_range_event(
                usize::try_from(blocks[1].len()).unwrap(),
                blocks[1].start,
                zip.len() as u64,
                Arc::clone(&get_started),
                Arc::clone(&get_dropped),
            ),
            get_gated_range_event(
                &zip,
                blocks[0],
                Arc::clone(&replay_get_started),
                Arc::clone(&replay_get_released),
                Arc::clone(&replay_get_waker),
            ),
        ];
        events.extend(
            blocks
                .iter()
                .skip(1)
                .copied()
                .map(|block| get_block_success_event(&zip, block)),
        );
        let expected_requests = events.len();
        let replay = StaticReplayClient::new(events);
        let stats = Arc::new(DeploymentStats::default());
        let budget = super::SourceByteBudget::new(BLOCK_BYTES, Arc::clone(&stats), false);
        let store = pending_replay_store(&zip, &plan, replay.clone(), budget, BLOCK_BYTES);
        let body = zip_entry_body(
            Arc::clone(&store),
            plan.clone(),
            plan.size,
            Arc::new(UploadBodyState::default()),
            DestinationChecksumStrategy::SseS3Etag,
            Arc::new(AtomicUsize::new(0)),
        );
        let mut first = body.into_inner();
        let mut replay_body = first.try_clone().expect("retryable ZIP body");

        poll_body_once(&mut first);
        wait_for_test_condition(|| {
            get_started.load(Ordering::Acquire)
                && matches!(
                    store.state.lock().expect("source block state").slots[1].status,
                    SourceBlockStatus::Fetching
                )
        })
        .await;
        assert_eq!(stats.source_global_memory_for_test().1, BLOCK_BYTES as u64);
        drop(first);
        poll_body_once(&mut replay_body);
        wait_for_test_condition(|| {
            get_dropped.load(Ordering::Acquire) && replay_get_started.load(Ordering::Acquire)
        })
        .await;
        {
            let state = store.state.lock().expect("source block state");
            assert!(matches!(state.slots[0].status, SourceBlockStatus::Fetching));
            assert_eq!(state.slots[0].remaining_claims, 1);
            assert_eq!(state.slots[0].live_claims, 0);
            for slot in &state.slots[1..] {
                assert!(matches!(slot.status, SourceBlockStatus::Pending));
                assert_eq!(slot.remaining_claims, 1);
                assert_eq!(slot.live_claims, 0);
                assert!(slot.replay_priority);
            }
        }
        replay_get_released.store(true, Ordering::Release);
        replay_get_waker.wake();

        let bytes = tokio::time::timeout(
            Duration::from_secs(1),
            aws_sdk_s3::primitives::ByteStream::new(replay_body).collect(),
        )
        .await
        .expect("replayed body should not hang after ranged GET cancellation")
        .expect("replayed body after ranged GET cancellation")
        .into_bytes();

        assert_eq!(bytes.as_ref(), expected);
        assert!(get_dropped.load(Ordering::Acquire));
        assert_eq!(replay.actual_requests().count(), expected_requests);
        assert_eq!(stats.source_global_memory_for_test().1, 0);
        assert_replayed_body_released(&store);
    }

    #[tokio::test]
    async fn ranged_get_retries_transient_failures_with_one_sdk_attempt_each() {
        let replay = StaticReplayClient::new(vec![
            get_error_event(500, "InternalError"),
            get_error_event(503, "SlowDown"),
            get_success_event(b"hello"),
        ]);
        let source = replay_source_client(replay.clone(), 5);

        let bytes = source
            .get_range(0, 4)
            .await
            .expect("third attempt succeeds");
        assert_eq!(bytes.as_ref(), b"hello");
        assert_eq!(replay.actual_requests().count(), 3);
        let diagnostics = source.diagnostics.snapshot();
        assert_eq!(diagnostics.source_get_attempts, 3);
        assert_eq!(diagnostics.source_get_retries, 2);
        assert_eq!(diagnostics.source_get_retryable_errors, 2);
        assert_eq!(diagnostics.source_get_throttled_attempts, 1);
        assert_eq!(diagnostics.source_get_errors, 0);
    }

    #[tokio::test]
    async fn ranged_get_does_not_retry_permanent_4xx() {
        let replay = StaticReplayClient::new(vec![get_error_event(400, "InvalidRequest")]);
        let source = replay_source_client(replay.clone(), 5);

        let error = source
            .get_range(0, 4)
            .await
            .expect_err("permanent request should fail");
        assert!(error.to_string().contains("GetObject"));
        assert_eq!(replay.actual_requests().count(), 1);
        let diagnostics = source.diagnostics.snapshot();
        assert_eq!(diagnostics.source_get_attempts, 1);
        assert_eq!(diagnostics.source_get_retries, 0);
        assert_eq!(diagnostics.source_get_permanent_errors, 1);
        assert_eq!(diagnostics.source_get_errors, 1);
    }

    #[tokio::test]
    async fn ranged_get_retries_incomplete_bodies() {
        let replay =
            StaticReplayClient::new(vec![get_success_event(b"hey"), get_success_event(b"hello")]);
        let source = replay_source_client(replay.clone(), 5);

        let bytes = source
            .get_range(0, 4)
            .await
            .expect("short body should be retried");
        assert_eq!(bytes.as_ref(), b"hello");
        assert_eq!(replay.actual_requests().count(), 2);
        let diagnostics = source.diagnostics.snapshot();
        assert_eq!(diagnostics.source_get_short_body_errors, 1);
        assert_eq!(diagnostics.source_get_retryable_errors, 1);
        assert_eq!(diagnostics.source_get_retries, 1);
    }

    #[test]
    fn ranged_get_classifies_timeout_and_construction_failures() {
        let timeout = range_get_request_error(aws_sdk_s3::error::SdkError::<
            aws_sdk_s3::operation::get_object::GetObjectError,
        >::timeout_error(std::io::Error::new(
            std::io::ErrorKind::TimedOut,
            "injected timeout",
        )));
        assert!(timeout.retryable);
        assert!(!timeout.throttled);

        let construction =
            range_get_request_error(aws_sdk_s3::error::SdkError::<
                aws_sdk_s3::operation::get_object::GetObjectError,
            >::construction_failure(std::io::Error::new(
                std::io::ErrorKind::InvalidInput,
                "injected construction failure",
            )));
        assert!(!construction.retryable);
        assert!(!construction.throttled);
    }

    #[tokio::test(start_paused = true)]
    async fn spawned_source_bodies_are_aborted_and_drained() {
        let zip = zip_from_entry("body.txt", b"body task");
        let plan = zip_plan_from_archive(&zip, "body.txt");
        let store = ready_store_for_plan(&zip, &plan);
        let dropped = Arc::new(AtomicBool::new(false));
        let task_dropped = Arc::clone(&dropped);
        let _ = store.spawn_body_task(async move {
            let _signal = DropSignal(task_dropped);
            pending::<()>().await;
        });
        tokio::task::yield_now().await;

        store
            .abort_and_drain_body_tasks(Instant::now() + Duration::from_secs(1))
            .await
            .expect("body task drain");

        assert!(dropped.load(Ordering::Acquire));
    }

    #[tokio::test]
    async fn scheduler_cancellation_wakes_capacity_waiters() {
        let zip = zip_from_entry("waiter.txt", b"waiter");
        let plan = zip_plan_from_archive(&zip, "waiter.txt");
        let store = ready_store_for_plan(&zip, &plan);
        {
            let mut state = store.state.lock().expect("source block state");
            state.slots[0].status = SourceBlockStatus::Pending;
            state.window_committed_bytes = store.window_bytes;
        }
        let waiter_store = Arc::clone(&store);
        let waiter = tokio::spawn(async move {
            waiter_store
                .reserve_fetch(0, SourceFetchMode::Prefetch)
                .await
        });
        tokio::task::yield_now().await;

        store.cancel("injected scheduler failure");
        let result = tokio::time::timeout(Duration::from_secs(1), waiter)
            .await
            .expect("waiter should wake")
            .expect("waiter task");
        let error = match result {
            Ok(_) => panic!("cancelled scheduler should fail the waiter"),
            Err(error) => error,
        };

        assert!(error.to_string().contains("injected scheduler failure"));
    }

    #[tokio::test]
    async fn open_entry_data_reader_rejects_short_local_header() {
        // Simulate a block boundary splitting the 30-byte local header; the
        // parser should return a clean error instead of indexing past the slice.
        let short_len: u64 = (LOCAL_FILE_HEADER_LEN as u64) - 1;
        let block = SourceBlockRange {
            start: 0,
            end: short_len - 1,
        };
        let store = Arc::new(super::SourceBlockStore {
            source: Arc::new(super::SourceClient {
                client: dummy_s3_client(),
                bucket: "bucket".to_string(),
                key: "archive.zip".to_string(),
                len: 1024,
                etag: None,
                diagnostics: Arc::new(SourceDiagnostics::new(1024)),
            }),
            blocks: vec![block],
            state: std::sync::Mutex::new(SourceBlockState {
                slots: vec![SourceBlockSlot {
                    remaining_claims: 1,
                    live_claims: 0,
                    replay_priority: false,
                    budget_permit: None,
                    status: SourceBlockStatus::Ready(bytes::Bytes::from(vec![
                        0u8;
                        short_len as usize
                    ])),
                }],
                window_committed_bytes: block.len(),
                resident_bytes: block.len(),
                failure: None,
            }),
            notify: Arc::new(tokio::sync::Notify::new()),
            capacity_notify: Arc::new(tokio::sync::Notify::new()),
            cancel_notify: Arc::new(tokio::sync::Notify::new()),
            budget: super::SourceByteBudget::new(
                usize::try_from(block.len()).unwrap(),
                Arc::new(crate::types::DeploymentStats::default()),
                false,
            ),
            source_get_concurrency: 1,
            window_bytes: block.len(),
            fetch_semaphore: Semaphore::new(1),
            body_tasks: std::sync::Mutex::new(tokio::task::JoinSet::new()),
        });
        let plan = ZipEntryPlan {
            source_index: 0,
            relative_key: "entry.txt".to_string(),
            destination_key: "entry.txt".to_string(),
            size: 1,
            compressed_size: 1,
            compression_code: 0,
            crc32: 0,
            trusted_integrity: None,
            source_offset: 0,
            source_span_end: 64,
        };

        let error = match super::open_entry_data_reader(store, plan).await {
            Ok(_) => panic!("expected short local header to be rejected"),
            Err(error) => error,
        };

        assert!(error.to_string().contains("local file header"));
    }

    #[test]
    fn source_diagnostics_splits_waits_and_replay_refetch_reasons() {
        let diagnostics = SourceDiagnostics::new(1024);
        diagnostics.record_plan(
            SourceBlockOptions {
                block_bytes: 64,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: 128,
            },
            &[SourceBlockRange { start: 0, end: 63 }],
            1,
        );
        diagnostics.record_wait_fetching();
        diagnostics.record_wait_capacity();
        diagnostics.record_replay_claim();
        diagnostics.record_replay_claim_after_release();
        diagnostics.record_replay_claim_after_failure();
        diagnostics.record_resident_bytes(64);
        diagnostics.record_resident_bytes(32);
        diagnostics.record_reader_started();
        diagnostics.record_reader_finished();

        let snapshot = diagnostics.snapshot();

        assert_eq!(snapshot.block_waits, 2);
        assert_eq!(snapshot.block_waits_fetching, 1);
        assert_eq!(snapshot.block_waits_capacity, 1);
        assert_eq!(snapshot.block_refetches, 1);
        assert_eq!(snapshot.replay_claims, 1);
        assert_eq!(snapshot.replay_claims_after_release, 1);
        assert_eq!(snapshot.replay_claims_after_failure, 1);
        assert_eq!(snapshot.resident_bytes_high_water, 64);
        assert_eq!(snapshot.active_readers_high_water, 1);
    }

    fn pending_store_for_span(
        span_bytes: usize,
        budget: Arc<super::SourceByteBudget>,
    ) -> Arc<super::SourceBlockStore> {
        let plan = plan_with_span("entry.txt", 0, span_bytes as u64);
        let source = Arc::new(super::SourceClient {
            client: dummy_s3_client(),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len: span_bytes as u64,
            etag: None,
            diagnostics: Arc::new(SourceDiagnostics::new(span_bytes as u64)),
        });
        super::SourceBlockStore::new(
            source,
            std::slice::from_ref(&plan),
            SourceBlockOptions {
                block_bytes: span_bytes,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: span_bytes,
            },
            budget,
        )
    }

    fn pending_replay_store(
        zip: &[u8],
        plan: &ZipEntryPlan,
        replay: StaticReplayClient,
        budget: Arc<super::SourceByteBudget>,
        block_bytes: usize,
    ) -> Arc<super::SourceBlockStore> {
        super::SourceBlockStore::new(
            replay_source_client(replay, zip.len() as u64),
            std::slice::from_ref(plan),
            SourceBlockOptions {
                block_bytes,
                merge_gap_bytes: 0,
                get_concurrency: 1,
                window_bytes: block_bytes,
            },
            budget,
        )
    }

    fn poll_body_once(body: &mut SdkBody) {
        let mut context = Context::from_waker(std::task::Waker::noop());
        assert!(Pin::new(body).poll_frame(&mut context).is_pending());
    }

    async fn wait_for_test_condition(mut condition: impl FnMut() -> bool) {
        tokio::time::timeout(Duration::from_secs(1), async {
            while !condition() {
                tokio::task::yield_now().await;
            }
        })
        .await
        .expect("test condition should become true");
    }

    fn assert_replayed_body_released(store: &super::SourceBlockStore) {
        let state = store.state.lock().expect("source block state");
        for slot in &state.slots {
            assert!(matches!(slot.status, SourceBlockStatus::Released));
            assert_eq!(slot.remaining_claims, 0);
            assert_eq!(slot.live_claims, 0);
        }
        assert_eq!(state.window_committed_bytes, 0);
        assert_eq!(state.resident_bytes, 0);
        let diagnostics = store.source.diagnostics.snapshot();
        assert_eq!(diagnostics.body_attempts, 2);
        assert_eq!(diagnostics.body_replays, 1);
    }

    fn ready_store_for_plan(zip: &[u8], plan: &ZipEntryPlan) -> Arc<super::SourceBlockStore> {
        ready_store_for_plan_with_claims(zip, plan, 1)
    }

    fn ready_store_for_plan_with_claims(
        zip: &[u8],
        plan: &ZipEntryPlan,
        claims: usize,
    ) -> Arc<super::SourceBlockStore> {
        let block = SourceBlockRange {
            start: plan.source_offset,
            end: plan.source_span_end - 1,
        };
        Arc::new(super::SourceBlockStore {
            source: Arc::new(super::SourceClient {
                client: dummy_s3_client(),
                bucket: "bucket".to_string(),
                key: "archive.zip".to_string(),
                len: zip.len() as u64,
                etag: None,
                diagnostics: Arc::new(SourceDiagnostics::new(zip.len() as u64)),
            }),
            blocks: vec![block],
            state: std::sync::Mutex::new(SourceBlockState {
                slots: vec![SourceBlockSlot {
                    remaining_claims: claims,
                    live_claims: 0,
                    replay_priority: false,
                    budget_permit: None,
                    status: SourceBlockStatus::Ready(bytes::Bytes::copy_from_slice(
                        &zip[block.start as usize..block.end as usize + 1],
                    )),
                }],
                window_committed_bytes: block.len(),
                resident_bytes: block.len(),
                failure: None,
            }),
            notify: Arc::new(tokio::sync::Notify::new()),
            capacity_notify: Arc::new(tokio::sync::Notify::new()),
            cancel_notify: Arc::new(tokio::sync::Notify::new()),
            budget: super::SourceByteBudget::new(
                usize::try_from(block.len()).unwrap(),
                Arc::new(crate::types::DeploymentStats::default()),
                false,
            ),
            source_get_concurrency: 1,
            window_bytes: block.len(),
            fetch_semaphore: Semaphore::new(1),
            body_tasks: std::sync::Mutex::new(tokio::task::JoinSet::new()),
        })
    }

    fn zip_plan_from_archive(bytes: &[u8], name: &str) -> ZipEntryPlan {
        let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).unwrap();
        let file = archive.by_name(name).unwrap();
        let data_start = file.data_start().unwrap();
        let compression_code = match file.compression() {
            zip::CompressionMethod::Stored => 0,
            zip::CompressionMethod::Deflated => 8,
            method => panic!("unsupported test compression method {method:?}"),
        };
        ZipEntryPlan {
            source_index: 0,
            relative_key: name.to_string(),
            destination_key: name.to_string(),
            size: file.size(),
            compressed_size: file.compressed_size(),
            compression_code,
            crc32: file.crc32(),
            trusted_integrity: None,
            source_offset: file.header_start(),
            source_span_end: data_start + file.compressed_size(),
        }
    }

    fn zip_from_entry(name: &str, bytes: &[u8]) -> Vec<u8> {
        let cursor = std::io::Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(cursor);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        writer.start_file(name, options).unwrap();
        writer.write_all(bytes).unwrap();
        writer.finish().unwrap().into_inner()
    }

    fn stored_zip_from_entry(name: &str, bytes: &[u8]) -> Vec<u8> {
        let cursor = std::io::Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(cursor);
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
        writer.start_file(name, options).unwrap();
        writer.write_all(bytes).unwrap();
        writer.finish().unwrap().into_inner()
    }

    fn plan_with_span(
        relative_key: &str,
        source_offset: u64,
        source_span_end: u64,
    ) -> ZipEntryPlan {
        ZipEntryPlan {
            source_index: 0,
            relative_key: relative_key.to_string(),
            destination_key: relative_key.to_string(),
            size: source_span_end - source_offset,
            compressed_size: source_span_end - source_offset,
            compression_code: 0,
            crc32: 0,
            trusted_integrity: None,
            source_offset,
            source_span_end,
        }
    }

    fn dummy_s3_client() -> aws_sdk_s3::Client {
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
            .build();
        aws_sdk_s3::Client::from_conf(config)
    }

    fn replay_source_client(replay: StaticReplayClient, len: u64) -> Arc<SourceClient> {
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
        Arc::new(SourceClient {
            client: aws_sdk_s3::Client::from_conf(config),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len,
            etag: None,
            diagnostics: Arc::new(SourceDiagnostics::new(len)),
        })
    }

    fn get_error_event(status: u16, code: &str) -> ReplayEvent {
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

    fn get_success_event(bytes: &'static [u8]) -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(206)
                .header("content-length", bytes.len())
                .header("content-range", format!("bytes 0-{}/5", bytes.len() - 1))
                .body(SdkBody::from(bytes))
                .unwrap(),
        )
    }

    fn get_success_bytes(bytes: Vec<u8>) -> ReplayEvent {
        let len = bytes.len();
        get_range_success_bytes(bytes, 0, len as u64)
    }

    fn get_range_success_bytes(bytes: Vec<u8>, start: u64, source_len: u64) -> ReplayEvent {
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

    fn get_block_success_event(source: &[u8], block: SourceBlockRange) -> ReplayEvent {
        get_range_success_bytes(
            source[block.start as usize..=block.end as usize].to_vec(),
            block.start,
            source.len() as u64,
        )
    }

    fn get_pending_range_event(
        len: usize,
        start: u64,
        source_len: u64,
        started: Arc<AtomicBool>,
        dropped: Arc<AtomicBool>,
    ) -> ReplayEvent {
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
                .body(SdkBody::from_body_1_x(PendingResponseBody {
                    started,
                    dropped,
                    content_length: len as u64,
                }))
                .unwrap(),
        )
    }

    fn get_gated_range_event(
        source: &[u8],
        block: SourceBlockRange,
        started: Arc<AtomicBool>,
        released: Arc<AtomicBool>,
        waker: Arc<AtomicWaker>,
    ) -> ReplayEvent {
        let bytes =
            bytes::Bytes::copy_from_slice(&source[block.start as usize..=block.end as usize]);
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(206)
                .header("content-length", bytes.len())
                .header(
                    "content-range",
                    format!("bytes {}-{}/{}", block.start, block.end, source.len()),
                )
                .body(SdkBody::from_body_1_x(GatedResponseBody {
                    started,
                    released,
                    waker,
                    bytes: Some(bytes),
                }))
                .unwrap(),
        )
    }
}
