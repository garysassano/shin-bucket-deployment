use std::borrow::Cow;
use std::collections::HashMap;
use std::ffi::OsStr;
use std::path::Path;

use anyhow::{Context, Result, anyhow, ensure};
use globset::{Glob, GlobMatcher};
use serde::{Deserialize, Deserializer, Serialize};

use crate::s3::{
    DEFAULT_SOURCE_BLOCK_BYTES, DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES,
    DEFAULT_TRANSFER_MAX_CONCURRENCY, PUT_OBJECT_MAX_ATTEMPTS, PUT_OBJECT_RETRY_BASE_DELAY_MS,
    PUT_OBJECT_RETRY_MAX_DELAY_MS, PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS,
    PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS, S3_SINGLE_PUT_LIMIT, adaptive_source_get_concurrency,
};
use crate::types::{
    ArchiveExpansionLimits, DeletePreviousObjectsOnChange, DeploymentRequest, Filters,
    MarkerConfig, PreviousDestination, PutObjectRetryJitter, PutObjectRetryOptions, RuntimeOptions,
    TrustedSourceCatalog,
};
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, sanitize_diagnostic};

const MIN_SOURCE_BLOCK_BYTES: usize = 30;
const MAX_PARALLEL_TRANSFERS: usize = 256;
const MAX_SOURCE_GET_CONCURRENCY: usize = 64;
const MAX_PUT_OBJECT_ATTEMPTS: usize = 10;
const MAX_COMPRESSION_RATIO: u64 = 10_000;
const MAX_RETRY_DELAY_MS: u64 = 60_000;
const MAX_SAFE_INTEGER: u64 = 9_007_199_254_740_991;
const MIB: u64 = 1024 * 1024;
const LAMBDA_MEMORY_ENV: &str = "AWS_LAMBDA_FUNCTION_MEMORY_SIZE";

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
#[serde(deny_unknown_fields)]
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
    /// The current destination. Wire names mirror the public API paths the
    /// construct synthesizes them from; non-public values (the ownership
    /// identity, envelope fields) stay flat.
    pub(crate) destination: RawDestination,
    pub(crate) source_processing: RawSourceProcessing,
    pub(crate) destination_lifecycle: RawDestinationLifecycle,
    pub(crate) cloudfront_invalidation: RawCloudfrontInvalidation,
    pub(crate) transfer: RawTransferOptions,
    #[serde(
        default = "default_true",
        deserialize_with = "crate::util::deserialize_boolish"
    )]
    pub(crate) output_object_keys: bool,
    #[serde(default)]
    pub(crate) destination_bucket_arn: Option<String>,
    pub(crate) destination_owner_id: String,
    /// CloudFormation puts the custom-resource envelope in `ResourceProperties` alongside the
    /// deployment inputs, so a strict request has to declare it. `ServiceToken` is the handler
    /// ARN CloudFormation dispatched through; `ServiceTimeout` is the CDK `serviceTimeout`
    /// rendered by `CustomResource`. Both are transport, not deployment input: they are parsed
    /// and dropped. Stripping them before decoding would mean cloning the whole property tree,
    /// which `decode_resource_properties` deliberately avoids. Typed as `Value` so a protocol
    /// representation change cannot fail a deployment over a field the provider ignores.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) service_token: Option<serde_json::Value>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub(crate) service_timeout: Option<serde_json::Value>,
    /// Opaque redeploy trigger. CloudFormation only re-invokes a custom resource when
    /// some property changes, so a caller that needs a fresh invocation without changing
    /// any real input varies this instead. It is parsed and then ignored: it reaches no
    /// planning, transfer, or cleanup decision. Declaring it keeps `deny_unknown_fields`
    /// strict for every other field rather than reopening the request to arbitrary keys.
    #[serde(default)]
    pub(crate) deployment_nonce: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestination {
    pub(crate) bucket_name: String,
    #[serde(default)]
    pub(crate) key_prefix: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawSourceProcessing {
    #[serde(
        default = "default_true",
        deserialize_with = "crate::util::deserialize_boolish"
    )]
    pub(crate) extract: bool,
    #[serde(deserialize_with = "deserialize_u64ish")]
    pub(crate) max_uncompressed_entry_bytes: u64,
    #[serde(deserialize_with = "deserialize_u64ish")]
    pub(crate) max_compression_ratio: u64,
    #[serde(default)]
    pub(crate) exclude: Vec<String>,
    #[serde(default)]
    pub(crate) include: Vec<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestinationLifecycle {
    pub(crate) on_deploy: RawDestinationLifecycleOnDeploy,
    pub(crate) on_change: RawDestinationLifecycleOnChange,
    pub(crate) on_delete: RawDestinationLifecycleOnDelete,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestinationLifecycleOnDeploy {
    #[serde(
        default = "default_true",
        deserialize_with = "crate::util::deserialize_boolish"
    )]
    pub(crate) delete_stale_objects: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestinationLifecycleOnChange {
    #[serde(default, deserialize_with = "crate::util::deserialize_boolish")]
    pub(crate) delete_previous_objects: bool,
    #[serde(default)]
    pub(crate) previous_bucket_name: Option<String>,
    #[serde(default)]
    pub(crate) invalidate_previous_distribution: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestinationLifecycleOnDelete {
    #[serde(default, deserialize_with = "crate::util::deserialize_boolish")]
    pub(crate) delete_current_objects: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawCloudfrontInvalidation {
    #[serde(default)]
    pub(crate) distribution_id: Option<String>,
    #[serde(default)]
    pub(crate) distribution_paths: Option<Vec<String>>,
    #[serde(
        default = "default_true",
        deserialize_with = "crate::util::deserialize_boolish"
    )]
    pub(crate) wait_for_completion: bool,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawTransferOptions {
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) max_concurrency: Option<usize>,
    pub(crate) advanced_tuning: RawAdvancedTuning,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawAdvancedTuning {
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_block_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_block_merge_gap_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_get_concurrency: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) source_window_bytes: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    #[serde(rename = "SourceWindowMemoryBudgetMiB")]
    pub(crate) source_window_memory_budget_mib: Option<u64>,
    pub(crate) destination_write_retry: RawDestinationWriteRetry,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
#[serde(rename_all = "PascalCase")]
pub(crate) struct RawDestinationWriteRetry {
    #[serde(default, deserialize_with = "deserialize_optional_usizeish")]
    pub(crate) max_attempts: Option<usize>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) base_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) max_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) slowdown_base_delay_ms: Option<u64>,
    #[serde(default, deserialize_with = "deserialize_optional_u64ish")]
    pub(crate) slowdown_max_delay_ms: Option<u64>,
    #[serde(default)]
    pub(crate) jitter: Option<PutObjectRetryJitter>,
}

