use std::collections::HashMap;
use std::mem::size_of;
use std::sync::Mutex;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::config::retry::RetryConfig;
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::error::SdkError;
use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use fastrand::Rng;
use tokio::time::{Instant, sleep_until};
use tracing::warn;

use crate::request::strip_destination_prefix;
use crate::types::{
    AppState, DeploymentManifest, DeploymentRequest, DeploymentStats, Filters,
    PutObjectRetryJitter, PutObjectRetryOptions,
};
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, sanitize_diagnostic};

const OWNER_TAG_BASE: &str = "aws-cdk:cr-owned";
const MAX_RETAINED_DELETION_KEY_BYTES: usize = 4 * 1024 * 1024;

pub(super) struct DestinationPlan {
    pub(super) objects: HashMap<String, DestinationObject>,
    current_stale: DeletionCandidates,
    previous_stale: DeletionCandidates,
}

#[derive(Clone)]
pub(super) struct DestinationObject {
    pub(super) etag: Option<String>,
    pub(super) size: Option<u64>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) enum DestinationWritePrecondition {
    IfMatch(String),
    IfNoneMatch,
}

struct DestinationRecordContext<'a> {
    strip_prefix: &'a str,
    protected_namespace: Option<&'a str>,
    filters: &'a Filters,
    manifest: &'a DeploymentManifest,
    detect_stale_candidates: bool,
}

enum DeletionCandidates {
    Complete { keys: Vec<String>, bytes: usize },
    Overflow,
}

impl Default for DeletionCandidates {
    fn default() -> Self {
        Self::Complete {
            keys: Vec::new(),
            bytes: 0,
        }
    }
}

impl DeletionCandidates {
    fn retain(&mut self, key: &str) {
        let Self::Complete { keys, bytes } = self else {
            return;
        };
        let retained_bytes = key.len().saturating_add(size_of::<String>());
        let Some(next_bytes) = bytes.checked_add(retained_bytes) else {
            *self = Self::Overflow;
            return;
        };
        if next_bytes > MAX_RETAINED_DELETION_KEY_BYTES {
            // Oversized namespaces are re-listed after transfer so planning never
            // retains an unbounded set of stale keys.
            *self = Self::Overflow;
            return;
        }
        keys.push(key.to_string());
        *bytes = next_bytes;
    }

    fn has_candidates(&self) -> bool {
        match self {
            Self::Complete { keys, .. } => !keys.is_empty(),
            Self::Overflow => true,
        }
    }

    fn keys(&self) -> Option<&[String]> {
        match self {
            Self::Complete { keys, .. } => Some(keys),
            Self::Overflow => None,
        }
    }
}

struct UnplannedDeletionContext<'a> {
    bucket: &'a str,
    list_prefix: Option<&'a str>,
    strip_prefix: &'a str,
    protected_namespace: Option<&'a str>,
    filters: Option<&'a Filters>,
    manifest: &'a DeploymentManifest,
    stats: &'a DeploymentStats,
    delete_current_stale: bool,
    previous_namespace: Option<&'a str>,
}

pub(super) struct StaleCleanupContext<'a> {
    pub(super) request: &'a DeploymentRequest,
    pub(super) protected_prefix: Option<&'a str>,
    pub(super) previous_cleanup_prefix: Option<&'a str>,
    pub(super) filters: &'a Filters,
    pub(super) manifest: &'a DeploymentManifest,
    pub(super) destination_plan: &'a DestinationPlan,
    pub(super) stats: &'a DeploymentStats,
    pub(super) work_deadline: Instant,
}

struct DeleteRetryCoordinator {
    throttle_until: Mutex<Option<Instant>>,
    jitter: Mutex<Rng>,
}

pub(crate) async fn delete_prefix(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    work_deadline: Instant,
) -> Result<u64> {
    delete_namespace(state, bucket, prefix, None, stats, retry, work_deadline).await
}

pub(crate) async fn delete_prefix_excluding(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: &str,
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    work_deadline: Instant,
) -> Result<u64> {
    delete_namespace(
        state,
        bucket,
        prefix,
        Some(excluded_prefix),
        stats,
        retry,
        work_deadline,
    )
    .await
}

async fn delete_namespace(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: Option<&str>,
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    work_deadline: Instant,
) -> Result<u64> {
    let list_prefix = namespace_list_prefix(prefix);
    let excluded_prefix = excluded_prefix.and_then(namespace_list_prefix);
    delete_listed_objects(
        state,
        bucket,
        list_prefix.as_deref(),
        stats,
        retry,
        work_deadline,
        |key| !key_is_excluded(key, excluded_prefix.as_deref()),
    )
    .await
}

/// The bucket's ownership tag keys, read once so several namespace checks against the same
/// bucket share one `GetBucketTagging` call.
pub(super) struct BucketOwnerTags {
    keys: Vec<String>,
}

impl BucketOwnerTags {
    pub(super) fn has_competing_owner(
        &self,
        prefix: &str,
        excluded_prefix: Option<&str>,
        current_owner_id: Option<&str>,
    ) -> bool {
        self.keys
            .iter()
            .any(|key| owner_tag_overlaps_cleanup(key, prefix, excluded_prefix, current_owner_id))
    }
}

