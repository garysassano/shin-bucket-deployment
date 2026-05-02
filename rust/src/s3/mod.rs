use anyhow::Result;

use crate::request::compile_filters;
use crate::types::{AppState, DeploymentRequest, ObjectMetadata, RuntimeOptions};

pub(crate) mod archive;
mod destination;
mod metadata;
mod planner;
mod transfer;

pub(crate) use destination::{bucket_owned, delete_prefix};

pub(crate) const DEFAULT_MAX_PARALLEL_TRANSFERS: usize = 8;
pub(crate) const DEFAULT_SOURCE_BLOCK_BYTES: usize = 8 * 1024 * 1024;
pub(crate) const DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES: usize = 256 * 1024;
pub(crate) const DEFAULT_SOURCE_WINDOW_MEMORY_BUDGET_MB: u64 = 256;
pub(crate) const ZIP_ENTRY_READ_CHUNK_BYTES: usize = 512 * 1024;
pub(crate) const PUT_OBJECT_MAX_ATTEMPTS: usize = 6;
pub(crate) const PUT_OBJECT_RETRY_BASE_DELAY_MS: u64 = 250;
pub(crate) const PUT_OBJECT_RETRY_MAX_DELAY_MS: u64 = 5_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_BASE_DELAY_MS: u64 = 1_000;
pub(crate) const PUT_OBJECT_SLOWDOWN_RETRY_MAX_DELAY_MS: u64 = 30_000;
const ADAPTIVE_CACHE_BASE_OVERHEAD: u64 = 64 * 1024 * 1024;
const ADAPTIVE_CACHE_WORKER_OVERHEAD: u64 = 12 * 1024 * 1024;
const ADAPTIVE_CACHE_FILE_OVERHEAD: u64 = 2 * 1024;
const ADAPTIVE_CACHE_LARGE_THRESHOLD: u64 = 512 * 1024 * 1024;
const ADAPTIVE_CACHE_LARGE_RSS_SLACK: u64 = 384 * 1024 * 1024;
const ADAPTIVE_CACHE_MAX_WINDOW_BYTES: u64 = 512 * 1024 * 1024;
const ADAPTIVE_SOURCE_GET_MEMORY_STEP_MB: u64 = 256;
const ADAPTIVE_SOURCE_MAX_GET_CONCURRENCY: usize = 8;
const EMBEDDED_CATALOG_PATH: &str = ".s3-unspool/catalog.v1.json";
const EMBEDDED_CATALOG_VERSION: u32 = 1;
const EMBEDDED_CATALOG_MAX_BYTES: u64 = 64 * 1024 * 1024;

pub(crate) fn adaptive_source_get_concurrency(available_memory_mb: u64) -> usize {
    let slots = available_memory_mb / ADAPTIVE_SOURCE_GET_MEMORY_STEP_MB;
    usize::try_from(slots)
        .unwrap_or(usize::MAX)
        .clamp(1, ADAPTIVE_SOURCE_MAX_GET_CONCURRENCY)
}

pub(crate) fn adaptive_source_window_bytes(
    available_memory_mb: u64,
    source_zip_bytes: u64,
    concurrency: usize,
    zip_file_count: usize,
    source_block_bytes: usize,
    source_get_concurrency: usize,
) -> usize {
    let Some(available_memory_bytes) = available_memory_mb.checked_mul(1024 * 1024) else {
        return usize::try_from(source_zip_bytes).unwrap_or(usize::MAX);
    };
    let concurrency = u64::try_from(concurrency.max(1)).unwrap_or(u64::MAX);
    let zip_file_count = u64::try_from(zip_file_count).unwrap_or(u64::MAX);
    let worker_budget = concurrency.saturating_mul(ADAPTIVE_CACHE_WORKER_OVERHEAD);
    let file_budget = zip_file_count.saturating_mul(ADAPTIVE_CACHE_FILE_OVERHEAD);
    let in_flight_budget = u64::try_from(source_get_concurrency.max(1))
        .unwrap_or(u64::MAX)
        .saturating_mul(u64::try_from(source_block_bytes).unwrap_or(u64::MAX));
    let reserved = ADAPTIVE_CACHE_BASE_OVERHEAD
        .saturating_add(worker_budget)
        .saturating_add(file_budget)
        .saturating_add(in_flight_budget);
    let capacity = available_memory_bytes
        .saturating_sub(reserved)
        .min(source_zip_bytes);
    let capacity = if capacity > ADAPTIVE_CACHE_LARGE_THRESHOLD {
        capacity.saturating_sub(ADAPTIVE_CACHE_LARGE_RSS_SLACK)
    } else {
        capacity
    }
    .min(ADAPTIVE_CACHE_MAX_WINDOW_BYTES);
    let minimum_block_capacity = u64::try_from(source_block_bytes.max(1))
        .unwrap_or(u64::MAX)
        .min(source_zip_bytes.max(1));
    let capacity = capacity.max(minimum_block_capacity);

    usize::try_from(capacity).unwrap_or(usize::MAX)
}

