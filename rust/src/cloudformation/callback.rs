use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow, ensure};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use serde_json::json;
use tokio::time::{Instant as TokioInstant, sleep_until, timeout_at};

use crate::types::{DeploymentStats, ResponsePayload, duration_ms};

use super::RequestEnvelope;

pub(super) const MAX_FAILURE_REASON_BYTES: usize = 1024;
pub(super) const MAX_CLOUDFORMATION_RESPONSE_BYTES: usize = 4096;
const CALLBACK_MAX_ATTEMPTS: usize = 5;
const CALLBACK_RETRY_BASE_DELAY: Duration = Duration::from_millis(250);
const CALLBACK_RETRY_MAX_DELAY: Duration = Duration::from_secs(2);

pub(super) fn truncate_failure_reason(reason: &str) -> String {
    truncate_failure_reason_to(reason, MAX_FAILURE_REASON_BYTES)
}

fn truncate_failure_reason_to(reason: &str, max_bytes: usize) -> String {
    if reason.len() <= max_bytes {
        return reason.to_string();
    }
    if max_bytes == 0 {
        return String::new();
    }

    const SUFFIX: &str = " ... [truncated]";
    if max_bytes <= SUFFIX.len() {
        return SUFFIX[..max_bytes].to_string();
    }
    let mut end = max_bytes - SUFFIX.len();
    while end > 0 && !reason.is_char_boundary(end) {
        end -= 1;
    }

    let mut truncated = String::with_capacity(end + SUFFIX.len());
    truncated.push_str(&reason[..end]);
    truncated.push_str(SUFFIX);
    truncated
}

pub(super) fn response_target(request: &RequestEnvelope) -> Option<(&str, &str, &str, &str)> {
    match request {
        CloudFormationCustomResourceRequest::Create(request) => Some((
            &request.response_url,
            &request.stack_id,
            &request.request_id,
            &request.logical_resource_id,
        )),
        CloudFormationCustomResourceRequest::Update(request) => Some((
            &request.response_url,
            &request.stack_id,
            &request.request_id,
            &request.logical_resource_id,
        )),
        CloudFormationCustomResourceRequest::Delete(request) => Some((
            &request.response_url,
            &request.stack_id,
            &request.request_id,
            &request.logical_resource_id,
        )),
        _ => None,
    }
}

pub(super) fn physical_resource_id(request: &RequestEnvelope) -> Option<&str> {
    match request {
        CloudFormationCustomResourceRequest::Create(_) => None,
        CloudFormationCustomResourceRequest::Update(request) => Some(&request.physical_resource_id),
        CloudFormationCustomResourceRequest::Delete(request) => Some(&request.physical_resource_id),
        _ => None,
    }
}

pub(super) async fn send_response(
    http: &reqwest::Client,
    response_url: &reqwest::Url,
    body: &[u8],
    deadline: TokioInstant,
    stats: Option<&DeploymentStats>,
) -> Result<()> {
    let started = Instant::now();
    let result = send_response_with_policy(
        http,
        response_url,
        body,
        deadline,
        CallbackRetryPolicy::production(),
        stats,
    )
    .await;
    if let Some(stats) = stats {
        stats.add_callback_millis(duration_ms(started.elapsed()));
    }
    result
}

pub(super) fn serialize_response(
    stack_id: &str,
    request_id: &str,
    logical_resource_id: &str,
    status: &str,
    payload: &ResponsePayload,
) -> Result<Vec<u8>> {
    serde_json::to_vec(&json!({
        "Status": status,
        "Reason": payload.reason.clone().unwrap_or_else(|| format!("See the details in CloudWatch Logs for RequestId {}", request_id)),
        "PhysicalResourceId": payload.physical_resource_id,
        "StackId": stack_id,
        "RequestId": request_id,
        "LogicalResourceId": logical_resource_id,
        "Data": payload.data,
    }))
    .context("failed to serialize CloudFormation response")
}

