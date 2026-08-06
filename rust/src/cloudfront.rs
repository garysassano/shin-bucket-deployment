use std::time::Duration;

use anyhow::{Context, Result, anyhow, ensure};
use aws_sdk_cloudfront::error::ProvideErrorMetadata;
use aws_sdk_cloudfront::types::{InvalidationBatch, Paths};
use tokio::time::{Instant, sleep_until, timeout_at};

use crate::types::AppState;

const INVALIDATION_POLL_INTERVAL: Duration = Duration::from_secs(20);
/// Jitter added to each poll so that stacks deploying many distributions at once do not
/// settle into one synchronized 20-second GetInvalidation cadence.
const INVALIDATION_POLL_JITTER: Duration = Duration::from_secs(5);
const MAX_INVALIDATION_PATH_CHARACTERS: usize = 4_000;
/// CloudFront's documented per-invalidation-batch path limit. See
/// .plans/plan-consolidated.md T-5; the construct enforces the same bound at synthesis.
const MAX_INVALIDATION_PATHS: usize = 3_000;
/// CloudFront's documented per-invalidation-batch wildcard-path limit. A wildcard path
/// is one whose final character is `*`.
const MAX_WILDCARD_INVALIDATION_PATHS: usize = 15;

/// An invalidation created by [`create_invalidation`], ready to be awaited by
/// [`wait_for_invalidation`]. Splitting creation from the completion wait lets a
/// deployment create invalidations for several distributions up front and then
/// `join!`/`try_join!` the waits so they overlap instead of serializing.
pub(crate) struct CreatedInvalidation {
    distribution_id: String,
    invalidation_id: String,
    missing_distribution_is_success: bool,
}

/// Creates one CloudFront invalidation. Returns `None` when the caller does not want
/// to wait for completion (the id is then not needed), or when `NoSuchDistribution`
/// is treated as success for `missing_distribution_is_success`.
pub(crate) async fn create_invalidation(
    state: &AppState,
    distribution_id: &str,
    distribution_paths: &[String],
    wait_for_completion: bool,
    caller_reference: &str,
    missing_distribution_is_success: bool,
    deadline: Instant,
) -> Result<Option<CreatedInvalidation>> {
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
            return Ok(None);
        }
        Err(error) => return Err(error.into()),
    };

    if !wait_for_completion {
        return Ok(None);
    }

    let invalidation_id = response
        .invalidation()
        .map(|invalidation| invalidation.id().to_string())
        .ok_or_else(|| anyhow!("CreateInvalidation response did not include an invalidation id"))?;

    Ok(Some(CreatedInvalidation {
        distribution_id: distribution_id.to_string(),
        invalidation_id,
        missing_distribution_is_success,
    }))
}

