use std::collections::{BTreeMap, HashSet};
use std::fs::File;
use std::io::{Read, Write};
use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use aws_sdk_s3::error::ProvideErrorMetadata;
use aws_sdk_s3::primitives::ByteStream;
use aws_sdk_s3::types::{Delete, MetadataDirective, ObjectIdentifier};
use tempfile::NamedTempFile;
use tokio::io::AsyncWriteExt;
use tokio::sync::Semaphore;
use tokio::task::JoinSet;
use tracing::{info, warn};
use zip::ZipArchive;

use crate::replace::replace_markers;
use crate::request::{
    compile_filters, join_s3_key, normalize_archive_key, source_basename, strip_destination_prefix,
};
use crate::types::{
    AppState, DeploymentIdentity, DeploymentManifest, DeploymentRequest, Filters, ObjectMetadata,
    PlannedAction, PlannedObject, PruneMode, SourceArchive,
};

mod manifest;
mod metadata;

use self::manifest::{
    CopyObjectSignature, ZipEntrySignature, build_stored_manifest, hash_json,
    is_internal_relative_key, load_previous_manifest, manifest_relative_key, metadata_signature,
    planned_object_changed, removed_destination_keys, write_manifest,
};
use self::metadata::{apply_copy_metadata, apply_put_metadata};

const MAX_PARALLEL_TRANSFERS: usize = 8;

#[derive(Clone)]
struct CopyPlan {
    source_bucket: String,
    source_key: String,
    destination_key: String,
}

struct ZipEntryPlan {
    entry_index: usize,
    source_index: usize,
    destination_key: String,
}

struct FullPrunePlan {
    existing_relative_keys: HashSet<String>,
    keys_to_delete: Vec<String>,
}

enum UploadPayload {
    Bytes(Vec<u8>),
    TempFile(NamedTempFile),
}