pub(super) async fn read_bucket_owner_tags(
    state: &AppState,
    bucket: &str,
) -> Result<BucketOwnerTags> {
    match state
        .destination_s3
        .get_bucket_tagging()
        .bucket(bucket)
        .send()
        .await
    {
        Ok(response) => Ok(BucketOwnerTags {
            keys: response
                .tag_set()
                .iter()
                .map(|tag| tag.key().to_owned())
                .collect(),
        }),
        Err(err)
            if err
                .as_service_error()
                .and_then(|service_err| service_err.code())
                .is_some_and(|code| matches!(code, "NoSuchTagSet" | "NoSuchBucket")) =>
        {
            Ok(BucketOwnerTags { keys: Vec::new() })
        }
        Err(err) => {
            let diagnostic = sanitize_diagnostic(&err.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
            warn!(error = %diagnostic, bucket, "failed to read bucket tags");
            Err(err).with_context(|| {
                format!(
                    "unable to determine whether bucket {bucket} has a competing custom resource owner"
                )
            })
        }
    }
}

pub(crate) async fn bucket_has_competing_owner(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: Option<&str>,
    current_owner_id: Option<&str>,
) -> Result<bool> {
    Ok(read_bucket_owner_tags(state, bucket)
        .await?
        .has_competing_owner(prefix, excluded_prefix, current_owner_id))
}

pub(super) async fn plan_destination(
    state: &AppState,
    request: &DeploymentRequest,
    protected_prefix: Option<&str>,
    previous_cleanup_prefix: Option<&str>,
    filters: &Filters,
    manifest: &DeploymentManifest,
    stats: &DeploymentStats,
) -> Result<DestinationPlan> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let protected_namespace = protected_prefix.and_then(namespace_list_prefix);
    let previous_cleanup_namespace = previous_cleanup_prefix.and_then(namespace_list_prefix);
    let mut start_after = None;
    let mut objects = HashMap::new();
    let mut listed_objects = 0_u64;
    let mut current_stale = DeletionCandidates::default();
    let mut previous_stale = DeletionCandidates::default();

    loop {
        let response = state
            .destination_s3
            .list_objects_v2()
            .bucket(&request.dest_bucket_name)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;
        stats.record_destination_page_objects(response.contents().len() as u64);
        listed_objects = listed_objects.saturating_add(response.contents().len() as u64);

        for object in response.contents() {
            let Some(key) = object.key() else { continue };
            let current_key_is_stale = record_destination_object(
                key,
                object.e_tag(),
                object.size().and_then(|size| u64::try_from(size).ok()),
                DestinationRecordContext {
                    strip_prefix,
                    protected_namespace: protected_namespace.as_deref(),
                    filters,
                    manifest,
                    detect_stale_candidates: request.delete_stale_objects_on_deployment,
                },
                &mut objects,
            );
            if current_key_is_stale {
                current_stale.retain(key);
            }
            if previous_cleanup_namespace
                .as_deref()
                .is_some_and(|prefix| key.starts_with(prefix))
                && unplanned_destination_key(key, strip_prefix, None, None, manifest)
            {
                previous_stale.retain(key);
            }
        }

        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    stats.add_destination_objects(listed_objects);
    stats.set_destination_metadata_retained(objects.len() as u64);

    Ok(DestinationPlan {
        objects,
        current_stale,
        previous_stale,
    })
}

pub(super) async fn delete_stale_objects(
    state: &AppState,
    context: StaleCleanupContext<'_>,
) -> Result<()> {
    let StaleCleanupContext {
        request,
        protected_prefix,
        previous_cleanup_prefix,
        filters,
        manifest,
        destination_plan,
        stats,
        work_deadline,
    } = context;
    let delete_current_stale = request.delete_stale_objects_on_deployment
        && destination_plan.current_stale.has_candidates();
    let delete_previous_stale =
        previous_cleanup_prefix.is_some() && destination_plan.previous_stale.has_candidates();

    // Both checks below are against the same destination bucket, so read its ownership tags
    // once instead of issuing a second GetBucketTagging round trip for the previous prefix.
    let owner_tags = if delete_current_stale || delete_previous_stale {
        Some(read_bucket_owner_tags(state, &request.dest_bucket_name).await?)
    } else {
        None
    };

    let current_cleanup_authorized = match owner_tags.as_ref().filter(|_| delete_current_stale) {
        Some(tags)
            if tags.has_competing_owner(
                &request.dest_bucket_prefix,
                protected_prefix,
                request.destination_owner_id.as_deref(),
            ) =>
        {
            warn!(
                "stale destination objects retained because another custom resource owns an overlapping namespace"
            );
            false
        }
        Some(_) => true,
        None => false,
    };
    let previous_cleanup_authorized = match previous_cleanup_prefix
        .filter(|_| delete_previous_stale)
        .zip(owner_tags.as_ref())
    {
        Some((prefix, tags))
            if tags.has_competing_owner(prefix, None, request.destination_owner_id.as_deref()) =>
        {
            warn!(
                "previous destination retained because another custom resource owns an overlapping namespace"
            );
            false
        }
        Some(_) => true,
        None => false,
    };
    if !current_cleanup_authorized && !previous_cleanup_authorized {
        return Ok(());
    }

    let started = std::time::Instant::now();
    let retry_coordinator = DeleteRetryCoordinator::new();
    let retry = &request.runtime.put_object_retry;
    delete_stale_objects_with_retry(
        state,
        request,
        protected_prefix,
        previous_cleanup_prefix,
        current_cleanup_authorized,
        previous_cleanup_authorized,
        filters,
        manifest,
        destination_plan,
        stats,
        retry,
        &retry_coordinator,
        work_deadline,
    )
    .await?;
    let elapsed = crate::util::duration_ms(started.elapsed());
    if current_cleanup_authorized {
        stats.add_delete_millis(elapsed);
    } else {
        stats.add_old_prefix_delete_millis(elapsed);
    }
    Ok(())
}

#[allow(clippy::too_many_arguments)]
async fn delete_stale_objects_with_retry(
    state: &AppState,
    request: &DeploymentRequest,
    protected_prefix: Option<&str>,
    previous_cleanup_prefix: Option<&str>,
    delete_current_stale: bool,
    delete_previous_stale: bool,
    filters: &Filters,
    manifest: &DeploymentManifest,
    destination_plan: &DestinationPlan,
    stats: &DeploymentStats,
    retry: &PutObjectRetryOptions,
    retry_coordinator: &DeleteRetryCoordinator,
    work_deadline: Instant,
) -> Result<u64> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let protected_namespace = protected_prefix.and_then(namespace_list_prefix);
    let previous_namespace = previous_cleanup_prefix.and_then(namespace_list_prefix);

    let retained_current = delete_current_stale
        .then(|| destination_plan.current_stale.keys())
        .flatten();
    let retained_previous = delete_previous_stale
        .then(|| destination_plan.previous_stale.keys())
        .flatten();
    if (!delete_current_stale || retained_current.is_some())
        && (!delete_previous_stale || retained_previous.is_some())
    {
        let mut deleted = 0_u64;
        if let Some(keys) = retained_current {
            deleted = deleted.saturating_add(
                delete_keys_optional_stats(
                    state,
                    &request.dest_bucket_name,
                    keys,
                    Some(stats),
                    retry,
                    retry_coordinator,
                    work_deadline,
                )
                .await?,
            );
        }
        if let Some(keys) = retained_previous {
            deleted = deleted.saturating_add(
                delete_keys_optional_stats(
                    state,
                    &request.dest_bucket_name,
                    keys,
                    Some(stats),
                    retry,
                    retry_coordinator,
                    work_deadline,
                )
                .await?,
            );
        }
        return Ok(deleted);
    }

    delete_unplanned_objects(
        state,
        UnplannedDeletionContext {
            bucket: &request.dest_bucket_name,
            list_prefix: list_prefix.as_deref(),
            strip_prefix,
            protected_namespace: protected_namespace.as_deref(),
            filters: Some(filters),
            manifest,
            stats,
            delete_current_stale,
            previous_namespace: delete_previous_stale
                .then_some(previous_namespace.as_deref())
                .flatten(),
        },
        retry,
        retry_coordinator,
        work_deadline,
    )
    .await
}

