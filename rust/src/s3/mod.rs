use std::collections::{BTreeMap, HashMap};
use std::error::Error as StdError;
use std::io::{Cursor, Read};
use std::sync::Arc;
use std::sync::Mutex;
use std::task::{Context as TaskContext, Poll};

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::{ByteStream, SdkBody};
use aws_sdk_s3::types::{Delete, MetadataDirective, ObjectIdentifier};
use bytes::Bytes;
use http_body::{Body, Frame, SizeHint};
use md5::{Digest, Md5};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tracing::{info, warn};
use zip::ZipArchive;

use crate::replace::replace_markers;
use crate::request::{
    compile_filters, join_s3_key, normalize_archive_key, source_basename, strip_destination_prefix,
};
use crate::types::{
    AppState, DeploymentManifest, DeploymentRequest, Filters, ObjectMetadata, PlannedAction,
    PlannedObject, SourceArchive,
};

mod metadata;

use self::metadata::{apply_copy_metadata, apply_put_metadata};

const MAX_PARALLEL_TRANSFERS: usize = 8;
const ZIP_ENTRY_READ_CHUNK_BYTES: usize = 8 * 1024 * 1024;

type BodyError = Box<dyn StdError + Send + Sync>;

#[derive(Clone)]
struct CopyPlan {
    source_bucket: String,
    source_key: String,
    destination_key: String,
}

struct ZipEntryPlan {
    entry_index: usize,
    source_index: usize,
    relative_key: String,
    destination_key: String,
}

struct DestinationPlan {
    objects: HashMap<String, DestinationObject>,
    keys_to_delete: Vec<String>,
}

struct DestinationObject {
    etag: Option<String>,
}

enum UploadPayload {
    Bytes(Vec<u8>),
    ZipEntry {
        archive: Arc<Vec<u8>>,
        entry_index: usize,
        content_length: u64,
    },
}

struct PreparedUploadPayload {
    payload: UploadPayload,
    etag: String,
}

pub(crate) async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    validate_request_lengths(request)?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, deployment_manifest) = plan_deployment(state, request, &filters).await?;
    let destination_plan = plan_destination(state, request, &filters, &deployment_manifest).await?;

    if request.extract {
        let zip_plans = collect_zip_entry_plans(&deployment_manifest, &request.dest_bucket_prefix);
        upload_zip_entries(
            state,
            &archives,
            request,
            &metadata,
            zip_plans,
            &destination_plan.objects,
        )
        .await?;
    } else {
        let copy_plans =
            collect_copy_plans(&deployment_manifest, request, &destination_plan.objects);
        execute_copy_plans(state, &request.dest_bucket_name, &metadata, copy_plans).await?;
    }

    if request.prune {
        delete_keys(
            state,
            &request.dest_bucket_name,
            &destination_plan.keys_to_delete,
        )
        .await?;
    }

    Ok(())
}

pub(crate) async fn delete_prefix(state: &AppState, bucket: &str, prefix: &str) -> Result<()> {
    let list_prefix = namespace_list_prefix(prefix);
    let mut start_after = None;

    loop {
        let response = state
            .s3
            .list_objects_v2()
            .bucket(bucket)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;

        let mut keys_to_delete = Vec::new();
        for object in response.contents() {
            if let Some(key) = object.key() {
                keys_to_delete.push(key.to_string());
            }
        }

        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        delete_keys(state, bucket, &keys_to_delete).await?;

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    Ok(())
}

pub(crate) async fn bucket_owned(state: &AppState, bucket: &str, prefix: &str) -> Result<bool> {
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
        Err(err)
            if err
                .as_service_error()
                .and_then(|service_err| service_err.code())
                == Some("NoSuchTagSet") =>
        {
            Ok(false)
        }
        Err(err) => {
            warn!(error = %err, bucket, "failed to read bucket tags");
            Err(err).with_context(|| {
                format!(
                    "unable to determine whether bucket {bucket} is owned by this custom resource"
                )
            })
        }
    }
}

fn validate_request_lengths(request: &DeploymentRequest) -> Result<()> {
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

    Ok(())
}

