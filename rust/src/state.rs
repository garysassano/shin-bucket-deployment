use std::ffi::OsStr;
use std::io;

use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use reqwest::Client as HttpClient;

#[cfg(test)]
use aws_smithy_http_client::test_util::StaticReplayClient;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) source_s3: S3Client,
    pub(crate) destination_s3: S3Client,
    pub(crate) cloudfront: CloudFrontClient,
    pub(crate) http: HttpClient,
    pub(crate) detailed_failure_diagnostics: bool,
}

pub(crate) fn detailed_failure_diagnostics_from_env() -> io::Result<bool> {
    parse_detailed_failure_diagnostics(std::env::var_os("SHIN_DETAILED_FAILURE_DIAGNOSTICS"))
}

fn parse_detailed_failure_diagnostics(value: Option<impl AsRef<OsStr>>) -> io::Result<bool> {
    match value {
        None => Ok(false),
        Some(value) if value.as_ref() == OsStr::new("true") => Ok(true),
        Some(_) => Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "SHIN_DETAILED_FAILURE_DIAGNOSTICS must be absent or exactly `true`",
        )),
    }
}

/// `AppState` with deterministic test clients: an S3 client pinned to a replayed
/// endpoint and a CloudFront client with test credentials.
#[cfg(test)]
pub(crate) fn test_app_state_with_replay(replay: StaticReplayClient) -> AppState {
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
            .http_client(replay)
            .build(),
    );
    AppState {
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
    }
}

#[cfg(test)]
mod detailed_failure_diagnostics_tests {
    use std::ffi::{OsStr, OsString};

    use super::parse_detailed_failure_diagnostics;

    #[test]
    fn detailed_failure_diagnostics_default_to_disabled() {
        assert!(!parse_detailed_failure_diagnostics(None::<&OsStr>).expect("absent flag"));
    }

    #[test]
    fn detailed_failure_diagnostics_require_exact_true() {
        assert!(
            parse_detailed_failure_diagnostics(Some(OsStr::new("true")))
                .expect("exact true should enable diagnostics")
        );
        for invalid in ["false", "TRUE", " true", "true ", "1", ""] {
            let error = parse_detailed_failure_diagnostics(Some(OsString::from(invalid)))
                .expect_err("all non-exact values must fail closed");
            assert_eq!(error.kind(), std::io::ErrorKind::InvalidInput);
        }
    }
}