async fn delete_unplanned_objects(
    state: &AppState,
    context: UnplannedDeletionContext<'_>,
    retry: &PutObjectRetryOptions,
    retry_coordinator: &DeleteRetryCoordinator,
    work_deadline: Instant,
) -> Result<u64> {
    delete_listed_objects_with_coordinator(
        state,
        context.bucket,
        context.list_prefix,
        Some(context.stats),
        retry,
        retry_coordinator,
        work_deadline,
        |key| unplanned_cleanup_key(key, &context),
    )
    .await
}

fn unplanned_cleanup_key(key: &str, context: &UnplannedDeletionContext<'_>) -> bool {
    let current_stale = context.delete_current_stale
        && unplanned_destination_key(
            key,
            context.strip_prefix,
            context.protected_namespace,
            context.filters,
            context.manifest,
        );
    let previous_stale = context
        .previous_namespace
        .is_some_and(|prefix| key.starts_with(prefix))
        && unplanned_destination_key(key, context.strip_prefix, None, None, context.manifest);
    current_stale || previous_stale
}

async fn delete_listed_objects<F>(
    state: &AppState,
    bucket: &str,
    list_prefix: Option<&str>,
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    work_deadline: Instant,
    should_delete: F,
) -> Result<u64>
where
    F: Fn(&str) -> bool,
{
    let retry_coordinator = DeleteRetryCoordinator::new();
    delete_listed_objects_with_coordinator(
        state,
        bucket,
        list_prefix,
        stats,
        retry,
        &retry_coordinator,
        work_deadline,
        should_delete,
    )
    .await
}

#[allow(clippy::too_many_arguments)]
async fn delete_listed_objects_with_coordinator<F>(
    state: &AppState,
    bucket: &str,
    list_prefix: Option<&str>,
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    retry_coordinator: &DeleteRetryCoordinator,
    work_deadline: Instant,
    should_delete: F,
) -> Result<u64>
where
    F: Fn(&str) -> bool,
{
    let list_prefix = list_prefix.map(ToOwned::to_owned);
    let mut response = match list_destination_page(state, bucket, list_prefix.clone(), None).await?
    {
        Some(response) => response,
        None => return Ok(0),
    };
    let mut deleted = 0_u64;

    loop {
        if let Some(stats) = stats {
            stats.record_destination_page_objects(response.contents().len() as u64);
        }
        let keys_to_delete = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .filter(|key| should_delete(key))
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();
        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);
        let next_start_after = response
            .is_truncated()
            .unwrap_or(false)
            .then_some(last_key)
            .flatten();

        if let Some(start_after) = next_start_after {
            // The cursor is fixed by the current page, so listing the next page is
            // independent of deleting keys behind that cursor.
            let (next_page, deleted_page) = tokio::join!(
                list_destination_page(state, bucket, list_prefix.clone(), Some(start_after)),
                delete_keys_optional_stats(
                    state,
                    bucket,
                    &keys_to_delete,
                    stats,
                    retry,
                    retry_coordinator,
                    work_deadline,
                ),
            );
            deleted = deleted.saturating_add(deleted_page?);
            response = match next_page? {
                Some(response) => response,
                None => return Ok(deleted),
            };
        } else {
            deleted = deleted.saturating_add(
                delete_keys_optional_stats(
                    state,
                    bucket,
                    &keys_to_delete,
                    stats,
                    retry,
                    retry_coordinator,
                    work_deadline,
                )
                .await?,
            );
            return Ok(deleted);
        }
    }
}

async fn list_destination_page(
    state: &AppState,
    bucket: &str,
    prefix: Option<String>,
    start_after: Option<String>,
) -> Result<Option<aws_sdk_s3::operation::list_objects_v2::ListObjectsV2Output>> {
    match state
        .destination_s3
        .list_objects_v2()
        .bucket(bucket)
        .set_prefix(prefix)
        .set_start_after(start_after)
        .send()
        .await
    {
        Ok(response) => Ok(Some(response)),
        Err(error) if service_error_code(&error) == Some("NoSuchBucket") => Ok(None),
        Err(error) => Err(error.into()),
    }
}

async fn delete_keys_optional_stats(
    state: &AppState,
    bucket: &str,
    keys: &[String],
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    retry_coordinator: &DeleteRetryCoordinator,
    work_deadline: Instant,
) -> Result<u64> {
    let mut deleted = 0_u64;
    for chunk in keys.chunks(1000) {
        if chunk.is_empty() {
            continue;
        }
        let (chunk_deleted, bucket_missing) = delete_key_chunk(
            state,
            bucket,
            chunk,
            stats,
            retry,
            retry_coordinator,
            work_deadline,
        )
        .await?;
        deleted = deleted.saturating_add(chunk_deleted);
        if bucket_missing {
            return Ok(deleted);
        }
    }

    Ok(deleted)
}

