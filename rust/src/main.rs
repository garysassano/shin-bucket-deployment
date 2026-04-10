use std::collections::{BTreeMap, HashMap, HashSet};
use std::fs::File;
use std::io::{Read, Write};
use std::path::Path;
use std::sync::Arc;
use std::time::Duration;

use anyhow::{Context, Result, anyhow};
use aws_config::BehaviorVersion;
use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_cloudfront::types::{InvalidationBatch, Paths};
use aws_sdk_s3::Client as S3Client;
use aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder;
use aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{
    Delete, MetadataDirective, ObjectCannedAcl, ObjectIdentifier, ServerSideEncryption,
    StorageClass,
};
use globset::{Glob, GlobMatcher};
use lambda_runtime::{Error, LambdaEvent, service_fn};
use reqwest::Client as HttpClient;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;
use tokio::time::sleep;
use tracing::{error, info, warn};
use uuid::Uuid;
use zip::ZipArchive;

type Properties = Map<String, Value>;

#[derive(Clone)]
struct AppState {
    s3: S3Client,
    cloudfront: CloudFrontClient,
    http: HttpClient,
}

#[derive(Debug, Deserialize)]
struct CloudFormationEvent {
    #[serde(rename = "RequestType")]
    request_type: String,
    #[serde(rename = "ResponseURL")]
    response_url: String,
    #[serde(rename = "StackId")]
    stack_id: String,
    #[serde(rename = "RequestId")]
    request_id: String,
    #[serde(rename = "LogicalResourceId")]
    logical_resource_id: String,
    #[serde(rename = "PhysicalResourceId", default)]
    physical_resource_id: Option<String>,
    #[serde(rename = "ResourceProperties")]
    resource_properties: Properties,
    #[serde(rename = "OldResourceProperties", default)]
    old_resource_properties: Option<Properties>,
}

#[derive(Clone, Debug, Default)]
struct MarkerConfig {
    json_escape: bool,
}

#[derive(Clone, Debug)]
struct DeploymentRequest {
    source_bucket_names: Vec<String>,
    source_object_keys: Vec<String>,
    source_markers: Vec<HashMap<String, String>>,
    source_markers_config: Vec<MarkerConfig>,
    dest_bucket_name: String,
    dest_bucket_prefix: String,
    extract: bool,
    retain_on_delete: bool,
    distribution_id: Option<String>,
    distribution_paths: Vec<String>,
    wait_for_distribution_invalidation: bool,
    user_metadata: HashMap<String, String>,
    system_metadata: HashMap<String, String>,
    prune: bool,
    exclude: Vec<String>,
    include: Vec<String>,
    output_object_keys: bool,
    destination_bucket_arn: Option<String>,
}

#[derive(Clone)]
struct Filters {
    exclude: Vec<GlobMatcher>,
    include: Vec<GlobMatcher>,
}

struct ObjectMetadata {
    user_metadata: HashMap<String, String>,
    cache_control: Option<String>,
    content_disposition: Option<String>,
    content_encoding: Option<String>,
    content_language: Option<String>,
    content_type: Option<String>,
    server_side_encryption: Option<String>,
    storage_class: Option<String>,
    website_redirect_location: Option<String>,
    sse_kms_key_id: Option<String>,
    acl: Option<String>,
}

struct PlannedObject {
    relative_key: String,
    action: PlannedAction,
}

enum PlannedAction {
    CopyObject {
        source_index: usize,
    },
    ZipEntry {
        archive_index: usize,
        entry_index: usize,
        source_index: usize,
    },
}

struct SourceArchive {
    file: NamedTempFile,
}

struct ResponsePayload {
    physical_resource_id: String,
    reason: Option<String>,
    data: Map<String, Value>,
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()),
        )
        .without_time()
        .init();

    let config = aws_config::defaults(BehaviorVersion::latest()).load().await;
    let state = Arc::new(AppState {
        s3: S3Client::new(&config),
        cloudfront: CloudFrontClient::new(&config),
        http: HttpClient::new(),
    });

    lambda_runtime::run(service_fn(move |event: LambdaEvent<Value>| {
        let state = state.clone();
        async move { handle_event(state, event).await }
    }))
    .await?;

    Ok(())
}

