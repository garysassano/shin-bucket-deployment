use std::sync::{Arc, OnceLock};
use std::time::{Duration, SystemTime};

use tokio::time::Instant;

/// Time kept exclusively for serializing and delivering the CloudFormation
/// callback after deployment work has stopped.
pub(crate) const CALLBACK_RESERVE: Duration = Duration::from_secs(45);

/// Maximum time allowed for spawned tasks to observe cancellation and join.
const TASK_DRAIN_TIMEOUT: Duration = Duration::from_secs(5);

/// Time between the child-task drain deadline and the request-processing
/// backstop. This lets cleanup futures return and drop their task sets before
/// the outer timeout can cancel the cleanup itself.
const TASK_DRAIN_BACKSTOP_GUARD: Duration = Duration::from_secs(1);

#[derive(Clone, Copy, Debug)]
pub(crate) struct InvocationDeadlines {
    work: Instant,
    task_drain: Instant,
    drain: Instant,
    callback: Instant,
}

#[derive(Clone, Debug)]
pub(crate) struct TaskDrainBudget {
    final_deadline: Instant,
    started_deadline: Arc<OnceLock<Instant>>,
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

    /// Final request-processing backstop before callback-only time begins.
    pub(crate) fn drain(self) -> Instant {
        self.drain
    }

    /// Absolute deadline for callback retries.
    pub(crate) fn callback(self) -> Instant {
        self.callback
    }

    pub(crate) fn task_drain_budget(self) -> TaskDrainBudget {
        TaskDrainBudget {
            final_deadline: self.task_drain,
            started_deadline: Arc::new(OnceLock::new()),
        }
    }

    pub(crate) fn from_remaining_at(now: Instant, remaining: Duration) -> Self {
        let callback = now.checked_add(remaining).unwrap_or(now);
        let drain = callback
            .checked_sub(CALLBACK_RESERVE)
            .unwrap_or(now)
            .max(now);
        let task_drain = drain
            .checked_sub(TASK_DRAIN_BACKSTOP_GUARD)
            .unwrap_or(now)
            .max(now);
        let work = task_drain
            .checked_sub(TASK_DRAIN_TIMEOUT)
            .unwrap_or(now)
            .max(now);

        Self {
            work,
            task_drain,
            drain,
            callback,
        }
    }
}

impl TaskDrainBudget {
    /// Starts the task-drain window once and shares the same absolute deadline
    /// across every cleanup phase.
    pub(crate) fn deadline(&self) -> Instant {
        *self.started_deadline.get_or_init(|| {
            Instant::now()
                .checked_add(TASK_DRAIN_TIMEOUT)
                .unwrap_or(self.final_deadline)
                .min(self.final_deadline)
        })
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use tokio::time::Instant;

    use super::{
        CALLBACK_RESERVE, InvocationDeadlines, TASK_DRAIN_BACKSTOP_GUARD, TASK_DRAIN_TIMEOUT,
    };

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
            deadlines.task_drain.duration_since(now),
            Duration::from_secs(74)
        );
        assert_eq!(
            deadlines.work().duration_since(now),
            Duration::from_secs(69)
        );
        assert_eq!(CALLBACK_RESERVE, Duration::from_secs(45));
        assert_eq!(TASK_DRAIN_TIMEOUT, Duration::from_secs(5));
        assert_eq!(TASK_DRAIN_BACKSTOP_GUARD, Duration::from_secs(1));
    }

    #[test]
    fn an_already_short_invocation_skips_work_but_keeps_callback_time() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(10));

        assert_eq!(deadlines.work(), now);
        assert_eq!(deadlines.task_drain, now);
        assert_eq!(deadlines.drain(), now);
        assert_eq!(
            deadlines.callback().duration_since(now),
            Duration::from_secs(10)
        );
    }

    #[tokio::test(start_paused = true)]
    async fn task_drain_budget_is_shared_across_cleanup_phases() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(120));
        let first_phase = deadlines.task_drain_budget();
        let later_phase = first_phase.clone();

        let drain_deadline = first_phase.deadline();
        assert_eq!(drain_deadline.duration_since(now), TASK_DRAIN_TIMEOUT);

        tokio::time::advance(Duration::from_secs(3)).await;

        assert_eq!(later_phase.deadline(), drain_deadline);
        assert_eq!(
            drain_deadline.duration_since(Instant::now()),
            Duration::from_secs(2)
        );
    }

    #[tokio::test(start_paused = true)]
    async fn task_drain_finishes_before_the_outer_processing_backstop() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(120));

        tokio::time::advance(deadlines.work().duration_since(now)).await;
        let task_drain_deadline = deadlines.task_drain_budget().deadline();

        assert_eq!(task_drain_deadline, deadlines.task_drain);
        assert_eq!(
            deadlines.drain().duration_since(task_drain_deadline),
            TASK_DRAIN_BACKSTOP_GUARD
        );
    }

    #[test]
    fn task_drain_budget_never_consumes_the_callback_reserve() {
        let now = Instant::now();
        let deadlines = InvocationDeadlines::from_remaining_at(now, Duration::from_secs(48));
        let drain_budget = deadlines.task_drain_budget();

        assert_eq!(
            drain_budget.deadline().duration_since(now),
            Duration::from_secs(2)
        );
        assert_eq!(
            deadlines.drain().duration_since(drain_budget.deadline()),
            TASK_DRAIN_BACKSTOP_GUARD
        );
    }
}
