use std::future::Future;
use std::panic::AssertUnwindSafe;
use std::sync::{Arc, Mutex};

use anyhow::{Context, Result, anyhow};
use futures_util::FutureExt;
use tokio::task::JoinSet;
use tokio::time::timeout_at;

use crate::deadline::InvocationDeadlines;
use crate::types::DeploymentStats;

pub(super) struct TransferScheduler {
    tasks: JoinSet<TransferTaskCompletion>,
    max_in_flight: usize,
    in_flight: usize,
    admission_gate: Arc<TransferAdmissionGate>,
    stats: Arc<DeploymentStats>,
    deadlines: InvocationDeadlines,
}

#[derive(Default)]
struct TransferAdmissionGate {
    failed: Mutex<bool>,
}

struct TransferTaskCompletion {
    result: Result<()>,
    panicked: bool,
}

impl TransferScheduler {
    pub(super) fn new(
        max_in_flight: usize,
        stats: Arc<DeploymentStats>,
        deadlines: InvocationDeadlines,
    ) -> Self {
        Self {
            tasks: JoinSet::new(),
            max_in_flight: max_in_flight.max(1),
            in_flight: 0,
            admission_gate: Arc::new(TransferAdmissionGate::default()),
            stats,
            deadlines,
        }
    }

    pub(super) async fn spawn(
        &mut self,
        task: impl Future<Output = Result<()>> + Send + 'static,
    ) -> Result<()> {
        self.drain_ready().await?;
        while self.in_flight >= self.max_in_flight {
            self.join_one().await?;
            self.drain_ready().await?;
        }

        // Failure publication and task admission share this lock, which gives them one
        // ordering and closes the check-then-spawn race.
        let admission_gate = Arc::clone(&self.admission_gate);
        let task_admission_gate = Arc::clone(&admission_gate);
        let admitted = admission_gate.try_admit(|| {
            self.in_flight += 1;
            self.stats.add_transfer_scheduled_object(self.in_flight);
            self.tasks.spawn(async move {
                match AssertUnwindSafe(task).catch_unwind().await {
                    Ok(result) => {
                        if result.is_err() {
                            task_admission_gate.mark_failed();
                        }
                        TransferTaskCompletion {
                            result,
                            panicked: false,
                        }
                    }
                    Err(_) => {
                        task_admission_gate.mark_failed();
                        TransferTaskCompletion {
                            result: Err(anyhow!("transfer task panicked")),
                            panicked: true,
                        }
                    }
                }
            });
        });
        if admitted {
            Ok(())
        } else {
            self.surface_recorded_failure().await
        }
    }

    pub(super) async fn finish(mut self) -> Result<()> {
        while self.in_flight > 0 {
            self.join_one().await?;
        }
        Ok(())
    }

    async fn drain_ready(&mut self) -> Result<()> {
        while let Some(result) = self.tasks.try_join_next() {
            self.handle_join_or_abort(result).await?;
        }
        Ok(())
    }

    async fn join_one(&mut self) -> Result<()> {
        let joined = match timeout_at(self.deadlines.work(), self.tasks.join_next()).await {
            Ok(Some(joined)) => joined,
            Ok(None) => {
                self.in_flight = 0;
                return Ok(());
            }
            Err(_) => {
                self.abort_and_drain().await?;
                return Err(transfer_deadline_error());
            }
        };
        self.handle_join_or_abort(joined).await
    }

    async fn surface_recorded_failure(&mut self) -> Result<()> {
        while self.in_flight > 0 {
            self.join_one().await?;
        }
        Err(anyhow!(
            "transfer admission closed without a retained failed task result"
        ))
    }

    async fn handle_join_or_abort(
        &mut self,
        joined: std::result::Result<TransferTaskCompletion, tokio::task::JoinError>,
    ) -> Result<()> {
        let result = self.record_join(joined);
        if let Err(error) = result {
            if let Err(drain_error) = self.abort_and_drain().await {
                return Err(error)
                    .context(format!("transfer task cleanup also failed: {drain_error}"));
            }
            return Err(error);
        }
        Ok(())
    }

    fn record_join(
        &mut self,
        joined: std::result::Result<TransferTaskCompletion, tokio::task::JoinError>,
    ) -> Result<()> {
        self.in_flight = self.in_flight.saturating_sub(1);
        match joined {
            Ok(TransferTaskCompletion { result: Ok(()), .. }) => {
                self.stats.add_transfer_completed_object();
                Ok(())
            }
            Ok(TransferTaskCompletion {
                result: Err(error),
                panicked,
            }) => {
                self.stats.add_transfer_failed_object(panicked);
                Err(error)
            }
            Err(error) if error.is_cancelled() => {
                self.stats.add_transfer_cancelled_object();
                Err(error).context("transfer task was cancelled unexpectedly")
            }
            Err(error) => {
                self.stats.add_transfer_failed_object(true);
                Err(error).context("transfer task panicked")
            }
        }
    }

