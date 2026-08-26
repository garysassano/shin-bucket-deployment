use std::sync::Arc;
use std::sync::atomic::Ordering;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::types::MetadataDirective;
use sha2::{Digest, Sha256};
use tokio::time::Instant;

use crate::deployment::{DeploymentRequest, PutObjectRetryOptions};
use crate::diagnostics::DeploymentStats;
use crate::state::AppState;
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, finalize_digest, sanitize_diagnostic};

use super::super::content_type::apply_copy_content_type;
use super::super::destination::DestinationWritePrecondition;
use super::super::planner::CopyPlan;
use super::TransferExecution;
use super::diagnostics::{
    WriteDiagnostics, WriteRetryCoordinator, is_conditional_write_conflict,
    is_retryable_conditional_write_conflict, is_retryable_write_error, log_copy_diagnostics,
    wait_for_write_retry_before_deadline, write_error_code, write_error_message,
};
use super::scheduler::TransferScheduler;

pub(super) const COPY_RECONCILIATION_METADATA_KEY: &str = "shin-copy-identity";
// Bump whenever the CopyObject output contract changes (for example, inferred metadata).
const COPY_RECONCILIATION_TOKEN_VERSION: &str = "shin-copy-v1";

pub(super) struct CopyContext<'a> {
    pub(super) destination_s3: &'a S3Client,
    pub(super) destination_bucket: &'a str,
    pub(super) retry: &'a PutObjectRetryOptions,
    pub(super) retry_coordinator: &'a WriteRetryCoordinator,
    pub(super) diagnostics: &'a WriteDiagnostics,
    pub(super) stats: &'a DeploymentStats,
    pub(super) work_deadline: Instant,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum CopyOutcome {
    Copied,
    Skipped,
}

pub(super) fn record_copy_outcome(
    stats: &DeploymentStats,
    outcome: CopyOutcome,
    copied_bytes: u64,
) {
    match outcome {
        CopyOutcome::Copied => stats.add_copied_object(copied_bytes),
        CopyOutcome::Skipped => stats.add_skipped_object(),
    }
}

pub(in crate::s3) async fn execute_copy_plans(
    state: &AppState,
    request: &DeploymentRequest,
    copy_plans: Vec<CopyPlan>,
    execution: TransferExecution,
) -> Result<()> {
    let TransferExecution { stats, deadlines } = execution;
    let copy_diagnostics = Arc::new(WriteDiagnostics::new(false));
    let retry_coordinator = Arc::new(WriteRetryCoordinator::new());
    let retry = request.runtime.put_object_retry.clone();
    let mut scheduler = TransferScheduler::new(
        request.runtime.max_parallel_transfers,
        Arc::clone(&stats),
        deadlines,
    );
    let copy_result = async {
        for plan in copy_plans {
            let state = state.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let copied_bytes = plan.size;
            let retry = retry.clone();
            let retry_coordinator = Arc::clone(&retry_coordinator);
            let diagnostics = Arc::clone(&copy_diagnostics);
            let stats = Arc::clone(&stats);

            scheduler
                .spawn(async move {
                    let outcome = copy_source_object(
                        CopyContext {
                            destination_s3: &state.destination_s3,
                            destination_bucket: &destination_bucket,
                            retry: &retry,
                            retry_coordinator: &retry_coordinator,
                            diagnostics: &diagnostics,
                            stats: &stats,
                            work_deadline: deadlines.work(),
                        },
                        &plan,
                    )
                    .await?;
                    record_copy_outcome(&stats, outcome, copied_bytes);
                    Ok(())
                })
                .await?;
        }

        scheduler.finish().await
    }
    .await;
    log_copy_diagnostics(&retry, &copy_diagnostics, &stats);
    copy_result
}

