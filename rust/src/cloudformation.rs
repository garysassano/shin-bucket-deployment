use std::collections::HashSet;
use std::future::Future;
use std::sync::Arc;
use std::time::{Duration, Instant};

use anyhow::{Context, Result, anyhow, ensure};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use md5::{Digest, Md5};
use serde_json::{Map, Value, json};
use tokio::time::{Instant as TokioInstant, sleep_until, timeout_at};
use tracing::error;
use uuid::Uuid;

use crate::cloudfront::{invalidate as invalidate_cloudfront, validate_invalidation_paths};
use crate::deadline::InvocationDeadlines;
use crate::lifecycle::{
    DestinationChangeCleanupDecision, destination_namespaces_overlap,
    plan_destination_change_cleanup, previous_distribution_authorized,
};
use crate::request::{RawDeploymentRequest, parse_old_destination, parse_request};
use crate::s3::{bucket_has_competing_owner, delete_prefix, delete_prefix_excluding, deploy};
use crate::types::{AppState, DeploymentStats, ResponsePayload, duration_ms};

const MAX_FAILURE_REASON_BYTES: usize = 1024;
const MAX_CLOUDFORMATION_RESPONSE_BYTES: usize = 4096;
const RESOURCE_TYPE: &str = "Custom::ShinBucketDeployment";
const CALLBACK_MAX_ATTEMPTS: usize = 5;
const CALLBACK_RETRY_BASE_DELAY: Duration = Duration::from_millis(250);
const CALLBACK_RETRY_MAX_DELAY: Duration = Duration::from_secs(2);

type RequestEnvelope = CloudFormationCustomResourceRequest<Value, Value>;

#[derive(Clone, Copy)]
struct RequestIdentity<'a> {
    stack_id: &'a str,
    request_id: &'a str,
    logical_resource_id: &'a str,
}

#[derive(Clone, Copy)]
struct RequestExecution<'a> {
    identity: RequestIdentity<'a>,
    deadlines: InvocationDeadlines,
}

struct DecodedRequest<'a> {
    request_type: &'static str,
    identity: RequestIdentity<'a>,
    physical_resource_id: Option<&'a str>,
    resource_properties: RawDeploymentRequest,
    old_resource_properties: Option<RawDeploymentRequest>,
}

pub(crate) async fn handle_event(
    state: Arc<AppState>,
    event: lambda_runtime::LambdaEvent<Value>,
) -> Result<Value, Error> {
    let (payload, context) = event.into_parts();
    let deadlines = InvocationDeadlines::from_lambda_deadline(context.deadline());
    let request = decode_request_envelope(payload)?;

    let Some((response_url, stack_id, request_id, logical_resource_id)) = response_target(&request)
    else {
        return Err(anyhow!("unsupported CloudFormation custom resource request type").into());
    };

    let response = timeout_at(
        deadlines.drain(),
        process_request_envelope(&state, &request, deadlines),
    )
    .await
    .context("deployment cancellation did not finish before the callback-only reserve")
    .and_then(|response| response);

    match response {
        Ok(success_body) => {
            send_response(
                &state.http,
                response_url,
                &success_body,
                deadlines.callback(),
            )
            .await
            .context("failed to send success response")?;
        }
        Err(err) => {
            let full_reason = format!("{err:#}");
            let reason = truncate_failure_reason(&full_reason);
            error!(error = %full_reason, "request failed");
            let failure = ResponsePayload {
                physical_resource_id: physical_resource_id(&request)
                    .map(ToOwned::to_owned)
                    .unwrap_or_else(|| request_id.to_string()),
                reason: Some(reason),
                data: Map::new(),
            };
            let failure_body =
                serialize_failure_response(stack_id, request_id, logical_resource_id, &failure)?;

            send_response(
                &state.http,
                response_url,
                &failure_body,
                deadlines.callback(),
            )
            .await
            .context("failed to send failure response")?;
        }
    }

    Ok(json!({}))
}

fn decode_request_envelope(payload: Value) -> Result<RequestEnvelope> {
    serde_json::from_value(payload).context("failed to deserialize CloudFormation request envelope")
}

fn decode_resource_properties(value: &Value, label: &str) -> Result<RawDeploymentRequest> {
    serde_json::from_value(value.clone()).with_context(|| format!("failed to deserialize {label}"))
}

