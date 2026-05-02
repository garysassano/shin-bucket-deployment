use std::collections::VecDeque;
use std::io;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::task::{Context as TaskContext, Poll};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use bytes::Bytes;
use crc32fast::Hasher as Crc32Hasher;
use futures_util::FutureExt;
use futures_util::stream::{FuturesUnordered, StreamExt};
use http_body::{Body, Frame, SizeHint};
use tokio::io::{AsyncBufRead, AsyncRead, AsyncReadExt, AsyncSeek, ReadBuf, SeekFrom};
use tokio::sync::futures::OwnedNotified;
use tokio::sync::{Notify, Semaphore, mpsc};

use crate::types::AppState;

use super::ZIP_ENTRY_READ_CHUNK_BYTES;
use super::planner::ZipEntryPlan;

const GET_OBJECT_MAX_ATTEMPTS: usize = 3;
const LOCAL_FILE_HEADER_SIGNATURE: u32 = 0x0403_4b50;
const LOCAL_FILE_HEADER_LEN: usize = 30;
const LOCAL_GENERAL_PURPOSE_FLAG_OFFSET: usize = 6;
const LOCAL_COMPRESSION_OFFSET: usize = 8;
const LOCAL_FILE_NAME_LEN_OFFSET: usize = 26;
const LOCAL_EXTRA_FIELD_LEN_OFFSET: usize = 28;
const GENERAL_PURPOSE_ENCRYPTED: u16 = 1 << 0;
const GENERAL_PURPOSE_STRONG_ENCRYPTION: u16 = 1 << 6;

type BodyError = Box<dyn std::error::Error + Send + Sync>;

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
    source_get_errors: AtomicU64,
    fetched_source_bytes: AtomicU64,
    block_hits: AtomicU64,
    block_waits: AtomicU64,
    block_releases: AtomicU64,
    block_misses: AtomicU64,
    block_refetches: AtomicU64,
    active_gets: AtomicU64,
    active_gets_high_water: AtomicU64,
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
    pub(crate) source_get_errors: u64,
    pub(crate) fetched_source_bytes: u64,
    pub(crate) source_amplification: f64,
    pub(crate) block_hits: u64,
    pub(crate) block_waits: u64,
    pub(crate) block_releases: u64,
    pub(crate) block_misses: u64,
    pub(crate) block_refetches: u64,
    pub(crate) active_gets_high_water: u64,
}

struct ActiveSourceGetGuard {
    diagnostics: Arc<SourceDiagnostics>,
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
}

pub(crate) struct ZipEntryAsyncReader {
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    reader: Option<EntryDataReader>,
    init: Option<Pin<Box<dyn Future<Output = io::Result<EntryDataReader>> + Send>>>,
}

struct EntryDataReader {
    store: Arc<SourceBlockStore>,
    position: u64,
    end: u64,
    buffer_start: u64,
    buffer: Bytes,
    in_flight: Option<Pin<Box<dyn Future<Output = io::Result<Bytes>> + Send>>>,
    in_flight_start: u64,
    remaining_blocks: VecDeque<usize>,
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
    source_get_concurrency: usize,
    window_bytes: u64,
    fetch_semaphore: Semaphore,
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
    resident_bytes: u64,
}

struct SourceBlockSlot {
    remaining_claims: usize,
    live_claims: usize,
    status: SourceBlockStatus,
}

enum SourceBlockStatus {
    Pending,
    Fetching,
    Ready(Bytes),
    Released,
    Failed(String),
}

struct ReceiverBody {
    receiver: tokio::sync::Mutex<mpsc::Receiver<std::result::Result<Bytes, BodyError>>>,
    content_length: u64,
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