    async fn abort_and_drain(&mut self) -> Result<()> {
        self.admission_gate.mark_failed();
        self.tasks.abort_all();
        timeout_at(self.deadlines.bounded_drain(), async {
            while let Some(joined) = self.tasks.join_next().await {
                self.in_flight = self.in_flight.saturating_sub(1);
                match joined {
                    Ok(TransferTaskCompletion { result: Ok(()), .. }) => {
                        self.stats.add_transfer_completed_object()
                    }
                    Ok(TransferTaskCompletion {
                        result: Err(_),
                        panicked,
                    }) => self.stats.add_transfer_failed_object(panicked),
                    Err(error) if error.is_cancelled() => {
                        self.stats.add_transfer_cancelled_object();
                    }
                    Err(_) => self.stats.add_transfer_failed_object(true),
                }
            }
        })
        .await
        .context("transfer tasks did not drain before the deployment drain deadline")?;
        Ok(())
    }
}

impl TransferAdmissionGate {
    fn try_admit(&self, admit: impl FnOnce()) -> bool {
        let failed = self
            .failed
            .lock()
            .expect("transfer admission gate mutex should not be poisoned");
        if *failed {
            return false;
        }
        admit();
        true
    }

    fn mark_failed(&self) {
        *self
            .failed
            .lock()
            .expect("transfer admission gate mutex should not be poisoned") = true;
    }
}

fn transfer_deadline_error() -> anyhow::Error {
    anyhow!("S3 transfer work exceeded the deployment work deadline")
}

#[cfg(test)]
mod tests {
    use std::future::pending;
    use std::sync::Arc;
    use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
    use std::time::Duration;

    use anyhow::anyhow;
    use futures_util::poll;
    use tokio::time::Instant as TokioInstant;

    use crate::deadline::InvocationDeadlines;
    use crate::types::DeploymentStats;

    use super::{TransferScheduler, TransferTaskCompletion};

    struct DropSignal(Arc<AtomicBool>);

    impl Drop for DropSignal {
        fn drop(&mut self) {
            self.0.store(true, Ordering::Release);
        }
    }

    #[tokio::test(start_paused = true)]
    async fn deadline_aborts_and_drains_spawned_transfer_tasks() {
        let dropped = Arc::new(AtomicBool::new(false));
        let stats = Arc::new(DeploymentStats::default());
        let deadlines = InvocationDeadlines::from_remaining_at(
            TokioInstant::now(),
            Duration::from_secs(50) + Duration::from_millis(10),
        );
        let mut scheduler = TransferScheduler::new(1, Arc::clone(&stats), deadlines);
        let task_dropped = Arc::clone(&dropped);
        scheduler
            .spawn(async move {
                let _signal = DropSignal(task_dropped);
                pending::<()>().await;
                Ok(())
            })
            .await
            .expect("task should be scheduled");

        let result = scheduler.finish().await;

        assert!(result.is_err());
        assert!(dropped.load(Ordering::Acquire));
    }

    #[tokio::test]
    async fn first_fatal_result_prevents_later_transfer_admission() {
        let later_writes = Arc::new(AtomicU64::new(0));
        let stats = Arc::new(DeploymentStats::default());
        let mut scheduler = TransferScheduler::new(
            1,
            stats,
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        );
        scheduler
            .spawn(async { Err(anyhow!("injected early failure")) })
            .await
            .expect("first task should be scheduled");

        let later_writes_for_task = Arc::clone(&later_writes);
        let result = scheduler
            .spawn(async move {
                later_writes_for_task.fetch_add(1, Ordering::Relaxed);
                Ok(())
            })
            .await;

        assert!(result.is_err());
        assert_eq!(later_writes.load(Ordering::Relaxed), 0);
    }

