use std::collections::BTreeMap;
use std::io;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};

use bytes::Bytes;
use futures_util::FutureExt;
use tokio::io::{AsyncBufRead, AsyncRead, AsyncSeek, ReadBuf, SeekFrom};

use super::SourceClient;

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

impl S3RangeReader {
    pub(super) fn with_preloaded(
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

    fn poll_fetch(&mut self, cx: &mut Context<'_>) -> Poll<io::Result<()>> {
        if self.position >= self.source.len {
            return Poll::Ready(Ok(()));
        }

        if self.in_flight.is_none() && self.start_fetch() {
            return Poll::Ready(Ok(()));
        }

        let Some(in_flight) = self.in_flight.as_mut() else {
            return Poll::Ready(Err(io::Error::other(
                "source range reader entered an invalid fetch state",
            )));
        };
        let fetched = match in_flight.poll_unpin(cx) {
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

impl AsyncRead for S3RangeReader {
    fn poll_read(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
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
    fn poll_fill_buf(self: Pin<&mut Self>, cx: &mut Context<'_>) -> Poll<io::Result<&[u8]>> {
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

    fn poll_complete(self: Pin<&mut Self>, _cx: &mut Context<'_>) -> Poll<io::Result<u64>> {
        Poll::Ready(Ok(self.position))
    }
}

pub(super) fn align_down(value: u64, block_size: u64) -> u64 {
    value - (value % block_size)
}
