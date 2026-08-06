use std::io;
use std::pin::Pin;
use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};
use std::task::Poll;

use anyhow::{Context, Result};
use tokio::sync::futures::OwnedNotified;
use tokio::sync::{Notify, OwnedSemaphorePermit, Semaphore};

use crate::types::DeploymentStats;

const SOURCE_BUDGET_PERMIT_UNIT_BYTES: u64 = 4 * 1024;

type EnabledNotification = Pin<Box<OwnedNotified>>;

fn enabled_notification(notify: &Arc<Notify>) -> EnabledNotification {
    let mut wait = Box::pin(Arc::clone(notify).notified_owned());
    wait.as_mut().enable();
    wait
}

/// Invocation-global ceiling on **resident source-phase memory**, not merely on bytes
/// streamed. Every major source-phase allocation is charged against it through a
/// conservative estimate of its decoded size: block windows, central-directory planning
/// (`DIRECTORY_ALLOCATION_FACTOR` and friends), and embedded-catalog processing
/// (`CATALOG_ALLOCATION_FACTOR`).
///
/// It is an accounting bound over those estimates, not an allocator-level hard limit.
/// Small fixed-size working buffers, decompressor state, hasher state and allocator
/// bookkeeping are outside it, so it constrains how much the provider *plans* to hold
/// resident rather than measuring process RSS. The estimates are deliberately
/// conservative so that the accounting stays an upper bound on the allocations it covers.
pub(crate) struct SourceByteBudget {
    pub(super) limit_bytes: u64,
    pub(super) permit_unit_bytes: u64,
    pub(super) semaphore: Arc<Semaphore>,
    pub(super) stats: Arc<DeploymentStats>,
    pub(super) capacity_waiters: Option<AtomicU64>,
}

pub(super) struct SourceBudgetPermit {
    bytes: u64,
    _permit: OwnedSemaphorePermit,
    budget: Arc<SourceByteBudget>,
}

pub(super) struct SourceBudgetWaitGuard {
    budget: Arc<SourceByteBudget>,
}

pub(crate) struct SourcePlanningPermit {
    _permit: SourceBudgetPermit,
}

impl SourceByteBudget {
    pub(crate) fn new(
        limit_bytes: usize,
        stats: Arc<DeploymentStats>,
        detailed_failure_diagnostics: bool,
    ) -> Result<Arc<Self>> {
        anyhow::ensure!(limit_bytes > 0, "source byte budget must be positive");
        let limit_bytes = u64::try_from(limit_bytes)
            .context("source byte budget cannot be represented safely")?;
        let permit_unit_bytes = SOURCE_BUDGET_PERMIT_UNIT_BYTES.min(limit_bytes);
        let permit_count = usize::try_from(limit_bytes / permit_unit_bytes)
            .context("source byte budget permit count cannot be represented safely")?;
        anyhow::ensure!(
            permit_count <= Semaphore::MAX_PERMITS,
            "configured source byte budget of {limit_bytes} bytes needs {permit_count} \
             semaphore permits, which exceeds the provider maximum of {}",
            Semaphore::MAX_PERMITS
        );
        stats.configure_source_global_budget(limit_bytes);
        Ok(Arc::new(Self {
            limit_bytes,
            permit_unit_bytes,
            semaphore: Arc::new(Semaphore::new(permit_count)),
            stats,
            capacity_waiters: detailed_failure_diagnostics.then(|| AtomicU64::new(0)),
        }))
    }

    pub(crate) fn limit_bytes(&self) -> u64 {
        self.limit_bytes
    }

    pub(super) async fn reserve_planning(
        self: &Arc<Self>,
        bytes: u64,
    ) -> io::Result<SourcePlanningPermit> {
        let cancel = Arc::new(Notify::new());
        self.acquire(bytes, enabled_notification(&cancel))
            .await
            .map(|permit| SourcePlanningPermit { _permit: permit })
    }