        let mut last_error = None;
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
                Err(err) if attempt < GET_OBJECT_MAX_ATTEMPTS => {
                    last_error = Some(err);
                    tokio::time::sleep(Duration::from_millis(100 * attempt as u64)).await;
                }
                Err(err) => {
                    self.diagnostics
                        .source_get_errors
                        .fetch_add(1, Ordering::Relaxed);
                    return Err(err);
                }
            }
        }

        Err(last_error.unwrap_or_else(|| io::Error::other("S3 ranged GetObject failed")))
    }

    async fn fetch_range_once(&self, start: u64, end: u64) -> io::Result<Bytes> {
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

        let output = request.send().await.map_err(|err| {
            self.diagnostics
                .source_get_request_errors
                .fetch_add(1, Ordering::Relaxed);
            io::Error::other(format!("S3 ranged GetObject failed: {err}"))
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
                io::Error::other(format!("S3 range body read failed: {err}"))
            })
            .and_then(|bytes| {
                let expected_len = usize::try_from(end - start + 1).map_err(|_| {
                    io::Error::new(io::ErrorKind::InvalidInput, "S3 range is too large")
                })?;
                if bytes.len() == expected_len {
                    Ok(bytes)
                } else {
                    self.diagnostics
                        .source_get_short_body_errors
                        .fetch_add(1, Ordering::Relaxed);
                    Err(io::Error::new(
                        io::ErrorKind::UnexpectedEof,
                        format!(
                            "S3 range bytes={start}-{end} returned {} bytes, expected {expected_len}",
                            bytes.len()
                        ),
                    ))
                }
            })
    }
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
            source_get_errors: AtomicU64::new(0),
            fetched_source_bytes: AtomicU64::new(0),
            block_hits: AtomicU64::new(0),
            block_waits: AtomicU64::new(0),
            block_releases: AtomicU64::new(0),
            block_misses: AtomicU64::new(0),
            block_refetches: AtomicU64::new(0),
            active_gets: AtomicU64::new(0),
            active_gets_high_water: AtomicU64::new(0),
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
        self.active_gets_high_water
            .fetch_max(active, Ordering::Relaxed);
        ActiveSourceGetGuard {
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
            source_get_errors: self.source_get_errors.load(Ordering::Relaxed),
            fetched_source_bytes,
            source_amplification,
            block_hits: self.block_hits.load(Ordering::Relaxed),
            block_waits: self.block_waits.load(Ordering::Relaxed),
            block_releases: self.block_releases.load(Ordering::Relaxed),
            block_misses: self.block_misses.load(Ordering::Relaxed),
            block_refetches: self.block_refetches.load(Ordering::Relaxed),
            active_gets_high_water: self.active_gets_high_water.load(Ordering::Relaxed),
        }
    }
}

impl Drop for ActiveSourceGetGuard {
    fn drop(&mut self) {
        self.diagnostics.active_gets.fetch_sub(1, Ordering::AcqRel);
    }
}