#[allow(clippy::too_many_arguments)]
async fn delete_key_chunk(
    state: &AppState,
    bucket: &str,
    keys: &[String],
    stats: Option<&DeploymentStats>,
    retry: &PutObjectRetryOptions,
    retry_coordinator: &DeleteRetryCoordinator,
    work_deadline: Instant,
) -> Result<(u64, bool)> {
    let mut pending = keys.to_vec();
    let mut deleted = 0_u64;
    let max_attempts = retry.max_attempts.max(1);

    for attempt in 1..=max_attempts {
        if !retry_coordinator
            .wait_for_throttle_cooldown_before_deadline(work_deadline)
            .await
        {
            return Err(anyhow!(
                "destination DeleteObjects throttle cooldown reaches or exceeds the deployment work deadline"
            ));
        }

        let objects = pending
            .iter()
            .map(|key| ObjectIdentifier::builder().key(key).build())
            .collect::<std::result::Result<Vec<_>, _>>()?;
        let delete = Delete::builder()
            .set_objects(Some(objects))
            .quiet(true)
            .build()?;
        if let Some(stats) = stats {
            stats.record_delete_sdk_call(pending.len() as u64);
        }

        let response = state
            .destination_s3
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .customize()
            .config_override(
                aws_sdk_s3::config::Builder::new().retry_config(RetryConfig::disabled()),
            )
            .send()
            .await;

        match response {
            Ok(response) => {
                let (inferred_deleted, unconfirmed) =
                    inferred_delete_counts(pending.len() as u64, response.errors().len() as u64);
                if let Some(stats) = stats {
                    stats.record_delete_response(inferred_deleted, unconfirmed);
                }
                deleted = deleted.saturating_add(inferred_deleted);
                if response.errors().is_empty() {
                    return Ok((deleted, false));
                }

                let retryable = response.errors().iter().all(|error| {
                    error.code().is_some_and(is_retryable_delete_service_code)
                        && error.key().is_some()
                });
                let throttled = response.errors().iter().any(|error| {
                    error
                        .code()
                        .is_some_and(crate::util::is_throttle_error_code)
                });
                if retryable && attempt < max_attempts {
                    if !wait_for_delete_retry_before_deadline(
                        retry_coordinator,
                        retry,
                        attempt,
                        throttled,
                        work_deadline,
                    )
                    .await
                    {
                        return Err(partial_delete_error(bucket, response.errors())).context(
                            "not retrying destination DeleteObjects because its retry wait reaches or exceeds the deployment work deadline",
                        );
                    }
                    pending = response
                        .errors()
                        .iter()
                        .filter_map(|error| error.key().map(ToOwned::to_owned))
                        .collect();
                    warn!(
                        attempt,
                        max_attempts,
                        remaining_objects = pending.len(),
                        "destination DeleteObjects response contained retryable object errors; retrying"
                    );
                    continue;
                }
                return Err(partial_delete_error(bucket, response.errors()));
            }
            Err(error) if service_error_code(&error) == Some("NoSuchBucket") => {
                if let Some(stats) = stats {
                    stats.record_delete_no_such_bucket(pending.len() as u64);
                }
                return Ok((deleted, true));
            }
            Err(error) => {
                if let Some(stats) = stats {
                    stats.record_delete_failure(pending.len() as u64);
                }
                let throttled =
                    service_error_code(&error).is_some_and(crate::util::is_throttle_error_code);
                if is_retryable_delete_error(&error) && attempt < max_attempts {
                    if !wait_for_delete_retry_before_deadline(
                        retry_coordinator,
                        retry,
                        attempt,
                        throttled,
                        work_deadline,
                    )
                    .await
                    {
                        return Err(error).with_context(|| {
                            "not retrying destination DeleteObjects because its retry wait reaches or exceeds the deployment work deadline"
                        });
                    }
                    warn!(
                        attempt,
                        max_attempts,
                        error_code = ?service_error_code(&error),
                        "destination DeleteObjects attempt failed; retrying"
                    );
                    continue;
                }
                return Err(error)
                    .with_context(|| format!("failed to delete objects from bucket {bucket}"));
            }
        }
    }

    Err(anyhow!("failed to delete objects from bucket {bucket}"))
}

fn partial_delete_error(bucket: &str, errors: &[aws_sdk_s3::types::Error]) -> anyhow::Error {
    let details = errors
        .iter()
        .map(|error| {
            let key = error.key().unwrap_or("<unknown-key>");
            let code = error.code().unwrap_or("<unknown-code>");
            let message = error.message().unwrap_or("<no-message>");
            format!("{key}: {code} ({message})")
        })
        .collect::<Vec<_>>()
        .join(", ");
    anyhow!("failed to delete some objects from bucket {bucket}: {details}")
}

fn is_retryable_delete_service_code(code: &str) -> bool {
    crate::util::is_throttle_error_code(code)
        || matches!(
            code,
            "InternalError" | "RequestTimeout" | "RequestTimeoutException" | "ServiceUnavailable"
        )
}

fn is_retryable_delete_error<E: ProvideErrorMetadata>(error: &SdkError<E>) -> bool {
    match error {
        SdkError::ServiceError(service) => {
            let status = service.raw().status().as_u16();
            status == 408
                || status == 429
                || status >= 500
                || service
                    .err()
                    .code()
                    .is_some_and(is_retryable_delete_service_code)
        }
        SdkError::TimeoutError(_) | SdkError::DispatchFailure(_) => true,
        SdkError::ResponseError(response) => {
            let status = response.raw().status().as_u16();
            status == 408 || status == 429 || status >= 500
        }
        SdkError::ConstructionFailure(_) => false,
        _ => false,
    }
}

