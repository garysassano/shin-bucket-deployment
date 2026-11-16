use std::io;
use std::sync::Arc;

use anyhow::{Context, Result};
use aws_sdk_s3::Client;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::{ProvideErrorMetadata, SdkError};
use aws_sdk_s3::operation::get_object::GetObjectError;
use bytes::Bytes;

use crate::state::AppState;

use super::retry::{
    capped_exponential_backoff_millis, full_jitter_delay, is_retryable_http_status,
};

pub(super) mod block_store;
pub(super) mod budget;
pub(crate) mod diagnostics;
pub(super) mod directory;
pub(super) mod entry;
mod range_reader;

#[cfg(feature = "bench-internals")]
#[allow(dead_code)] // used only by the dev library's transfer benchmark
pub(crate) mod bench;

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

/// The archive's final bytes, read together with its length and `ETag` in one ranged GET.
/// The end-of-central-directory records live there, so ZIP planning starts from these
/// bytes instead of fetching them again.
#[derive(Debug)]
pub(crate) struct SourceTail {
    pub(crate) start: u64,
    pub(crate) bytes: Bytes,
}

pub(crate) struct PreparedSource {
    pub(crate) source: Arc<SourceClient>,
    pub(crate) tail: SourceTail,
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

impl RangeGetError {
    fn permanent(source: io::Error) -> Self {
        Self {
            source,
            retryable: false,
            throttled: false,
        }
    }
}

/// Reads the source archive's length, `ETag`, and its final `tail_bytes` bytes with one
/// suffix-range GET.
///
/// A `HeadObject` followed by a GET of the same tail was two sequential round trips per
/// source; the ranged GET's `Content-Range` already carries the object length, and its
/// `ETag` is the same identity every later ranged GET pins with `If-Match`.
pub(crate) async fn prepare_source_zip(
    state: &AppState,
    bucket: &str,
    key: &str,
    tail_bytes: usize,
) -> Result<PreparedSource> {
    tracing::info!(bucket, key, "reading source archive metadata");
    let client = state.source_s3.clone();
    let mut attempts = 0_u64;
    let (head, tail) = loop {
        attempts += 1;
        match fetch_source_tail_once(&client, bucket, key, tail_bytes).await {
            Ok(fetched) => break fetched,
            Err(error) if error.retryable && attempts < GET_OBJECT_MAX_ATTEMPTS as u64 => {
                tokio::time::sleep(source_get_retry_delay(
                    usize::try_from(attempts).unwrap_or(usize::MAX),
                    error.throttled,
                    fastrand::u64(..),
                ))
                .await;
            }
            Err(error) => {
                return Err(anyhow::Error::from(error.source)).with_context(|| {
                    format!(
                        "failed to read source archive metadata s3://{bucket}/{key}; source buckets must be in the provider's AWS Region"
                    )
                });
            }
        }
    };

    let diagnostics = Arc::new(SourceDiagnostics::new(head.len));
    diagnostics.source_get_attempts.record(attempts);
    diagnostics.source_get_retries.record(attempts - 1);
    Ok(PreparedSource {
        source: Arc::new(SourceClient {
            client,
            bucket: bucket.to_string(),
            key: key.to_string(),
            len: head.len,
            etag: head.etag,
            diagnostics,
        }),
        tail,
    })
}

async fn fetch_source_tail_once(
    client: &Client,
    bucket: &str,
    key: &str,
    tail_bytes: usize,
) -> std::result::Result<(SourceHead, SourceTail), RangeGetError> {
    let output = client
        .get_object()
        .bucket(bucket)
        .key(key)
        .range(format!("bytes=-{}", tail_bytes.max(1)))
        .customize()
        .config_override(aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()))
        .send()
        .await;
    let output = match output {
        Ok(output) => output,
        // S3 cannot satisfy any byte range of an empty object.
        Err(error)
            if error
                .as_service_error()
                .and_then(ProvideErrorMetadata::code)
                == Some("InvalidRange") =>
        {
            return Err(RangeGetError::permanent(io::Error::new(
                io::ErrorKind::InvalidData,
                "source ZIP is too short to contain an end-of-central-directory record",
            )));
        }
        Err(error) => return Err(range_get_request_error(error)),
    };

    // Every later ranged GET sends this as `If-Match`. Without it a mid-deployment
    // overwrite of the source would surface as confusing CRC failures instead of a clean
    // 412, so refuse to plan against a source we cannot pin.
    let etag = output.e_tag().map(ToOwned::to_owned).ok_or_else(|| {
        RangeGetError::permanent(io::Error::new(
            io::ErrorKind::InvalidData,
            "source archive is missing an ETag",
        ))
    })?;
    let (start, len) = match output.content_range() {
        Some(content_range) => {
            parse_suffix_content_range(content_range).map_err(RangeGetError::permanent)?
        }
        // A range covering the whole object may be answered with a plain 200.
        None => {
            let len = output
                .content_length()
                .and_then(|len| u64::try_from(len).ok())
                .ok_or_else(|| {
                    RangeGetError::permanent(io::Error::new(
                        io::ErrorKind::InvalidData,
                        "source archive metadata is missing a valid content length",
                    ))
                })?;
            (0, len)
        }
    };
    let bytes = output
        .body
        .collect()
        .await
        .map(|bytes| bytes.into_bytes())
        .map_err(|error| RangeGetError {
            source: io::Error::other(format!("S3 range body read failed: {error}")),
            retryable: true,
            throttled: false,
        })?;
    if u64::try_from(bytes.len()).ok() != Some(len - start) {
        return Err(RangeGetError {
            source: io::Error::new(
                io::ErrorKind::UnexpectedEof,
                format!(
                    "S3 suffix range returned {} bytes, expected {}",
                    bytes.len(),
                    len - start
                ),
            ),
            retryable: true,
            throttled: false,
        });
    }