impl S3RangeReader {
    pub(crate) fn new(source: Arc<SourceClient>, chunk_size: usize) -> Self {
        Self {
            source,
            position: 0,
            chunk_size: chunk_size.max(1),
            buffer_start: 0,
            buffer: Bytes::new(),
            in_flight: None,
            in_flight_start: 0,
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

    fn start_fetch(&mut self) {
        let chunk_size = self.chunk_size.max(1) as u64;
        let start = align_down(self.position, chunk_size);
        let end = self
            .source
            .len
            .saturating_sub(1)
            .min(start.saturating_add(chunk_size - 1));
        let source = Arc::clone(&self.source);
        self.in_flight_start = start;
        self.in_flight = Some(Box::pin(async move { source.get_range(start, end).await }));
    }

    fn poll_fetch(&mut self, cx: &mut TaskContext<'_>) -> Poll<io::Result<()>> {
        if self.position >= self.source.len {
            return Poll::Ready(Ok(()));
        }

        if self.in_flight.is_none() {
            self.start_fetch();
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
                        status: SourceBlockStatus::Pending,
                    })
                    .collect(),
                resident_bytes: 0,
            }),
            blocks,
            notify: Arc::new(Notify::new()),
            capacity_notify: Arc::new(Notify::new()),
            source_get_concurrency: options.get_concurrency,
            window_bytes: options.window_bytes.max(options.block_bytes) as u64,
            fetch_semaphore: Semaphore::new(options.get_concurrency),
        })
    }

    pub(crate) fn start_scheduler(self: &Arc<Self>) -> tokio::task::JoinHandle<()> {
        let store = Arc::clone(self);
        tokio::spawn(async move {
            let mut tasks = FuturesUnordered::new();
            let mut next_index = 0_usize;

            loop {
                while tasks.len() < store.source_get_concurrency && next_index < store.blocks.len()
                {
                    let index = next_index;
                    next_index += 1;
                    let Some(block) = store.reserve_fetch(index).await else {
                        continue;
                    };
                    let store = Arc::clone(&store);
                    tasks.push(tokio::spawn(async move {
                        store.fetch_reserved_block(index, block).await;
                    }));
                }

                if tasks.next().await.is_none() {
                    break;
                }
            }
        })
    }

    async fn reserve_fetch(&self, index: usize) -> Option<SourceBlockRange> {
        self.blocks.get(index)?;
        loop {
            let wait = {
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if state.slots[index].remaining_claims == 0 {
                    return None;
                }
                match state.slots[index].status {
                    SourceBlockStatus::Pending => {}
                    SourceBlockStatus::Fetching
                    | SourceBlockStatus::Ready(_)
                    | SourceBlockStatus::Released
                    | SourceBlockStatus::Failed(_) => return None,
                }

                let block = self.blocks[index];
                let block_len = block.len();
                let target_window = self.window_bytes.max(block_len);
                if state.resident_bytes.saturating_add(block_len) <= target_window {
                    state.resident_bytes = state.resident_bytes.saturating_add(block_len);
                    state.slots[index].status = SourceBlockStatus::Fetching;
                    return Some(block);
                }

                enabled_notification(&self.capacity_notify)
            };
            wait.await;
        }
    }

    async fn fetch_reserved_block(&self, index: usize, block: SourceBlockRange) {
        let result = match self.fetch_semaphore.acquire().await {
            Ok(_permit) => self.source.get_range(block.start, block.end).await,
            Err(_) => Err(io::Error::other("source fetch semaphore is closed")),
        };
        self.finish_fetch(index, block, result);
    }

    fn finish_fetch(&self, index: usize, block: SourceBlockRange, result: io::Result<Bytes>) {
        let mut release_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
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

    fn activate_reader(&self, start: u64, end_exclusive: u64) -> io::Result<VecDeque<usize>> {
        let indices = self.block_indices_for_span(start, end_exclusive);
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        for &index in &indices {
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
        for &index in &indices {
            state.slots[index].live_claims = state.slots[index].live_claims.saturating_add(1);
        }
        Ok(indices.into())
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
        for index in indices {
            let Some(slot) = state.slots.get_mut(index) else {
                continue;
            };
            slot.remaining_claims = slot.remaining_claims.saturating_add(1);
            if matches!(
                slot.status,
                SourceBlockStatus::Released | SourceBlockStatus::Failed(_)
            ) {
                if matches!(slot.status, SourceBlockStatus::Released) {
                    self.source
                        .diagnostics
                        .block_refetches
                        .fetch_add(1, Ordering::Relaxed);
                }
                slot.status = SourceBlockStatus::Pending;
            }
        }
        self.notify.notify_waiters();
    }

    async fn slice_from(&self, position: u64, end_exclusive: u64) -> io::Result<BlockSlice> {
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
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
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
                        self.source
                            .diagnostics
                            .block_waits
                            .fetch_add(1, Ordering::Relaxed);
                        SourceBlockAction::Wait(enabled_notification(&self.notify))
                    }
                    SourceBlockStatus::Pending => {
                        if state.slots[index].remaining_claims == 0 {
                            return Err(io::Error::other(
                                "source block has no remaining planned claims",
                            ));
                        }
                        let block_len = block.len();
                        let target_window = self.window_bytes.max(block_len);
                        if state.resident_bytes.saturating_add(block_len) <= target_window {
                            self.source
                                .diagnostics
                                .block_misses
                                .fetch_add(1, Ordering::Relaxed);
                            state.resident_bytes = state.resident_bytes.saturating_add(block_len);
                            state.slots[index].status = SourceBlockStatus::Fetching;
                            SourceBlockAction::Fetch(block)
                        } else {
                            self.source
                                .diagnostics
                                .block_waits
                                .fetch_add(1, Ordering::Relaxed);
                            SourceBlockAction::WaitCapacity(enabled_notification(
                                &self.capacity_notify,
                            ))
                        }
                    }
                }
            };

            match action {
                SourceBlockAction::Fetch(block) => {
                    self.fetch_reserved_block(index, block).await;
                }
                SourceBlockAction::Wait(wait) => {
                    wait.await;
                }
                SourceBlockAction::WaitCapacity(wait) => {
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
            if slot.live_claims == 0
                && slot.remaining_claims == 0
                && matches!(slot.status, SourceBlockStatus::Ready(_))
            {
                slot.status = SourceBlockStatus::Released;
                self.source
                    .diagnostics
                    .block_releases
                    .fetch_add(1, Ordering::Relaxed);
                state.resident_bytes = state
                    .resident_bytes
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
    Fetch(SourceBlockRange),
    Wait(EnabledNotification),
    WaitCapacity(EnabledNotification),
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
    blocks
        .iter()
        .enumerate()
        .filter_map(|(index, block)| {
            (block.start < end_exclusive && start < block.end_exclusive()).then_some(index)
        })
        .collect()
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

impl ZipEntryAsyncReader {
    pub(crate) fn new(store: Arc<SourceBlockStore>, plan: ZipEntryPlan) -> Self {
        Self {
            store,
            plan,
            reader: None,
            init: None,
        }
    }
}

impl AsyncRead for ZipEntryAsyncReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.reader.is_none() {
            if self.init.is_none() {
                let store = self.store.clone();
                let plan = self.plan.clone();
                self.init = Some(Box::pin(async move {
                    open_entry_data_reader(store, plan).await
                }));
            }

            let reader = match self
                .init
                .as_mut()
                .expect("entry reader init exists")
                .poll_unpin(cx)
            {
                Poll::Pending => return Poll::Pending,
                Poll::Ready(result) => result?,
            };
            self.reader = Some(reader);
            self.init = None;
        }

        Pin::new(self.reader.as_mut().expect("entry data reader initialized")).poll_read(cx, buf)
    }
}

async fn open_entry_data_reader(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
) -> io::Result<EntryDataReader> {
    let header_end = plan
        .source_offset
        .checked_add(LOCAL_FILE_HEADER_LEN as u64)
        .ok_or_else(|| invalid_entry(&plan, "local file header offset overflowed"))?;
    if header_end > plan.source_span_end {
        return Err(invalid_entry(
            &plan,
            "local file header extends beyond the planned source span",
        ));
    }

    let header = store
        .slice_from(plan.source_offset, header_end)
        .await?
        .bytes;
    let signature = u32::from_le_bytes([header[0], header[1], header[2], header[3]]);
    if signature != LOCAL_FILE_HEADER_SIGNATURE {
        return Err(invalid_entry(
            &plan,
            format!(
                "unexpected local file header signature {signature:#x} at offset {}",
                plan.source_offset
            ),
        ));
    }

    let flags = u16::from_le_bytes([
        header[LOCAL_GENERAL_PURPOSE_FLAG_OFFSET],
        header[LOCAL_GENERAL_PURPOSE_FLAG_OFFSET + 1],
    ]);
    if flags & GENERAL_PURPOSE_ENCRYPTED != 0 || flags & GENERAL_PURPOSE_STRONG_ENCRYPTION != 0 {
        return Err(invalid_entry(
            &plan,
            "encrypted ZIP entries are not supported",
        ));
    }

    let local_compression = u16::from_le_bytes([
        header[LOCAL_COMPRESSION_OFFSET],
        header[LOCAL_COMPRESSION_OFFSET + 1],
    ]);
    if local_compression != plan.compression_code {
        return Err(invalid_entry(
            &plan,
            format!(
                "local compression method {local_compression} does not match central directory method {}",
                plan.compression_code
            ),
        ));
    }

    let file_name_len = u16::from_le_bytes([
        header[LOCAL_FILE_NAME_LEN_OFFSET],
        header[LOCAL_FILE_NAME_LEN_OFFSET + 1],
    ]) as u64;
    let extra_field_len = u16::from_le_bytes([
        header[LOCAL_EXTRA_FIELD_LEN_OFFSET],
        header[LOCAL_EXTRA_FIELD_LEN_OFFSET + 1],
    ]) as u64;
    let data_offset = plan
        .source_offset
        .checked_add(LOCAL_FILE_HEADER_LEN as u64)
        .and_then(|offset| offset.checked_add(file_name_len))
        .and_then(|offset| offset.checked_add(extra_field_len))
        .ok_or_else(|| invalid_entry(&plan, "local file data offset overflowed"))?;
    let data_end = data_offset
        .checked_add(plan.compressed_size)
        .ok_or_else(|| invalid_entry(&plan, "local file compressed data offset overflowed"))?;
    if data_end > plan.source_span_end {
        return Err(invalid_entry(
            &plan,
            "local file data extends beyond the planned source span",
        ));
    }

    EntryDataReader::new(
        store,
        plan.source_offset,
        plan.source_span_end,
        data_offset,
        data_end,
    )
}

impl EntryDataReader {
    fn new(
        store: Arc<SourceBlockStore>,
        claim_start: u64,
        claim_end: u64,
        start: u64,
        end: u64,
    ) -> io::Result<Self> {
        let remaining_blocks = store.activate_reader(claim_start, claim_end)?;
        Ok(Self {
            store,
            position: start,
            end,
            buffer_start: start,
            buffer: Bytes::new(),
            in_flight: None,
            in_flight_start: start,
            remaining_blocks,
        })
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

    fn start_fetch(&mut self) {
        let start = self.position;
        let end = self.end;
        let store = Arc::clone(&self.store);
        self.in_flight_start = start;
        self.in_flight = Some(Box::pin(async move {
            store.slice_from(start, end).await.map(|slice| slice.bytes)
        }));
    }

    fn release_finished_blocks(&mut self) {
        while let Some(index) = self.remaining_blocks.front().copied() {
            let Some(end) = self.store.block_end(index) else {
                self.remaining_blocks.pop_front();
                continue;
            };
            if end < self.position {
                self.remaining_blocks.pop_front();
                self.store.release_block_reader(index);
            } else {
                break;
            }
        }
    }

    fn poll_fetch(&mut self, cx: &mut TaskContext<'_>) -> Poll<io::Result<()>> {
        if self.position >= self.end {
            return Poll::Ready(Ok(()));
        }

        if self.in_flight.is_none() {
            self.start_fetch();
        }

        let fetched = match self
            .in_flight
            .as_mut()
            .expect("in-flight entry source fetch exists")
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
                "entry source range returned no data before EOF",
            )));
        }

        Poll::Ready(Ok(()))
    }
}

