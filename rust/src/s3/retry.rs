use std::sync::Mutex;
use std::time::Duration;

use fastrand::Rng;
use tokio::time::{Instant, sleep_until};

use crate::deployment::{PutObjectRetryJitter, PutObjectRetryOptions};

/// Receives retry timing events without coupling the shared coordinator to an
/// operation's diagnostics storage.
///
/// Write and delete retries intentionally publish to different summary sections
/// and retain their existing accounting boundaries. Every method is required so
/// adding an event cannot silently leave one operation's telemetry behind.
pub(super) trait RetryDiagnostics: Sync {
    /// One retry decision, before checking whether its delay fits the deadline.
    fn record_retry(&self, throttled: bool);

    /// One completed non-throttled backoff sleep.
    fn record_retry_wait(&self, delay: Duration);

    /// One actual sleep while following the shared throttle deadline.
    fn record_throttle_cooldown_sleep(&self, delay: Duration);

    /// The complete wait made by one throttled retry decision.
    fn record_throttle_retry_wait(&self, elapsed: Duration);
}

/// Shared mutable state and wait policy for destination retries.
pub(super) struct RetryCoordinator {
    throttle_until: Mutex<Option<Instant>>,
    jitter: Mutex<Rng>,
}

impl RetryCoordinator {
    pub(super) fn new() -> Self {
        Self {
            throttle_until: Mutex::new(None),
            jitter: Mutex::new(Rng::new()),
        }
    }

    pub(super) async fn wait_for_retry_before_deadline<D: RetryDiagnostics + ?Sized>(
        &self,
        diagnostics: &D,
        retry: &PutObjectRetryOptions,
        attempt: usize,
        throttled: bool,
        work_deadline: Instant,
    ) -> bool {
        diagnostics.record_retry(throttled);
        let delay = self.retry_delay(attempt, throttled, retry);
        if throttled {
            self.extend_throttle_cooldown(delay);
            let started = Instant::now();
            let proceeded = self
                .wait_for_throttle_cooldown_before_deadline(diagnostics, work_deadline)
                .await;
            diagnostics.record_throttle_retry_wait(started.elapsed());
            proceeded
        } else {
            let Some(wake) = retry_wake_before_deadline(Instant::now(), delay, work_deadline)
            else {
                return false;
            };
            sleep_until(wake).await;
            diagnostics.record_retry_wait(delay);
            true
        }
    }

    pub(super) async fn wait_for_throttle_cooldown_before_deadline<D: RetryDiagnostics + ?Sized>(
        &self,
        diagnostics: &D,
        work_deadline: Instant,
    ) -> bool {
        loop {
            let wait = {
                let throttle_until = self
                    .throttle_until
                    .lock()
                    .expect("retry coordinator throttle mutex should not be poisoned");
                throttle_until.and_then(|deadline| {
                    deadline
                        .checked_duration_since(Instant::now())
                        .map(|delay| (deadline, delay))
                })
            };
            let Some((wake, delay)) = wait else {
                return true;
            };
            if delay.is_zero() {
                return true;
            }
            if wake >= work_deadline {
                return false;
            }

            sleep_until(wake).await;
            diagnostics.record_throttle_cooldown_sleep(delay);
        }
    }

    pub(super) fn retry_delay(
        &self,
        attempt: usize,
        throttled: bool,
        retry: &PutObjectRetryOptions,
    ) -> Duration {
        let cap_millis = retry_cap_millis(attempt, throttled, retry);
        match retry.jitter {
            PutObjectRetryJitter::Full => full_jitter_delay(cap_millis, self.next_jitter()),
            PutObjectRetryJitter::None => Duration::from_millis(cap_millis),
        }
    }

    pub(super) fn extend_throttle_cooldown(&self, delay: Duration) {
        if delay.is_zero() {
            return;
        }

        let now = Instant::now();
        let deadline = now.checked_add(delay).unwrap_or(now);
        let mut throttle_until = self
            .throttle_until
            .lock()
            .expect("retry coordinator throttle mutex should not be poisoned");
        if throttle_until.is_none_or(|current| deadline > current) {
            *throttle_until = Some(deadline);
        }
    }

    fn next_jitter(&self) -> u64 {
        self.jitter
            .lock()
            .expect("retry coordinator jitter mutex should not be poisoned")
            .u64(..)
    }
}

pub(super) fn retry_cap_millis(
    attempt: usize,
    throttled: bool,
    retry: &PutObjectRetryOptions,
) -> u64 {
    let (base, max) = if throttled {
        (
            retry.slowdown_retry_base_delay_ms,
            retry.slowdown_retry_max_delay_ms,
        )
    } else {
        (retry.retry_base_delay_ms, retry.retry_max_delay_ms)
    };
    capped_exponential_backoff_millis(attempt, base, max)
}