async fn handle_event(state: Arc<AppState>, event: LambdaEvent<Value>) -> Result<Value, Error> {
    let request: CloudFormationEvent = serde_json::from_value(event.payload)
        .context("failed to deserialize CloudFormation event")?;

    info!(
        request_type = request.request_type,
        logical_resource_id = request.logical_resource_id,
        "processing request"
    );

    let response = process_request(&state, &request).await;

    match response {
        Ok(success) => {
            send_response(&state.http, &request, "SUCCESS", &success)
                .await
                .context("failed to send success response")?;
        }
        Err(err) => {
            error!(error = %err, "request failed");
            let failure = ResponsePayload {
                physical_resource_id: request
                    .physical_resource_id
                    .clone()
                    .unwrap_or_else(|| request.request_id.clone()),
                reason: Some(err.to_string()),
                data: Map::new(),
            };

            if let Err(send_err) = send_response(&state.http, &request, "FAILED", &failure).await {
                error!(error = %send_err, "failed to send failure response");
            }
        }
    }

    Ok(json!({}))
}

async fn process_request(state: &AppState, event: &CloudFormationEvent) -> Result<ResponsePayload> {
    let request = parse_request(&event.resource_properties)?;
    let old_props = event.old_resource_properties.as_ref();

    let physical_resource_id = match event.request_type.as_str() {
        "Create" => format!("aws.cdk.cargobucketdeployment.{}", Uuid::new_v4()),
        "Update" | "Delete" => event
            .physical_resource_id
            .clone()
            .ok_or_else(|| anyhow!("PhysicalResourceId is required for {}", event.request_type))?,
        other => return Err(anyhow!("Unsupported request type: {other}")),
    };

    if event.request_type == "Delete" && !request.retain_on_delete {
        if !bucket_owned(
            state,
            &request.dest_bucket_name,
            &request.dest_bucket_prefix,
        )
        .await?
        {
            delete_prefix(
                state,
                &request.dest_bucket_name,
                &request.dest_bucket_prefix,
            )
            .await?;
        }
    }

    if event.request_type == "Update" && !request.retain_on_delete {
        if let Some(old_props) = old_props {
            let old_bucket = get_optional_string(old_props, "DestinationBucketName");
            let old_prefix = normalize_destination_prefix(
                get_optional_string(old_props, "DestinationBucketKeyPrefix").unwrap_or_default(),
            );

            if old_bucket.as_deref() != Some(request.dest_bucket_name.as_str())
                || old_prefix != request.dest_bucket_prefix
            {
                if let Some(old_bucket_name) = old_bucket {
                    delete_prefix(state, &old_bucket_name, &old_prefix).await?;
                }
            }
        }
    }

    if matches!(event.request_type.as_str(), "Create" | "Update") {
        deploy(state, &request).await?;
    }

    if let Some(distribution_id) = request.distribution_id.as_deref() {
        if !distribution_id.is_empty() {
            cloudfront_invalidate(
                state,
                distribution_id,
                &request.distribution_paths,
                request.wait_for_distribution_invalidation,
            )
            .await?;
        }
    }

    let mut data = Map::new();
    if let Some(destination_bucket_arn) = request.destination_bucket_arn.clone() {
        data.insert(
            "DestinationBucketArn".into(),
            Value::String(destination_bucket_arn),
        );
    }
    data.insert(
        "SourceObjectKeys".into(),
        if request.output_object_keys {
            serde_json::to_value(&request.source_object_keys)?
        } else {
            Value::Array(Vec::new())
        },
    );

    Ok(ResponsePayload {
        physical_resource_id,
        reason: None,
        data,
    })
}