async fn process_request_envelope(
    state: &AppState,
    request: &RequestEnvelope,
    deadlines: InvocationDeadlines,
) -> Result<Vec<u8>> {
    let decoded = decode_deployment_request(request)?;
    tracing::info!(
        request_type = decoded.request_type,
        logical_resource_id = decoded.identity.logical_resource_id,
        "processing request"
    );
    process_request(
        state,
        decoded.request_type,
        decoded.identity,
        decoded.physical_resource_id,
        &decoded.resource_properties,
        decoded.old_resource_properties.as_ref(),
        deadlines,
    )
    .await
}

fn decode_deployment_request(request: &RequestEnvelope) -> Result<DecodedRequest<'_>> {
    validate_resource_type(request)?;
    match request {
        CloudFormationCustomResourceRequest::Create(request) => Ok(DecodedRequest {
            request_type: "Create",
            identity: RequestIdentity {
                stack_id: &request.stack_id,
                request_id: &request.request_id,
                logical_resource_id: &request.logical_resource_id,
            },
            physical_resource_id: None,
            resource_properties: decode_resource_properties(
                &request.resource_properties,
                "ResourceProperties",
            )?,
            old_resource_properties: None,
        }),
        CloudFormationCustomResourceRequest::Update(request) => Ok(DecodedRequest {
            request_type: "Update",
            identity: RequestIdentity {
                stack_id: &request.stack_id,
                request_id: &request.request_id,
                logical_resource_id: &request.logical_resource_id,
            },
            physical_resource_id: Some(&request.physical_resource_id),
            resource_properties: decode_resource_properties(
                &request.resource_properties,
                "ResourceProperties",
            )?,
            old_resource_properties: Some(decode_resource_properties(
                &request.old_resource_properties,
                "OldResourceProperties",
            )?),
        }),
        CloudFormationCustomResourceRequest::Delete(request) => Ok(DecodedRequest {
            request_type: "Delete",
            identity: RequestIdentity {
                stack_id: &request.stack_id,
                request_id: &request.request_id,
                logical_resource_id: &request.logical_resource_id,
            },
            physical_resource_id: Some(&request.physical_resource_id),
            resource_properties: decode_resource_properties(
                &request.resource_properties,
                "ResourceProperties",
            )?,
            old_resource_properties: None,
        }),
        _ => Err(anyhow!(
            "unsupported CloudFormation custom resource request type"
        )),
    }
}

async fn process_request(
    state: &AppState,
    request_type: &str,
    identity: RequestIdentity<'_>,
    physical_resource_id: Option<&str>,
    resource_properties: &RawDeploymentRequest,
    old_resource_properties: Option<&RawDeploymentRequest>,
    deadlines: InvocationDeadlines,
) -> Result<Vec<u8>> {
    let request = parse_request(resource_properties)?;
    let physical_resource_id = match request_type {
        "Create" => format!("aws.cdk.cargobucketdeployment.{}", Uuid::new_v4()),
        "Update" | "Delete" => physical_resource_id
            .map(ToOwned::to_owned)
            .ok_or_else(|| anyhow!("PhysicalResourceId is required for {request_type}"))?,
        other => return Err(anyhow!("Unsupported request type: {other}")),
    };
    let success = success_payload(&request, physical_resource_id.clone())?;
    let success_body = serialize_response(
        identity.stack_id,
        identity.request_id,
        identity.logical_resource_id,
        "SUCCESS",
        &success,
    )?;
    validate_response_body_size(&success_body, request.output_object_keys)?;

    let previous_destination = old_resource_properties.map(parse_old_destination);
    preflight_invalidation_requests(request_type, &request, previous_destination.as_ref())?;

    let stats = Arc::new(DeploymentStats::default());
    let mut status = "success";
    let result = process_request_inner(
        state,
        request_type,
        RequestExecution {
            identity,
            deadlines,
        },
        previous_destination.as_ref(),
        &request,
        Arc::clone(&stats),
    )
    .await;

    if result.is_err() {
        status = "failure";
    }
    log_deployment_summary(&stats, request_type, status, &request);
    result?;
    Ok(success_body)
}