pub(crate) fn default_source_window_memory_budget_mb(available_memory_mb: u64) -> u64 {
    if available_memory_mb == 0 {
        DEFAULT_SOURCE_WINDOW_MEMORY_BUDGET_MB
    } else {
        available_memory_mb
    }
}

pub(crate) fn source_window_bytes_for_archive(
    runtime: &RuntimeOptions,
    source_zip_bytes: u64,
    zip_file_count: usize,
) -> usize {
    let memory_budget_mb = if runtime.source_window_memory_budget_mb == 0 {
        runtime.available_memory_mb
    } else {
        runtime.source_window_memory_budget_mb
    };
    runtime.source_window_bytes.unwrap_or_else(|| {
        adaptive_source_window_bytes(
            memory_budget_mb,
            source_zip_bytes,
            runtime.max_parallel_transfers,
            zip_file_count,
            runtime.source_block_bytes,
            runtime.source_get_concurrency,
        )
    })
}

pub(crate) async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    planner::validate_request_lengths(request)?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, deployment_manifest) =
        planner::plan_deployment(state, request, &filters).await?;
    let destination_plan =
        destination::plan_destination(state, request, &filters, &deployment_manifest).await?;

    if request.extract {
        let zip_plans =
            planner::collect_zip_entry_plans(&deployment_manifest, &request.dest_bucket_prefix);
        transfer::upload_zip_entries(
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
            planner::collect_copy_plans(&deployment_manifest, request, &destination_plan.objects);
        transfer::execute_copy_plans(
            state,
            &request.dest_bucket_name,
            &metadata,
            copy_plans,
            request.runtime.max_parallel_transfers,
        )
        .await?;
    }

    if request.prune {
        destination::delete_keys(
            state,
            &request.dest_bucket_name,
            &destination_plan.keys_to_delete,
        )
        .await?;
    }

    Ok(())
}

#[cfg(test)]
mod aws_integration_tests {
    use std::collections::HashMap;
    use std::env;
    use std::io::{Cursor, Write};
    use std::time::Duration;

    use anyhow::{Context, Result, anyhow, ensure};
    use aws_config::BehaviorVersion;
    use aws_sdk_cloudfront::Client as CloudFrontClient;
    use aws_sdk_s3::Client as S3Client;
    use aws_sdk_s3::config::StalledStreamProtectionConfig;
    use aws_sdk_s3::types::{
        BucketLocationConstraint, CreateBucketConfiguration, Delete, ObjectIdentifier,
    };
    use bytes::Bytes;
    use reqwest::Client as HttpClient;
    use uuid::Uuid;
    use zip::write::{SimpleFileOptions, ZipWriter};

    use crate::request::{RawDeploymentRequest, parse_request};
    use crate::types::{AppState, MarkerConfig};

    use super::deploy;

    const DEFAULT_AWS_INTEGRATION_FILE_COUNT: usize = 2_500;

