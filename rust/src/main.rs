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
use tracing_subscriber::EnvFilter;

use crate::cloudformation::handle_event;
use crate::types::{AppState, detailed_failure_diagnostics_from_env};

// Bound the CloudFormation response PUT independently of Lambda timeout.
const RESPONSE_CONNECT_TIMEOUT: Duration = Duration::from_secs(10);
const RESPONSE_REQUEST_TIMEOUT: Duration = Duration::from_secs(30);
const CALLBACK_SENSITIVE_LOG_TARGETS: &[&str] = &[
    "lambda_runtime",
    "lambda_runtime_api_client",
    "reqwest",
    "hyper",
    "hyper_util",
    "h2",
    "rustls",
    "hyper_rustls",
    "tower",
    "tower_http",
];

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(callback_safe_log_filter())
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
        detailed_failure_diagnostics: detailed_failure_diagnostics_from_env()?,
    });

    lambda_runtime::run(service_fn(move |event| {
        let state = state.clone();
        async move { handle_event(state, event).await }
    }))
    .await?;

    Ok(())
}

fn callback_safe_log_filter() -> EnvFilter {
    let filter = EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info"));
    harden_callback_log_targets(filter)
}

fn harden_callback_log_targets(mut filter: EnvFilter) -> EnvFilter {
    for target in CALLBACK_SENSITIVE_LOG_TARGETS {
        filter = filter.add_directive(
            format!("{target}=info")
                .parse()
                .expect("static tracing directive"),
        );
    }
    filter
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

#[cfg(test)]
mod tests {
    use std::io::Write;
    use std::sync::{Arc, Mutex};

    use tracing_subscriber::EnvFilter;
    use tracing_subscriber::fmt::MakeWriter;
    use tracing_subscriber::layer::SubscriberExt;

    use super::harden_callback_log_targets;

    #[derive(Clone, Default)]
    struct TestWriter(Arc<Mutex<Vec<u8>>>);

    struct TestWriterGuard(Arc<Mutex<Vec<u8>>>);

    impl Write for TestWriterGuard {
        fn write(&mut self, bytes: &[u8]) -> std::io::Result<usize> {
            self.0
                .lock()
                .expect("test log buffer")
                .extend_from_slice(bytes);
            Ok(bytes.len())
        }

        fn flush(&mut self) -> std::io::Result<()> {
            Ok(())
        }
    }

    impl<'writer> MakeWriter<'writer> for TestWriter {
        type Writer = TestWriterGuard;

        fn make_writer(&'writer self) -> Self::Writer {
            TestWriterGuard(Arc::clone(&self.0))
        }
    }

    #[test]
    fn ambient_trace_cannot_enable_callback_sensitive_targets() {
        const SECRET: &str = "X-Amz-Signature=callback-secret";
        let writer = TestWriter::default();
        let subscriber = tracing_subscriber::registry()
            .with(harden_callback_log_targets(EnvFilter::new(
                "trace,lambda_runtime=trace,reqwest=trace",
            )))
            .with(
                tracing_subscriber::fmt::layer()
                    .without_time()
                    .with_ansi(false)
                    .with_writer(writer.clone()),
            );

        tracing::subscriber::with_default(subscriber, || {
            tracing::trace!(target: "lambda_runtime::runtime", response_url = SECRET, "raw event");
            tracing::trace!(target: "reqwest::connect", url = SECRET, "HTTP request");
            tracing::trace!(target: "shin_bucket_deployment_handler", "provider trace retained");
        });

        let output = String::from_utf8(writer.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 trace output");
        assert!(!output.contains(SECRET));
        assert!(!output.contains("raw event"));
        assert!(!output.contains("HTTP request"));
        assert!(output.contains("provider trace retained"));
    }
}