/// Returns `base_millis * 2^(attempt - 1)`, clamped to `max_millis` and
/// saturating throughout. Retry loops number their first retry from one; zero is
/// treated the same as one so an invalid caller cannot underflow the exponent.
pub(super) fn capped_exponential_backoff_millis(
    attempt: usize,
    base_millis: u64,
    max_millis: u64,
) -> u64 {
    let shift = u32::try_from(attempt.saturating_sub(1)).unwrap_or(u32::MAX);
    let multiplier = 1_u64.checked_shl(shift).unwrap_or(u64::MAX);
    base_millis.saturating_mul(multiplier).min(max_millis)
}

/// Maps an arbitrary random sample into `0..=cap_millis` for the configured
/// delay ranges. Supplying the sample keeps this primitive pure and
/// makes every boundary deterministic in tests.
pub(super) fn full_jitter_delay(cap_millis: u64, sample: u64) -> Duration {
    if cap_millis == 0 {
        return Duration::ZERO;
    }
    Duration::from_millis(sample % cap_millis.saturating_add(1))
}

/// Returns the retry wake instant only when the complete delay fits strictly
/// before the work deadline. Waking exactly at the deadline leaves no time for
/// the request and is therefore rejected.
pub(super) fn retry_wake_before_deadline(
    now: Instant,
    delay: Duration,
    work_deadline: Instant,
) -> Option<Instant> {
    now.checked_add(delay).filter(|wake| *wake < work_deadline)
}

pub(super) fn is_retryable_http_status(status: u16) -> bool {
    status == 408 || status == 429 || status >= 500
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use fastrand::Rng;
    use proptest::prelude::*;
    use tokio::time::Instant;

    use super::{
        capped_exponential_backoff_millis, full_jitter_delay, is_retryable_http_status,
        retry_wake_before_deadline,
    };

    #[test]
    fn retry_attempts_start_at_one_and_saturate_without_wrapping() {
        assert_eq!(capped_exponential_backoff_millis(0, 100, 1_000), 100);
        assert_eq!(capped_exponential_backoff_millis(1, 100, 1_000), 100);
        assert_eq!(capped_exponential_backoff_millis(2, 100, 1_000), 200);
        assert_eq!(capped_exponential_backoff_millis(4, 100, 1_000), 800);
        assert_eq!(capped_exponential_backoff_millis(5, 100, 1_000), 1_000);
        assert_eq!(
            capped_exponential_backoff_millis(usize::MAX, u64::MAX, u64::MAX),
            u64::MAX
        );
    }

    #[test]
    fn full_jitter_includes_zero_and_the_configured_cap() {
        assert_eq!(full_jitter_delay(0, u64::MAX), Duration::ZERO);
        assert_eq!(full_jitter_delay(100, 0), Duration::ZERO);
        assert_eq!(full_jitter_delay(100, 100), Duration::from_millis(100));
        assert_eq!(full_jitter_delay(100, 201), Duration::from_millis(100));
    }

    #[test]
    fn seeded_jitter_sampling_is_reproducible() {
        let mut first = Rng::with_seed(0x4d59_5df4_d0f3_3173);
        let mut second = Rng::with_seed(0x4d59_5df4_d0f3_3173);
        let first_delays = (0..32)
            .map(|_| full_jitter_delay(1_000, first.u64(..)))
            .collect::<Vec<_>>();
        let second_delays = (0..32)
            .map(|_| full_jitter_delay(1_000, second.u64(..)))
            .collect::<Vec<_>>();

        assert_eq!(first_delays, second_delays);
        assert!(
            first_delays
                .iter()
                .all(|delay| *delay <= Duration::from_millis(1_000))
        );
    }

    #[test]
    fn retry_wake_must_leave_time_before_the_deadline() {
        let now = Instant::now();
        let deadline = now + Duration::from_millis(10);

        assert_eq!(
            retry_wake_before_deadline(now, Duration::from_millis(9), deadline),
            Some(now + Duration::from_millis(9))
        );
        assert_eq!(
            retry_wake_before_deadline(now, Duration::from_millis(10), deadline),
            None
        );
        assert_eq!(
            retry_wake_before_deadline(now, Duration::from_millis(11), deadline),
            None
        );
    }

    #[test]
    fn retryable_http_status_boundaries_are_explicit() {
        for status in [408, 429, 500, 503, 599] {
            assert!(is_retryable_http_status(status), "status {status}");
        }
        for status in [200, 400, 407, 409, 412, 428, 430, 499] {
            assert!(!is_retryable_http_status(status), "status {status}");
        }
    }

    proptest! {
        #[test]
        fn capped_backoff_is_bounded_and_monotonic(
            attempt in any::<usize>(),
            base_millis in any::<u64>(),
            max_millis in any::<u64>(),
        ) {
            let cap = capped_exponential_backoff_millis(attempt, base_millis, max_millis);
            let next_cap = capped_exponential_backoff_millis(
                attempt.saturating_add(1),
                base_millis,
                max_millis,
            );

            prop_assert!(cap <= max_millis);
            prop_assert!(next_cap >= cap);
        }

        #[test]
        fn full_jitter_never_exceeds_its_cap(cap_millis in any::<u64>(), sample in any::<u64>()) {
            prop_assert!(full_jitter_delay(cap_millis, sample) <= Duration::from_millis(cap_millis));
        }
    }
}