pub(super) async fn copy_source_object(
    context: CopyContext<'_>,
    plan: &CopyPlan,
) -> Result<CopyOutcome> {
    // `urlencoding::encode` percent-encodes every byte outside the unreserved set, so
    // a space becomes `%20` and a literal `+` becomes `%2B`. It never emits a bare `+`,
    // which is why no form-encoding fixup is applied here.
    let copy_source = format!(
        "{}/{}",
        plan.source_bucket,
        urlencoding::encode(&plan.source_key)
    );
    let reconciliation_identity = copy_reconciliation_identity(context.destination_bucket, plan);

    if plan.identity_probe
        && destination_matches_copy_identity(
            context.destination_s3,
            context.destination_bucket,
            plan,
            &reconciliation_identity,
            HeadRetries::Enabled,
        )
        .await
            == Some(true)
    {
        tracing::info!(
            destination_key = plan.destination_key,
            "destination already holds this exact copy; skipping"
        );
        return Ok(CopyOutcome::Skipped);
    }

    tracing::info!(
        source_bucket = plan.source_bucket,
        source_key = plan.source_key,
        destination_key = plan.destination_key,
        "copying source object"
    );

    let max_attempts = context.retry.max_attempts.max(1);
    for attempt in 1..=max_attempts {
        if !context
            .retry_coordinator
            .wait_for_throttle_cooldown_before_deadline(context.diagnostics, context.work_deadline)
            .await
        {
            return Err(anyhow!(
                "destination CopyObject throttle cooldown for {} reaches or exceeds the deployment work deadline",
                sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
            ));
        }
        let request = context
            .destination_s3
            .copy_object()
            .bucket(context.destination_bucket)
            .key(&plan.destination_key)
            .copy_source(&copy_source)
            .copy_source_if_match(quoted_etag(&plan.expected_etag))
            .metadata(COPY_RECONCILIATION_METADATA_KEY, &reconciliation_identity)
            .metadata_directive(MetadataDirective::Replace);
        let request = apply_copy_precondition(request, plan.destination_precondition.as_ref());
        context
            .diagnostics
            .wire_attempts
            .fetch_add(1, Ordering::Relaxed);

        match apply_copy_content_type(request, &plan.destination_key)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
            )
            .send()
            .await
        {
            Ok(_) => return Ok(CopyOutcome::Copied),
            Err(error) => {
                let code = write_error_code(&error);
                let throttled = code
                    .as_deref()
                    .is_some_and(crate::util::is_throttle_error_code);
                context.diagnostics.record_failure(&error, throttled);
                let conditional_conflict = is_conditional_write_conflict(&error);
                if conditional_conflict {
                    context.stats.add_conditional_conflict();
                }
                let retryable = is_retryable_write_error(&error)
                    || is_retryable_conditional_write_conflict(&error);
                if (conditional_conflict || (retryable && attempt == max_attempts))
                    && reconcile_copy(&context, plan, &reconciliation_identity).await
                {
                    return Ok(CopyOutcome::Copied);
                }
                if retryable && attempt < max_attempts {
                    if !wait_for_write_retry_before_deadline(
                        context.retry_coordinator,
                        context.diagnostics,
                        context.retry,
                        attempt,
                        throttled,
                        context.work_deadline,
                    )
                    .await
                    {
                        return Err(error).with_context(|| {
                            format!(
                                "not retrying destination CopyObject for {} because its retry wait reaches or exceeds the deployment work deadline",
                                sanitize_diagnostic(
                                    &plan.destination_key,
                                    MAX_DIAGNOSTIC_VALUE_BYTES
                                )
                            )
                        });
                    }
                    context
                        .diagnostics
                        .retry_attempts
                        .fetch_add(1, Ordering::Relaxed);
                    let diagnostic = sanitize_diagnostic(
                        &write_error_message(&error),
                        MAX_DIAGNOSTIC_VALUE_BYTES,
                    );
                    tracing::warn!(
                        destination_key = plan.destination_key,
                        attempt,
                        max_attempts,
                        error_code = ?code.as_deref(),
                        error = %diagnostic,
                        "destination CopyObject attempt failed; retrying"
                    );
                    continue;
                }
                return Err(error).with_context(|| {
                    format!(
                        "failed to copy {}/{} to {}",
                        sanitize_diagnostic(&plan.source_bucket, MAX_DIAGNOSTIC_VALUE_BYTES),
                        sanitize_diagnostic(&plan.source_key, MAX_DIAGNOSTIC_VALUE_BYTES),
                        sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
                    )
                });
            }
        }
    }

    Err(anyhow!(
        "failed to copy {}",
        sanitize_diagnostic(&plan.destination_key, MAX_DIAGNOSTIC_VALUE_BYTES)
    ))
}

