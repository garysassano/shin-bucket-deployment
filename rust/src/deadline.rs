use std::time::{Duration, SystemTime};

use tokio::time::Instant;

/// Time kept exclusively for serializing and delivering the CloudFormation
/// callback after deployment work has stopped.
pub(crate) const CALLBACK_RESERVE: Duration = Duration::from_secs(45);

/// Maximum time allowed for spawned tasks to observe cancellation and join.
const TASK_DRAIN_TIMEOUT: Duration = Duration::from_secs(5);

#[derive(Clone, Copy, Debug)]
pub(crate) struct InvocationDeadlines {
    work: Instant,
    drain: Instant,
    callback: Instant,
}

impl InvocationDeadlines {
    pub(crate) fn from_lambda_deadline(deadline: SystemTime) -> Self {
        // Capture the monotonic clock first so conversion skew can only make
        // the derived deadline earlier than Lambda's wall-clock deadline.
        let now = Instant::now();
        let remaining = deadline
            .duration_since(SystemTime::now())
            .unwrap_or(Duration::ZERO);
        Self::from_remaining_at(now, remaining)
    }

    /// Deadline for starting or continuing S3 and CloudFront work.
    pub(crate) fn work(self) -> Instant {
        self.work
    }

    /// Final deadline for cancelling and joining spawned work.
    pub(crate) fn drain(self) -> Instant {
        self.drain
    }

    /// Absolute deadline for callback retries.
    pub(crate) fn callback(self) -> Instant {
        self.callback
    }

    /// Bounds an early failure drain without consuming the callback reserve.
    pub(crate) fn bounded_drain(self) -> Instant {
        Instant::now()
            .checked_add(TASK_DRAIN_TIMEOUT)
            .unwrap_or(self.drain)
            .min(self.drain)
    }

    pub(crate) fn from_remaining_at(now: Instant, remaining: Duration) -> Self {
        let callback = now.checked_add(remaining).unwrap_or(now);
        let drain = callback
            .checked_sub(CALLBACK_RESERVE)
            .unwrap_or(now)
            .max(now);
        let work = drain
            .checked_sub(TASK_DRAIN_TIMEOUT)
            .unwrap_or(now)
            .max(now);

        Self {
            work,
            drain,
            callback,
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tokio::time::Instant;

    use super::{CALLBACK_RESERVE, InvocationDeadlines, TASK_DRAIN_TIMEOUT};

    #[test]
    fn reserves_drain_and_callback_windows() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(120));

        assert_eq!(
            deadlines.callback().duration_since(now),
            Duration::from_secs(120)
        );
        assert_eq!(
            deadlines.drain().duration_since(now),
            Duration::from_secs(75)
        );
        assert_eq!(
            deadlines.work().duration_since(now),
            Duration::from_secs(70)
        );
        assert_eq!(CALLBACK_RESERVE, Duration::from_secs(45));
        assert_eq!(TASK_DRAIN_TIMEOUT, Duration::from_secs(5));
    }

    #[test]
    fn an_already_short_invocation_skips_work_but_keeps_callback_time() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(10));

        assert_eq!(deadlines.work(), now);
        assert_eq!(deadlines.drain(), now);
        assert_eq!(
            deadlines.callback().duration_since(now),
            Duration::from_secs(10)
        );
    }
}
