use std::collections::HashMap;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::types::{Delete, ObjectIdentifier};
use tracing::warn;

use crate::request::strip_destination_prefix;
use crate::types::{AppState, DeploymentManifest, DeploymentRequest, Filters};

pub(super) struct DestinationPlan {
    pub(super) objects: HashMap<String, DestinationObject>,
    pub(super) keys_to_delete: Vec<String>,
}

#[derive(Clone)]
pub(super) struct DestinationObject {
    pub(super) etag: Option<String>,
}

pub(crate) async fn delete_prefix(state: &AppState, bucket: &str, prefix: &str) -> Result<()> {
    let list_prefix = namespace_list_prefix(prefix);
    let mut start_after = None;

    loop {
        let response = state
            .destination_s3
            .list_objects_v2()
            .bucket(bucket)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;

        let mut keys_to_delete = Vec::new();
        for object in response.contents() {
            if let Some(key) = object.key() {
                keys_to_delete.push(key.to_string());
            }
        }

        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        delete_keys(state, bucket, &keys_to_delete).await?;

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    Ok(())
}

pub(crate) async fn bucket_owned(state: &AppState, bucket: &str, prefix: &str) -> Result<bool> {
    let tag_prefix = if prefix.is_empty() {
        "aws-cdk:cr-owned".to_string()
    } else {
        format!("aws-cdk:cr-owned:{prefix}")
    };

    match state
        .destination_s3
        .get_bucket_tagging()
        .bucket(bucket)
        .send()
        .await
    {
        Ok(response) => Ok(response
            .tag_set()
            .iter()
            .any(|tag| tag.key().starts_with(&tag_prefix))),
        Err(err)
            if err
                .as_service_error()
                .and_then(|service_err| service_err.code())
                == Some("NoSuchTagSet") =>
        {
            Ok(false)
        }
        Err(err) => {
            warn!(error = %err, bucket, "failed to read bucket tags");
            Err(err).with_context(|| {
                format!(
                    "unable to determine whether bucket {bucket} is owned by this custom resource"
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
) -> Result<DestinationPlan> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let mut start_after = None;
    let mut objects = HashMap::new();
    let mut keys_to_delete = Vec::new();

    loop {
        let response = state
            .destination_s3
            .list_objects_v2()
            .bucket(&request.dest_bucket_name)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;

        for object in response.contents() {
            let Some(key) = object.key() else { continue };
            record_destination_object(
                key,
                object.e_tag(),
                strip_prefix,
                filters,
                manifest,
                request.prune,
                &mut objects,
                &mut keys_to_delete,
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

    Ok(DestinationPlan {
        objects,
        keys_to_delete,
    })
}

pub(super) async fn delete_keys(state: &AppState, bucket: &str, keys: &[String]) -> Result<()> {
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

        let response = state
            .destination_s3
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await
            .with_context(|| format!("failed to delete objects from bucket {bucket}"))?;

        if !response.errors().is_empty() {
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

    Ok(())
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

fn record_destination_object(
    key: &str,
    etag: Option<&str>,
    strip_prefix: &str,
    filters: &Filters,
    manifest: &DeploymentManifest,
    prune: bool,
    objects: &mut HashMap<String, DestinationObject>,
    keys_to_delete: &mut Vec<String>,
) {
    let relative_key = strip_destination_prefix(strip_prefix, key);
    if relative_key.is_empty() {
        return;
    }

    objects.insert(
        relative_key.clone(),
        DestinationObject {
            etag: etag.and_then(normalize_etag),
        },
    );
    if !filters.should_include(&relative_key) {
        return;
    }
    if prune && !manifest.contains_key(&relative_key) {
        keys_to_delete.push(key.to_string());
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{
        DestinationObject, namespace_list_prefix, normalize_etag, record_destination_object,
    };
    use crate::request::compile_filters;
    use crate::types::{DeploymentManifest, PlannedAction, PlannedObject};

    #[test]
    fn namespace_list_prefix_adds_trailing_slash() {
        assert_eq!(namespace_list_prefix("site"), Some("site/".to_string()));
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
    fn destination_entry_records_etag_and_queues_missing_manifest_key_for_prune() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let mut objects = HashMap::<String, DestinationObject>::new();
        let mut keys_to_delete = Vec::new();

        record_destination_object(
            "site/old.txt",
            Some("\"ABC123\""),
            "site/",
            &filters,
            &manifest,
            true,
            &mut objects,
            &mut keys_to_delete,
        );

        assert_eq!(objects["old.txt"].etag.as_deref(), Some("abc123"));
        assert_eq!(keys_to_delete, vec!["site/old.txt".to_string()]);
    }

    #[test]
    fn destination_entry_keeps_manifest_key_and_excluded_key_out_of_delete_list() {
        let filters = compile_filters(&["*.map".to_string()], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();
        manifest.insert(
            "keep.txt".to_string(),
            PlannedObject {
                relative_key: "keep.txt".to_string(),
                expected_etag: None,
                action: PlannedAction::CopyObject { source_index: 0 },
            },
        );
        let mut objects = HashMap::<String, DestinationObject>::new();
        let mut keys_to_delete = Vec::new();

        record_destination_object(
            "site/keep.txt",
            None,
            "site/",
            &filters,
            &manifest,
            true,
            &mut objects,
            &mut keys_to_delete,
        );
        record_destination_object(
            "site/debug.map",
            None,
            "site/",
            &filters,
            &manifest,
            true,
            &mut objects,
            &mut keys_to_delete,
        );

        assert!(objects.contains_key("keep.txt"));
        assert!(objects.contains_key("debug.map"));
        assert!(keys_to_delete.is_empty());
    }

    #[test]
    fn destination_entry_ignores_empty_relative_key() {
        let filters = compile_filters(&[], &[]).unwrap();
        let manifest = DeploymentManifest::new();
        let mut objects = HashMap::<String, DestinationObject>::new();
        let mut keys_to_delete = Vec::new();

        record_destination_object(
            "site/",
            None,
            "site/",
            &filters,
            &manifest,
            true,
            &mut objects,
            &mut keys_to_delete,
        );

        assert!(objects.is_empty());
        assert!(keys_to_delete.is_empty());
    }
}
