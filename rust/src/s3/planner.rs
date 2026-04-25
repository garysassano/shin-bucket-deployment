use std::collections::{BTreeMap, HashMap};
use std::sync::Arc;

use anyhow::{Context, Result, anyhow};

use crate::request::{join_s3_key, normalize_archive_key, source_basename};
use crate::types::{
    AppState, DeploymentManifest, DeploymentRequest, Filters, PlannedAction, PlannedObject,
    SourceArchive,
};

use super::archive::{download_source_zip, open_zip_archive};
use super::destination::{DestinationObject, destination_etag_matches, normalize_etag};

#[derive(Clone)]
pub(super) struct CopyPlan {
    pub(super) source_bucket: String,
    pub(super) source_key: String,
    pub(super) destination_key: String,
}

pub(super) struct ZipEntryPlan {
    pub(super) entry_index: usize,
    pub(super) source_index: usize,
    pub(super) relative_key: String,
    pub(super) destination_key: String,
}

pub(super) fn validate_request_lengths(request: &DeploymentRequest) -> Result<()> {
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

pub(super) async fn plan_deployment(
    state: &AppState,
    request: &DeploymentRequest,
    filters: &Filters,
) -> Result<(Vec<SourceArchive>, DeploymentManifest)> {
    let mut archives = Vec::new();
    let mut manifest = DeploymentManifest::new();

    for source_index in 0..request.source_bucket_names.len() {
        if request.extract {
            let archive_path = download_source_zip(
                state,
                &request.source_bucket_names[source_index],
                &request.source_object_keys[source_index],
            )
            .await?;
            let archive_index = archives.len();
            archives.push(SourceArchive {
                path: Arc::new(archive_path),
            });

            let mut zip = open_zip_archive(&archives[archive_index].path)
                .context("failed to read zip archive")?;

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

pub(super) fn collect_copy_plans(
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

pub(super) fn collect_zip_entry_plans(
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