fn validate_resource_type(request: &RequestEnvelope) -> Result<()> {
    let resource_type = match request {
        CloudFormationCustomResourceRequest::Create(request) => &request.resource_type,
        CloudFormationCustomResourceRequest::Update(request) => &request.resource_type,
        CloudFormationCustomResourceRequest::Delete(request) => &request.resource_type,
        _ => {
            return Err(anyhow!(
                "unsupported CloudFormation custom resource request type"
            ));
        }
    };

    ensure!(
        resource_type == RESOURCE_TYPE,
        "unexpected CloudFormation ResourceType `{resource_type}`; expected `{RESOURCE_TYPE}`"
    );
    Ok(())
}

fn success_payload(
    request: &crate::types::DeploymentRequest,
    physical_resource_id: String,
) -> Result<ResponsePayload> {
    let mut data = Map::new();
    if let Some(destination_bucket_arn) = request.destination_bucket_arn.clone() {
        data.insert(
            "DestinationBucketArn".into(),
            Value::String(destination_bucket_arn),
        );
    }
    data.insert(
        "SourceObjectKeys".into(),
        if request.output_object_keys {
            serde_json::to_value(&request.source_object_keys)?
        } else {
            Value::Array(Vec::new())
        },
    );

    Ok(ResponsePayload {
        physical_resource_id,
        reason: None,
        data,
    })
}

fn preflight_invalidation_requests(
    request_type: &str,
    request: &crate::types::DeploymentRequest,
    previous: Option<&crate::types::PreviousDestination>,
) -> Result<()> {
    let current_may_invalidate = matches!(request_type, "Create" | "Update")
        || (request_type == "Delete" && request.delete_current_objects_on_delete);
    if current_may_invalidate && non_empty(request.distribution_id.as_deref()).is_some() {
        validate_invalidation_paths(&request.distribution_paths)
            .context("current CloudFront invalidation request is invalid")?;
    }

    if request_type != "Update" {
        return Ok(());
    }
    let Some(previous) = previous else {
        return Ok(());
    };
    let Some(previous_distribution_id) = non_empty(previous.distribution_id.as_deref()) else {
        return Ok(());
    };
    let previous_may_change = destination_namespaces_overlap(request, previous)
        || matches!(
            plan_destination_change_cleanup(request, previous),
            DestinationChangeCleanupDecision::Delete(_)
        );
    if !previous_may_change {
        return Ok(());
    }
    let same_distribution = request.distribution_id.as_deref() == Some(previous_distribution_id);
    if same_distribution || previous_distribution_authorized(request, previous) {
        validate_invalidation_paths(&previous.distribution_paths)
            .context("previous CloudFront invalidation request is invalid")?;
    }
    if same_distribution {
        validate_invalidation_paths(&merge_distribution_paths(
            &request.distribution_paths,
            &previous.distribution_paths,
        ))
        .context("merged CloudFront invalidation request is invalid")?;
    }

    Ok(())
}

async fn run_work<T, F>(deadlines: InvocationDeadlines, label: &str, future: F) -> Result<T>
where
    F: Future<Output = Result<T>>,
{
    timeout_at(deadlines.work(), future)
        .await
        .with_context(|| format!("{label} exceeded the deployment work deadline"))?
}

