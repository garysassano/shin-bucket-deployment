use std::collections::VecDeque;
use std::io;
use std::panic::AssertUnwindSafe;
use std::pin::Pin;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex, OnceLock};
use std::task::{Context as TaskContext, Poll};

use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use bytes::Bytes;
use crc32fast::Hasher as Crc32Hasher;
use futures_util::FutureExt;
use http_body::{Body, Frame, SizeHint};
use md5::{Digest as Md5Digest, Md5};
use sha2::Sha256;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, ReadBuf};
use tokio::sync::mpsc;
use tokio::task::AbortHandle;

use crate::replace::{MarkerReplacements, ReplacementOptions, ReplacementResult};
use crate::types::{DeploymentStats, DestinationChecksumStrategy};

use super::super::planner::ZipEntryPlan;
use super::super::{
    S3_SINGLE_PUT_LIMIT, ZIP_ENTRY_BODY_CHUNK_BYTES, ZIP_ENTRY_BODY_PIPE_CHUNKS,
    ZIP_ENTRY_READ_CHUNK_BYTES,
};
use super::{EntryAttemptClaim, SourceAttemptSnapshot, SourceBlockStore};

const LOCAL_FILE_HEADER_SIGNATURE: u32 = 0x0403_4b50;
pub(super) const LOCAL_FILE_HEADER_LEN: usize = 30;
const LOCAL_GENERAL_PURPOSE_FLAG_OFFSET: usize = 6;
const LOCAL_COMPRESSION_OFFSET: usize = 8;
const LOCAL_FILE_NAME_LEN_OFFSET: usize = 26;
const LOCAL_EXTRA_FIELD_LEN_OFFSET: usize = 28;
const GENERAL_PURPOSE_ENCRYPTED: u16 = 1 << 0;
const GENERAL_PURPOSE_STRONG_ENCRYPTION: u16 = 1 << 6;

type BodyError = Box<dyn std::error::Error + Send + Sync>;

#[derive(Debug, Default)]
pub(crate) struct UploadBodyState {
    etag_md5: OnceLock<String>,
    checksum_sha256: OnceLock<String>,
    validation_error: OnceLock<String>,
    detailed_attempt: Option<Box<UploadBodyAttemptState>>,
}

#[derive(Debug, Default)]
struct UploadBodyAttemptState {
    attempt_state: AtomicU64,
    attempt_snapshot: Mutex<Option<UploadBodyAttemptSnapshot>>,
}

#[derive(Clone, Debug)]
pub(crate) struct UploadBodyAttemptSnapshot {
    pub(crate) attempt_number: u64,
    pub(crate) replay: bool,
    pub(crate) bytes_emitted: u64,
    pub(crate) remaining_bytes: u64,
    pub(crate) final_frame_delivered: bool,
    pub(crate) producer_completed: bool,
    pub(crate) producer_stage: &'static str,
    pub(crate) body_error_observed: bool,
    pub(crate) receiver_dropped: bool,
    pub(crate) receiver_drop_aborted_producer: bool,
    pub(crate) source_at_receiver_drop: Option<SourceAttemptSnapshot>,
}

#[derive(Clone, Copy, Debug, Default, Eq, PartialEq)]
#[repr(u8)]
enum UploadProducerStage {
    #[default]
    AwaitingFirstPoll,
    ReadingSource,
    FinalFrameReady,
    Complete,
    ReceiverClosed,
    BodyError,
}

const UPLOAD_PRODUCER_STAGE_BITS: u32 = 3;
const UPLOAD_PRODUCER_STAGE_MASK: u64 = (1 << UPLOAD_PRODUCER_STAGE_BITS) - 1;
const MAX_UPLOAD_ATTEMPT_NUMBER: u64 = u64::MAX >> UPLOAD_PRODUCER_STAGE_BITS;

impl UploadBodyState {
    pub(crate) fn new(detailed_failure_diagnostics: bool) -> Self {
        Self {
            detailed_attempt: detailed_failure_diagnostics
                .then(|| Box::new(UploadBodyAttemptState::default())),
            ..Self::default()
        }
    }

    pub(crate) fn detailed_failure_diagnostics_enabled(&self) -> bool {
        self.detailed_attempt.is_some()
    }

    pub(crate) fn etag_md5(&self) -> Option<&str> {
        self.etag_md5.get().map(String::as_str)
    }

    pub(crate) fn checksum_sha256(&self) -> Option<&str> {
        self.checksum_sha256.get().map(String::as_str)
    }

    pub(crate) fn validation_error(&self) -> Option<&str> {
        self.validation_error.get().map(String::as_str)
    }