    #[tokio::test]
    async fn successful_completion_cannot_mask_an_already_recorded_failure() {
        let success_release = Arc::new(tokio::sync::Notify::new());
        let success_ready = Arc::new(tokio::sync::Notify::new());
        let failure_release = Arc::new(tokio::sync::Notify::new());
        let later_writes = Arc::new(AtomicU64::new(0));
        let stats = Arc::new(DeploymentStats::default());
        let mut scheduler = TransferScheduler::new(
            3,
            stats,
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        );

        let success_release_for_task = Arc::clone(&success_release);
        let success_ready_for_task = Arc::clone(&success_ready);
        scheduler.tasks.spawn(async move {
            success_release_for_task.notified().await;
            success_ready_for_task.notify_one();
            TransferTaskCompletion {
                result: Ok(()),
                panicked: false,
            }
        });
        let failure_release_for_task = Arc::clone(&failure_release);
        scheduler.tasks.spawn(async move {
            failure_release_for_task.notified().await;
            TransferTaskCompletion {
                result: Err(anyhow!("injected recorded failure")),
                panicked: false,
            }
        });
        scheduler.in_flight = 2;
        scheduler.admission_gate.mark_failed();

        let later_writes_for_task = Arc::clone(&later_writes);
        let spawn = scheduler.spawn(async move {
            later_writes_for_task.fetch_add(1, Ordering::Relaxed);
            Ok(())
        });
        tokio::pin!(spawn);
        assert!(poll!(&mut spawn).is_pending());

        success_release.notify_one();
        success_ready.notified().await;
        assert!(
            poll!(&mut spawn).is_pending(),
            "joining an unrelated success must not reopen admission"
        );

        failure_release.notify_one();
        let result = spawn.await;

        assert!(result.is_err());
        assert_eq!(later_writes.load(Ordering::Relaxed), 0);
    }

    #[tokio::test]
    async fn fatal_result_aborts_outstanding_work_before_a_later_write() {
        let second_started = Arc::new(tokio::sync::Notify::new());
        let later_writes = Arc::new(AtomicU64::new(0));
        let outstanding_dropped = Arc::new(AtomicBool::new(false));
        let stats = Arc::new(DeploymentStats::default());
        let mut scheduler = TransferScheduler::new(
            2,
            stats,
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        );
        let failure_wait = Arc::clone(&second_started);
        scheduler
            .spawn(async move {
                failure_wait.notified().await;
                Err(anyhow!("injected early failure"))
            })
            .await
            .expect("failure task should be scheduled");
        let second_started_for_task = Arc::clone(&second_started);
        let later_writes_for_task = Arc::clone(&later_writes);
        let outstanding_dropped_for_task = Arc::clone(&outstanding_dropped);
        scheduler
            .spawn(async move {
                let _drop = DropSignal(outstanding_dropped_for_task);
                second_started_for_task.notify_one();
                pending::<()>().await;
                later_writes_for_task.fetch_add(1, Ordering::Relaxed);
                Ok(())
            })
            .await
            .expect("outstanding task should be scheduled");

        let result = scheduler.finish().await;

        assert!(result.is_err());
        assert!(outstanding_dropped.load(Ordering::Acquire));
        assert_eq!(later_writes.load(Ordering::Relaxed), 0);
    }

    #[tokio::test]
    async fn panicking_transfer_aborts_and_drains_outstanding_work() {
        let outstanding_dropped = Arc::new(AtomicBool::new(false));
        let stats = Arc::new(DeploymentStats::default());
        let mut scheduler = TransferScheduler::new(
            2,
            stats,
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        );
        scheduler
            .spawn(async move { panic!("injected transfer panic") })
            .await
            .expect("panic task should be scheduled");
        let outstanding_dropped_for_task = Arc::clone(&outstanding_dropped);
        scheduler
            .spawn(async move {
                let _drop = DropSignal(outstanding_dropped_for_task);
                pending::<()>().await;
                Ok(())
            })
            .await
            .expect("outstanding task should be scheduled");

        let result = scheduler.finish().await;

        assert!(result.is_err());
        assert!(outstanding_dropped.load(Ordering::Acquire));
    }

    #[tokio::test]
    async fn scheduler_keeps_active_work_bounded_by_transfer_concurrency() {
        let active = Arc::new(AtomicU64::new(0));
        let high_water = Arc::new(AtomicU64::new(0));
        let stats = Arc::new(DeploymentStats::default());
        let mut scheduler = TransferScheduler::new(
            3,
            stats,
            InvocationDeadlines::from_remaining_at(TokioInstant::now(), Duration::from_secs(120)),
        );

        for _ in 0..100 {
            let active = Arc::clone(&active);
            let high_water = Arc::clone(&high_water);
            scheduler
                .spawn(async move {
                    let current = active.fetch_add(1, Ordering::AcqRel) + 1;
                    high_water.fetch_max(current, Ordering::AcqRel);
                    tokio::task::yield_now().await;
                    active.fetch_sub(1, Ordering::AcqRel);
                    Ok(())
                })
                .await
                .expect("bounded task should be scheduled");
            assert!(scheduler.tasks.len() <= 3);
        }
        scheduler.finish().await.expect("all tasks should complete");

        assert!(high_water.load(Ordering::Acquire) <= 3);
    }
}