impl Filters {
    /// Excluded keys can be re-included, so the include patterns only matter once a key
    /// has actually been excluded. Running both lists to completion for every planned
    /// entry, as this used to, is wasted work on the phase that dominates both fast paths.
    pub(crate) fn should_include(&self, key: &str) -> bool {
        if !self.exclude.iter().any(|matcher| matcher.is_match(key)) {
            return true;
        }
        self.include.iter().any(|matcher| matcher.is_match(key))
    }
}

/// Takes the raw request by value so every owned field moves into the parsed request.
/// The two `&raw` helpers below run first, while the whole value is still intact.
pub(crate) fn parse_request(raw: RawDeploymentRequest) -> Result<DeploymentRequest> {
    let lambda_memory = std::env::var_os(LAMBDA_MEMORY_ENV);
    parse_request_with_memory(raw, parse_lambda_memory_env(lambda_memory.as_deref())?)
}

pub(crate) fn parse_request_with_memory(
    raw: RawDeploymentRequest,
    lambda_memory: &str,
) -> Result<DeploymentRequest> {
    validate_destination_owner_id(&raw.destination_owner_id)?;
    validate_distribution_id(
        "CloudfrontInvalidation.DistributionId",
        raw.cloudfront_invalidation.distribution_id.as_deref(),
    )?;
    validate_distribution_id(
        "DestinationLifecycle.OnChange.InvalidatePreviousDistribution",
        raw.destination_lifecycle
            .on_change
            .invalidate_previous_distribution
            .as_deref(),
    )?;
    let source_catalogs = parse_source_catalogs(&raw)?;
    let archive_expansion = archive_expansion_limits(&raw.source_processing)?;
    let runtime = runtime_options_with_memory(&raw.transfer, lambda_memory)?;

    let source_count = raw.source_bucket_names.len();
    let mut source_markers = raw.source_markers;
    let mut source_markers_config = raw.source_markers_config;

    if source_markers.is_empty() {
        source_markers = vec![HashMap::new(); source_count];
    }
    if source_markers_config.is_empty() {
        source_markers_config = vec![MarkerConfig::default(); source_count];
    }

    let delete_previous_objects_on_change = raw
        .destination_lifecycle
        .on_change
        .delete_previous_objects
        .then(|| {
            let bucket_name = raw
                .destination_lifecycle
                .on_change
                .previous_bucket_name
                .clone()
                .unwrap_or_else(|| raw.destination.bucket_name.clone());
            DeletePreviousObjectsOnChange { bucket_name }
        });

    let dest_bucket_prefix =
        normalize_destination_prefix(raw.destination.key_prefix.unwrap_or_default());

    let default_distribution_path = default_distribution_path(&dest_bucket_prefix);

    Ok(DeploymentRequest {
        source_bucket_names: raw.source_bucket_names,
        source_object_keys: raw.source_object_keys,
        source_catalogs,
        source_markers,
        source_markers_config,
        dest_bucket_name: raw.destination.bucket_name,
        dest_bucket_prefix,
        extract: raw.source_processing.extract,
        delete_current_objects_on_delete: raw
            .destination_lifecycle
            .on_delete
            .delete_current_objects,
        distribution_id: raw.cloudfront_invalidation.distribution_id,
        distribution_paths: raw
            .cloudfront_invalidation
            .distribution_paths
            .unwrap_or_else(|| vec![default_distribution_path]),
        wait_for_distribution_invalidation: raw.cloudfront_invalidation.wait_for_completion,
        delete_stale_objects_on_deployment: raw
            .destination_lifecycle
            .on_deploy
            .delete_stale_objects,
        exclude: raw.source_processing.exclude,
        include: raw.source_processing.include,
        output_object_keys: raw.output_object_keys,
        destination_bucket_arn: raw.destination_bucket_arn,
        destination_owner_id: raw.destination_owner_id,
        delete_previous_objects_on_change,
        invalidate_previous_distribution_on_change: raw
            .destination_lifecycle
            .on_change
            .invalidate_previous_distribution,
        archive_expansion,
        runtime,
    })
}