async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    if request.source_bucket_names.len() != request.source_object_keys.len() {
        return Err(anyhow!(
            "SourceBucketNames and SourceObjectKeys must be the same length"
        ));
    }
    if request.source_markers.len() != request.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceMarkers and SourceBucketNames must be the same length"
        ));
    }
    if request.source_markers_config.len() != request.source_bucket_names.len() {
        return Err(anyhow!(
            "SourceMarkersConfig and SourceBucketNames must be the same length"
        ));
    }

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, manifest) = plan_deployment(state, request, &filters).await?;

    for planned in manifest.values() {
        let destination_key = join_s3_key(&request.dest_bucket_prefix, &planned.relative_key);
        match &planned.action {
            PlannedAction::CopyObject { source_index } => {
                copy_source_object(state, request, *source_index, &destination_key, &metadata)
                    .await?;
            }
            PlannedAction::ZipEntry {
                archive_index,
                entry_index,
                source_index,
            } => {
                upload_zip_entry(
                    state,
                    &archives[*archive_index],
                    request,
                    *source_index,
                    *entry_index,
                    &destination_key,
                    &metadata,
                )
                .await?;
            }
        }
    }

    if request.prune {
        let expected: HashSet<String> = manifest.keys().cloned().collect();
        prune_destination(state, request, &filters, &expected).await?;
    }

    Ok(())
}

async fn plan_deployment(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
) -> Result<(Vec<SourceArchive>, BTreeMap<String, PlannedObject>)> {
    let mut archives = Vec::new();
    let mut manifest = BTreeMap::new();

    for source_index in 0..request.source_bucket_names.len() {
        if request.extract {
            let archive = download_source_zip(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;
            let archive_index = archives.len();
            archives.push(SourceArchive { file: archive });

            let file = File::open(archives[archive_index].file.path())
                .context("failed to open downloaded archive")?;
            let mut zip = ZipArchive::new(file).context("failed to read zip archive")?;

            for entry_index in 0..zip.len() {
                let entry = zip.by_index(entry_index)?;
                if entry.is_dir() {
                    continue;
                }

                let relative_key = normalize_archive_key(entry.name())?;
                if !filters.should_include(&relative_key) {
                    continue;
                }

                manifest.insert(
                    relative_key.clone(),
                    PlannedObject {
                        relative_key,
                        action: PlannedAction::ZipEntry {
                            archive_index,
                            entry_index,
                            source_index,
                        },
                    },
                );
            }
        } else {
            let relative_key = source_basename(&request.source_object_keys[source_index])?;
            if !filters.should_include(&relative_key) {
                continue;
            }

            manifest.insert(
                relative_key.clone(),
                PlannedObject {
                    relative_key,
                    action: PlannedAction::CopyObject { source_index },
                },
            );
        }
    }

    Ok((archives, manifest))
}

async fn download_source_zip(state: &AppState, bucket: &str, key: &str) -> Result<NamedTempFile> {
    info!(bucket, key, "downloading source archive");

    let response = state
        .s3
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to download s3://{bucket}/{key}"))?;

    let temp = NamedTempFile::new().context("failed to create temp archive")?;
    let mut output = tokio::fs::File::from_std(temp.reopen()?);
    let mut reader = response.body.into_async_read();
    tokio::io::copy(&mut reader, &mut output).await?;
    output.flush().await?;

    Ok(temp)
}

async fn copy_source_object(
    state: &AppState,
    request: &DeploymentRequest,
    source_index: usize,
    destination_key: &str,
    metadata: &ObjectMetadata,
) -> Result<()> {
    let source_bucket = &request.source_bucket_names[source_index];
    let source_key = &request.source_object_keys[source_index];
    let copy_source = format!(
        "{}/{}",
        source_bucket,
        urlencoding::encode(source_key).replace('+', "%20")
    );

    info!(
        source_bucket,
        source_key, destination_key, "copying source object"
    );

    let builder = state
        .s3
        .copy_object()
        .bucket(&request.dest_bucket_name)
        .key(destination_key)
        .copy_source(copy_source)
        .metadata_directive(MetadataDirective::Replace);

    apply_copy_metadata(builder, metadata, destination_key)
        .send()
        .await
        .with_context(|| {
            format!("failed to copy {source_bucket}/{source_key} to {destination_key}")
        })?;

    Ok(())
}

async fn upload_zip_entry(
    state: &AppState,
    archive: &SourceArchive,
    request: &DeploymentRequest,
    source_index: usize,
    entry_index: usize,
    destination_key: &str,
    metadata: &ObjectMetadata,
) -> Result<()> {
    let file = File::open(archive.file.path()).context("failed to reopen source archive")?;
    let mut zip = ZipArchive::new(file).context("failed to reopen zip archive")?;
    let mut entry = zip.by_index(entry_index)?;

    let builder = state
        .s3
        .put_object()
        .bucket(&request.dest_bucket_name)
        .key(destination_key);

    if request.source_markers[source_index].is_empty() {
        let mut temp = NamedTempFile::new().context("failed to create temp entry file")?;
        std::io::copy(&mut entry, &mut temp)?;
        temp.flush()?;

        let body = ByteStream::from_path(temp.path().to_path_buf()).await?;
        apply_put_metadata(builder, metadata, destination_key)
            .body(body)
            .send()
            .await
            .with_context(|| format!("failed to upload {destination_key}"))?;
    } else {
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes)?;
        let replaced = replace_markers(
            bytes,
            &request.source_markers[source_index],
            &request.source_markers_config[source_index],
        )?;

        apply_put_metadata(builder, metadata, destination_key)
            .body(ByteStream::from(replaced))
            .send()
            .await
            .with_context(|| format!("failed to upload substituted {destination_key}"))?;
    }

    Ok(())
}

