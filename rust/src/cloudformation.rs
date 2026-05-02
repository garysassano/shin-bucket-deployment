use std::sync::Arc;
use std::time::Instant;

use anyhow::{Context, Result, anyhow};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use serde_json::{Map, Value, json};
use tracing::error;
use uuid::Uuid;

use crate::cloudfront::invalidate as invalidate_cloudfront;
use crate::request::{RawDeploymentRequest, parse_old_destination, parse_request};
use crate::s3::{bucket_owned, delete_prefix, deploy};
use crate::types::{AppState, DeploymentStats, ResponsePayload, duration_ms};

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
            process_request(&state, "Create", None, &request.resource_properties, None).await
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
            let reason = format!("{err:#}");
            error!(error = %reason, "request failed");
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

fn log_deployment_summary(
    stats: &DeploymentStats,
    request_type: &str,
    status: &str,
    request: &crate::types::DeploymentRequest,
) {
    match serde_json::to_string(&stats.snapshot(request_type, status, request)) {
        Ok(summary) => tracing::info!(summary, "rbd deployment summary"),
        Err(error) => tracing::warn!(error = %error, "failed to serialize rbd deployment summary"),
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
