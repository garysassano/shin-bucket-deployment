use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result, anyhow};
use globset::{Glob, GlobMatcher};
use serde_json::Value;

use crate::types::{DeploymentRequest, Filters, MarkerConfig, Properties};

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

pub(crate) fn parse_request(props: &Properties) -> Result<DeploymentRequest> {
    let source_bucket_names = get_required_string_vec(props, "SourceBucketNames")?;
    let source_object_keys = get_required_string_vec(props, "SourceObjectKeys")?;
    let mut source_markers = get_markers_list(props, "SourceMarkers")?;
    let mut source_markers_config = get_marker_config_list(props, "SourceMarkersConfig")?;

    if source_markers.is_empty() {
        source_markers = vec![HashMap::new(); source_bucket_names.len()];
    }
    if source_markers_config.is_empty() {
        source_markers_config = vec![MarkerConfig::default(); source_bucket_names.len()];
    }

    let dest_bucket_prefix = normalize_destination_prefix(
        get_optional_string(props, "DestinationBucketKeyPrefix").unwrap_or_default(),
    );

    let default_distribution_path = default_distribution_path(&dest_bucket_prefix);

    Ok(DeploymentRequest {
        source_bucket_names,
        source_object_keys,
        source_markers,
        source_markers_config,
        dest_bucket_name: get_required_string(props, "DestinationBucketName")?,
        dest_bucket_prefix,
        extract: get_bool(props, "Extract", true),
        retain_on_delete: get_bool(props, "RetainOnDelete", true),
        distribution_id: get_optional_string(props, "DistributionId"),
        distribution_paths: get_string_vec(props, "DistributionPaths")
            .unwrap_or_else(|| vec![default_distribution_path]),
        wait_for_distribution_invalidation: get_bool(
            props,
            "WaitForDistributionInvalidation",
            true,
        ),
        user_metadata: get_string_map(props, "UserMetadata")?,
        system_metadata: get_string_map(props, "SystemMetadata")?,
        prune: get_bool(props, "Prune", true),
        exclude: get_string_vec(props, "Exclude").unwrap_or_default(),
        include: get_string_vec(props, "Include").unwrap_or_default(),
        output_object_keys: get_bool(props, "OutputObjectKeys", true),
        destination_bucket_arn: get_optional_string(props, "DestinationBucketArn"),
    })
}

pub(crate) fn parse_old_destination(props: &Properties) -> (Option<String>, String) {
    let old_bucket = get_optional_string(props, "DestinationBucketName");
    let old_prefix = normalize_destination_prefix(
        get_optional_string(props, "DestinationBucketKeyPrefix").unwrap_or_default(),
    );
    (old_bucket, old_prefix)
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

fn get_required_string(props: &Properties, key: &str) -> Result<String> {
    get_optional_string(props, key)
        .ok_or_else(|| anyhow!("missing request resource property {key}"))
}

fn get_optional_string(props: &Properties, key: &str) -> Option<String> {
    match props.get(key) {
        Some(Value::String(value)) => Some(value.clone()),
        Some(Value::Number(value)) => Some(value.to_string()),
        Some(Value::Bool(value)) => Some(value.to_string()),
        _ => None,
    }
}

fn get_required_string_vec(props: &Properties, key: &str) -> Result<Vec<String>> {
    get_string_vec(props, key).ok_or_else(|| anyhow!("missing request resource property {key}"))
}

fn get_string_vec(props: &Properties, key: &str) -> Option<Vec<String>> {
    let Value::Array(items) = props.get(key)? else {
        return None;
    };

    Some(
        items
            .iter()
            .filter_map(|value| match value {
                Value::String(value) => Some(value.clone()),
                Value::Number(value) => Some(value.to_string()),
                Value::Bool(value) => Some(value.to_string()),
                _ => None,
            })
            .collect(),
    )
}

fn get_bool(props: &Properties, key: &str, default: bool) -> bool {
    match props.get(key) {
        Some(Value::Bool(value)) => *value,
        Some(Value::String(value)) => value.eq_ignore_ascii_case("true"),
        Some(Value::Number(value)) => value.as_i64().unwrap_or_default() != 0,
        _ => default,
    }
}

fn get_string_map(props: &Properties, key: &str) -> Result<HashMap<String, String>> {
    let Some(Value::Object(object)) = props.get(key) else {
        return Ok(HashMap::new());
    };

    let mut result = HashMap::new();
    for (entry_key, value) in object {
        let rendered = match value {
            Value::String(value) => value.clone(),
            Value::Number(value) => value.to_string(),
            Value::Bool(value) => value.to_string(),
            Value::Null => String::new(),
            other => serde_json::to_string(other)?,
        };
        result.insert(entry_key.to_lowercase(), rendered);
    }

    Ok(result)
}

fn get_markers_list(props: &Properties, key: &str) -> Result<Vec<HashMap<String, String>>> {
    let Some(Value::Array(items)) = props.get(key) else {
        return Ok(Vec::new());
    };

    let mut result = Vec::new();
    for item in items {
        let Value::Object(object) = item else {
            result.push(HashMap::new());
            continue;
        };

        let mut markers = HashMap::new();
        for (marker_key, marker_value) in object {
            let rendered = match marker_value {
                Value::String(value) => value.clone(),
                Value::Number(value) => value.to_string(),
                Value::Bool(value) => value.to_string(),
                Value::Null => String::new(),
                other => serde_json::to_string(other)?,
            };
            markers.insert(marker_key.clone(), rendered);
        }
        result.push(markers);
    }

    Ok(result)
}

fn get_marker_config_list(props: &Properties, key: &str) -> Result<Vec<MarkerConfig>> {
    let Some(Value::Array(items)) = props.get(key) else {
        return Ok(Vec::new());
    };

    let mut result = Vec::new();
    for item in items {
        let Value::Object(object) = item else {
            result.push(MarkerConfig::default());
            continue;
        };
        result.push(MarkerConfig {
            json_escape: get_bool(object, "jsonEscape", false),
        });
    }

    Ok(result)
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
