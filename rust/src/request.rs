use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result, anyhow};
use globset::{Glob, GlobMatcher};
use serde::{Deserialize, Deserializer, Serialize};

use crate::types::{DeploymentRequest, Filters, MarkerConfig};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDeploymentRequest {
    pub(crate) source_bucket_names: Vec<String>,
    pub(crate) source_object_keys: Vec<String>,
    #[serde(default)]
    pub(crate) source_markers: Vec<HashMap<String, String>>,
    #[serde(default)]
    pub(crate) source_markers_config: Vec<MarkerConfig>,
    pub(crate) destination_bucket_name: String,
    #[serde(default)]
    pub(crate) destination_bucket_key_prefix: Option<String>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) extract: bool,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) retain_on_delete: bool,
    #[serde(default)]
    pub(crate) distribution_id: Option<String>,
    #[serde(default)]
    pub(crate) distribution_paths: Option<Vec<String>>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) wait_for_distribution_invalidation: bool,
    #[serde(default)]
    pub(crate) user_metadata: HashMap<String, String>,
    #[serde(default)]
    pub(crate) system_metadata: HashMap<String, String>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) prune: bool,
    #[serde(default)]
    pub(crate) exclude: Vec<String>,
    #[serde(default)]
    pub(crate) include: Vec<String>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) output_object_keys: bool,
    #[serde(default)]
    pub(crate) destination_bucket_arn: Option<String>,
}

impl Filters {
    pub(crate) fn should_include(&self, key: &str) -> bool {
        let mut included = true;

        for matcher in &self.exclude {
            if matcher.is_match(key) {
                included = false;
            }
        }

        for matcher in &self.include {
            if matcher.is_match(key) {
                included = true;
            }
        }

        included
    }
}

pub(crate) fn parse_request(raw: &RawDeploymentRequest) -> DeploymentRequest {
    let mut source_markers = raw.source_markers.clone();
    let mut source_markers_config = raw.source_markers_config.clone();

    if source_markers.is_empty() {
        source_markers = vec![HashMap::new(); raw.source_bucket_names.len()];
    }
    if source_markers_config.is_empty() {
        source_markers_config = vec![MarkerConfig::default(); raw.source_bucket_names.len()];
    }

    let dest_bucket_prefix = normalize_destination_prefix(
        raw.destination_bucket_key_prefix
            .clone()
            .unwrap_or_default(),
    );

    let default_distribution_path = default_distribution_path(&dest_bucket_prefix);

    DeploymentRequest {
        source_bucket_names: raw.source_bucket_names.clone(),
        source_object_keys: raw.source_object_keys.clone(),
        source_markers,
        source_markers_config,
        dest_bucket_name: raw.destination_bucket_name.clone(),
        dest_bucket_prefix,
        extract: raw.extract,
        retain_on_delete: raw.retain_on_delete,
        distribution_id: raw.distribution_id.clone(),
        distribution_paths: raw
            .distribution_paths
            .clone()
            .unwrap_or_else(|| vec![default_distribution_path]),
        wait_for_distribution_invalidation: raw.wait_for_distribution_invalidation,
        user_metadata: raw.user_metadata.clone(),
        system_metadata: raw.system_metadata.clone(),
        prune: raw.prune,
        exclude: raw.exclude.clone(),
        include: raw.include.clone(),
        output_object_keys: raw.output_object_keys,
        destination_bucket_arn: raw.destination_bucket_arn.clone(),
    }
}

pub(crate) fn parse_old_destination(raw: &RawDeploymentRequest) -> (String, String) {
    let old_prefix = normalize_destination_prefix(
        raw.destination_bucket_key_prefix
            .clone()
            .unwrap_or_default(),
    );
    (raw.destination_bucket_name.clone(), old_prefix)
}

pub(crate) fn compile_filters(exclude: &[String], include: &[String]) -> Result<Filters> {
    Ok(Filters {
        exclude: compile_globs(exclude)?,
        include: compile_globs(include)?,
    })
}

pub(crate) fn normalize_destination_prefix(prefix: String) -> String {
    if prefix == "/" { String::new() } else { prefix }
}