pub(super) fn serialize_failure_response(
    stack_id: &str,
    request_id: &str,
    logical_resource_id: &str,
    payload: &ResponsePayload,
) -> Result<Vec<u8>> {
    let full_reason = payload.reason.as_deref().unwrap_or_default();
    let mut reason_limit = full_reason.len().min(MAX_FAILURE_REASON_BYTES);

    loop {
        let bounded = ResponsePayload {
            physical_resource_id: payload.physical_resource_id.clone(),
            reason: Some(truncate_failure_reason_to(full_reason, reason_limit)),
            data: payload.data.clone(),
        };
        let body = serialize_response(
            stack_id,
            request_id,
            logical_resource_id,
            "FAILED",
            &bounded,
        )?;
        if body.len() <= MAX_CLOUDFORMATION_RESPONSE_BYTES {
            return Ok(body);
        }
        ensure!(
            reason_limit > 0,
            "CloudFormation failure response identity exceeds the {MAX_CLOUDFORMATION_RESPONSE_BYTES}-byte body limit"
        );
        let excess = body.len() - MAX_CLOUDFORMATION_RESPONSE_BYTES;
        reason_limit = reason_limit.saturating_sub(excess.max(1));
    }
}

pub(super) fn validate_response_body_size(body: &[u8], output_object_keys: bool) -> Result<()> {
    ensure!(
        body.len() <= MAX_CLOUDFORMATION_RESPONSE_BYTES,
        "CloudFormation response body is {} bytes; the maximum is {MAX_CLOUDFORMATION_RESPONSE_BYTES} bytes. Set outputObjectKeys:false to omit SourceObjectKeys{}",
        body.len(),
        if output_object_keys {
            " before retrying the deployment"
        } else {
            ", and reduce other response data"
        }
    );
    Ok(())
}

#[derive(Clone, Copy)]
struct CallbackRetryPolicy {
    max_attempts: usize,
    base_delay: Duration,
    max_delay: Duration,
    jitter: bool,
}

impl CallbackRetryPolicy {
    const fn production() -> Self {
        Self {
            max_attempts: CALLBACK_MAX_ATTEMPTS,
            base_delay: CALLBACK_RETRY_BASE_DELAY,
            max_delay: CALLBACK_RETRY_MAX_DELAY,
            jitter: true,
        }
    }
}

async fn send_response_with_policy(
    http: &reqwest::Client,
    response_url: &reqwest::Url,
    body: &[u8],
    deadline: TokioInstant,
    retry: CallbackRetryPolicy,
    stats: Option<&DeploymentStats>,
) -> Result<()> {
    ensure!(
        retry.max_attempts > 0,
        "callback retry attempts must be positive"
    );

    for attempt in 1..=retry.max_attempts {
        ensure!(
            TokioInstant::now() < deadline,
            "CloudFormation callback deadline was exhausted before attempt {attempt}"
        );

        if let Some(stats) = stats {
            stats.record_callback_attempt(attempt > 1);
        }
        let response = timeout_at(
            deadline,
            http.put(response_url.clone())
                .header("content-type", "")
                .header("content-length", body.len())
                .body(body.to_vec())
                .send(),
        )
        .await;
        let response = match response {
            Ok(response) => response,
            Err(error) => {
                if let Some(stats) = stats {
                    stats.record_callback_failure();
                }
                return Err(error).with_context(|| {
                    format!(
                        "CloudFormation callback deadline was exhausted during attempt {attempt}"
                    )
                });
            }
        };

        let retry_error = match response {
            Ok(response) if response.status().is_success() => {
                if let Some(stats) = stats {
                    stats.record_callback_success();
                }
                return Ok(());
            }
            Ok(response) => {
                if let Some(stats) = stats {
                    stats.record_callback_failure();
                }
                let status = response.status();
                if callback_status_is_retryable(status) {
                    anyhow!(
                        "CloudFormation callback attempt {attempt} returned retryable status {status}"
                    )
                } else {
                    return Err(anyhow!(
                        "CloudFormation callback attempt {attempt} returned non-retryable status {status}"
                    ));
                }
            }
            Err(error) if error.is_connect() || error.is_timeout() => {
                if let Some(stats) = stats {
                    stats.record_callback_failure();
                }
                anyhow!(error.without_url()).context(format!(
                    "CloudFormation callback attempt {attempt} failed with a retryable transport error"
                ))
            }
            Err(error) => {
                if let Some(stats) = stats {
                    stats.record_callback_failure();
                }
                return Err(error.without_url()).context(format!(
                    "CloudFormation callback attempt {attempt} failed with a non-retryable transport error"
                ));
            }
        };

        if attempt == retry.max_attempts {
            return Err(retry_error).context(format!(
                "CloudFormation callback failed after {attempt} attempts"
            ));
        }

        let delay = callback_retry_delay(attempt, retry);
        let wake = TokioInstant::now()
            .checked_add(delay)
            .unwrap_or(deadline)
            .min(deadline);
        ensure!(
            wake < deadline,
            "CloudFormation callback reserve was exhausted after attempt {attempt}: {retry_error:#}"
        );
        sleep_until(wake).await;
    }

    unreachable!("positive callback attempt count checked above")
}

