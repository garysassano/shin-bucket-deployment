use std::time::Duration;

use anyhow::{Result, anyhow};
use aws_sdk_cloudfront::types::{InvalidationBatch, Paths};
use tokio::time::sleep;
use uuid::Uuid;

use crate::types::AppState;

pub(crate) async fn invalidate(
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