async fn prune_destination(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
    expected_relative_keys: &HashSet<String>,
) -> Result<()> {
    let mut continuation_token = None;
    let mut keys_to_delete = Vec::new();

    loop {
        let response = state
            .s3
            .list_objects_v2()
            .bucket(&request.dest_bucket_name)
            .set_prefix(if request.dest_bucket_prefix.is_empty() {
                None
            } else {
                Some(request.dest_bucket_prefix.clone())
            })
            .set_continuation_token(continuation_token.clone())
            .send()
            .await?;

        for object in response.contents() {
            let Some(key) = object.key() else { continue };
            let relative_key = strip_destination_prefix(&request.dest_bucket_prefix, key);
            if relative_key.is_empty() {
                continue;
            }
            if !filters.should_include(&relative_key) {
                continue;
            }
            if !expected_relative_keys.contains(&relative_key) {
                keys_to_delete.push(key.to_string());
            }
        }

        if !response.is_truncated().unwrap_or(false) {
            break;
        }
        continuation_token = response
            .next_continuation_token()
            .map(|value| value.to_string());
    }

    delete_keys(state, &request.dest_bucket_name, &keys_to_delete).await
}

async fn delete_prefix(state: &AppState, bucket: &str, prefix: &str) -> Result<()> {
    let mut continuation_token = None;
    let mut keys_to_delete = Vec::new();

    loop {
        let response = state
            .s3
            .list_objects_v2()
            .bucket(bucket)
            .set_prefix(if prefix.is_empty() {
                None
            } else {
                Some(prefix.to_string())
            })
            .set_continuation_token(continuation_token.clone())
            .send()
            .await?;

        for object in response.contents() {
            if let Some(key) = object.key() {
                keys_to_delete.push(key.to_string());
            }
        }

        if !response.is_truncated().unwrap_or(false) {
            break;
        }
        continuation_token = response
            .next_continuation_token()
            .map(|value| value.to_string());
    }

    delete_keys(state, bucket, &keys_to_delete).await
}

async fn delete_keys(state: &AppState, bucket: &str, keys: &[String]) -> Result<()> {
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

        state
            .s3
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await
            .with_context(|| format!("failed to delete objects from bucket {bucket}"))?;
    }

    Ok(())
}

async fn bucket_owned(state: &AppState, bucket: &str, prefix: &str) -> Result<bool> {
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
        Err(err) => {
            warn!(error = %err, bucket, "failed to read bucket tags, assuming bucket is not owned");
            Ok(false)
        }
    }
}

