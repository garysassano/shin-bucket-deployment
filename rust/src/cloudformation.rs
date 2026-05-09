use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use md5::{Digest, Md5};
use serde_json::{Map, Value, json};
use tracing::error;
use uuid::Uuid;

use crate::cloudfront::invalidate as invalidate_cloudfront;
use crate::request::{RawDeploymentRequest, parse_old_destination, parse_request};
use crate::s3::{bucket_owned, delete_prefix, deploy};
use crate::types::{AppState, DeploymentStats, ResponsePayload, duration_ms};

const MAX_FAILURE_REASON_BYTES: usize = 1024;

#[derive(Clone, Copy)]
struct RequestIdentity<'a> {
    stack_id: &'a str,
    request_id: &'a str,
    logical_resource_id: &'a str,
}

pub(crate) async fn handle_event(
    state: Arc<AppState>,
    event: lambda_runtime::LambdaEvent<Value>,
) -> Result<Value, Error> {
    let request: CloudFormationCustomResourceRequest<RawDeploymentRequest, RawDeploymentRequest> =
        serde_json::from_value(event.payload)
            .context("failed to deserialize CloudFormation event")?;

    let response = match &request {
        CloudFormationCustomResourceRequest::Create(request) => {
            tracing::info!(
                request_type = "Create",
                logical_resource_id = request.logical_resource_id,
                "processing request"
            );
            process_request(
                &state,
                "Create",
                RequestIdentity {
                    stack_id: &request.stack_id,
                    request_id: &request.request_id,
                    logical_resource_id: &request.logical_resource_id,
                },
                None,
                &request.resource_properties,
                None,
            )
            .await
        }
        CloudFormationCustomResourceRequest::Update(request) => {
            tracing::info!(
                request_type = "Update",
                logical_resource_id = request.logical_resource_id,
                "processing request"
            );
            process_request(
                &state,
                "Update",
                RequestIdentity {
                    stack_id: &request.stack_id,
                    request_id: &request.request_id,
                    logical_resource_id: &request.logical_resource_id,
                },
                Some(&request.physical_resource_id),
                &request.resource_properties,
                Some(&request.old_resource_properties),
            )
            .await
        }
        CloudFormationCustomResourceRequest::Delete(request) => {
            tracing::info!(
                request_type = "Delete",
                logical_resource_id = request.logical_resource_id,
                "processing request"
            );
            process_request(
                &state,
                "Delete",
                RequestIdentity {
                    stack_id: &request.stack_id,
                    request_id: &request.request_id,
                    logical_resource_id: &request.logical_resource_id,
                },
                Some(&request.physical_resource_id),
                &request.resource_properties,
                None,
            )
            .await
        }
        _ => Err(anyhow!(
            "unsupported CloudFormation custom resource request type"
        )),
    };

    let Some((response_url, stack_id, request_id, logical_resource_id)) = response_target(&request)
    else {
        return Err(anyhow!("unsupported CloudFormation custom resource request type").into());
    };

    match response {
        Ok(success) => {
            send_response(
                &state.http,
                response_url,
                stack_id,
                request_id,
                logical_resource_id,
                "SUCCESS",
                &success,
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

            send_response(
                &state.http,
                response_url,
                stack_id,
                request_id,
                logical_resource_id,
                "FAILED",
                &failure,
            )
            .await
            .context("failed to send failure response")?;
        }
    }

    Ok(json!({}))
}

async fn process_request(
    state: &AppState,
    request_type: &str,
    identity: RequestIdentity<'_>,
    physical_resource_id: Option<&str>,
    resource_properties: &RawDeploymentRequest,
    old_resource_properties: Option<&RawDeploymentRequest>,
) -> Result<ResponsePayload> {
    let request = parse_request(resource_properties);
    let stats = Arc::new(DeploymentStats::default());
    let mut status = "success";
    let result = process_request_inner(
        state,
        request_type,
        identity,
        physical_resource_id,
        old_resource_properties,
        &request,
        Arc::clone(&stats),
    )
    .await;

    if result.is_err() {
        status = "failure";
    }
    log_deployment_summary(&stats, request_type, status, &request);
    result
}

async fn process_request_inner(
    state: &AppState,
    request_type: &str,
    identity: RequestIdentity<'_>,
    physical_resource_id: Option<&str>,
    old_resource_properties: Option<&RawDeploymentRequest>,
    request: &crate::types::DeploymentRequest,
    stats: Arc<DeploymentStats>,
) -> Result<ResponsePayload> {
    let physical_resource_id = match request_type {
        "Create" => format!("aws.cdk.cargobucketdeployment.{}", Uuid::new_v4()),
        "Update" | "Delete" => physical_resource_id
            .map(ToOwned::to_owned)
            .ok_or_else(|| anyhow!("PhysicalResourceId is required for {request_type}"))?,
        other => return Err(anyhow!("Unsupported request type: {other}")),
    };

    if request_type == "Delete"
        && !request.retain_on_delete
        && !bucket_owned(
            state,
            &request.dest_bucket_name,
            &request.dest_bucket_prefix,
        )
        .await?
    {
        let started = Instant::now();
        delete_prefix(
            state,
            &request.dest_bucket_name,
            &request.dest_bucket_prefix,
            Some(&stats),
        )
        .await?;
        stats.add_delete_millis(duration_ms(started.elapsed()));
    }

    if matches!(request_type, "Create" | "Update") {
        deploy(state, request, Arc::clone(&stats)).await?;
    }

    if let Some(distribution_id) = request.distribution_id.as_deref()
        && !distribution_id.is_empty()
    {
        let started = Instant::now();
        invalidate_cloudfront(
            state,
            distribution_id,
            &request.distribution_paths,
            request.wait_for_distribution_invalidation,
            &cloudfront_caller_reference(
                identity.stack_id,
                identity.request_id,
                identity.logical_resource_id,
                distribution_id,
                &request.distribution_paths,
            ),
        )
        .await?;
        stats.add_cloudfront_millis(duration_ms(started.elapsed()));
    }

    if request_type == "Update"
        && !request.retain_on_delete
        && let Some(old_props) = old_resource_properties
    {
        let (old_bucket, old_prefix) = parse_old_destination(old_props);

        if old_bucket != request.dest_bucket_name || old_prefix != request.dest_bucket_prefix {
            let started = Instant::now();
            delete_prefix(state, &old_bucket, &old_prefix, Some(&stats)).await?;
            stats.add_old_prefix_delete_millis(duration_ms(started.elapsed()));
        }
    }

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
    if reason.len() <= MAX_FAILURE_REASON_BYTES {
        return reason.to_string();
    }

    const SUFFIX: &str = " ... [truncated]";
    let mut end = MAX_FAILURE_REASON_BYTES.saturating_sub(SUFFIX.len());
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

fn response_target(
    request: &CloudFormationCustomResourceRequest<RawDeploymentRequest, RawDeploymentRequest>,
) -> Option<(&str, &str, &str, &str)> {
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

fn physical_resource_id(
    request: &CloudFormationCustomResourceRequest<RawDeploymentRequest, RawDeploymentRequest>,
) -> Option<&str> {
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
    stack_id: &str,
    request_id: &str,
    logical_resource_id: &str,
    status: &str,
    payload: &ResponsePayload,
) -> Result<()> {
    let body = serde_json::to_string(&json!({
        "Status": status,
        "Reason": payload.reason.clone().unwrap_or_else(|| format!("See the details in CloudWatch Logs for RequestId {}", request_id)),
        "PhysicalResourceId": payload.physical_resource_id,
        "StackId": stack_id,
        "RequestId": request_id,
        "LogicalResourceId": logical_resource_id,
        "NoEcho": false,
        "Data": payload.data,
    }))?;

    http.put(response_url)
        .header("content-type", "")
        .header("content-length", body.len())
        .body(body)
        .send()
        .await?
        .error_for_status()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{MAX_FAILURE_REASON_BYTES, cloudfront_caller_reference, truncate_failure_reason};

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
}