    /// Reserves budget without ever waiting, for callers that run while the sequential
    /// planning phase holds its own permit. A caller in that position competes with
    /// nobody, so a refusal means the configured budget cannot fit the work at all and
    /// waiting could never succeed — the error is the answer, not a retry signal.
    pub(crate) fn try_reserve_planning(
        self: &Arc<Self>,
        bytes: u64,
    ) -> io::Result<SourcePlanningPermit> {
        let permits = self.permit_count(bytes)?;
        // A fail-fast attempt is never a waiter, so it deliberately bypasses the
        // `capacity_waiters` diagnostic that the awaited path maintains.
        let permit = Arc::clone(&self.semaphore)
            .try_acquire_many_owned(permits)
            .map_err(|_| {
                io::Error::new(
                    io::ErrorKind::InvalidInput,
                    format!(
                        "reserving {bytes} bytes exceeds the remaining invocation-global \
                         source budget (the total budget is {} bytes)",
                        self.limit_bytes
                    ),
                )
            })?;
        Ok(SourcePlanningPermit {
            _permit: self.finish_acquire(bytes, permit),
        })
    }

    /// Reports whether a further reservation of `bytes` could be satisfied right now.
    ///
    /// Only meaningful to a caller that knows nothing else is acquiring concurrently —
    /// during sequential planning — and only as a fail-fast check, never as a
    /// check-then-acquire guard. It exists because the byte totals alone do not predict
    /// admission: every acquisition rounds up to a whole permit unit independently, so
    /// reservations that sum to less than the limit can still be jointly infeasible.
    pub(crate) fn can_reserve_additional(&self, bytes: u64) -> bool {
        let Ok(permits) = self.permit_count(bytes) else {
            return false;
        };
        u64::try_from(self.semaphore.available_permits()).unwrap_or(0) >= u64::from(permits)
    }

    fn permit_count(&self, bytes: u64) -> io::Result<u32> {
        if bytes == 0 || bytes > self.limit_bytes {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                format!(
                    "source block of {bytes} bytes does not fit the {}-byte invocation-global budget",
                    self.limit_bytes
                ),
            ));
        }
        u32::try_from(bytes.div_ceil(self.permit_unit_bytes)).map_err(|_| {
            io::Error::new(
                io::ErrorKind::InvalidInput,
                "source block budget permit count exceeds the semaphore limit",
            )
        })
    }

    fn finish_acquire(
        self: &Arc<Self>,
        bytes: u64,
        permit: OwnedSemaphorePermit,
    ) -> SourceBudgetPermit {
        self.stats.acquire_source_global_bytes(bytes);
        SourceBudgetPermit {
            bytes,
            _permit: permit,
            budget: Arc::clone(self),
        }
    }

    pub(super) async fn acquire(
        self: &Arc<Self>,
        bytes: u64,
        cancel_wait: EnabledNotification,
    ) -> io::Result<SourceBudgetPermit> {
        let permits = self.permit_count(bytes)?;
        let permit = if self.capacity_waiters.is_some() {
            let acquisition = Arc::clone(&self.semaphore).acquire_many_owned(permits);
            tokio::pin!(acquisition);
            match futures_util::poll!(&mut acquisition) {
                Poll::Ready(permit) => {
                    permit.map_err(|_| io::Error::other("source byte budget is closed"))?
                }
                Poll::Pending => {
                    let _waiter = SourceBudgetWaitGuard::new(Arc::clone(self));
                    tokio::select! {
                        permit = &mut acquisition => permit.map_err(|_| io::Error::other("source byte budget is closed"))?,
                        () = cancel_wait => return Err(io::Error::other("source block reservation was cancelled")),
                    }
                }
            }
        } else {
            tokio::select! {
                permit = Arc::clone(&self.semaphore).acquire_many_owned(permits) =>
                    permit.map_err(|_| io::Error::other("source byte budget is closed"))?,
                () = cancel_wait => return Err(io::Error::other("source block reservation was cancelled")),
            }
        };
        Ok(self.finish_acquire(bytes, permit))
    }
}

impl SourceBudgetWaitGuard {
    pub(super) fn new(budget: Arc<SourceByteBudget>) -> Self {
        if let Some(waiters) = &budget.capacity_waiters {
            waiters.fetch_add(1, Ordering::AcqRel);
        }
        Self { budget }
    }
}

impl Drop for SourceBudgetWaitGuard {
    fn drop(&mut self) {
        if let Some(waiters) = &self.budget.capacity_waiters {
            waiters.fetch_sub(1, Ordering::AcqRel);
        }
    }
}

impl Drop for SourceBudgetPermit {
    fn drop(&mut self) {
        self.budget.stats.release_source_global_bytes(self.bytes);
    }
}