async fn cloudfront_invalidate(
    state: &AppState,
    distribution_id: &str,
    distribution_paths: &[String],
    wait_for_completion: bool,
) -> Result<()> {
    let batch = InvalidationBatch::builder()
        .caller_reference(Uuid::new_v4().to_string())
        .paths(
            Paths::builder()
                .quantity(distribution_paths.len() as i32)
                .set_items(Some(distribution_paths.to_vec()))
                .build()?,
        )
        .build()?;

    let response = state
        .cloudfront
        .create_invalidation()
        .distribution_id(distribution_id)
        .invalidation_batch(batch)
        .send()
        .await?;

    if !wait_for_completion {
        return Ok(());
    }

    let invalidation_id = response
        .invalidation()
        .map(|invalidation| invalidation.id().to_string())
        .ok_or_else(|| anyhow!("CreateInvalidation response did not include an invalidation id"))?;

    for _ in 0..39 {
        let status = state
            .cloudfront
            .get_invalidation()
            .distribution_id(distribution_id)
            .id(&invalidation_id)
            .send()
            .await?;

        let completed = status
            .invalidation()
            .map(|invalidation| invalidation.status().eq_ignore_ascii_case("Completed"))
            .unwrap_or(false);

        if completed {
            return Ok(());
        }

        sleep(Duration::from_secs(20)).await;
    }

    Err(anyhow!(
        "Unable to confirm that cache invalidation was successful after 13 minutes"
    ))
}

