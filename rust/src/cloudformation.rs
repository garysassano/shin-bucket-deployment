use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use lambda_runtime::Error;
use serde_json::{Map, Value, json};
use tracing::error;
use uuid::Uuid;

use crate::deploy::{bucket_owned, cloudfront_invalidate, delete_prefix, deploy};
use crate::request::{parse_old_destination, parse_request};
use crate::types::{AppState, CloudFormationEvent, ResponsePayload};

pub(crate) async fn handle_event(
    state: Arc<AppState>,
    event: lambda_runtime::LambdaEvent<Value>,
) -> Result<Value, Error> {
    let request: CloudFormationEvent = serde_json::from_value(event.payload)
        .context("failed to deserialize CloudFormation event")?;

    tracing::info!(
        request_type = request.request_type,
        logical_resource_id = request.logical_resource_id,
        "processing request"
    );

    let response = process_request(&state, &request).await;

    match response {
        Ok(success) => {
            send_response(&state.http, &request, "SUCCESS", &success)
                .await
                .context("failed to send success response")?;
        }
        Err(err) => {
            error!(error = %err, "request failed");
            let failure = ResponsePayload {
                physical_resource_id: request
                    .physical_resource_id
                    .clone()
                    .unwrap_or_else(|| request.request_id.clone()),
                reason: Some(err.to_string()),
                data: Map::new(),
            };

            if let Err(send_err) = send_response(&state.http, &request, "FAILED", &failure).await {
                error!(error = %send_err, "failed to send failure response");
            }
        }
    }

    Ok(json!({}))
}

async fn process_request(state: &AppState, event: &CloudFormationEvent) -> Result<ResponsePayload> {
    let request = parse_request(&event.resource_properties)?;
    let old_props = event.old_resource_properties.as_ref();

    let physical_resource_id = match event.request_type.as_str() {
        "Create" => format!("aws.cdk.cargobucketdeployment.{}", Uuid::new_v4()),
        "Update" | "Delete" => event
            .physical_resource_id
            .clone()
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
            let (old_bucket, old_prefix) = parse_old_destination(old_props);

            if old_bucket.as_deref() != Some(request.dest_bucket_name.as_str())
                || old_prefix != request.dest_bucket_prefix
            {
                if let Some(old_bucket_name) = old_bucket {
                    delete_prefix(state, &old_bucket_name, &old_prefix).await?;
                }
            }
        }
    }

    if matches!(event.request_type.as_str(), "Create" | "Update") {
        deploy(state, &request).await?;
    }

    if let Some(distribution_id) = request.distribution_id.as_deref() {
        if !distribution_id.is_empty() {
            cloudfront_invalidate(
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

async fn send_response(
    http: &reqwest::Client,
    event: &CloudFormationEvent,
    status: &str,
    payload: &ResponsePayload,
) -> Result<()> {
    let body = serde_json::to_string(&json!({
        "Status": status,
        "Reason": payload.reason.clone().unwrap_or_else(|| format!("See the details in CloudWatch Logs for RequestId {}", event.request_id)),
        "PhysicalResourceId": payload.physical_resource_id,
        "StackId": event.stack_id,
        "RequestId": event.request_id,
        "LogicalResourceId": event.logical_resource_id,
        "NoEcho": false,
        "Data": payload.data,
    }))?;

    http.put(&event.response_url)
        .header("content-type", "")
        .header("content-length", body.len())
        .body(body)
        .send()
        .await?
        .error_for_status()?;

    Ok(())
}
