use std::collections::{BTreeMap, HashMap};
use std::pin::Pin;
use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::MetadataDirective;
use md5::{Digest as Md5Digest, Md5};
use tokio::io::{AsyncRead, AsyncReadExt};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;

use crate::replace::replace_markers;
use crate::types::{AppState, DeploymentRequest, MarkerConfig, ObjectMetadata, SourceArchive};

use super::archive::{SourceBlockStore, ZipEntryAsyncReader, zip_entry_body};
use super::destination::DestinationObject;
use super::metadata::{apply_copy_metadata, apply_put_metadata};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{MAX_PARALLEL_TRANSFERS, ZIP_ENTRY_READ_CHUNK_BYTES};

enum UploadPayload {
    Bytes {
        bytes: Vec<u8>,
    },
    ZipEntry {
        store: Arc<SourceBlockStore>,
        plan: ZipEntryPlan,
        content_length: u64,
    },
}

enum PutCondition {
    IfNoneMatch,
    IfMatch(String),
}

struct PreparedUploadPayload {
    payload: UploadPayload,
    etag: String,
}

pub(super) async fn execute_copy_plans(
    state: &AppState,
    destination_bucket: &str,
    metadata: &ObjectMetadata,
    copy_plans: Vec<CopyPlan>,
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(MAX_PARALLEL_TRANSFERS));
    let mut tasks = JoinSet::new();

    for plan in copy_plans {
        let permit = semaphore
            .clone()
            .acquire_owned()
            .await
            .context("failed to acquire copy semaphore")?;
        let state = state.clone();
        let metadata = metadata.clone();
        let destination_bucket = destination_bucket.to_string();

        tasks.spawn(async move {
            let _permit = permit;
            copy_source_object(
                &state,
                &destination_bucket,
                &plan.source_bucket,
                &plan.source_key,
                &plan.destination_key,
                &metadata,
            )
            .await
        });
    }

    join_transfer_tasks(tasks).await
}

pub(super) async fn upload_zip_entries(
    state: &AppState,
    archives: &[SourceArchive],
    request: &DeploymentRequest,
    metadata: &ObjectMetadata,
    zip_plans: BTreeMap<usize, Vec<ZipEntryPlan>>,
    destination_objects: &HashMap<String, DestinationObject>,
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(MAX_PARALLEL_TRANSFERS));
    let mut tasks = JoinSet::new();

    for (archive_index, plans) in zip_plans {
        let source = archives[archive_index].source.clone();
        let store = SourceBlockStore::new(source, &plans);
        for plan in plans {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .context("failed to acquire upload semaphore")?;
            let store = store.clone();
            let state = state.clone();
            let metadata = metadata.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let source_markers = request.source_markers[plan.source_index].clone();
            let source_marker_config = request.source_markers_config[plan.source_index].clone();
            let destination_object = destination_objects.get(&plan.relative_key).cloned();

            tasks.spawn(async move {
                let _permit = permit;
                let Some(payload) = prepare_zip_entry_upload(
                    &store,
                    &plan,
                    &source_markers,
                    &source_marker_config,
                    destination_object.as_ref(),
                )
                .await?
                else {
                    return Ok(());
                };

                upload_payload(
                    &state,
                    &destination_bucket,
                    &plan.destination_key,
                    &metadata,
                    put_condition(destination_object.as_ref())?,
                    payload,
                )
                .await
            });
        }
    }

    join_transfer_tasks(tasks).await
}

async fn prepare_zip_entry_upload(
    store: &Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    source_marker_config: &MarkerConfig,
    destination_object: Option<&DestinationObject>,
) -> Result<Option<UploadPayload>> {
    if source_markers.is_empty() && destination_object.is_none() {
        return Ok(Some(UploadPayload::ZipEntry {
            store: store.clone(),
            plan: plan.clone(),
            content_length: plan.size,
        }));
    }

    let prepared =
        prepare_zip_entry_for_comparison(store.clone(), plan, source_markers, source_marker_config)
            .await?;

    if destination_object_etag_matches(destination_object, &prepared.etag) {
        return Ok(None);
    }

    Ok(Some(prepared.payload))
}