impl Filters {
    fn should_include(&self, key: &str) -> bool {
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

impl ObjectMetadata {
    fn from_request(request: &DeploymentRequest) -> Self {
        Self {
            user_metadata: request.user_metadata.clone(),
            cache_control: request.system_metadata.get("cache-control").cloned(),
            content_disposition: request.system_metadata.get("content-disposition").cloned(),
            content_encoding: request.system_metadata.get("content-encoding").cloned(),
            content_language: request.system_metadata.get("content-language").cloned(),
            content_type: request.system_metadata.get("content-type").cloned(),
            server_side_encryption: request.system_metadata.get("sse").cloned(),
            storage_class: request.system_metadata.get("storage-class").cloned(),
            website_redirect_location: request.system_metadata.get("website-redirect").cloned(),
            sse_kms_key_id: request.system_metadata.get("sse-kms-key-id").cloned(),
            acl: request.system_metadata.get("acl").cloned(),
        }
    }

    fn resolved_content_type(&self, key: &str) -> Option<String> {
        self.content_type.clone().or_else(|| {
            mime_guess::from_path(key)
                .first_raw()
                .map(|mime| mime.to_string())
        })
    }
}

fn apply_put_metadata(
    mut builder: PutObjectFluentBuilder,
    metadata: &ObjectMetadata,
    key: &str,
) -> PutObjectFluentBuilder {
    if !metadata.user_metadata.is_empty() {
        builder = builder.set_metadata(Some(metadata.user_metadata.clone()));
    }
    if let Some(cache_control) = metadata.cache_control.as_deref() {
        builder = builder.cache_control(cache_control);
    }
    if let Some(content_disposition) = metadata.content_disposition.as_deref() {
        builder = builder.content_disposition(content_disposition);
    }
    if let Some(content_encoding) = metadata.content_encoding.as_deref() {
        builder = builder.content_encoding(content_encoding);
    }
    if let Some(content_language) = metadata.content_language.as_deref() {
        builder = builder.content_language(content_language);
    }
    if let Some(content_type) = metadata.resolved_content_type(key) {
        builder = builder.content_type(content_type);
    }
    if let Some(server_side_encryption) = metadata.server_side_encryption.as_deref() {
        builder =
            builder.server_side_encryption(ServerSideEncryption::from(server_side_encryption));
    }
    if let Some(storage_class) = metadata.storage_class.as_deref() {
        builder = builder.storage_class(StorageClass::from(storage_class));
    }
    if let Some(website_redirect_location) = metadata.website_redirect_location.as_deref() {
        builder = builder.website_redirect_location(website_redirect_location);
    }
    if let Some(sse_kms_key_id) = metadata.sse_kms_key_id.as_deref() {
        builder = builder.ssekms_key_id(sse_kms_key_id);
    }
    if let Some(acl) = metadata.acl.as_deref() {
        builder = builder.acl(ObjectCannedAcl::from(acl));
    }

    builder
}

fn apply_copy_metadata(
    mut builder: CopyObjectFluentBuilder,
    metadata: &ObjectMetadata,
    key: &str,
) -> CopyObjectFluentBuilder {
    if !metadata.user_metadata.is_empty() {
        builder = builder.set_metadata(Some(metadata.user_metadata.clone()));
    }
    if let Some(cache_control) = metadata.cache_control.as_deref() {
        builder = builder.cache_control(cache_control);
    }
    if let Some(content_disposition) = metadata.content_disposition.as_deref() {
        builder = builder.content_disposition(content_disposition);
    }
    if let Some(content_encoding) = metadata.content_encoding.as_deref() {
        builder = builder.content_encoding(content_encoding);
    }
    if let Some(content_language) = metadata.content_language.as_deref() {
        builder = builder.content_language(content_language);
    }
    if let Some(content_type) = metadata.resolved_content_type(key) {
        builder = builder.content_type(content_type);
    }
    if let Some(server_side_encryption) = metadata.server_side_encryption.as_deref() {
        builder =
            builder.server_side_encryption(ServerSideEncryption::from(server_side_encryption));
    }
    if let Some(storage_class) = metadata.storage_class.as_deref() {
        builder = builder.storage_class(StorageClass::from(storage_class));
    }
    if let Some(website_redirect_location) = metadata.website_redirect_location.as_deref() {
        builder = builder.website_redirect_location(website_redirect_location);
    }
    if let Some(sse_kms_key_id) = metadata.sse_kms_key_id.as_deref() {
        builder = builder.ssekms_key_id(sse_kms_key_id);
    }
    if let Some(acl) = metadata.acl.as_deref() {
        builder = builder.acl(ObjectCannedAcl::from(acl));
    }

    builder
}

fn replace_markers(
    bytes: Vec<u8>,
    markers: &HashMap<String, String>,
    config: &MarkerConfig,
) -> Result<Vec<u8>> {
    if markers.is_empty() {
        return Ok(bytes);
    }

    let replacements = replacement_pairs(markers, config)?;
    let mut output = bytes;

    for (needle, replacement) in replacements {
        output = replace_all(output, &needle, &replacement);
    }

    Ok(output)
}

fn replacement_pairs(
    markers: &HashMap<String, String>,
    config: &MarkerConfig,
) -> Result<Vec<(Vec<u8>, Vec<u8>)>> {
    let mut pairs = Vec::with_capacity(markers.len());

    for (key, value) in markers {
        let replacement = if config.json_escape {
            json_escape_marker_value(value)?
        } else {
            value.clone()
        };

        pairs.push((key.as_bytes().to_vec(), replacement.into_bytes()));
    }

    Ok(pairs)
}

fn json_escape_marker_value(value: &str) -> Result<String> {
    if let Some(inner) = value.strip_prefix('"').and_then(|v| v.strip_suffix('"')) {
        // `Source.jsonData(..., { escape: true })` sends string tokens as quoted JSON fragments.
        // Re-escape only the inner string contents, then restore the surrounding JSON quotes.
        return serde_json::to_string(inner).map_err(Into::into);
    }

    if serde_json::from_str::<Value>(value).is_ok() {
        // Non-string JSON fragments from `Source.jsonData(...)` should be preserved as-is.
        return Ok(value.to_string());
    }

    // `Source.data(..., { jsonEscape: true })` expects the replacement bytes to be safe inside an
    // already-quoted JSON string, so escape the contents without adding new surrounding quotes.
    let escaped = serde_json::to_string(value)?;
    Ok(escaped[1..escaped.len() - 1].to_string())
}

fn replace_all(input: Vec<u8>, needle: &[u8], replacement: &[u8]) -> Vec<u8> {
    if needle.is_empty() {
        return input;
    }

    let mut result = Vec::with_capacity(input.len());
    let mut cursor = 0usize;

    while let Some(index) = find_subslice(&input[cursor..], needle) {
        let absolute = cursor + index;
        result.extend_from_slice(&input[cursor..absolute]);
        result.extend_from_slice(replacement);
        cursor = absolute + needle.len();
    }

    result.extend_from_slice(&input[cursor..]);
    result
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

fn parse_request(props: &Properties) -> Result<DeploymentRequest> {
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

    let default_distribution_path = {
        let mut prefix = dest_bucket_prefix.clone();
        if !prefix.ends_with('/') {
            prefix.push('/');
        }
        if !prefix.starts_with('/') {
            prefix.insert(0, '/');
        }
        prefix.push('*');
        prefix
    };

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

fn compile_filters(exclude: &[String], include: &[String]) -> Result<Filters> {
    Ok(Filters {
        exclude: compile_globs(exclude)?,
        include: compile_globs(include)?,
    })
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

fn normalize_destination_prefix(prefix: String) -> String {
    if prefix == "/" { String::new() } else { prefix }
}

fn normalize_archive_key(raw: &str) -> Result<String> {
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

fn source_basename(key: &str) -> Result<String> {
    let basename = Path::new(key)
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| anyhow!("unable to determine basename for source object key {key}"))?;
    Ok(basename.to_string())
}

fn join_s3_key(prefix: &str, relative_key: &str) -> String {
    if prefix.is_empty() {
        return relative_key.to_string();
    }
    if prefix.ends_with('/') {
        format!("{prefix}{relative_key}")
    } else {
        format!("{prefix}/{relative_key}")
    }
}

fn strip_destination_prefix(prefix: &str, key: &str) -> String {
    if prefix.is_empty() {
        return key.to_string();
    }

    let stripped = key.strip_prefix(prefix).unwrap_or(key);
    stripped.trim_start_matches('/').to_string()
}

async fn send_response(
    http: &HttpClient,
    event: &CloudFormationEvent,
    status: &str,
    payload: &ResponsePayload,
) -> Result<()> {
    let body = serde_json::to_string(&json!({
        "Status": status,
        "Reason": payload.reason.clone().unwrap_or_else(|| format!("See the details in CloudWatch Logs for RequestId {}", event.request_id)),
        "PhysicalResourceId": payload.physical_resource_id,
        "StackId": event.stack_id,
        "RequestId": event.request_id,
        "LogicalResourceId": event.logical_resource_id,
        "NoEcho": false,
        "Data": payload.data,
    }))?;

    http.put(&event.response_url)
        .header("content-type", "")
        .header("content-length", body.len())
        .body(body)
        .send()
        .await?
        .error_for_status()?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_markers_replace_multiple_tokens_and_repeated_occurrences() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            "eu-central-1".to_string(),
        );
        markers.insert(
            "<<marker:0xbaba:1>>".to_string(),
            "CargoBucketDeploymentTokenDemo".to_string(),
        );

        let rendered = replace_markers(
            b"region=<<marker:0xbaba:0>>\nstack=<<marker:0xbaba:1>>\nregion-again=<<marker:0xbaba:0>>"
                .to_vec(),
            &markers,
            &MarkerConfig::default(),
        )
        .expect("plain replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            "region=eu-central-1\nstack=CargoBucketDeploymentTokenDemo\nregion-again=eu-central-1",
        );
    }

    #[test]
    fn plain_markers_insert_verbatim_json_fragments() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#""CargoBucketDeploymentTokenDemo""#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"stackName":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig::default(),
        )
        .expect("plain replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"stackName":"CargoBucketDeploymentTokenDemo"}"#,
        );
    }

    #[test]
    fn json_escape_quoted_fragments_escape_inner_special_characters() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#""value with "quotes" and \backslash""#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"specialValue":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"specialValue":"value with \"quotes\" and \\backslash"}"#,
        );
    }

    #[test]
    fn json_escape_raw_values_are_safe_inside_quoted_json_strings() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#"value with "quotes" and \backslash"#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"specialValue":"<<marker:0xbaba:0>>"}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"specialValue":"value with \"quotes\" and \\backslash"}"#,
        );
    }

    #[test]
    fn json_escape_markers_are_not_double_escaped() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            "\"CargoBucketDeploymentTokenDemo\"".to_string(),
        );

        let rendered = replace_markers(
            br#"{"stackName":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"stackName":"CargoBucketDeploymentTokenDemo"}"#,
        );
    }
}
