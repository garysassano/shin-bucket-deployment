use std::collections::HashSet;
use std::future::Future;
use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow, ensure};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use md5::{Digest, Md5};
use serde_json::{Map, Value, json};
use tokio::time::timeout_at;
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

mod callback;

use callback::{
    physical_resource_id, response_target, send_response, serialize_failure_response,
    serialize_response, truncate_failure_reason, validate_response_body_size,
};

const RESOURCE_TYPE: &str = "Custom::ShinBucketDeployment";

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
    let request = decode_request_envelope(payload)?;

    let Some((response_url, stack_id, request_id, logical_resource_id)) = response_target(&request)
    else {
        return Err(anyhow!("unsupported CloudFormation custom resource request type").into());
    };

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
                    response_url,
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
                        response_url,
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
                response_url,
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
    use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
    use serde_json::json;

    use crate::request::{RawDeploymentRequest, parse_request};

    use super::{
        RESOURCE_TYPE, cloudfront_caller_reference, decode_deployment_request,
        decode_request_envelope, decode_resource_properties, merge_distribution_paths,
        preflight_invalidation_requests, validate_resource_type,
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

    #[test]
    fn deployment_summary_uses_diagnostics_schema_v3() {
        let request = deployment_request_with_paths(vec!["/*".to_string()]);
        let stats = crate::types::DeploymentStats::default();
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

        assert_eq!(summary["schemaVersion"], 3);
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
        assert_eq!(summary["source"]["getAttempts"], 0);
        assert_eq!(summary["source"]["bodyReplays"], 0);
        assert_eq!(summary["source"]["globalBudgetBytes"], 0);
        assert_eq!(summary["source"]["globalResidentBytesCurrent"], 0);
        assert_eq!(summary["source"]["globalResidentBytesHighWater"], 0);
        assert_eq!(summary["counts"]["destinationMetadataRetained"], 0);
        assert_eq!(summary["counts"]["destinationPageObjectsHighWater"], 0);
        assert_eq!(summary["putObject"]["wireAttempts"], 0);
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
}
