use std::collections::HashMap;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use tracing::warn;

use crate::request::strip_destination_prefix;
use crate::types::{AppState, DeploymentManifest, DeploymentRequest, DeploymentStats, Filters};

const OWNER_TAG_BASE: &str = "aws-cdk:cr-owned";

pub(super) struct DestinationPlan {
    pub(super) objects: HashMap<String, DestinationObject>,
    pub(super) has_stale_candidates: bool,
}

#[derive(Clone)]
pub(super) struct DestinationObject {
    pub(super) etag: Option<String>,
    pub(super) size: Option<u64>,
}

struct DestinationRecordContext<'a> {
    strip_prefix: &'a str,
    filters: &'a Filters,
    manifest: &'a DeploymentManifest,
    detect_stale_candidates: bool,
}

pub(crate) async fn delete_prefix(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    stats: Option<&DeploymentStats>,
) -> Result<u64> {
    delete_namespace(state, bucket, prefix, None, stats).await
}

pub(crate) async fn delete_prefix_excluding(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: &str,
    stats: Option<&DeploymentStats>,
) -> Result<u64> {
    delete_namespace(state, bucket, prefix, Some(excluded_prefix), stats).await
}

async fn delete_namespace(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: Option<&str>,
    stats: Option<&DeploymentStats>,
) -> Result<u64> {
    let list_prefix = namespace_list_prefix(prefix);
    let excluded_prefix = excluded_prefix.and_then(namespace_list_prefix);
    let mut start_after = None;
    let mut deleted = 0_u64;

    loop {
        let response = match state
            .destination_s3
            .list_objects_v2()
            .bucket(bucket)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await
        {
            Ok(response) => response,
            Err(error) if service_error_code(&error) == Some("NoSuchBucket") => return Ok(deleted),
            Err(error) => return Err(error.into()),
        };

        let mut keys_to_delete = Vec::new();
        for object in response.contents() {
            if let Some(key) = object.key()
                && !key_is_excluded(key, excluded_prefix.as_deref())
            {
                keys_to_delete.push(key.to_string());
            }
        }

        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        deleted = deleted.saturating_add(
            delete_keys_optional_stats(state, bucket, &keys_to_delete, stats).await?,
        );

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    Ok(deleted)
}

pub(crate) async fn bucket_has_competing_owner(
    state: &AppState,
    bucket: &str,
    prefix: &str,
    excluded_prefix: Option<&str>,
    current_owner_id: Option<&str>,
) -> Result<bool> {
    match state
        .destination_s3
        .get_bucket_tagging()
        .bucket(bucket)
        .send()
        .await
    {
        Ok(response) => Ok(response.tag_set().iter().any(|tag| {
            owner_tag_overlaps_cleanup(tag.key(), prefix, excluded_prefix, current_owner_id)
        })),
        Err(err)
            if err
                .as_service_error()
                .and_then(|service_err| service_err.code())
                .is_some_and(|code| matches!(code, "NoSuchTagSet" | "NoSuchBucket")) =>
        {
            Ok(false)
        }
        Err(err) => {
            warn!(error = %err, bucket, "failed to read bucket tags");
            Err(err).with_context(|| {
                format!(
                    "unable to determine whether bucket {bucket} has a competing custom resource owner"
                )
            })
        }
    }
}

pub(super) async fn plan_destination(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
    manifest: &DeploymentManifest,
    stats: &DeploymentStats,
) -> Result<DestinationPlan> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let mut start_after = None;
    let mut objects = HashMap::new();
    let mut listed_objects = 0_u64;
    let mut has_stale_candidates = false;

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
            has_stale_candidates |= record_destination_object(
                key,
                object.e_tag(),
                object.size().and_then(|size| u64::try_from(size).ok()),
                DestinationRecordContext {
                    strip_prefix,
                    filters,
                    manifest,
                    detect_stale_candidates: request.delete_stale_objects_on_deployment
                        && !has_stale_candidates,
                },
                &mut objects,
            );
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
        has_stale_candidates,
    })
}