async fn copy_source_object(
    state: &AppState,
    destination_bucket: &str,
    source_bucket: &str,
    source_key: &str,
    destination_key: &str,
    metadata: &ObjectMetadata,
) -> Result<()> {
    let copy_source = format!(
        "{}/{}",
        source_bucket,
        urlencoding::encode(source_key).replace('+', "%20")
    );

    tracing::info!(
        source_bucket,
        source_key,
        destination_key,
        "copying source object"
    );

    let builder = state
        .destination_s3
        .copy_object()
        .bucket(destination_bucket)
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

async fn prepare_zip_entry_for_comparison(
    store: Arc<SourceBlockStore>,
    plan: &ZipEntryPlan,
    source_markers: &HashMap<String, String>,
    source_marker_config: &MarkerConfig,
) -> Result<PreparedUploadPayload> {
    if source_markers.is_empty() {
        let etag = hash_async_reader(Box::pin(ZipEntryAsyncReader::new(
            store.clone(),
            plan.clone(),
        )))
        .await?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::ZipEntry {
                store,
                plan: plan.clone(),
                content_length: plan.size,
            },
            etag,
        })
    } else {
        let bytes =
            read_async_reader_to_vec(Box::pin(ZipEntryAsyncReader::new(store, plan.clone())))
                .await?;
        let replaced = replace_markers(bytes, source_markers, source_marker_config)?;
        let etag = md5_hex(&replaced);
        Ok(PreparedUploadPayload {
            payload: UploadPayload::Bytes { bytes: replaced },
            etag,
        })
    }
}

async fn upload_payload(
    state: &AppState,
    destination_bucket: &str,
    destination_key: &str,
    metadata: &ObjectMetadata,
    condition: PutCondition,
    payload: UploadPayload,
) -> Result<()> {
    let mut builder = state
        .destination_s3
        .put_object()
        .bucket(destination_bucket)
        .key(destination_key);

    builder = match condition {
        PutCondition::IfNoneMatch => builder.if_none_match("*"),
        PutCondition::IfMatch(etag) => builder.if_match(etag),
    };

    let body = match payload {
        UploadPayload::Bytes { bytes } => ByteStream::from(bytes),
        UploadPayload::ZipEntry {
            store,
            plan,
            content_length,
        } => zip_entry_body(store, plan, content_length),
    };

    apply_put_metadata(builder, metadata, destination_key)
        .body(body)
        .send()
        .await
        .with_context(|| format!("failed to upload {destination_key}"))?;

    Ok(())
}

fn destination_object_etag_matches(
    destination_object: Option<&DestinationObject>,
    expected_etag: &str,
) -> bool {
    destination_object.and_then(|object| object.etag.as_deref()) == Some(expected_etag)
}

fn put_condition(destination_object: Option<&DestinationObject>) -> Result<PutCondition> {
    match destination_object {
        None => Ok(PutCondition::IfNoneMatch),
        Some(object) => object
            .etag
            .clone()
            .map(PutCondition::IfMatch)
            .ok_or_else(|| anyhow!("destination object exists but was listed without an ETag")),
    }
}

async fn hash_async_reader(mut reader: Pin<Box<dyn AsyncRead + Send>>) -> Result<String> {
    let mut hasher = Md5::new();
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Ok(finalize_md5(hasher))
}

async fn read_async_reader_to_vec(mut reader: Pin<Box<dyn AsyncRead + Send>>) -> Result<Vec<u8>> {
    let mut bytes = Vec::new();
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer).await?;
        if bytes_read == 0 {
            break;
        }
        bytes.extend_from_slice(&buffer[..bytes_read]);
    }

    Ok(bytes)
}

fn md5_hex(bytes: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(bytes);
    finalize_md5(hasher)
}

fn finalize_md5(hasher: Md5) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let digest = hasher.finalize();
    let bytes: &[u8] = digest.as_ref();
    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

async fn join_transfer_tasks(mut tasks: JoinSet<Result<()>>) -> Result<()> {
    while let Some(result) = tasks.join_next().await {
        result.context("transfer task panicked or was cancelled")??;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::md5_hex;

    #[test]
    fn md5_hex_matches_known_digest() {
        assert_eq!(
            md5_hex(b"hello"),
            "5d41402abc4b2a76b9719d911017c592".to_string()
        );
    }
}
