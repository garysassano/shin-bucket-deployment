use std::collections::HashMap;
use std::path::Path;

use anyhow::{Context, Result, anyhow, ensure};
use globset::{Glob, GlobMatcher};
use serde::{Deserialize, Deserializer, Serialize};

use crate::s3::{
    DEFAULT_SOURCE_BLOCK_BYTES, DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES,
    DEFAULT_TRANSFER_MAX_CONCURRENCY, PUT_OBJECT_MAX_ATTEMPTS, PUT_OBJECT_RETRY_BASE_DELAY_MS,
    PUT_OBJECT_RETRY_MAX_DELAY_MS, PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS,
    PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS, adaptive_source_get_concurrency,
};
use crate::types::{
    DeletePreviousObjectsOnChange, DeploymentRequest, DestinationChecksumStrategy, Filters,
    MarkerConfig, PreviousDestination, PutObjectRetryJitter, PutObjectRetryOptions, RuntimeOptions,
    TrustedSourceCatalog,
};

const DEFAULT_AVAILABLE_MEMORY_MB: u64 = 1024;
const MIN_SOURCE_BLOCK_BYTES: usize = 30;
const MAX_PARALLEL_TRANSFERS: usize = 256;
const MAX_SOURCE_GET_CONCURRENCY: usize = 64;
const MAX_PUT_OBJECT_ATTEMPTS: usize = 10;
const MAX_RETRY_DELAY_MS: u64 = 60_000;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const MIB: u64 = 1024 * 1024;
const LAMBDA_MEMORY_ENV: &str = "AWS_LAMBDA_FUNCTION_MEMORY_SIZE";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDeletePreviousObjectsOnChange {
    pub(crate) destination_bucket_name: String,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawSourceCatalog {
    #[serde(
        default,
        deserialize_with = "deserialize_present_u32ish",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) version: Option<u32>,
    #[serde(
        default,
        deserialize_with = "deserialize_present",
        skip_serializing_if = "Option::is_none"
    )]
    pub(crate) sha256: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDeploymentRequest {
    pub(crate) source_bucket_names: Vec<String>,
    pub(crate) source_object_keys: Vec<String>,
    #[serde(default)]
    pub(crate) source_catalogs: Option<Vec<RawSourceCatalog>>,
    #[serde(default)]
    pub(crate) source_markers: Vec<HashMap<String, String>>,
    #[serde(default)]
    pub(crate) source_markers_config: Vec<MarkerConfig>,
    pub(crate) destination_bucket_name: String,
    #[serde(default)]
    pub(crate) destination_bucket_key_prefix: Option<String>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) extract: bool,
    #[serde(default, deserialize_with = "deserialize_boolish")]
    pub(crate) delete_current_objects_on_delete: bool,
    #[serde(default)]
    pub(crate) distribution_id: Option<String>,
    #[serde(default)]
    pub(crate) distribution_paths: Option<Vec<String>>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) wait_for_distribution_invalidation: bool,
    #[serde(default)]
    pub(crate) destination_checksum_strategy: Option<DestinationChecksumStrategy>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) delete_stale_objects_on_deployment: bool,
    #[serde(default)]
    pub(crate) exclude: Vec<String>,
    #[serde(default)]
    pub(crate) include: Vec<String>,
    #[serde(default = "default_true", deserialize_with = "deserialize_boolish")]
    pub(crate) output_object_keys: bool,
    #[serde(default)]
    pub(crate) destination_bucket_arn: Option<String>,
    #[serde(default)]
    pub(crate) destination_owner_id: Option<String>,
    #[serde(default)]
    pub(crate) delete_previous_objects_on_change: Option<RawDeletePreviousObjectsOnChange>,
    #[serde(default)]
    pub(crate) invalidate_previous_distribution_on_change: Option<String>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) available_memory_mb: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) max_parallel_transfers: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_block_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_block_merge_gap_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_get_concurrency: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_window_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) source_window_memory_budget_mb: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) put_object_max_attempts: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) put_object_retry_base_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) put_object_retry_max_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) put_object_slowdown_retry_base_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) put_object_slowdown_retry_max_delay_ms: Option<u64>,
    #[serde(default)]
    pub(crate) put_object_retry_jitter: Option<PutObjectRetryJitter>,
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

