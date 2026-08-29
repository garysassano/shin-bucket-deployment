use std::sync::Arc;

use crate::deadline::InvocationDeadlines;
use crate::diagnostics::DeploymentStats;

mod copy;
mod diagnostics;
mod scheduler;
mod upload;

pub(super) use copy::execute_copy_plans;
pub(super) use upload::upload_zip_entries;

#[cfg(test)]
use super::retry::{RetryCoordinator, retry_cap_millis};
#[cfg(test)]
use copy::{
    COPY_RECONCILIATION_METADATA_KEY, CopyContext, CopyOutcome, copy_reconciliation_identity,
    copy_source_object, quoted_etag, record_copy_outcome,
};
#[cfg(test)]
use diagnostics::{
    WriteDiagnostics, WriteDiagnosticsSnapshot, dispatch_failure_kind, log_copy_diagnostics,
    log_put_diagnostics, record_bounded_diagnostic_count, sanitize_diagnostic_label,
    serialize_put_attempt_failure, write_error_kind,
};
#[cfg(test)]
use upload::{
    COMPARISON_SPOOL_TOTAL_BUDGET_BYTES, PutContext, UploadPayload, catalog_skips_zip_entry,
    comparison_spool_limit_bytes, compile_marker_replacements, digest_async_reader, md5_hex,
    payload_body, prepare_zip_entry_upload, read_async_reader_to_vec,
    should_compare_marker_free_entry, upload_payload,
};

pub(super) struct TransferExecution {
    pub(super) stats: Arc<DeploymentStats>,
    pub(super) deadlines: InvocationDeadlines,
}

#[cfg(test)]
mod tests {
    use std::collections::{BTreeMap, HashMap};
    use std::io::{Cursor, Write};
    use std::panic::{AssertUnwindSafe, catch_unwind};
    use std::sync::atomic::AtomicUsize;
    use std::sync::{Arc, Mutex};