pub(crate) async fn deploy(
    state: &AppState,
    request: &DeploymentRequest,
    identity: &DeploymentIdentity,
) -> Result<()> {
    validate_request_lengths(request)?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, deployment_manifest) =
        plan_deployment(state, request, &filters, &metadata).await?;
    let previous_manifest = load_previous_manifest(state, request, identity).await?;
    let stored_manifest = build_stored_manifest(request, identity, &deployment_manifest);
    let full_prune_plan = if request.prune && request.prune_mode == PruneMode::Full {
        let mut expected: HashSet<String> = deployment_manifest.keys().cloned().collect();
        expected.insert(manifest_relative_key(identity));
        Some(plan_full_prune(state, request, &filters, &expected).await?)
    } else {
        None
    };

    if request.extract {
        let zip_plans = collect_zip_entry_plans(
            &deployment_manifest,
            &request.dest_bucket_prefix,
            previous_manifest.as_ref(),
            full_prune_plan
                .as_ref()
                .map(|plan| &plan.existing_relative_keys),
        );
        upload_zip_entries(state, &archives, request, &metadata, zip_plans).await?;
    } else {
        let copy_plans = collect_copy_plans(
            &deployment_manifest,
            request,
            previous_manifest.as_ref(),
            full_prune_plan
                .as_ref()
                .map(|plan| &plan.existing_relative_keys),
        );
        execute_copy_plans(state, &request.dest_bucket_name, &metadata, copy_plans).await?;
    }

    if request.prune {
        match request.prune_mode {
            PruneMode::Full => {
                if let Some(full_prune_plan) = full_prune_plan {
                    delete_keys(
                        state,
                        &request.dest_bucket_name,
                        &full_prune_plan.keys_to_delete,
                    )
                    .await?;
                }
            }
            PruneMode::Managed => {
                if let Some(previous_manifest) = previous_manifest.as_ref() {
                    let keys_to_delete =
                        removed_destination_keys(previous_manifest, &stored_manifest);
                    delete_keys(state, &request.dest_bucket_name, &keys_to_delete).await?;
                } else {
                    warn!(
                        "managed prune requested without a valid previous manifest; skipping deletes"
                    );
                }
            }
        }
    }

    write_manifest(state, request, identity, &metadata, &stored_manifest).await?;

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
    metadata: &ObjectMetadata,
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
                if is_internal_relative_key(&relative_key) {
                    return Err(anyhow!(
                        "source object key {relative_key} uses the reserved .rust-bucket-deployment namespace"
                    ));
                }
                if !filters.should_include(&relative_key) {
                    continue;
                }
                let destination_key = join_s3_key(&request.dest_bucket_prefix, &relative_key);
                let signature = hash_json(&ZipEntrySignature {
                    source_bucket: &request.source_bucket_names[source_index],
                    source_key: &request.source_object_keys[source_index],
                    entry_name: entry.name(),
                    size: entry.size(),
                    crc32: entry.crc32(),
                    markers_hash: hash_json(&(
                        &request.source_markers[source_index],
                        &request.source_markers_config[source_index],
                    ))?,
                    metadata_hash: metadata_signature(metadata, &destination_key)?,
                })?;

                manifest.insert(
                    relative_key.clone(),
                    PlannedObject {
                        relative_key,
                        signature,
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
            if is_internal_relative_key(&relative_key) {
                return Err(anyhow!(
                    "source object key {relative_key} uses the reserved .rust-bucket-deployment namespace"
                ));
            }
            if !filters.should_include(&relative_key) {
                continue;
            }
            let destination_key = join_s3_key(&request.dest_bucket_prefix, &relative_key);
            let signature = hash_json(&CopyObjectSignature {
                source_bucket: &request.source_bucket_names[source_index],
                source_key: &request.source_object_keys[source_index],
                metadata_hash: metadata_signature(metadata, &destination_key)?,
            })?;

            manifest.insert(
                relative_key.clone(),
                PlannedObject {
                    relative_key,
                    signature,
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
) -> Result<()> {
    let semaphore = Arc::new(Semaphore::new(MAX_PARALLEL_TRANSFERS));
    let mut tasks = JoinSet::new();

    for (archive_index, plans) in zip_plans {
        let file = File::open(archives[archive_index].file.path())
            .context("failed to reopen source archive")?;
        let mut zip = ZipArchive::new(file).context("failed to reopen zip archive")?;

        for plan in plans {
            let permit = semaphore
                .clone()
                .acquire_owned()
                .await
                .context("failed to acquire upload semaphore")?;
            let mut entry = zip.by_index(plan.entry_index)?;
            let payload = prepare_zip_upload_payload(&mut entry, request, plan.source_index)?;
            let state = state.clone();
            let metadata = metadata.clone();
            let destination_bucket = request.dest_bucket_name.clone();
            let destination_key = plan.destination_key;

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

async fn plan_full_prune(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
    expected_relative_keys: &HashSet<String>,
) -> Result<FullPrunePlan> {
    let list_prefix = namespace_list_prefix(&request.dest_bucket_prefix);
    let strip_prefix = list_prefix.as_deref().unwrap_or("");
    let mut start_after = None;
    let mut existing_relative_keys = HashSet::new();
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
            if is_internal_relative_key(&relative_key) {
                continue;
            }
            existing_relative_keys.insert(relative_key.clone());
            if !filters.should_include(&relative_key) {
                continue;
            }
            if !expected_relative_keys.contains(&relative_key) {
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

    Ok(FullPrunePlan {
        existing_relative_keys,
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
    previous_manifest: Option<&manifest::StoredDeploymentManifest>,
    existing_relative_keys: Option<&HashSet<String>>,
) -> Vec<CopyPlan> {
    manifest
        .values()
        .filter_map(|planned| match planned.action {
            PlannedAction::CopyObject { source_index }
                if should_transfer_planned_object(
                    previous_manifest,
                    existing_relative_keys,
                    planned,
                ) =>
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
    previous_manifest: Option<&manifest::StoredDeploymentManifest>,
    existing_relative_keys: Option<&HashSet<String>>,
) -> BTreeMap<usize, Vec<ZipEntryPlan>> {
    let mut grouped = BTreeMap::<usize, Vec<ZipEntryPlan>>::new();

    for planned in manifest.values() {
        if let PlannedAction::ZipEntry {
            archive_index,
            entry_index,
            source_index,
        } = planned.action
        {
            if !should_transfer_planned_object(previous_manifest, existing_relative_keys, planned) {
                continue;
            }
            grouped
                .entry(archive_index)
                .or_default()
                .push(ZipEntryPlan {
                    entry_index,
                    source_index,
                    destination_key: join_s3_key(destination_prefix, &planned.relative_key),
                });
        }
    }

    for plans in grouped.values_mut() {
        plans.sort_by_key(|plan| plan.entry_index);
    }

    grouped
}

fn should_transfer_planned_object(
    previous_manifest: Option<&manifest::StoredDeploymentManifest>,
    existing_relative_keys: Option<&HashSet<String>>,
    planned: &PlannedObject,
) -> bool {
    if planned_object_changed(previous_manifest, &planned.relative_key, &planned.signature) {
        return true;
    }

    existing_relative_keys.is_some_and(|existing| !existing.contains(&planned.relative_key))
}

fn prepare_zip_upload_payload(
    entry: &mut zip::read::ZipFile<'_, File>,
    request: &DeploymentRequest,
    source_index: usize,
) -> Result<UploadPayload> {
    if request.source_markers[source_index].is_empty() {
        let mut temp = NamedTempFile::new().context("failed to create temp entry file")?;
        std::io::copy(entry, &mut temp)?;
        temp.flush()?;
        Ok(UploadPayload::TempFile(temp))
    } else {
        let mut bytes = Vec::new();
        entry.read_to_end(&mut bytes)?;
        let replaced = replace_markers(
            bytes,
            &request.source_markers[source_index],
            &request.source_markers_config[source_index],
        )?;
        Ok(UploadPayload::Bytes(replaced))
    }
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
        UploadPayload::TempFile(temp) => ByteStream::from_path(temp.path().to_path_buf()).await?,
    };

    apply_put_metadata(builder, metadata, destination_key)
        .body(body)
        .send()
        .await
        .with_context(|| format!("failed to upload {destination_key}"))?;

    Ok(())
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
    use super::namespace_list_prefix;

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
}
