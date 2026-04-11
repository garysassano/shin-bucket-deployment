use std::collections::HashSet;
use std::fs::File;
use std::io::{Read, Write};

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{Delete, MetadataDirective, ObjectIdentifier};
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;
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

pub(crate) async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    validate_request_lengths(request)?;

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

pub(crate) async fn delete_prefix(state: &AppState, bucket: &str, prefix: &str) -> Result<()> {
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

        let mut keys_to_delete = Vec::new();
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

        delete_keys(state, &request.dest_bucket_name, &keys_to_delete).await?;

        if !response.is_truncated().unwrap_or(false) {
            break;
        }
        continuation_token = response
            .next_continuation_token()
            .map(|value| value.to_string());
    }

    Ok(())
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