pub(super) fn quoted_etag(etag: &str) -> String {
    format!("\"{etag}\"")
}

fn apply_copy_precondition(
    request: aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder,
    precondition: Option<&DestinationWritePrecondition>,
) -> aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder {
    match precondition {
        Some(DestinationWritePrecondition::IfMatch(etag)) => request.if_match(etag.as_str()),
        Some(DestinationWritePrecondition::IfNoneMatch) => request.if_none_match("*"),
        None => request,
    }
}

pub(super) fn copy_reconciliation_identity(destination_bucket: &str, plan: &CopyPlan) -> String {
    let mut hasher = Sha256::new();
    for component in [
        COPY_RECONCILIATION_TOKEN_VERSION,
        destination_bucket,
        &plan.destination_key,
        &plan.source_bucket,
        &plan.source_key,
        &plan.expected_etag,
    ] {
        hasher.update(
            u64::try_from(component.len())
                .unwrap_or(u64::MAX)
                .to_be_bytes(),
        );
        hasher.update(component.as_bytes());
    }
    hasher.update(plan.size.to_be_bytes());
    finalize_digest(hasher)
}

#[derive(Clone, Copy, Eq, PartialEq)]
enum HeadRetries {
    Enabled,
    Disabled,
}

/// `HeadObject`s the destination and reports whether it carries exactly the identity this
/// plan writes, at exactly this plan's length. `None` means the HEAD itself failed, which
/// callers must treat as "not proven" rather than as a negative answer.
async fn destination_matches_copy_identity(
    destination_s3: &S3Client,
    destination_bucket: &str,
    plan: &CopyPlan,
    expected_identity: &str,
    retries: HeadRetries,
) -> Option<bool> {
    let request = destination_s3
        .head_object()
        .bucket(destination_bucket)
        .key(&plan.destination_key)
        .customize();
    let request = match retries {
        // The ambiguous-result path is already inside a retry loop that owns the write
        // budget, so its reconciliation HEAD must not retry on its own.
        HeadRetries::Disabled => request.config_override(
            aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
        ),
        HeadRetries::Enabled => request,
    };
    let head = match request.send().await {
        Ok(head) => head,
        Err(error) => {
            let diagnostic = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            tracing::debug!(
                destination_key = plan.destination_key,
                error = %diagnostic,
                "destination HeadObject failed; copy identity is unproven"
            );
            return None;
        }
    };
    let size_matches = head
        .content_length()
        .and_then(|size| u64::try_from(size).ok())
        == Some(plan.size);
    let identity_matches = head
        .metadata()
        .and_then(|metadata| metadata.get(COPY_RECONCILIATION_METADATA_KEY))
        .is_some_and(|identity| identity == expected_identity);
    Some(size_matches && identity_matches)
}

async fn reconcile_copy(
    context: &CopyContext<'_>,
    plan: &CopyPlan,
    expected_identity: &str,
) -> bool {
    match destination_matches_copy_identity(
        context.destination_s3,
        context.destination_bucket,
        plan,
        expected_identity,
        HeadRetries::Disabled,
    )
    .await
    {
        None => {
            tracing::warn!(
                destination_key = plan.destination_key,
                "could not reconcile an ambiguous CopyObject result"
            );
            false
        }
        Some(false) => false,
        Some(true) => {
            tracing::info!(
                destination_key = plan.destination_key,
                "ambiguous CopyObject result matched the intended object"
            );
            true
        }
    }
}