    pub(crate) fn record_etag_md5(&self, etag: String) {
        let _ = self.etag_md5.set(etag);
    }

    pub(crate) fn record_checksum_sha256(&self, checksum: String) {
        let _ = self.checksum_sha256.set(checksum);
    }

    fn record_validation_error(&self, error: &str) {
        let _ = self.validation_error.set(error.to_string());
    }

    fn begin_attempt(&self, attempt_number: u64) {
        let Some(detailed) = &self.detailed_attempt else {
            return;
        };
        detailed.attempt_state.store(
            UploadProducerStage::ReadingSource.encode(attempt_number),
            Ordering::Release,
        );
    }

    pub(crate) fn reset_attempt_diagnostics(&self) {
        if let Some(detailed) = &self.detailed_attempt {
            detailed.attempt_state.store(0, Ordering::Release);
        }
    }

    fn record_producer_stage(&self, attempt_number: Option<u64>, stage: UploadProducerStage) {
        let Some(attempt_number) = attempt_number else {
            return;
        };
        let Some(detailed) = &self.detailed_attempt else {
            return;
        };
        let mut current = detailed.attempt_state.load(Ordering::Acquire);
        loop {
            if UploadProducerStage::decode(current).0 != attempt_number {
                return;
            }
            match detailed.attempt_state.compare_exchange_weak(
                current,
                stage.encode(attempt_number),
                Ordering::AcqRel,
                Ordering::Acquire,
            ) {
                Ok(_) => return,
                Err(updated) => current = updated,
            }
        }
    }

    fn publish_attempt(&self, mut snapshot: UploadBodyAttemptSnapshot) {
        let Some(detailed) = &self.detailed_attempt else {
            return;
        };
        let mut published = detailed
            .attempt_snapshot
            .lock()
            .expect("upload body snapshot mutex should not be poisoned");
        let (attempt_number, producer_stage) =
            UploadProducerStage::decode(detailed.attempt_state.load(Ordering::Acquire));
        if attempt_number != snapshot.attempt_number {
            return;
        }
        snapshot.apply_producer_stage(producer_stage);
        *published = Some(snapshot);
    }

    pub(crate) fn attempt_snapshot(&self) -> Option<UploadBodyAttemptSnapshot> {
        let detailed = self.detailed_attempt.as_ref()?;
        let published = detailed
            .attempt_snapshot
            .lock()
            .expect("upload body snapshot mutex should not be poisoned");
        let mut snapshot = published.clone()?;
        let (attempt_number, producer_stage) =
            UploadProducerStage::decode(detailed.attempt_state.load(Ordering::Acquire));
        if attempt_number != snapshot.attempt_number {
            return None;
        }
        snapshot.apply_producer_stage(producer_stage);
        Some(snapshot)
    }
}

impl UploadProducerStage {
    fn encode(self, attempt_number: u64) -> u64 {
        (attempt_number.min(MAX_UPLOAD_ATTEMPT_NUMBER) << UPLOAD_PRODUCER_STAGE_BITS) | self as u64
    }

    fn decode(state: u64) -> (u64, Self) {
        let stage = match state & UPLOAD_PRODUCER_STAGE_MASK {
            0 => Self::AwaitingFirstPoll,
            1 => Self::ReadingSource,
            2 => Self::FinalFrameReady,
            3 => Self::Complete,
            4 => Self::ReceiverClosed,
            5 => Self::BodyError,
            _ => unreachable!("invalid upload producer stage"),
        };
        (state >> UPLOAD_PRODUCER_STAGE_BITS, stage)
    }

    fn name(self) -> &'static str {
        match self {
            Self::AwaitingFirstPoll => "awaiting-first-poll",
            Self::ReadingSource => "reading-source",
            Self::FinalFrameReady => "final-frame-ready",
            Self::Complete => "complete",
            Self::ReceiverClosed => "receiver-closed",
            Self::BodyError => "body-error",
        }
    }
}

impl UploadBodyAttemptSnapshot {
    fn apply_producer_stage(&mut self, producer_stage: UploadProducerStage) {
        self.producer_stage = producer_stage.name();
        self.producer_completed = producer_stage == UploadProducerStage::Complete;
        self.body_error_observed |= producer_stage == UploadProducerStage::BodyError;
    }
}

pub(crate) struct ZipEntryAsyncReader {
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: Option<EntryAttemptClaim>,
    reader: Option<EntryDataReader>,
    init: Option<Pin<Box<dyn Future<Output = io::Result<EntryDataReader>> + Send>>>,
}

pub(super) struct EntryDataReader {
    store: Arc<SourceBlockStore>,
    position: u64,
    end: u64,
    buffer_start: u64,
    buffer: Bytes,
    in_flight: Option<Pin<Box<dyn Future<Output = io::Result<Bytes>> + Send>>>,
    in_flight_start: u64,
    remaining_blocks: VecDeque<usize>,
}