impl Drop for EntryDataReader {
    fn drop(&mut self) {
        while let Some(index) = self.remaining_blocks.pop_front() {
            self.store.release_block_reader(index);
        }
    }
}

impl AsyncRead for EntryDataReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.position >= self.end || buf.remaining() == 0 {
            self.release_finished_blocks();
            return Poll::Ready(Ok(()));
        }

        if self.available().is_none() {
            self.release_finished_blocks();
            std::task::ready!(self.poll_fetch(cx))?;
        }

        let available = self.available().unwrap_or_default();
        let remaining = usize::try_from(self.end - self.position).unwrap_or(usize::MAX);
        let len = available.len().min(remaining).min(buf.remaining());
        buf.put_slice(&available[..len]);
        self.position += len as u64;
        self.release_finished_blocks();
        Poll::Ready(Ok(()))
    }
}

pub(crate) fn zip_entry_body(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
) -> ByteStream {
    let attempts = Arc::new(AtomicUsize::new(0));
    ByteStream::new(SdkBody::retryable(move || {
        if attempts.fetch_add(1, Ordering::AcqRel) > 0 {
            store.retain_zip_entry_for_replay(&plan);
        }
        zip_entry_sdk_body(store.clone(), plan.clone(), content_length)
    }))
}

fn zip_entry_sdk_body(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
) -> SdkBody {
    let (sender, receiver) = mpsc::channel(1);
    tokio::spawn(async move {
        if let Err(error) = send_zip_entry_chunks(store, plan, sender.clone()).await {
            let _ = sender.send(Err(error)).await;
        }
    });

    SdkBody::from_body_1_x(ReceiverBody {
        receiver: tokio::sync::Mutex::new(receiver),
        content_length,
    })
}