    #[tokio::test]
    #[ignore = "requires AWS credentials and creates temporary S3 buckets"]
    async fn deploys_generated_zip_archives_from_s3_to_s3() -> Result<()> {
        let config = aws_config::defaults(BehaviorVersion::latest()).load().await;
        let region = config
            .region()
            .map(|region| region.as_ref().to_string())
            .ok_or_else(|| anyhow!("set AWS_REGION or configure a default AWS region"))?;
        let source_s3 = S3Client::new(&config);
        let destination_s3 = S3Client::from_conf(
            aws_sdk_s3::config::Builder::from(&config)
                .stalled_stream_protection(
                    StalledStreamProtectionConfig::enabled()
                        .upload_enabled(false)
                        .download_enabled(true)
                        .build(),
                )
                .build(),
        );
        let state = AppState {
            source_s3: source_s3.clone(),
            destination_s3: destination_s3.clone(),
            cloudfront: CloudFrontClient::new(&config),
            http: HttpClient::new(),
        };

        let suffix = Uuid::new_v4().simple().to_string();
        let source_bucket = format!("rbd-it-src-{}", &suffix[..24]);
        let destination_bucket = format!("rbd-it-dst-{}", &suffix[..24]);
        let prefix = format!("integration/{suffix}");

        create_bucket(&source_s3, &source_bucket, &region).await?;
        create_bucket(&destination_s3, &destination_bucket, &region).await?;

        let result: Result<()> = async {
            let file_count = env_usize(
                "RBD_AWS_INTEGRATION_FILE_COUNT",
                DEFAULT_AWS_INTEGRATION_FILE_COUNT,
            )?;
            let plain_zip_key = "plain.zip";
            let marker_zip_key = "markers.zip";
            let plain_zip = generated_plain_zip(file_count)?;
            let marker_zip = marker_zip()?;

            put_bytes(&source_s3, &source_bucket, plain_zip_key, plain_zip).await?;
            put_bytes(&source_s3, &source_bucket, marker_zip_key, marker_zip).await?;
            put_bytes(
                &destination_s3,
                &destination_bucket,
                &format!("{prefix}/stale.txt"),
                Bytes::from_static(b"stale"),
            )
            .await?;
            put_bytes(
                &destination_s3,
                &destination_bucket,
                "outside-prefix.txt",
                Bytes::from_static(b"keep"),
            )
            .await?;

            let request = parse_request(&RawDeploymentRequest {
                source_bucket_names: vec![source_bucket.clone(), source_bucket.clone()],
                source_object_keys: vec![plain_zip_key.to_string(), marker_zip_key.to_string()],
                source_markers: vec![HashMap::new(), marker_map()],
                source_markers_config: vec![MarkerConfig::default(), MarkerConfig::default()],
                destination_bucket_name: destination_bucket.clone(),
                destination_bucket_key_prefix: Some(prefix.clone()),
                extract: true,
                retain_on_delete: true,
                distribution_id: None,
                distribution_paths: None,
                wait_for_distribution_invalidation: true,
                user_metadata: HashMap::new(),
                system_metadata: HashMap::new(),
                prune: true,
                exclude: Vec::new(),
                include: Vec::new(),
                output_object_keys: true,
                destination_bucket_arn: None,
                available_memory_mb: Some(128),
                max_parallel_transfers: Some(8),
                source_block_bytes: Some(64 * 1024),
                source_block_merge_gap_bytes: Some(4 * 1024),
                source_get_concurrency: Some(2),
                source_window_bytes: Some(128 * 1024),
                source_window_memory_budget_mb: Some(128),
                put_object_max_attempts: Some(3),
                put_object_retry_base_delay_ms: Some(50),
                put_object_retry_max_delay_ms: Some(500),
                put_object_slowdown_retry_base_delay_ms: Some(100),
                put_object_slowdown_retry_max_delay_ms: Some(1_000),
                put_object_retry_jitter: None,
            });

            deploy(&state, &request)
                .await
                .context("initial deploy failed")?;
            verify_destination(&destination_s3, &destination_bucket, &prefix, file_count).await?;

            deploy(&state, &request)
                .await
                .context("unchanged redeploy failed")?;
            verify_destination(&destination_s3, &destination_bucket, &prefix, file_count).await?;

            Ok(())
        }
        .await;

        let cleanup_result: Result<()> = async {
            delete_bucket_contents(&source_s3, &source_bucket).await?;
            delete_bucket_contents(&destination_s3, &destination_bucket).await?;
            source_s3
                .delete_bucket()
                .bucket(&source_bucket)
                .send()
                .await?;
            destination_s3
                .delete_bucket()
                .bucket(&destination_bucket)
                .send()
                .await?;
            Ok(())
        }
        .await;

        result?;
        cleanup_result?;
        Ok(())
    }

    async fn create_bucket(client: &S3Client, bucket: &str, region: &str) -> Result<()> {
        let mut request = client.create_bucket().bucket(bucket);
        if region != "us-east-1" {
            let configuration = CreateBucketConfiguration::builder()
                .location_constraint(BucketLocationConstraint::from(region))
                .build();
            request = request.create_bucket_configuration(configuration);
        }
        request
            .send()
            .await
            .with_context(|| format!("failed to create bucket {bucket}"))?;

        for _ in 0..20 {
            if client.head_bucket().bucket(bucket).send().await.is_ok() {
                return Ok(());
            }
            tokio::time::sleep(Duration::from_millis(250)).await;
        }

        Err(anyhow!("bucket {bucket} was not readable after creation"))
    }

    async fn put_bytes(client: &S3Client, bucket: &str, key: &str, bytes: Bytes) -> Result<()> {
        client
            .put_object()
            .bucket(bucket)
            .key(key)
            .body(bytes.into())
            .send()
            .await
            .with_context(|| format!("failed to put s3://{bucket}/{key}"))?;
        Ok(())
    }