struct ReceiverBody {
    init: Option<ReceiverBodyInit>,
    receiver: Option<mpsc::Receiver<std::result::Result<BodyFrame, BodyError>>>,
    producer: Option<AbortHandle>,
    remaining_bytes: u64,
    complete: bool,
    diagnostics: Option<Box<ReceiverBodyDiagnostics>>,
}

struct ReceiverBodyDiagnostics {
    store: Arc<SourceBlockStore>,
    body_state: Arc<UploadBodyState>,
    attempt_number: Option<u64>,
    replay: bool,
    declared_bytes: u64,
    final_frame_delivered: bool,
    body_error_observed: bool,
    snapshot_published: bool,
}

pub(super) enum BodyFrame {
    Data(Bytes),
    Final(Bytes),
    Complete,
}

struct ReceiverBodyInit {
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempts: Arc<AtomicUsize>,
    marker: Option<MarkerBodyContext>,
}

#[derive(Clone)]
pub(crate) struct MarkerBodyContext {
    pub(crate) replacements: Arc<MarkerReplacements>,
    pub(crate) stats: Arc<DeploymentStats>,
}

struct ZipEntryInputValidator<'a> {
    plan: &'a ZipEntryPlan,
    bytes: u64,
    crc32: Crc32Hasher,
    md5: Option<Md5>,
}

impl ZipEntryAsyncReader {
    pub(crate) fn new(store: Arc<SourceBlockStore>, plan: ZipEntryPlan) -> Self {
        Self {
            store,
            plan,
            attempt_claim: None,
            reader: None,
            init: None,
        }
    }