pub(crate) fn zip_entry_reader(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
) -> io::Result<Pin<Box<dyn AsyncRead + Send>>> {
    let reader = ZipEntryAsyncReader::new(store, plan.clone());
    match plan.compression_code {
        0 => Ok(Box::pin(reader)),
        8 => Ok(Box::pin(
            async_compression::tokio::bufread::DeflateDecoder::new(tokio::io::BufReader::new(
                reader,
            )),
        )),
        _ => Err(invalid_entry(
            &plan,
            format!("unsupported compression method {}", plan.compression_code),
        )),
    }
}

async fn send_zip_entry_chunks(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    sender: mpsc::Sender<std::result::Result<Bytes, BodyError>>,
) -> std::result::Result<(), BodyError> {
    let mut reader = zip_entry_reader(store, plan.clone()).map_err(boxed_body_error)?;
    let mut crc32 = Crc32Hasher::new();
    let mut bytes = 0_u64;
    let mut buffer = vec![0_u8; ZIP_ENTRY_READ_CHUNK_BYTES];
    let mut pending = Bytes::new();

    loop {
        let bytes_read = reader.read(&mut buffer).await.map_err(boxed_body_error)?;
        if bytes_read == 0 {
            break;
        }
        let next_bytes = bytes.saturating_add(bytes_read as u64);
        validate_zip_entry_size_not_exceeded(&plan, next_bytes).map_err(boxed_body_error)?;
        crc32.update(&buffer[..bytes_read]);
        if !pending.is_empty() && sender.send(Ok(pending)).await.is_err() {
            return Ok(());
        }
        pending = Bytes::copy_from_slice(&buffer[..bytes_read]);
        bytes = next_bytes;
    }

    validate_zip_entry_output(&plan, bytes, crc32.finalize()).map_err(boxed_body_error)?;
    if !pending.is_empty() {
        if sender.send(Ok(pending)).await.is_err() {
            return Ok(());
        }
    }

    Ok(())
}

