use std::collections::{BTreeMap, HashMap};
use std::io::Read;
use std::path::PathBuf;
use std::sync::Arc;

use anyhow::{Context, Result};
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{ChecksumAlgorithm, ChecksumMode, ChecksumType, MetadataDirective};
use base64::Engine;
use base64::engine::general_purpose::STANDARD as BASE64;
use crc32fast::Hasher as Crc32Hasher;
use md5::{Digest as Md5Digest, Md5};
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tracing::warn;

use crate::replace::replace_markers;
use crate::types::{AppState, DeploymentRequest, ObjectMetadata, SourceArchive};

use super::archive::{open_zip_archive, zip_entry_body};
use super::destination::{DestinationObject, destination_etag_matches};
use super::metadata::{apply_copy_metadata, apply_put_metadata};
use super::planner::{CopyPlan, ZipEntryPlan};
use super::{MAX_PARALLEL_TRANSFERS, ZIP_ENTRY_READ_CHUNK_BYTES};

enum UploadPayload {
    Bytes {
        bytes: Vec<u8>,
        checksum_crc32: String,
    },
    ZipEntry {
        archive_path: Arc<PathBuf>,
        entry_index: usize,
        content_length: u64,
        checksum_crc32: String,
    },
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
        for plan in plans {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .context("failed to acquire upload semaphore")?;
            let archive_path = archives[archive_index].path.clone();
            let destination_object = destination_objects.get(&plan.relative_key);
            let prepared = if request.source_markers[plan.source_index].is_empty() {
                match marker_free_entry_matches_destination(
                    state,
                    &request.dest_bucket_name,
                    &plan.destination_key,
                    destination_object,
                    plan.size,
                    plan.crc32,
                )
                .await?
                {
                    Some(true) => continue,
                    Some(false) => PreparedUploadPayload {
                        payload: UploadPayload::ZipEntry {
                            archive_path,
                            entry_index: plan.entry_index,
                            content_length: plan.size,
                            checksum_crc32: crc32_base64(plan.crc32),
                        },
                        etag: String::new(),
                    },
                    None => {
                        let mut zip = open_zip_archive(&archive_path)
                            .context("failed to reopen zip archive")?;
                        let mut entry = zip.by_index(plan.entry_index)?;
                        let prepared = prepare_zip_entry_for_comparison(
                            archive_path.clone(),
                            &mut entry,
                            request,
                            plan.source_index,
                            plan.entry_index,
                        )?;
                        if destination_etag_matches(
                            destination_objects,
                            &plan.relative_key,
                            &prepared.etag,
                        ) {
                            continue;
                        }
                        prepared
                    }
                }
            } else {
                let mut zip =
                    open_zip_archive(&archive_path).context("failed to reopen zip archive")?;
                let mut entry = zip.by_index(plan.entry_index)?;
                let prepared = prepare_zip_entry_for_comparison(
                    archive_path.clone(),
                    &mut entry,
                    request,
                    plan.source_index,
                    plan.entry_index,
                )?;
                if destination_etag_matches(destination_objects, &plan.relative_key, &prepared.etag)
                {
                    continue;
                }
                prepared
            };

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
        .s3
        .copy_object()
        .bucket(destination_bucket)
        .key(destination_key)
        .copy_source(copy_source)
        .checksum_algorithm(ChecksumAlgorithm::Crc32)
        .metadata_directive(MetadataDirective::Replace);

    apply_copy_metadata(builder, metadata, destination_key)
        .send()
        .await
        .with_context(|| {
            format!("failed to copy {source_bucket}/{source_key} to {destination_key}")
        })?;

    Ok(())
}

fn prepare_zip_entry_for_comparison(
    archive_path: Arc<PathBuf>,
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
                archive_path,
                entry_index,
                content_length,
                checksum_crc32: crc32_base64(entry.crc32()),
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
        let checksum_crc32 = crc32_base64(crc32_bytes(&replaced));
        Ok(PreparedUploadPayload {
            payload: UploadPayload::Bytes {
                bytes: replaced,
                checksum_crc32,
            },
            etag,
        })
    }
}

async fn upload_payload(
    state: &AppState,
    destination_bucket: &str,
    destination_key: &str,
    metadata: &ObjectMetadata,
    payload: UploadPayload,
) -> Result<()> {
    let mut builder = state
        .s3
        .put_object()
        .bucket(destination_bucket)
        .key(destination_key);

    let body = match payload {
        UploadPayload::Bytes {
            bytes,
            checksum_crc32,
        } => {
            builder = builder.checksum_crc32(checksum_crc32);
            ByteStream::from(bytes)
        }
        UploadPayload::ZipEntry {
            archive_path,
            entry_index,
            content_length,
            checksum_crc32,
        } => {
            builder = builder.checksum_crc32(checksum_crc32);
            zip_entry_body(archive_path, entry_index, content_length)
        }
    };

    apply_put_metadata(builder, metadata, destination_key)
        .body(body)
        .send()
        .await
        .with_context(|| format!("failed to upload {destination_key}"))?;

    Ok(())
}

async fn marker_free_entry_matches_destination(
    state: &AppState,
    destination_bucket: &str,
    destination_key: &str,
    destination_object: Option<&DestinationObject>,
    expected_size: u64,
    expected_crc32: u32,
) -> Result<Option<bool>> {
    let Some(destination_object) = destination_object else {
        return Ok(Some(false));
    };

    if destination_object.size != Some(expected_size) {
        return Ok(Some(false));
    }

    if !destination_object.has_full_object_crc32 {
        return Ok(None);
    }

    let response = match state
        .s3
        .head_object()
        .bucket(destination_bucket)
        .key(destination_key)
        .checksum_mode(ChecksumMode::Enabled)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            warn!(
                error = %error,
                destination_key,
                "failed to read destination checksum; falling back to ETag comparison"
            );
            return Ok(None);
        }
    };

    if response
        .content_length()
        .and_then(|value| u64::try_from(value).ok())
        != Some(expected_size)
    {
        return Ok(Some(false));
    }

    if response.checksum_type() != Some(&ChecksumType::FullObject) {
        return Ok(None);
    }

    Ok(response
        .checksum_crc32()
        .map(|checksum| checksum == crc32_base64(expected_crc32))
        .or(Some(false)))
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

fn crc32_bytes(bytes: &[u8]) -> u32 {
    let mut hasher = Crc32Hasher::new();
    hasher.update(bytes);
    hasher.finalize()
}

fn crc32_base64(crc32: u32) -> String {
    BASE64.encode(crc32.to_be_bytes())
}

fn finalize_md5(hasher: Md5) -> String {
    format!("{:x}", hasher.finalize())
}

async fn join_transfer_tasks(mut tasks: JoinSet<Result<()>>) -> Result<()> {
    while let Some(result) = tasks.join_next().await {
        result.context("transfer task panicked or was cancelled")??;
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{crc32_base64, crc32_bytes, hash_reader, md5_hex, read_reader_to_vec};

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

    #[test]
    fn crc32_base64_encodes_big_endian_checksum_bytes() {
        assert_eq!(crc32_base64(0x2aa3_7caa), "KqN8qg==");
    }

    #[test]
    fn crc32_bytes_matches_known_digest() {
        assert_eq!(crc32_bytes(b"hello"), 0x3610_a686);
    }
}
