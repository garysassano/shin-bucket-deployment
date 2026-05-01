use std::io;
use std::pin::Pin;
use std::sync::{Arc, Mutex};
use std::task::{Context as TaskContext, Poll};
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client;
use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use bytes::Bytes;
use futures_util::FutureExt;
use http_body::{Body, Frame, SizeHint};
use tokio::io::{AsyncBufRead, AsyncRead, AsyncReadExt, AsyncSeek, ReadBuf, SeekFrom};
use tokio::sync::{Notify, mpsc};

use crate::types::AppState;

use super::planner::ZipEntryPlan;
use super::{
    SOURCE_BLOCK_BYTES, SOURCE_BLOCK_MERGE_GAP_BYTES, SOURCE_WINDOW_BYTES,
    ZIP_ENTRY_READ_CHUNK_BYTES,
};

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
    notify: Notify,
    window_bytes: u64,
}

struct SourceBlockState {
    slots: Vec<SourceBlockSlot>,
    resident_bytes: u64,
}

enum SourceBlockSlot {
    Pending,
    Fetching,
    Ready(Bytes),
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
            match self.fetch_range_once(start, end).await {
                Ok(bytes) => return Ok(bytes),
                Err(err) if attempt < GET_OBJECT_MAX_ATTEMPTS => {
                    last_error = Some(err);
                    tokio::time::sleep(Duration::from_millis(100 * attempt as u64)).await;
                }
                Err(err) => return Err(err),
            }
        }

        Err(last_error.unwrap_or_else(|| io::Error::other("S3 ranged GetObject failed")))
    }

    async fn fetch_range_once(&self, start: u64, end: u64) -> io::Result<Bytes> {
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
            .send()
            .await
            .map_err(|err| io::Error::other(format!("S3 ranged GetObject failed: {err}")))?;

        output
            .body
            .collect()
            .await
            .map(|bytes| bytes.into_bytes())
            .map_err(|err| io::Error::other(format!("S3 range body read failed: {err}")))
            .and_then(|bytes| {
                let expected_len = usize::try_from(end - start + 1).map_err(|_| {
                    io::Error::new(io::ErrorKind::InvalidInput, "S3 range is too large")
                })?;
                if bytes.len() == expected_len {
                    Ok(bytes)
                } else {
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

impl S3RangeReader {
    pub(crate) fn new(source: Arc<SourceClient>) -> Self {
        Self {
            source,
            position: 0,
            chunk_size: SOURCE_BLOCK_BYTES,
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
    pub(crate) fn new(source: Arc<SourceClient>, plans: &[ZipEntryPlan]) -> Arc<Self> {
        let blocks = plan_source_blocks(source.len(), plans);
        Arc::new(Self {
            source,
            state: Mutex::new(SourceBlockState {
                slots: (0..blocks.len())
                    .map(|_| SourceBlockSlot::Pending)
                    .collect(),
                resident_bytes: 0,
            }),
            blocks,
            notify: Notify::new(),
            window_bytes: SOURCE_WINDOW_BYTES as u64,
        })
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
                match &state.slots[index] {
                    SourceBlockSlot::Ready(bytes) => {
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
                    SourceBlockSlot::Failed(message) => {
                        return Err(io::Error::other(message.clone()));
                    }
                    SourceBlockSlot::Fetching => SourceBlockAction::Wait,
                    SourceBlockSlot::Pending => {
                        let block_len = block.len();
                        if state.resident_bytes.saturating_add(block_len) > self.window_bytes {
                            self.evict_ready_blocks(&mut state, block_len);
                        }
                        if state.resident_bytes.saturating_add(block_len) <= self.window_bytes
                            || state.resident_bytes == 0
                        {
                            state.resident_bytes = state.resident_bytes.saturating_add(block_len);
                            state.slots[index] = SourceBlockSlot::Fetching;
                            SourceBlockAction::Fetch(block)
                        } else {
                            SourceBlockAction::Wait
                        }
                    }
                }
            };

            match action {
                SourceBlockAction::Fetch(block) => {
                    let result = self.source.get_range(block.start, block.end).await;
                    let mut state = self
                        .state
                        .lock()
                        .expect("source block state mutex should not be poisoned");
                    match result {
                        Ok(bytes) => {
                            state.slots[index] = SourceBlockSlot::Ready(bytes);
                        }
                        Err(error) => {
                            state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                            state.slots[index] = SourceBlockSlot::Failed(error.to_string());
                        }
                    }
                    self.notify.notify_waiters();
                }
                SourceBlockAction::Wait => {
                    self.notify.notified().await;
                }
            }
        }
    }

    fn evict_ready_blocks(&self, state: &mut SourceBlockState, incoming_bytes: u64) {
        for (index, slot) in state.slots.iter_mut().enumerate() {
            if state.resident_bytes.saturating_add(incoming_bytes) <= self.window_bytes {
                break;
            }
            if matches!(slot, SourceBlockSlot::Ready(_)) {
                state.resident_bytes = state
                    .resident_bytes
                    .saturating_sub(self.blocks[index].len());
                *slot = SourceBlockSlot::Pending;
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
}

enum SourceBlockAction {
    Fetch(SourceBlockRange),
    Wait,
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

fn plan_source_blocks(source_len: u64, plans: &[ZipEntryPlan]) -> Vec<SourceBlockRange> {
    if source_len == 0 {
        return Vec::new();
    }

    let block_size = SOURCE_BLOCK_BYTES as u64;
    let merge_gap = SOURCE_BLOCK_MERGE_GAP_BYTES as u64;
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

    Ok(EntryDataReader::new(store, data_offset, data_end))
}

impl EntryDataReader {
    fn new(store: Arc<SourceBlockStore>, start: u64, end: u64) -> Self {
        Self {
            store,
            position: start,
            end,
            buffer_start: start,
            buffer: Bytes::new(),
            in_flight: None,
            in_flight_start: start,
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
        let start = self.position;
        let end = self.end;
        let store = Arc::clone(&self.store);
        self.in_flight_start = start;
        self.in_flight = Some(Box::pin(async move {
            store.slice_from(start, end).await.map(|slice| slice.bytes)
        }));
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

impl AsyncRead for EntryDataReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
        buf: &mut ReadBuf<'_>,
    ) -> Poll<io::Result<()>> {
        if self.position >= self.end || buf.remaining() == 0 {
            return Poll::Ready(Ok(()));
        }

        if self.available().is_none() {
            std::task::ready!(self.poll_fetch(cx))?;
        }

        let available = self.available().unwrap_or_default();
        let remaining = usize::try_from(self.end - self.position).unwrap_or(usize::MAX);
        let len = available.len().min(remaining).min(buf.remaining());
        buf.put_slice(&available[..len]);
        self.position += len as u64;
        Poll::Ready(Ok(()))
    }
}

pub(crate) fn zip_entry_body(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    content_length: u64,
) -> ByteStream {
    ByteStream::new(SdkBody::retryable(move || {
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

async fn send_zip_entry_chunks(
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    sender: mpsc::Sender<std::result::Result<Bytes, BodyError>>,
) -> std::result::Result<(), BodyError> {
    let reader = ZipEntryAsyncReader::new(store, plan.clone());
    let mut reader = match plan.compression_code {
        0 => Box::pin(reader) as Pin<Box<dyn AsyncRead + Send>>,
        8 => Box::pin(async_compression::tokio::bufread::DeflateDecoder::new(
            tokio::io::BufReader::new(reader),
        )) as Pin<Box<dyn AsyncRead + Send>>,
        _ => {
            return Err(Box::new(invalid_entry(
                &plan,
                format!("unsupported compression method {}", plan.compression_code),
            )));
        }
    };
    let mut buffer = vec![0_u8; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer).await.map_err(boxed_body_error)?;
        if bytes_read == 0 {
            break;
        }
        if sender
            .send(Ok(Bytes::copy_from_slice(&buffer[..bytes_read])))
            .await
            .is_err()
        {
            break;
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

fn boxed_body_error(error: impl std::error::Error + Send + Sync + 'static) -> BodyError {
    Box::new(error)
}