fn callback_status_is_retryable(status: reqwest::StatusCode) -> bool {
    status.is_server_error()
        || status.is_redirection()
        || status == reqwest::StatusCode::REQUEST_TIMEOUT
        || status == reqwest::StatusCode::TOO_MANY_REQUESTS
}

fn callback_retry_delay(attempt: usize, retry: CallbackRetryPolicy) -> Duration {
    let exponent = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 2_u32.checked_pow(exponent).unwrap_or(u32::MAX);
    let cap = retry
        .base_delay
        .checked_mul(multiplier)
        .unwrap_or(retry.max_delay)
        .min(retry.max_delay);
    if !retry.jitter || cap.is_zero() {
        return cap;
    }

    let cap_millis = u64::try_from(cap.as_millis()).unwrap_or(u64::MAX);
    Duration::from_millis(fastrand::u64(0..=cap_millis))
}

/// Validates the CloudFormation `ResponseURL` before PUTing the response.
///
/// The URL comes from the CloudFormation event envelope, not
/// `ResourceProperties`, so this is defense-in-depth. Validate only scheme and
/// host shape: response URL hosts vary by AWS partition, and a false rejection
/// would prevent the provider from reporting failure. HTTPS keeps the response
/// body, including any `Data`, off plaintext transport.
pub(super) fn validate_response_url(response_url: &str) -> Result<reqwest::Url> {
    let parsed = reqwest::Url::parse(response_url)
        .map_err(|_| anyhow!("CloudFormation response URL is invalid"))?;
    if parsed.scheme() != "https" {
        return Err(anyhow!("CloudFormation response URL must use https"));
    }
    if parsed.host_str().is_none() {
        return Err(anyhow!("CloudFormation response URL must include a host"));
    }
    if !parsed.username().is_empty() || parsed.password().is_some() {
        return Err(anyhow!(
            "CloudFormation response URL must not include user information"
        ));
    }
    if parsed.port().is_some() {
        return Err(anyhow!(
            "CloudFormation response URL must not include a non-default port"
        ));
    }

    Ok(parsed)
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::thread::{self, JoinHandle};
    use std::time::Duration;

    use reqwest::{Client, StatusCode, Url};
    use serde_json::{Map, Value};
    use tokio::time::Instant as TokioInstant;

    use crate::request::RawDeploymentRequest;
    use crate::types::ResponsePayload;

    use super::{
        CallbackRetryPolicy, MAX_CLOUDFORMATION_RESPONSE_BYTES, MAX_FAILURE_REASON_BYTES,
        callback_retry_delay, callback_status_is_retryable, send_response_with_policy,
        serialize_failure_response, serialize_response, truncate_failure_reason,
        validate_response_body_size, validate_response_url,
    };

    enum MockCallback {
        Status(u16),
        Timeout(Duration),
    }

    struct MockCallbackServer {
        url: Url,
        requests: Arc<AtomicUsize>,
        thread: Option<JoinHandle<()>>,
    }

    impl MockCallbackServer {
        fn start(responses: Vec<MockCallback>) -> Self {
            let listener = TcpListener::bind("127.0.0.1:0").expect("bind mock callback server");
            listener
                .set_nonblocking(true)
                .expect("make mock callback listener nonblocking");
            let address = listener.local_addr().expect("mock callback address");
            let requests = Arc::new(AtomicUsize::new(0));
            let request_count = Arc::clone(&requests);
            let thread = thread::spawn(move || {
                let mut workers = Vec::new();
                for response in responses {
                    let accept_deadline = std::time::Instant::now() + Duration::from_secs(2);
                    let stream = loop {
                        match listener.accept() {
                            Ok((stream, _)) => break stream,
                            Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                                assert!(
                                    std::time::Instant::now() < accept_deadline,
                                    "timed out waiting for callback request"
                                );
                                thread::sleep(Duration::from_millis(2));
                            }
                            Err(error) => panic!("accept callback request: {error}"),
                        }
                    };
                    request_count.fetch_add(1, Ordering::AcqRel);
                    workers.push(thread::spawn(move || handle_callback(stream, response)));
                }
                for worker in workers {
                    worker.join().expect("mock callback worker");
                }
            });

            Self {
                url: Url::parse(&format!("http://{address}/response")).expect("mock callback URL"),
                requests,
                thread: Some(thread),
            }
        }

        fn finish(mut self) -> usize {
            self.thread
                .take()
                .expect("mock callback thread")
                .join()
                .expect("mock callback server");
            self.requests.load(Ordering::Acquire)
        }
    }

    fn handle_callback(mut stream: TcpStream, response: MockCallback) {
        stream
            .set_read_timeout(Some(Duration::from_secs(1)))
            .expect("set mock read timeout");
        read_request(&mut stream);
        match response {
            MockCallback::Status(status) => {
                write!(
                    stream,
                    "HTTP/1.1 {status} mock\r\nContent-Length: 0\r\nConnection: close\r\n\r\n"
                )
                .expect("write callback response");
                stream.flush().expect("flush callback response");
            }
            MockCallback::Timeout(duration) => thread::sleep(duration),
        }
    }

    fn read_request(stream: &mut TcpStream) {
        let mut request = Vec::new();
        let mut buffer = [0_u8; 1024];
        loop {
            let bytes = stream.read(&mut buffer).expect("read callback request");
            if bytes == 0 {
                break;
            }
            request.extend_from_slice(&buffer[..bytes]);
            let Some(header_end) = request.windows(4).position(|bytes| bytes == b"\r\n\r\n") else {
                continue;
            };
            let header_end = header_end + 4;
            let headers = String::from_utf8_lossy(&request[..header_end]);
            let content_length = headers
                .lines()
                .find_map(|line| {
                    line.split_once(':').and_then(|(name, value)| {
                        name.eq_ignore_ascii_case("content-length")
                            .then(|| value.trim().parse::<usize>().expect("content length"))
                    })
                })
                .unwrap_or(0);
            if request.len() >= header_end + content_length {
                break;
            }
        }
    }

    fn callback_client(timeout: Duration) -> Client {
        Client::builder()
            .no_proxy()
            .timeout(timeout)
            .build()
            .expect("callback client")
    }

    fn test_retry_policy(max_attempts: usize) -> CallbackRetryPolicy {
        CallbackRetryPolicy {
            max_attempts,
            base_delay: Duration::ZERO,
            max_delay: Duration::ZERO,
            jitter: false,
        }
    }

    #[test]
    fn callback_retry_delay_is_exponential_and_capped() {
        let policy = CallbackRetryPolicy {
            max_attempts: 8,
            base_delay: Duration::from_millis(250),
            max_delay: Duration::from_secs(2),
            jitter: false,
        };

        assert_eq!(callback_retry_delay(1, policy), Duration::from_millis(250));
        assert_eq!(callback_retry_delay(2, policy), Duration::from_millis(500));
        assert_eq!(callback_retry_delay(3, policy), Duration::from_secs(1));
        assert_eq!(callback_retry_delay(4, policy), Duration::from_secs(2));
        assert_eq!(callback_retry_delay(8, policy), Duration::from_secs(2));
    }

    fn deployment_request_with_paths(paths: Vec<String>) -> crate::types::DeploymentRequest {
        let raw: RawDeploymentRequest = serde_json::from_value(serde_json::json!({
            "SourceBucketNames": ["source"],
            "SourceObjectKeys": ["asset.zip"],
            "DestinationBucketName": "destination",
            "DestinationChecksumStrategy": "sse-s3-etag",
            "DistributionId": "distribution",
            "DistributionPaths": paths
        }))
        .expect("raw deployment request");
        crate::request::parse_request(&raw).expect("valid request")
    }

    #[tokio::test]
    async fn callback_accepts_success_without_retry() {
        let server = MockCallbackServer::start(vec![MockCallback::Status(200)]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
            None,
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 1);
    }

    #[tokio::test]
    async fn callback_never_retries_an_other_4xx_response() {
        let server = MockCallbackServer::start(vec![MockCallback::Status(400)]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
            None,
        )
        .await;
        let requests = server.finish();

        assert!(
            result
                .expect_err("4xx callback must fail")
                .to_string()
                .contains("non-retryable status 400")
        );
        assert_eq!(requests, 1);
    }

    #[tokio::test]
    async fn callback_retries_redirect_timeout_and_throttle_statuses() {
        let server = MockCallbackServer::start(vec![
            MockCallback::Status(302),
            MockCallback::Status(408),
            MockCallback::Status(429),
            MockCallback::Status(200),
        ]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(4),
            None,
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 4);
        for status in 300..400 {
            assert!(callback_status_is_retryable(
                StatusCode::from_u16(status).expect("3xx status")
            ));
        }
    }

    #[tokio::test]
    async fn callback_retries_5xx_until_success() {
        let stats = crate::types::DeploymentStats::default();
        let server = MockCallbackServer::start(vec![
            MockCallback::Status(500),
            MockCallback::Status(503),
            MockCallback::Status(200),
        ]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
            Some(&stats),
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 3);
        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let summary = serde_json::to_value(stats.snapshot("Create", "success", &request))
            .expect("serializable summary");
        assert_eq!(summary["callback"]["wireAttempts"], 3);
        assert_eq!(summary["callback"]["failedAttempts"], 2);
        assert_eq!(summary["callback"]["retryAttempts"], 2);
        assert_eq!(summary["callback"]["confirmedResponses"], 1);
    }

    #[tokio::test]
    async fn callback_retries_a_request_timeout() {
        let server = MockCallbackServer::start(vec![
            MockCallback::Timeout(Duration::from_millis(150)),
            MockCallback::Status(200),
        ]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_millis(30)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(2),
            None,
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 2);
    }

    #[tokio::test]
    async fn callback_timeout_error_chains_hide_the_response_url() {
        let server =
            MockCallbackServer::start(vec![MockCallback::Timeout(Duration::from_millis(100))]);
        let mut response_url = server.url.clone();
        response_url.set_query(Some("X-Amz-Signature=timeout-secret"));
        let error = send_response_with_policy(
            &callback_client(Duration::from_millis(20)),
            &response_url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(1),
            None,
        )
        .await
        .expect_err("timeout must exhaust the single attempt");
        assert_eq!(server.finish(), 1);

        for rendered in [
            error.to_string(),
            format!("{error:#}"),
            format!("{error:?}"),
        ] {
            assert!(!rendered.contains("timeout-secret"));
            assert!(!rendered.contains("X-Amz-Signature"));
        }
    }

    #[tokio::test]
    async fn callback_retries_connection_failures_to_the_attempt_bound() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("reserve unused callback port");
        let address = listener.local_addr().expect("unused callback address");
        drop(listener);

        let response_url = Url::parse(&format!(
            "http://{address}/response?X-Amz-Signature=callback-secret"
        ))
        .expect("callback URL");
        let error = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &response_url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
            None,
        )
        .await
        .expect_err("connection failures must exhaust the attempt bound");

        assert!(format!("{error:#}").contains("failed after 3 attempts"));
        for rendered in [
            error.to_string(),
            format!("{error:#}"),
            format!("{error:?}"),
        ] {
            assert!(!rendered.contains("callback-secret"));
            assert!(!rendered.contains("X-Amz-Signature"));
        }
    }

    #[tokio::test]
    async fn callback_request_cannot_run_past_its_absolute_deadline() {
        let stats = crate::types::DeploymentStats::default();
        let server =
            MockCallbackServer::start(vec![MockCallback::Timeout(Duration::from_millis(150))]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_millis(30),
            test_retry_policy(3),
            Some(&stats),
        )
        .await;
        let requests = server.finish();

        assert!(
            format!(
                "{:#}",
                result.expect_err("callback deadline must stop the request")
            )
            .contains("callback deadline was exhausted")
        );
        assert_eq!(requests, 1);
        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let summary = serde_json::to_value(stats.snapshot("Create", "failure", &request))
            .expect("serializable summary");
        assert_eq!(summary["callback"]["wireAttempts"], 1);
        assert_eq!(summary["callback"]["failedAttempts"], 1);
        assert_eq!(summary["callback"]["retryAttempts"], 0);
        assert_eq!(summary["callback"]["confirmedResponses"], 0);
    }

    #[test]
    fn complete_response_body_accepts_4096_bytes_and_rejects_4097() {
        let payload = |filler: String| ResponsePayload {
            physical_resource_id: "physical".to_string(),
            reason: None,
            data: Map::from_iter([("Filler".to_string(), Value::String(filler))]),
        };
        let empty = serialize_response(
            "stack",
            "request",
            "Deploy",
            "SUCCESS",
            &payload(String::new()),
        )
        .expect("serialize empty response");
        let filler_len = MAX_CLOUDFORMATION_RESPONSE_BYTES - empty.len();
        let boundary = serialize_response(
            "stack",
            "request",
            "Deploy",
            "SUCCESS",
            &payload("x".repeat(filler_len)),
        )
        .expect("serialize boundary response");
        let oversized = serialize_response(
            "stack",
            "request",
            "Deploy",
            "SUCCESS",
            &payload("x".repeat(filler_len + 1)),
        )
        .expect("serialize oversized response");

        assert_eq!(boundary.len(), MAX_CLOUDFORMATION_RESPONSE_BYTES);
        assert!(validate_response_body_size(&boundary, true).is_ok());
        let response: Value = serde_json::from_slice(&boundary).expect("success response JSON");
        assert!(response.get("NoEcho").is_none());
        assert_eq!(oversized.len(), MAX_CLOUDFORMATION_RESPONSE_BYTES + 1);
        assert!(
            validate_response_body_size(&oversized, true)
                .expect_err("oversized response must fail")
                .to_string()
                .contains("outputObjectKeys:false")
        );
    }

    #[test]
    fn escaped_failure_reason_is_reduced_to_a_valid_response_body() {
        let failure = ResponsePayload {
            physical_resource_id: "physical".to_string(),
            reason: Some("\0".repeat(MAX_FAILURE_REASON_BYTES)),
            data: Map::new(),
        };

        let body = serialize_failure_response("stack", "request", "Deploy", &failure)
            .expect("serialize bounded failure response");

        assert!(body.len() <= MAX_CLOUDFORMATION_RESPONSE_BYTES);
        let response: Value = serde_json::from_slice(&body).expect("failure response JSON");
        assert_eq!(response["Status"], "FAILED");
        assert!(response.get("NoEcho").is_none());
    }

    #[test]
    fn truncate_failure_reason_leaves_short_reasons_unchanged() {
        assert_eq!(truncate_failure_reason("short failure"), "short failure");
    }

    #[test]
    fn truncate_failure_reason_caps_long_reasons() {
        let reason = "x".repeat(MAX_FAILURE_REASON_BYTES + 100);
        let truncated = truncate_failure_reason(&reason);

        assert_eq!(truncated.len(), MAX_FAILURE_REASON_BYTES);
        assert!(truncated.ends_with(" ... [truncated]"));
    }

    #[test]
    fn truncate_failure_reason_preserves_utf8_boundaries() {
        let reason = "é".repeat(MAX_FAILURE_REASON_BYTES);
        let truncated = truncate_failure_reason(&reason);

        assert!(truncated.len() <= MAX_FAILURE_REASON_BYTES);
        assert!(truncated.ends_with(" ... [truncated]"));
    }

    #[test]
    fn response_url_shape_is_validated_without_echoing_input() {
        assert!(
            validate_response_url(
                "https://cloudformation-custom-resource-response-useast1.s3.us-east-1.amazonaws.com/abc?signature=x"
            )
            .is_ok()
        );
        assert!(validate_response_url("https://example.com/response").is_ok());
        for invalid in [
            "https://user:sentinel-secret@example.com/response",
            "https://example.com:8443/response?signature=sentinel-secret",
            "http://example.com/response?signature=sentinel-secret",
            "sentinel-secret is not a URL",
            "file:///sentinel-secret",
            "data:text/plain,sentinel-secret",
        ] {
            let error = validate_response_url(invalid).expect_err("URL shape must be rejected");
            for rendered in [
                error.to_string(),
                format!("{error:#}"),
                format!("{error:?}"),
            ] {
                assert!(!rendered.contains("sentinel-secret"));
            }
        }
    }
}