async fn process_request_inner(
    state: &AppState,
    request_type: &str,
    execution: RequestExecution<'_>,
    previous_destination: Option<&crate::types::PreviousDestination>,
    request: &crate::types::DeploymentRequest,
    stats: Arc<DeploymentStats>,
) -> Result<()> {
    let deadlines = execution.deadlines;
    let mut deleted_current_destination = false;
    let mut cleaned_previous_destination = None;

    if request_type == "Delete" && request.delete_current_objects_on_delete {
        if run_work(
            deadlines,
            "destination ownership check",
            bucket_has_competing_owner(
                state,
                &request.dest_bucket_name,
                &request.dest_bucket_prefix,
                None,
                request.destination_owner_id.as_deref(),
            ),
        )
        .await?
        {
            tracing::warn!(
                "destination cleanup retained because another custom resource owns an overlapping namespace"
            );
        } else {
            let started = Instant::now();
            deleted_current_destination = run_work(
                deadlines,
                "current destination cleanup",
                delete_prefix(
                    state,
                    &request.dest_bucket_name,
                    &request.dest_bucket_prefix,
                    Some(&stats),
                ),
            )
            .await?
                > 0;
            stats.add_delete_millis(duration_ms(started.elapsed()));
        }
    }

    if matches!(request_type, "Create" | "Update") {
        deploy(state, request, Arc::clone(&stats), deadlines).await?;
    }

    if request_type == "Update"
        && let Some(previous) = previous_destination
    {
        match plan_destination_change_cleanup(request, previous) {
            DestinationChangeCleanupDecision::Delete(plan) => {
                let competing_owner = run_work(
                    deadlines,
                    "previous destination ownership check",
                    bucket_has_competing_owner(
                        state,
                        &plan.previous.bucket_name,
                        &plan.previous.bucket_prefix,
                        plan.excluded_prefix.as_deref(),
                        request.destination_owner_id.as_deref(),
                    ),
                )
                .await?;

                if competing_owner {
                    tracing::warn!(
                        "previous destination retained because another custom resource owns an overlapping namespace"
                    );
                } else {
                    let started = Instant::now();
                    let deleted = if let Some(excluded_prefix) = plan.excluded_prefix.as_deref() {
                        run_work(
                            deadlines,
                            "overlapping previous destination cleanup",
                            delete_prefix_excluding(
                                state,
                                &plan.previous.bucket_name,
                                &plan.previous.bucket_prefix,
                                excluded_prefix,
                                Some(&stats),
                            ),
                        )
                        .await?
                    } else {
                        run_work(
                            deadlines,
                            "previous destination cleanup",
                            delete_prefix(
                                state,
                                &plan.previous.bucket_name,
                                &plan.previous.bucket_prefix,
                                Some(&stats),
                            ),
                        )
                        .await?
                    };
                    stats.add_old_prefix_delete_millis(duration_ms(started.elapsed()));
                    if deleted > 0 {
                        cleaned_previous_destination = Some(plan.previous);
                    }
                }
            }
            DestinationChangeCleanupDecision::Retain(reason) => {
                tracing::warn!(?reason, "previous destination retained");
            }
            DestinationChangeCleanupDecision::NotNeeded(_) => {}
        }
    }

    let should_invalidate_current = match request_type {
        "Create" | "Update" => true,
        "Delete" => deleted_current_destination,
        _ => false,
    };

    let previous_content_changed = previous_destination.is_some_and(|previous| {
        cleaned_previous_destination.is_some() || destination_namespaces_overlap(request, previous)
    });

    if previous_content_changed
        && let Some(previous) = previous_destination
        && previous.distribution_id != request.distribution_id
        && let Some(distribution_id) = non_empty(previous.distribution_id.as_deref())
    {
        if previous_distribution_authorized(request, previous) {
            invalidate_distribution(
                state,
                execution,
                distribution_id,
                &previous.distribution_paths,
                request.wait_for_distribution_invalidation,
                true,
                &stats,
            )
            .await?;
        } else {
            tracing::warn!(
                "previous distribution was not invalidated because it was not explicitly authorized"
            );
        }
    }

    if should_invalidate_current
        && let Some(distribution_id) = non_empty(request.distribution_id.as_deref())
    {
        let distribution_paths = if previous_content_changed
            && previous_destination
                .is_some_and(|previous| previous.distribution_id == request.distribution_id)
        {
            merge_distribution_paths(
                &request.distribution_paths,
                &previous_destination
                    .expect("checked above")
                    .distribution_paths,
            )
        } else {
            request.distribution_paths.clone()
        };

        invalidate_distribution(
            state,
            execution,
            distribution_id,
            &distribution_paths,
            request.wait_for_distribution_invalidation,
            request_type == "Delete",
            &stats,
        )
        .await?;
    }
    Ok(())
}

async fn invalidate_distribution(
    state: &AppState,
    execution: RequestExecution<'_>,
    distribution_id: &str,
    distribution_paths: &[String],
    wait_for_completion: bool,
    missing_distribution_is_success: bool,
    stats: &DeploymentStats,
) -> Result<()> {
    let started = Instant::now();
    invalidate_cloudfront(
        state,
        distribution_id,
        distribution_paths,
        wait_for_completion,
        &cloudfront_caller_reference(
            execution.identity.stack_id,
            execution.identity.request_id,
            execution.identity.logical_resource_id,
            distribution_id,
            distribution_paths,
        ),
        missing_distribution_is_success,
        execution.deadlines.work(),
    )
    .await?;
    stats.add_cloudfront_millis(duration_ms(started.elapsed()));
    Ok(())
}

