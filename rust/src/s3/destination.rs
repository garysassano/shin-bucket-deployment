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

pub(super) struct DestinationObject {
    pub(super) etag: Option<String>,
}

pub(crate) async fn delete_prefix(state: &AppState, bucket: &str, prefix: &str) -> Result<()> {
    let list_prefix = namespace_list_prefix(prefix);
    let mut start_after = None;

    loop {
        let response = state
            .s3
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

    match state.s3.get_bucket_tagging().bucket(bucket).send().await {
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
            .s3
            .list_objects_v2()
            .bucket(&request.dest_bucket_name)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;

        for object in response.contents() {
            let Some(key) = object.key() else { continue };
            let relative_key = strip_destination_prefix(strip_prefix, key);
            if relative_key.is_empty() {
                continue;
            }
            let etag = object.e_tag().and_then(normalize_etag);
            objects.insert(relative_key.clone(), DestinationObject { etag });
            if !filters.should_include(&relative_key) {
                continue;
            }
            if request.prune && !manifest.contains_key(&relative_key) {
                keys_to_delete.push(key.to_string());
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
            .s3
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

#[cfg(test)]
mod tests {
    use super::{namespace_list_prefix, normalize_etag};

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
}