async fn plan_deployment(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
) -> Result<(Vec<SourceArchive>, DeploymentManifest)> {
    let mut archives = Vec::new();
    let mut manifest = DeploymentManifest::new();

    for source_index in 0..request.source_bucket_names.len() {
        if request.extract {
            let archive_bytes = download_source_zip(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;
            let archive_index = archives.len();
            archives.push(SourceArchive {
                bytes: Arc::new(archive_bytes),
            });

            let cursor = Cursor::new(archives[archive_index].bytes.as_slice());
            let mut zip = ZipArchive::new(cursor).context("failed to read zip archive")?;

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
                        expected_etag: None,
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
            let expected_etag = source_object_etag(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;

            manifest.insert(
                relative_key.clone(),
                PlannedObject {
                    relative_key,
                    expected_etag,
                    action: PlannedAction::CopyObject { source_index },
                },
            );
        }
    }

    Ok((archives, manifest))
}

async fn download_source_zip(state: &AppState, bucket: &str, key: &str) -> Result<Vec<u8>> {
    info!(bucket, key, "downloading source archive");

    let response = state
        .s3
        .get_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to download s3://{bucket}/{key}"))?;

    let bytes = response
        .body
        .collect()
        .await
        .context("failed to read source archive body")?
        .into_bytes()
        .to_vec();

    Ok(bytes)
}

async fn source_object_etag(state: &AppState, bucket: &str, key: &str) -> Result<Option<String>> {
    let response = state
        .s3
        .head_object()
        .bucket(bucket)
        .key(key)
        .send()
        .await
        .with_context(|| format!("failed to read source object metadata s3://{bucket}/{key}"))?;

    Ok(response.e_tag().and_then(normalize_etag))
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

    info!(
        source_bucket,
        source_key, destination_key, "copying source object"
    );

    let builder = state
        .s3
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

async fn execute_copy_plans(
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

async fn upload_zip_entries(
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
        let cursor = Cursor::new(archives[archive_index].bytes.as_slice());
        let mut zip = ZipArchive::new(cursor).context("failed to reopen zip archive")?;

        for plan in plans {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .context("failed to acquire upload semaphore")?;
            let mut entry = zip.by_index(plan.entry_index)?;
            let prepared = prepare_zip_entry_for_comparison(
                archives[archive_index].bytes.clone(),
                &mut entry,
                request,
                plan.source_index,
                plan.entry_index,
            )?;
            if destination_etag_matches(destination_objects, &plan.relative_key, &prepared.etag) {
                continue;
            }
            drop(entry);

            let state = state.clone();
            let metadata = metadata.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let destination_key = plan.destination_key;
            let payload = prepared.payload;

            tasks.spawn(async move {
                let _permit = permit;
                upload_payload(
                    &state,
                    &destination_bucket,
                    &destination_key,
                    &metadata,
                    payload,
                )
                .await
            });
        }
    }

    join_transfer_tasks(tasks).await
}

async fn plan_destination(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
    manifest: &DeploymentManifest,
) -> Result<DestinationPlan> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let mut start_after = None;
    let mut objects = HashMap::new();
    let mut keys_to_delete = Vec::new();

    loop {
        let response = state
            .s3
            .list_objects_v2()
            .bucket(&request.dest_bucket_name)
            .set_prefix(list_prefix.clone())
            .set_start_after(start_after.clone())
            .send()
            .await?;

        for object in response.contents() {
            let Some(key) = object.key() else { continue };
            let relative_key = strip_destination_prefix(strip_prefix, key);
            if relative_key.is_empty() {
                continue;
            }
            let etag = object.e_tag().and_then(normalize_etag);
            objects.insert(relative_key.clone(), DestinationObject { etag });
            if !filters.should_include(&relative_key) {
                continue;
            }
            if request.prune && !manifest.contains_key(&relative_key) {
                keys_to_delete.push(key.to_string());
            }
        }

        let last_key = response
            .contents()
            .iter()
            .filter_map(|object| object.key())
            .next_back()
            .map(ToOwned::to_owned);

        if !response.is_truncated().unwrap_or(false) || last_key.is_none() {
            break;
        }
        start_after = last_key;
    }

    Ok(DestinationPlan {
        objects,
        keys_to_delete,
    })
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

        let response = state
            .s3
            .delete_objects()
            .bucket(bucket)
            .delete(delete)
            .send()
            .await
            .with_context(|| format!("failed to delete objects from bucket {bucket}"))?;

        if !response.errors().is_empty() {
            let details = response
                .errors()
                .iter()
                .map(|error| {
                    let key = error.key().unwrap_or("<unknown-key>");
                    let code = error.code().unwrap_or("<unknown-code>");
                    let message = error.message().unwrap_or("<no-message>");
                    format!("{key}: {code} ({message})")
                })
                .collect::<Vec<_>>()
                .join(", ");
            return Err(anyhow!(
                "failed to delete some objects from bucket {bucket}: {details}"
            ));
        }
    }

    Ok(())
}

fn collect_copy_plans(
    manifest: &DeploymentManifest,
    request: &DeploymentRequest,
    destination_objects: &HashMap<String, DestinationObject>,
) -> Vec<CopyPlan> {
    manifest
        .values()
        .filter_map(|planned| match planned.action {
            PlannedAction::CopyObject { source_index }
                if planned.expected_etag.as_deref().is_none_or(|etag| {
                    !destination_etag_matches(destination_objects, &planned.relative_key, etag)
                }) =>
            {
                Some(CopyPlan {
                    source_bucket: request.source_bucket_names[source_index].clone(),
                    source_key: request.source_object_keys[source_index].clone(),
                    destination_key: join_s3_key(
                        &request.dest_bucket_prefix,
                        &planned.relative_key,
                    ),
                })
            }
            PlannedAction::ZipEntry { .. } => None,
            PlannedAction::CopyObject { .. } => None,
        })
        .collect()
}

fn collect_zip_entry_plans(
    manifest: &DeploymentManifest,
    destination_prefix: &str,
) -> BTreeMap<usize, Vec<ZipEntryPlan>> {
    let mut grouped = BTreeMap::<usize, Vec<ZipEntryPlan>>::new();

    for planned in manifest.values() {
        if let PlannedAction::ZipEntry {
            archive_index,
            entry_index,
            source_index,
        } = planned.action
        {
            grouped
                .entry(archive_index)
                .or_default()
                .push(ZipEntryPlan {
                    entry_index,
                    source_index,
                    relative_key: planned.relative_key.clone(),
                    destination_key: join_s3_key(destination_prefix, &planned.relative_key),
                });
        }
    }

    for plans in grouped.values_mut() {
        plans.sort_by_key(|plan| plan.entry_index);
    }

    grouped
}

fn prepare_zip_entry_for_comparison(
    archive: Arc<Vec<u8>>,
    entry: &mut zip::read::ZipFile<'_, impl Read + ?Sized>,
    request: &DeploymentRequest,
    source_index: usize,
    entry_index: usize,
) -> Result<PreparedUploadPayload> {
    if request.source_markers[source_index].is_empty() {
        let content_length = entry.size();
        let etag = hash_reader(entry)?;
        Ok(PreparedUploadPayload {
            payload: UploadPayload::ZipEntry {
                archive,
                entry_index,
                content_length,
            },
            etag,
        })
    } else {
        let bytes = read_reader_to_vec(entry, entry.size() as usize)?;
        let replaced = replace_markers(
            bytes,
            &request.source_markers[source_index],
            &request.source_markers_config[source_index],
        )?;
        let etag = md5_hex(&replaced);
        Ok(PreparedUploadPayload {
            payload: UploadPayload::Bytes(replaced),
            etag,
        })
    }
}

fn destination_etag_matches(
    destination_objects: &HashMap<String, DestinationObject>,
    relative_key: &str,
    expected_etag: &str,
) -> bool {
    destination_objects
        .get(relative_key)
        .and_then(|object| object.etag.as_deref())
        == Some(expected_etag)
}

fn normalize_etag(etag: &str) -> Option<String> {
    let normalized = etag.trim().trim_matches('"').to_ascii_lowercase();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

fn hash_reader<R>(reader: &mut R) -> Result<String>
where
    R: Read,
{
    let mut hasher = Md5::new();
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer)?;
        if bytes_read == 0 {
            break;
        }
        let chunk = &buffer[..bytes_read];
        hasher.update(chunk);
    }

    Ok(finalize_md5(hasher))
}