pub(crate) fn parse_request(raw: &RawDeploymentRequest) -> Result<DeploymentRequest> {
    let mut source_markers = raw.source_markers.clone();
    let mut source_markers_config = raw.source_markers_config.clone();
    let source_catalogs = parse_source_catalogs(raw)?;

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

    Ok(DeploymentRequest {
        source_bucket_names: raw.source_bucket_names.clone(),
        source_object_keys: raw.source_object_keys.clone(),
        source_catalogs,
        source_markers,
        source_markers_config,
        dest_bucket_name: raw.destination_bucket_name.clone(),
        dest_bucket_prefix,
        extract: raw.extract,
        delete_current_objects_on_delete: raw.delete_current_objects_on_delete,
        distribution_id: raw.distribution_id.clone(),
        distribution_paths: raw
            .distribution_paths
            .clone()
            .unwrap_or_else(|| vec![default_distribution_path]),
        wait_for_distribution_invalidation: raw.wait_for_distribution_invalidation,
        destination_checksum_strategy: raw.destination_checksum_strategy.ok_or_else(|| {
            anyhow!("DestinationChecksumStrategy is required for destination writes")
        })?,
        delete_stale_objects_on_deployment: raw.delete_stale_objects_on_deployment,
        exclude: raw.exclude.clone(),
        include: raw.include.clone(),
        output_object_keys: raw.output_object_keys,
        destination_bucket_arn: raw.destination_bucket_arn.clone(),
        destination_owner_id: raw.destination_owner_id.clone(),
        delete_previous_objects_on_change: raw.delete_previous_objects_on_change.as_ref().map(
            |previous| DeletePreviousObjectsOnChange {
                bucket_name: previous.destination_bucket_name.clone(),
            },
        ),
        invalidate_previous_distribution_on_change: raw
            .invalidate_previous_distribution_on_change
            .clone(),
        runtime: runtime_options(raw)?,
    })
}

fn parse_source_catalogs(raw: &RawDeploymentRequest) -> Result<Vec<Option<TrustedSourceCatalog>>> {
    let Some(catalogs) = &raw.source_catalogs else {
        return Ok(vec![None; raw.source_bucket_names.len()]);
    };
    if catalogs.len() != raw.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceCatalogs and SourceBucketNames must be the same length"
        ));
    }

    catalogs
        .iter()
        .enumerate()
        .map(|(source_index, catalog)| match (&catalog.version, &catalog.sha256) {
            (None, None) => Ok(None),
            (Some(1), Some(sha256)) => parse_sha256(sha256)
                .map(|sha256| Some(TrustedSourceCatalog { sha256 }))
                .ok_or_else(|| {
                    anyhow!(
                        "SourceCatalogs entry {source_index} has a malformed SHA-256 digest"
                    )
                }),
            (Some(_), Some(_)) => Err(anyhow!(
                "SourceCatalogs entry {source_index} uses an unsupported catalog version"
            )),
            _ => Err(anyhow!(
                "SourceCatalogs entry {source_index} must contain both Version and Sha256 or neither"
            )),
        })
        .collect()
}

fn parse_sha256(value: &str) -> Option<[u8; 32]> {
    if value.len() != 64
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_digit() || (b'a'..=b'f').contains(&byte))
    {
        return None;
    }

    let mut digest = [0_u8; 32];
    for (index, byte) in digest.iter_mut().enumerate() {
        *byte = u8::from_str_radix(&value[index * 2..index * 2 + 2], 16).ok()?;
    }
    Some(digest)
}

fn runtime_options(raw: &RawDeploymentRequest) -> Result<RuntimeOptions> {
    let lambda_memory = std::env::var(LAMBDA_MEMORY_ENV).ok();
    runtime_options_with_memory(raw, lambda_memory.as_deref())
}