fn delete_retry_cap_millis(attempt: usize, throttled: bool, retry: &PutObjectRetryOptions) -> u64 {
    let (base, max) = if throttled {
        (
            retry.slowdown_retry_base_delay_ms,
            retry.slowdown_retry_max_delay_ms,
        )
    } else {
        (retry.retry_base_delay_ms, retry.retry_max_delay_ms)
    };
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    base.saturating_mul(1_u64.checked_shl(shift).unwrap_or(u64::MAX))
        .min(max)
}

async fn wait_for_delete_retry_before_deadline(
    coordinator: &DeleteRetryCoordinator,
    retry: &PutObjectRetryOptions,
    attempt: usize,
    throttled: bool,
    work_deadline: Instant,
) -> bool {
    let delay = coordinator.retry_delay(attempt, throttled, retry);
    if throttled {
        coordinator.extend_throttle_cooldown(delay);
        coordinator
            .wait_for_throttle_cooldown_before_deadline(work_deadline)
            .await
    } else {
        let now = Instant::now();
        let Some(wake) = now.checked_add(delay) else {
            return false;
        };
        if wake >= work_deadline {
            return false;
        }
        sleep_until(wake).await;
        true
    }
}

impl DeleteRetryCoordinator {
    fn new() -> Self {
        Self {
            throttle_until: Mutex::new(None),
            jitter: Mutex::new(Rng::new()),
        }
    }

    async fn wait_for_throttle_cooldown_before_deadline(&self, work_deadline: Instant) -> bool {
        loop {
            let wait = {
                let throttle_until = self
                    .throttle_until
                    .lock()
                    .expect("delete retry coordinator mutex should not be poisoned");
                throttle_until.and_then(|deadline| {
                    deadline
                        .checked_duration_since(Instant::now())
                        .map(|delay| (deadline, delay))
                })
            };
            let Some((wake, delay)) = wait else {
                return true;
            };
            if delay.is_zero() {
                return true;
            }
            if wake >= work_deadline {
                return false;
            }
            sleep_until(wake).await;
        }
    }

    fn retry_delay(
        &self,
        attempt: usize,
        throttled: bool,
        retry: &PutObjectRetryOptions,
    ) -> Duration {
        let cap_millis = delete_retry_cap_millis(attempt, throttled, retry);
        match retry.jitter {
            PutObjectRetryJitter::Full if cap_millis > 0 => {
                Duration::from_millis(self.next_jitter() % cap_millis.saturating_add(1))
            }
            PutObjectRetryJitter::Full => Duration::ZERO,
            PutObjectRetryJitter::None => Duration::from_millis(cap_millis),
        }
    }

    fn extend_throttle_cooldown(&self, delay: Duration) {
        if delay.is_zero() {
            return;
        }
        let now = Instant::now();
        let deadline = now.checked_add(delay).unwrap_or(now);
        let mut throttle_until = self
            .throttle_until
            .lock()
            .expect("delete retry coordinator mutex should not be poisoned");
        if throttle_until.is_none_or(|current| deadline > current) {
            *throttle_until = Some(deadline);
        }
    }

    fn next_jitter(&self) -> u64 {
        self.jitter
            .lock()
            .expect("delete retry jitter mutex should not be poisoned")
            .u64(..)
    }
}

fn inferred_delete_counts(requested: u64, service_errors: u64) -> (u64, u64) {
    let unconfirmed = service_errors.min(requested);
    (requested - unconfirmed, unconfirmed)
}

pub(super) fn destination_etag_matches(
    destination_objects: &HashMap<String, DestinationObject>,
    relative_key: &str,
    expected_etag: &str,
) -> bool {
    destination_objects
        .get(relative_key)
        .and_then(|object| object.etag.as_deref())
        == Some(expected_etag)
}

pub(super) fn destination_md5_and_size_match(
    object: &DestinationObject,
    expected_md5: &str,
    expected_size: u64,
) -> bool {
    object.size == Some(expected_size) && object.etag.as_deref() == Some(expected_md5)
}

pub(super) fn destination_write_precondition(
    object: Option<&DestinationObject>,
) -> Option<DestinationWritePrecondition> {
    match object {
        None => Some(DestinationWritePrecondition::IfNoneMatch),
        Some(object) => object
            .etag
            .as_deref()
            .map(|etag| DestinationWritePrecondition::IfMatch(format!("\"{etag}\""))),
    }
}

