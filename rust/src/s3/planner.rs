use std::collections::{BTreeMap, HashMap};
use std::io::{Read, Seek};
use std::sync::Arc;

use anyhow::{Context, Result, anyhow};
use zip::ZipArchive;

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

            add_archive_entries_to_manifest(
                archive_index,
                source_index,
                &mut zip,
                filters,
                &mut manifest,
            )?;
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

fn add_archive_entries_to_manifest<R>(
    archive_index: usize,
    source_index: usize,
    zip: &mut ZipArchive<R>,
    filters: &Filters,
    manifest: &mut DeploymentManifest,
) -> Result<()>
where
    R: Read + Seek,
{
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

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};

    use zip::write::{SimpleFileOptions, ZipWriter};

    use super::{add_archive_entries_to_manifest, collect_zip_entry_plans};
    use crate::request::compile_filters;
    use crate::types::{DeploymentManifest, PlannedAction};

    #[test]
    fn archive_manifest_skips_directories_and_applies_filters() {
        let mut zip = zip_from_entries(&[
            ZipTestEntry::directory("assets/"),
            ZipTestEntry::file("assets/app.js", b"app"),
            ZipTestEntry::file("assets/debug.map", b"map"),
            ZipTestEntry::file("index.html", b"index"),
        ]);
        let filters = compile_filters(&["*.map".to_string()], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();

        add_archive_entries_to_manifest(0, 2, &mut zip, &filters, &mut manifest).unwrap();

        assert_eq!(
            manifest.keys().cloned().collect::<Vec<_>>(),
            vec!["assets/app.js".to_string(), "index.html".to_string()]
        );
    }

    #[test]
    fn archive_manifest_rejects_path_traversal() {
        let mut zip = zip_from_entries(&[ZipTestEntry::file("../escape.txt", b"escape")]);
        let filters = compile_filters(&[], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();

        let error = add_archive_entries_to_manifest(0, 0, &mut zip, &filters, &mut manifest)
            .expect_err("path traversal should be rejected");

        assert!(error.to_string().contains("path traversal"));
    }

    #[test]
    fn duplicate_archive_keys_keep_later_entry() {
        let mut first_zip = zip_from_entries(&[ZipTestEntry::file("index.html", b"first")]);
        let mut second_zip = zip_from_entries(&[ZipTestEntry::file("index.html", b"second")]);
        let filters = compile_filters(&[], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();

        add_archive_entries_to_manifest(3, 4, &mut first_zip, &filters, &mut manifest).unwrap();
        add_archive_entries_to_manifest(5, 6, &mut second_zip, &filters, &mut manifest).unwrap();

        let planned = manifest.get("index.html").unwrap();
        match planned.action {
            PlannedAction::ZipEntry {
                archive_index,
                entry_index,
                source_index,
            } => {
                assert_eq!(archive_index, 5);
                assert_eq!(entry_index, 0);
                assert_eq!(source_index, 6);
            }
            PlannedAction::CopyObject { .. } => panic!("expected zip entry plan"),
        }
    }

    #[test]
    fn zip_entry_plans_are_grouped_and_sorted_by_entry_index() {
        let mut zip = zip_from_entries(&[
            ZipTestEntry::file("b.txt", b"b"),
            ZipTestEntry::file("a.txt", b"a"),
        ]);
        let filters = compile_filters(&[], &[]).unwrap();
        let mut manifest = DeploymentManifest::new();

        add_archive_entries_to_manifest(0, 0, &mut zip, &filters, &mut manifest).unwrap();

        let plans = collect_zip_entry_plans(&manifest, "site");

        assert_eq!(
            plans[&0]
                .iter()
                .map(|plan| (plan.entry_index, plan.destination_key.as_str()))
                .collect::<Vec<_>>(),
            vec![(0, "site/b.txt"), (1, "site/a.txt")]
        );
    }

    enum ZipTestEntry<'a> {
        File(&'a str, &'a [u8]),
        Directory(&'a str),
    }

    impl<'a> ZipTestEntry<'a> {
        fn file(name: &'a str, bytes: &'a [u8]) -> Self {
            Self::File(name, bytes)
        }

        fn directory(name: &'a str) -> Self {
            Self::Directory(name)
        }
    }

    fn zip_from_entries(entries: &[ZipTestEntry<'_>]) -> zip::ZipArchive<Cursor<Vec<u8>>> {
        let cursor = Cursor::new(Vec::new());
        let mut writer = ZipWriter::new(cursor);
        let options = SimpleFileOptions::default();

        for entry in entries {
            match entry {
                ZipTestEntry::File(name, bytes) => {
                    writer.start_file(name, options).unwrap();
                    writer.write_all(bytes).unwrap();
                }
                ZipTestEntry::Directory(name) => {
                    writer.add_directory(*name, options).unwrap();
                }
            }
        }

        let cursor = writer.finish().unwrap();
        zip::ZipArchive::new(Cursor::new(cursor.into_inner())).unwrap()
    }
}
