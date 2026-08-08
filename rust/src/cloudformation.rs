use std::collections::HashSet;
use std::future::Future;
use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow, ensure};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use md5::{Digest, Md5};
use serde::Deserialize;
use serde_json::{Map, Value, json};
use sha2::Sha256;
use tokio::time::timeout_at;
use tracing::error;

use crate::cloudfront::{create_invalidation, validate_invalidation_paths, wait_for_invalidation};
use crate::deadline::InvocationDeadlines;
use crate::lifecycle::{
    DestinationChangeCleanupDecision, PreviousCleanupStrategy, destination_namespaces_overlap,
    plan_destination_change_cleanup, previous_distribution_authorized,
    previous_namespace_is_within_current,
};
use crate::request::{RawDeploymentRequest, parse_old_destination, parse_request};
use crate::s3::{
    GuardedDeleteContext, GuardedDeleteOutcome, OverlappingPreviousCleanup, deploy,
    guarded_delete_namespace,
};
use crate::types::{AppState, DeploymentStats, ResponsePayload};
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, duration_ms, finalize_digest, sanitize_diagnostic};

mod callback;

use callback::{
    physical_resource_id, response_target, sanitize_failure_reason, send_response,
    serialize_failure_response, serialize_response, validate_response_body_size,
    validate_response_url,
};

const RESOURCE_TYPE: &str = "AWS::CloudFormation::CustomResource";

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
                    let reason = sanitize_failure_reason(&format!("{err:#}"));
                    error!(error = %reason, "request failed");
                    send_failure_response(
                        &state,
                        &response_url,
                        stack_id,
                        request_id,
                        logical_resource_id,
                        physical_resource_id(&request)
                            .map(ToOwned::to_owned)
                            .unwrap_or_else(|| request_id.to_string()),
                        reason,
                        deadlines,
                        Some(&processed.stats),
                        "failed to send failure response",
                    )
                    .await
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
            let reason = sanitize_failure_reason(&format!("{err:#}"));
            error!(error = %reason, "request failed");
            send_failure_response(
                &state,
                &response_url,
                stack_id,
                request_id,
                logical_resource_id,
                physical_resource_id(&request)
                    .map(ToOwned::to_owned)
                    .unwrap_or_else(|| request_id.to_string()),
                reason,
                deadlines,
                None,
                "failed to send failure response",
            )
            .await?;
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
    let reason = sanitize_failure_reason(&format!("{error:#}"));
    // Without this the `?` would surface only the URL error and drop the envelope
    // failure we were called to report. `validate_response_url` deliberately does not
    // echo the URL, and this same reason is logged and returned to CloudFormation
    // whenever the URL is usable, so carrying it here matches the exposure the
    // success path already accepts.
    let response_url = validate_response_url(&target.response_url)
        .with_context(|| format!("while reporting envelope failure: {reason}"))?;
    error!(error = %reason, "request envelope failed");
    send_failure_response(
        state,
        &response_url,
        &target.stack_id,
        &target.request_id,
        &target.logical_resource_id,
        target
            .physical_resource_id
            .unwrap_or_else(|| target.request_id.clone()),
        reason,
        deadlines,
        None,
        "failed to send request-envelope failure response",
    )
    .await?;
    Ok(json!({}))
}

#[allow(clippy::too_many_arguments)]
async fn send_failure_response(
    state: &AppState,
    response_url: &reqwest::Url,
    stack_id: &str,
    request_id: &str,
    logical_resource_id: &str,
    physical_resource_id: String,
    reason: String,
    deadlines: InvocationDeadlines,
    stats: Option<&DeploymentStats>,
    failure_context: &'static str,
) -> Result<()> {
    let failure = ResponsePayload {
        physical_resource_id,
        reason: Some(reason),
        data: Map::new(),
    };
    let body = serialize_failure_response(stack_id, request_id, logical_resource_id, &failure)?;
    send_response(
        &state.http,
        response_url,
        &body,
        deadlines.callback(),
        stats,
    )
    .await
    .context(failure_context)
}