fn runtime_options_with_memory(
    raw: &RawDeploymentRequest,
    lambda_memory: Option<&str>,
) -> Result<RuntimeOptions> {
    let available_memory_mb = match lambda_memory {
        Some(value) => value.parse::<u64>().with_context(|| {
            format!("{LAMBDA_MEMORY_ENV} must contain a positive integer MiB value")
        })?,
        None => raw
            .available_memory_mb
            .unwrap_or(DEFAULT_AVAILABLE_MEMORY_MB),
    };
    validate_u64_range(
        if lambda_memory.is_some() {
            LAMBDA_MEMORY_ENV
        } else {
            "AvailableMemoryMb"
        },
        available_memory_mb,
        1,
        MAX_SAFE_INTEGER,
    )?;

    let lambda_memory_bytes = available_memory_mb
        .checked_mul(MIB)
        .ok_or_else(|| anyhow!("Lambda memory size overflowed while converting MiB to bytes"))?;
    let memory_cap_bytes = lambda_memory_bytes / 2;
    let source_memory_budget_bytes = match raw.source_window_memory_budget_mb {
        Some(memory_mb) => {
            validate_u64_range("SourceWindowMemoryBudgetMb", memory_mb, 1, MAX_SAFE_INTEGER)?;
            memory_mb.checked_mul(MIB).ok_or_else(|| {
                anyhow!("SourceWindowMemoryBudgetMb overflowed while converting MiB to bytes")
            })?
        }
        None => memory_cap_bytes,
    };
    ensure!(
        source_memory_budget_bytes <= memory_cap_bytes,
        "SourceWindowMemoryBudgetMb must not exceed 50% of the actual Lambda memory"
    );
    let source_memory_budget_bytes = usize::try_from(source_memory_budget_bytes)
        .context("source memory budget cannot be represented on this provider architecture")?;

    let max_parallel_transfers = raw
        .max_parallel_transfers
        .unwrap_or(DEFAULT_TRANSFER_MAX_CONCURRENCY);
    validate_usize_range(
        "MaxParallelTransfers",
        max_parallel_transfers,
        1,
        MAX_PARALLEL_TRANSFERS,
    )?;

    let source_block_bytes = raw.source_block_bytes.unwrap_or(DEFAULT_SOURCE_BLOCK_BYTES);
    validate_usize_range(
        "SourceBlockBytes",
        source_block_bytes,
        MIN_SOURCE_BLOCK_BYTES,
        usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
    )?;
    ensure!(
        source_block_bytes <= source_memory_budget_bytes,
        "SourceBlockBytes must fit within the invocation-global source memory budget"
    );

    let source_block_merge_gap_bytes = raw
        .source_block_merge_gap_bytes
        .unwrap_or(DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES);
    validate_usize_range(
        "SourceBlockMergeGapBytes",
        source_block_merge_gap_bytes,
        0,
        usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
    )?;

    let source_get_concurrency = raw
        .source_get_concurrency
        .unwrap_or_else(|| adaptive_source_get_concurrency(available_memory_mb));
    validate_usize_range(
        "SourceGetConcurrency",
        source_get_concurrency,
        1,
        MAX_SOURCE_GET_CONCURRENCY,
    )?;
    let concurrent_source_block_bytes = source_block_bytes
        .checked_mul(source_get_concurrency)
        .ok_or_else(|| anyhow!("SourceBlockBytes * SourceGetConcurrency overflowed"))?;
    ensure!(
        concurrent_source_block_bytes <= source_memory_budget_bytes,
        "SourceBlockBytes * SourceGetConcurrency must fit within the invocation-global source memory budget"
    );

    if let Some(source_window_bytes) = raw.source_window_bytes {
        validate_usize_range(
            "SourceWindowBytes",
            source_window_bytes,
            1,
            usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
        )?;
        ensure!(
            source_window_bytes >= source_block_bytes,
            "SourceWindowBytes must be greater than or equal to SourceBlockBytes"
        );
        ensure!(
            source_window_bytes <= source_memory_budget_bytes,
            "SourceWindowBytes must fit within the invocation-global source memory budget"
        );
    }

    let put_object_max_attempts = raw
        .put_object_max_attempts
        .unwrap_or(PUT_OBJECT_MAX_ATTEMPTS);
    validate_usize_range(
        "PutObjectMaxAttempts",
        put_object_max_attempts,
        1,
        MAX_PUT_OBJECT_ATTEMPTS,
    )?;
    let retry_base_delay_ms = raw
        .put_object_retry_base_delay_ms
        .unwrap_or(PUT_OBJECT_RETRY_BASE_DELAY_MS);
    let retry_max_delay_ms = raw
        .put_object_retry_max_delay_ms
        .unwrap_or(PUT_OBJECT_RETRY_MAX_DELAY_MS);
    let slowdown_retry_base_delay_ms = raw
        .put_object_slowdown_retry_base_delay_ms
        .unwrap_or(PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS);
    let slowdown_retry_max_delay_ms = raw
        .put_object_slowdown_retry_max_delay_ms
        .unwrap_or(PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS);
    for (name, value) in [
        ("PutObjectRetryBaseDelayMs", retry_base_delay_ms),
        ("PutObjectRetryMaxDelayMs", retry_max_delay_ms),
        (
            "PutObjectSlowdownRetryBaseDelayMs",
            slowdown_retry_base_delay_ms,
        ),
        (
            "PutObjectSlowdownRetryMaxDelayMs",
            slowdown_retry_max_delay_ms,
        ),
    ] {
        validate_u64_range(name, value, 0, MAX_RETRY_DELAY_MS)?;
    }
    ensure!(
        retry_base_delay_ms <= retry_max_delay_ms,
        "PutObjectRetryBaseDelayMs must be less than or equal to PutObjectRetryMaxDelayMs"
    );
    ensure!(
        slowdown_retry_base_delay_ms <= slowdown_retry_max_delay_ms,
        "PutObjectSlowdownRetryBaseDelayMs must be less than or equal to PutObjectSlowdownRetryMaxDelayMs"
    );

    Ok(RuntimeOptions {
        available_memory_mb,
        max_parallel_transfers,
        source_block_bytes,
        source_block_merge_gap_bytes,
        source_get_concurrency,
        source_window_bytes: raw.source_window_bytes,
        source_memory_budget_bytes,
        put_object_retry: PutObjectRetryOptions {
            max_attempts: put_object_max_attempts,
            retry_base_delay_ms,
            retry_max_delay_ms,
            slowdown_retry_base_delay_ms,
            slowdown_retry_max_delay_ms,
            jitter: raw
                .put_object_retry_jitter
                .unwrap_or(PutObjectRetryJitter::Full),
        },
    })
}