    fn with_attempt_claim(
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        attempt_claim: EntryAttemptClaim,
    ) -> Self {
        Self {
            store,
            plan,
            attempt_claim: Some(attempt_claim),
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
                let attempt_claim = self.attempt_claim.take();
                self.init = Some(Box::pin(async move {
                    match attempt_claim {
                        Some(attempt_claim) => {
                            open_entry_data_reader_with_claim(store, plan, attempt_claim).await
                        }
                        None => open_entry_data_reader(store, plan).await,
                    }
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

pub(super) async fn open_entry_data_reader(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
) -> io::Result<EntryDataReader> {
    let attempt_claim = store.claim_zip_entry_attempt(&plan);
    open_entry_data_reader_with_claim(store, plan, attempt_claim).await
}

async fn open_entry_data_reader_with_claim(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: EntryAttemptClaim,
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
    // `slice_from` is block-local. The span check above proves the ZIP contains
    // 30 logical header bytes, but a small block size or unlucky boundary can
    // still make this slice short. Guard the fixed-index reads below so that
    // degrades to a clean error instead of a panic.
    if header.len() < LOCAL_FILE_HEADER_LEN {
        return Err(invalid_entry(
            &plan,
            "local file header was not fully readable from a single source block",
        ));
    }
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

    EntryDataReader::new(store, attempt_claim, data_offset, data_end)
}

impl EntryDataReader {
    fn new(
        store: Arc<SourceBlockStore>,
        attempt_claim: EntryAttemptClaim,
        start: u64,
        end: u64,
    ) -> io::Result<Self> {
        let remaining_blocks = attempt_claim.activate()?;
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

    fn clear_consumed_buffer(&mut self) {
        let buffer_end = self.buffer_start.saturating_add(self.buffer.len() as u64);
        if self.position >= buffer_end {
            self.buffer = Bytes::new();
            self.buffer_start = self.position;
        }
    }

    #[cfg(test)]
    pub(super) fn buffered_source_bytes_for_test(&self) -> usize {
        self.buffer.len()
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
        // Reader-owned block views must disappear before releasing their permits.
        self.buffer = Bytes::new();
        self.in_flight = None;
        while let Some(index) = self.remaining_blocks.pop_front() {
            self.store.release_block_reader(index);
        }
        self.store.source.diagnostics.record_reader_finished();
    }
}

impl AsyncRead for EntryDataReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.position >= self.end || buf.remaining() == 0 {
            self.clear_consumed_buffer();
            self.release_finished_blocks();
            return Poll::Ready(Ok(()));
        }

        if self.available().is_none() {
            self.clear_consumed_buffer();
            self.release_finished_blocks();
            std::task::ready!(self.poll_fetch(cx))?;
        }

        let available = self.available().unwrap_or_default();
        let remaining = usize::try_from(self.end - self.position).unwrap_or(usize::MAX);
        let len = available.len().min(remaining).min(buf.remaining());
        buf.put_slice(&available[..len]);
        self.position += len as u64;
        self.clear_consumed_buffer();
        self.release_finished_blocks();
        Poll::Ready(Ok(()))
    }
}

pub(crate) fn zip_entry_body(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempts: Arc<AtomicUsize>,
) -> ByteStream {
    zip_entry_body_inner(
        store,
        plan,
        content_length,
        body_state,
        checksum_strategy,
        attempts,
        None,
    )
}

pub(crate) fn marker_zip_entry_body(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempts: Arc<AtomicUsize>,
    marker: MarkerBodyContext,
) -> ByteStream {
    zip_entry_body_inner(
        store,
        plan,
        content_length,
        body_state,
        checksum_strategy,
        attempts,
        Some(marker),
    )
}

fn zip_entry_body_inner(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempts: Arc<AtomicUsize>,
    marker: Option<MarkerBodyContext>,
) -> ByteStream {
    ByteStream::new(SdkBody::retryable(move || {
        zip_entry_sdk_body(
            ReceiverBodyInit {
                store: store.clone(),
                plan: plan.clone(),
                body_state: Arc::clone(&body_state),
                checksum_strategy,
                attempts: Arc::clone(&attempts),
                marker: marker.clone(),
            },
            content_length,
        )
    }))
}

fn zip_entry_sdk_body(init: ReceiverBodyInit, content_length: u64) -> SdkBody {
    let diagnostics = init
        .body_state
        .detailed_failure_diagnostics_enabled()
        .then(|| {
            Box::new(ReceiverBodyDiagnostics {
                store: Arc::clone(&init.store),
                body_state: Arc::clone(&init.body_state),
                attempt_number: None,
                replay: false,
                declared_bytes: content_length,
                final_frame_delivered: false,
                body_error_observed: false,
                snapshot_published: false,
            })
        });
    SdkBody::from_body_1_x(ReceiverBody {
        init: Some(init),
        receiver: None,
        producer: None,
        remaining_bytes: content_length,
        complete: false,
        diagnostics,
    })
}

pub(crate) async fn plan_marker_zip_entry(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    marker_replacements: &MarkerReplacements,
    checksum_strategy: DestinationChecksumStrategy,
) -> io::Result<ReplacementResult> {
    let mut output = tokio::io::sink();
    replace_marker_zip_entry(
        store,
        plan,
        None,
        marker_replacements,
        &mut output,
        checksum_strategy == DestinationChecksumStrategy::SseS3Etag,
        false,
    )
    .await
}

async fn replace_marker_zip_entry<W: AsyncWrite + Unpin>(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: Option<EntryAttemptClaim>,
    marker_replacements: &MarkerReplacements,
    output: &mut W,
    hash_md5: bool,
    hash_sha256: bool,
) -> io::Result<ReplacementResult> {
    let mut reader = zip_entry_reader_inner(store, plan.clone(), attempt_claim)?;
    let mut validator = ZipEntryInputValidator::new(&plan);
    let result = marker_replacements
        .replace_stream(
            &mut reader,
            output,
            ReplacementOptions {
                max_output_bytes: S3_SINGLE_PUT_LIMIT,
                hash_md5,
                hash_sha256,
            },
            |bytes| validator.observe(bytes),
        )
        .await?;
    validator.finish()?;
    Ok(result)
}

pub(crate) fn zip_entry_reader(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
) -> io::Result<Pin<Box<dyn AsyncRead + Send>>> {
    zip_entry_reader_inner(store, plan, None)
}

fn zip_entry_reader_inner(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: Option<EntryAttemptClaim>,
) -> io::Result<Pin<Box<dyn AsyncRead + Send>>> {
    let reader = match attempt_claim {
        Some(attempt_claim) => {
            ZipEntryAsyncReader::with_attempt_claim(store, plan.clone(), attempt_claim)
        }
        None => ZipEntryAsyncReader::new(store, plan.clone()),
    };
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

#[cfg(test)]
pub(super) async fn send_zip_entry_chunks(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    sender: mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
) -> std::result::Result<(), BodyError> {
    send_zip_entry_chunks_inner(
        store,
        plan,
        None,
        sender,
        body_state,
        checksum_strategy,
        None,
    )
    .await
}

async fn send_zip_entry_chunks_inner(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: Option<EntryAttemptClaim>,
    sender: mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempt_number: Option<u64>,
) -> std::result::Result<(), BodyError> {
    let mut reader =
        zip_entry_reader_inner(store, plan.clone(), attempt_claim).map_err(boxed_body_error)?;
    let mut md5 = (checksum_strategy == DestinationChecksumStrategy::SseS3Etag
        || plan.trusted_integrity.is_some())
    .then(Md5::new);
    let mut sha256 =
        (checksum_strategy == DestinationChecksumStrategy::KmsSha256).then(Sha256::new);
    let mut crc32 = Crc32Hasher::new();
    let mut bytes = 0_u64;
    let mut buffer = vec![0_u8; ZIP_ENTRY_READ_CHUNK_BYTES];
    let mut body_chunk = Vec::with_capacity(ZIP_ENTRY_BODY_CHUNK_BYTES);
    let mut pending = Vec::with_capacity(ZIP_ENTRY_READ_CHUNK_BYTES);

    loop {
        let bytes_read = reader.read(&mut buffer).await.map_err(boxed_body_error)?;
        if bytes_read == 0 {
            break;
        }
        if !pending.is_empty()
            && !append_and_send_body_chunks(&mut body_chunk, &pending, &sender).await?
        {
            body_state.record_producer_stage(attempt_number, UploadProducerStage::ReceiverClosed);
            return Ok(());
        }
        let next_bytes = bytes.saturating_add(bytes_read as u64);
        validate_zip_entry_size_not_exceeded(&plan, next_bytes).map_err(boxed_body_error)?;
        if let Some(md5) = md5.as_mut() {
            md5.update(&buffer[..bytes_read]);
        }
        if let Some(sha256) = sha256.as_mut() {
            sha256.update(&buffer[..bytes_read]);
        }
        crc32.update(&buffer[..bytes_read]);
        pending.clear();
        pending.extend_from_slice(&buffer[..bytes_read]);
        bytes = next_bytes;
    }

    validate_zip_entry_output(&plan, bytes, crc32.finalize()).map_err(boxed_body_error)?;
    if let Some(md5) = md5 {
        let etag_md5 = finalize_md5(md5);
        plan.validate_trusted_md5(&etag_md5)
            .map_err(boxed_body_error)?;
        if checksum_strategy == DestinationChecksumStrategy::SseS3Etag {
            body_state.record_etag_md5(etag_md5);
        }
    }
    if let Some(sha256) = sha256 {
        body_state.record_checksum_sha256(BASE64_STANDARD.encode(sha256.finalize()));
    }

    // The final frame is also the producer-completion handshake. Release the
    // source reader and all of its entry claims before making that frame
    // visible so a fixed-length HTTP consumer can safely stop polling after it.
    drop(reader);
    body_state.record_producer_stage(attempt_number, UploadProducerStage::FinalFrameReady);
    send_final_body_chunks(&mut body_chunk, &pending, &sender).await?;
    body_state.record_producer_stage(attempt_number, UploadProducerStage::Complete);

    Ok(())
}

#[cfg(test)]
pub(super) async fn send_marker_zip_entry_chunks(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
    marker_replacements: Arc<MarkerReplacements>,
    sender: mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
) -> std::result::Result<(), BodyError> {
    send_marker_zip_entry_chunks_inner(
        store,
        plan,
        None,
        content_length,
        marker_replacements,
        sender,
        body_state,
        checksum_strategy,
        None,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn send_marker_zip_entry_chunks_inner(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    attempt_claim: Option<EntryAttemptClaim>,
    content_length: u64,
    marker_replacements: Arc<MarkerReplacements>,
    sender: mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
    body_state: Arc<UploadBodyState>,
    checksum_strategy: DestinationChecksumStrategy,
    attempt_number: Option<u64>,
) -> std::result::Result<(), BodyError> {
    let pipe_capacity = ZIP_ENTRY_BODY_CHUNK_BYTES
        .checked_mul(2)
        .unwrap_or(ZIP_ENTRY_BODY_CHUNK_BYTES);
    let (mut output_reader, mut output_writer) = tokio::io::duplex(pipe_capacity);
    let producer = async move {
        let result = replace_marker_zip_entry(
            store,
            plan.clone(),
            attempt_claim,
            &marker_replacements,
            &mut output_writer,
            checksum_strategy == DestinationChecksumStrategy::SseS3Etag,
            checksum_strategy == DestinationChecksumStrategy::KmsSha256,
        )
        .await
        .map_err(boxed_body_error)?;
        if result.output_bytes != content_length {
            return Err(boxed_body_error(invalid_entry(
                &plan,
                format!(
                    "marker output changed between planning and upload passes: expected {content_length} bytes, produced {} bytes",
                    result.output_bytes
                ),
            )));
        }
        drop(output_writer);
        Ok(result)
    };
    let consumer = forward_replaced_body_chunks(&mut output_reader, &sender);
    let (result, final_chunk) = tokio::try_join!(producer, consumer)?;

    if let Some(md5) = result.md5 {
        if let Some(expected) = body_state.etag_md5()
            && expected != md5
        {
            return Err(boxed_body_error(io::Error::new(
                io::ErrorKind::InvalidData,
                "marker output digest changed between planning and upload passes",
            )));
        }
        body_state.record_etag_md5(md5);
    }
    if let Some(sha256) = result.sha256 {
        body_state.record_checksum_sha256(sha256);
    }
    body_state.record_producer_stage(attempt_number, UploadProducerStage::FinalFrameReady);
    match final_chunk {
        Some(final_chunk) => {
            let _ = sender.send(Ok(BodyFrame::Final(final_chunk))).await;
        }
        None => {
            let _ = sender.send(Ok(BodyFrame::Complete)).await;
        }
    }
    body_state.record_producer_stage(attempt_number, UploadProducerStage::Complete);
    Ok(())
}

async fn forward_replaced_body_chunks(
    reader: &mut tokio::io::DuplexStream,
    sender: &mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
) -> std::result::Result<Option<Bytes>, BodyError> {
    // Keep one complete frame back so source CRC/size/catalog validation and
    // planning-pass identity checks can fail before S3 receives a complete body.
    let mut read_buffer = vec![0_u8; ZIP_ENTRY_READ_CHUNK_BYTES];
    let mut frame = Vec::with_capacity(ZIP_ENTRY_BODY_CHUNK_BYTES);
    let mut held_frame = None;

    loop {
        let read = reader
            .read(&mut read_buffer)
            .await
            .map_err(boxed_body_error)?;
        if read == 0 {
            break;
        }
        let mut remaining = &read_buffer[..read];
        while !remaining.is_empty() {
            let available = ZIP_ENTRY_BODY_CHUNK_BYTES - frame.len();
            let take = available.min(remaining.len());
            frame.extend_from_slice(&remaining[..take]);
            remaining = &remaining[take..];
            if frame.len() == ZIP_ENTRY_BODY_CHUNK_BYTES {
                let next = Bytes::copy_from_slice(&frame);
                frame.clear();
                if let Some(previous) = held_frame.replace(next)
                    && sender.send(Ok(BodyFrame::Data(previous))).await.is_err()
                {
                    // Fail this side of try_join so a producer blocked on the
                    // replacement pipe is cancelled when its body is dropped.
                    return Err(boxed_body_error(io::Error::new(
                        io::ErrorKind::BrokenPipe,
                        "marker body receiver closed",
                    )));
                }
            }
        }
    }

    if !frame.is_empty() {
        let next = Bytes::copy_from_slice(&frame);
        if let Some(previous) = held_frame.replace(next)
            && sender.send(Ok(BodyFrame::Data(previous))).await.is_err()
        {
            return Err(boxed_body_error(io::Error::new(
                io::ErrorKind::BrokenPipe,
                "marker body receiver closed",
            )));
        }
    }
    Ok(held_frame)
}

impl ZipEntryInputValidator<'_> {
    fn new(plan: &ZipEntryPlan) -> ZipEntryInputValidator<'_> {
        ZipEntryInputValidator {
            plan,
            bytes: 0,
            crc32: Crc32Hasher::new(),
            md5: plan.trusted_integrity.is_some().then(Md5::new),
        }
    }

    fn observe(&mut self, bytes: &[u8]) -> io::Result<()> {
        let added = u64::try_from(bytes.len())
            .map_err(|_| invalid_entry(self.plan, "entry size cannot be represented safely"))?;
        let next = self
            .bytes
            .checked_add(added)
            .ok_or_else(|| invalid_entry(self.plan, "entry size arithmetic overflowed"))?;
        validate_zip_entry_size_not_exceeded(self.plan, next)?;
        self.crc32.update(bytes);
        if let Some(md5) = self.md5.as_mut() {
            md5.update(bytes);
        }
        self.bytes = next;
        Ok(())
    }

    fn finish(self) -> io::Result<()> {
        validate_zip_entry_output(self.plan, self.bytes, self.crc32.finalize())?;
        if let Some(md5) = self.md5 {
            self.plan.validate_trusted_md5(&finalize_md5(md5))?;
        }
        Ok(())
    }
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

async fn append_and_send_body_chunks(
    body_chunk: &mut Vec<u8>,
    bytes: &[u8],
    sender: &mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
) -> std::result::Result<bool, BodyError> {
    let mut remaining = bytes;
    while !remaining.is_empty() {
        let available = ZIP_ENTRY_BODY_CHUNK_BYTES - body_chunk.len();
        let take = available.min(remaining.len());
        body_chunk.extend_from_slice(&remaining[..take]);
        remaining = &remaining[take..];

        if body_chunk.len() == ZIP_ENTRY_BODY_CHUNK_BYTES {
            if sender
                .send(Ok(BodyFrame::Data(Bytes::copy_from_slice(
                    body_chunk.as_slice(),
                ))))
                .await
                .is_err()
            {
                return Ok(false);
            }
            body_chunk.clear();
        }
    }

    Ok(true)
}

async fn send_final_body_chunks(
    body_chunk: &mut Vec<u8>,
    bytes: &[u8],
    sender: &mpsc::Sender<std::result::Result<BodyFrame, BodyError>>,
) -> std::result::Result<(), BodyError> {
    let mut remaining = bytes;
    while !remaining.is_empty() {
        let available = ZIP_ENTRY_BODY_CHUNK_BYTES - body_chunk.len();
        let take = available.min(remaining.len());
        body_chunk.extend_from_slice(&remaining[..take]);
        remaining = &remaining[take..];

        if body_chunk.len() == ZIP_ENTRY_BODY_CHUNK_BYTES {
            let bytes = Bytes::copy_from_slice(body_chunk.as_slice());
            body_chunk.clear();
            let frame = if remaining.is_empty() {
                BodyFrame::Final(bytes)
            } else {
                BodyFrame::Data(bytes)
            };
            if sender.send(Ok(frame)).await.is_err() {
                return Ok(());
            }
        }
    }

    if !body_chunk.is_empty() {
        let bytes = Bytes::copy_from_slice(body_chunk.as_slice());
        body_chunk.clear();
        let _ = sender.send(Ok(BodyFrame::Final(bytes))).await;
    } else if bytes.is_empty() {
        let _ = sender.send(Ok(BodyFrame::Complete)).await;
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
        if self.complete {
            return Poll::Ready(None);
        }

        if let Some(init) = self.init.take() {
            let prior_attempts = init.attempts.fetch_add(1, Ordering::AcqRel);
            let replay = prior_attempts > 0;
            let attempt_number = self.diagnostics.as_mut().map(|diagnostics| {
                let attempt_number = u64::try_from(prior_attempts)
                    .unwrap_or(MAX_UPLOAD_ATTEMPT_NUMBER)
                    .saturating_add(1)
                    .min(MAX_UPLOAD_ATTEMPT_NUMBER);
                diagnostics.body_state.begin_attempt(attempt_number);
                diagnostics.attempt_number = Some(attempt_number);
                diagnostics.replay = replay;
                attempt_number
            });
            init.store.source.diagnostics.record_body_started(replay);
            if replay {
                init.store.retain_zip_entry_for_replay(&init.plan);
            }
            if let Some(marker) = &init.marker {
                marker.stats.add_marker_upload_pass();
            }

            let attempt_claim = init.store.claim_zip_entry_attempt(&init.plan);
            let (sender, receiver) = mpsc::channel(ZIP_ENTRY_BODY_PIPE_CHUNKS);
            let body_store = Arc::clone(&init.store);
            let content_length = self.remaining_bytes;
            self.producer = Some(init.store.spawn_body_task(async move {
                let outcome = if let Some(marker) = init.marker {
                    AssertUnwindSafe(send_marker_zip_entry_chunks_inner(
                        body_store,
                        init.plan,
                        Some(attempt_claim),
                        content_length,
                        marker.replacements,
                        sender.clone(),
                        Arc::clone(&init.body_state),
                        init.checksum_strategy,
                        attempt_number,
                    ))
                    .catch_unwind()
                    .await
                } else {
                    AssertUnwindSafe(send_zip_entry_chunks_inner(
                        body_store,
                        init.plan,
                        Some(attempt_claim),
                        sender.clone(),
                        Arc::clone(&init.body_state),
                        init.checksum_strategy,
                        attempt_number,
                    ))
                    .catch_unwind()
                    .await
                };
                let error = match outcome {
                    Ok(Ok(())) => return,
                    Ok(Err(error)) => error,
                    Err(_) => boxed_body_error(io::Error::other("source body task panicked")),
                };
                {
                    init.body_state
                        .record_producer_stage(attempt_number, UploadProducerStage::BodyError);
                    if error
                        .downcast_ref::<io::Error>()
                        .is_some_and(|error| error.kind() == io::ErrorKind::InvalidData)
                    {
                        init.body_state.record_validation_error(&error.to_string());
                    }
                    let _ = sender.send(Err(error)).await;
                }
            }));
            self.receiver = Some(receiver);
        }

        let frame = self
            .receiver
            .as_mut()
            .expect("source body receiver starts on first poll")
            .poll_recv(cx);
        match frame {
            Poll::Ready(Some(Ok(BodyFrame::Data(bytes)))) => {
                let frame_bytes = u64::try_from(bytes.len()).unwrap_or(u64::MAX);
                if frame_bytes >= self.remaining_bytes {
                    self.record_body_error();
                    self.publish_attempt(false, false, None);
                    return Poll::Ready(Some(Err(boxed_body_error(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "source body reached its declared content length without producer completion",
                    )))));
                }
                self.remaining_bytes -= frame_bytes;
                Poll::Ready(Some(Ok(Frame::data(bytes))))
            }
            Poll::Ready(Some(Ok(BodyFrame::Final(bytes)))) => {
                let frame_bytes = u64::try_from(bytes.len()).unwrap_or(u64::MAX);
                if frame_bytes != self.remaining_bytes || frame_bytes == 0 {
                    self.record_body_error();
                    self.publish_attempt(false, false, None);
                    return Poll::Ready(Some(Err(boxed_body_error(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "source body final frame did not match its declared content length",
                    )))));
                }
                self.remaining_bytes = 0;
                if let Some(diagnostics) = self.diagnostics.as_mut() {
                    diagnostics.final_frame_delivered = true;
                }
                self.receiver.take();
                self.producer.take();
                self.complete = true;
                self.publish_attempt(false, false, None);
                Poll::Ready(Some(Ok(Frame::data(bytes))))
            }
            Poll::Ready(Some(Ok(BodyFrame::Complete))) => {
                self.receiver.take();
                self.producer.take();
                self.complete = true;
                if self.remaining_bytes == 0 {
                    self.publish_attempt(false, false, None);
                    Poll::Ready(None)
                } else {
                    self.record_body_error();
                    self.publish_attempt(false, false, None);
                    Poll::Ready(Some(Err(boxed_body_error(io::Error::new(
                        io::ErrorKind::UnexpectedEof,
                        "source body completed before its declared content length",
                    )))))
                }
            }
            Poll::Ready(Some(Err(error))) => {
                self.record_body_error();
                self.publish_attempt(false, false, None);
                Poll::Ready(Some(Err(error)))
            }
            Poll::Ready(None) => {
                self.producer.take();
                self.complete = true;
                self.record_body_error();
                self.publish_attempt(false, false, None);
                Poll::Ready(Some(Err(boxed_body_error(io::Error::new(
                    io::ErrorKind::UnexpectedEof,
                    "source body ended without producer completion",
                )))))
            }
            Poll::Pending => Poll::Pending,
        }
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.remaining_bytes)
    }

    fn is_end_stream(&self) -> bool {
        self.complete
    }
}

impl Drop for ReceiverBody {
    fn drop(&mut self) {
        let producer = self.producer.take();
        let aborted_producer = producer
            .as_ref()
            .is_some_and(|producer| !producer.is_finished());
        if !self.complete
            && self
                .diagnostics
                .as_ref()
                .is_some_and(|diagnostics| diagnostics.attempt_number.is_some())
        {
            // Capture source state while the receiver and producer are still live.
            let source = self
                .diagnostics
                .as_ref()
                .expect("observed attempt has receiver diagnostics")
                .store
                .attempt_snapshot();
            self.publish_attempt(true, aborted_producer, Some(source));
        }
        self.receiver.take();
        if let Some(producer) = producer {
            producer.abort();
        }
    }
}

impl ReceiverBody {
    fn record_body_error(&mut self) {
        if let Some(diagnostics) = self.diagnostics.as_mut() {
            diagnostics.body_error_observed = true;
        }
    }

    fn publish_attempt(
        &mut self,
        receiver_dropped: bool,
        receiver_drop_aborted_producer: bool,
        source_at_receiver_drop: Option<SourceAttemptSnapshot>,
    ) {
        let Some(diagnostics) = self.diagnostics.as_mut() else {
            return;
        };
        let Some(attempt_number) = diagnostics.attempt_number else {
            return;
        };
        if diagnostics.snapshot_published && !receiver_dropped {
            return;
        }
        diagnostics
            .body_state
            .publish_attempt(UploadBodyAttemptSnapshot {
                attempt_number,
                replay: diagnostics.replay,
                bytes_emitted: diagnostics
                    .declared_bytes
                    .saturating_sub(self.remaining_bytes),
                remaining_bytes: self.remaining_bytes,
                final_frame_delivered: diagnostics.final_frame_delivered,
                producer_completed: false,
                producer_stage: UploadProducerStage::AwaitingFirstPoll.name(),
                body_error_observed: diagnostics.body_error_observed,
                receiver_dropped,
                receiver_drop_aborted_producer,
                source_at_receiver_drop,
            });
        diagnostics.snapshot_published = true;
    }
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