    async fn get_bytes(client: &S3Client, bucket: &str, key: &str) -> Result<Vec<u8>> {
        let output = client
            .get_object()
            .bucket(bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("failed to get s3://{bucket}/{key}"))?;
        Ok(output.body.collect().await?.into_bytes().to_vec())
    }

    async fn delete_bucket_contents(client: &S3Client, bucket: &str) -> Result<()> {
        loop {
            let response = client.list_objects_v2().bucket(bucket).send().await?;
            let keys = response
                .contents()
                .iter()
                .filter_map(|object| object.key())
                .map(ToOwned::to_owned)
                .collect::<Vec<_>>();
            if keys.is_empty() {
                return Ok(());
            }
            for chunk in keys.chunks(1000) {
                let objects = chunk
                    .iter()
                    .map(|key| ObjectIdentifier::builder().key(key).build())
                    .collect::<std::result::Result<Vec<_>, _>>()?;
                let delete = Delete::builder()
                    .set_objects(Some(objects))
                    .quiet(true)
                    .build()?;
                client
                    .delete_objects()
                    .bucket(bucket)
                    .delete(delete)
                    .send()
                    .await?;
            }
        }
    }

    async fn verify_destination(
        client: &S3Client,
        bucket: &str,
        prefix: &str,
        file_count: usize,
    ) -> Result<()> {
        ensure!(file_count > 0, "file_count must be greater than zero");

        let first_key = format!("{prefix}/files/{:05}.txt", 0);
        let last_key = format!("{prefix}/files/{:05}.txt", file_count - 1);
        ensure!(
            get_bytes(client, bucket, &first_key).await? == generated_file_bytes(0),
            "first generated file did not match"
        );
        ensure!(
            get_bytes(client, bucket, &last_key).await? == generated_file_bytes(file_count - 1),
            "last generated file did not match"
        );
        ensure!(
            get_bytes(client, bucket, &format!("{prefix}/config.json")).await?
                == br#"{"api":"https://example.test"}"#.to_vec(),
            "marker replacement output did not match"
        );
        ensure!(
            client
                .head_object()
                .bucket(bucket)
                .key(format!("{prefix}/stale.txt"))
                .send()
                .await
                .is_err(),
            "stale prefixed object was not pruned"
        );
        ensure!(
            get_bytes(client, bucket, "outside-prefix.txt").await? == b"keep".to_vec(),
            "object outside destination prefix was modified"
        );

        let listed = list_keys(client, bucket, &format!("{prefix}/")).await?;
        ensure!(
            listed.len() == file_count + 1,
            "destination prefix contained {} objects, expected {}",
            listed.len(),
            file_count + 1
        );

        Ok(())
    }

    async fn list_keys(client: &S3Client, bucket: &str, prefix: &str) -> Result<Vec<String>> {
        let mut keys = Vec::new();
        let mut continuation_token = None;
        loop {
            let response = client
                .list_objects_v2()
                .bucket(bucket)
                .prefix(prefix)
                .set_continuation_token(continuation_token.take())
                .send()
                .await?;
            keys.extend(
                response
                    .contents()
                    .iter()
                    .filter_map(|object| object.key())
                    .map(ToOwned::to_owned),
            );
            if !response.is_truncated().unwrap_or(false) {
                return Ok(keys);
            }
            continuation_token = response.next_continuation_token().map(ToOwned::to_owned);
        }
    }

    fn generated_plain_zip(file_count: usize) -> Result<Bytes> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        for index in 0..file_count {
            writer.start_file(format!("files/{index:05}.txt"), options)?;
            writer.write_all(&generated_file_bytes(index))?;
        }
        Ok(Bytes::from(writer.finish()?.into_inner()))
    }

    fn marker_zip() -> Result<Bytes> {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        let options =
            SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
        writer.start_file("config.json", options)?;
        writer.write_all(br#"{"api":"__API_URL__"}"#)?;
        Ok(Bytes::from(writer.finish()?.into_inner()))
    }

    fn generated_file_bytes(index: usize) -> Vec<u8> {
        format!("generated integration file {index:05}\n")
            .repeat(4)
            .into_bytes()
    }

    fn marker_map() -> HashMap<String, String> {
        HashMap::from([(
            "__API_URL__".to_string(),
            "https://example.test".to_string(),
        )])
    }

    fn env_usize(name: &str, default_value: usize) -> Result<usize> {
        match env::var(name) {
            Ok(raw) => raw
                .parse::<usize>()
                .with_context(|| format!("{name} must be a positive integer")),
            Err(env::VarError::NotPresent) => Ok(default_value),
            Err(error) => Err(error).with_context(|| format!("failed to read {name}")),
        }
    }
}