pub(crate) fn normalize_archive_key(raw: &str) -> Result<String> {
    let normalized = raw.replace('\\', "/");
    let mut parts = Vec::new();

    for part in normalized.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err(anyhow!("archive entry attempts path traversal: {raw}"));
        }
        parts.push(part);
    }

    if parts.is_empty() {
        return Err(anyhow!("archive entry resolved to an empty key: {raw}"));
    }

    Ok(parts.join("/"))
}

pub(crate) fn source_basename(key: &str) -> Result<String> {
    let basename = Path::new(key)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| anyhow!("unable to determine basename for source object key {key}"))?;
    Ok(basename.to_string())
}

pub(crate) fn join_s3_key(prefix: &str, relative_key: &str) -> String {
    if prefix.is_empty() {
        return relative_key.to_string();
    }
    if prefix.ends_with('/') {
        format!("{prefix}{relative_key}")
    } else {
        format!("{prefix}/{relative_key}")
    }
}

pub(crate) fn strip_destination_prefix(prefix: &str, key: &str) -> String {
    if prefix.is_empty() {
        return key.to_string();
    }

    let stripped = key.strip_prefix(prefix).unwrap_or(key);
    stripped.trim_start_matches('/').to_string()
}

fn default_distribution_path(dest_bucket_prefix: &str) -> String {
    let mut prefix = dest_bucket_prefix.to_string();
    if !prefix.ends_with('/') {
        prefix.push('/');
    }
    if !prefix.starts_with('/') {
        prefix.insert(0, '/');
    }
    prefix.push('*');
    prefix
}

fn default_true() -> bool {
    true
}

fn deserialize_boolish<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    struct BoolishVisitor;

    impl serde::de::Visitor<'_> for BoolishVisitor {
        type Value = bool;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("a boolean or a string containing true or false")
        }

        fn visit_bool<E>(self, value: bool) -> std::result::Result<Self::Value, E> {
            Ok(value)
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            match value.to_ascii_lowercase().as_str() {
                "true" => Ok(true),
                "false" => Ok(false),
                _ => Err(E::invalid_value(serde::de::Unexpected::Str(value), &self)),
            }
        }
    }

    deserializer.deserialize_any(BoolishVisitor)
}

fn compile_globs(patterns: &[String]) -> Result<Vec<GlobMatcher>> {
    patterns
        .iter()
        .map(|pattern| {
            Glob::new(pattern)
                .with_context(|| format!("invalid include/exclude pattern: {pattern}"))
                .map(|glob| glob.compile_matcher())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    fn minimal_request() -> serde_json::Value {
        json!({
            "SourceBucketNames": ["source-bucket"],
            "SourceObjectKeys": ["source.zip"],
            "DestinationBucketName": "dest-bucket"
        })
    }

    #[test]
    fn deserializes_minimal_request_with_defaults() {
        let raw: RawDeploymentRequest =
            serde_json::from_value(minimal_request()).expect("minimal request should deserialize");
        let request = parse_request(&raw);

        assert!(request.extract);
        assert!(request.retain_on_delete);
        assert!(request.prune);
        assert!(request.output_object_keys);
        assert_eq!(request.distribution_paths, vec!["/*"]);
    }

    #[test]
    fn serde_rejects_non_string_distribution_paths() {
        let mut props = minimal_request();
        props["DistributionPaths"] = json!(["/index.html", {"bad": true}]);

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn serde_rejects_non_object_marker_entries() {
        let mut props = minimal_request();
        props["SourceMarkers"] = json!([true]);

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn serde_rejects_non_object_marker_config_entries() {
        let mut props = minimal_request();
        props["SourceMarkersConfig"] = json!(["bad"]);

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn serde_rejects_non_boolean_properties() {
        let mut props = minimal_request();
        props["Prune"] = json!({"bad": true});

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn deserializes_cloudformation_string_booleans() {
        let mut props = minimal_request();
        props["Extract"] = json!("true");
        props["RetainOnDelete"] = json!("false");
        props["WaitForDistributionInvalidation"] = json!("true");
        props["Prune"] = json!("false");
        props["OutputObjectKeys"] = json!("true");

        let raw: RawDeploymentRequest =
            serde_json::from_value(props).expect("string booleans should deserialize");
        let request = parse_request(&raw);

        assert!(request.extract);
        assert!(!request.retain_on_delete);
        assert!(request.wait_for_distribution_invalidation);
        assert!(!request.prune);
        assert!(request.output_object_keys);
    }
}
