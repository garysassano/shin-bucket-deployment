use std::collections::BTreeMap;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{ObjectCannedAcl, ServerSideEncryption, StorageClass};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use tracing::{info, warn};

use crate::request::join_s3_key;
use crate::types::{
    AppState, DeploymentIdentity, DeploymentManifest, DeploymentRequest, ObjectMetadata,
};

const MANIFEST_VERSION: u32 = 1;
const MANIFEST_DIR: &str = ".rust-bucket-deployment";
const MANIFEST_CHECKSUM_METADATA_KEY: &str = "manifest-sha256";

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct StoredDeploymentManifest {
    version: u32,
    resource: ManifestResource,
    objects: BTreeMap<String, StoredManifestObject>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct ManifestResource {
    stack_id: String,
    logical_resource_id: String,
    physical_resource_id: String,
    destination_bucket: String,
    destination_prefix: String,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
struct StoredManifestObject {
    destination_key: String,
    signature: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ZipEntrySignature<'a> {
    pub(crate) source_bucket: &'a str,
    pub(crate) source_key: &'a str,
    pub(crate) entry_name: &'a str,
    pub(crate) size: u64,
    pub(crate) crc32: u32,
    pub(crate) markers_hash: String,
    pub(crate) metadata_hash: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CopyObjectSignature<'a> {
    pub(crate) source_bucket: &'a str,
    pub(crate) source_key: &'a str,
    pub(crate) metadata_hash: String,
}

pub(crate) fn manifest_relative_key(identity: &DeploymentIdentity) -> String {
    format!(
        "{}/{}/manifest.json",
        MANIFEST_DIR,
        sanitize_manifest_path_component(&identity.physical_resource_id)
    )
}

pub(crate) fn is_internal_relative_key(relative_key: &str) -> bool {
    relative_key == MANIFEST_DIR
        || relative_key
            .strip_prefix(MANIFEST_DIR)
            .is_some_and(|suffix| suffix.starts_with('/'))
}

pub(crate) fn planned_object_changed(
    previous: Option<&StoredDeploymentManifest>,
    relative_key: &str,
    signature: &str,
) -> bool {
    previous
        .and_then(|manifest| manifest.objects.get(relative_key))
        .is_none_or(|previous| previous.signature != signature)
}

pub(crate) fn removed_destination_keys(
    previous: &StoredDeploymentManifest,
    current: &StoredDeploymentManifest,
) -> Vec<String> {
    previous
        .objects
        .iter()
        .filter(|(relative_key, _)| !current.objects.contains_key(*relative_key))
        .map(|(_, object)| object.destination_key.clone())
        .collect()
}

pub(crate) fn build_stored_manifest(
    request: &DeploymentRequest,
    identity: &DeploymentIdentity,
    manifest: &DeploymentManifest,
) -> StoredDeploymentManifest {
    let objects = manifest
        .iter()
        .map(|(relative_key, planned)| {
            (
                relative_key.clone(),
                StoredManifestObject {
                    destination_key: join_s3_key(&request.dest_bucket_prefix, relative_key),
                    signature: planned.signature.clone(),
                },
            )
        })
        .collect();

    StoredDeploymentManifest {
        version: MANIFEST_VERSION,
        resource: ManifestResource {
            stack_id: identity.stack_id.clone(),
            logical_resource_id: identity.logical_resource_id.clone(),
            physical_resource_id: identity.physical_resource_id.clone(),
            destination_bucket: request.dest_bucket_name.clone(),
            destination_prefix: request.dest_bucket_prefix.clone(),
        },
        objects,
    }
}

pub(crate) async fn load_previous_manifest(
    state: &AppState,
    request: &DeploymentRequest,
    identity: &DeploymentIdentity,
) -> Result<Option<StoredDeploymentManifest>> {
    let key = manifest_object_key(request, identity);
    let response = match state
        .s3
        .get_object()
        .bucket(&request.dest_bucket_name)
        .key(&key)
        .send()
        .await
    {
        Ok(response) => response,
        Err(err)
            if err
                .as_service_error()
                .and_then(|service_err| service_err.code())
                .is_some_and(|code| matches!(code, "NoSuchKey" | "NotFound")) =>
        {
            info!(
                key,
                "deployment manifest not found; using full transfer fallback"
            );
            return Ok(None);
        }
        Err(err) => {
            return Err(err).with_context(|| format!("failed to read deployment manifest {key}"));
        }
    };

    let expected_checksum = response
        .metadata()
        .and_then(|metadata| metadata.get(MANIFEST_CHECKSUM_METADATA_KEY))
        .cloned();
    let bytes = response
        .body
        .collect()
        .await
        .with_context(|| format!("failed to read deployment manifest body {key}"))?
        .into_bytes();

    let actual_checksum = sha256_hex(&bytes);
    if expected_checksum.as_deref() != Some(actual_checksum.as_str()) {
        warn!(
            key,
            expected_checksum,
            actual_checksum,
            "deployment manifest checksum mismatch; ignoring manifest"
        );
        return Ok(None);
    }

    let manifest = match serde_json::from_slice::<StoredDeploymentManifest>(&bytes) {
        Ok(manifest) => manifest,
        Err(err) => {
            warn!(key, error = %err, "deployment manifest is invalid JSON; ignoring manifest");
            return Ok(None);
        }
    };

    if let Err(err) = validate_manifest(&manifest, request, identity) {
        warn!(key, error = %err, "deployment manifest failed validation; ignoring manifest");
        return Ok(None);
    }

    Ok(Some(manifest))
}

pub(crate) async fn write_manifest(
    state: &AppState,
    request: &DeploymentRequest,
    identity: &DeploymentIdentity,
    metadata: &ObjectMetadata,
    manifest: &StoredDeploymentManifest,
) -> Result<()> {
    let key = manifest_object_key(request, identity);
    let body = serde_json::to_vec(manifest).context("failed to serialize deployment manifest")?;
    let checksum = sha256_hex(&body);

    info!(key, "writing deployment manifest");

    let mut builder = state
        .s3
        .put_object()
        .bucket(&request.dest_bucket_name)
        .key(&key)
        .content_type("application/json")
        .metadata(MANIFEST_CHECKSUM_METADATA_KEY, checksum)
        .body(ByteStream::from(body));

    if let Some(server_side_encryption) = metadata.server_side_encryption.as_deref() {
        builder =
            builder.server_side_encryption(ServerSideEncryption::from(server_side_encryption));
    }
    if let Some(storage_class) = metadata.storage_class.as_deref() {
        builder = builder.storage_class(StorageClass::from(storage_class));
    }
    if let Some(sse_kms_key_id) = metadata.sse_kms_key_id.as_deref() {
        builder = builder.ssekms_key_id(sse_kms_key_id);
    }
    if let Some(acl) = metadata.acl.as_deref() {
        builder = builder.acl(ObjectCannedAcl::from(acl));
    }

    builder
        .send()
        .await
        .with_context(|| format!("failed to write deployment manifest {key}"))?;

    Ok(())
}

pub(crate) fn metadata_signature(metadata: &ObjectMetadata, key: &str) -> Result<String> {
    #[derive(Serialize)]
    #[serde(rename_all = "camelCase")]
    struct MetadataSignature {
        user_metadata: BTreeMap<String, String>,
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

    hash_json(&MetadataSignature {
        user_metadata: metadata
            .user_metadata
            .iter()
            .map(|(key, value)| (key.clone(), value.clone()))
            .collect(),
        cache_control: metadata.cache_control.clone(),
        content_disposition: metadata.content_disposition.clone(),
        content_encoding: metadata.content_encoding.clone(),
        content_language: metadata.content_language.clone(),
        content_type: metadata.resolved_content_type(key),
        server_side_encryption: metadata.server_side_encryption.clone(),
        storage_class: metadata.storage_class.clone(),
        website_redirect_location: metadata.website_redirect_location.clone(),
        sse_kms_key_id: metadata.sse_kms_key_id.clone(),
        acl: metadata.acl.clone(),
    })
}

pub(crate) fn hash_json<T: Serialize>(value: &T) -> Result<String> {
    let bytes = serde_json::to_vec(value).context("failed to serialize signature input")?;
    Ok(sha256_hex(&bytes))
}

fn manifest_object_key(request: &DeploymentRequest, identity: &DeploymentIdentity) -> String {
    join_s3_key(
        &request.dest_bucket_prefix,
        &manifest_relative_key(identity),
    )
}

fn validate_manifest(
    manifest: &StoredDeploymentManifest,
    request: &DeploymentRequest,
    identity: &DeploymentIdentity,
) -> Result<()> {
    if manifest.version != MANIFEST_VERSION {
        return Err(anyhow!(
            "unsupported manifest version {}; expected {}",
            manifest.version,
            MANIFEST_VERSION
        ));
    }
    if manifest.resource.stack_id != identity.stack_id
        || manifest.resource.logical_resource_id != identity.logical_resource_id
        || manifest.resource.physical_resource_id != identity.physical_resource_id
        || manifest.resource.destination_bucket != request.dest_bucket_name
        || manifest.resource.destination_prefix != request.dest_bucket_prefix
    {
        return Err(anyhow!("manifest identity does not match this deployment"));
    }

    for (relative_key, object) in &manifest.objects {
        if relative_key.is_empty() {
            return Err(anyhow!("manifest contains an empty relative key"));
        }
        if is_internal_relative_key(relative_key) {
            return Err(anyhow!(
                "manifest object key {relative_key} overlaps internal manifest namespace"
            ));
        }
        let expected_destination_key = join_s3_key(&request.dest_bucket_prefix, relative_key);
        if object.destination_key != expected_destination_key {
            return Err(anyhow!(
                "manifest destination key {} does not match expected key {}",
                object.destination_key,
                expected_destination_key
            ));
        }
    }

    Ok(())
}

fn sanitize_manifest_path_component(value: &str) -> String {
    value
        .chars()
        .map(|ch| {
            if ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-') {
                ch
            } else {
                '_'
            }
        })
        .collect()
}

fn sha256_hex(bytes: &[u8]) -> String {
    hex::encode(Sha256::digest(bytes))
}
