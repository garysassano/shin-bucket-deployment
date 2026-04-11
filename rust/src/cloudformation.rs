use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use aws_lambda_events::event::cloudformation::CloudFormationCustomResourceRequest;
use lambda_runtime::Error;
use serde_json::{Map, Value, json};
use tracing::error;
use uuid::Uuid;

use crate::cloudfront::invalidate as invalidate_cloudfront;
use crate::request::{parse_old_destination, parse_request};
use crate::s3::{bucket_owned, delete_prefix, deploy};
use crate::types::{AppState, Properties, ResponsePayload};

struct CloudFormationEventView<'a> {
    request_type: &'static str,
    response_url: &'a str,
    stack_id: &'a str,
    request_id: &'a str,
    logical_resource_id: &'a str,
    physical_resource_id: Option<&'a str>,
    resource_properties: &'a Properties,
    old_resource_properties: Option<&'a Properties>,
}

pub(crate) async fn handle_event(
    state: Arc<AppState>,
    event: lambda_runtime::LambdaEvent<Value>,
) -> Result<Value, Error> {
    let request: CloudFormationCustomResourceRequest = serde_json::from_value(event.payload)
        .context("failed to deserialize CloudFormation event")?;
    let view = request_view(&request)?;

    tracing::info!(
        request_type = view.request_type,
        logical_resource_id = view.logical_resource_id,
        "processing request"
    );

    let response = process_request(&state, &view).await;

    match response {
        Ok(success) => {
            send_response(
                &state.http,
                view.response_url,
                view.stack_id,
                view.request_id,
                view.logical_resource_id,
                "SUCCESS",
                &success,
            )
            .await
            .context("failed to send success response")?;
        }
        Err(err) => {
            error!(error = %err, "request failed");
            let failure = ResponsePayload {
                physical_resource_id: view
                    .physical_resource_id
                    .map(ToOwned::to_owned)
                    .unwrap_or_else(|| view.request_id.to_string()),
                reason: Some(err.to_string()),
                data: Map::new(),
            };

            if let Err(send_err) = send_response(
                &state.http,
                view.response_url,
                view.stack_id,
                view.request_id,
                view.logical_resource_id,
                "FAILED",
                &failure,
            )
            .await
            {
                error!(error = %send_err, "failed to send failure response");
            }
        }
    }

    Ok(json!({}))
}

async fn process_request(
    state: &AppState,
    event: &CloudFormationEventView<'_>,
) -> Result<ResponsePayload> {
    let request = parse_request(event.resource_properties)?;
    let old_props = event.old_resource_properties;

    let physical_resource_id = match event.request_type {
        "Create" => format!("aws.cdk.cargobucketdeployment.{}", Uuid::new_v4()),
        "Update" | "Delete" => event
            .physical_resource_id
            .map(ToOwned::to_owned)
            .ok_or_else(|| anyhow!("PhysicalResourceId is required for {}", event.request_type))?,
        other => return Err(anyhow!("Unsupported request type: {other}")),
    };

    if event.request_type == "Delete" && !request.retain_on_delete {
        if !bucket_owned(
            state,
            &request.dest_bucket_name,
            &request.dest_bucket_prefix,
        )
        .await?
        {
            delete_prefix(
                state,
                &request.dest_bucket_name,
                &request.dest_bucket_prefix,
            )
            .await?;
        }
    }

    if event.request_type == "Update" && !request.retain_on_delete {
        if let Some(old_props) = old_props {
            let (old_bucket, old_prefix) = parse_old_destination(old_props)?;

            if old_bucket.as_deref() != Some(request.dest_bucket_name.as_str())
                || old_prefix != request.dest_bucket_prefix
            {
                if let Some(old_bucket_name) = old_bucket {
                    delete_prefix(state, &old_bucket_name, &old_prefix).await?;
                }
            }
        }
    }

    if matches!(event.request_type, "Create" | "Update") {
        deploy(state, &request).await?;
    }

    if let Some(distribution_id) = request.distribution_id.as_deref() {
        if !distribution_id.is_empty() {
            invalidate_cloudfront(
                state,
                distribution_id,
                &request.distribution_paths,
                request.wait_for_distribution_invalidation,
            )
            .await?;
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

fn request_view(
    request: &CloudFormationCustomResourceRequest,
) -> Result<CloudFormationEventView<'_>> {
    match request {
        CloudFormationCustomResourceRequest::Create(request) => Ok(CloudFormationEventView {
            request_type: "Create",
            response_url: &request.response_url,
            stack_id: &request.stack_id,
            request_id: &request.request_id,
            logical_resource_id: &request.logical_resource_id,
            physical_resource_id: None,
            resource_properties: as_properties(&request.resource_properties, "ResourceProperties")?,
            old_resource_properties: None,
        }),
        CloudFormationCustomResourceRequest::Update(request) => Ok(CloudFormationEventView {
            request_type: "Update",
            response_url: &request.response_url,
            stack_id: &request.stack_id,
            request_id: &request.request_id,
            logical_resource_id: &request.logical_resource_id,
            physical_resource_id: Some(&request.physical_resource_id),
            resource_properties: as_properties(&request.resource_properties, "ResourceProperties")?,
            old_resource_properties: Some(as_properties(
                &request.old_resource_properties,
                "OldResourceProperties",
            )?),
        }),
        CloudFormationCustomResourceRequest::Delete(request) => Ok(CloudFormationEventView {
            request_type: "Delete",
            response_url: &request.response_url,
            stack_id: &request.stack_id,
            request_id: &request.request_id,
            logical_resource_id: &request.logical_resource_id,
            physical_resource_id: Some(&request.physical_resource_id),
            resource_properties: as_properties(&request.resource_properties, "ResourceProperties")?,
            old_resource_properties: None,
        }),
    }
}

fn as_properties<'a>(value: &'a Value, field_name: &str) -> Result<&'a Properties> {
    value
        .as_object()
        .ok_or_else(|| anyhow!("CloudFormation {field_name} must be a JSON object"))
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
