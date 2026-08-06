//! Destination namespace semantics shared by destination planning, CloudFormation
//! lifecycle change decisions, and guarded namespace deletion.
//!
//! A namespace is a bucket prefix normalized to a slash-terminated canonical form
//! (`site` and `site/` are the same namespace); the bucket root is the empty
//! namespace. Ownership is tracked through the `aws-cdk:cr-owned` bucket tag keys
//! written by the construct, and whole-namespace deletion is authorized only after
//! the ownership check proves no competing custom resource owns an overlapping
//! namespace (see `s3::destination::guarded_delete_namespace`).

use anyhow::{Context, Result};
use aws_sdk_s3::error::ProvideErrorMetadata;
use tracing::warn;

use crate::types::AppState;
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, sanitize_diagnostic};

pub(crate) const OWNER_TAG_BASE: &str = "aws-cdk:cr-owned";

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum NamespaceRelation {
    Same,
    PreviousContainsCurrent,
    CurrentContainsPrevious,
    Disjoint,
}

/// Canonicalizes a destination prefix for CloudFormation change decisions.
///
/// Empty and `/` prefixes are the bucket root; a non-empty prefix always carries a
/// trailing slash so `site` and `site/` compare equal.
pub(crate) fn canonical_namespace(prefix: &str) -> String {
    if prefix.is_empty() || prefix == "/" {
        return String::new();
    }
    if prefix.ends_with('/') {
        prefix.to_string()
    } else {
        format!("{prefix}/")
    }
}

/// Canonicalizes a prefix for S3 listing, or returns `None` for the bucket root.
///
/// Distinct from `canonical_namespace`: the root has no list prefix, and a bare `/`
/// is a valid (if unusual) list prefix rather than the root.
pub(crate) fn namespace_list_prefix(prefix: &str) -> Option<String> {
    if prefix.is_empty() {
        return None;
    }

    let mut normalized = prefix.to_string();
    if !normalized.ends_with('/') {
        normalized.push('/');
    }
    Some(normalized)
}

fn namespace(prefix: &str) -> String {
    namespace_list_prefix(prefix).unwrap_or_default()
}

/// Whether `child` lies inside `parent`; the empty (bucket-root) namespace contains
/// everything. Operates on slash-terminated canonical namespaces, so `site/`
/// contains `site/old/` but not `site2/`.
pub(crate) fn namespace_contains(parent: &str, child: &str) -> bool {
    parent.is_empty() || child.starts_with(parent)
}

/// Whether two canonical namespaces overlap: one is the bucket root, or one
/// contains the other.
pub(crate) fn namespaces_overlap(left: &str, right: &str) -> bool {
    namespace_contains(left, right) || namespace_contains(right, left)
}

pub(crate) fn namespace_relation(previous: &str, current: &str) -> NamespaceRelation {
    let previous = canonical_namespace(previous);
    let current = canonical_namespace(current);

    if previous == current {
        NamespaceRelation::Same
    } else if previous.is_empty() || current.starts_with(&previous) {
        NamespaceRelation::PreviousContainsCurrent
    } else if current.is_empty() || previous.starts_with(&current) {
        NamespaceRelation::CurrentContainsPrevious
    } else {
        NamespaceRelation::Disjoint
    }
}

/// Whether a key must be spared by a cleanup that excludes `excluded_namespace`.
pub(crate) fn key_is_excluded(key: &str, excluded_namespace: Option<&str>) -> bool {
    excluded_namespace.is_some_and(|excluded| key.starts_with(excluded))
}

fn owner_tag_overlaps_cleanup(
    tag_key: &str,
    cleanup_prefix: &str,
    excluded_prefix: Option<&str>,
    current_owner_id: &str,
) -> bool {
    let Some((owner_prefix, owner_id)) = parse_owner_tag(tag_key) else {
        return false;
    };
    if current_owner_id == owner_id {
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

/// The bucket's ownership tag keys, read once so several namespace checks against the same
/// bucket share one `GetBucketTagging` call.
pub(crate) struct BucketOwnerTags {
    keys: Vec<String>,
}

impl BucketOwnerTags {
    pub(crate) fn has_competing_owner(
        &self,
        prefix: &str,
        excluded_prefix: Option<&str>,
        current_owner_id: &str,
    ) -> bool {
        self.keys
            .iter()
            .any(|key| owner_tag_overlaps_cleanup(key, prefix, excluded_prefix, current_owner_id))
    }
}

pub(crate) async fn read_bucket_owner_tags(
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

#[cfg(test)]
mod tests {
    use super::*;

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
            "current"
        ));
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site2:other",
            "site",
            None,
            "current"
        ));
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site:current",
            "site",
            None,
            "current"
        ));
    }

    #[test]
    fn owners_wholly_inside_the_excluded_namespace_are_safe() {
        assert!(!owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site/v2:other",
            "site",
            Some("site/v2"),
            "current"
        ));
        assert!(owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site/v1:other",
            "site",
            Some("site/v2"),
            "current"
        ));
        assert!(owner_tag_overlaps_cleanup(
            "aws-cdk:cr-owned:site:other",
            "site",
            Some("site/v2"),
            "current"
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
