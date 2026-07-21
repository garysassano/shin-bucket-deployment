use std::collections::HashSet;
use std::future::Future;
use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow, ensure};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use md5::{Digest, Md5};
use serde_json::{Map, Value, json};
use sha2::Sha256;
use tokio::time::timeout_at;
use tracing::error;

use crate::cloudfront::{invalidate as invalidate_cloudfront, validate_invalidation_paths};
use crate::deadline::InvocationDeadlines;
use crate::lifecycle::{
    DestinationChangeCleanupDecision, PreviousCleanupStrategy, destination_namespaces_overlap,
    plan_destination_change_cleanup, previous_distribution_authorized,
    previous_namespace_is_within_current,
};
use crate::request::{
    RawDeploymentRequest, parse_delete_request, parse_old_destination, parse_request,
};
use crate::s3::{
    OverlappingPreviousCleanup, bucket_has_competing_owner, delete_prefix, delete_prefix_excluding,
    deploy,
};
use crate::types::{AppState, DeploymentStats, ResponsePayload, duration_ms};

mod callback;

use callback::{
    physical_resource_id, response_target, send_response, serialize_failure_response,
    serialize_response, truncate_failure_reason, validate_response_body_size,
    validate_response_url,
};

const RESOURCE_TYPE: &str = "AWS::CloudFormation::CustomResource";
const LEGACY_RESOURCE_TYPE: &str = "Custom::ShinBucketDeployment";

type RequestEnvelope = CloudFormationCustomResourceRequest<Value, Value>;

#[derive(Clone, Copy)]
struct RequestIdentity<'a> {
    stack_id: &'a str,
    request_id: &'a str,
    logical_resource_id: &'a str,
}

struct EnvelopeResponseTarget {
    response_url: String,
    stack_id: String,
    request_id: String,
    logical_resource_id: String,
    physical_resource_id: Option<String>,
}

impl EnvelopeResponseTarget {
    fn from_payload(payload: &Value) -> Option<Self> {
        let payload = payload.as_object()?;
        Some(Self {
            response_url: payload.get("ResponseURL")?.as_str()?.to_owned(),
            stack_id: payload.get("StackId")?.as_str()?.to_owned(),
            request_id: payload.get("RequestId")?.as_str()?.to_owned(),
            logical_resource_id: payload.get("LogicalResourceId")?.as_str()?.to_owned(),
            physical_resource_id: payload
                .get("PhysicalResourceId")
                .and_then(Value::as_str)
                .map(ToOwned::to_owned),
        })
    }
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

struct ProcessedRequest {
    request_type: &'static str,
    request: crate::types::DeploymentRequest,
    stats: Arc<DeploymentStats>,
    result: Result<Vec<u8>>,
}

pub(crate) async fn handle_event(
    state: Arc<AppState>,
    event: lambda_runtime::LambdaEvent<Value>,
) -> Result<Value, Error> {
    let (payload, context) = event.into_parts();
    let deadlines = InvocationDeadlines::from_lambda_deadline(context.deadline());
    let envelope_response_target = EnvelopeResponseTarget::from_payload(&payload);
    let request = match decode_request_envelope(payload) {
        Ok(request) => request,
        Err(error) => {
            return report_envelope_failure(&state, envelope_response_target, error, deadlines)
                .await;
        }
    };

    let Some((response_url, stack_id, request_id, logical_resource_id)) = response_target(&request)
    else {
        return report_envelope_failure(
            &state,
            envelope_response_target,
            anyhow!("unsupported CloudFormation custom resource request type"),
            deadlines,
        )
        .await;
    };
    let response_url = validate_response_url(response_url)?;

    let processed = timeout_at(
        deadlines.drain(),
        process_request_envelope(&state, &request, deadlines),
    )
    .await
    .context("deployment cancellation did not finish before the callback-only reserve")
    .and_then(|response| response);

    match processed {
        Ok(processed) => {
            let deployment_status = if processed.result.is_ok() {
                "success"
            } else {
                "failure"
            };
            let callback_result = match processed.result {
                Ok(success_body) => send_response(
                    &state.http,
                    &response_url,
                    &success_body,
                    deadlines.callback(),
                    Some(&processed.stats),
                )
                .await
                .context("failed to send success response"),
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
                    let failure_body = serialize_failure_response(
                        stack_id,
                        request_id,
                        logical_resource_id,
                        &failure,
                    )?;
                    send_response(
                        &state.http,
                        &response_url,
                        &failure_body,
                        deadlines.callback(),
                        Some(&processed.stats),
                    )
                    .await
                    .context("failed to send failure response")
                }
            };
            log_deployment_summary(
                &processed.stats,
                processed.request_type,
                deployment_status,
                &processed.request,
            );
            callback_result?;
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
                &response_url,
                &failure_body,
                deadlines.callback(),
                None,
            )
            .await
            .context("failed to send failure response")?;
        }
    }

    Ok(json!({}))
}