impl Body for ReceiverBody {
    type Data = Bytes;
    type Error = BodyError;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
    ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
        let receiver = self.receiver.get_mut();
        match receiver.poll_recv(cx) {
            Poll::Ready(Some(Ok(bytes))) => Poll::Ready(Some(Ok(Frame::data(bytes)))),
            Poll::Ready(Some(Err(error))) => Poll::Ready(Some(Err(error))),
            Poll::Ready(None) => Poll::Ready(None),
            Poll::Pending => Poll::Pending,
        }
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.content_length)
    }
}

fn align_down(value: u64, block_size: u64) -> u64 {
    value - (value % block_size)
}

fn invalid_entry(plan: &ZipEntryPlan, reason: impl Into<String>) -> io::Error {
    io::Error::new(
        io::ErrorKind::InvalidData,
        format!(
            "invalid ZIP entry `{}`: {}",
            plan.relative_key,
            reason.into()
        ),
    )
}

pub(crate) fn validate_zip_entry_output(
    plan: &ZipEntryPlan,
    bytes: u64,
    crc32: u32,
) -> io::Result<()> {
    validate_zip_entry_size(plan, bytes)?;
    if crc32 == plan.crc32 {
        Ok(())
    } else {
        Err(invalid_entry(
            plan,
            format!(
                "entry CRC32 {crc32:#010x} does not match central directory CRC32 {:#010x}",
                plan.crc32
            ),
        ))
    }
}