pub(super) async fn delete_stale_objects(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
    manifest: &DeploymentManifest,
    stats: &DeploymentStats,
) -> Result<()> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let mut start_after = None;

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

        let keys_to_delete = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .filter(|key| stale_destination_key(key, strip_prefix, filters, manifest))
            .map(ToOwned::to_owned)
            .collect::<Vec<_>>();
        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        delete_keys_optional_stats(
            state,
            &request.dest_bucket_name,
            &keys_to_delete,
            Some(stats),
        )
        .await?;

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    Ok(())
}

async fn delete_keys_optional_stats(
    state: &AppState,
    bucket: &str,
    keys: &[String],
    stats: Option<&DeploymentStats>,
) -> Result<u64> {
    let mut deleted = 0_u64;
    for chunk in keys.chunks(1000) {
        if chunk.is_empty() {
            continue;
        }
        let objects: Vec<ObjectIdentifier> = chunk
            .iter()
            .map(|key| ObjectIdentifier::builder().key(key).build())
            .collect::<std::result::Result<Vec<_>, _>>()?;
        let delete = Delete::builder()
            .set_objects(Some(objects))
            .quiet(true)
            .build()?;

        if let Some(stats) = stats {
            stats.record_delete_attempt(chunk.len() as u64);
        }
        let response = match state
            .destination_s3
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await
        {
            Ok(response) => response,
            Err(error) if service_error_code(&error) == Some("NoSuchBucket") => {
                if let Some(stats) = stats {
                    stats.record_delete_not_found(chunk.len() as u64);
                }
                return Ok(deleted);
            }
            Err(error) => {
                if let Some(stats) = stats {
                    stats.record_delete_failure(chunk.len() as u64);
                }
                return Err(error)
                    .with_context(|| format!("failed to delete objects from bucket {bucket}"));
            }
        };

        let (confirmed, unconfirmed) =
            delete_confirmation_counts(chunk.len() as u64, response.errors().len() as u64);
        if let Some(stats) = stats {
            stats.record_delete_response(confirmed, unconfirmed);
        }
        deleted = deleted.saturating_add(confirmed);

        if unconfirmed > 0 {
            let details = response
                .errors()
                .iter()
                .map(|error| {
                    let key = error.key().unwrap_or("<unknown-key>");
                    let code = error.code().unwrap_or("<unknown-code>");
                    let message = error.message().unwrap_or("<no-message>");
                    format!("{key}: {code} ({message})")
                })
                .collect::<Vec<_>>()
                .join(", ");
            return Err(anyhow!(
                "failed to delete some objects from bucket {bucket}: {details}"
            ));
        }
    }

    Ok(deleted)
}

fn delete_confirmation_counts(requested: u64, service_errors: u64) -> (u64, u64) {
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
        return context.detect_stale_candidates && context.filters.should_include(&relative_key);
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

fn stale_destination_key(
    key: &str,
    strip_prefix: &str,
    filters: &Filters,
    manifest: &DeploymentManifest,
) -> bool {
    let relative_key = strip_destination_prefix(strip_prefix, key);
    !relative_key.is_empty()
        && filters.should_include(&relative_key)
        && !manifest.contains_key(&relative_key)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{
        DestinationObject, DestinationRecordContext, delete_confirmation_counts, key_is_excluded,
        namespace_list_prefix, normalize_etag, owner_tag_overlaps_cleanup, parse_owner_tag,
        record_destination_object, stale_destination_key,
    };
    use crate::request::compile_filters;
    use crate::types::{DeploymentManifest, PlannedAction, PlannedObject};

    #[test]
    fn namespace_list_prefix_adds_trailing_slash() {
        assert_eq!(namespace_list_prefix("site"), Some("site/".to_string()));
    }

    #[test]
    fn delete_confirmation_counts_only_service_successes() {
        assert_eq!(delete_confirmation_counts(1_000, 0), (1_000, 0));
        assert_eq!(delete_confirmation_counts(1_000, 3), (997, 3));
        assert_eq!(delete_confirmation_counts(2, 4), (0, 2));
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
}