async fn report_envelope_failure(
    state: &AppState,
    target: Option<EnvelopeResponseTarget>,
    error: anyhow::Error,
    deadlines: InvocationDeadlines,
) -> Result<Value, Error> {
    let Some(target) = target else {
        return Err(error.into());
    };
    let response_url = validate_response_url(&target.response_url)?;
    let full_reason = format!("{error:#}");
    error!(error = %full_reason, "request envelope failed");
    let failure = ResponsePayload {
        physical_resource_id: target
            .physical_resource_id
            .unwrap_or_else(|| target.request_id.clone()),
        reason: Some(truncate_failure_reason(&full_reason)),
        data: Map::new(),
    };
    let body = serialize_failure_response(
        &target.stack_id,
        &target.request_id,
        &target.logical_resource_id,
        &failure,
    )?;
    send_response(
        &state.http,
        &response_url,
        &body,
        deadlines.callback(),
        None,
    )
    .await
    .context("failed to send request-envelope failure response")?;
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
) -> Result<ProcessedRequest> {
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
    request_type: &'static str,
    identity: RequestIdentity<'_>,
    physical_resource_id: Option<&str>,
    resource_properties: &RawDeploymentRequest,
    old_resource_properties: Option<&RawDeploymentRequest>,
    deadlines: InvocationDeadlines,
) -> Result<ProcessedRequest> {
    let request = if request_type == "Delete" {
        parse_delete_request(resource_properties)?
    } else {
        parse_request(resource_properties)?
    };
    let physical_resource_id =
        response_physical_resource_id(request_type, identity, physical_resource_id, &request)?;
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

    let stats = Arc::new(DeploymentStats::new(state.detailed_failure_diagnostics));
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
    Ok(ProcessedRequest {
        request_type,
        request,
        stats,
        result: result.map(|()| success_body),
    })
}