fn validate_usize_range(name: &str, value: usize, minimum: usize, maximum: usize) -> Result<()> {
    ensure!(
        (minimum..=maximum).contains(&value),
        "{name} must be in the inclusive range {minimum}..={maximum}"
    );
    Ok(())
}

fn validate_u64_range(name: &str, value: u64, minimum: u64, maximum: u64) -> Result<()> {
    ensure!(
        (minimum..=maximum).contains(&value),
        "{name} must be in the inclusive range {minimum}..={maximum}"
    );
    Ok(())
}

pub(crate) fn parse_old_destination(raw: &RawDeploymentRequest) -> PreviousDestination {
    let old_prefix = normalize_destination_prefix(
        raw.destination_bucket_key_prefix
            .clone()
            .unwrap_or_default(),
    );
    PreviousDestination {
        bucket_name: raw.destination_bucket_name.clone(),
        bucket_prefix: old_prefix.clone(),
        distribution_id: raw.distribution_id.clone(),
        distribution_paths: raw
            .distribution_paths
            .clone()
            .unwrap_or_else(|| vec![default_distribution_path(&old_prefix)]),
        owner_id: raw.destination_owner_id.clone(),
    }
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

    key.strip_prefix(prefix).unwrap_or(key).to_string()
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

fn deserialize_present<'de, D, T>(deserializer: D) -> std::result::Result<Option<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    T::deserialize(deserializer).map(Some)
}