fn read_reader_to_vec<R>(reader: &mut R, capacity: usize) -> Result<Vec<u8>>
where
    R: Read,
{
    let mut bytes = Vec::with_capacity(capacity);
    let mut buffer = vec![0; ZIP_ENTRY_READ_CHUNK_BYTES];

    loop {
        let bytes_read = reader.read(&mut buffer)?;
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
    format!("{:x}", hasher.finalize())
}

async fn upload_payload(
    state: &AppState,
    destination_bucket: &str,
    destination_key: &str,
    metadata: &ObjectMetadata,
    payload: UploadPayload,
) -> Result<()> {
    let builder = state
        .s3
        .put_object()
        .bucket(destination_bucket)
        .key(destination_key);

    let body = match payload {
        UploadPayload::Bytes(bytes) => ByteStream::from(bytes),
        UploadPayload::ZipEntry {
            archive,
            entry_index,
            content_length,
        } => zip_entry_body(archive, entry_index, content_length),
    };

    apply_put_metadata(builder, metadata, destination_key)
        .body(body)
        .send()
        .await
        .with_context(|| format!("failed to upload {destination_key}"))?;

    Ok(())
}

fn zip_entry_body(archive: Arc<Vec<u8>>, entry_index: usize, content_length: u64) -> ByteStream {
    ByteStream::new(SdkBody::retryable(move || {
        zip_entry_sdk_body(archive.clone(), entry_index, content_length)
    }))
}

fn zip_entry_sdk_body(archive: Arc<Vec<u8>>, entry_index: usize, content_length: u64) -> SdkBody {
    let (sender, receiver) = tokio::sync::mpsc::channel(1);

    tokio::task::spawn_blocking(move || {
        if let Err(error) = send_zip_entry_chunks(archive, entry_index, sender.clone()) {
            let _ = sender.blocking_send(Err(error));
        }
    });

    SdkBody::from_body_1_x(ReceiverBody {
        receiver: Mutex::new(receiver),
        content_length,
    })
}

fn send_zip_entry_chunks(
    archive: Arc<Vec<u8>>,
    entry_index: usize,
    sender: tokio::sync::mpsc::Sender<std::result::Result<Bytes, BodyError>>,
) -> std::result::Result<(), BodyError> {
    let cursor = Cursor::new(archive.as_slice());
    let mut zip = ZipArchive::new(cursor).map_err(boxed_body_error)?;
    let mut entry = zip.by_index(entry_index).map_err(boxed_body_error)?;

    loop {
        let mut chunk = Vec::with_capacity(ZIP_ENTRY_READ_CHUNK_BYTES);
        let bytes_read = entry
            .by_ref()
            .take(ZIP_ENTRY_READ_CHUNK_BYTES as u64)
            .read_to_end(&mut chunk)
            .map_err(boxed_body_error)?;

        if bytes_read == 0 {
            break;
        }

        if sender.blocking_send(Ok(Bytes::from(chunk))).is_err() {
            break;
        }
    }

    Ok(())
}

fn boxed_body_error(error: impl StdError + Send + Sync + 'static) -> BodyError {
    Box::new(error)
}

struct ReceiverBody {
    receiver: Mutex<tokio::sync::mpsc::Receiver<std::result::Result<Bytes, BodyError>>>,
    content_length: u64,
}

impl Body for ReceiverBody {
    type Data = Bytes;
    type Error = BodyError;

    fn poll_frame(
        self: std::pin::Pin<&mut Self>,
        cx: &mut TaskContext<'_>,
    ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
        let mut receiver = self
            .receiver
            .lock()
            .expect("receiver body mutex should not be poisoned");

        match receiver.poll_recv(cx) {
            Poll::Ready(Some(Ok(bytes))) => Poll::Ready(Some(Ok(Frame::data(bytes)))),
            Poll::Ready(Some(Err(error))) => Poll::Ready(Some(Err(error))),
            Poll::Ready(None) => Poll::Ready(None),
            Poll::Pending => Poll::Pending,
        }
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.content_length)
    }
}