pub(crate) fn validate_zip_entry_size_not_exceeded(
    plan: &ZipEntryPlan,
    bytes: u64,
) -> io::Result<()> {
    if bytes <= plan.size {
        Ok(())
    } else {
        Err(zip_entry_size_error(plan, bytes))
    }
}

fn validate_zip_entry_size(plan: &ZipEntryPlan, bytes: u64) -> io::Result<()> {
    if bytes == plan.size {
        Ok(())
    } else {
        Err(zip_entry_size_error(plan, bytes))
    }
}

fn zip_entry_size_error(plan: &ZipEntryPlan, bytes: u64) -> io::Error {
    invalid_entry(
        plan,
        format!(
            "entry produced {bytes} bytes but central directory declared {} bytes",
            plan.size
        ),
    )
}

fn boxed_body_error(error: impl std::error::Error + Send + Sync + 'static) -> BodyError {
    Box::new(error)
}

#[cfg(test)]
mod tests {
    use std::io::Write;
    use std::sync::Arc;

    use tokio::io::AsyncReadExt;
    use tokio::sync::Semaphore;
    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{SourceDiagnostics, plan_source_blocks, send_zip_entry_chunks, zip_entry_reader};
    use crate::s3::archive::{
        SourceBlockRange, SourceBlockSlot, SourceBlockState, SourceBlockStatus,
    };
    use crate::s3::planner::ZipEntryPlan;
    use crate::s3::{DEFAULT_SOURCE_BLOCK_BYTES, DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES};

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

        let error = send_zip_entry_chunks(store, plan, sender)
            .await
            .unwrap_err();

        assert!(error.to_string().contains("CRC32"));
    }

    fn ready_store_for_plan(zip: &[u8], plan: &ZipEntryPlan) -> Arc<super::SourceBlockStore> {
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
                    remaining_claims: 1,
                    live_claims: 0,
                    status: SourceBlockStatus::Ready(bytes::Bytes::copy_from_slice(
                        &zip[block.start as usize..block.end as usize + 1],
                    )),
                }],
                resident_bytes: block.len(),
            }),
            notify: Arc::new(tokio::sync::Notify::new()),
            capacity_notify: Arc::new(tokio::sync::Notify::new()),
            source_get_concurrency: 1,
            window_bytes: block.len(),
            fetch_semaphore: Semaphore::new(1),
        })
    }

    fn zip_plan_from_archive(bytes: &[u8], name: &str) -> ZipEntryPlan {
        let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).unwrap();
        let file = archive.by_name(name).unwrap();
        let data_start = file.data_start().unwrap();
        ZipEntryPlan {
            source_index: 0,
            relative_key: name.to_string(),
            destination_key: name.to_string(),
            size: file.size(),
            compressed_size: file.compressed_size(),
            compression_code: 8,
            crc32: file.crc32(),
            catalog_md5: None,
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
            catalog_md5: None,
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
                "rust-bucket-deployment-test",
            ))
            .build();
        aws_sdk_s3::Client::from_conf(config)
    }
}
