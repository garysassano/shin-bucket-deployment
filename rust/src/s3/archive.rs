use std::error::Error as StdError;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::task::{Context as TaskContext, Poll};

use anyhow::{Context, Result};
use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use bytes::Bytes;
use http_body::{Body, Frame, SizeHint};
use tokio::io::AsyncWriteExt;
use uuid::Uuid;
use zip::ZipArchive;

use crate::types::AppState;

use super::ZIP_ENTRY_READ_CHUNK_BYTES;

type BodyError = Box<dyn StdError + Send + Sync>;

pub(super) async fn download_source_zip(
    state: &AppState,
    bucket: &str,
    key: &str,
) -> Result<PathBuf> {
    tracing::info!(bucket, key, "downloading source archive");

    let response = state
        .s3
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to download s3://{bucket}/{key}"))?;

    let archive_path = temporary_archive_path();
    let mut archive_file = tokio::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&archive_path)
        .await
        .with_context(|| {
            format!(
                "failed to create temporary source archive {}",
                archive_path.display()
            )
        })?;
    let mut body = response.body.into_async_read();

    if let Err(error) = tokio::io::copy(&mut body, &mut archive_file).await {
        let _ = tokio::fs::remove_file(&archive_path).await;
        return Err(error).context("failed to write source archive body to temporary file");
    }
    archive_file
        .flush()
        .await
        .context("failed to flush temporary source archive")?;

    Ok(archive_path)
}

pub(super) fn open_zip_archive(path: &Path) -> Result<ZipArchive<File>> {
    let archive_file = File::open(path)
        .with_context(|| format!("failed to open temporary source archive {}", path.display()))?;
    ZipArchive::new(archive_file).context("failed to open zip archive")
}

pub(super) fn zip_entry_body(
    archive_path: Arc<PathBuf>,
    entry_index: usize,
    content_length: u64,
) -> ByteStream {
    ByteStream::new(SdkBody::retryable(move || {
        zip_entry_sdk_body(archive_path.clone(), entry_index, content_length)
    }))
}

fn temporary_archive_path() -> PathBuf {
    let mut path = std::env::temp_dir();
    path.push(format!(
        "rust-bucket-deployment-source-{}.zip",
        Uuid::new_v4()
    ));
    path
}

fn zip_entry_sdk_body(
    archive_path: Arc<PathBuf>,
    entry_index: usize,
    content_length: u64,
) -> SdkBody {
    let (sender, receiver) = tokio::sync::mpsc::channel(1);

    tokio::task::spawn_blocking(move || {
        if let Err(error) = send_zip_entry_chunks(archive_path, entry_index, sender.clone()) {
            let _ = sender.blocking_send(Err(error));
        }
    });

    SdkBody::from_body_1_x(ReceiverBody {
        receiver: Mutex::new(receiver),
        content_length,
    })
}

fn send_zip_entry_chunks(
    archive_path: Arc<PathBuf>,
    entry_index: usize,
    sender: tokio::sync::mpsc::Sender<std::result::Result<Bytes, BodyError>>,
) -> std::result::Result<(), BodyError> {
    let archive_file = File::open(archive_path.as_ref()).map_err(boxed_body_error)?;
    let mut zip = ZipArchive::new(archive_file).map_err(boxed_body_error)?;
    let mut entry = zip.by_index(entry_index).map_err(boxed_body_error)?;

    loop {
        let mut chunk = Vec::with_capacity(ZIP_ENTRY_READ_CHUNK_BYTES);
        let bytes_read = entry
            .by_ref()
            .take(ZIP_ENTRY_READ_CHUNK_BYTES as u64)
            .read_to_end(&mut chunk)
            .map_err(boxed_body_error)?;

        if bytes_read == 0 {
            break;
        }

        if sender.blocking_send(Ok(Bytes::from(chunk))).is_err() {
            break;
        }
    }

    Ok(())
}

fn boxed_body_error(error: impl StdError + Send + Sync + 'static) -> BodyError {
    Box::new(error)
}

struct ReceiverBody {
    receiver: Mutex<tokio::sync::mpsc::Receiver<std::result::Result<Bytes, BodyError>>>,
    content_length: u64,
}

impl Body for ReceiverBody {
    type Data = Bytes;
    type Error = BodyError;

    fn poll_frame(
        self: std::pin::Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
    ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
        let mut receiver = self
            .receiver
            .lock()
            .expect("receiver body mutex should not be poisoned");

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

#[cfg(test)]
mod tests {
    use std::fs::File;
    use std::io::Write;
    use std::sync::Arc;

    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::zip_entry_body;

    #[tokio::test]
    async fn zip_entry_body_streams_entry_and_reports_exact_size() {
        let archive_path = Arc::new(write_test_zip(&[("index.html", b"hello world" as &[u8])]));

        let body = zip_entry_body(archive_path.clone(), 0, 11);

        assert_eq!(body.size_hint(), (11, Some(11)));
        assert_eq!(body.collect().await.unwrap().into_bytes(), "hello world");

        std::fs::remove_file(archive_path.as_ref()).unwrap();
    }

    #[tokio::test]
    async fn zip_entry_body_can_be_rebuilt_from_archive_path() {
        let archive_path = Arc::new(write_test_zip(&[("asset.txt", b"retryable body" as &[u8])]));

        let first = zip_entry_body(archive_path.clone(), 0, 14)
            .collect()
            .await
            .unwrap()
            .into_bytes();
        let second = zip_entry_body(archive_path.clone(), 0, 14)
            .collect()
            .await
            .unwrap()
            .into_bytes();

        assert_eq!(first, "retryable body");
        assert_eq!(second, "retryable body");

        std::fs::remove_file(archive_path.as_ref()).unwrap();
    }

    fn write_test_zip(entries: &[(&str, &[u8])]) -> std::path::PathBuf {
        let mut path = std::env::temp_dir();
        path.push(format!(
            "rust-bucket-deployment-test-{}.zip",
            uuid::Uuid::new_v4()
        ));

        let file = File::create(&path).unwrap();
        let mut writer = ZipWriter::new(file);
        let options = SimpleFileOptions::default();

        for (name, bytes) in entries {
            writer.start_file(name, options).unwrap();
            writer.write_all(bytes).unwrap();
        }
        writer.finish().unwrap();

        path
    }
}