/// Polls a previously created invalidation until CloudFront reports it `Completed`.
/// Several of these waits may run concurrently against the same work deadline.
pub(crate) async fn wait_for_invalidation(
    state: &AppState,
    created: CreatedInvalidation,
    deadline: Instant,
) -> Result<()> {
    loop {
        // Poll after waiting, not before. CreateInvalidation always returns `InProgress`,
        // so the pre-existing immediate first poll was a guaranteed-useless round trip.
        sleep_until(next_poll_at(Instant::now(), deadline)?).await;

        let status = match timeout_at(
            deadline,
            state
                .cloudfront
                .get_invalidation()
                .distribution_id(&created.distribution_id)
                .id(&created.invalidation_id)
                .send(),
        )
        .await
        .context("CloudFront invalidation polling exceeded the deployment work deadline")?
        {
            Ok(status) => status,
            Err(error)
                if created.missing_distribution_is_success
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
    }
}

fn next_poll_at(now: Instant, deadline: Instant) -> Result<Instant> {
    ensure!(
        now < deadline,
        "CloudFront invalidation polling exceeded the deployment work deadline"
    );
    let next_poll = now.checked_add(poll_interval()).unwrap_or(deadline);
    ensure!(
        next_poll < deadline,
        "CloudFront invalidation did not complete before the deployment work deadline"
    );
    Ok(next_poll)
}

fn poll_interval() -> Duration {
    INVALIDATION_POLL_INTERVAL
        + Duration::from_millis(fastrand::u64(
            0..=INVALIDATION_POLL_JITTER.as_millis() as u64,
        ))
}

pub(crate) fn validate_invalidation_paths(paths: &[String]) -> Result<i32> {
    ensure!(
        !paths.is_empty(),
        "CloudFront invalidation requires at least one path"
    );
    ensure!(
        paths.len() <= MAX_INVALIDATION_PATHS,
        "CloudFront invalidation exceeds the maximum of {MAX_INVALIDATION_PATHS} paths"
    );
    let wildcard_path_count = paths.iter().filter(|path| path.ends_with('*')).count();
    ensure!(
        wildcard_path_count <= MAX_WILDCARD_INVALIDATION_PATHS,
        "CloudFront invalidation exceeds the maximum of {MAX_WILDCARD_INVALIDATION_PATHS} wildcard paths"
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
        ensure!(
            !path.chars().any(char::is_control),
            "CloudFront invalidation path {} contains a control character",
            index + 1
        );
        ensure!(
            !contains_unsupported_tilde(path),
            "CloudFront invalidation path {} contains `~`, which CloudFront does not support for invalidations, URL-encoded or not",
            index + 1
        );
    }

    Ok(quantity)
}

/// CloudFront documents `~` as unsupported in invalidation paths "whether it's
/// URL-encoded or not", so the percent-encoded spellings are equally unsupported.
///
/// This runs in the provider as well as at synth because protocol callers reach the
/// custom resource directly and never see the construct's validation.
fn contains_unsupported_tilde(path: &str) -> bool {
    path.contains('~')
        || path.as_bytes().windows(3).any(|window| {
            window[0] == b'%' && window[1] == b'7' && window[2].eq_ignore_ascii_case(&b'e')
        })
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
        INVALIDATION_POLL_INTERVAL, INVALIDATION_POLL_JITTER, MAX_INVALIDATION_PATH_CHARACTERS,
        MAX_INVALIDATION_PATHS, MAX_WILDCARD_INVALIDATION_PATHS, invalidation_quantity,
        next_poll_at, poll_interval, validate_invalidation_paths,
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
    fn invalidation_paths_reject_the_tilde_in_every_spelling() {
        // CloudFront: "Don't use the `~` character in your path. CloudFront doesn't
        // support this character for invalidations, whether it's URL-encoded or not."
        for path in ["/~user/*", "/a/%7Euser/*", "/a/%7euser/*", "/trailing~"] {
            assert!(
                validate_invalidation_paths(&[path.to_string()]).is_err(),
                "`{path}` must be rejected"
            );
        }

        // A percent sequence that merely looks similar stays valid.
        assert_eq!(
            validate_invalidation_paths(&["/a/%7Db/*".to_string()]).expect("valid path"),
            1
        );
        assert_eq!(
            validate_invalidation_paths(&["/a/%7.txt".to_string()]).expect("valid path"),
            1
        );
    }

    #[test]
    fn invalidation_paths_reject_control_characters() {
        for path in ["/line\nbreak", "/delete\u{7f}", "/c1\u{85}"] {
            assert!(
                validate_invalidation_paths(&[path.to_string()]).is_err(),
                "`{path:?}` must be rejected"
            );
        }
    }

    #[test]
    fn invalidation_paths_enforce_the_documented_batch_limits() {
        let max_paths = vec!["/a".to_string(); MAX_INVALIDATION_PATHS];
        assert_eq!(
            validate_invalidation_paths(&max_paths).expect("valid path count"),
            MAX_INVALIDATION_PATHS as i32
        );

        let too_many_paths = vec!["/a".to_string(); MAX_INVALIDATION_PATHS + 1];
        assert!(validate_invalidation_paths(&too_many_paths).is_err());

        let max_wildcards = vec!["/*".to_string(); MAX_WILDCARD_INVALIDATION_PATHS];
        assert_eq!(
            validate_invalidation_paths(&max_wildcards).expect("valid wildcard count"),
            MAX_WILDCARD_INVALIDATION_PATHS as i32
        );

        let too_many_wildcards = vec!["/*".to_string(); MAX_WILDCARD_INVALIDATION_PATHS + 1];
        assert!(validate_invalidation_paths(&too_many_wildcards).is_err());

        // `*` anywhere but the final character is a literal, not a wildcard path.
        let literal_stars = vec!["/a*b".to_string(); MAX_WILDCARD_INVALIDATION_PATHS + 1];
        assert!(validate_invalidation_paths(&literal_stars).is_ok());
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
        let generous_deadline =
            now + INVALIDATION_POLL_INTERVAL + INVALIDATION_POLL_JITTER + Duration::from_secs(1);
        let next = next_poll_at(now, generous_deadline).expect("room for another poll");

        assert!(next >= now + INVALIDATION_POLL_INTERVAL);
        assert!(next <= now + INVALIDATION_POLL_INTERVAL + INVALIDATION_POLL_JITTER);
        // The jitter only ever delays a poll, so the un-jittered interval is still the
        // earliest possible wake-up and remains a valid deadline boundary.
        assert!(next_poll_at(now, now + INVALIDATION_POLL_INTERVAL).is_err());
        assert!(next_poll_at(now, now).is_err());
    }

    #[test]
    fn invalidation_poll_interval_stays_within_its_jitter_band() {
        for _ in 0..64 {
            let interval = poll_interval();
            assert!(interval >= INVALIDATION_POLL_INTERVAL);
            assert!(interval <= INVALIDATION_POLL_INTERVAL + INVALIDATION_POLL_JITTER);
        }
    }
}