    Ok((SourceHead { len, etag }, SourceTail { start, bytes }))
}

/// Parses the `Content-Range` of a suffix-range response, which must end at the last
/// byte of the object, into `(start, object_length)`.
fn parse_suffix_content_range(value: &str) -> io::Result<(u64, u64)> {
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
    match parsed {
        Some((start, end, total)) if start <= end && end.checked_add(1) == Some(total) => {
            Ok((start, total))
        }
        _ => Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "S3 suffix range response has a mismatched Content-Range",
        )),
    }
}

impl SourceClient {
    pub(crate) fn len(&self) -> u64 {
        self.len
    }

    pub(crate) fn diagnostics(&self) -> SourceDiagnosticsSnapshot {
        self.diagnostics.snapshot()
    }

    async fn get_range(&self, start: u64, end_inclusive: u64) -> io::Result<Bytes> {
        if end_inclusive < start {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!("invalid S3 range: start {start} is greater than end {end_inclusive}"),
            ));
        }
        if start >= self.len || end_inclusive >= self.len {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "S3 range bytes={start}-{end_inclusive} is outside source object length {}",
                    self.len
                ),
            ));
        }
        // Build the range header once: every retry attempt issues the same range GET,
        // so formatting a fresh String per attempt is pure waste.
        let range_header = format!("bytes={start}-{end_inclusive}");

        for attempt in 1..=GET_OBJECT_MAX_ATTEMPTS {
            self.diagnostics.source_get_attempts.record(1);
            if attempt > 1 {
                self.diagnostics.source_get_retries.record(1);
            }
            match self
                .fetch_range_once(start, end_inclusive, &range_header)
                .await
            {
                Ok(bytes) => return Ok(bytes),
                Err(error) if error.retryable && attempt < GET_OBJECT_MAX_ATTEMPTS => {
                    self.diagnostics.source_get_retryable_errors.record(1);
                    if error.throttled {
                        self.diagnostics.source_get_throttled_attempts.record(1);
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
                        self.diagnostics.source_get_retryable_errors.record(1);
                    } else {
                        self.diagnostics.source_get_permanent_errors.record(1);
                    }
                    if error.throttled {
                        self.diagnostics.source_get_throttled_attempts.record(1);
                    }
                    self.diagnostics.source_get_errors.record(1);
                    return Err(error.source);
                }
            }
        }

        Err(io::Error::other("S3 ranged GetObject failed"))
    }

    async fn fetch_range_once(
        &self,
        start: u64,
        end_inclusive: u64,
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
                self.diagnostics.source_get_request_errors.record(1);
                range_get_request_error(error)
            })?;

        validate_content_range(output.content_range(), start, end_inclusive, self.len).map_err(
            |source| RangeGetError {
                source,
                retryable: true,
                throttled: false,
            },
        )?;

        output
            .body
            .collect()
            .await
            .map(|bytes| bytes.into_bytes())
            .map_err(|err| {
                self.diagnostics.source_get_body_errors.record(1);
                RangeGetError {
                    source: io::Error::other(format!("S3 range body read failed: {err}")),
                    retryable: true,
                    throttled: false,
                }
            })
            .and_then(|bytes| {
                let expected_len = usize::try_from(end_inclusive - start + 1).map_err(|_| {
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
                    self.diagnostics.source_get_short_body_errors.record(1);
                    Err(RangeGetError {
                        source: io::Error::new(
                            io::ErrorKind::UnexpectedEof,
                            format!(
                                "S3 range bytes={start}-{end_inclusive} returned {} bytes, expected {expected_len}",
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

fn validate_content_range(
    value: Option<&str>,
    start: u64,
    end_inclusive: u64,
    total: u64,
) -> io::Result<()> {
    let Some(value) = value else {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!("S3 range bytes={start}-{end_inclusive} response is missing Content-Range"),
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
    if parsed == Some((start, end_inclusive, total)) {
        Ok(())
    } else {
        Err(io::Error::new(
            io::ErrorKind::InvalidData,
            format!(
                "S3 range bytes={start}-{end_inclusive} response has a mismatched Content-Range"
            ),
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
            (is_retryable_http_status(status) || throttled, throttled)
        }
        SdkError::TimeoutError(_) | SdkError::DispatchFailure(_) => (true, false),
        SdkError::ResponseError(response) => {
            let status = response.raw().status().as_u16();
            (is_retryable_http_status(status), status == 429)
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
    capped_exponential_backoff_millis(attempt, base, max)
}

/// Full jitter: map a random sample into `0..=cap` so concurrent readers spread
/// out instead of retrying together. `jitter` is supplied by the caller so the
/// delay computation stays a pure function and can be tested without timing races.
fn source_get_retry_delay(attempt: usize, throttled: bool, jitter: u64) -> std::time::Duration {
    let cap_millis = source_get_retry_cap_millis(attempt, throttled);
    full_jitter_delay(cap_millis, jitter)
}

#[cfg(test)]
pub(crate) mod tests;
