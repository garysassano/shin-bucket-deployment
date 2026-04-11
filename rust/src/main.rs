mod cloudformation;
mod cloudfront;
mod replace;
mod request;
mod s3;
mod types;

use std::sync::Arc;

use aws_config::BehaviorVersion;
use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use lambda_runtime::{Error, service_fn};
use reqwest::Client as HttpClient;

use crate::cloudformation::handle_event;
use crate::types::AppState;

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .without_time()
        .init();

    let config = aws_config::defaults(BehaviorVersion::latest()).load().await;
    let state = Arc::new(AppState {
        s3: S3Client::new(&config),
        cloudfront: CloudFrontClient::new(&config),
        http: HttpClient::new(),
    });

    lambda_runtime::run(service_fn(move |event| {
        let state = state.clone();
        async move { handle_event(state, event).await }
    }))
    .await?;

    Ok(())
}