fn archive_expansion_limits(processing: &RawSourceProcessing) -> Result<ArchiveExpansionLimits> {
    validate_u64_range(
        "SourceProcessing.MaxUncompressedEntryBytes",
        processing.max_uncompressed_entry_bytes,
        1,
        S3_SINGLE_PUT_LIMIT,
    )?;
    validate_u64_range(
        "SourceProcessing.MaxCompressionRatio",
        processing.max_compression_ratio,
        1,
        MAX_COMPRESSION_RATIO,
    )?;
    Ok(ArchiveExpansionLimits {
        max_uncompressed_entry_bytes: processing.max_uncompressed_entry_bytes,
        max_compression_ratio: processing.max_compression_ratio,
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

fn parse_lambda_memory_env(value: Option<&OsStr>) -> Result<&str> {
    value
        .ok_or_else(|| anyhow!("{LAMBDA_MEMORY_ENV} must be set"))?
        .to_str()
        .ok_or_else(|| anyhow!("{LAMBDA_MEMORY_ENV} must contain valid Unicode"))
}

fn runtime_options_with_memory(
    transfer: &RawTransferOptions,
    lambda_memory: &str,
) -> Result<RuntimeOptions> {
    let available_memory_mb = lambda_memory.parse::<u64>().with_context(|| {
        format!("{LAMBDA_MEMORY_ENV} must contain a positive integer MiB value")
    })?;
    validate_u64_range(LAMBDA_MEMORY_ENV, available_memory_mb, 1, MAX_SAFE_INTEGER)?;

    let lambda_memory_bytes = available_memory_mb
        .checked_mul(MIB)
        .ok_or_else(|| anyhow!("Lambda memory size overflowed while converting MiB to bytes"))?;
    let memory_cap_bytes = lambda_memory_bytes / 2;
    let source_memory_budget_bytes = match transfer.advanced_tuning.source_window_memory_budget_mib
    {
        Some(memory_mb) => {
            validate_u64_range(
                "Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB",
                memory_mb,
                1,
                MAX_SAFE_INTEGER,
            )?;
            memory_mb.checked_mul(MIB).ok_or_else(|| {
                anyhow!("Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB overflowed while converting MiB to bytes")
            })?
        }
        None => memory_cap_bytes,
    };
    ensure!(
        source_memory_budget_bytes <= memory_cap_bytes,
        "Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB must not exceed 50% of the actual Lambda memory"
    );
    let source_memory_budget_bytes = usize::try_from(source_memory_budget_bytes)
        .context("source memory budget cannot be represented on this provider architecture")?;

    let max_parallel_transfers = transfer
        .max_concurrency
        .unwrap_or(DEFAULT_TRANSFER_MAX_CONCURRENCY);
    validate_usize_range(
        "Transfer.MaxConcurrency",
        max_parallel_transfers,
        1,
        MAX_PARALLEL_TRANSFERS,
    )?;

    let source_block_bytes = transfer
        .advanced_tuning
        .source_block_bytes
        .unwrap_or(DEFAULT_SOURCE_BLOCK_BYTES);
    validate_usize_range(
        "Transfer.AdvancedTuning.SourceBlockBytes",
        source_block_bytes,
        MIN_SOURCE_BLOCK_BYTES,
        usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
    )?;
    ensure!(
        source_block_bytes <= source_memory_budget_bytes,
        "Transfer.AdvancedTuning.SourceBlockBytes must fit within the invocation-global source memory budget"
    );

    let source_block_merge_gap_bytes = transfer
        .advanced_tuning
        .source_block_merge_gap_bytes
        .unwrap_or(DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES);
    validate_usize_range(
        "Transfer.AdvancedTuning.SourceBlockMergeGapBytes",
        source_block_merge_gap_bytes,
        0,
        usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
    )?;

    let source_get_concurrency = transfer
        .advanced_tuning
        .source_get_concurrency
        .unwrap_or_else(|| adaptive_source_get_concurrency(available_memory_mb));
    validate_usize_range(
        "Transfer.AdvancedTuning.SourceGetConcurrency",
        source_get_concurrency,
        1,
        MAX_SOURCE_GET_CONCURRENCY,
    )?;
    let concurrent_source_block_bytes = source_block_bytes
        .checked_mul(source_get_concurrency)
        .ok_or_else(|| {
            anyhow!(
                "Transfer.AdvancedTuning.SourceBlockBytes * Transfer.AdvancedTuning.SourceGetConcurrency overflowed"
            )
        })?;
    ensure!(
        concurrent_source_block_bytes <= source_memory_budget_bytes,
        "Transfer.AdvancedTuning.SourceBlockBytes * Transfer.AdvancedTuning.SourceGetConcurrency must fit within the invocation-global source memory budget"
    );

    if let Some(source_window_bytes) = transfer.advanced_tuning.source_window_bytes {
        validate_usize_range(
            "Transfer.AdvancedTuning.SourceWindowBytes",
            source_window_bytes,
            1,
            usize::try_from(MAX_SAFE_INTEGER).unwrap_or(usize::MAX),
        )?;
        ensure!(
            source_window_bytes >= source_block_bytes,
            "Transfer.AdvancedTuning.SourceWindowBytes must be greater than or equal to Transfer.AdvancedTuning.SourceBlockBytes"
        );
        ensure!(
            source_window_bytes <= source_memory_budget_bytes,
            "Transfer.AdvancedTuning.SourceWindowBytes must fit within the invocation-global source memory budget"
        );
    }

    let put_object_max_attempts = transfer
        .advanced_tuning
        .destination_write_retry
        .max_attempts
        .unwrap_or(PUT_OBJECT_MAX_ATTEMPTS);
    validate_usize_range(
        "Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts",
        put_object_max_attempts,
        1,
        MAX_PUT_OBJECT_ATTEMPTS,
    )?;
    let retry_base_delay_ms = transfer
        .advanced_tuning
        .destination_write_retry
        .base_delay_ms
        .unwrap_or(PUT_OBJECT_RETRY_BASE_DELAY_MS);
    let retry_max_delay_ms = transfer
        .advanced_tuning
        .destination_write_retry
        .max_delay_ms
        .unwrap_or(PUT_OBJECT_RETRY_MAX_DELAY_MS);
    let slowdown_retry_base_delay_ms = transfer
        .advanced_tuning
        .destination_write_retry
        .slowdown_base_delay_ms
        .unwrap_or(PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS);
    let slowdown_retry_max_delay_ms = transfer
        .advanced_tuning
        .destination_write_retry
        .slowdown_max_delay_ms
        .unwrap_or(PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS);
    for (name, value) in [
        (
            "Transfer.AdvancedTuning.DestinationWriteRetry.BaseDelayMs",
            retry_base_delay_ms,
        ),
        (
            "Transfer.AdvancedTuning.DestinationWriteRetry.MaxDelayMs",
            retry_max_delay_ms,
        ),
        (
            "Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownBaseDelayMs",
            slowdown_retry_base_delay_ms,
        ),
        (
            "Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownMaxDelayMs",
            slowdown_retry_max_delay_ms,
        ),
    ] {
        validate_u64_range(name, value, 0, MAX_RETRY_DELAY_MS)?;
    }
    ensure!(
        retry_base_delay_ms <= retry_max_delay_ms,
        "Transfer.AdvancedTuning.DestinationWriteRetry.BaseDelayMs must be less than or equal to Transfer.AdvancedTuning.DestinationWriteRetry.MaxDelayMs"
    );
    ensure!(
        slowdown_retry_base_delay_ms <= slowdown_retry_max_delay_ms,
        "Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownBaseDelayMs must be less than or equal to Transfer.AdvancedTuning.DestinationWriteRetry.SlowdownMaxDelayMs"
    );

    Ok(RuntimeOptions {
        available_memory_mb,
        max_parallel_transfers,
        source_block_bytes,
        source_block_merge_gap_bytes,
        source_get_concurrency,
        source_window_bytes: transfer.advanced_tuning.source_window_bytes,
        source_memory_budget_bytes,
        put_object_retry: PutObjectRetryOptions {
            max_attempts: put_object_max_attempts,
            retry_base_delay_ms,
            retry_max_delay_ms,
            slowdown_retry_base_delay_ms,
            slowdown_retry_max_delay_ms,
            jitter: transfer
                .advanced_tuning
                .destination_write_retry
                .jitter
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

pub(crate) fn parse_old_destination(raw: &RawDeploymentRequest) -> Result<PreviousDestination> {
    validate_destination_owner_id(&raw.destination_owner_id)?;
    validate_distribution_id(
        "CloudfrontInvalidation.DistributionId",
        raw.cloudfront_invalidation.distribution_id.as_deref(),
    )?;
    let old_prefix =
        normalize_destination_prefix(raw.destination.key_prefix.clone().unwrap_or_default());
    Ok(PreviousDestination {
        bucket_name: raw.destination.bucket_name.clone(),
        bucket_prefix: old_prefix.clone(),
        distribution_id: raw.cloudfront_invalidation.distribution_id.clone(),
        distribution_paths: raw
            .cloudfront_invalidation
            .distribution_paths
            .clone()
            .unwrap_or_else(|| vec![default_distribution_path(&old_prefix)]),
        owner_id: raw.destination_owner_id.clone(),
    })
}

fn validate_destination_owner_id(owner_id: &str) -> Result<()> {
    ensure!(
        !owner_id.is_empty() && !owner_id.contains(':'),
        "DestinationOwnerId must be non-empty and must not contain ':'"
    );
    Ok(())
}

fn validate_distribution_id(name: &str, distribution_id: Option<&str>) -> Result<()> {
    if let Some(distribution_id) = distribution_id {
        ensure!(
            !distribution_id.is_empty() && !distribution_id.chars().any(char::is_control),
            "{name} must be non-empty and must not contain control characters"
        );
    }
    Ok(())
}

pub(crate) fn compile_filters(exclude: &[String], include: &[String]) -> Result<Filters> {
    Ok(Filters {
        exclude: compile_globs(exclude)?,
        include: compile_globs(include)?,
    })
}

/// Canonicalizes a destination prefix to its namespace form: leading and trailing
/// slashes are trimmed, so `"/"`, `"//"`, `"site/"`, and `"/site/"` all normalize the
/// way only the exact `"/"` root previously did. Interior repeated slashes are
/// preserved because S3 keys may legitimately contain them; only the boundary slashes
/// are namespace punctuation.
///
/// **This is a deployed-state breaking change.** The normalized value is hashed into
/// the destination physical resource ID (`destination_physical_resource_id`), so any
/// existing stack whose configured prefix carries a leading or trailing slash gets a
/// new physical resource ID on its next update, and CloudFormation replaces the custom
/// resource: the new namespace is created and the old one is deleted, which removes the
/// previously deployed objects under it. Stacks with a slash-free prefix, or with no
/// prefix, are unaffected. Taken deliberately under the pre-`1.0` clean-break policy in
/// `AGENTS.md` rather than carrying a compatibility path.
pub(crate) fn normalize_destination_prefix(prefix: String) -> String {
    prefix.trim_matches('/').to_string()
}

/// Borrows when the entry path is already canonical, which is the overwhelmingly common
/// case. A trusted-catalog plan normalizes every entry three times (catalog entry scan,
/// catalog/ZIP set comparison, and the planning loop), and the owning form allocated a
/// replacement string, a parts vector, and a joined string on each of them.
pub(crate) fn normalize_archive_key(raw: &str) -> Result<Cow<'_, str>> {
    if is_canonical_archive_key(raw) {
        return Ok(Cow::Borrowed(raw));
    }

    let normalized = raw.replace('\\', "/");
    let mut parts = Vec::new();

    for part in normalized.split('/') {
        if part.is_empty() || part == "." {
            continue;
        }
        if part == ".." {
            return Err(anyhow!(
                "archive entry attempts path traversal: {}",
                sanitize_diagnostic(raw, MAX_DIAGNOSTIC_VALUE_BYTES)
            ));
        }
        parts.push(part);
    }

    if parts.is_empty() {
        return Err(anyhow!(
            "archive entry resolved to an empty key: {}",
            sanitize_diagnostic(raw, MAX_DIAGNOSTIC_VALUE_BYTES)
        ));
    }

    Ok(Cow::Owned(parts.join("/")))
}

/// True when normalization would return `raw` unchanged. `..` is deliberately excluded so
/// a traversal attempt falls through to the owning path and is rejected there.
fn is_canonical_archive_key(raw: &str) -> bool {
    !raw.is_empty()
        && !raw.contains('\\')
        && !raw.starts_with('/')
        && !raw.ends_with('/')
        && !raw.contains("//")
        && raw.split('/').all(|part| part != "." && part != "..")
}

pub(crate) fn source_basename(key: &str) -> Result<String> {
    let basename = Path::new(key)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| {
            anyhow!(
                "unable to determine basename for source object key {}",
                sanitize_diagnostic(key, MAX_DIAGNOSTIC_VALUE_BYTES)
            )
        })?;
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

    match key.strip_prefix(prefix) {
        Some(stripped) => stripped.to_string(),
        None => {
            // Every production caller derives `prefix` from the same namespace the
            // listing was requested under, so a mismatch is a programming error
            // rather than a runtime condition. Release builds keep the historical
            // pass-through fallback so behavior is unchanged; debug builds trip so
            // the bug is caught.
            debug_assert!(
                false,
                "destination key `{key}` does not start with the strip prefix `{prefix}`"
            );
            key.to_string()
        }
    }
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

fn deserialize_optional_u64ish<'de, D>(
    deserializer: D,
) -> std::result::Result<Option<u64>, D::Error>
where
    D: Deserializer<'de>,
{
    deserialize_optional_unsigned(deserializer, "u64")
}

fn deserialize_u64ish<'de, D>(deserializer: D) -> std::result::Result<u64, D::Error>
where
    D: Deserializer<'de>,
{
    struct U64ishVisitor;

    impl serde::de::Visitor<'_> for U64ishVisitor {
        type Value = u64;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("an unsigned integer or a decimal string containing one")
        }

        fn visit_u64<E>(self, value: u64) -> std::result::Result<Self::Value, E> {
            Ok(value)
        }

        fn visit_i64<E>(self, value: i64) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            u64::try_from(value)
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Signed(value), &self))
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            if value.is_empty() || !value.bytes().all(|byte| byte.is_ascii_digit()) {
                return Err(E::invalid_value(serde::de::Unexpected::Str(value), &self));
            }
            value
                .parse::<u64>()
                .map_err(|_| E::invalid_value(serde::de::Unexpected::Str(value), &self))
        }
    }

    deserializer.deserialize_any(U64ishVisitor)
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
                .map_err(|_| {
                    anyhow!(
                        "invalid include/exclude pattern: {}",
                        sanitize_diagnostic(pattern, MAX_DIAGNOSTIC_VALUE_BYTES)
                    )
                })
                .map(|glob| glob.compile_matcher())
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn filters_keep_exclude_then_reinclude_semantics_while_short_circuiting() {
        let filters = compile_filters(
            &["assets/**".to_string(), "*.map".to_string()],
            &["assets/keep/**".to_string()],
        )
        .expect("valid globs");

        assert!(filters.should_include("index.html"));
        assert!(!filters.should_include("assets/app.js"));
        assert!(filters.should_include("assets/keep/app.js"));
        assert!(!filters.should_include("app.js.map"));

        // Include patterns must not promote a key that was never excluded, and must not be
        // consulted at all for such a key.
        let include_only =
            compile_filters(&[], &["assets/keep/**".to_string()]).expect("valid globs");
        assert!(include_only.should_include("anything.txt"));
    }

    #[test]
    fn invalid_glob_diagnostics_escape_and_cap_the_pattern_without_raw_parser_fallback() {
        let pattern = format!("[\r\nforged\u{2028}{}", "x".repeat(400));
        let error = compile_filters(&[pattern], &[])
            .err()
            .expect("invalid glob must fail")
            .to_string();

        assert!(error.contains("[\\r\\nforged\\u{2028}"));
        assert!(error.contains(" ... [truncated]"));
        assert!(!error.chars().any(char::is_control));
        assert!(error.len() < 400);
        assert!(!error.contains("unclosed"));
    }

    #[test]
    fn canonical_archive_keys_are_borrowed_and_non_canonical_ones_normalized() {
        assert!(matches!(
            normalize_archive_key("assets/app.js").expect("canonical"),
            Cow::Borrowed("assets/app.js")
        ));
        assert!(matches!(
            normalize_archive_key("a.b-c_d/e.txt").expect("canonical"),
            Cow::Borrowed(_)
        ));

        for (raw, expected) in [
            ("assets\\app.js", "assets/app.js"),
            ("/leading/app.js", "leading/app.js"),
            ("a//b/./c.txt", "a/b/c.txt"),
            ("dir/", "dir"),
        ] {
            let normalized = normalize_archive_key(raw).expect("normalizable");
            assert_eq!(normalized, expected, "{raw}");
            assert!(matches!(normalized, Cow::Owned(_)), "{raw}");
        }

        assert!(normalize_archive_key("../escape.txt").is_err());
        assert!(normalize_archive_key("a/../../escape.txt").is_err());
        assert!(normalize_archive_key("").is_err());
        assert!(normalize_archive_key("/").is_err());

        let hostile = format!("\r\nforged\u{2028}{}/../escape.txt", "x".repeat(400));
        let error = normalize_archive_key(&hostile)
            .expect_err("hostile traversal must fail")
            .to_string();
        assert!(error.contains("\\r\\nforged\\u{2028}"));
        assert!(error.contains(" ... [truncated]"));
        assert!(!error.chars().any(char::is_control));
        assert!(error.len() < 400);
    }

    fn minimal_request() -> serde_json::Value {
        json!({
            "SourceBucketNames": ["source-bucket"],
            "SourceObjectKeys": ["source.zip"],
            "Destination": {
                "BucketName": "dest-bucket"
            },
            "DestinationOwnerId": "owner-123",
            "SourceProcessing": {
                "MaxUncompressedEntryBytes": 1073741824,
                "MaxCompressionRatio": 100
            },
            "DestinationLifecycle": {
                "OnDeploy": {},
                "OnChange": {},
                "OnDelete": {}
            },
            "CloudfrontInvalidation": {},
            "Transfer": {
                "AdvancedTuning": {
                    "DestinationWriteRetry": {}
                }
            }
        })
    }

    fn parse_test_request(raw: RawDeploymentRequest) -> Result<DeploymentRequest> {
        parse_request_with_memory(raw, "1024")
    }

    /// Sets a nested wire property, creating intermediate objects as needed.
    fn set_request_property(props: &mut serde_json::Value, path: &str, value: serde_json::Value) {
        let segments: Vec<&str> = path.split('.').collect();
        let mut current = props;
        for segment in &segments[..segments.len() - 1] {
            current = current
                .as_object_mut()
                .expect("nested path segment must be an object")
                .entry((*segment).to_string())
                .or_insert_with(|| serde_json::json!({}));
        }
        current
            .as_object_mut()
            .expect("leaf path parent must be an object")
            .insert(segments[segments.len() - 1].to_string(), value);
    }

    #[test]
    fn deserializes_minimal_request_with_required_archive_limits() {
        let raw: RawDeploymentRequest =
            serde_json::from_value(minimal_request()).expect("minimal request should deserialize");
        let request = parse_test_request(raw).expect("valid request");

        assert!(request.extract);
        assert!(!request.delete_current_objects_on_delete);
        assert!(request.delete_stale_objects_on_deployment);
        assert!(request.output_object_keys);
        assert_eq!(request.destination_owner_id, "owner-123");
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
            request.archive_expansion,
            ArchiveExpansionLimits {
                max_uncompressed_entry_bytes: 1_073_741_824,
                max_compression_ratio: 100,
            }
        );
        assert_eq!(
            request.runtime.put_object_retry.jitter,
            PutObjectRetryJitter::Full
        );
    }

    #[test]
    fn destination_owner_id_is_required_by_the_current_protocol() {
        let mut props = minimal_request();
        props
            .as_object_mut()
            .expect("request is an object")
            .remove("DestinationOwnerId");

        let error = serde_json::from_value::<RawDeploymentRequest>(props)
            .expect_err("a request without its owner identity must fail");

        assert!(error.to_string().contains("DestinationOwnerId"));
    }

    #[test]
    fn destination_owner_id_must_be_nonempty_and_unambiguous() {
        for owner_id in ["", "owner:ambiguous"] {
            let mut props = minimal_request();
            props["DestinationOwnerId"] = json!(owner_id);
            let raw: RawDeploymentRequest =
                serde_json::from_value(props).expect("owner shape is validated after decoding");

            let error = parse_test_request(raw).expect_err("invalid owner identity must fail");

            assert!(error.to_string().contains("DestinationOwnerId"));
        }
    }

    #[test]
    fn distribution_ids_must_be_nonempty_and_free_of_control_characters() {
        for (property, value) in [
            ("CloudfrontInvalidation.DistributionId", ""),
            (
                "CloudfrontInvalidation.DistributionId",
                "distribution\nforged",
            ),
            (
                "DestinationLifecycle.OnChange.InvalidatePreviousDistribution",
                "previous\u{7f}",
            ),
        ] {
            let mut props = minimal_request();
            set_request_property(&mut props, property, json!(value));
            let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();

            let error = parse_test_request(raw).expect_err("invalid distribution id must fail");

            assert!(
                error.to_string().contains(property),
                "unexpected error for {property}: {error}"
            );
        }
    }

    #[test]
    fn archive_expansion_limits_are_required() {
        for missing in [
            "SourceProcessing.MaxUncompressedEntryBytes",
            "SourceProcessing.MaxCompressionRatio",
        ] {
            let mut props = minimal_request();
            let path: Vec<&str> = missing.split('.').collect();
            let parent = props
                .pointer_mut(&format!("/{}", path[..path.len() - 1].join("/")))
                .expect("parent path exists");
            parent
                .as_object_mut()
                .expect("parent is an object")
                .remove(path[path.len() - 1]);

            let error = serde_json::from_value::<RawDeploymentRequest>(props)
                .expect_err("a missing archive expansion limit must fail");

            assert!(
                error.to_string().contains(path[path.len() - 1]),
                "unexpected error for {missing}: {error}"
            );
        }
    }

    #[test]
    fn archive_expansion_limits_accept_numeric_and_decimal_string_boundaries() {
        for (entry_bytes, ratio, expected_entry_bytes, expected_ratio) in [
            (json!(1), json!(1), 1, 1),
            (
                json!(S3_SINGLE_PUT_LIMIT.to_string()),
                json!(MAX_COMPRESSION_RATIO.to_string()),
                S3_SINGLE_PUT_LIMIT,
                MAX_COMPRESSION_RATIO,
            ),
        ] {
            let mut props = minimal_request();
            props["SourceProcessing"]["MaxUncompressedEntryBytes"] = entry_bytes;
            props["SourceProcessing"]["MaxCompressionRatio"] = ratio;

            let raw: RawDeploymentRequest = serde_json::from_value(props)
                .expect("number and decimal string forms should deserialize");
            let limits = archive_expansion_limits(&raw.source_processing)
                .expect("boundary must be accepted");

            assert_eq!(limits.max_uncompressed_entry_bytes, expected_entry_bytes);
            assert_eq!(limits.max_compression_ratio, expected_ratio);
        }
    }

    #[test]
    fn archive_expansion_limits_reject_zero_and_values_above_the_current_bounds() {
        for (property, value) in [
            ("SourceProcessing.MaxUncompressedEntryBytes", json!(0)),
            (
                "SourceProcessing.MaxUncompressedEntryBytes",
                json!(S3_SINGLE_PUT_LIMIT + 1),
            ),
            ("SourceProcessing.MaxCompressionRatio", json!(0)),
            (
                "SourceProcessing.MaxCompressionRatio",
                json!(MAX_COMPRESSION_RATIO + 1),
            ),
        ] {
            let mut props = minimal_request();
            set_request_property(&mut props, property, value);
            let raw: RawDeploymentRequest = serde_json::from_value(props)
                .expect("range-invalid unsigned integer should deserialize");

            let error = archive_expansion_limits(&raw.source_processing)
                .expect_err("out-of-range archive expansion limit must fail");

            assert!(
                error.to_string().contains(property),
                "unexpected error for {property}: {error}"
            );
        }
    }

    #[test]
    fn archive_expansion_limits_reject_null_blank_signed_fractional_and_malformed_values() {
        for (property, value) in [
            ("SourceProcessing.MaxUncompressedEntryBytes", json!(null)),
            ("SourceProcessing.MaxUncompressedEntryBytes", json!("")),
            ("SourceProcessing.MaxUncompressedEntryBytes", json!(" 1")),
            ("SourceProcessing.MaxUncompressedEntryBytes", json!(-1)),
            ("SourceProcessing.MaxUncompressedEntryBytes", json!(1.5)),
            ("SourceProcessing.MaxCompressionRatio", json!(null)),
            ("SourceProcessing.MaxCompressionRatio", json!("")),
            ("SourceProcessing.MaxCompressionRatio", json!("1 ")),
            ("SourceProcessing.MaxCompressionRatio", json!(-1)),
            ("SourceProcessing.MaxCompressionRatio", json!(1.5)),
            (
                "SourceProcessing.MaxCompressionRatio",
                json!("not-a-number"),
            ),
        ] {
            let mut props = minimal_request();
            set_request_property(&mut props, property, value);

            assert!(
                serde_json::from_value::<RawDeploymentRequest>(props).is_err(),
                "{property} should reject the malformed wire value"
            );
        }
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
    fn normalize_destination_prefix_collapses_root_and_boundary_slashes() {
        for (raw, expected) in [
            ("", ""),
            ("/", ""),
            ("//", ""),
            ("///", ""),
            ("site", "site"),
            ("site/", "site"),
            ("site//", "site"),
            ("/site", "site"),
            ("/site/", "site"),
            ("nested/site", "nested/site"),
            ("nested/site/", "nested/site"),
        ] {
            assert_eq!(
                normalize_destination_prefix(raw.to_string()),
                expected,
                "normalizing {raw:?}"
            );
        }
    }

    #[test]
    fn normalize_destination_prefix_preserves_interior_repeated_slashes() {
        // S3 keys may legitimately contain repeated separators, so only boundary
        // slashes are namespace punctuation.
        assert_eq!(normalize_destination_prefix("a//b".to_string()), "a//b");
        assert_eq!(normalize_destination_prefix("a//b/".to_string()), "a//b");
    }

    #[test]
    fn normalize_destination_prefix_changes_the_physical_resource_id_for_slashed_prefixes() {
        // Pins the deployed-state breakage documented on the function: a configured
        // "site/" and "site" now normalize to the same value, so a stack written with
        // the trailing slash resolves to the identity a slash-free stack already had.
        assert_eq!(
            normalize_destination_prefix("site/".to_string()),
            normalize_destination_prefix("site".to_string())
        );
    }

    #[cfg(debug_assertions)]
    #[test]
    #[should_panic(expected = "does not start with the strip prefix")]
    fn strip_destination_prefix_trips_on_unmatched_prefix_in_debug_builds() {
        let _ = strip_destination_prefix("site/", "other/index.html");
    }

    #[test]
    fn lambda_memory_environment_controls_the_global_budget() {
        let raw: RawDeploymentRequest = serde_json::from_value(minimal_request()).unwrap();

        let runtime = runtime_options_with_memory(&raw.transfer, "512").expect("runtime options");

        assert_eq!(runtime.available_memory_mb, 512);
        assert_eq!(runtime.source_memory_budget_bytes, 256 * 1024 * 1024);
        assert_eq!(runtime.source_get_concurrency, 2);
    }

    #[test]
    fn runtime_tuning_rejects_zero_extremes_and_budget_overcommit() {
        for (property, value, expected) in [
            (
                "Transfer.MaxConcurrency",
                json!(0),
                "Transfer.MaxConcurrency",
            ),
            (
                "Transfer.MaxConcurrency",
                json!(257),
                "Transfer.MaxConcurrency",
            ),
            (
                "Transfer.AdvancedTuning.SourceGetConcurrency",
                json!(0),
                "Transfer.AdvancedTuning.SourceGetConcurrency",
            ),
            (
                "Transfer.AdvancedTuning.SourceGetConcurrency",
                json!(65),
                "Transfer.AdvancedTuning.SourceGetConcurrency",
            ),
            (
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts",
                json!(0),
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts",
            ),
            (
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts",
                json!(11),
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxAttempts",
            ),
            (
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxDelayMs",
                json!(60_001),
                "Transfer.AdvancedTuning.DestinationWriteRetry.MaxDelayMs",
            ),
            (
                "Transfer.AdvancedTuning.SourceWindowMemoryBudgetMiB",
                json!(513),
                "50% of the actual Lambda memory",
            ),
            (
                "Transfer.AdvancedTuning.SourceWindowBytes",
                json!(4 * 1024 * 1024),
                "Transfer.AdvancedTuning.SourceWindowBytes must be greater",
            ),
            (
                "Transfer.AdvancedTuning.SourceBlockMergeGapBytes",
                json!("9007199254740992"),
                "Transfer.AdvancedTuning.SourceBlockMergeGapBytes",
            ),
        ] {
            let mut props = minimal_request();
            set_request_property(&mut props, property, value);
            let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
            let error = runtime_options_with_memory(&raw.transfer, "1024")
                .expect_err("invalid runtime tuning must fail");
            assert!(
                error.to_string().contains(expected),
                "unexpected error for {property}: {error}"
            );
        }

        let mut props = minimal_request();
        props["Transfer"]["AdvancedTuning"]["SourceBlockBytes"] = json!(128 * 1024 * 1024);
        props["Transfer"]["AdvancedTuning"]["SourceGetConcurrency"] = json!(5);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        assert!(
            runtime_options_with_memory(&raw.transfer, "1024")
                .unwrap_err()
                .to_string()
                .contains("Transfer.AdvancedTuning.SourceBlockBytes * Transfer.AdvancedTuning.SourceGetConcurrency")
        );
    }

    #[test]
    fn runtime_tuning_rejects_malformed_memory_and_inverted_delays() {
        let raw: RawDeploymentRequest = serde_json::from_value(minimal_request()).unwrap();
        assert!(runtime_options_with_memory(&raw.transfer, "not-a-number").is_err());
        assert!(runtime_options_with_memory(&raw.transfer, "0").is_err());

        let mut props = minimal_request();
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["BaseDelayMs"] = json!(20);
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["MaxDelayMs"] = json!(10);
        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        assert!(
            runtime_options_with_memory(&raw.transfer, "1024")
                .unwrap_err()
                .to_string()
                .contains("Transfer.AdvancedTuning.DestinationWriteRetry.BaseDelayMs")
        );
    }

    #[test]
    fn deployment_request_rejects_unknown_top_level_properties() {
        let mut props = minimal_request();
        props["DeleteStaleObjectOnDeployment"] = json!(false);

        let error = serde_json::from_value::<RawDeploymentRequest>(props)
            .expect_err("a misspelled destructive-default property must fail closed");

        assert!(error.to_string().contains("DeleteStaleObjectOnDeployment"));
    }

    #[test]
    fn custom_resource_envelope_properties_do_not_fail_a_deployment() {
        // CloudFormation delivers the envelope inside ResourceProperties, and CDK's
        // `CustomResource` always renders both keys, so every real Create/Update/Delete
        // carries them. Rejecting either one fails the deployment outright, which is not
        // something a synth-only or hand-built-payload test can observe.
        let mut props = minimal_request();
        props["ServiceToken"] = json!("arn:aws:lambda:eu-central-1:123456789012:function:handler");
        props["ServiceTimeout"] = json!("900");

        let raw: RawDeploymentRequest = serde_json::from_value(props)
            .expect("the custom-resource envelope must not fail the strict request decode");

        let baseline: RawDeploymentRequest = serde_json::from_value(minimal_request()).unwrap();
        let parsed = parse_request_with_memory(raw, "1024").expect("envelope request parses");
        let parsed_baseline =
            parse_request_with_memory(baseline, "1024").expect("baseline request parses");

        assert_eq!(format!("{parsed:?}"), format!("{parsed_baseline:?}"));
    }

    #[test]
    fn deployment_nonce_is_accepted_and_changes_no_parsed_input() {
        let mut props = minimal_request();
        props["DeploymentNonce"] = json!("run-7:2:unchanged-update");

        let raw: RawDeploymentRequest = serde_json::from_value(props)
            .expect("a declared redeploy trigger must not fail the strict request decode");

        assert_eq!(
            raw.deployment_nonce.as_deref(),
            Some("run-7:2:unchanged-update")
        );

        // The trigger exists to change the CloudFormation diff, never the deployment. Parsing
        // it must produce exactly the request that omitting it produces.
        let baseline: RawDeploymentRequest = serde_json::from_value(minimal_request()).unwrap();
        let parsed = parse_request_with_memory(raw, "1024").expect("nonce request parses");
        let parsed_baseline =
            parse_request_with_memory(baseline, "1024").expect("baseline request parses");

        assert_eq!(format!("{parsed:?}"), format!("{parsed_baseline:?}"));
    }

    #[cfg(unix)]
    #[test]
    fn lambda_memory_environment_rejects_non_unicode_values() {
        use std::os::unix::ffi::OsStringExt;

        let value = std::ffi::OsString::from_vec(vec![0xff]);
        let error = parse_lambda_memory_env(Some(value.as_os_str()))
            .expect_err("non-Unicode Lambda memory must not fall back to request defaults");

        assert!(error.to_string().contains(LAMBDA_MEMORY_ENV));
        assert!(error.to_string().contains("valid Unicode"));
    }

    #[test]
    fn lambda_memory_environment_is_required() {
        let error = parse_lambda_memory_env(None)
            .expect_err("missing Lambda memory must not use a request or hard-coded fallback");

        assert!(error.to_string().contains(LAMBDA_MEMORY_ENV));
        assert!(error.to_string().contains("must be set"));
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
        let request = parse_test_request(raw).expect("valid catalog descriptors");

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
            assert!(parse_test_request(raw).is_err());
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

        let error = parse_test_request(raw).expect_err("uppercase digest must fail");

        assert!(!error.to_string().contains(&secret_digest));
    }

    #[test]
    fn serde_rejects_non_string_distribution_paths() {
        let mut props = minimal_request();
        props["CloudfrontInvalidation"]["DistributionPaths"] =
            json!(["/index.html", {"bad": true}]);

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
        let request = parse_test_request(raw).expect("valid request");

        assert!(request.source_markers_config[0].json_escape);
    }

    #[test]
    fn serde_rejects_non_boolean_properties() {
        let mut props = minimal_request();
        props["DestinationLifecycle"]["OnDeploy"]["DeleteStaleObjects"] = json!({"bad": true});

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn deserializes_cloudformation_string_booleans() {
        let mut props = minimal_request();
        props["SourceProcessing"]["Extract"] = json!("true");
        props["DestinationLifecycle"]["OnDelete"]["DeleteCurrentObjects"] = json!("true");
        props["CloudfrontInvalidation"]["WaitForCompletion"] = json!("true");
        props["DestinationLifecycle"]["OnDeploy"]["DeleteStaleObjects"] = json!("false");
        props["OutputObjectKeys"] = json!("true");

        let raw: RawDeploymentRequest =
            serde_json::from_value(props).expect("string booleans should deserialize");
        let request = parse_test_request(raw).expect("valid request");

        assert!(request.extract);
        assert!(request.delete_current_objects_on_delete);
        assert!(request.wait_for_distribution_invalidation);
        assert!(!request.delete_stale_objects_on_deployment);
        assert!(request.output_object_keys);
    }

    #[test]
    fn deserializes_runtime_tuning_overrides() {
        let mut props = minimal_request();
        props["Transfer"]["MaxConcurrency"] = json!("12");
        props["Transfer"]["AdvancedTuning"]["SourceBlockBytes"] = json!("4096");
        props["Transfer"]["AdvancedTuning"]["SourceBlockMergeGapBytes"] = json!("128");
        props["Transfer"]["AdvancedTuning"]["SourceGetConcurrency"] = json!("6");
        props["Transfer"]["AdvancedTuning"]["SourceWindowBytes"] = json!("65536");
        props["Transfer"]["AdvancedTuning"]["SourceWindowMemoryBudgetMiB"] = json!("512");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["MaxAttempts"] = json!("3");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["BaseDelayMs"] = json!("10");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["MaxDelayMs"] = json!("20");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["SlowdownBaseDelayMs"] =
            json!("30");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["SlowdownMaxDelayMs"] =
            json!("40");
        props["Transfer"]["AdvancedTuning"]["DestinationWriteRetry"]["Jitter"] = json!("none");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let request = parse_test_request(raw).expect("valid request");

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
        props["DestinationOwnerId"] = json!("owner-456");
        props["DestinationLifecycle"]["OnChange"]["DeletePreviousObjects"] = json!(true);
        props["DestinationLifecycle"]["OnChange"]["PreviousBucketName"] = json!("old-bucket");
        props["DestinationLifecycle"]["OnChange"]["InvalidatePreviousDistribution"] =
            json!("old-distribution");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let request = parse_test_request(raw).expect("valid request");

        assert_eq!(request.destination_owner_id, "owner-456");
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
    fn rejects_unknown_previous_prefix_authorization() {
        let mut props = minimal_request();
        props["DestinationLifecycle"]["OnChange"]["DeletePreviousObjects"] = json!(true);
        // A renamed old-name field inside OnChange must be rejected by the strict
        // single-shape decoder, never partially parsed into a previous-namespace
        // decision.
        props["DestinationLifecycle"]["OnChange"]["PreviousKeyPrefix"] = json!("old-site");

        assert!(serde_json::from_value::<RawDeploymentRequest>(props).is_err());
    }

    #[test]
    fn rejects_source_blocks_below_zip_local_header_length() {
        let mut props = minimal_request();
        props["Transfer"]["AdvancedTuning"]["SourceBlockBytes"] = json!("1");

        let raw: RawDeploymentRequest = serde_json::from_value(props).unwrap();
        let error = parse_test_request(raw).expect_err("undersized source block must fail");

        assert!(
            error
                .to_string()
                .contains("Transfer.AdvancedTuning.SourceBlockBytes")
        );
    }
}
