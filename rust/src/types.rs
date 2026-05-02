use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use reqwest::Client as HttpClient;
use serde::{Deserialize, Deserializer, Serialize};
use serde_json::{Map, Value};

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) source_s3: S3Client,
    pub(crate) destination_s3: S3Client,
    pub(crate) cloudfront: CloudFrontClient,
    pub(crate) http: HttpClient,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MarkerConfig {
    #[serde(default, deserialize_with = "deserialize_boolish")]
    pub(crate) json_escape: bool,
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

#[derive(Clone, Debug)]
pub(crate) struct DeploymentRequest {
    pub(crate) source_bucket_names: Vec<String>,
    pub(crate) source_object_keys: Vec<String>,
    pub(crate) source_markers: Vec<HashMap<String, String>>,
    pub(crate) source_markers_config: Vec<MarkerConfig>,
    pub(crate) dest_bucket_name: String,
    pub(crate) dest_bucket_prefix: String,
    pub(crate) extract: bool,
    pub(crate) retain_on_delete: bool,
    pub(crate) distribution_id: Option<String>,
    pub(crate) distribution_paths: Vec<String>,
    pub(crate) wait_for_distribution_invalidation: bool,
    pub(crate) user_metadata: HashMap<String, String>,
    pub(crate) system_metadata: HashMap<String, String>,
    pub(crate) prune: bool,
    pub(crate) exclude: Vec<String>,
    pub(crate) include: Vec<String>,
    pub(crate) output_object_keys: bool,
    pub(crate) destination_bucket_arn: Option<String>,
    pub(crate) runtime: RuntimeOptions,
}

#[derive(Clone, Debug)]
pub(crate) struct RuntimeOptions {
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) source_block_bytes: usize,
    pub(crate) source_block_merge_gap_bytes: usize,
    pub(crate) source_get_concurrency: usize,
    pub(crate) source_window_bytes: Option<usize>,
    pub(crate) source_window_memory_budget_mb: u64,
    pub(crate) put_object_retry: PutObjectRetryOptions,
}

#[derive(Clone, Debug)]
pub(crate) struct PutObjectRetryOptions {
    pub(crate) max_attempts: usize,
    pub(crate) retry_base_delay_ms: u64,
    pub(crate) retry_max_delay_ms: u64,
    pub(crate) slowdown_retry_base_delay_ms: u64,
    pub(crate) slowdown_retry_max_delay_ms: u64,
}

#[derive(Clone)]
pub(crate) struct Filters {
    pub(crate) exclude: Vec<globset::GlobMatcher>,
    pub(crate) include: Vec<globset::GlobMatcher>,
}

#[derive(Clone)]
pub(crate) struct ObjectMetadata {
    pub(crate) user_metadata: HashMap<String, String>,
    pub(crate) cache_control: Option<String>,
    pub(crate) content_disposition: Option<String>,
    pub(crate) content_encoding: Option<String>,
    pub(crate) content_language: Option<String>,
    pub(crate) content_type: Option<String>,
    pub(crate) server_side_encryption: Option<String>,
    pub(crate) storage_class: Option<String>,
    pub(crate) website_redirect_location: Option<String>,
    pub(crate) sse_kms_key_id: Option<String>,
    pub(crate) acl: Option<String>,
}

pub(crate) struct PlannedObject {
    pub(crate) relative_key: String,
    pub(crate) expected_etag: Option<String>,
    pub(crate) action: PlannedAction,
}

pub(crate) enum PlannedAction {
    CopyObject {
        source_index: usize,
    },
    ZipEntry {
        archive_index: usize,
        source_index: usize,
        size: u64,
        compressed_size: u64,
        compression_code: u16,
        crc32: u32,
        catalog_md5: Option<String>,
        source_offset: u64,
        source_span_end: u64,
    },
}

pub(crate) type DeploymentManifest = BTreeMap<String, PlannedObject>;

pub(crate) struct SourceArchive {
    pub(crate) source: Arc<crate::s3::archive::SourceClient>,
}

pub(crate) struct ResponsePayload {
    pub(crate) physical_resource_id: String,
    pub(crate) reason: Option<String>,
    pub(crate) data: Map<String, Value>,
}
