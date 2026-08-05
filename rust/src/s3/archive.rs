use std::io;
use std::sync::Arc;
use std::sync::atomic::Ordering;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use aws_sdk_s3::operation::get_object::GetObjectError;
use bytes::Bytes;

use crate::types::AppState;

pub(super) mod block_store;
pub(super) mod budget;
pub(crate) mod diagnostics;
pub(super) mod directory;
pub(super) mod entry;
mod range_reader;

use diagnostics::{SourceDiagnostics, SourceDiagnosticsSnapshot};

const GET_OBJECT_MAX_ATTEMPTS: usize = 3;
/// Source GET retry bounds, mirroring the destination-write policy in `transfer.rs`:
/// a capped exponential ceiling per attempt, with full jitter applied underneath it so
/// concurrent readers that hit the same SlowDown do not retry in lockstep. Throttled
/// responses back off harder than transient transport errors.
const SOURCE_GET_RETRY_BASE_DELAY_MS: u64 = 100;
const SOURCE_GET_RETRY_MAX_DELAY_MS: u64 = 400;
const SOURCE_GET_THROTTLE_RETRY_BASE_DELAY_MS: u64 = 250;
const SOURCE_GET_THROTTLE_RETRY_MAX_DELAY_MS: u64 = 2_000;

#[derive(Clone, Debug)]
pub(crate) struct SourceClient {
    client: Client,
    bucket: String,
    key: String,
    len: u64,
    etag: String,
    diagnostics: Arc<SourceDiagnostics>,
}

#[derive(Debug)]
pub(crate) struct SourceHead {
    len: u64,
    etag: String,
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

    // Every ranged GET sends this as `If-Match`. Without it a mid-deployment overwrite
    // of the source would surface as confusing CRC failures instead of a clean 412, so
    // refuse to plan against a source we cannot pin.
    let etag = output
        .e_tag()
        .map(ToOwned::to_owned)
        .ok_or_else(|| anyhow!("source archive s3://{bucket}/{key} is missing an ETag"))?;

    Ok(SourceHead { len, etag })
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
        // Build the range header once: every retry attempt issues the same range GET,
        // so formatting a fresh String per attempt is pure waste.
        let range_header = format!("bytes={start}-{end}");

        for attempt in 1..=GET_OBJECT_MAX_ATTEMPTS {
            self.diagnostics
                .source_get_attempts
                .fetch_add(1, Ordering::Relaxed);
            if attempt > 1 {
                self.diagnostics
                    .source_get_retries
                    .fetch_add(1, Ordering::Relaxed);
            }
            match self.fetch_range_once(start, end, &range_header).await {
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
                    tokio::time::sleep(source_get_retry_delay(
                        attempt,
                        error.throttled,
                        fastrand::u64(..),
                    ))
                    .await;
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
        range_header: &str,
    ) -> std::result::Result<Bytes, RangeGetError> {
        let _active_get = self.diagnostics.track_active_get();
        let request = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(&self.key)
            .range(range_header)
            .if_match(&self.etag);

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

        validate_content_range(output.content_range(), start, end, self.len).map_err(|source| {
            RangeGetError {
                source,
                retryable: true,
                throttled: false,
            }
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

fn validate_content_range(value: Option<&str>, start: u64, end: u64, total: u64) -> io::Result<()> {
    let Some(value) = value else {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("S3 range bytes={start}-{end} response is missing Content-Range"),
        ));
    };
    let parsed = value
        .strip_prefix("bytes ")
        .and_then(|value| value.split_once('/'))
        .and_then(|(range, total)| {
            let (start, end) = range.split_once('-')?;
            Some((
                start.parse::<u64>().ok()?,
                end.parse::<u64>().ok()?,
                total.parse::<u64>().ok()?,
            ))
        });
    if parsed == Some((start, end, total)) {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("S3 range bytes={start}-{end} response has a mismatched Content-Range"),
        ))
    }
}

fn range_get_request_error(error: SdkError<GetObjectError>) -> RangeGetError {
    let (retryable, throttled) = match &error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            let throttled = service
                .err()
                .code()
                .is_some_and(crate::util::is_throttle_error_code);
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

/// Ceiling for a source GET retry: `base * 2^(attempt - 1)`, clamped to the maximum
/// for the error class. Saturating throughout so a large attempt count cannot wrap.
fn source_get_retry_cap_millis(attempt: usize, throttled: bool) -> u64 {
    let (base, max) = if throttled {
        (
            SOURCE_GET_THROTTLE_RETRY_BASE_DELAY_MS,
            SOURCE_GET_THROTTLE_RETRY_MAX_DELAY_MS,
        )
    } else {
        (
            SOURCE_GET_RETRY_BASE_DELAY_MS,
            SOURCE_GET_RETRY_MAX_DELAY_MS,
        )
    };
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    base.saturating_mul(multiplier).min(max)
}

/// Full jitter: sample uniformly from `0..=cap` so concurrent readers spread out
/// instead of retrying together. `jitter` is supplied by the caller so the delay
/// computation stays a pure function and can be tested without timing races.
fn source_get_retry_delay(attempt: usize, throttled: bool, jitter: u64) -> Duration {
    let cap_millis = source_get_retry_cap_millis(attempt, throttled);
    if cap_millis == 0 {
        return Duration::ZERO;
    }
    Duration::from_millis(jitter % cap_millis.saturating_add(1))
}

#[cfg(test)]
mod tests;
