use std::collections::{BTreeMap, HashMap};

use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use reqwest::Client as HttpClient;
use serde::Deserialize;
use serde_json::{Map, Value};
use tempfile::NamedTempFile;

pub(crate) type Properties = Map<String, Value>;

#[derive(Clone)]
pub(crate) struct AppState {
    pub(crate) s3: S3Client,
    pub(crate) cloudfront: CloudFrontClient,
    pub(crate) http: HttpClient,
}

#[derive(Debug, Deserialize)]
pub(crate) struct CloudFormationEvent {
    #[serde(rename = "RequestType")]
    pub(crate) request_type: String,
    #[serde(rename = "ResponseURL")]
    pub(crate) response_url: String,
    #[serde(rename = "StackId")]
    pub(crate) stack_id: String,
    #[serde(rename = "RequestId")]
    pub(crate) request_id: String,
    #[serde(rename = "LogicalResourceId")]
    pub(crate) logical_resource_id: String,
    #[serde(rename = "PhysicalResourceId", default)]
    pub(crate) physical_resource_id: Option<String>,
    #[serde(rename = "ResourceProperties")]
    pub(crate) resource_properties: Properties,
    #[serde(rename = "OldResourceProperties", default)]
    pub(crate) old_resource_properties: Option<Properties>,
}

#[derive(Clone, Debug, Default)]
pub(crate) struct MarkerConfig {
    pub(crate) json_escape: bool,
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
}

#[derive(Clone)]
pub(crate) struct Filters {
    pub(crate) exclude: Vec<globset::GlobMatcher>,
    pub(crate) include: Vec<globset::GlobMatcher>,
}

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
    pub(crate) action: PlannedAction,
}

pub(crate) enum PlannedAction {
    CopyObject {
        source_index: usize,
    },
    ZipEntry {
        archive_index: usize,
        entry_index: usize,
        source_index: usize,
    },
}

pub(crate) type DeploymentManifest = BTreeMap<String, PlannedObject>;

pub(crate) struct SourceArchive {
    pub(crate) file: NamedTempFile,
}

pub(crate) struct ResponsePayload {
    pub(crate) physical_resource_id: String,
    pub(crate) reason: Option<String>,
    pub(crate) data: Map<String, Value>,
}