async fn join_transfer_tasks(mut tasks: JoinSet<Result<()>>) -> Result<()> {
    while let Some(result) = tasks.join_next().await {
        result.context("transfer task panicked or was cancelled")??;
    }

    Ok(())
}

fn namespace_list_prefix(prefix: &str) -> Option<String> {
    if prefix.is_empty() {
        return None;
    }

    let mut normalized = prefix.to_string();
    if !normalized.ends_with('/') {
        normalized.push('/');
    }
    Some(normalized)
}

#[cfg(test)]
mod tests {
    use super::{hash_reader, md5_hex, namespace_list_prefix, normalize_etag, read_reader_to_vec};

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
    fn normalize_etag_strips_quotes_and_lowercases() {
        assert_eq!(normalize_etag("\"A1B2C3\""), Some("a1b2c3".to_string()));
    }

    #[test]
    fn md5_hex_matches_known_digest() {
        assert_eq!(
            md5_hex(b"hello"),
            "5d41402abc4b2a76b9719d911017c592".to_string()
        );
    }

    #[test]
    fn hash_reader_returns_digest() {
        let mut reader = &b"large asset bytes"[..];

        let etag = hash_reader(&mut reader).unwrap();

        assert_eq!(etag, md5_hex(b"large asset bytes"));
    }

    #[test]
    fn read_reader_to_vec_returns_bytes() {
        let mut reader = &b"replacement asset bytes"[..];

        let bytes = read_reader_to_vec(&mut reader, 23).unwrap();

        assert_eq!(bytes, b"replacement asset bytes");
    }
}