fn decode_request_envelope(payload: Value) -> Result<RequestEnvelope> {
    serde_json::from_value(payload).context("failed to deserialize CloudFormation request envelope")
}

/// Deserializes straight out of the borrowed `Value`. `serde_json::from_value` would first
/// clone the whole property tree, which for a large source/marker payload is a full copy
/// discarded immediately afterwards.
fn decode_resource_properties(value: &Value, label: &str) -> Result<RawDeploymentRequest> {
    RawDeploymentRequest::deserialize(value)
        .with_context(|| format!("failed to deserialize {label}"))
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
    let DecodedRequest {
        request_type,
        identity,
        physical_resource_id,
        resource_properties,
        old_resource_properties,
    } = decoded;
    process_request(
        state,
        request_type,
        identity,
        physical_resource_id,
        resource_properties,
        old_resource_properties.as_ref(),
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
    resource_properties: RawDeploymentRequest,
    old_resource_properties: Option<&RawDeploymentRequest>,
    deadlines: InvocationDeadlines,
) -> Result<ProcessedRequest> {
    let request = parse_request(resource_properties)?;
    let physical_resource_id =
        response_physical_resource_id(request_type, physical_resource_id, &request)?;
    let success = success_payload(&request, physical_resource_id.clone())?;
    let success_body = serialize_response(
        identity.stack_id,
        identity.request_id,
        identity.logical_resource_id,
        "SUCCESS",
        &success,
    )?;
    validate_response_body_size(&success_body, request.output_object_keys)?;

    let previous_destination = old_resource_properties
        .map(parse_old_destination)
        .transpose()?;
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
        "unexpected CloudFormation ResourceType `{}`; expected the Shin custom resource protocol",
        sanitize_diagnostic(resource_type, MAX_DIAGNOSTIC_VALUE_BYTES)
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
        match run_work(
            deadlines,
            "guarded current destination cleanup",
            guarded_delete_namespace(
                state,
                GuardedDeleteContext {
                    bucket: &request.dest_bucket_name,
                    prefix: &request.dest_bucket_prefix,
                    excluded_prefix: None,
                    current_owner_id: &request.destination_owner_id,
                    stats: Some(&stats),
                    retry: &request.runtime.put_object_retry,
                    work_deadline: deadlines.work(),
                },
            ),
        )
        .await?
        {
            GuardedDeleteOutcome::Retained => tracing::warn!(
                "destination cleanup retained because another custom resource owns an overlapping namespace"
            ),
            GuardedDeleteOutcome::Deleted { objects, elapsed } => {
                deleted_current_destination = objects > 0;
                stats.add_delete_millis(duration_ms(elapsed));
            }
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
                    match run_work(
                        deadlines,
                        "guarded previous destination cleanup",
                        guarded_delete_namespace(
                            state,
                            GuardedDeleteContext {
                                bucket: &plan.previous.bucket_name,
                                prefix: &plan.previous.bucket_prefix,
                                excluded_prefix: excluded_prefix.as_deref(),
                                current_owner_id: &request.destination_owner_id,
                                stats: Some(&stats),
                                retry: &request.runtime.put_object_retry,
                                work_deadline: deadlines.work(),
                            },
                        ),
                    )
                    .await?
                    {
                        GuardedDeleteOutcome::Retained => tracing::warn!(
                            "previous destination retained because another custom resource owns an overlapping namespace"
                        ),
                        GuardedDeleteOutcome::Deleted { objects, elapsed } => {
                            stats.add_old_prefix_delete_millis(duration_ms(elapsed));
                            if objects > 0 {
                                cleaned_previous_destination = Some(plan.previous);
                            }
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

    invalidate_distributions(
        state,
        execution,
        request_type,
        previous_destination,
        request,
        cleaned_previous_destination.is_some(),
        deleted_current_destination,
        &stats,
    )
    .await?;
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn invalidate_distributions(
    state: &AppState,
    execution: RequestExecution<'_>,
    request_type: &str,
    previous_destination: Option<&crate::types::PreviousDestination>,
    request: &crate::types::DeploymentRequest,
    previous_destination_cleaned: bool,
    deleted_current_destination: bool,
    stats: &DeploymentStats,
) -> Result<()> {
    let should_invalidate_current = match request_type {
        "Create" | "Update" => true,
        "Delete" => deleted_current_destination,
        _ => false,
    };

    let previous_content_changed = previous_destination.is_some_and(|previous| {
        previous_destination_cleaned || destination_namespaces_overlap(request, previous)
    });

    let started = Instant::now();
    let previous_invalidation = if previous_content_changed
        && let Some(previous) = previous_destination
        && previous.distribution_id != request.distribution_id
        && let Some(distribution_id) = non_empty(previous.distribution_id.as_deref())
    {
        if previous_distribution_authorized(request, previous) {
            create_distribution_invalidation(
                state,
                execution,
                distribution_id,
                &previous.distribution_paths,
                request.wait_for_distribution_invalidation,
                true,
            )
            .await?
        } else {
            tracing::warn!(
                "previous distribution was not invalidated because it was not explicitly authorized"
            );
            None
        }
    } else {
        None
    };

    let current_invalidation = if should_invalidate_current
        && let Some(distribution_id) = non_empty(request.distribution_id.as_deref())
    {
        let distribution_paths = match previous_destination {
            Some(previous)
                if previous_content_changed
                    && previous.distribution_id == request.distribution_id =>
            {
                merge_distribution_paths(&request.distribution_paths, &previous.distribution_paths)
            }
            _ => request.distribution_paths.clone(),
        };

        create_distribution_invalidation(
            state,
            execution,
            distribution_id,
            &distribution_paths,
            request.wait_for_distribution_invalidation,
            request_type == "Delete",
        )
        .await?
    } else {
        None
    };

    // Both invalidations are created before either completion wait starts, so the
    // two waits run concurrently against the shared work deadline instead of
    // serializing their 20-second poll cadences (P-3).
    if request.wait_for_distribution_invalidation {
        let previous_wait = wait_distribution_invalidation(
            state,
            previous_invalidation,
            execution.deadlines.work(),
        );
        let current_wait =
            wait_distribution_invalidation(state, current_invalidation, execution.deadlines.work());
        tokio::try_join!(previous_wait, current_wait)?;
    }
    stats.add_cloudfront_millis(duration_ms(started.elapsed()));
    Ok(())
}

async fn create_distribution_invalidation(
    state: &AppState,
    execution: RequestExecution<'_>,
    distribution_id: &str,
    distribution_paths: &[String],
    wait_for_completion: bool,
    missing_distribution_is_success: bool,
) -> Result<Option<crate::cloudfront::CreatedInvalidation>> {
    create_invalidation(
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
    .await
}

async fn wait_distribution_invalidation(
    state: &AppState,
    created: Option<crate::cloudfront::CreatedInvalidation>,
    deadline: tokio::time::Instant,
) -> Result<()> {
    let Some(created) = created else {
        return Ok(());
    };
    wait_for_invalidation(state, created, deadline).await
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

    format!("shin-bucket-deployment-{}", finalize_digest(hasher))
}

fn destination_physical_resource_id(request: &crate::types::DeploymentRequest) -> String {
    let mut hasher = Sha256::new();
    hash_identity_field(&mut hasher, "shin-bucket-deployment-physical-resource-v1");
    hash_identity_field(&mut hasher, &request.destination_owner_id);
    hash_identity_field(&mut hasher, &request.dest_bucket_name);
    hash_identity_field(&mut hasher, &request.dest_bucket_prefix);

    format!("aws.cdk.shinbucketdeployment.{}", finalize_digest(hasher))
}

fn response_physical_resource_id(
    request_type: &str,
    physical_resource_id: Option<&str>,
    request: &crate::types::DeploymentRequest,
) -> Result<String> {
    match request_type {
        "Create" => Ok(destination_physical_resource_id(request)),
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

fn log_deployment_summary(
    stats: &DeploymentStats,
    request_type: &str,
    deployment_status: &str,
    request: &crate::types::DeploymentRequest,
) {
    if !tracing::enabled!(tracing::Level::INFO) {
        // The summary is only ever emitted at INFO, so snapshotting and serializing
        // it when the level is disabled is pure wasted work.
        return;
    }
    match serde_json::to_string(&stats.snapshot(request_type, deployment_status, request)) {
        Ok(summary) => tracing::info!(summary, "shin deployment summary"),
        Err(error) => {
            let error = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            tracing::warn!(error = %error, "failed to serialize shin deployment summary");
        }
    }
}

#[cfg(test)]
mod tests {
    use anyhow::anyhow;
    use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
    use serde_json::{Value, json};

    use crate::deadline::InvocationDeadlines;
    use crate::request::parse_request_with_memory;
    use crate::types::AppState;

    use super::{
        EnvelopeResponseTarget, RESOURCE_TYPE, RequestExecution, RequestIdentity,
        cloudfront_caller_reference, decode_deployment_request, decode_request_envelope,
        decode_resource_properties, destination_physical_resource_id, invalidate_distributions,
        merge_distribution_paths, preflight_invalidation_requests, response_physical_resource_id,
        response_target, serialize_response, success_payload, validate_resource_type,
    };

    fn deployment_request_with_paths(paths: Vec<String>) -> crate::types::DeploymentRequest {
        crate::types::DeploymentRequest {
            distribution_id: Some("distribution".to_string()),
            distribution_paths: paths,
            destination_owner_id: "summary-owner".to_string(),
            ..crate::types::DeploymentRequest::for_test()
        }
    }

    fn deployment_request_for_destination(
        bucket: &str,
        prefix: &str,
        owner_id: &str,
    ) -> crate::types::DeploymentRequest {
        crate::types::DeploymentRequest {
            dest_bucket_name: bucket.to_string(),
            dest_bucket_prefix: prefix.to_string(),
            destination_owner_id: owner_id.to_string(),
            ..crate::types::DeploymentRequest::for_test()
        }
    }

    /// Raw `ResourceProperties` JSON for envelope round-trip tests; the raw schema is
    /// the point of those tests, so it stays spelled out here.
    fn deployment_request_properties(bucket: &str, prefix: &str, owner_id: &str) -> Value {
        json!({
            "SourceBucketNames": ["source"],
            "SourceObjectKeys": ["asset.zip"],
            "Destination": {
                "BucketName": bucket,
                "KeyPrefix": prefix
            },
            "DestinationOwnerId": owner_id,
            "SourceProcessing": {
                "MaxUncompressedEntryBytes": 1073741824,
                "MaxCompressionRatio": 100
            },
            "DestinationLifecycle": {
                "OnDeploy": {},
                "OnChange": {},
                "OnDelete": {}
            },
            "CloudfrontInvalidation": {},
            "Transfer": {
                "AdvancedTuning": {
                    "DestinationWriteRetry": {}
                }
            }
        })
    }

    /// The pre-rename wire names, kept to pin the clean-break rejection behavior:
    /// an `OldResourceProperties` payload using them must fail loudly rather than
    /// being partially parsed into a wrong previous-namespace decision.
    fn legacy_wire_properties(bucket: &str, prefix: &str, owner_id: &str) -> Value {
        json!({
            "SourceBucketNames": ["source"],
            "SourceObjectKeys": ["asset.zip"],
            "DestinationBucketName": bucket,
            "DestinationBucketKeyPrefix": prefix,
            "DestinationOwnerId": owner_id,
            "MaxUncompressedEntryBytes": 1073741824,
            "MaxCompressionRatio": 100
        })
    }

    #[test]
    fn deployment_summary_matches_the_diagnostics_contract() {
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
        stats.add_copy_stats(&crate::types::CopyObjectStats {
            wire_attempts: 7,
            failed_attempts: 2,
            retry_attempts: 3,
            throttled_attempts: 1,
            retry_wait_ms: 250,
            throttle_cooldown_waits: 4,
            throttle_cooldown_wait_ms: 900,
        });
        let summary = serde_json::to_value(stats.snapshot("Create", "success", &request))
            .expect("serializable summary");

        // Copy diagnostics aggregate into their own section and stay independent of
        // the PutObject counters, which remain zero for an `extract:false` deployment.
        let copy_object = summary["copyObject"]
            .as_object()
            .expect("copyObject section");
        assert_eq!(copy_object["wireAttempts"], 7);
        assert_eq!(copy_object["failedAttempts"], 2);
        assert_eq!(copy_object["retryAttempts"], 3);
        assert_eq!(copy_object["throttledAttempts"], 1);
        assert_eq!(copy_object["retryWaitMs"], 250);
        assert_eq!(copy_object["throttleCooldownWaits"], 4);
        assert_eq!(copy_object["throttleCooldownWaitMs"], 900);
        // Exactly the seven counters a copy can produce; the PutObject-only failure
        // breakdowns are omitted rather than reported as empty.
        assert_eq!(
            copy_object.keys().map(String::as_str).collect::<Vec<_>>(),
            vec![
                "wireAttempts",
                "failedAttempts",
                "retryAttempts",
                "throttledAttempts",
                "retryWaitMs",
                "throttleCooldownWaits",
                "throttleCooldownWaitMs",
            ]
        );
        assert_eq!(summary["putObject"]["wireAttempts"], 0);
        assert_eq!(summary["putObject"]["retryAttempts"], 0);
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
        assert_eq!(summary["source"]["globalReleaseAnomalies"], 0);
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
            "ResourceProperties": deployment_request_properties(
                "destination",
                "",
                "resource-type-owner"
            )
        }))
        .expect("valid envelope");
        assert!(validate_resource_type(&valid).is_ok());
        assert!(decode_deployment_request(&valid).is_ok());

        let invalid_delete = decode_request_envelope(json!({
            "RequestType": "Delete",
            "RequestId": "request-delete",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": "Custom::UnsupportedProvider",
            "LogicalResourceId": "Deploy",
            "PhysicalResourceId": "physical-id",
            "ResourceProperties": deployment_request_properties(
                "destination",
                "",
                "invalid-delete-owner"
            )
        }))
        .expect("invalid Delete resource type still forms an envelope");
        let error = decode_deployment_request(&invalid_delete)
            .err()
            .expect("an alternate Delete resource type must fail");
        assert!(
            error
                .to_string()
                .contains("unexpected CloudFormation ResourceType")
        );

        let invalid = decode_request_envelope(json!({
            "RequestType": "Create",
            "RequestId": "request-123",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": "Custom::WrongProvider",
            "LogicalResourceId": "Deploy",
            "ResourceProperties": deployment_request_properties(
                "destination",
                "",
                "invalid-resource-owner"
            )
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

        let hostile_type = format!("Custom::Wrong\r\nforged\u{2028}{}", "x".repeat(400));
        let hostile = decode_request_envelope(json!({
            "RequestType": "Create",
            "RequestId": "request-hostile",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": hostile_type,
            "LogicalResourceId": "Deploy",
            "ResourceProperties": deployment_request_properties(
                "destination",
                "",
                "hostile-resource-owner"
            )
        }))
        .expect("hostile resource type still forms an envelope");
        let error = validate_resource_type(&hostile)
            .expect_err("hostile resource type must fail")
            .to_string();
        assert!(error.contains("Custom::Wrong\\r\\nforged\\u{2028}"));
        assert!(error.contains(" ... [truncated]"));
        assert!(!error.chars().any(char::is_control));
        assert!(error.len() < 400);
    }

    #[test]
    fn delete_requires_the_current_request_schema() {
        // The Delete path must decode through the same strict decoder as every
        // other request type: a complete Delete envelope carrying the
        // pre-rename flat wire names (the previous template's shape) must be
        // rejected by the envelope decoder, never parsed into a current-schema
        // request. This pins the operator-visible behavior: a Delete delivered
        // from a template that still has the old names strands the stack in
        // DELETE_FAILED, which the breaking-changes recovery documents.
        let legacy_delete = decode_request_envelope(json!({
            "RequestType": "Delete",
            "RequestId": "request-delete-schema",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "PhysicalResourceId": "physical-id",
            "ResourceProperties": legacy_wire_properties(
                "destination",
                "",
                "delete-schema-owner"
            )
        }))
        .expect("legacy Delete resource properties still form an envelope");
        let error = decode_deployment_request(&legacy_delete)
            .err()
            .expect("Delete must not relax the strict current request schema");
        assert!(
            error
                .to_string()
                .contains("failed to deserialize ResourceProperties"),
            "unexpected error: {error}"
        );
        assert!(
            format!("{error:#}").contains("DestinationBucketName"),
            "unexpected error: {error}"
        );

        // A Delete that decodes cleanly still runs the same cross-field
        // validation as every other request type (the parse inside
        // process_request): one catalog descriptor for two declared sources
        // must fail the same way it fails Create and Update.
        let mut delete_properties =
            deployment_request_properties("destination", "", "delete-schema-owner");
        // One catalog descriptor for two declared sources: a Delete envelope has
        // to fail this the same way every other request type does.
        delete_properties["SourceCatalogs"] =
            json!([{ "Version": 1, "Sha256": "00" }, { "Version": 1, "Sha256": "11" }]);
        let delete = decode_request_envelope(json!({
            "RequestType": "Delete",
            "RequestId": "request-delete-schema-2",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-123",
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "PhysicalResourceId": "physical-id",
            "ResourceProperties": delete_properties,
        }))
        .expect("Delete resource properties still form an envelope");
        let decoded = decode_deployment_request(&delete).expect("current-schema Delete decodes");
        let error = parse_request_with_memory(decoded.resource_properties, "1024")
            .expect_err("Delete must not relax the current request schema");

        assert!(
            error
                .to_string()
                .contains("SourceCatalogs and SourceBucketNames must be the same length"),
            "unexpected error: {error}"
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
    fn physical_resource_id_is_stable_for_the_same_owned_destination() {
        let request = deployment_request_for_destination("destination", "site", "owner-a");

        let first = destination_physical_resource_id(&request);
        let replacement = destination_physical_resource_id(&request);

        assert_eq!(first, replacement);
        assert!(first.starts_with("aws.cdk.shinbucketdeployment."));
        assert_eq!(first.len(), "aws.cdk.shinbucketdeployment.".len() + 64);
    }

    #[test]
    fn create_physical_resource_id_changes_with_destination_identity() {
        let baseline = deployment_request_for_destination("destination", "site", "owner-a");
        let changed_bucket =
            deployment_request_for_destination("other-destination", "site", "owner-a");
        let changed_prefix =
            deployment_request_for_destination("destination", "other-site", "owner-a");
        let changed_owner = deployment_request_for_destination("destination", "site", "owner-b");

        let baseline_id = destination_physical_resource_id(&baseline);
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(&changed_bucket)
        );
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(&changed_prefix)
        );
        assert_ne!(
            baseline_id,
            destination_physical_resource_id(&changed_owner)
        );
    }

    #[test]
    fn update_protocol_preserves_physical_resource_id_across_destination_moves() {
        for (previous_bucket, previous_prefix, current_bucket, current_prefix) in [
            ("destination", "site", "destination", "site/assets"),
            ("destination", "site/assets", "destination", "site"),
            ("destination", "site/left", "destination", "site/right"),
            ("destination", "site", "other-destination", "site"),
        ] {
            let previous =
                deployment_request_for_destination(previous_bucket, previous_prefix, "owner-a");
            let current =
                deployment_request_for_destination(current_bucket, current_prefix, "owner-a");
            let incoming_id = destination_physical_resource_id(&previous);

            assert_ne!(
                incoming_id,
                destination_physical_resource_id(&current),
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
                    "owner-a",
                ),
                "OldResourceProperties": deployment_request_properties(
                    previous_bucket,
                    previous_prefix,
                    "owner-a",
                ),
            }))
            .expect("Update envelope");
            let decoded = decode_deployment_request(&envelope).expect("decoded Update request");
            let decoded_current = parse_request_with_memory(decoded.resource_properties, "1024")
                .expect("decoded current deployment request");
            let decoded_previous = parse_request_with_memory(
                decoded
                    .old_resource_properties
                    .expect("Update OldResourceProperties"),
                "1024",
            )
            .expect("decoded previous deployment request");

            assert_eq!(decoded_current.dest_bucket_name, current_bucket);
            assert_eq!(decoded_current.dest_bucket_prefix, current_prefix);
            assert_eq!(decoded_previous.dest_bucket_name, previous_bucket);
            assert_eq!(decoded_previous.dest_bucket_prefix, previous_prefix);

            let response_id = response_physical_resource_id(
                decoded.request_type,
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
        let request = deployment_request_for_destination("destination", "site", "owner-a");
        let derived_id = destination_physical_resource_id(&request);

        assert_eq!(
            response_physical_resource_id("Create", None, &request)
                .expect("Create physical resource ID"),
            derived_id
        );
        assert_eq!(
            response_physical_resource_id("Delete", Some(&derived_id), &request)
                .expect("Delete physical resource ID"),
            derived_id
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
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "ResourceProperties": {
                "Destination": {
                    "BucketName": "dest"
                }
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
    fn old_wire_property_names_are_rejected_in_old_resource_properties() {
        // The first Update after upgrading from the pre-rename contract carries the
        // previous template's property names in OldResourceProperties. The strict
        // single-shape decoder must reject that payload loudly -- never partially
        // parse it into a wrong previous-prefix or previous-bucket decision.
        let incoming_id = destination_physical_resource_id(&deployment_request_for_destination(
            "previous-bucket",
            "old-site",
            "owner-a",
        ));

        let envelope = decode_request_envelope(json!({
            "RequestType": "Update",
            "RequestId": "request-legacy",
            "ResponseURL": "https://example.com/response",
            "StackId": "stack-a",
            "ResourceType": RESOURCE_TYPE,
            "LogicalResourceId": "Deploy",
            "PhysicalResourceId": incoming_id,
            "ResourceProperties": deployment_request_properties(
                "current-bucket",
                "new-site",
                "owner-a"
            ),
            "OldResourceProperties": legacy_wire_properties(
                "previous-bucket",
                "old-site",
                "owner-a"
            ),
        }))
        .expect("Update envelope");
        let error = match decode_deployment_request(&envelope) {
            Ok(_) => {
                panic!("an OldResourceProperties payload using the pre-rename wire names must fail")
            }
            Err(error) => error,
        };

        let chain = format!("{error:#}");
        assert!(
            chain.contains("DestinationBucketName"),
            "unexpected legacy-payload error: {chain}"
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

    #[tokio::test]
    async fn unusable_response_url_still_reports_the_original_envelope_failure() {
        let s3 = aws_sdk_s3::Client::from_conf(
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
                .build(),
        );
        let state = AppState {
            source_s3: s3.clone(),
            destination_s3: s3,
            cloudfront: aws_sdk_cloudfront::Client::from_conf(
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
            http: reqwest::Client::new(),
            detailed_failure_diagnostics: false,
        };
        let target = EnvelopeResponseTarget {
            // Not a usable callback URL, so `validate_response_url` fails before any
            // request is sent and the AWS clients above are never exercised.
            response_url: "ftp://example.com/response?X-Amz-Signature=must-not-leak".to_string(),
            stack_id: "stack-123".to_string(),
            request_id: "request-malformed".to_string(),
            logical_resource_id: "Deploy".to_string(),
            physical_resource_id: None,
        };

        let error = super::report_envelope_failure(
            &state,
            Some(target),
            anyhow!("original envelope decode failure"),
            InvocationDeadlines::from_remaining_at(
                tokio::time::Instant::now(),
                std::time::Duration::from_secs(120),
            ),
        )
        .await
        .expect_err("an unusable response URL must fail");

        let chain = format!("{error:#}");
        assert!(
            chain.contains("original envelope decode failure"),
            "the original envelope failure must survive: {chain}"
        );
        assert!(
            !chain.contains("must-not-leak"),
            "the response URL must not leak into the error chain: {chain}"
        );
    }

    #[tokio::test(start_paused = true)]
    async fn distribution_invalidation_waits_overlap_after_both_creates() {
        // P-3: the previous- and current-distribution invalidations are both created
        // before either completion wait starts, so the two 20-second poll cadences
        // overlap. Serialized waits would take two poll intervals each (80s total);
        // concurrent waits finish both in two intervals (40s total). The paused
        // clock makes the elapsed time deterministic.
        use aws_sdk_s3::primitives::SdkBody;
        use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
        use http::{Request, Response};

        let invalidation_xml = |status: &str| {
            format!(
                "<Invalidation xmlns=\"http://cloudfront.amazonaws.com/doc/2020-05-31/\">\
                 <Id>I1</Id><Status>{status}</Status>\
                 <CreateTime>2026-08-05T00:00:00Z</CreateTime></Invalidation>"
            )
        };
        let event = |body: String| {
            ReplayEvent::new(
                Request::builder()
                    .uri("https://cloudfront.test/")
                    .body(SdkBody::empty())
                    .unwrap(),
                Response::builder()
                    .status(200)
                    .header("content-type", "application/xml")
                    .body(SdkBody::from(body))
                    .unwrap(),
            )
        };
        let replay = StaticReplayClient::new(vec![
            event(invalidation_xml("InProgress")), // CreateInvalidation, previous distribution
            event(invalidation_xml("InProgress")), // CreateInvalidation, current distribution
            event(invalidation_xml("InProgress")), // poll 1, previous
            event(invalidation_xml("InProgress")), // poll 1, current
            event(invalidation_xml("Completed")),  // poll 2, previous
            event(invalidation_xml("Completed")),  // poll 2, current
        ]);
        let cloudfront = aws_sdk_cloudfront::Client::from_conf(
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
                .http_client(replay.clone())
                .build(),
        );
        let s3 = aws_sdk_s3::Client::from_conf(
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
                .build(),
        );
        let state = AppState {
            source_s3: s3.clone(),
            destination_s3: s3,
            cloudfront,
            http: reqwest::Client::new(),
            detailed_failure_diagnostics: false,
        };

        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let request = crate::types::DeploymentRequest {
            invalidate_previous_distribution_on_change: Some("previous-dist".to_string()),
            ..request
        };
        let previous = crate::types::PreviousDestination {
            bucket_name: "previous-bucket".to_string(),
            bucket_prefix: "previous-site/".to_string(),
            distribution_id: Some("previous-dist".to_string()),
            distribution_paths: vec!["/old/*".to_string()],
            owner_id: "summary-owner".to_string(),
        };
        let execution = RequestExecution {
            identity: RequestIdentity {
                stack_id: "stack-123",
                request_id: "request-123",
                logical_resource_id: "Deploy",
            },
            deadlines: InvocationDeadlines::from_remaining_at(
                tokio::time::Instant::now(),
                std::time::Duration::from_secs(120),
            ),
        };
        let stats = crate::types::DeploymentStats::new(true);

        let handle = tokio::spawn(async move {
            invalidate_distributions(
                &state,
                execution,
                "Update",
                Some(&previous),
                &request,
                true,
                false,
                &stats,
            )
            .await
        });
        // Advance one second at a time until both waits finish. Each wait needs two
        // jittered 20-25s poll intervals, so concurrent waits finish within ~50s;
        // serialized waits would need four intervals (~80-100s). The paused clock
        // keeps this deterministic.
        let mut elapsed = std::time::Duration::ZERO;
        loop {
            if handle.is_finished() {
                break;
            }
            tokio::time::advance(std::time::Duration::from_secs(1)).await;
            elapsed += std::time::Duration::from_secs(1);
            assert!(
                elapsed <= std::time::Duration::from_secs(60),
                "both invalidation waits should finish within two poll intervals, \
                 took {elapsed:?}"
            );
        }
        handle
            .await
            .expect("joined invalidation task")
            .expect("both invalidation waits must succeed");
        eprintln!("elapsed: {elapsed:?}");
        let requests: Vec<_> = replay.actual_requests().collect();
        // Both CreateInvalidation calls precede every GetInvalidation poll.
        assert_eq!(requests.len(), 6);
        assert_eq!(requests[0].method(), "POST");
        assert_eq!(requests[1].method(), "POST");
        assert!(
            requests[2..]
                .iter()
                .all(|request| request.method() == "GET")
        );
    }
}