pub(super) fn normalize_etag(etag: &str) -> Option<String> {
    let normalized = etag.trim().trim_matches('"').to_ascii_lowercase();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn namespace_list_prefix(prefix: &str) -> Option<String> {
    if prefix.is_empty() {
        return None;
    }

    let mut normalized = prefix.to_string();
    if !normalized.ends_with('/') {
        normalized.push('/');
    }
    Some(normalized)
}

fn service_error_code<E>(error: &aws_sdk_s3::error::SdkError<E>) -> Option<&str>
where
    E: ProvideErrorMetadata,
{
    error
        .as_service_error()
        .and_then(ProvideErrorMetadata::code)
}

fn owner_tag_overlaps_cleanup(
    tag_key: &str,
    cleanup_prefix: &str,
    excluded_prefix: Option<&str>,
    current_owner_id: Option<&str>,
) -> bool {
    let Some((owner_prefix, owner_id)) = parse_owner_tag(tag_key) else {
        return false;
    };
    if current_owner_id == Some(owner_id) {
        return false;
    }

    let owner_namespace = namespace(owner_prefix);
    let cleanup_namespace = namespace(cleanup_prefix);
    if !namespaces_overlap(&owner_namespace, &cleanup_namespace) {
        return false;
    }

    if let Some(excluded_prefix) = excluded_prefix {
        let excluded_namespace = namespace(excluded_prefix);
        if namespace_contains(&excluded_namespace, &owner_namespace) {
            return false;
        }
    }

    true
}

fn parse_owner_tag(tag_key: &str) -> Option<(&str, &str)> {
    let suffix = tag_key.strip_prefix(&format!("{OWNER_TAG_BASE}:"))?;
    if suffix.is_empty() {
        return None;
    }

    match suffix.rsplit_once(':') {
        Some((prefix, owner_id)) if !owner_id.is_empty() => Some((prefix, owner_id)),
        None => Some(("", suffix)),
        _ => None,
    }
}

fn namespace(prefix: &str) -> String {
    namespace_list_prefix(prefix).unwrap_or_default()
}

fn namespace_contains(parent: &str, child: &str) -> bool {
    parent.is_empty() || child.starts_with(parent)
}

fn namespaces_overlap(left: &str, right: &str) -> bool {
    namespace_contains(left, right) || namespace_contains(right, left)
}

fn key_is_excluded(key: &str, excluded_namespace: Option<&str>) -> bool {
    excluded_namespace.is_some_and(|excluded| key.starts_with(excluded))
}

fn record_destination_object(
    key: &str,
    etag: Option<&str>,
    size: Option<u64>,
    context: DestinationRecordContext<'_>,
    objects: &mut HashMap<String, DestinationObject>,
) -> bool {
    let relative_key = strip_destination_prefix(context.strip_prefix, key);
    if relative_key.is_empty() {
        return false;
    }
    if !context.manifest.contains_key(&relative_key) {
        return context.detect_stale_candidates
            && !key_is_excluded(key, context.protected_namespace)
            && context.filters.should_include(&relative_key);
    }

    objects.insert(
        relative_key.clone(),
        DestinationObject {
            etag: etag.and_then(normalize_etag),
            size,
        },
    );
    false
}

#[cfg(test)]
fn stale_destination_key(
    key: &str,
    strip_prefix: &str,
    filters: &Filters,
    manifest: &DeploymentManifest,
) -> bool {
    unplanned_destination_key(key, strip_prefix, None, Some(filters), manifest)
}

fn unplanned_destination_key(
    key: &str,
    strip_prefix: &str,
    protected_namespace: Option<&str>,
    filters: Option<&Filters>,
    manifest: &DeploymentManifest,
) -> bool {
    let relative_key = strip_destination_prefix(strip_prefix, key);
    !relative_key.is_empty()
        && !key_is_excluded(key, protected_namespace)
        && !manifest.contains_key(&relative_key)
        && filters.is_none_or(|filters| filters.should_include(&relative_key))
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::time::Duration;

    use aws_sdk_s3::primitives::SdkBody;
    use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
    use http::{Request, Response};

    use super::{
        DeleteRetryCoordinator, DeletionCandidates, DestinationObject, DestinationRecordContext,
        UnplannedDeletionContext, delete_key_chunk, delete_listed_objects, inferred_delete_counts,
        key_is_excluded, namespace_list_prefix, normalize_etag, owner_tag_overlaps_cleanup,
        parse_owner_tag, record_destination_object, stale_destination_key, unplanned_cleanup_key,
        unplanned_destination_key,
    };
    use crate::request::compile_filters;
    use crate::types::{
        AppState, DeploymentManifest, PlannedAction, PlannedObject, PutObjectRetryJitter,
        PutObjectRetryOptions,
    };

    #[test]
    fn namespace_list_prefix_adds_trailing_slash() {
        assert_eq!(namespace_list_prefix("site"), Some("site/".to_string()));
    }

    #[test]
    fn delete_counts_are_inferred_from_requested_identifiers_without_errors() {
        assert_eq!(inferred_delete_counts(1_000, 0), (1_000, 0));
        assert_eq!(inferred_delete_counts(1_000, 3), (997, 3));
        assert_eq!(inferred_delete_counts(2, 4), (0, 2));
    }

    #[test]
    fn retained_deletion_candidates_fall_back_after_the_memory_cap() {
        let mut candidates = DeletionCandidates::default();
        let key = "x".repeat(1024);
        while candidates.keys().is_some() {
            candidates.retain(&key);
        }

        assert!(candidates.has_candidates());
        assert!(candidates.keys().is_none());
    }

    #[test]
    fn fused_cleanup_keeps_current_and_previous_authorization_scopes_separate() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let stats = crate::types::DeploymentStats::default();
        let current_only = UnplannedDeletionContext {
            bucket: "destination",
            list_prefix: Some("site/"),
            strip_prefix: "site/",
            protected_namespace: Some("site/initial/"),
            filters: Some(&filters),
            manifest: &manifest,
            stats: &stats,
            delete_current_stale: true,
            previous_namespace: None,
        };
        let previous_only = UnplannedDeletionContext {
            delete_current_stale: false,
            previous_namespace: Some("site/initial/"),
            ..current_only
        };

        assert!(!unplanned_cleanup_key(
            "site/initial/old.txt",
            &current_only
        ));
        assert!(unplanned_cleanup_key("site/other.txt", &current_only));
        assert!(unplanned_cleanup_key(
            "site/initial/old.txt",
            &previous_only
        ));
        assert!(!unplanned_cleanup_key("site/other.txt", &previous_only));
    }

    #[tokio::test]
    async fn retained_candidates_delete_without_a_second_list() {
        let replay = StaticReplayClient::new(vec![delete_success_event()]);
        let state = replay_app_state(replay.clone());
        let retry = retry_options(1, 0);
        let coordinator = DeleteRetryCoordinator::new();
        let keys = vec!["site/stale.txt".to_string()];

        let deleted = super::delete_keys_optional_stats(
            &state,
            "destination",
            &keys,
            None,
            &retry,
            &coordinator,
            tokio::time::Instant::now() + Duration::from_secs(10),
        )
        .await
        .expect("retained planning candidates should delete directly");

        assert_eq!(deleted, 1);
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            ["POST"]
        );
    }

    #[tokio::test]
    async fn delete_objects_retries_a_transient_request_failure() {
        let replay = StaticReplayClient::new(vec![
            error_event(500, "InternalError"),
            delete_success_event(),
        ]);
        let state = replay_app_state(replay.clone());
        let retry = retry_options(2, 0);
        let coordinator = DeleteRetryCoordinator::new();
        let keys = vec!["site/a.txt".to_string(), "site/b.txt".to_string()];

        let deleted = delete_key_chunk(
            &state,
            "destination",
            &keys,
            None,
            &retry,
            &coordinator,
            tokio::time::Instant::now() + Duration::from_secs(10),
        )
        .await
        .expect("transient DeleteObjects failure should be retried");

        assert_eq!(deleted, (2, false));
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            ["POST", "POST"]
        );
    }

    #[tokio::test]
    async fn delete_objects_retries_only_retryable_object_errors() {
        let replay = StaticReplayClient::new(vec![
            delete_partial_error_event("site/retry.txt", "SlowDown"),
            delete_success_event(),
        ]);
        let state = replay_app_state(replay.clone());
        let retry = retry_options(2, 0);
        let coordinator = DeleteRetryCoordinator::new();
        let keys = vec!["site/done.txt".to_string(), "site/retry.txt".to_string()];

        let deleted = delete_key_chunk(
            &state,
            "destination",
            &keys,
            None,
            &retry,
            &coordinator,
            tokio::time::Instant::now() + Duration::from_secs(10),
        )
        .await
        .expect("retryable per-object errors should be retried");

        assert_eq!(deleted, (2, false));
        let requests = replay.actual_requests().collect::<Vec<_>>();
        let first_body = request_body(requests[0]);
        let second_body = request_body(requests[1]);
        assert!(first_body.contains("site/done.txt"));
        assert!(first_body.contains("site/retry.txt"));
        assert!(!second_body.contains("site/done.txt"));
        assert!(second_body.contains("site/retry.txt"));
    }

    #[tokio::test(start_paused = true)]
    async fn delete_objects_does_not_wait_past_the_work_deadline() {
        let replay = StaticReplayClient::new(vec![error_event(500, "InternalError")]);
        let state = replay_app_state(replay.clone());
        let retry = retry_options(2, 30_000);
        let coordinator = DeleteRetryCoordinator::new();

        let error = delete_key_chunk(
            &state,
            "destination",
            &["site/a.txt".to_string()],
            None,
            &retry,
            &coordinator,
            tokio::time::Instant::now() + Duration::from_secs(1),
        )
        .await
        .expect_err("a retry beyond the work deadline must fail");

        let message = format!("{error:#}");
        assert!(message.contains("not retrying destination DeleteObjects"));
        assert!(message.contains("InternalError"));
        assert_eq!(replay.actual_requests().count(), 1);
    }

    #[tokio::test]
    async fn pagination_starts_the_next_list_before_deleting_the_current_page() {
        let replay = StaticReplayClient::new(vec![
            list_page_event("site/a.txt", true),
            list_page_event("site/b.txt", false),
            delete_success_event(),
            delete_success_event(),
        ]);
        let state = replay_app_state(replay.clone());

        let deleted = delete_listed_objects(
            &state,
            "destination",
            Some("site/"),
            None,
            &retry_options(1, 0),
            tokio::time::Instant::now() + Duration::from_secs(10),
            |_| true,
        )
        .await
        .expect("two paginated pages should be deleted");

        assert_eq!(deleted, 2);
        assert_eq!(
            replay
                .actual_requests()
                .map(|request| request.method().to_string())
                .collect::<Vec<_>>(),
            ["GET", "GET", "POST", "POST"]
        );
    }

    #[test]
    fn namespace_list_prefix_preserves_existing_trailing_slash() {
        assert_eq!(namespace_list_prefix("site/"), Some("site/".to_string()));
    }

    #[test]
    fn namespace_list_prefix_omits_empty_prefix() {
        assert_eq!(namespace_list_prefix(""), None);
    }

    #[test]
    fn normalize_etag_strips_quotes_and_lowercases() {
        assert_eq!(normalize_etag("\"A1B2C3\""), Some("a1b2c3".to_string()));
    }

    #[test]
    fn destination_entry_omits_non_manifest_metadata_and_identifies_stale_key() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let mut objects = HashMap::<String, DestinationObject>::new();

        let has_stale_candidate = record_destination_object(
            "site/old.txt",
            Some("\"ABC123\""),
            Some(10),
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: true,
            },
            &mut objects,
        );

        assert!(objects.is_empty());
        assert!(has_stale_candidate);
        assert!(stale_destination_key(
            "site/old.txt",
            "site/",
            &filters,
            &manifest
        ));
    }

    #[test]
    fn slash_run_aliases_cannot_satisfy_manifest_entries() {
        let filters = compile_filters(&[], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "index.html".to_string(),
            PlannedObject {
                relative_key: "index.html".to_string(),
                expected_etag: None,
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: None,
                },
            },
        );
        let mut objects = HashMap::<String, DestinationObject>::new();

        let has_stale_candidate = record_destination_object(
            "site//index.html",
            Some("\"alias-etag\""),
            Some(10),
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: true,
            },
            &mut objects,
        );

        assert!(has_stale_candidate);
        assert!(objects.is_empty());
        assert!(stale_destination_key(
            "site//index.html",
            "site/",
            &filters,
            &manifest
        ));
    }

    #[test]
    fn child_to_parent_cleanup_protects_then_explicitly_cleans_the_old_namespace() {
        let filters = compile_filters(&[], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "initial/current.txt".to_string(),
            PlannedObject {
                relative_key: "initial/current.txt".to_string(),
                expected_etag: None,
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: None,
                },
            },
        );

        assert!(!unplanned_destination_key(
            "site/initial/old.txt",
            "site/",
            Some("site/initial/"),
            Some(&filters),
            &manifest,
        ));
        assert!(unplanned_destination_key(
            "site/initial/old.txt",
            "site/",
            None,
            None,
            &manifest,
        ));
        assert!(!unplanned_destination_key(
            "site/initial/current.txt",
            "site/",
            None,
            None,
            &manifest,
        ));
    }

    #[test]
    fn destination_entry_retains_only_manifest_metadata_and_excludes_filtered_stale_key() {
        let filters = compile_filters(&["*.map".to_string()], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "keep.txt".to_string(),
            PlannedObject {
                relative_key: "keep.txt".to_string(),
                expected_etag: None,
                action: PlannedAction::CopyObject {
                    source_index: 0,
                    size: None,
                },
            },
        );
        let mut objects = HashMap::<String, DestinationObject>::new();

        let manifest_key_is_stale = record_destination_object(
            "site/keep.txt",
            None,
            Some(1),
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: true,
            },
            &mut objects,
        );
        let excluded_key_is_stale = record_destination_object(
            "site/debug.map",
            None,
            Some(1),
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: true,
            },
            &mut objects,
        );

        assert!(objects.contains_key("keep.txt"));
        assert!(!objects.contains_key("debug.map"));
        assert!(!manifest_key_is_stale);
        assert!(!excluded_key_is_stale);
        assert!(!stale_destination_key(
            "site/keep.txt",
            "site/",
            &filters,
            &manifest
        ));
        assert!(!stale_destination_key(
            "site/debug.map",
            "site/",
            &filters,
            &manifest
        ));
    }

    #[test]
    fn destination_entry_ignores_empty_relative_key() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let mut objects = HashMap::<String, DestinationObject>::new();

        let has_stale_candidate = record_destination_object(
            "site/",
            None,
            None,
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: true,
            },
            &mut objects,
        );

        assert!(objects.is_empty());
        assert!(!has_stale_candidate);
    }

    #[test]
    fn destination_entry_does_not_detect_stale_keys_when_cleanup_is_disabled() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let mut objects = HashMap::<String, DestinationObject>::new();

        let has_stale_candidate = record_destination_object(
            "site/old.txt",
            None,
            Some(1),
            DestinationRecordContext {
                strip_prefix: "site/",
                protected_namespace: None,
                filters: &filters,
                manifest: &manifest,
                detect_stale_candidates: false,
            },
            &mut objects,
        );

        assert!(objects.is_empty());
        assert!(!has_stale_candidate);
    }

    #[test]
    fn owner_tags_parse_root_and_prefixed_namespaces() {
        assert_eq!(
            parse_owner_tag("aws-cdk:cr-owned:deadbeef"),
            Some(("", "deadbeef"))
        );
        assert_eq!(
            parse_owner_tag("aws-cdk:cr-owned:site:blue:deadbeef"),
            Some(("site:blue", "deadbeef"))
        );
        assert_eq!(parse_owner_tag("unrelated"), None);
    }

    #[test]
    fn owner_overlap_is_segment_aware_and_ignores_the_current_owner() {
        assert!(owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site:other",
            "site",
            None,
            Some("current")
        ));
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site2:other",
            "site",
            None,
            Some("current")
        ));
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site:current",
            "site",
            None,
            Some("current")
        ));
    }

    #[test]
    fn owners_wholly_inside_the_excluded_namespace_are_safe() {
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site/v2:other",
            "site",
            Some("site/v2"),
            Some("current")
        ));
        assert!(owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site/v1:other",
            "site",
            Some("site/v2"),
            Some("current")
        ));
        assert!(owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site:other",
            "site",
            Some("site/v2"),
            Some("current")
        ));
    }

    #[test]
    fn cleanup_exclusion_preserves_only_the_complete_child_namespace() {
        assert!(key_is_excluded("site/v2/index.html", Some("site/v2/")));
        assert!(key_is_excluded("site/v2/nested/app.js", Some("site/v2/")));
        assert!(!key_is_excluded("site/v20/index.html", Some("site/v2/")));
        assert!(!key_is_excluded("site/v1/index.html", Some("site/v2/")));
        assert!(!key_is_excluded("site/v2", Some("site/v2/")));
        assert!(!key_is_excluded("site/v2/index.html", None));
    }

    fn replay_app_state(replay: StaticReplayClient) -> AppState {
        let s3 = aws_sdk_s3::Client::from_conf(
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
                .retry_config(
                    aws_sdk_s3::config::retry::RetryConfig::standard().with_max_attempts(3),
                )
                .http_client(replay)
                .build(),
        );
        AppState {
            source_s3: s3.clone(),
            destination_s3: s3,
            cloudfront: aws_sdk_cloudfront::Client::from_conf(
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
            http: reqwest::Client::new(),
            detailed_failure_diagnostics: false,
        }
    }

    fn retry_options(max_attempts: usize, delay_ms: u64) -> PutObjectRetryOptions {
        PutObjectRetryOptions {
            max_attempts,
            retry_base_delay_ms: delay_ms,
            retry_max_delay_ms: delay_ms,
            slowdown_retry_base_delay_ms: delay_ms,
            slowdown_retry_max_delay_ms: delay_ms,
            jitter: PutObjectRetryJitter::None,
        }
    }

    fn replay_event(status: u16, body: impl Into<Vec<u8>>) -> ReplayEvent {
        ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/expected")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(status)
                .header("content-type", "application/xml")
                .body(SdkBody::from(body.into()))
                .unwrap(),
        )
    }

    fn error_event(status: u16, code: &str) -> ReplayEvent {
        replay_event(
            status,
            format!("<Error><Code>{code}</Code><Message>test error</Message></Error>"),
        )
    }

    fn delete_success_event() -> ReplayEvent {
        replay_event(
            200,
            br#"<DeleteResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"/>"#.to_vec(),
        )
    }

    fn delete_partial_error_event(key: &str, code: &str) -> ReplayEvent {
        replay_event(
            200,
            format!(
                "<DeleteResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Error><Key>{key}</Key><Code>{code}</Code><Message>retry</Message></Error></DeleteResult>"
            ),
        )
    }

    fn list_page_event(key: &str, truncated: bool) -> ReplayEvent {
        replay_event(
            200,
            format!(
                "<ListBucketResult xmlns=\"http://s3.amazonaws.com/doc/2006-03-01/\"><Name>destination</Name><Prefix>site/</Prefix><MaxKeys>1000</MaxKeys><IsTruncated>{truncated}</IsTruncated><Contents><Key>{key}</Key><Size>1</Size></Contents></ListBucketResult>"
            ),
        )
    }

    fn request_body(request: &aws_sdk_s3::config::http::HttpRequest) -> String {
        String::from_utf8_lossy(request.body().bytes().unwrap_or_default()).into_owned()
    }
}