fn validate_resource_type(request: &RequestEnvelope) -> Result<()> {
    let (resource_type, legacy_delete) = match request {
        CloudFormationCustomResourceRequest::Create(request) => (&request.resource_type, false),
        CloudFormationCustomResourceRequest::Update(request) => (&request.resource_type, false),
        CloudFormationCustomResourceRequest::Delete(request) => (&request.resource_type, true),
        _ => {
            return Err(anyhow!(
                "unsupported CloudFormation custom resource request type"
            ));
        }
    };

    ensure!(
        resource_type == RESOURCE_TYPE || (legacy_delete && resource_type == LEGACY_RESOURCE_TYPE),
        "unexpected CloudFormation ResourceType `{resource_type}`; expected the Shin custom resource protocol"
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
    let destination_change_cleanup = if request_type == "Update" {
        previous_destination.map(|previous| plan_destination_change_cleanup(request, previous))
    } else {
        None
    };
    let overlapping_previous_cleanup = previous_destination
        .filter(|previous| previous_namespace_is_within_current(request, previous))
        .map(|previous| {
            if matches!(
                destination_change_cleanup.as_ref(),
                Some(DestinationChangeCleanupDecision::Delete(plan))
                    if plan.strategy == PreviousCleanupStrategy::DeleteStaleWithinCurrent
            ) {
                OverlappingPreviousCleanup::DeleteStale {
                    prefix: previous.bucket_prefix.clone(),
                }
            } else {
                OverlappingPreviousCleanup::Retain {
                    prefix: previous.bucket_prefix.clone(),
                }
            }
        });

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
        deploy(
            state,
            request,
            overlapping_previous_cleanup.as_ref(),
            Arc::clone(&stats),
            deadlines,
        )
        .await?;
    }

    if let Some(destination_change_cleanup) = destination_change_cleanup {
        match destination_change_cleanup {
            DestinationChangeCleanupDecision::Delete(plan) => {
                if let PreviousCleanupStrategy::DeleteNamespace { excluded_prefix } = &plan.strategy
                {
                    let competing_owner = run_work(
                        deadlines,
                        "previous destination ownership check",
                        bucket_has_competing_owner(
                            state,
                            &plan.previous.bucket_name,
                            &plan.previous.bucket_prefix,
                            excluded_prefix.as_deref(),
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
                        let deleted = if let Some(excluded_prefix) = excluded_prefix.as_deref() {
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

fn destination_physical_resource_id(
    identity: RequestIdentity<'_>,
    request: &crate::types::DeploymentRequest,
) -> String {
    let mut hasher = Sha256::new();
    hash_identity_field(&mut hasher, "shin-bucket-deployment-physical-resource-v1");
    match request.destination_owner_id.as_deref() {
        Some(owner_id) => {
            hasher.update([1]);
            hash_identity_field(&mut hasher, owner_id);
        }
        None => {
            hasher.update([0]);
            hash_identity_field(&mut hasher, identity.stack_id);
            hash_identity_field(&mut hasher, identity.logical_resource_id);
        }
    }
    hash_identity_field(&mut hasher, &request.dest_bucket_name);
    hash_identity_field(&mut hasher, &request.dest_bucket_prefix);

    format!(
        "aws.cdk.shinbucketdeployment.{}",
        encode_hex(hasher.finalize().as_ref())
    )
}

fn response_physical_resource_id(
    request_type: &str,
    identity: RequestIdentity<'_>,
    physical_resource_id: Option<&str>,
    request: &crate::types::DeploymentRequest,
) -> Result<String> {
    match request_type {
        "Create" => Ok(destination_physical_resource_id(identity, request)),
        "Update" | "Delete" => physical_resource_id
            .map(ToOwned::to_owned)
            .ok_or_else(|| anyhow!("PhysicalResourceId is required for {request_type}")),
        other => Err(anyhow!("Unsupported request type: {other}")),
    }
}

fn hash_identity_field(hasher: &mut Sha256, value: &str) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value.as_bytes());
}

fn hash_caller_reference_field(hasher: &mut Md5, value: &str) {
    hasher.update((value.len() as u64).to_be_bytes());
    hasher.update(value.as_bytes());
}

fn finalize_md5(hasher: Md5) -> String {
    let digest = hasher.finalize();
    encode_hex(digest.as_ref())
}

fn encode_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

fn log_deployment_summary(
    stats: &DeploymentStats,
    request_type: &str,
    deployment_status: &str,
    request: &crate::types::DeploymentRequest,
) {
    match serde_json::to_string(&stats.snapshot(request_type, deployment_status, request)) {
        Ok(summary) => tracing::info!(summary, "shin deployment summary"),
        Err(error) => tracing::warn!(error = %error, "failed to serialize shin deployment summary"),
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
    use aws_sdk_cloudfront::Client as CloudFrontClient;
    use aws_sdk_s3::Client as S3Client;
    use aws_sdk_s3::primitives::SdkBody;
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};
    use reqwest::Client as HttpClient;
    use serde_json::{Value, json};
    use tokio::time::Instant as TokioInstant;

    use crate::deadline::InvocationDeadlines;
    use crate::request::{RawDeploymentRequest, parse_delete_request, parse_request};
    use crate::types::AppState;

    use super::{
        EnvelopeResponseTarget, LEGACY_RESOURCE_TYPE, RESOURCE_TYPE, RequestIdentity,
        cloudfront_caller_reference, decode_deployment_request, decode_request_envelope,
        decode_resource_properties, destination_physical_resource_id, merge_distribution_paths,
        preflight_invalidation_requests, process_request, response_physical_resource_id,
        response_target, serialize_response, success_payload, validate_resource_type,
    };

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

    fn deployment_request_for_destination(
        bucket: &str,
        prefix: &str,
        owner_id: Option<&str>,
    ) -> crate::types::DeploymentRequest {
        let raw: RawDeploymentRequest =
            serde_json::from_value(deployment_request_properties(bucket, prefix, owner_id))
                .expect("raw deployment request");
        parse_request(&raw).expect("valid request")
    }

    fn deployment_request_properties(bucket: &str, prefix: &str, owner_id: Option<&str>) -> Value {
        let mut value = json!({
            "SourceBucketNames": ["source"],
            "SourceObjectKeys": ["asset.zip"],
            "DestinationBucketName": bucket,
            "DestinationBucketKeyPrefix": prefix,
            "DestinationChecksumStrategy": "sse-s3-etag"
        });
        if let Some(owner_id) = owner_id {
            value["DestinationOwnerId"] = json!(owner_id);
        }
        value
    }

    fn legacy_v0_3_delete_properties(
        delete_current_objects_on_delete: bool,
    ) -> RawDeploymentRequest {
        serde_json::from_value(json!({
            "SourceBucketNames": ["legacy-source"],
            "SourceObjectKeys": ["legacy-asset.zip"],
            "SourceCatalogs": [{
                "Version": 1,
                "Sha256": "ab".repeat(32)
            }],
            "DestinationBucketName": "legacy-destination",
            "DestinationBucketKeyPrefix": "legacy-site",
            "DestinationOwnerId": "legacy01",
            "WaitForDistributionInvalidation": true,
            "DeleteCurrentObjectsOnDelete": delete_current_objects_on_delete,
            "Extract": true,
            "DeleteStaleObjectsOnDeployment": true,
            "SystemMetadata": {},
            "OutputObjectKeys": true,
            "AvailableMemoryMb": 1024
        }))
        .expect("released v0.3.0 resource properties")
    }

    fn replay_state(events: Vec<ReplayEvent>) -> (AppState, StaticReplayClient) {
        let replay = StaticReplayClient::new(events);
        let s3 = S3Client::from_conf(
            aws_sdk_s3::Config::builder()
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
                .http_client(replay.clone())
                .build(),
        );
        let state = AppState {
            source_s3: s3.clone(),
            destination_s3: s3,
            cloudfront: CloudFrontClient::from_conf(
                aws_sdk_cloudfront::Config::builder()
                    .behavior_version_latest()
                    .region(aws_sdk_cloudfront::config::Region::new("us-east-1"))
                    .credentials_provider(aws_sdk_cloudfront::config::Credentials::new(
                        "test-access-key",
                        "test-secret-key",
                        None,
                        None,
                        "shin-bucket-deployment-test",
                    ))
                    .build(),
            ),
            http: HttpClient::new(),
            detailed_failure_diagnostics: false,
        };
        (state, replay)
    }

    fn s3_xml_event(body: &'static [u8]) -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .expect("expected replay request"),
            Response::builder()
                .status(200)
                .header("content-type", "application/xml")
                .body(SdkBody::from(body))
                .expect("replay response"),
        )
    }

    fn test_deadlines() -> InvocationDeadlines {
        InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120))
    }

    #[test]
    fn deployment_summary_uses_diagnostics_schema_v4() {
        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let stats = crate::types::DeploymentStats::new(true);
        stats.add_marker_planning_pass();
        stats.add_marker_upload_pass();
        stats.add_trusted_catalog(3);
        stats.add_untrusted_catalog();
        stats.add_catalog_fallback_hash_attempt();
        stats.add_catalog_skip();
        stats.record_delete_sdk_call(5);
        stats.record_delete_response(3, 2);
        stats.record_delete_sdk_call(4);
        stats.record_delete_no_such_bucket(4);
        stats.record_callback_attempt(false);
        stats.record_callback_failure();
        stats.record_callback_attempt(true);
        stats.record_callback_success();
        stats.add_callback_millis(12);
        let summary = serde_json::to_value(stats.snapshot("Create", "success", &request))
            .expect("serializable summary");

        assert_eq!(summary["schemaVersion"], 4);
        assert_eq!(summary["detailedFailureDiagnosticsEnabled"], true);
        assert_eq!(summary["deploymentStatus"], "success");
        assert!(summary.get("status").is_none());
        assert_eq!(summary["transfer"]["scheduledObjects"], 0);
        assert_eq!(
            summary["markerReplacement"]["strategy"],
            "planning-plus-retryable-stream"
        );
        assert_eq!(summary["markerReplacement"]["plannedPassesPerUpload"], 2);
        assert_eq!(summary["markerReplacement"]["planningPasses"], 1);
        assert_eq!(summary["markerReplacement"]["uploadPasses"], 1);
        assert_eq!(summary["phaseMs"]["callback"], 12);
        assert_eq!(summary["catalog"]["trustedArchives"], 1);
        assert_eq!(summary["catalog"]["untrustedArchives"], 1);
        assert_eq!(summary["catalog"]["trustedEntries"], 3);
        assert_eq!(summary["catalog"]["fallbackHashAttempts"], 1);
        assert_eq!(summary["catalog"]["sparseSkips"], 1);
        assert_eq!(summary["counts"]["catalogSkips"], 1);
        assert_eq!(summary["counts"]["skippedObjects"], 1);
        assert_eq!(summary["source"]["getAttempts"], 0);
        assert_eq!(summary["source"]["bodyReplays"], 0);
        assert_eq!(summary["source"]["globalBudgetBytes"], 0);
        assert_eq!(summary["source"]["globalResidentBytesCurrent"], 0);
        assert_eq!(summary["source"]["globalResidentBytesHighWater"], 0);
        assert_eq!(summary["counts"]["destinationMetadataRetained"], 0);
        assert_eq!(summary["counts"]["destinationPageObjectsHighWater"], 0);
        assert_eq!(summary["putObject"]["wireAttempts"], 0);
        assert_eq!(summary["putObject"]["failuresBySdkErrorKind"], json!({}));
        assert_eq!(summary["putObject"]["failuresByServiceCode"], json!({}));
        assert_eq!(summary["putObject"]["failureStates"], json!([]));
        assert_eq!(summary["putObject"]["failureStateOverflowAttempts"], 0);
        assert_eq!(summary["counts"]["deleteObjects"], 3);
        assert_eq!(summary["deleteObject"]["sdkCalls"], 2);
        assert_eq!(summary["deleteObject"]["failedCalls"], 1);
        assert_eq!(summary["deleteObject"]["requestedObjects"], 9);
        assert_eq!(summary["deleteObject"]["inferredDeletedObjects"], 3);
        assert_eq!(summary["deleteObject"]["unconfirmedObjects"], 2);
        assert_eq!(
            summary["deleteObject"]["noSuchBucketRequestedIdentifiers"],
            4
        );
        assert_eq!(summary["callback"]["wireAttempts"], 2);
        assert_eq!(summary["callback"]["failedAttempts"], 1);
        assert_eq!(summary["callback"]["retryAttempts"], 1);
        assert_eq!(summary["callback"]["confirmedResponses"], 1);
    }

    #[test]
    fn deployment_summary_bounds_and_merges_put_failure_diagnostics() {
        use std::collections::BTreeMap;

        use crate::types::{
            DiagnosticRangeStats, PutObjectFailureBodyStats, PutObjectFailureSourceStats,
            PutObjectFailureStateStats, PutObjectStats,
        };

        fn range(value: u64) -> DiagnosticRangeStats {
            DiagnosticRangeStats {
                min: value,
                max: value,
                total: value,
            }
        }
        fn failure(code: &str, elapsed_ms: u64) -> PutObjectFailureStateStats {
            PutObjectFailureStateStats {
                count: 1,
                sdk_error_kind: "ServiceError".to_string(),
                dispatch_failure_kind: None,
                service_code: Some(code.to_string()),
                elapsed_ms: range(elapsed_ms),
                body: PutObjectFailureBodyStats {
                    attempt_observed: false,
                    replay: false,
                    producer_stage: "not-observed".to_string(),
                    final_frame_delivered: false,
                    producer_completed: false,
                    body_error_observed: false,
                    receiver_dropped: false,
                    receiver_drop_aborted_producer: false,
                    attempt_number: range(0),
                    bytes_emitted: range(0),
                    remaining_bytes: range(0),
                },
                source: PutObjectFailureSourceStats {
                    observed: false,
                    local_window_bytes: range(0),
                    local_committed_bytes: range(0),
                    local_resident_bytes: range(0),
                    local_capacity_waiters: range(0),
                    global_budget_bytes: range(0),
                    global_resident_bytes: range(0),
                    global_available_permits: range(0),
                    global_permit_unit_bytes: range(0),
                    global_permit_waiters: range(0),
                    active_fetches: range(0),
                },
            }
        }

        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let stats = crate::types::DeploymentStats::new(true);
        let first = failure("Code0", 10);
        stats.add_put_stats(&PutObjectStats {
            wire_attempts: 2,
            failed_attempts: 2,
            failures_by_sdk_error_kind: BTreeMap::from([("ServiceError".to_string(), 2)]),
            failures_by_service_code: BTreeMap::from([("Code0".to_string(), 2)]),
            failure_states: vec![first.clone(), failure("Code0", 20)],
            ..PutObjectStats::default()
        });
        stats.add_put_stats(&PutObjectStats {
            wire_attempts: 32,
            failed_attempts: 32,
            failures_by_sdk_error_kind: BTreeMap::from([("ServiceError".to_string(), 32)]),
            failures_by_service_code: (1..=32).map(|index| (format!("Code{index}"), 1)).collect(),
            failure_states: (1..=32)
                .map(|index| failure(&format!("Code{index}"), index))
                .collect(),
            ..PutObjectStats::default()
        });
        stats.record_callback_attempt(true);
        stats.record_callback_success();

        let summary = serde_json::to_value(stats.snapshot("Create", "success", &request))
            .expect("serializable summary");
        assert_eq!(
            summary["putObject"]["failuresBySdkErrorKind"]["ServiceError"],
            34
        );
        assert_eq!(
            summary["putObject"]["failuresByServiceCode"]
                .as_object()
                .expect("service-code map")
                .len(),
            32
        );
        assert_eq!(summary["putObject"]["failuresByServiceCode"]["Other"], 2);
        assert_eq!(
            summary["putObject"]["failureStates"]
                .as_array()
                .expect("failure states")
                .len(),
            32
        );
        assert_eq!(summary["putObject"]["failureStates"][0]["count"], 2);
        assert_eq!(
            summary["putObject"]["failureStates"][0]["elapsedMs"]["min"],
            10
        );
        assert_eq!(
            summary["putObject"]["failureStates"][0]["elapsedMs"]["max"],
            20
        );
        assert_eq!(
            summary["putObject"]["failureStates"][0]["elapsedMs"]["total"],
            30
        );
        assert_eq!(summary["putObject"]["failureStateOverflowAttempts"], 1);
    }

    #[test]
    fn deployment_summary_marks_disabled_failure_diagnostics_and_omits_detail() {
        use std::collections::BTreeMap;

        use crate::types::PutObjectStats;

        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let stats = crate::types::DeploymentStats::default();
        stats.add_put_stats(&PutObjectStats {
            wire_attempts: 1,
            failed_attempts: 1,
            failures_by_sdk_error_kind: BTreeMap::from([("ServiceError".to_string(), 1)]),
            failures_by_service_code: BTreeMap::from([("RequestTimeout".to_string(), 1)]),
            failure_state_overflow_attempts: 1,
            ..PutObjectStats::default()
        });

        let summary = serde_json::to_value(stats.snapshot("Create", "failed", &request))
            .expect("serializable summary");
        assert_eq!(summary["schemaVersion"], 4);
        assert_eq!(summary["detailedFailureDiagnosticsEnabled"], false);
        assert_eq!(summary["putObject"]["failedAttempts"], 1);
        assert_eq!(summary["putObject"]["failuresBySdkErrorKind"], json!({}));
        assert_eq!(summary["putObject"]["failuresByServiceCode"], json!({}));
        assert_eq!(summary["putObject"]["failureStates"], json!([]));
        assert_eq!(summary["putObject"]["failureStateOverflowAttempts"], 0);
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

        let legacy = decode_request_envelope(json!({
            "RequestType": "Delete",
            "RequestId": "request-legacy",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": LEGACY_RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "PhysicalResourceId": "legacy-physical-id",
            "ResourceProperties": {
                "SourceBucketNames": ["source"],
                "SourceObjectKeys": ["asset.zip"],
                "DestinationBucketName": "destination"
            }
        }))
        .expect("legacy envelope");
        assert!(validate_resource_type(&legacy).is_ok());
        let decoded_legacy = decode_deployment_request(&legacy).expect("decoded legacy Delete");
        let legacy_request = parse_delete_request(&decoded_legacy.resource_properties)
            .expect("legacy Delete properties must not require write-only fields");
        assert!(!legacy_request.delete_current_objects_on_delete);

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

    #[tokio::test]
    async fn released_legacy_delete_properties_process_retain_and_destructive_lifecycles() {
        let identity = RequestIdentity {
            stack_id: "legacy-stack",
            request_id: "legacy-delete",
            logical_resource_id: "LegacyDeploy",
        };

        let retained = legacy_v0_3_delete_properties(false);
        let (state, replay) = replay_state(Vec::new());
        let processed = process_request(
            &state,
            "Delete",
            identity,
            Some("legacy-physical-id"),
            &retained,
            None,
            test_deadlines(),
        )
        .await
        .expect("retaining legacy Delete must parse");
        processed
            .result
            .expect("retaining legacy Delete must complete successfully");
        assert_eq!(replay.actual_requests().count(), 0);

        let destructive = legacy_v0_3_delete_properties(true);
        let (state, replay) = replay_state(vec![
            s3_xml_event(b"<Tagging><TagSet></TagSet></Tagging>"),
            s3_xml_event(
                b"<ListBucketResult><Name>legacy-destination</Name><Prefix>legacy-site/</Prefix><KeyCount>0</KeyCount><MaxKeys>1000</MaxKeys><IsTruncated>false</IsTruncated></ListBucketResult>",
            ),
        ]);
        let processed = process_request(
            &state,
            "Delete",
            identity,
            Some("legacy-physical-id"),
            &destructive,
            None,
            test_deadlines(),
        )
        .await
        .expect("destructive legacy Delete must parse");
        processed
            .result
            .expect("destructive legacy Delete must complete successfully");

        let requests = replay.actual_requests().collect::<Vec<_>>();
        assert_eq!(requests.len(), 2);
        assert!(requests[0].uri().contains("legacy-destination"));
        assert!(requests[0].uri().contains("tagging"));
        assert!(requests[1].uri().contains("legacy-destination"));
        assert!(requests[1].uri().contains("list-type=2"));
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
    fn physical_resource_id_is_stable_for_the_same_owned_destination() {
        let request = deployment_request_for_destination("destination", "site", Some("owner-a"));
        let first_identity = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-a",
            logical_resource_id: "DeployA",
        };
        let replacement_identity = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-b",
            logical_resource_id: "DeployA",
        };

        let first = destination_physical_resource_id(first_identity, &request);
        let replacement = destination_physical_resource_id(replacement_identity, &request);

        assert_eq!(first, replacement);
        assert!(first.starts_with("aws.cdk.shinbucketdeployment."));
        assert_eq!(first.len(), "aws.cdk.shinbucketdeployment.".len() + 64);
    }

    #[test]
    fn create_physical_resource_id_changes_with_destination_identity() {
        let identity = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-a",
            logical_resource_id: "Deploy",
        };
        let baseline = deployment_request_for_destination("destination", "site", Some("owner-a"));
        let changed_bucket =
            deployment_request_for_destination("other-destination", "site", Some("owner-a"));
        let changed_prefix =
            deployment_request_for_destination("destination", "other-site", Some("owner-a"));
        let changed_owner =
            deployment_request_for_destination("destination", "site", Some("owner-b"));

        let baseline_id = destination_physical_resource_id(identity, &baseline);
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(identity, &changed_bucket)
        );
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(identity, &changed_prefix)
        );
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(identity, &changed_owner)
        );
    }

    #[test]
    fn update_protocol_preserves_physical_resource_id_across_destination_moves() {
        let identity = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-a",
            logical_resource_id: "Deploy",
        };

        for (previous_bucket, previous_prefix, current_bucket, current_prefix) in [
            ("destination", "site", "destination", "site/assets"),
            ("destination", "site/assets", "destination", "site"),
            ("destination", "site/left", "destination", "site/right"),
            ("destination", "site", "other-destination", "site"),
        ] {
            let previous = deployment_request_for_destination(
                previous_bucket,
                previous_prefix,
                Some("owner-a"),
            );
            let current =
                deployment_request_for_destination(current_bucket, current_prefix, Some("owner-a"));
            let incoming_id = destination_physical_resource_id(identity, &previous);

            assert_ne!(
                incoming_id,
                destination_physical_resource_id(identity, &current),
                "the regression requires a destination change that alters the derived ID"
            );

            let envelope = decode_request_envelope(json!({
                "RequestType": "Update",
                "RequestId": "request-a",
                "ResponseURL": "https://example.com/response",
                "StackId": "stack-a",
                "ResourceType": RESOURCE_TYPE,
                "LogicalResourceId": "Deploy",
                "PhysicalResourceId": incoming_id,
                "ResourceProperties": deployment_request_properties(
                    current_bucket,
                    current_prefix,
                    Some("owner-a"),
                ),
                "OldResourceProperties": deployment_request_properties(
                    previous_bucket,
                    previous_prefix,
                    Some("owner-a"),
                ),
            }))
            .expect("Update envelope");
            let decoded = decode_deployment_request(&envelope).expect("decoded Update request");
            let decoded_current = parse_request(&decoded.resource_properties)
                .expect("decoded current deployment request");
            let decoded_previous = parse_request(
                decoded
                    .old_resource_properties
                    .as_ref()
                    .expect("Update OldResourceProperties"),
            )
            .expect("decoded previous deployment request");

            assert_eq!(decoded_current.dest_bucket_name, current_bucket);
            assert_eq!(decoded_current.dest_bucket_prefix, current_prefix);
            assert_eq!(decoded_previous.dest_bucket_name, previous_bucket);
            assert_eq!(decoded_previous.dest_bucket_prefix, previous_prefix);

            let response_id = response_physical_resource_id(
                decoded.request_type,
                decoded.identity,
                decoded.physical_resource_id,
                &decoded_current,
            )
            .expect("Update physical resource ID");
            let payload = success_payload(&decoded_current, response_id)
                .expect("CloudFormation success payload");
            let response = serialize_response(
                decoded.identity.stack_id,
                decoded.identity.request_id,
                decoded.identity.logical_resource_id,
                "SUCCESS",
                &payload,
            )
            .expect("serialized CloudFormation response");
            let response: Value =
                serde_json::from_slice(&response).expect("CloudFormation response JSON");

            assert_eq!(response["Status"], "SUCCESS");
            assert_eq!(
                response["PhysicalResourceId"], incoming_id,
                "Update must not turn a destination move into a replacement"
            );
        }
    }

    #[test]
    fn create_derives_and_delete_preserves_the_physical_resource_id() {
        let identity = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-a",
            logical_resource_id: "Deploy",
        };
        let request = deployment_request_for_destination("destination", "site", Some("owner-a"));
        let derived_id = destination_physical_resource_id(identity, &request);

        assert_eq!(
            response_physical_resource_id("Create", identity, None, &request)
                .expect("Create physical resource ID"),
            derived_id
        );
        assert_eq!(
            response_physical_resource_id("Delete", identity, Some(&derived_id), &request)
                .expect("Delete physical resource ID"),
            derived_id
        );
    }

    #[test]
    fn physical_resource_id_falls_back_to_cloudformation_identity_without_an_owner() {
        let request = deployment_request_for_destination("destination", "", None);
        let first = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-a",
            logical_resource_id: "DeployA",
        };
        let retry = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-b",
            logical_resource_id: "DeployA",
        };
        let other_resource = RequestIdentity {
            stack_id: "stack-a",
            request_id: "request-c",
            logical_resource_id: "DeployB",
        };

        assert_eq!(
            destination_physical_resource_id(first, &request),
            destination_physical_resource_id(retry, &request)
        );
        assert_ne!(
            destination_physical_resource_id(first, &request),
            destination_physical_resource_id(other_resource, &request)
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
    fn malformed_and_unknown_envelopes_retain_a_failure_callback_target() {
        let malformed = json!({
            "RequestType": "Create",
            "RequestId": "request-malformed",
            "ResponseURL": "https://example.com/response?signature=secret",
            "StackId": "stack-123",
            "ResourceType": 42,
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {}
        });
        let target = EnvelopeResponseTarget::from_payload(&malformed)
            .expect("malformed envelope callback target");

        assert_eq!(target.request_id, "request-malformed");
        assert!(decode_request_envelope(malformed).is_err());

        let unknown = json!({
            "RequestType": "Unexpected",
            "RequestId": "request-unknown",
            "ResponseURL": "https://example.com/response?signature=secret",
            "StackId": "stack-123",
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {}
        });
        let target = EnvelopeResponseTarget::from_payload(&unknown)
            .expect("unknown envelope callback target");
        assert_eq!(target.logical_resource_id, "Deploy");
        if let Ok(request) = decode_request_envelope(unknown) {
            assert!(response_target(&request).is_none());
        }
    }
}