fn non_empty(value: Option<&str>) -> Option<&str> {
    value.filter(|value| !value.is_empty())
}

fn merge_distribution_paths(current: &[String], previous: &[String]) -> Vec<String> {
    let mut seen = HashSet::new();
    current
        .iter()
        .chain(previous)
        .filter(|path| seen.insert(path.as_str()))
        .cloned()
        .collect()
}

fn cloudfront_caller_reference(
    stack_id: &str,
    request_id: &str,
    logical_resource_id: &str,
    distribution_id: &str,
    distribution_paths: &[String],
) -> String {
    let mut hasher = Md5::new();
    hash_caller_reference_field(&mut hasher, stack_id);
    hash_caller_reference_field(&mut hasher, request_id);
    hash_caller_reference_field(&mut hasher, logical_resource_id);
    hash_caller_reference_field(&mut hasher, distribution_id);
    for path in distribution_paths {
        hash_caller_reference_field(&mut hasher, path);
    }

    format!("shin-bucket-deployment-{}", finalize_md5(hasher))
}

fn hash_caller_reference_field(hasher: &mut Md5, value: &str) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value.as_bytes());
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

fn truncate_failure_reason(reason: &str) -> String {
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

fn log_deployment_summary(
    stats: &DeploymentStats,
    request_type: &str,
    status: &str,
    request: &crate::types::DeploymentRequest,
) {
    match serde_json::to_string(&stats.snapshot(request_type, status, request)) {
        Ok(summary) => tracing::info!(summary, "shin deployment summary"),
        Err(error) => tracing::warn!(error = %error, "failed to serialize shin deployment summary"),
    }
}

fn response_target(request: &RequestEnvelope) -> Option<(&str, &str, &str, &str)> {
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

fn physical_resource_id(request: &RequestEnvelope) -> Option<&str> {
    match request {
        CloudFormationCustomResourceRequest::Create(_) => None,
        CloudFormationCustomResourceRequest::Update(request) => Some(&request.physical_resource_id),
        CloudFormationCustomResourceRequest::Delete(request) => Some(&request.physical_resource_id),
        _ => None,
    }
}

async fn send_response(
    http: &reqwest::Client,
    response_url: &str,
    body: &[u8],
    deadline: TokioInstant,
) -> Result<()> {
    validate_response_url(response_url)?;
    send_response_with_policy(
        http,
        response_url,
        body,
        deadline,
        CallbackRetryPolicy::production(),
    )
    .await
}

fn serialize_response(
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
        "NoEcho": false,
        "Data": payload.data,
    }))
    .context("failed to serialize CloudFormation response")
}

