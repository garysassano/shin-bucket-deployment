use std::time::Duration;

use anyhow::{Context, Result, anyhow, ensure};
use aws_sdk_cloudfront::error::ProvideErrorMetadata;
use aws_sdk_cloudfront::types::{InvalidationBatch, Paths};
use tokio::time::{Instant, sleep_until, timeout_at};

use crate::types::AppState;

const INVALIDATION_POLL_INTERVAL: Duration = Duration::from_secs(20);
const MAX_INVALIDATION_PATH_CHARACTERS: usize = 4_000;

pub(crate) async fn invalidate(
    state: &AppState,
    distribution_id: &str,
    distribution_paths: &[String],
    wait_for_completion: bool,
    caller_reference: &str,
    missing_distribution_is_success: bool,
    deadline: Instant,
) -> Result<()> {
    let quantity = validate_invalidation_paths(distribution_paths)?;
    let batch = InvalidationBatch::builder()
        .caller_reference(caller_reference)
        .paths(
            Paths::builder()
                .quantity(quantity)
                .set_items(Some(distribution_paths.to_vec()))
                .build()?,
        )
        .build()?;

    let response = match timeout_at(
        deadline,
        state
            .cloudfront
            .create_invalidation()
            .distribution_id(distribution_id)
            .invalidation_batch(batch)
            .send(),
    )
    .await
    .context("CloudFront invalidation creation exceeded the deployment work deadline")?
    {
        Ok(response) => response,
        Err(error)
            if missing_distribution_is_success
                && error
                    .as_service_error()
                    .and_then(ProvideErrorMetadata::code)
                    == Some("NoSuchDistribution") =>
        {
            return Ok(());
        }
        Err(error) => return Err(error.into()),
    };

    if !wait_for_completion {
        return Ok(());
    }

    let invalidation_id = response
        .invalidation()
        .map(|invalidation| invalidation.id().to_string())
        .ok_or_else(|| anyhow!("CreateInvalidation response did not include an invalidation id"))?;

    loop {
        let status = match timeout_at(
            deadline,
            state
                .cloudfront
                .get_invalidation()
                .distribution_id(distribution_id)
                .id(&invalidation_id)
                .send(),
        )
        .await
        .context("CloudFront invalidation polling exceeded the deployment work deadline")?
        {
            Ok(status) => status,
            Err(error)
                if missing_distribution_is_success
                    && error
                        .as_service_error()
                        .and_then(ProvideErrorMetadata::code)
                        == Some("NoSuchDistribution") =>
            {
                return Ok(());
            }
            Err(error) => return Err(error.into()),
        };

        let completed = status
            .invalidation()
            .map(|invalidation| invalidation.status().eq_ignore_ascii_case("Completed"))
            .unwrap_or(false);

        if completed {
            return Ok(());
        }

        let next_poll = next_poll_at(Instant::now(), deadline)?;
        sleep_until(next_poll).await;
    }
}

fn next_poll_at(now: Instant, deadline: Instant) -> Result<Instant> {
    ensure!(
        now < deadline,
        "CloudFront invalidation polling exceeded the deployment work deadline"
    );
    let next_poll = now
        .checked_add(INVALIDATION_POLL_INTERVAL)
        .unwrap_or(deadline);
    ensure!(
        next_poll < deadline,
        "CloudFront invalidation did not complete before the deployment work deadline"
    );
    Ok(next_poll)
}

pub(crate) fn validate_invalidation_paths(paths: &[String]) -> Result<i32> {
    ensure!(
        !paths.is_empty(),
        "CloudFront invalidation requires at least one path"
    );
    let quantity = invalidation_quantity(paths.len())?;

    for (index, path) in paths.iter().enumerate() {
        ensure!(
            path.starts_with('/'),
            "CloudFront invalidation path {} must start with `/`",
            index + 1
        );
        let characters = path.chars().count();
        ensure!(
            characters <= MAX_INVALIDATION_PATH_CHARACTERS,
            "CloudFront invalidation path {} is {characters} characters; the maximum is {MAX_INVALIDATION_PATH_CHARACTERS}",
            index + 1
        );
    }

    Ok(quantity)
}

fn invalidation_quantity(path_count: usize) -> Result<i32> {
    i32::try_from(path_count).context(
        "CloudFront invalidation path count exceeds the signed 32-bit Quantity field limit",
    )
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tokio::time::Instant;

    use super::{
        INVALIDATION_POLL_INTERVAL, MAX_INVALIDATION_PATH_CHARACTERS, invalidation_quantity,
        next_poll_at, validate_invalidation_paths,
    };

    #[test]
    fn invalidation_paths_accept_the_documented_maximum_length() {
        let path = format!("/{}", "a".repeat(MAX_INVALIDATION_PATH_CHARACTERS - 1));

        assert_eq!(validate_invalidation_paths(&[path]).expect("valid path"), 1);
    }

    #[test]
    fn invalidation_paths_reject_empty_missing_slash_and_oversized_values() {
        assert!(validate_invalidation_paths(&[]).is_err());
        assert!(validate_invalidation_paths(&["index.html".to_string()]).is_err());

        let path = format!("/{}", "a".repeat(MAX_INVALIDATION_PATH_CHARACTERS));
        assert!(validate_invalidation_paths(&[path]).is_err());
    }

    #[test]
    fn invalidation_path_count_must_fit_the_serialized_quantity_field() {
        assert_eq!(
            invalidation_quantity(i32::MAX as usize).expect("valid count"),
            i32::MAX
        );
        assert!(invalidation_quantity(i32::MAX as usize + 1).is_err());
    }

    #[test]
    fn invalidation_polling_never_sleeps_to_or_past_the_work_deadline() {
        let now = Instant::now();
        assert_eq!(
            next_poll_at(
                now,
                now + INVALIDATION_POLL_INTERVAL + Duration::from_secs(1)
            )
            .expect("room for another poll"),
            now + INVALIDATION_POLL_INTERVAL
        );
        assert!(next_poll_at(now, now + INVALIDATION_POLL_INTERVAL).is_err());
        assert!(next_poll_at(now, now).is_err());
    }
}