fn deserialize_present_u32ish<'de, D>(deserializer: D) -> std::result::Result<Option<u32>, D::Error>
where
    D: Deserializer<'de>,
{
    struct U32ishVisitor;

    impl serde::de::Visitor<'_> for U32ishVisitor {
        type Value = u32;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("an unsigned 32-bit integer or a string containing one")
        }

        fn visit_u64<E>(self, value: u64) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            u32::try_from(value)
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Unsigned(value), &self))
        }

        fn visit_i64<E>(self, value: i64) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            u32::try_from(value)
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Signed(value), &self))
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            value
                .parse::<u32>()
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Str(value), &self))
        }
    }

    deserializer.deserialize_any(U32ishVisitor).map(Some)
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

fn deserialize_optional_u64ish<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<u64>, D::Error>
where
    D: Deserializer<'de>,
{
    deserialize_optional_unsigned(deserializer, "u64")
}

fn deserialize_optional_usizeish<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<usize>, D::Error>
where
    D: Deserializer<'de>,
{
    let value = deserialize_optional_unsigned(deserializer, "usize")?;
    value
        .map(|value| usize::try_from(value).map_err(serde::de::Error::custom))
        .transpose()
}

fn deserialize_optional_unsigned<'de, D>(
    deserializer: D,
    expected: &'static str,
) -> std::result::Result<Option<u64>, D::Error>
where
    D: Deserializer<'de>,
{
    struct UnsignedVisitor {
        expected: &'static str,
    }

    impl<'de> serde::de::Visitor<'de> for UnsignedVisitor {
        type Value = Option<u64>;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            write!(
                formatter,
                "an unsigned {} integer or a string containing one",
                self.expected
            )
        }

        fn visit_none<E>(self) -> std::result::Result<Self::Value, E> {
            Ok(None)
        }

        fn visit_unit<E>(self) -> std::result::Result<Self::Value, E> {
            Ok(None)
        }

        fn visit_some<D>(self, deserializer: D) -> std::result::Result<Self::Value, D::Error>
        where
            D: Deserializer<'de>,
        {
            deserializer.deserialize_any(self)
        }

        fn visit_u64<E>(self, value: u64) -> std::result::Result<Self::Value, E> {
            Ok(Some(value))
        }

        fn visit_i64<E>(self, value: i64) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            u64::try_from(value)
                .map(Some)
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Signed(value), &self))
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                return Ok(None);
            }
            trimmed
                .parse::<u64>()
                .map(Some)
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Str(value), &self))
        }
    }

    deserializer.deserialize_option(UnsignedVisitor { expected })
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
            "DestinationBucketName": "dest-bucket",
            "DestinationChecksumStrategy": "sse-s3-etag"
        })
    }

    #[test]
    fn deserializes_minimal_request_with_defaults() {
        let raw: RawDeploymentRequest =
            serde_json::from_value(minimal_request()).expect("minimal request should deserialize");
        let request = parse_request(&raw).expect("valid request");

        assert!(request.extract);
        assert!(!request.delete_current_objects_on_delete);
        assert!(request.delete_stale_objects_on_deployment);
        assert!(request.output_object_keys);
        assert!(request.destination_owner_id.is_none());
        assert!(request.delete_previous_objects_on_change.is_none());
        assert!(request.invalidate_previous_distribution_on_change.is_none());
        assert_eq!(request.source_catalogs, vec![None]);
        assert_eq!(request.distribution_paths, vec!["/*"]);
        assert_eq!(request.runtime.available_memory_mb, 1024);
        assert_eq!(
            request.runtime.source_memory_budget_bytes,
            512 * 1024 * 1024
        );
        assert_eq!(request.runtime.source_get_concurrency, 4);
        assert_eq!(request.runtime.max_parallel_transfers, 32);
        assert_eq!(
            request.destination_checksum_strategy,
            DestinationChecksumStrategy::SseS3Etag
        );
        assert_eq!(
            request.runtime.put_object_retry.jitter,
            PutObjectRetryJitter::Full
        );
    }

    #[test]
    fn destination_prefix_stripping_preserves_unmatched_slashes() {
        assert_eq!(
            strip_destination_prefix("site/", "site/index.html"),
            "index.html"
        );
        assert_eq!(
            strip_destination_prefix("site/", "site//index.html"),
            "/index.html"
        );
        assert_eq!(
            strip_destination_prefix("site//", "site//index.html"),
            "index.html"
        );
        assert_eq!(strip_destination_prefix("", "//index.html"), "//index.html");
    }

    #[test]
    fn lambda_memory_environment_is_authoritative_for_the_global_budget() {
        let mut props = minimal_request();
        props["AvailableMemoryMb"] = json!(2048);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();

        let runtime = runtime_options_with_memory(&raw, Some("512")).expect("runtime options");

        assert_eq!(runtime.available_memory_mb, 512);
        assert_eq!(runtime.source_memory_budget_bytes, 256 * 1024 * 1024);
        assert_eq!(runtime.source_get_concurrency, 2);
    }

    #[test]
    fn runtime_tuning_rejects_zero_extremes_and_budget_overcommit() {
        for (property, value, expected) in [
            ("MaxParallelTransfers", json!(0), "MaxParallelTransfers"),
            ("MaxParallelTransfers", json!(257), "MaxParallelTransfers"),
            ("SourceGetConcurrency", json!(0), "SourceGetConcurrency"),
            ("SourceGetConcurrency", json!(65), "SourceGetConcurrency"),
            ("PutObjectMaxAttempts", json!(0), "PutObjectMaxAttempts"),
            ("PutObjectMaxAttempts", json!(11), "PutObjectMaxAttempts"),
            (
                "PutObjectRetryMaxDelayMs",
                json!(60_001),
                "PutObjectRetryMaxDelayMs",
            ),
            (
                "SourceWindowMemoryBudgetMb",
                json!(513),
                "50% of the actual Lambda memory",
            ),
            (
                "SourceWindowBytes",
                json!(4 * 1024 * 1024),
                "SourceWindowBytes must be greater",
            ),
            (
                "SourceBlockMergeGapBytes",
                json!("9007199254740992"),
                "SourceBlockMergeGapBytes",
            ),
        ] {
            let mut props = minimal_request();
            props[property] = value;
            let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
            let error = runtime_options_with_memory(&raw, Some("1024"))
                .expect_err("invalid runtime tuning must fail");
            assert!(
                error.to_string().contains(expected),
                "unexpected error for {property}: {error}"
            );
        }

        let mut props = minimal_request();
        props["SourceBlockBytes"] = json!(128 * 1024 * 1024);
        props["SourceGetConcurrency"] = json!(5);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        assert!(
            runtime_options_with_memory(&raw, Some("1024"))
                .unwrap_err()
                .to_string()
                .contains("SourceBlockBytes * SourceGetConcurrency")
        );
    }

    #[test]
    fn runtime_tuning_rejects_malformed_memory_and_inverted_delays() {
        let raw: RawDeploymentRequest = serde_json::from_value(minimal_request()).unwrap();
        assert!(runtime_options_with_memory(&raw, Some("not-a-number")).is_err());
        assert!(runtime_options_with_memory(&raw, Some("0")).is_err());

        let mut props = minimal_request();
        props["PutObjectRetryBaseDelayMs"] = json!(20);
        props["PutObjectRetryMaxDelayMs"] = json!(10);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        assert!(
            runtime_options_with_memory(&raw, Some("1024"))
                .unwrap_err()
                .to_string()
                .contains("PutObjectRetryBaseDelayMs")
        );
    }

    #[test]
    fn destination_checksum_strategy_is_required_and_exact() {
        let mut missing = minimal_request();
        missing
            .as_object_mut()
            .unwrap()
            .remove("DestinationChecksumStrategy");
        let raw: RawDeploymentRequest = serde_json::from_value(missing).unwrap();
        assert!(parse_request(&raw).is_err());

        let mut kms = minimal_request();
        kms["DestinationChecksumStrategy"] = json!("kms-sha256");
        let request = parse_request(&serde_json::from_value(kms).unwrap()).unwrap();
        assert_eq!(
            request.destination_checksum_strategy,
            DestinationChecksumStrategy::KmsSha256
        );

        let mut unknown = minimal_request();
        unknown["DestinationChecksumStrategy"] = json!("sha256");
        assert!(serde_json::from_value::<RawDeploymentRequest>(unknown).is_err());
    }

    #[test]
    fn source_catalogs_accept_aligned_trusted_and_untrusted_entries() {
        let mut props = minimal_request();
        props["SourceBucketNames"] = json!(["first", "second", "third"]);
        props["SourceObjectKeys"] = json!(["first.zip", "second.zip", "third.zip"]);
        props["SourceCatalogs"] = json!([
            {},
            { "Version": 1, "Sha256": "ab".repeat(32) },
            { "Version": "1", "Sha256": "cd".repeat(32) }
        ]);

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let request = parse_request(&raw).expect("valid catalog descriptors");

        assert!(request.source_catalogs[0].is_none());
        assert_eq!(
            request.source_catalogs[1].as_ref().unwrap().sha256,
            [0xab; 32]
        );
        assert_eq!(
            request.source_catalogs[2].as_ref().unwrap().sha256,
            [0xcd; 32]
        );
    }

    #[test]
    fn source_catalogs_reject_misaligned_partial_unsupported_and_malformed_entries() {
        for catalogs in [
            json!([]),
            json!([{ "Version": 1 }]),
            json!([{ "Sha256": "ab".repeat(32) }]),
            json!([{ "Version": 2, "Sha256": "ab".repeat(32) }]),
            json!([{ "Version": 1, "Sha256": "AB".repeat(32) }]),
            json!([{ "Version": 1, "Sha256": "ab".repeat(31) }]),
            json!([{ "Version": 1, "Sha256": "not-hex" }]),
        ] {
            let mut props = minimal_request();
            props["SourceCatalogs"] = catalogs;
            let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
            assert!(parse_request(&raw).is_err());
        }
    }

    #[test]
    fn source_catalogs_reject_unknown_descriptor_fields() {
        let mut props = minimal_request();
        props["SourceCatalogs"] = json!([{
            "Version": 1,
            "Sha256": "ab".repeat(32),
            "Trusted": true
        }]);

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn source_catalogs_reject_null_or_wrong_typed_descriptor_fields() {
        for descriptor in [
            json!({ "Version": null, "Sha256": null }),
            json!({ "Version": null }),
            json!({ "Sha256": null }),
            json!({ "Version": "not-a-version", "Sha256": "ab".repeat(32) }),
            json!({ "Version": 1, "Sha256": 123 }),
        ] {
            let mut props = minimal_request();
            props["SourceCatalogs"] = json!([descriptor]);
            assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
        }
    }

    #[test]
    fn source_catalog_validation_errors_do_not_expose_digest_values() {
        let secret_digest = "A".repeat(64);
        let mut props = minimal_request();
        props["SourceCatalogs"] = json!([{
            "Version": 1,
            "Sha256": secret_digest
        }]);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();

        let error = parse_request(&raw).expect_err("uppercase digest must fail");

        assert!(!error.to_string().contains(&secret_digest));
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
    fn deserializes_cloudformation_string_booleans_in_marker_config() {
        let mut props = minimal_request();
        props["SourceMarkers"] = json!([{}]);
        props["SourceMarkersConfig"] = json!([{ "jsonEscape": "true" }]);

        let raw: RawDeploymentRequest = serde_json::from_value(props)
            .expect("marker config string booleans should deserialize");
        let request = parse_request(&raw).expect("valid request");

        assert!(request.source_markers_config[0].json_escape);
    }

    #[test]
    fn serde_rejects_non_boolean_properties() {
        let mut props = minimal_request();
        props["DeleteStaleObjectsOnDeployment"] = json!({"bad": true});

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn deserializes_cloudformation_string_booleans() {
        let mut props = minimal_request();
        props["Extract"] = json!("true");
        props["DeleteCurrentObjectsOnDelete"] = json!("true");
        props["WaitForDistributionInvalidation"] = json!("true");
        props["DeleteStaleObjectsOnDeployment"] = json!("false");
        props["OutputObjectKeys"] = json!("true");

        let raw: RawDeploymentRequest =
            serde_json::from_value(props).expect("string booleans should deserialize");
        let request = parse_request(&raw).expect("valid request");

        assert!(request.extract);
        assert!(request.delete_current_objects_on_delete);
        assert!(request.wait_for_distribution_invalidation);
        assert!(!request.delete_stale_objects_on_deployment);
        assert!(request.output_object_keys);
    }

    #[test]
    fn deserializes_runtime_tuning_overrides() {
        let mut props = minimal_request();
        props["AvailableMemoryMb"] = json!("1024");
        props["MaxParallelTransfers"] = json!("12");
        props["SourceBlockBytes"] = json!("4096");
        props["SourceBlockMergeGapBytes"] = json!("128");
        props["SourceGetConcurrency"] = json!("6");
        props["SourceWindowBytes"] = json!("65536");
        props["SourceWindowMemoryBudgetMb"] = json!("512");
        props["PutObjectMaxAttempts"] = json!("3");
        props["PutObjectRetryBaseDelayMs"] = json!("10");
        props["PutObjectRetryMaxDelayMs"] = json!("20");
        props["PutObjectSlowdownRetryBaseDelayMs"] = json!("30");
        props["PutObjectSlowdownRetryMaxDelayMs"] = json!("40");
        props["PutObjectRetryJitter"] = json!("none");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let request = parse_request(&raw).expect("valid request");

        assert_eq!(request.runtime.available_memory_mb, 1024);
        assert_eq!(request.runtime.max_parallel_transfers, 12);
        assert_eq!(request.runtime.source_block_bytes, 4096);
        assert_eq!(request.runtime.source_block_merge_gap_bytes, 128);
        assert_eq!(request.runtime.source_get_concurrency, 6);
        assert_eq!(request.runtime.source_window_bytes, Some(65_536));
        assert_eq!(
            request.runtime.source_memory_budget_bytes,
            512 * 1024 * 1024
        );
        assert_eq!(request.runtime.put_object_retry.max_attempts, 3);
        assert_eq!(request.runtime.put_object_retry.retry_base_delay_ms, 10);
        assert_eq!(request.runtime.put_object_retry.retry_max_delay_ms, 20);
        assert_eq!(
            request
                .runtime
                .put_object_retry
                .slowdown_retry_base_delay_ms,
            30
        );
        assert_eq!(
            request.runtime.put_object_retry.slowdown_retry_max_delay_ms,
            40
        );
        assert_eq!(
            request.runtime.put_object_retry.jitter,
            PutObjectRetryJitter::None
        );
    }

    #[test]
    fn deserializes_previous_destination_delete_authorization() {
        let mut props = minimal_request();
        props["DestinationOwnerId"] = json!("owner-123");
        props["DeletePreviousObjectsOnChange"] = json!({
            "DestinationBucketName": "old-bucket"
        });
        props["InvalidatePreviousDistributionOnChange"] = json!("old-distribution");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let request = parse_request(&raw).expect("valid request");

        assert_eq!(request.destination_owner_id.as_deref(), Some("owner-123"));
        assert_eq!(
            request.delete_previous_objects_on_change,
            Some(DeletePreviousObjectsOnChange {
                bucket_name: "old-bucket".to_string(),
            })
        );
        assert_eq!(
            request
                .invalidate_previous_distribution_on_change
                .as_deref(),
            Some("old-distribution")
        );
    }

    #[test]
    fn rejects_obsolete_previous_prefix_authorization() {
        let mut props = minimal_request();
        props["DeletePreviousObjectsOnChange"] = json!({
            "DestinationBucketName": "old-bucket",
            "DestinationBucketKeyPrefix": "old-site"
        });

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn rejects_source_blocks_below_zip_local_header_length() {
        let mut props = minimal_request();
        props["SourceBlockBytes"] = json!("1");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let error = parse_request(&raw).expect_err("undersized source block must fail");

        assert!(error.to_string().contains("SourceBlockBytes"));
    }
}