fn serialize_failure_response(
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

fn validate_response_body_size(body: &[u8], output_object_keys: bool) -> Result<()> {
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
    response_url: &str,
    body: &[u8],
    deadline: TokioInstant,
    retry: CallbackRetryPolicy,
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

        let response = timeout_at(
            deadline,
            http.put(response_url)
                .header("content-type", "")
                .header("content-length", body.len())
                .body(body.to_vec())
                .send(),
        )
        .await
        .with_context(|| {
            format!("CloudFormation callback deadline was exhausted during attempt {attempt}")
        })?;

        let retry_error = match response {
            Ok(response) if response.status().is_success() => return Ok(()),
            Ok(response) if response.status().is_server_error() => anyhow!(
                "CloudFormation callback attempt {attempt} returned retryable status {}",
                response.status()
            ),
            Ok(response) => {
                return Err(anyhow!(
                    "CloudFormation callback attempt {attempt} returned non-retryable status {}",
                    response.status()
                ));
            }
            Err(error) if error.is_connect() || error.is_timeout() => {
                anyhow!(error).context(format!(
                    "CloudFormation callback attempt {attempt} failed with a retryable transport error"
                ))
            }
            Err(error) => {
                return Err(error).context(format!(
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
/// host: response URL hosts vary by AWS partition, and a false rejection would
/// prevent the provider from reporting failure. HTTPS keeps the response body,
/// including any `Data`, off plaintext transport.
fn validate_response_url(response_url: &str) -> Result<()> {
    let parsed =
        reqwest::Url::parse(response_url).context("CloudFormation response URL is invalid")?;
    if parsed.scheme() != "https" {
        return Err(anyhow!(
            "CloudFormation response URL must use https, got {}",
            parsed.scheme()
        ));
    }
    if parsed.host_str().is_none() {
        return Err(anyhow!("CloudFormation response URL must include a host"));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::{Read, Write};
    use std::net::{TcpListener, TcpStream};
    use std::sync::Arc;
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::thread::{self, JoinHandle};
    use std::time::Duration;

    use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
    use reqwest::Client;
    use serde_json::{Map, Value, json};
    use tokio::time::Instant as TokioInstant;

    use crate::request::{RawDeploymentRequest, parse_request};
    use crate::types::ResponsePayload;

    use super::{
        CallbackRetryPolicy, MAX_CLOUDFORMATION_RESPONSE_BYTES, MAX_FAILURE_REASON_BYTES,
        RESOURCE_TYPE, callback_retry_delay, cloudfront_caller_reference,
        decode_deployment_request, decode_request_envelope, decode_resource_properties,
        merge_distribution_paths, preflight_invalidation_requests, send_response_with_policy,
        serialize_failure_response, serialize_response, truncate_failure_reason,
        validate_resource_type, validate_response_body_size, validate_response_url,
    };

    enum MockCallback {
        Status(u16),
        Timeout(Duration),
    }

    struct MockCallbackServer {
        url: String,
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
                url: format!("http://{address}/response"),
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
        let raw: RawDeploymentRequest = serde_json::from_value(json!({
            "SourceBucketNames": ["source"],
            "SourceObjectKeys": ["asset.zip"],
            "DestinationBucketName": "destination",
            "DestinationChecksumStrategy": "sse-s3-etag",
            "DistributionId": "distribution",
            "DistributionPaths": paths
        }))
        .expect("raw deployment request");
        parse_request(&raw).expect("valid request")
    }

    #[test]
    fn deployment_summary_uses_diagnostics_schema_v2() {
        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let stats = crate::types::DeploymentStats::default();
        stats.add_marker_planning_pass();
        stats.add_marker_upload_pass();
        let summary = serde_json::to_value(stats.snapshot("Create", "success", &request))
            .expect("serializable summary");

        assert_eq!(summary["schemaVersion"], 2);
        assert_eq!(summary["transfer"]["scheduledObjects"], 0);
        assert_eq!(
            summary["markerReplacement"]["strategy"],
            "planning-plus-retryable-stream"
        );
        assert_eq!(summary["markerReplacement"]["plannedPassesPerUpload"], 2);
        assert_eq!(summary["markerReplacement"]["planningPasses"], 1);
        assert_eq!(summary["markerReplacement"]["uploadPasses"], 1);
        assert_eq!(summary["source"]["getAttempts"], 0);
        assert_eq!(summary["source"]["bodyReplays"], 0);
        assert_eq!(summary["putObject"]["wireAttempts"], 0);
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
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 1);
    }

    #[tokio::test]
    async fn callback_never_retries_a_4xx_response() {
        let server = MockCallbackServer::start(vec![MockCallback::Status(400)]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
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
    async fn callback_retries_5xx_until_success() {
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
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 3);
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
        )
        .await;
        let requests = server.finish();

        assert!(result.is_ok());
        assert_eq!(requests, 2);
    }

    #[tokio::test]
    async fn callback_retries_connection_failures_to_the_attempt_bound() {
        let listener = TcpListener::bind("127.0.0.1:0").expect("reserve unused callback port");
        let address = listener.local_addr().expect("unused callback address");
        drop(listener);

        let error = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &format!("http://{address}/response"),
            b"{}",
            TokioInstant::now() + Duration::from_secs(1),
            test_retry_policy(3),
        )
        .await
        .expect_err("connection failures must exhaust the attempt bound");

        assert!(format!("{error:#}").contains("failed after 3 attempts"));
    }

    #[tokio::test]
    async fn callback_request_cannot_run_past_its_absolute_deadline() {
        let server =
            MockCallbackServer::start(vec![MockCallback::Timeout(Duration::from_millis(150))]);
        let result = send_response_with_policy(
            &callback_client(Duration::from_secs(1)),
            &server.url,
            b"{}",
            TokioInstant::now() + Duration::from_millis(30),
            test_retry_policy(3),
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
    }

    #[test]
    fn resource_type_must_match_the_provider_protocol() {
        let valid = decode_request_envelope(json!({
            "RequestType": "Create",
            "RequestId": "request-123",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {
                "SourceBucketNames": ["source"],
                "SourceObjectKeys": ["asset.zip"],
                "DestinationBucketName": "destination"
            }
        }))
        .expect("valid envelope");
        assert!(validate_resource_type(&valid).is_ok());
        assert!(decode_deployment_request(&valid).is_ok());

        let invalid = decode_request_envelope(json!({
            "RequestType": "Create",
            "RequestId": "request-123",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": "Custom::WrongProvider",
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {
                "SourceBucketNames": ["source"],
                "SourceObjectKeys": ["asset.zip"],
                "DestinationBucketName": "destination"
            }
        }))
        .expect("invalid resource type still forms an envelope");
        let error = decode_deployment_request(&invalid)
            .err()
            .expect("wrong resource type must fail");
        assert!(
            error
                .to_string()
                .contains("unexpected CloudFormation ResourceType")
        );
    }

    #[test]
    fn cloudfront_path_limits_are_preflighted_before_deployment_work() {
        let request = deployment_request_with_paths(vec![format!("/{}", "a".repeat(4_000))]);

        assert!(
            preflight_invalidation_requests("Create", &request, None)
                .expect_err("oversized CloudFront path must fail preflight")
                .to_string()
                .contains("current CloudFront invalidation request is invalid")
        );
    }

    #[test]
    fn cloudfront_caller_reference_is_stable_and_bounded() {
        let paths = vec!["/site/*".to_string()];
        let reference =
            cloudfront_caller_reference("stack-a", "request-123", "Deploy", "distribution", &paths);

        assert_eq!(reference.len(), "shin-bucket-deployment-".len() + 32);
        assert_eq!(
            reference,
            cloudfront_caller_reference("stack-a", "request-123", "Deploy", "distribution", &paths)
        );
    }

    #[test]
    fn cloudfront_caller_reference_includes_request_identity_and_invalidation_inputs() {
        let paths = vec!["/site/*".to_string()];
        let reference =
            cloudfront_caller_reference("stack-a", "request-123", "Deploy", "distribution", &paths);

        assert_ne!(
            reference,
            cloudfront_caller_reference("stack-b", "request-123", "Deploy", "distribution", &paths)
        );
        assert_ne!(
            reference,
            cloudfront_caller_reference("stack-a", "request-456", "Deploy", "distribution", &paths)
        );
        assert_ne!(
            reference,
            cloudfront_caller_reference(
                "stack-a",
                "request-123",
                "Deploy",
                "distribution",
                &["/other/*".to_string()],
            )
        );
    }

    #[test]
    fn distribution_paths_merge_in_stable_deduplicated_order() {
        assert_eq!(
            merge_distribution_paths(
                &["/new/*".to_string(), "/shared/*".to_string()],
                &["/old/*".to_string(), "/shared/*".to_string()],
            ),
            vec![
                "/new/*".to_string(),
                "/shared/*".to_string(),
                "/old/*".to_string(),
            ]
        );
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
    fn request_envelope_decodes_before_resource_properties() {
        let payload = json!({
            "RequestType": "Create",
            "RequestId": "request-123",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": "Custom::ShinBucketDeployment",
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {
                "DestinationBucketName": "dest"
            }
        });

        let request = decode_request_envelope(payload).expect("envelope should decode");
        let CloudFormationCustomResourceRequest::Create(create) = request else {
            panic!("expected create request");
        };

        assert_eq!(create.response_url, "https://example.com/response");
        assert!(
            decode_resource_properties(&create.resource_properties, "ResourceProperties").is_err()
        );
    }

    #[test]
    fn response_url_must_be_https() {
        // Realistic CloudFormation signed S3 PUT target.
        assert!(
            validate_response_url(
                "https://cloudformation-custom-resource-response-useast1.s3.us-east-1.amazonaws.com/abc?signature=x"
            )
            .is_ok()
        );
        assert!(validate_response_url("https://example.com/response").is_ok());
        // Reject plaintext, malformed input, and non-network schemes.
        assert!(validate_response_url("http://example.com/response").is_err());
        assert!(validate_response_url("not a url").is_err());
        assert!(validate_response_url("file:///etc/passwd").is_err());
        assert!(validate_response_url("data:text/plain,hello").is_err());
    }
}
