mod cloudformation;
mod cloudfront;
mod deadline;
mod lifecycle;
mod replace;
mod request;
mod s3;
mod types;

use std::sync::Arc;
use std::time::Duration;

use aws_config::BehaviorVersion;
use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::StalledStreamProtectionConfig;
use lambda_runtime::{Error, service_fn};
use reqwest::Client as HttpClient;
use reqwest::redirect::Policy as RedirectPolicy;

use crate::cloudformation::handle_event;
use crate::types::AppState;

// Bound the CloudFormation response PUT independently of Lambda timeout.
const RESPONSE_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const RESPONSE_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .without_time()
        .init();

    let config = aws_config::defaults(BehaviorVersion::latest()).load().await;
    let source_s3 = S3Client::new(&config);
    let destination_s3 = S3Client::from_conf(
        aws_sdk_s3::config::Builder::from(&config)
            .stalled_stream_protection(
                StalledStreamProtectionConfig::enabled()
                    .upload_enabled(false)
                    .download_enabled(true)
                    .build(),
            )
            .build(),
    );
    let state = Arc::new(AppState {
        source_s3,
        destination_s3,
        cloudfront: CloudFrontClient::new(&config),
        http: build_response_client()?,
    });

    lambda_runtime::run(service_fn(move |event| {
        let state = state.clone();
        async move { handle_event(state, event).await }
    }))
    .await?;

    Ok(())
}

/// Builds the client used only for the CloudFormation response PUT.
///
/// The signed S3 target should not redirect; following one could leak the
/// response body to an unexpected endpoint. Timeouts keep a stalled callback
/// from holding the Lambda until its execution timeout.
fn build_response_client() -> Result<HttpClient, Error> {
    HttpClient::builder()
        .redirect(RedirectPolicy::none())
        .connect_timeout(RESPONSE_CONNECT_TIMEOUT)
        .timeout(RESPONSE_REQUEST_TIMEOUT)
        .build()
        .map_err(Error::from)
}