    use anyhow::Result;
    use aws_sdk_s3::error::ConnectorError;
    use aws_sdk_s3::operation::put_object::PutObjectError;
    use aws_sdk_s3::primitives::{ByteStream, SdkBody};
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};
    use tracing::instrument::WithSubscriber as _;
    use tracing_subscriber::fmt::MakeWriter;
    use tracing_subscriber::layer::SubscriberExt;

    use super::super::destination::{
        DestinationObject, DestinationWritePrecondition, destination_write_precondition,
    };
    use crate::deadline::InvocationDeadlines;
    use crate::deployment::{
        DeploymentRequest, MarkerConfig, PutObjectRetryJitter, PutObjectRetryOptions,
        SourceArchive, TrustedEntryIntegrity,
    };
    use crate::diagnostics::DeploymentStats;
    use crate::replace::MarkerReplacements;
    use crate::s3::archive::block_store::{SourceBlockOptions, SourceBlockStore};
    use crate::s3::archive::budget::SourceByteBudget;
    use crate::s3::archive::entry::{MarkerBodyContext, UploadBodyState, marker_zip_entry_body};
    use crate::s3::archive::prepare_source_zip;
    use crate::s3::archive::tests::{
        ready_store_for_plan_with_claims, zip_from_entry, zip_plan_from_archive,
    };
    use crate::s3::planner::{CopyPlan, ZipEntryPlan};
    use crate::s3::source_window_bytes_for_archive;
    use crate::state::test_app_state_with_replay;
    use crate::util::{duration_ms, finalize_digest};
    use md5::{Digest as Md5Digest, Md5};
    use std::time::Duration;
    use tokio::time::Instant as TokioInstant;

    use super::{
        COMPARISON_SPOOL_TOTAL_BUDGET_BYTES, COPY_RECONCILIATION_METADATA_KEY, CopyContext,
        CopyOutcome, PutContext, RetryCoordinator, TransferExecution, UploadPayload,
        WriteDiagnostics, WriteDiagnosticsSnapshot, catalog_skips_zip_entry,
        comparison_spool_limit_bytes, compile_marker_replacements, copy_reconciliation_identity,
        copy_source_object, digest_async_reader, dispatch_failure_kind, log_copy_diagnostics,
        log_put_diagnostics, md5_hex, payload_body, prepare_zip_entry_upload, quoted_etag,
        read_async_reader_to_vec, record_bounded_diagnostic_count, record_copy_outcome,
        retry_cap_millis, sanitize_diagnostic_label, serialize_put_attempt_failure,
        should_compare_marker_free_entry, upload_payload, upload_zip_entries, write_error_kind,
    };

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

    fn test_log_subscriber(writer: TestWriter) -> impl tracing::Subscriber + Send + Sync + 'static {
        tracing_subscriber::registry().with(
            tracing_subscriber::fmt::layer()
                .without_time()
                .with_ansi(false)
                .with_writer(writer),
        )
    }

    fn poison_telemetry<T>(telemetry: &Mutex<T>) {
        let panic = catch_unwind(AssertUnwindSafe(|| {
            let _guard = telemetry.lock().expect("initial telemetry lock");
            panic!("injected telemetry writer panic");
        }));
        assert!(panic.is_err());
        assert!(telemetry.is_poisoned());
    }

    #[test]
    fn pre_callback_put_diagnostics_aggregate_after_telemetry_poisoning() {
        let diagnostics = WriteDiagnostics::new(true);
        poison_telemetry(&diagnostics.failures_by_error_code);
        let detailed = diagnostics
            .detailed
            .as_ref()
            .expect("detailed diagnostics enabled");
        poison_telemetry(&detailed.failures_by_sdk_error_kind);
        poison_telemetry(&detailed.failures_by_service_code);
        poison_telemetry(&detailed.failure_states);

        let stats = DeploymentStats::new(true);
        log_put_diagnostics(&test_retry_options(), &diagnostics, &stats);

        assert!(diagnostics.failures_by_error_code.is_poisoned());
        assert!(detailed.failures_by_sdk_error_kind.is_poisoned());
        assert!(detailed.failures_by_service_code.is_poisoned());
        assert!(detailed.failure_states.is_poisoned());
    }

    #[test]
    fn only_authenticated_catalog_integrity_enables_sparse_skips() {
        let object = DestinationObject {
            etag: Some("5d41402abc4b2a76b9719d911017c592".to_string()),
            size: Some(5),
        };
        let stats = DeploymentStats::default();
        let mut plan = integrity_plan(b"hello", None);

        assert!(!catalog_skips_zip_entry(
            &plan,
            false,
            Some(&object),
            &stats,
        ));

        plan.trusted_integrity = Some(TrustedEntryIntegrity {
            size: 5,
            md5: "5d41402abc4b2a76b9719d911017c592".to_string(),
        });
        assert!(catalog_skips_zip_entry(&plan, false, Some(&object), &stats,));
    }

    #[test]
    fn compiled_marker_replacements_are_shared_without_cloning_the_matcher() {
        let markers = HashMap::from([("marker".to_string(), "value".to_string())]);
        let replacements = compile_marker_replacements(&markers, &Default::default())
            .expect("marker replacements should compile")
            .expect("non-empty markers should produce replacements");
        let shared = Arc::clone(&replacements);

        assert!(Arc::ptr_eq(&replacements, &shared));
        assert!(
            compile_marker_replacements(&HashMap::new(), &Default::default())
                .expect("empty markers should be accepted")
                .is_none()
        );
    }

    #[test]
    fn an_untrusted_entry_is_compared_when_the_destination_length_already_matches() {
        let plan = integrity_plan(b"hello", None);
        let object = DestinationObject {
            etag: Some("5d41402abc4b2a76b9719d911017c592".to_string()),
            size: Some(5),
        };

        assert!(should_compare_marker_free_entry(&plan, Some(&object)));
        assert!(
            !should_compare_marker_free_entry(
                &plan,
                Some(&DestinationObject {
                    etag: object.etag.clone(),
                    size: Some(6),
                })
            ),
            "a different length is settled from the listing without hashing"
        );
    }

    #[tokio::test]
    async fn sse_s3_conflict_reconciliation_uses_md5_etag_without_acl_reads() {
        let exact_headers = vec![
            ("content-length", "5"),
            ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
        ];
        let (result, requests, checksum_mode_requested) = run_ambiguous_put(exact_headers).await;
        result.expect("an exact SSE-S3 object should reconcile");
        assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        assert!(!checksum_mode_requested);

        for mismatched_headers in [
            vec![
                ("content-length", "6"),
                ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
            ],
            vec![
                ("content-length", "5"),
                ("etag", "\"00000000000000000000000000000000\""),
            ],
        ] {
            let (result, requests, _) = run_ambiguous_put(mismatched_headers).await;
            assert!(result.is_err());
            assert_eq!(requests, vec!["PUT", "PUT", "HEAD"]);
        }
    }

    #[tokio::test]
    async fn conditional_put_retries_an_unmatched_409() {
        let (result, replay, diagnostics, stats) = run_conditional_put(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
                put_success_event(),
            ],
            test_retry_options(),
            test_work_deadline(),
        )
        .await;

        result.expect("an unmatched 409 should retry the conditional PutObject");
        let requests = replay.actual_requests().collect::<Vec<_>>();
        assert_eq!(
            requests
                .iter()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD", "PUT"]
        );
        for request in [requests[0], requests[2]] {
            assert_eq!(request.headers().get("if-none-match"), Some("*"));
            assert_eq!(request.body().bytes(), Some(b"hello".as_slice()));
        }
        let diagnostic = diagnostics.snapshot();
        assert_eq!(diagnostic.wire_attempts, 2);
        assert_eq!(diagnostic.failed_attempts, 1);
        assert_eq!(diagnostic.retry_attempts, 1);
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.counts.conditional_conflicts, 1);
        assert_eq!(summary.counts.uploaded_objects, 1);
        assert_eq!(summary.bytes.uploaded, 5);
    }

    #[tokio::test]
    async fn conditional_put_accepts_a_matching_object_after_409() {
        let (result, replay, diagnostics, stats) = run_conditional_put(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                matching_put_head_event(),
            ],
            test_retry_options(),
            test_work_deadline(),
        )
        .await;

        result.expect("a matching object should reconcile the conditional PUT");
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD"]
        );
        let diagnostic = diagnostics.snapshot();
        assert_eq!(diagnostic.wire_attempts, 1);
        assert_eq!(diagnostic.failed_attempts, 1);
        assert_eq!(diagnostic.retry_attempts, 0);
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.counts.conditional_conflicts, 1);
        assert_eq!(summary.counts.uploaded_objects, 1);
    }

    #[tokio::test]
    async fn conditional_put_fails_closed_on_an_unmatched_412() {
        let (result, replay, diagnostics, stats) = run_conditional_put(
            vec![
                error_event(412, "PreconditionFailed"),
                head_event(vec![
                    ("content-length", "5"),
                    ("etag", "\"00000000000000000000000000000000\""),
                ]),
            ],
            test_retry_options(),
            test_work_deadline(),
        )
        .await;

        let error = result.expect_err("an unmatched 412 must not retry the PUT");
        assert!(format!("{error:#}").contains("PreconditionFailed"));
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD"]
        );
        let diagnostic = diagnostics.snapshot();
        assert_eq!(diagnostic.wire_attempts, 1);
        assert_eq!(diagnostic.failed_attempts, 1);
        assert_eq!(diagnostic.retry_attempts, 0);
        let summary = stats.snapshot("Update", "failed", &DeploymentRequest::for_test());
        assert_eq!(summary.counts.conditional_conflicts, 1);
        assert_eq!(summary.counts.uploaded_objects, 0);
    }

    #[tokio::test]
    async fn conditional_put_stops_after_unmatched_409_attempts_are_exhausted() {
        let (result, replay, diagnostics, stats) = run_conditional_put(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
            ],
            test_retry_options(),
            test_work_deadline(),
        )
        .await;

        let error = result.expect_err("the conditional PUT retry budget must stay bounded");
        assert!(format!("{error:#}").contains("ConditionalRequestConflict"));
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD", "PUT", "HEAD"]
        );
        let diagnostic = diagnostics.snapshot();
        assert_eq!(diagnostic.wire_attempts, 2);
        assert_eq!(diagnostic.failed_attempts, 2);
        assert_eq!(diagnostic.retry_attempts, 1);
        let summary = stats.snapshot("Update", "failed", &DeploymentRequest::for_test());
        assert_eq!(summary.counts.conditional_conflicts, 2);
        assert_eq!(summary.counts.uploaded_objects, 0);
    }

    #[tokio::test(start_paused = true)]
    async fn conditional_put_409_retry_does_not_wait_past_the_work_deadline() {
        let mut retry = test_retry_options();
        retry.retry_base_delay_ms = 30_000;
        retry.retry_max_delay_ms = 30_000;
        let (result, replay, diagnostics, stats) = run_conditional_put(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
            ],
            retry,
            tokio::time::Instant::now() + Duration::from_secs(1),
        )
        .await;

        let error = result.expect_err("a conditional PUT retry must respect the work deadline");
        let message = format!("{error:#}");
        assert!(message.contains("not retrying destination PutObject"));
        assert!(message.contains("ConditionalRequestConflict"));
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD"]
        );
        let diagnostic = diagnostics.snapshot();
        assert_eq!(diagnostic.wire_attempts, 1);
        assert_eq!(diagnostic.failed_attempts, 1);
        assert_eq!(diagnostic.retry_attempts, 0);
        let summary = stats.snapshot("Update", "failed", &DeploymentRequest::for_test());
        assert_eq!(summary.counts.conditional_conflicts, 1);
        assert_eq!(summary.counts.uploaded_objects, 0);
    }

    #[tokio::test]
    async fn permanent_put_4xx_is_not_retried() {
        let replay = StaticReplayClient::new(vec![error_event(400, "InvalidRequest")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let retry = test_retry_options();

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"]
        );
        let request = replay.actual_requests().next().expect("one PUT request");
        for checksum_header in [
            "x-amz-sdk-checksum-algorithm",
            "x-amz-checksum-crc32",
            "x-amz-checksum-crc32c",
            "x-amz-checksum-crc64nvme",
            "x-amz-checksum-sha1",
            "x-amz-checksum-sha256",
        ] {
            assert!(
                request.headers().get(checksum_header).is_none(),
                "ordinary SSE-S3 PUT unexpectedly sent {checksum_header}"
            );
        }
        assert_eq!(request.headers().get("content-type"), Some("text/plain"));
    }

    #[tokio::test]
    async fn copy_sets_guards_reconciliation_identity_and_content_type_without_a_checksum() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let expected_identity = copy_reconciliation_identity("destination", &plan);
        let (result, replay, diagnostics) =
            run_test_copy(vec![copy_success_event()], plan, 2).await;
        result.expect("copy should succeed");

        let request = replay.actual_requests().next().expect("one COPY request");
        assert_eq!(request.headers().get("content-type"), Some("text/plain"));
        assert_eq!(
            request.headers().get("x-amz-metadata-directive"),
            Some("REPLACE")
        );
        assert_eq!(
            request.headers().get("x-amz-copy-source-if-match"),
            Some("\"source-etag\"")
        );
        assert_eq!(request.headers().get("if-none-match"), Some("*"));
        assert_eq!(
            request
                .headers()
                .get(format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}")),
            Some(expected_identity.as_str())
        );
        assert!(request.headers().get("x-amz-checksum-algorithm").is_none());
        assert!(
            request
                .headers()
                .get("x-amz-sdk-checksum-algorithm")
                .is_none()
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 0);
    }

    #[test]
    fn copy_reconciliation_identity_is_opaque_and_binds_the_complete_operation() {
        let baseline = test_copy_plan(None);
        let identity = copy_reconciliation_identity("destination", &baseline);
        assert_eq!(identity.len(), 64);
        assert!(
            identity
                .bytes()
                .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
        );
        for changed in [
            CopyPlan {
                source_bucket: "other-source".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                source_key: "other.zip".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                expected_etag: "other-etag".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                destination_key: "site/other.txt".to_string(),
                ..baseline.clone()
            },
            CopyPlan {
                size: baseline.size + 1,
                ..baseline.clone()
            },
        ] {
            assert_ne!(
                copy_reconciliation_identity("destination", &changed),
                identity
            );
        }
        assert_ne!(
            copy_reconciliation_identity("other-destination", &baseline),
            identity
        );
    }

    #[tokio::test]
    async fn copy_retries_are_provider_owned_and_one_sdk_attempt_each() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![error_event(200, "InternalError"), copy_success_event()],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        result.expect("provider retry should succeed");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            2,
            "the client is configured for three SDK attempts, so two requests prove SDK retries were disabled and the provider owned both attempts"
        );
        assert_eq!(diagnostics.wire_attempts, 2);
        assert_eq!(diagnostics.failed_attempts, 1);
        assert_eq!(diagnostics.retry_attempts, 1);
    }

    #[tokio::test(start_paused = true)]
    async fn copy_retry_that_cannot_fit_preserves_the_slowdown_error() {
        let replay = StaticReplayClient::new(vec![error_event(503, "SlowDown")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 30_000,
            retry_max_delay_ms: 30_000,
            slowdown_retry_base_delay_ms: 30_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        let error = copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            &test_copy_plan(None),
        )
        .await
        .expect_err("a CopyObject retry wait beyond the work deadline must be rejected");

        let message = format!("{error:#}");
        assert!(message.contains("not retrying destination CopyObject"));
        assert!(message.contains("SlowDown"));
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.retry_attempts, 0);
        assert_eq!(snapshot.throttled_attempts, 1);
        assert_eq!(snapshot.throttle_cooldown_waits, 0);
    }

    #[tokio::test]
    async fn copy_existing_destination_uses_if_match_guard() {
        let (result, replay, _) = run_test_copy(
            vec![copy_success_event()],
            test_copy_plan(Some(DestinationWritePrecondition::IfMatch(
                "\"destination-etag\"".to_string(),
            ))),
            1,
        )
        .await;

        result.expect("guarded copy should succeed");
        let request = replay.actual_requests().next().expect("one COPY request");
        assert_eq!(
            request.headers().get("if-match"),
            Some("\"destination-etag\"")
        );
        assert!(request.headers().get("if-none-match").is_none());
    }

    #[tokio::test]
    async fn permanent_copy_failure_is_not_retried() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![error_event(400, "InvalidRequest")],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 1);
        assert_eq!(diagnostics.retry_attempts, 0);
    }

    #[tokio::test]
    async fn final_ambiguous_copy_reconciles_exact_marker_and_size() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(500, "InternalError"),
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ],
            plan,
            1,
        )
        .await;

        result.expect("exact destination marker should reconcile the lost copy response");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT", "HEAD"]
        );
        assert_eq!(diagnostics.wire_attempts, 1);
        assert_eq!(diagnostics.failed_attempts, 1);
    }

    #[tokio::test]
    async fn conditional_copy_conflict_reconciles_only_the_intended_object() {
        let plan = test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch));
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(412, "PreconditionFailed"),
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ],
            plan,
            2,
        )
        .await;

        result.expect("the matching marker should prove an earlier copy succeeded");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            1
        );
        assert_eq!(diagnostics.retry_attempts, 0);
    }

    #[tokio::test]
    async fn copy_retries_a_409_when_reconciliation_finds_no_completed_write() {
        let (result, replay, diagnostics) = run_test_copy(
            vec![
                error_event(409, "ConditionalRequestConflict"),
                error_event(404, "NoSuchKey"),
                copy_success_event(),
            ],
            test_copy_plan(Some(DestinationWritePrecondition::IfNoneMatch)),
            2,
        )
        .await;

        result.expect("a transient conditional conflict should be retried");
        assert_eq!(
            replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .count(),
            2
        );
        assert_eq!(diagnostics.retry_attempts, 1);
    }

    #[tokio::test]
    async fn ambiguous_copy_reconciliation_fails_closed_on_marker_or_size_mismatch() {
        for headers in [
            vec![
                ("content-length".to_string(), "5".to_string()),
                (
                    format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}"),
                    "different-copy".to_string(),
                ),
            ],
            vec![
                ("content-length".to_string(), "6".to_string()),
                (
                    format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}"),
                    copy_reconciliation_identity("destination", &test_copy_plan(None)),
                ),
            ],
        ] {
            let owned_headers = headers
                .iter()
                .map(|(name, value)| (name.as_str(), value.as_str()))
                .collect();
            let (result, replay, _) = run_test_copy(
                vec![error_event(500, "InternalError"), head_event(owned_headers)],
                test_copy_plan(None),
                1,
            )
            .await;
            assert!(result.is_err());
            assert_eq!(
                replay
                    .actual_requests()
                    .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                    .count(),
                1
            );
        }
    }

    #[tokio::test]
    async fn identity_probe_retires_a_copy_whose_destination_already_matches() {
        let plan = test_copy_plan_with_identity_probe();
        let identity = copy_reconciliation_identity("destination", &plan);
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let (result, replay, diagnostics) = run_test_copy(
            vec![head_event(vec![
                ("content-length", "5"),
                (metadata_header.as_str(), identity.as_str()),
            ])],
            plan,
            2,
        )
        .await;

        assert_eq!(
            result.expect("a matching identity token proves the copy is current"),
            CopyOutcome::Skipped
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["HEAD"],
            "a proven-current destination must cost one HeadObject and no CopyObject"
        );
        assert_eq!(diagnostics.wire_attempts, 0);
    }

    #[tokio::test]
    async fn identity_probe_fails_closed_and_copies_when_the_destination_is_unproven() {
        let metadata_header = format!("x-amz-meta-{COPY_RECONCILIATION_METADATA_KEY}");
        let identity =
            copy_reconciliation_identity("destination", &test_copy_plan_with_identity_probe());
        for (label, probe_event) in [
            (
                "a foreign token",
                head_event(vec![
                    ("content-length", "5"),
                    (metadata_header.as_str(), "written-by-something-else"),
                ]),
            ),
            ("an absent token", head_event(vec![("content-length", "5")])),
            (
                "a token recorded against a different length",
                head_event(vec![
                    ("content-length", "6"),
                    (metadata_header.as_str(), identity.as_str()),
                ]),
            ),
            ("a failed HeadObject", error_event(403, "AccessDenied")),
        ] {
            let (result, replay, _) = run_test_copy(
                vec![probe_event, copy_success_event()],
                test_copy_plan_with_identity_probe(),
                2,
            )
            .await;

            assert_eq!(
                result.unwrap_or_else(|error| panic!("{label} should still copy: {error:#}")),
                CopyOutcome::Copied,
                "{label} must not retire the copy"
            );
            let copies = replay
                .actual_requests()
                .filter(|request| request.headers().contains_key("x-amz-copy-source"))
                .collect::<Vec<_>>();
            assert_eq!(
                copies.len(),
                1,
                "{label} must fall through to exactly one CopyObject"
            );
            assert_eq!(
                copies[0].headers().get("if-match"),
                Some("\"destination-etag\""),
                "{label} must still guard the fallthrough copy with the listed destination ETag"
            );
        }
    }

    #[test]
    fn a_skipped_copy_is_accounted_as_skipped_rather_than_copied() {
        let stats = DeploymentStats::default();
        record_copy_outcome(&stats, CopyOutcome::Skipped, 4096);
        record_copy_outcome(&stats, CopyOutcome::Copied, 4096);

        let request = summary_request();
        let snapshot = stats.snapshot("Create", "success", &request);
        assert_eq!(snapshot.counts.skipped_objects, 1);
        assert_eq!(snapshot.counts.copied_objects, 1);
        assert_eq!(
            snapshot.bytes.copied, 4096,
            "a skipped copy must not inflate transferred bytes"
        );
    }

    #[tokio::test]
    async fn a_copy_without_an_identity_probe_issues_no_head() {
        let (result, replay, _) =
            run_test_copy(vec![copy_success_event()], test_copy_plan(None), 2).await;

        assert_eq!(
            result.expect("an unprobed copy should proceed directly"),
            CopyOutcome::Copied
        );
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"],
            "the listing-only fast path must not pay for a HeadObject"
        );
    }

    #[tokio::test]
    async fn each_application_put_attempt_uses_one_sdk_attempt() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(true);
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let writer = TestWriter::default();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .with_subscriber(test_log_subscriber(writer.clone()))
        .await;

        assert!(result.is_err());
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            vec!["PUT"]
        );
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.failed_attempts, 1);
        assert_eq!(
            snapshot.failures_by_sdk_error_kind.get("ServiceError"),
            Some(&1)
        );
        assert_eq!(
            snapshot.failures_by_service_code.get("InternalError"),
            Some(&1)
        );
        assert_eq!(snapshot.failure_states.len(), 1);
        assert_eq!(snapshot.failure_state_overflow_attempts, 0);
        let failure = &snapshot.failure_states[0];
        assert_eq!(failure.sdk_error_kind, "ServiceError");
        assert_eq!(failure.service_code.as_deref(), Some("InternalError"));
        assert!(failure.dispatch_failure_kind.is_none());
        assert!(!failure.body.attempt_observed);
        assert!(!failure.source.observed);

        let event = serialize_put_attempt_failure(failure).expect("serializable failure event");
        let parsed: serde_json::Value = serde_json::from_str(&event).expect("failure event JSON");
        assert_eq!(parsed["event"], "shin_put_object_attempt_failure");
        assert_eq!(parsed["failure"]["sdkErrorKind"], "ServiceError");
        for forbidden in [
            "file.txt",
            "destination",
            "requestId",
            "test error",
            "arn:aws",
            "etag",
        ] {
            assert!(
                !event.contains(forbidden),
                "immediate failure event retained forbidden value {forbidden}"
            );
        }
        let logs = String::from_utf8(writer.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 trace output");
        let immediate_event_lines = logs
            .lines()
            .filter(|line| line.contains("shin_put_object_attempt_failure"))
            .collect::<Vec<_>>();
        assert_eq!(immediate_event_lines.len(), 1);
        let immediate_event_line = immediate_event_lines[0];
        for forbidden in ["file.txt", "destination", "requestId", "arn:aws", "etag"] {
            assert!(
                !immediate_event_line.contains(forbidden),
                "immediate failure log retained forbidden value {forbidden}"
            );
        }
    }

    #[tokio::test]
    async fn disabled_put_diagnostics_keep_basic_counters_without_detailed_state() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(false);
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 1;

        let writer = TestWriter::default();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .with_subscriber(test_log_subscriber(writer.clone()))
        .await;

        assert!(result.is_err());
        assert_eq!(replay.actual_requests().count(), 1);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.wire_attempts, 1);
        assert_eq!(snapshot.failed_attempts, 1);
        assert_eq!(
            snapshot.failures_by_error_code.get("InternalError"),
            Some(&1)
        );
        assert!(snapshot.failures_by_sdk_error_kind.is_empty());
        assert!(snapshot.failures_by_service_code.is_empty());
        assert!(snapshot.failure_states.is_empty());
        assert_eq!(snapshot.failure_state_overflow_attempts, 0);
        let logs = String::from_utf8(writer.0.lock().expect("test log buffer").clone())
            .expect("UTF-8 trace output");
        assert!(!logs.contains("shin_put_object_attempt_failure"));
    }

    #[test]
    fn put_failure_classification_uses_fixed_sdk_and_dispatch_kinds() {
        for (connector, expected) in [
            (
                ConnectorError::timeout(Box::new(std::io::Error::new(
                    std::io::ErrorKind::TimedOut,
                    "timeout detail",
                ))),
                "timeout",
            ),
            (
                ConnectorError::io(Box::new(std::io::Error::other("io detail"))),
                "io",
            ),
            (
                ConnectorError::user(Box::new(std::io::Error::other("user detail"))),
                "user",
            ),
            (
                ConnectorError::other(Box::new(std::io::Error::other("other detail")), None),
                "other",
            ),
        ] {
            let error = aws_sdk_s3::error::SdkError::<PutObjectError>::dispatch_failure(connector);
            assert_eq!(write_error_kind(&error), "DispatchFailure");
            assert_eq!(dispatch_failure_kind(&error), Some(expected));
        }

        let timeout = aws_sdk_s3::error::SdkError::<PutObjectError>::timeout_error(
            std::io::Error::new(std::io::ErrorKind::TimedOut, "timeout detail"),
        );
        assert_eq!(write_error_kind(&timeout), "TimeoutError");
        assert_eq!(dispatch_failure_kind(&timeout), None);
    }

    #[test]
    fn diagnostic_label_maps_reserve_the_other_bucket() {
        let counts = Mutex::new(BTreeMap::new());
        for index in 0..40 {
            record_bounded_diagnostic_count(&counts, format!("Code{index}"));
        }
        let counts = counts.lock().expect("diagnostic counts");
        assert_eq!(counts.len(), 32);
        assert_eq!(counts.get("Other"), Some(&9));
        assert_eq!(
            sanitize_diagnostic_label("RequestTimeout"),
            "RequestTimeout"
        );
        assert_eq!(sanitize_diagnostic_label("1RequestTimeout"), "Other");
        assert_eq!(sanitize_diagnostic_label("Request-Timeout"), "Other");
    }

    #[tokio::test]
    async fn put_failure_groups_are_bounded_with_explicit_overflow() {
        let events = (0..33)
            .map(|index| error_event(500, &format!("Code{index}")))
            .collect();
        let replay = StaticReplayClient::new(events);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::new(true);
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = 33;

        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await;

        assert!(result.is_err());
        assert_eq!(replay.actual_requests().count(), 33);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.failed_attempts, 33);
        assert_eq!(snapshot.failure_states.len(), 32);
        assert_eq!(snapshot.failure_state_overflow_attempts, 1);
        assert_eq!(
            snapshot.failures_by_sdk_error_kind.get("ServiceError"),
            Some(&33)
        );
        assert_eq!(snapshot.failures_by_service_code.len(), 32);
        assert_eq!(snapshot.failures_by_service_code.get("Other"), Some(&2));
    }

    #[tokio::test]
    async fn comparison_pass_spools_only_entries_within_the_limit() {
        let bytes = b"comparison output bytes";
        let plan = integrity_plan(bytes, None);

        let (_, _, _, spooled) =
            digest_async_reader(Box::pin(Cursor::new(bytes)), &plan, bytes.len() as u64)
                .await
                .expect("entry at the limit is spooled");
        assert_eq!(spooled.as_deref(), Some(&bytes[..]));

        let (_, _, _, not_spooled) =
            digest_async_reader(Box::pin(Cursor::new(bytes)), &plan, bytes.len() as u64 - 1)
                .await
                .expect("entry over the limit still hashes");
        assert!(not_spooled.is_none());
    }

    #[tokio::test]
    async fn marker_comparison_spools_small_entries_and_skips_the_second_pass() {
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        // One claim for the planning read and one for the reference second-pass body.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 2);
        let stats = Arc::new(DeploymentStats::default());

        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            expected.len() as u64,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let UploadPayload::Bytes { bytes, .. } = &payload else {
            panic!("an output within the spool cap must become a spooled Bytes payload");
        };
        assert_eq!(bytes.as_ref(), expected);

        // Planning ran once and the upload pass was skipped: planning 1 / upload 0.
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
        assert_eq!(summary.marker_replacement.spooled_uploads, 1);

        // A spooled payload never reads the archive again, so the caller skipped
        // `retain_zip_entry_for_replay` and no upload body was ever polled.
        let source = store.source_diagnostics_snapshot();
        assert_eq!(source.replay_claims, 0);
        assert_eq!(source.body_attempts, 0);

        // Byte-exactness against the second pass: the marker body the streaming
        // variant would have produced must equal the spooled bytes exactly.
        let body_state = Arc::new(UploadBodyState::default());
        let body = marker_zip_entry_body(
            Arc::clone(&store),
            plan,
            expected.len() as u64,
            Arc::clone(&body_state),
            Arc::new(AtomicUsize::new(0)),
            MarkerBodyContext {
                replacements,
                stats: Arc::new(DeploymentStats::default()),
            },
            None,
        );
        let second_pass = ByteStream::new(body.into_inner())
            .collect()
            .await
            .expect("reference marker body")
            .into_bytes();
        assert_eq!(second_pass.as_ref(), expected);
        assert_eq!(second_pass.as_ref(), bytes.as_ref());
    }

    #[tokio::test]
    async fn marker_spooled_entry_skipped_by_matching_etag_is_not_counted_as_an_upload() {
        // A re-deploy of unchanged marker content: the replaced output fits the spool
        // and its MD5 matches the destination ETag, so the entry is skipped without a
        // PutObject. `spooledUploads` counts uploads, so it must stay 0 here even though
        // the comparison pass materialized a spool.
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        let mut etag_hasher = Md5::new();
        etag_hasher.update(expected);
        // finalize_digest is the exact function production uses to derive the ETag,
        // so this matching value cannot drift from what the comparison pass computes.
        let matching_etag = finalize_digest(etag_hasher);
        let destination = DestinationObject {
            etag: Some(matching_etag),
            size: Some(expected.len() as u64),
        };
        // Only the comparison/planning read happens; the skip returns before any upload.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 1);
        let stats = Arc::new(DeploymentStats::default());

        let result = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            Some(&destination),
            &stats,
            expected.len() as u64,
        )
        .await
        .expect("marker prepare must succeed");

        assert!(result.is_none(), "a matching ETag must skip the upload");

        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(
            summary.marker_replacement.spooled_uploads, 0,
            "a skipped entry issued no PutObject, so it is not a spooled upload"
        );
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
    }

    #[tokio::test]
    async fn marker_comparison_falls_back_to_streaming_when_the_output_exceeds_the_cap() {
        let zip = zip_from_entry("marker.txt", b"before TOKEN after");
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let expected = b"before expanded-value after";
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );
        // One claim for the planning read and one for the upload body poll below.
        let store = ready_store_for_plan_with_claims(&zip, &plan, 2);
        let stats = Arc::new(DeploymentStats::default());

        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            expected.len() as u64 - 1,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let UploadPayload::ZipEntry {
            content_length,
            marker_replacements,
            ..
        } = &payload
        else {
            panic!("an output over the spool cap must keep the streaming marker payload");
        };
        assert_eq!(*content_length, expected.len() as u64);
        assert!(
            marker_replacements.is_some(),
            "the streaming payload must carry the marker replacements"
        );

        // The spooled counter stays put: only the planning pass ran so far.
        let summary = stats.snapshot("Update", "success", &DeploymentRequest::for_test());
        assert_eq!(summary.marker_replacement.planning_passes, 1);
        assert_eq!(summary.marker_replacement.upload_passes, 0);
        assert_eq!(summary.marker_replacement.spooled_uploads, 0);

        // The streaming payload replays from the archive, so the caller retained it
        // with a replay claim for the upload body.
        let source = store.source_diagnostics_snapshot();
        assert_eq!(source.replay_claims, 1);

        // The streaming body still produces the exact replaced output.
        let uploaded = payload_body(&payload)
            .collect()
            .await
            .expect("streaming marker body")
            .into_bytes();
        assert_eq!(uploaded.as_ref(), expected);
    }

    /// Drives a real transfer of one marker entry through `upload_zip_entries`
    /// (scheduler, source block fetch, comparison pass, destination PUT) so the
    /// transfer sub-timings come from the instrumented task body rather than
    /// being hand-seeded. The prepare and put spans must be nonzero, their sum
    /// must fit inside the enclosing task total at microsecond resolution —
    /// this task runs to completion, which is the precondition the containment
    /// relation documents at the `PhaseMillis` definition site — and the
    /// marker planning read must record a prepare-phase source fetch wait.
    /// The replaced output fits the spool budget, so the PUT body is spooled
    /// bytes and no put-phase source fetch can occur. Removing any
    /// accumulation site below must make one of these assertions fail.
    #[tokio::test]
    async fn transfer_sub_timings_cover_prepare_put_and_source_fetch_waits() {
        let zip = zip_from_entry(
            "marker.txt",
            format!("{}TOKEN{}", "x".repeat(4 * 1024), "y".repeat(4 * 1024)).as_bytes(),
        );
        let plan = zip_plan_from_archive(&zip, "marker.txt");

        // The store `upload_zip_entries` builds fetches the entry's source span
        // through the source client, so the replay serves the ranged GET, the
        // metadata HEAD (via `prepare_source_zip`), and the destination PUT.
        let source_span =
            zip[plan.source_offset as usize..plan.source_span_end_exclusive as usize].to_vec();
        let replay = StaticReplayClient::new(vec![
            head_event(vec![
                (
                    "content-length",
                    Box::leak(zip.len().to_string().into_boxed_str()),
                ),
                ("etag", "\"test-source-etag\""),
            ]),
            range_success_event(source_span, plan.source_offset, zip.len() as u64),
            put_success_event(),
        ]);
        let state = test_app_state_with_replay(replay.clone());
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let archives = vec![SourceArchive { source }];
        let mut request = DeploymentRequest::for_test();
        request.extract = true;
        request.source_markers[0] =
            HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]);
        request.source_markers_config[0] = MarkerConfig::default();
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");

        upload_zip_entries(
            &state,
            &archives,
            &request,
            BTreeMap::from([(0_usize, vec![plan])]),
            &HashMap::new(),
            source_budget,
            TransferExecution {
                stats: Arc::clone(&stats),
                deadlines: InvocationDeadlines::from_remaining_at(
                    TokioInstant::now(),
                    Duration::from_secs(120),
                ),
            },
        )
        .await
        .expect("synthetic transfer run succeeds");

        let (task_total, prepare, put, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare > 0,
            "the comparison pass must be measured, got {prepare} us"
        );
        assert!(
            put > 0,
            "the destination PUT must be measured, got {put} us"
        );
        assert!(
            prepare.saturating_add(put) <= task_total,
            "prepare ({prepare} us) + put ({put} us) must fit inside the task total \
             ({task_total} us)"
        );
        assert!(
            prepare_source_wait > 0,
            "the marker planning read must record its prepare-phase source \
             fetch wait, got {prepare_source_wait} us"
        );
        assert_eq!(
            put_source_wait, 0,
            "a spooled body never reads the archive during the PUT, so no \
             put-phase fetch wait may be recorded"
        );
    }

    /// The task body's skip path (a destination ETag matches the freshly
    /// computed comparison ETag, so the entry is not uploaded) still did the
    /// full comparison read, decode, and hash — that work is how the ETag was
    /// computed — and `transferPrepare` must record it. This is the regression
    /// test for the `let-else` early return that used to skip the prepare
    /// accumulation. The replay serves no PUT event, so an attempted upload
    /// exhausts it and fails the run.
    #[tokio::test]
    async fn transfer_prepare_records_the_skipped_entry_comparison_pass() {
        let content = format!("{}TOKEN{}", "x".repeat(4 * 1024), "y".repeat(4 * 1024));
        let zip = zip_from_entry("marker.txt", content.as_bytes());
        let plan = zip_plan_from_archive(&zip, "marker.txt");

        // The store `upload_zip_entries` builds fetches the entry's source span
        // through the source client, so the replay serves the metadata HEAD and
        // the comparison ranged GET, and nothing else: the skip must return
        // before any destination PUT.
        let source_span =
            zip[plan.source_offset as usize..plan.source_span_end_exclusive as usize].to_vec();
        let replay = StaticReplayClient::new(vec![
            head_event(vec![
                (
                    "content-length",
                    Box::leak(zip.len().to_string().into_boxed_str()),
                ),
                ("etag", "\"test-source-etag\""),
            ]),
            range_success_event(source_span, plan.source_offset, zip.len() as u64),
        ]);
        let state = test_app_state_with_replay(replay.clone());
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let archives = vec![SourceArchive { source }];
        let mut request = DeploymentRequest::for_test();
        request.extract = true;
        // No markers: the marker-free comparison pass runs because the
        // destination object carries the exact size, and the freshly computed
        // ETag matches the destination, which is the skip condition.
        let destination = DestinationObject {
            etag: Some(md5_hex(content.as_bytes())),
            size: Some(content.len() as u64),
        };
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");

        upload_zip_entries(
            &state,
            &archives,
            &request,
            BTreeMap::from([(0_usize, vec![plan])]),
            &HashMap::from([("marker.txt".to_string(), destination)]),
            source_budget,
            TransferExecution {
                stats: Arc::clone(&stats),
                deadlines: InvocationDeadlines::from_remaining_at(
                    TokioInstant::now(),
                    Duration::from_secs(120),
                ),
            },
        )
        .await
        .expect("synthetic transfer run succeeds");

        let (_, prepare, put, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare > 0,
            "the skipped comparison pass must still be measured, got {prepare} us"
        );
        assert!(
            prepare_source_wait > 0,
            "the skipped comparison read must record its prepare-phase source \
             fetch wait, got {prepare_source_wait} us"
        );
        assert_eq!(
            put, 0,
            "a skipped entry issues no PUT, so no put span may be recorded"
        );
        assert_eq!(
            put_source_wait, 0,
            "a skipped entry has no upload body, so no put-phase fetch wait \
             may be recorded"
        );
    }

    /// A streaming (non-spooled) upload body generates its content during the
    /// PUT, so its source block fetches must be attributed to the put phase
    /// (`transferPutSourceWait`) rather than the prepare phase. The replaced
    /// output exceeds the spool cap, so `prepare_zip_entry_upload` returns the
    /// streaming marker payload; the comparison pass that produced it records
    /// the prepare-phase wait, and driving the upload body — the same
    /// `ByteStream` the destination PUT polls — records the put-phase wait.
    /// The store is the real network-backed store, and the single per-block
    /// claim is consumed by the comparison reader, so the body pass re-fetches
    /// every block from the source instead of hitting a cache: both waits are
    /// real source round-trips.
    #[tokio::test]
    async fn transfer_put_source_wait_records_streaming_upload_body_fetches() {
        let content = format!("{}TOKEN{}", "x".repeat(64 * 1024), "y".repeat(64 * 1024));
        let zip = zip_from_entry("marker.txt", content.as_bytes());
        let plan = zip_plan_from_archive(&zip, "marker.txt");
        let replacements = Arc::new(
            MarkerReplacements::new(
                &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
                &MarkerConfig::default(),
            )
            .expect("marker automaton"),
        );

        // The replay serves the metadata HEAD, then one ranged GET per source
        // block for the comparison pass, then the same GETs again for the
        // streaming body pass. The real store computes one claim per block, and
        // `retain_zip_entry_for_replay` re-arms a released block, so the body
        // pass genuinely re-fetches.
        let mut events = vec![head_event(vec![
            (
                "content-length",
                Box::leak(zip.len().to_string().into_boxed_str()),
            ),
            ("etag", "\"test-source-etag\""),
        ])];
        for _ in 0..2 {
            let mut start = plan.source_offset;
            while start < plan.source_span_end_exclusive {
                let end = (start + 1024).min(plan.source_span_end_exclusive);
                events.push(range_success_event(
                    zip[start as usize..end as usize].to_vec(),
                    start,
                    zip.len() as u64,
                ));
                start = end;
            }
        }
        let state = test_app_state_with_replay(StaticReplayClient::new(events));
        let stats = Arc::new(DeploymentStats::default());
        let source = prepare_source_zip(&state, "source", "source.zip", &stats)
            .await
            .expect("source metadata HEAD succeeds");
        let request = DeploymentRequest::for_test();
        let source_budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");
        let window_bytes = source_window_bytes_for_archive(&request.runtime, source.len(), 1);
        let store = SourceBlockStore::new(
            Arc::clone(&source),
            std::slice::from_ref(&plan),
            SourceBlockOptions {
                block_bytes: request.runtime.source_block_bytes,
                merge_gap_bytes: request.runtime.source_block_merge_gap_bytes,
                get_concurrency: request.runtime.source_get_concurrency,
                window_bytes,
            },
            Arc::clone(&source_budget),
        )
        .expect("store constructs");

        // The replaced output (128 KiB plus the replacement delta) exceeds the
        // cap, so the payload stays streaming and reads the archive again
        // during upload.
        let payload = prepare_zip_entry_upload(
            &store,
            &plan,
            Some(Arc::clone(&replacements)),
            None,
            &stats,
            64 * 1024,
        )
        .await
        .expect("marker prepare must succeed")
        .expect("a fresh destination must yield a payload");

        let (_, _, _, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            prepare_source_wait > 0,
            "the comparison pass must record its prepare-phase source fetch \
             wait, got {prepare_source_wait} us"
        );
        assert_eq!(put_source_wait, 0, "nothing has driven the upload body yet");

        let uploaded = payload_body(&payload)
            .collect()
            .await
            .expect("streaming marker body")
            .into_bytes();

        let (_, _, _, prepare_source_wait, put_source_wait) =
            stats.transfer_subtimings_micros_for_test();
        assert!(
            put_source_wait > 0,
            "the streaming upload body must record put-phase source fetch \
             waits, got {put_source_wait} us"
        );
        assert!(
            prepare_source_wait > 0,
            "the comparison pass wait must survive the upload pass, got \
             {prepare_source_wait} us"
        );
        assert_eq!(
            uploaded.as_ref(),
            content.replace("TOKEN", "expanded-value").as_bytes()
        );
    }

    #[test]
    fn comparison_spool_limit_bounds_the_whole_deployment() {
        for concurrency in [1_usize, 32, 64, 128, 256] {
            let per_entry = comparison_spool_limit_bytes(concurrency);
            assert!(
                per_entry * concurrency as u64 <= COMPARISON_SPOOL_TOTAL_BUDGET_BYTES,
                "concurrency {concurrency} exceeds the total spool budget"
            );
        }
        // Degenerate configurations must not divide by zero or spool without bound.
        assert_eq!(
            comparison_spool_limit_bytes(0),
            COMPARISON_SPOOL_TOTAL_BUDGET_BYTES
        );
    }

    #[tokio::test]
    async fn trusted_md5_is_checked_for_comparison_and_marker_materialization_reads() {
        let bytes = b"authenticated bytes";
        let correct = md5_hex(bytes);
        let valid = integrity_plan(bytes, Some(correct));

        digest_async_reader(Box::pin(Cursor::new(bytes)), &valid, 0)
            .await
            .expect("comparison read should validate");
        read_async_reader_to_vec(Box::pin(Cursor::new(bytes)), &valid)
            .await
            .expect("marker materialization read should validate");

        let invalid = integrity_plan(bytes, Some("00000000000000000000000000000000".to_string()));
        let comparison_error = digest_async_reader(Box::pin(Cursor::new(bytes)), &invalid, 0)
            .await
            .expect_err("comparison read must reject mismatched bytes");
        let marker_error = read_async_reader_to_vec(Box::pin(Cursor::new(bytes)), &invalid)
            .await
            .expect_err("marker read must reject mismatched bytes");
        for error in [comparison_error, marker_error] {
            let message = error.to_string();
            assert!(!message.contains("00000000000000000000000000000000"));
            assert!(!message.contains(&md5_hex(bytes)));
            assert!(!message.contains("authenticated bytes"));
        }
    }

    #[test]
    fn put_precondition_uses_if_none_match_for_missing_destination() {
        assert_eq!(
            destination_write_precondition(None),
            Some(DestinationWritePrecondition::IfNoneMatch)
        );
    }

    #[test]
    fn put_precondition_uses_if_match_for_known_destination_etag() {
        let object = DestinationObject {
            etag: Some("abc123".to_string()),
            size: Some(10),
        };

        assert_eq!(
            destination_write_precondition(Some(&object)),
            Some(DestinationWritePrecondition::IfMatch(
                "\"abc123\"".to_string()
            ))
        );
    }

    #[test]
    fn put_precondition_falls_back_without_destination_etag() {
        let object = DestinationObject {
            etag: None,
            size: Some(10),
        };

        assert_eq!(destination_write_precondition(Some(&object)), None);
    }

    #[test]
    fn quoted_etag_wraps_normalized_copy_source_etag() {
        assert_eq!(quoted_etag("abc123"), "\"abc123\"".to_string());
    }

    #[test]
    fn object_write_retry_cap_uses_capped_exponential_delays() {
        let retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(retry_cap_millis(1, false, &retry), 250);
        assert_eq!(retry_cap_millis(2, false, &retry), 500);
        assert_eq!(retry_cap_millis(3, false, &retry), 1_000);
        assert_eq!(retry_cap_millis(4, false, &retry), 1_000);
        assert_eq!(retry_cap_millis(2, true, &retry), 2_000);
    }

    #[test]
    fn object_write_retry_delay_supports_full_jitter_and_no_jitter() {
        let coordinator = RetryCoordinator::new();
        let mut retry = PutObjectRetryOptions {
            max_attempts: 6,
            retry_base_delay_ms: 250,
            retry_max_delay_ms: 1_000,
            slowdown_retry_base_delay_ms: 1_000,
            slowdown_retry_max_delay_ms: 30_000,
            jitter: PutObjectRetryJitter::None,
        };

        assert_eq!(
            duration_ms(coordinator.retry_delay(3, false, &retry)),
            1_000
        );

        retry.jitter = PutObjectRetryJitter::Full;
        assert!(duration_ms(coordinator.retry_delay(3, false, &retry)) <= 1_000);
    }

    #[tokio::test(start_paused = true)]
    async fn write_retry_that_cannot_fit_preserves_the_s3_error() {
        for (status, code, throttled) in [(500, "InternalError", false), (503, "SlowDown", true)] {
            let replay = StaticReplayClient::new(vec![error_event(status, code)]);
            let client = replay_s3_client(replay.clone());
            let diagnostics = WriteDiagnostics::default();
            let stats = DeploymentStats::default();
            let retry_coordinator = RetryCoordinator::new();
            let retry = PutObjectRetryOptions {
                max_attempts: 2,
                retry_base_delay_ms: 30_000,
                retry_max_delay_ms: 30_000,
                slowdown_retry_base_delay_ms: 30_000,
                slowdown_retry_max_delay_ms: 30_000,
                jitter: PutObjectRetryJitter::None,
            };

            let error = upload_payload(
                PutContext {
                    destination_s3: &client,
                    destination_bucket: "destination",
                    retry: &retry,
                    retry_coordinator: &retry_coordinator,
                    diagnostics: &diagnostics,
                    stats: &stats,
                    work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
                },
                "file.txt",
                test_payload(),
                None,
            )
            .await
            .expect_err("a retry wait at or beyond the work deadline must be rejected");

            let message = format!("{error:#}");
            assert!(message.contains("not retrying destination PutObject"));
            assert!(message.contains("deployment work deadline"));
            assert!(message.contains(code), "missing {code} in {message}");
            assert_eq!(replay.actual_requests().count(), 1);
            let snapshot = diagnostics.snapshot();
            assert_eq!(snapshot.failed_attempts, 1);
            assert_eq!(snapshot.retry_attempts, 0);
            assert_eq!(snapshot.retry_wait_millis, 0);
            assert_eq!(snapshot.throttled_attempts, u64::from(throttled));
            assert_eq!(snapshot.throttle_cooldown_waits, 0);
            assert_eq!(snapshot.throttle_cooldown_wait_millis, 0);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn shared_throttle_cooldown_stops_new_writes_before_the_work_deadline() {
        let replay = StaticReplayClient::new(vec![]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        retry_coordinator.extend_throttle_cooldown(std::time::Duration::from_secs(30));
        let retry = test_retry_options();

        let error = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await
        .expect_err("a shared cooldown beyond the work deadline must stop admission");

        assert!(
            error
                .to_string()
                .contains("destination PutObject throttle cooldown for file.txt")
        );
        assert_eq!(replay.actual_requests().count(), 0);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.wire_attempts, 0);
        assert_eq!(snapshot.throttle_cooldown_waits, 0);
        assert_eq!(snapshot.throttle_cooldown_wait_millis, 0);
    }

    #[tokio::test(start_paused = true)]
    async fn write_retry_that_fits_before_the_deadline_still_retries() {
        let replay =
            StaticReplayClient::new(vec![error_event(500, "InternalError"), put_success_event()]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 500,
            retry_max_delay_ms: 500,
            slowdown_retry_base_delay_ms: 500,
            slowdown_retry_max_delay_ms: 500,
            jitter: PutObjectRetryJitter::None,
        };

        upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: tokio::time::Instant::now() + std::time::Duration::from_secs(1),
            },
            "file.txt",
            test_payload(),
            None,
        )
        .await
        .expect("a retry wait that fits before the work deadline should succeed");

        assert_eq!(replay.actual_requests().count(), 2);
        let snapshot = diagnostics.snapshot();
        assert_eq!(snapshot.retry_attempts, 1);
        assert_eq!(snapshot.retry_wait_millis, 500);
    }

    fn integrity_plan(bytes: &[u8], md5: Option<String>) -> ZipEntryPlan {
        ZipEntryPlan {
            crc32: crc32fast::hash(bytes),
            trusted_integrity: md5.map(|md5| TrustedEntryIntegrity {
                size: bytes.len() as u64,
                md5,
            }),
            ..ZipEntryPlan::for_test("entry.txt", bytes.len() as u64, 0, bytes.len() as u64)
        }
    }

    async fn run_ambiguous_put(headers: Vec<(&str, &str)>) -> (Result<()>, Vec<String>, bool) {
        let replay = StaticReplayClient::new(vec![
            error_event(500, "InternalError"),
            error_event(412, "PreconditionFailed"),
            head_event(headers),
        ]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let retry = test_retry_options();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            "file.txt",
            test_payload(),
            Some(DestinationWritePrecondition::IfNoneMatch),
        )
        .await;
        let requests = replay
            .actual_requests()
            .map(|request| request.method().to_string())
            .collect();
        let checksum_mode_requested = replay.actual_requests().any(|request| {
            request.method() == "HEAD" && request.headers().get("x-amz-checksum-mode").is_some()
        });
        (result, requests, checksum_mode_requested)
    }

    async fn run_conditional_put(
        events: Vec<ReplayEvent>,
        retry: PutObjectRetryOptions,
        work_deadline: TokioInstant,
    ) -> (
        Result<()>,
        StaticReplayClient,
        WriteDiagnostics,
        DeploymentStats,
    ) {
        let replay = StaticReplayClient::new(events);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let result = upload_payload(
            PutContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline,
            },
            "file.txt",
            test_payload(),
            Some(DestinationWritePrecondition::IfNoneMatch),
        )
        .await;
        (result, replay, diagnostics, stats)
    }

    async fn run_test_copy(
        events: Vec<ReplayEvent>,
        plan: CopyPlan,
        max_attempts: usize,
    ) -> (
        Result<CopyOutcome>,
        StaticReplayClient,
        WriteDiagnosticsSnapshot,
    ) {
        let replay = StaticReplayClient::new(events);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let mut retry = test_retry_options();
        retry.max_attempts = max_attempts;
        let result = copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            &plan,
        )
        .await;
        (result, replay, diagnostics.snapshot())
    }

    fn test_copy_plan(destination_precondition: Option<DestinationWritePrecondition>) -> CopyPlan {
        CopyPlan {
            source_bucket: "source".to_string(),
            source_key: "archive.zip".to_string(),
            expected_etag: "source-etag".to_string(),
            destination_key: "site/file.txt".to_string(),
            destination_precondition,
            size: 5,
            identity_probe: false,
        }
    }

    /// Pins the `x-amz-copy-source` encoding for the two characters that a
    /// form-encoding fixup would have mattered for. `urlencoding::encode` emits `%20`
    /// for a space and `%2B` for a literal `+`, never a bare `+`, so no post-encode
    /// `+`-to-`%20` replacement is needed. A regression to a form encoder would send
    /// `a+b` for `a b` and S3 would resolve a different source key.
    #[tokio::test]
    async fn copy_source_percent_encodes_spaces_and_plus_signs() {
        let replay = StaticReplayClient::new(vec![copy_success_event()]);
        let client = replay_s3_client(replay.clone());
        let plan = CopyPlan {
            source_key: "dir/a b+c.zip".to_string(),
            ..test_copy_plan(None)
        };

        copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &PutObjectRetryOptions {
                    max_attempts: 1,
                    retry_base_delay_ms: 0,
                    retry_max_delay_ms: 0,
                    slowdown_retry_base_delay_ms: 0,
                    slowdown_retry_max_delay_ms: 0,
                    jitter: PutObjectRetryJitter::None,
                },
                retry_coordinator: &RetryCoordinator::new(),
                diagnostics: &WriteDiagnostics::default(),
                stats: &DeploymentStats::default(),
                work_deadline: test_work_deadline(),
            },
            &plan,
        )
        .await
        .expect("copy should succeed");

        let copy_source = replay
            .actual_requests()
            .next()
            .expect("one copy request")
            .headers()
            .get("x-amz-copy-source")
            .expect("copy source header")
            .to_string();
        // `encode` also percent-encodes the key separator, so the header carries
        // `%2F` rather than `/`. S3 URL-decodes `CopySource`, so this resolves to the
        // same object; the behaviour predates this test and is pinned, not endorsed.
        assert_eq!(copy_source, "source/dir%2Fa%20b%2Bc.zip");
        assert!(
            !copy_source.contains('+'),
            "a bare `+` would name a different source key"
        );
    }

    fn test_copy_plan_with_identity_probe() -> CopyPlan {
        CopyPlan {
            identity_probe: true,
            ..test_copy_plan(Some(DestinationWritePrecondition::IfMatch(
                "\"destination-etag\"".to_string(),
            )))
        }
    }

    fn replay_s3_client(replay: StaticReplayClient) -> aws_sdk_s3::Client {
        let config = aws_sdk_s3::Config::builder()
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
            .retry_config(aws_sdk_s3::config::retry::RetryConfig::standard().with_max_attempts(3))
            .http_client(replay)
            .build();
        aws_sdk_s3::Client::from_conf(config)
    }

    fn error_event(status: u16, code: &str) -> ReplayEvent {
        let body = format!("<Error><Code>{code}</Code><Message>test error</Message></Error>");
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(status)
                .header("content-type", "application/xml")
                .body(SdkBody::from(body.into_bytes()))
                .unwrap(),
        )
    }

    fn head_event(headers: Vec<(&str, &str)>) -> ReplayEvent {
        let mut response = Response::builder().status(200);
        for (name, value) in headers {
            response = response.header(name, value);
        }
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            response.body(SdkBody::empty()).unwrap(),
        )
    }

    fn matching_put_head_event() -> ReplayEvent {
        head_event(vec![
            ("content-length", "5"),
            ("etag", "\"5d41402abc4b2a76b9719d911017c592\""),
        ])
    }

    fn copy_success_event() -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(200)
                .header("content-type", "application/xml")
                .body(SdkBody::from(
                    b"<CopyObjectResult><ETag>&quot;copied&quot;</ETag><LastModified>2026-07-12T00:00:00Z</LastModified></CopyObjectResult>"
                        .to_vec(),
                ))
                .unwrap(),
        )
    }

    fn put_success_event() -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(200)
                .body(SdkBody::empty())
                .unwrap(),
        )
    }

    fn range_success_event(bytes: Vec<u8>, start: u64, source_len: u64) -> ReplayEvent {
        let len = bytes.len();
        let end = start + len as u64 - 1;
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(206)
                .header("content-length", len)
                .header("content-range", format!("bytes {start}-{end}/{source_len}"))
                .body(SdkBody::from(bytes))
                .unwrap(),
        )
    }

    fn test_payload() -> UploadPayload {
        let payload = UploadPayload::from_bytes(b"hello".to_vec());
        payload.body_state().record_etag_md5(md5_hex(b"hello"));
        payload
    }

    fn test_retry_options() -> PutObjectRetryOptions {
        PutObjectRetryOptions {
            max_attempts: 2,
            retry_base_delay_ms: 0,
            retry_max_delay_ms: 0,
            slowdown_retry_base_delay_ms: 0,
            slowdown_retry_max_delay_ms: 0,
            jitter: PutObjectRetryJitter::None,
        }
    }

    fn test_work_deadline() -> tokio::time::Instant {
        tokio::time::Instant::now() + std::time::Duration::from_secs(120)
    }

    fn summary_request() -> crate::deployment::DeploymentRequest {
        crate::deployment::DeploymentRequest {
            source_object_keys: vec!["archive.zip".to_string()],
            destination_owner_id: "summary-owner".to_string(),
            ..crate::deployment::DeploymentRequest::for_test()
        }
    }

    /// Drives a real replayed copy (one failure, one success) so the counters come
    /// from `WriteDiagnostics` rather than being hand-seeded, then runs the bridge
    /// and asserts each one lands on the matching `copyObject` summary field. A
    /// mis-mapped field would pass a hand-seeded test but fail this one.
    #[tokio::test(start_paused = true)]
    async fn copy_diagnostics_reach_the_deployment_summary() {
        // A throttled failure with nonzero backoff, so the throttle and wait counters
        // are also nonzero: zero-to-zero comparisons would not catch a field swap.
        // One throttled failure and one transient failure: throttled retries record
        // cooldown waits while transient retries record `retry_wait_millis`, so both
        // are needed to make all seven counters nonzero.
        let replay = StaticReplayClient::new(vec![
            error_event(503, "SlowDown"),
            error_event(200, "InternalError"),
            copy_success_event(),
        ]);
        let client = replay_s3_client(replay.clone());
        let diagnostics = WriteDiagnostics::default();
        let stats = DeploymentStats::default();
        let retry_coordinator = RetryCoordinator::new();
        let retry = PutObjectRetryOptions {
            max_attempts: 3,
            retry_base_delay_ms: 10,
            retry_max_delay_ms: 10,
            slowdown_retry_base_delay_ms: 250,
            slowdown_retry_max_delay_ms: 250,
            jitter: PutObjectRetryJitter::None,
        };

        copy_source_object(
            CopyContext {
                destination_s3: &client,
                destination_bucket: "destination",
                retry: &retry,
                retry_coordinator: &retry_coordinator,
                diagnostics: &diagnostics,
                stats: &stats,
                work_deadline: test_work_deadline(),
            },
            &test_copy_plan(None),
        )
        .await
        .expect("provider retry should succeed");

        let request = summary_request();
        let before = stats.snapshot("Create", "success", &request);
        assert_eq!(
            before.copy_object.wire_attempts, 0,
            "the summary must stay empty until the diagnostics bridge runs"
        );

        log_copy_diagnostics(&retry, &diagnostics, &stats);

        let observed = diagnostics.snapshot();
        let after = stats.snapshot("Create", "success", &request);
        assert_eq!(after.copy_object.wire_attempts, observed.wire_attempts);
        assert_eq!(after.copy_object.failed_attempts, observed.failed_attempts);
        assert_eq!(after.copy_object.retry_attempts, observed.retry_attempts);
        assert_eq!(
            after.copy_object.throttled_attempts,
            observed.throttled_attempts
        );
        assert_eq!(after.copy_object.retry_wait_ms, observed.retry_wait_millis);
        assert_eq!(
            after.copy_object.throttle_cooldown_waits,
            observed.throttle_cooldown_waits
        );
        assert_eq!(
            after.copy_object.throttle_cooldown_wait_ms,
            observed.throttle_cooldown_wait_millis
        );

        // The replayed copy really did throttle, retry, and wait, so the mapping
        // assertions above are not comparing zero against zero.
        assert_eq!(after.copy_object.wire_attempts, 3);
        assert_eq!(after.copy_object.failed_attempts, 2);
        assert_eq!(after.copy_object.retry_attempts, 2);
        assert_eq!(after.copy_object.throttled_attempts, 1);
        assert!(
            after.copy_object.retry_wait_ms > 0,
            "the transient retry must record backoff time"
        );
        assert!(
            after.copy_object.throttle_cooldown_waits > 0
                && after.copy_object.throttle_cooldown_wait_ms > 0,
            "the throttled retry must record cooldown waits"
        );
        // Copies must not leak into the PutObject section.
        assert_eq!(after.put_object.wire_attempts, 0);
    }
}
