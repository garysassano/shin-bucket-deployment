use std::collections::VecDeque;
use std::io;
use std::panic::AssertUnwindSafe;
use std::pin::Pin;
use std::sync::atomic::Ordering;
use std::sync::{Arc, Mutex};

use anyhow::{Context, Result};
use bytes::Bytes;
use futures_util::FutureExt;
use futures_util::stream::{FuturesUnordered, StreamExt};
use tokio::sync::futures::OwnedNotified;
use tokio::sync::{Notify, Semaphore};
use tokio::task::{AbortHandle, JoinSet};
use tokio::time::{Instant, timeout_at};

use crate::s3::planner::ZipEntryPlan;
use crate::util::{MAX_DIAGNOSTIC_VALUE_BYTES, sanitize_diagnostic};

use super::SourceClient;
use super::budget::{SourceBudgetPermit, SourceByteBudget};

pub(super) struct EntryAttemptClaim {
    pub(super) store: Arc<SourceBlockStore>,
    pub(super) indices: Vec<usize>,
    pub(super) armed: bool,
}

pub(super) struct SourceFetchReservation {
    pub(super) store: Arc<SourceBlockStore>,
    pub(super) index: usize,
    pub(super) block: SourceBlockRange,
    pub(super) restore_replay_priority: bool,
    pub(super) armed: bool,
}

#[derive(Clone, Copy, Debug)]
pub(super) struct SourceBlockRange {
    pub(super) start: u64,
    pub(super) end_exclusive: u64,
}

pub(crate) struct SourceBlockStore {
    pub(super) source: Arc<SourceClient>,
    pub(super) blocks: Vec<SourceBlockRange>,
    pub(super) state: Mutex<SourceBlockState>,
    pub(super) notify: Arc<Notify>,
    pub(super) capacity_notify: Arc<Notify>,
    pub(super) cancel_notify: Arc<Notify>,
    pub(super) budget: Arc<SourceByteBudget>,
    pub(super) source_get_concurrency: usize,
    pub(super) window_bytes: u64,
    pub(super) fetch_semaphore: Semaphore,
    pub(super) body_tasks: Mutex<JoinSet<()>>,
}

#[derive(Clone, Copy, Debug)]
pub(crate) struct SourceBlockOptions {
    pub(crate) block_bytes: usize,
    pub(crate) merge_gap_bytes: usize,
    pub(crate) get_concurrency: usize,
    pub(crate) window_bytes: usize,
}

pub(super) struct SourceBlockState {
    pub(super) slots: Vec<SourceBlockSlot>,
    pub(super) window_committed_bytes: u64,
    pub(super) resident_bytes: u64,
    pub(super) failure: Option<String>,
}

pub(super) struct SourceBlockSlot {
    pub(super) remaining_claims: usize,
    pub(super) live_claims: usize,
    pub(super) replay_priority: bool,
    pub(super) budget_permit: Option<SourceBudgetPermit>,
    pub(super) status: SourceBlockStatus,
}

pub(super) enum SourceBlockStatus {
    Pending,
    Reserving,
    Fetching,
    Ready(Bytes),
    Released,
    Failed(String),
}

#[derive(Clone, Debug)]
pub(crate) struct SourceAttemptSnapshot {
    pub(crate) local_window_bytes: u64,
    pub(crate) local_committed_bytes: u64,
    pub(crate) local_resident_bytes: u64,
    pub(crate) local_capacity_waiters: u64,
    pub(crate) global_budget_bytes: u64,
    pub(crate) global_resident_bytes: u64,
    pub(crate) global_available_permits: u64,
    pub(crate) global_permit_unit_bytes: u64,
    pub(crate) global_permit_waiters: u64,
    pub(crate) active_fetches: u64,
}

impl EntryAttemptClaim {
    pub(super) fn activate(mut self) -> io::Result<VecDeque<usize>> {
        self.store.activate_reader(&self.indices)?;
        self.armed = false;
        Ok(std::mem::take(&mut self.indices).into())
    }
}

impl Drop for EntryAttemptClaim {
    fn drop(&mut self) {
        if self.armed {
            self.store.release_entry_attempt(&self.indices);
        }
    }
}

impl SourceFetchReservation {
    async fn fetch(mut self) {
        let result = match self.store.fetch_semaphore.acquire().await {
            Ok(_permit) => {
                self.store
                    .source
                    .get_range(self.block.start, self.block.end_inclusive())
                    .await
            }
            Err(_) => Err(io::Error::other("source fetch semaphore is closed")),
        };
        self.store.finish_fetch(self.index, self.block, result);
        self.armed = false;
    }
}

impl Drop for SourceFetchReservation {
    fn drop(&mut self) {
        if self.armed {
            self.store
                .rollback_fetch(self.index, self.block, self.restore_replay_priority);
        }
    }
}

impl SourceBlockStore {
    pub(crate) fn new(
        source: Arc<SourceClient>,
        plans: &[ZipEntryPlan],
        options: SourceBlockOptions,
        budget: Arc<SourceByteBudget>,
    ) -> Arc<Self> {
        let block_bytes = options.block_bytes.max(1);
        let get_concurrency = options.get_concurrency.max(1);
        let options = SourceBlockOptions {
            block_bytes,
            get_concurrency,
            ..options
        };
        let blocks = plan_source_blocks(
            source.len(),
            plans,
            options.block_bytes,
            options.merge_gap_bytes,
        );
        source
            .diagnostics
            .record_plan(options, &blocks, plans.len());
        Arc::new(Self {
            source,
            state: Mutex::new(SourceBlockState {
                slots: initial_claim_counts(&blocks, plans)
                    .into_iter()
                    .map(|remaining_claims| SourceBlockSlot {
                        remaining_claims,
                        live_claims: 0,
                        replay_priority: false,
                        budget_permit: None,
                        status: SourceBlockStatus::Pending,
                    })
                    .collect(),
                window_committed_bytes: 0,
                resident_bytes: 0,
                failure: None,
            }),
            blocks,
            notify: Arc::new(Notify::new()),
            capacity_notify: Arc::new(Notify::new()),
            cancel_notify: Arc::new(Notify::new()),
            budget,
            source_get_concurrency: options.get_concurrency,
            window_bytes: options.window_bytes.max(options.block_bytes) as u64,
            fetch_semaphore: Semaphore::new(options.get_concurrency),
            body_tasks: Mutex::new(JoinSet::new()),
        })
    }

    pub(crate) fn start_scheduler(self: &Arc<Self>) {
        let store = Arc::clone(self);
        let _ = self.spawn_body_task(async move {
            let outcome = AssertUnwindSafe(Arc::clone(&store).run_scheduler())
                .catch_unwind()
                .await;
            match outcome {
                Ok(Ok(())) => {}
                Ok(Err(error)) => store.cancel(format!("source block scheduler failed: {error}")),
                Err(_) => store.cancel("source block scheduler panicked"),
            }
        });
    }

    pub(crate) fn attempt_snapshot(&self) -> SourceAttemptSnapshot {
        let state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        SourceAttemptSnapshot {
            local_window_bytes: self.window_bytes,
            local_committed_bytes: state.window_committed_bytes,
            local_resident_bytes: state.resident_bytes,
            local_capacity_waiters: self
                .source
                .diagnostics
                .local_capacity_waiters
                .load(Ordering::Acquire),
            global_budget_bytes: self.budget.limit_bytes,
            global_resident_bytes: self.budget.stats.source_global_resident_bytes_current(),
            global_available_permits: u64::try_from(self.budget.semaphore.available_permits())
                .unwrap_or(u64::MAX),
            global_permit_unit_bytes: self.budget.permit_unit_bytes,
            global_permit_waiters: self
                .budget
                .capacity_waiters
                .as_ref()
                .map_or(0, |waiters| waiters.load(Ordering::Acquire)),
            active_fetches: self.source.diagnostics.active_gets.load(Ordering::Acquire),
        }
    }

    async fn run_scheduler(self: Arc<Self>) -> io::Result<()> {
        let mut tasks = FuturesUnordered::new();
        let mut next_index = 0_usize;

        loop {
            while tasks.len() < self.source_get_concurrency && next_index < self.blocks.len() {
                let index = next_index;
                next_index += 1;
                let Some(reservation) =
                    self.reserve_fetch(index, SourceFetchMode::Prefetch).await?
                else {
                    continue;
                };
                tasks.push(async move {
                    reservation.fetch().await;
                });
            }

            if tasks.next().await.is_none() {
                break;
            }
        }

        Ok(())
    }

    pub(crate) fn cancel(&self, reason: impl Into<String>) {
        let reason = reason.into();
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if state.failure.is_none() {
            state.failure = Some(reason.clone());
        }
        state.window_committed_bytes = 0;
        state.resident_bytes = 0;
        for slot in &mut state.slots {
            slot.budget_permit.take();
            if !matches!(slot.status, SourceBlockStatus::Released) {
                slot.status = SourceBlockStatus::Failed(reason.clone());
            }
        }
        drop(state);
        self.fetch_semaphore.close();
        self.notify.notify_waiters();
        self.capacity_notify.notify_waiters();
        self.cancel_notify.notify_waiters();
    }

    pub(crate) async fn abort_and_drain_body_tasks(&self, deadline: Instant) -> Result<()> {
        let mut tasks = {
            let mut tasks = self
                .body_tasks
                .lock()
                .expect("source body task mutex should not be poisoned");
            std::mem::replace(&mut *tasks, JoinSet::new())
        };

        tasks.abort_all();

        timeout_at(deadline, async {
            while let Some(result) = tasks.join_next().await {
                match result {
                    Ok(()) => {}
                    Err(error) if error.is_cancelled() => {}
                    Err(error) => return Err(error).context("source body task panicked"),
                }
            }
            Ok(())
        })
        .await
        .context("source body tasks did not drain before the deployment drain deadline")?
    }

    pub(super) fn spawn_body_task(
        &self,
        task: impl Future<Output = ()> + Send + 'static,
    ) -> AbortHandle {
        // Drain completed tasks and handle their panics without holding the body-task
        // mutex across the sanitize/log work: collect under the lock, report after it.
        let mut completed = Vec::new();
        let handle = {
            let mut tasks = self
                .body_tasks
                .lock()
                .expect("source body task mutex should not be poisoned");
            while let Some(result) = tasks.try_join_next() {
                completed.push(result);
            }
            tasks.spawn(task)
        };
        for result in completed {
            if let Err(error) = result
                && !error.is_cancelled()
            {
                let error = sanitize_diagnostic(&error.to_string(), MAX_DIAGNOSTIC_VALUE_BYTES);
                tracing::error!(error = %error, "source body task panicked");
            }
        }
        handle
    }

    pub(super) async fn reserve_fetch(
        self: &Arc<Self>,
        index: usize,
        mode: SourceFetchMode,
    ) -> io::Result<Option<SourceFetchReservation>> {
        if self.blocks.get(index).is_none() {
            return Ok(None);
        }
        // The capacity wait is pinned on the stack per turn: pinning an OwnedNotified
        // on the heap per retry would allocate once per wait.
        let (block, cancel_wait, restore_replay_priority) = loop {
            let within_window = {
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if let Some(error) = &state.failure {
                    return Err(io::Error::other(error.clone()));
                }
                if state.slots[index].remaining_claims == 0 {
                    return Ok(None);
                }
                match state.slots[index].status {
                    SourceBlockStatus::Pending => {}
                    SourceBlockStatus::Reserving
                    | SourceBlockStatus::Fetching
                    | SourceBlockStatus::Ready(_)
                    | SourceBlockStatus::Released
                    | SourceBlockStatus::Failed(_) => return Ok(None),
                }

                let block = self.blocks[index];
                let block_len = block.len();
                let target_window = self.window_bytes.max(block_len);
                // The local window bounds speculative scheduler retention. A body
                // replay may need an earlier block after that block was released,
                // while later prefetched blocks occupy the complete window. Let
                // demand reads borrow unused invocation-global budget so the replay
                // can make progress; the shared semaphore remains the hard memory
                // bound.
                if (mode == SourceFetchMode::Demand && state.slots[index].replay_priority)
                    || state.window_committed_bytes.saturating_add(block_len) <= target_window
                {
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_add(block_len);
                    let restore_replay_priority = state.slots[index].replay_priority;
                    state.slots[index].replay_priority = false;
                    state.slots[index].status = SourceBlockStatus::Reserving;
                    break (
                        block,
                        enabled_notification(&self.cancel_notify),
                        restore_replay_priority,
                    );
                }

                false
            };
            if !within_window {
                let mut wait = std::pin::pin!(self.capacity_notify.notified());
                wait.as_mut().enable();
                if self.budget.capacity_waiters.is_some() {
                    let _waiter = self.source.diagnostics.track_local_capacity_wait();
                    wait.as_mut().await;
                } else {
                    wait.as_mut().await;
                }
            }
        };

        let mut reservation = SourceFetchReservation {
            store: Arc::clone(self),
            index,
            block,
            restore_replay_priority,
            armed: true,
        };

        let permit = match Arc::clone(&self.budget)
            .acquire(block.len(), cancel_wait)
            .await
        {
            Ok(permit) => permit,
            Err(error) => {
                let mut state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if matches!(state.slots[index].status, SourceBlockStatus::Reserving) {
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block.len());
                    state.slots[index].status = SourceBlockStatus::Failed(error.to_string());
                }
                reservation.armed = false;
                drop(state);
                self.notify.notify_waiters();
                self.capacity_notify.notify_waiters();
                return Err(error);
            }
        };

        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if let Some(error) = &state.failure {
            reservation.armed = false;
            return Err(io::Error::other(error.clone()));
        }
        if state.slots[index].remaining_claims == 0
            || !matches!(state.slots[index].status, SourceBlockStatus::Reserving)
        {
            if matches!(state.slots[index].status, SourceBlockStatus::Reserving) {
                state.window_committed_bytes =
                    state.window_committed_bytes.saturating_sub(block.len());
                state.slots[index].status = SourceBlockStatus::Released;
            }
            reservation.armed = false;
            drop(state);
            self.capacity_notify.notify_waiters();
            return Ok(None);
        }
        state.resident_bytes = state.resident_bytes.saturating_add(block.len());
        self.source
            .diagnostics
            .record_resident_bytes(state.resident_bytes);
        state.slots[index].budget_permit = Some(permit);
        state.slots[index].status = SourceBlockStatus::Fetching;
        drop(state);
        self.notify.notify_waiters();
        Ok(Some(reservation))
    }

    fn rollback_fetch(&self, index: usize, block: SourceBlockRange, restore_replay_priority: bool) {
        let mut rolled_back = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            let reserving = matches!(state.slots[index].status, SourceBlockStatus::Reserving);
            let fetching = matches!(state.slots[index].status, SourceBlockStatus::Fetching);
            if reserving || fetching {
                state.window_committed_bytes =
                    state.window_committed_bytes.saturating_sub(block.len());
                if fetching {
                    state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                    state.slots[index].budget_permit.take();
                }
                state.slots[index].replay_priority |= restore_replay_priority;
                state.slots[index].status = SourceBlockStatus::Pending;
                rolled_back = true;
            }
        }
        if rolled_back {
            self.notify.notify_waiters();
            self.capacity_notify.notify_waiters();
        }
    }

    pub(super) fn finish_fetch(
        &self,
        index: usize,
        block: SourceBlockRange,
        result: io::Result<Bytes>,
    ) {
        let mut release_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            if state.failure.is_some()
                || !matches!(state.slots[index].status, SourceBlockStatus::Fetching)
            {
                return;
            }
            match result {
                Ok(bytes) => {
                    self.source
                        .diagnostics
                        .fetched_blocks
                        .fetch_add(1, Ordering::Relaxed);
                    self.source.diagnostics.fetched_source_bytes.fetch_add(
                        u64::try_from(bytes.len()).unwrap_or(u64::MAX),
                        Ordering::Relaxed,
                    );
                    if state.slots[index].remaining_claims == 0
                        && state.slots[index].live_claims == 0
                    {
                        state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                        state.window_committed_bytes =
                            state.window_committed_bytes.saturating_sub(block.len());
                        state.slots[index].budget_permit.take();
                        state.slots[index].status = SourceBlockStatus::Released;
                        self.source
                            .diagnostics
                            .block_releases
                            .fetch_add(1, Ordering::Relaxed);
                        release_capacity = true;
                    } else {
                        state.slots[index].status = SourceBlockStatus::Ready(bytes);
                    }
                }
                Err(error) => {
                    state.resident_bytes = state.resident_bytes.saturating_sub(block.len());
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block.len());
                    state.slots[index].budget_permit.take();
                    state.slots[index].status = SourceBlockStatus::Failed(error.to_string());
                    release_capacity = true;
                }
            }
        }
        self.notify.notify_waiters();
        if release_capacity {
            self.capacity_notify.notify_waiters();
        }
    }

    fn activate_reader(&self, indices: &[usize]) -> io::Result<()> {
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if let Some(error) = &state.failure {
            return Err(io::Error::other(error.clone()));
        }
        for &index in indices {
            let Some(slot) = state.slots.get(index) else {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidInput,
                    "source claim references an unknown block",
                ));
            };
            if slot.remaining_claims == 0 {
                return Err(io::Error::other(
                    "source block has no remaining planned claims",
                ));
            }
            if matches!(slot.status, SourceBlockStatus::Released) {
                return Err(io::Error::other(
                    "source block was already released before the reader was admitted",
                ));
            }
        }
        for &index in indices {
            state.slots[index].live_claims = state.slots[index].live_claims.saturating_add(1);
        }
        self.source.diagnostics.record_reader_started();
        Ok(())
    }

    pub(super) fn claim_zip_entry_attempt(
        self: &Arc<Self>,
        plan: &ZipEntryPlan,
    ) -> EntryAttemptClaim {
        EntryAttemptClaim {
            store: Arc::clone(self),
            indices: self.block_indices_for_span(plan.source_offset, plan.source_span_end),
            armed: true,
        }
    }

    fn release_entry_attempt(&self, indices: &[usize]) {
        let mut notify_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            for &index in indices {
                let Some(slot) = state.slots.get(index) else {
                    continue;
                };
                if slot.remaining_claims == 0 {
                    continue;
                }
                state.slots[index].remaining_claims -= 1;
                if state.slots[index].remaining_claims != 0 || state.slots[index].live_claims != 0 {
                    continue;
                }
                if matches!(state.slots[index].status, SourceBlockStatus::Ready(_)) {
                    state.slots[index].budget_permit.take();
                    state.slots[index].status = SourceBlockStatus::Released;
                    self.source
                        .diagnostics
                        .block_releases
                        .fetch_add(1, Ordering::Relaxed);
                    let block_len = self.blocks[index].len();
                    state.resident_bytes = state.resident_bytes.saturating_sub(block_len);
                    state.window_committed_bytes =
                        state.window_committed_bytes.saturating_sub(block_len);
                    notify_capacity = true;
                } else if matches!(
                    state.slots[index].status,
                    SourceBlockStatus::Pending
                        | SourceBlockStatus::Reserving
                        | SourceBlockStatus::Fetching
                ) {
                    state.slots[index].replay_priority = true;
                }
            }
        }
        if notify_capacity {
            self.capacity_notify.notify_waiters();
        }
    }

    pub(crate) fn retain_zip_entry_for_replay(&self, plan: &ZipEntryPlan) {
        self.add_replay_claims(plan.source_offset, plan.source_span_end);
    }

    pub(super) fn add_replay_claims(&self, start: u64, end_exclusive: u64) {
        let indices = self.block_indices_for_span(start, end_exclusive);
        let mut state = self
            .state
            .lock()
            .expect("source block state mutex should not be poisoned");
        if state.failure.is_some() {
            return;
        }
        for index in indices {
            self.source.diagnostics.record_replay_claim();
            let Some(slot) = state.slots.get_mut(index) else {
                continue;
            };
            slot.remaining_claims = slot.remaining_claims.saturating_add(1);
            slot.replay_priority = true;
            if matches!(
                slot.status,
                SourceBlockStatus::Released | SourceBlockStatus::Failed(_)
            ) {
                if matches!(slot.status, SourceBlockStatus::Released) {
                    self.source.diagnostics.record_replay_claim_after_release();
                } else {
                    self.source.diagnostics.record_replay_claim_after_failure();
                }
                slot.status = SourceBlockStatus::Pending;
            }
        }
        self.notify.notify_waiters();
    }

    pub(super) async fn slice_from(
        self: &Arc<Self>,
        position: u64,
        end_exclusive: u64,
    ) -> io::Result<BlockSlice> {
        let index = self.block_index_at(position).ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::UnexpectedEof,
                format!("no planned source block covers offset {position}"),
            )
        })?;
        let block = self.blocks[index];
        let slice_end_exclusive = block.end_exclusive.min(end_exclusive);

        loop {
            let action = {
                let state = self
                    .state
                    .lock()
                    .expect("source block state mutex should not be poisoned");
                if let Some(error) = &state.failure {
                    return Err(io::Error::other(error.clone()));
                }
                match &state.slots[index].status {
                    SourceBlockStatus::Ready(bytes) => {
                        self.source
                            .diagnostics
                            .block_hits
                            .fetch_add(1, Ordering::Relaxed);
                        let offset = usize::try_from(position - block.start).map_err(|_| {
                            io::Error::new(io::ErrorKind::InvalidInput, "source offset too large")
                        })?;
                        let len =
                            usize::try_from(slice_end_exclusive - position).map_err(|_| {
                                io::Error::new(
                                    io::ErrorKind::InvalidInput,
                                    "source range too large",
                                )
                            })?;
                        let end = offset.checked_add(len).ok_or_else(|| {
                            io::Error::new(io::ErrorKind::InvalidInput, "source range overflowed")
                        })?;
                        return Ok(BlockSlice {
                            bytes: bytes.slice(offset..end),
                        });
                    }
                    SourceBlockStatus::Failed(message) => {
                        return Err(io::Error::other(message.clone()));
                    }
                    SourceBlockStatus::Released => {
                        self.source
                            .diagnostics
                            .block_misses
                            .fetch_add(1, Ordering::Relaxed);
                        return Err(io::Error::other(
                            "source block was released before all claimed bytes were consumed",
                        ));
                    }
                    SourceBlockStatus::Fetching => {
                        self.source.diagnostics.record_wait_fetching();
                        SourceBlockAction::Wait(enabled_notification(&self.notify))
                    }
                    SourceBlockStatus::Reserving => {
                        self.source.diagnostics.record_wait_capacity();
                        SourceBlockAction::Wait(enabled_notification(&self.notify))
                    }
                    SourceBlockStatus::Pending => {
                        if state.slots[index].remaining_claims == 0 {
                            return Err(io::Error::other(
                                "source block has no remaining planned claims",
                            ));
                        }
                        self.source
                            .diagnostics
                            .block_misses
                            .fetch_add(1, Ordering::Relaxed);
                        SourceBlockAction::Reserve
                    }
                }
            };

            match action {
                SourceBlockAction::Reserve => {
                    if let Some(reservation) =
                        self.reserve_fetch(index, SourceFetchMode::Demand).await?
                    {
                        reservation.fetch().await;
                    }
                }
                SourceBlockAction::Wait(wait) => {
                    wait.await;
                }
            }
        }
    }

    fn block_index_at(&self, position: u64) -> Option<usize> {
        let index = self.blocks.partition_point(|block| block.start <= position);
        if index == 0 {
            return None;
        }
        let block_index = index - 1;
        let block = self.blocks[block_index];
        (position < block.end_exclusive).then_some(block_index)
    }

    fn block_indices_for_span(&self, start: u64, end_exclusive: u64) -> Vec<usize> {
        block_indices_for_span(&self.blocks, start, end_exclusive)
    }

    pub(super) fn block_end(&self, index: usize) -> Option<u64> {
        self.blocks.get(index).map(|block| block.end_inclusive())
    }

    pub(super) fn release_block_reader(&self, index: usize) {
        if self.blocks.get(index).is_none() {
            return;
        }
        let mut notify_capacity = false;
        {
            let mut state = self
                .state
                .lock()
                .expect("source block state mutex should not be poisoned");
            let slot = &mut state.slots[index];
            if slot.live_claims == 0 {
                return;
            }
            slot.live_claims -= 1;
            slot.remaining_claims = slot.remaining_claims.saturating_sub(1);
            if slot.remaining_claims == 0
                && matches!(
                    slot.status,
                    SourceBlockStatus::Pending
                        | SourceBlockStatus::Reserving
                        | SourceBlockStatus::Fetching
                )
            {
                slot.replay_priority = true;
            }
            if slot.live_claims == 0
                && slot.remaining_claims == 0
                && matches!(slot.status, SourceBlockStatus::Ready(_))
            {
                slot.budget_permit.take();
                slot.status = SourceBlockStatus::Released;
                self.source
                    .diagnostics
                    .block_releases
                    .fetch_add(1, Ordering::Relaxed);
                state.resident_bytes = state
                    .resident_bytes
                    .saturating_sub(self.blocks[index].len());
                state.window_committed_bytes = state
                    .window_committed_bytes
                    .saturating_sub(self.blocks[index].len());
                notify_capacity = true;
            }
        }
        if notify_capacity {
            self.capacity_notify.notify_waiters();
        }
    }
}

enum SourceBlockAction {
    Reserve,
    Wait(EnabledNotification),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum SourceFetchMode {
    Prefetch,
    Demand,
}

type EnabledNotification = Pin<Box<OwnedNotified>>;

fn enabled_notification(notify: &Arc<Notify>) -> EnabledNotification {
    let mut wait = Box::pin(Arc::clone(notify).notified_owned());
    wait.as_mut().enable();
    wait
}

pub(super) struct BlockSlice {
    pub(super) bytes: Bytes,
}

impl SourceBlockRange {
    pub(super) fn len(self) -> u64 {
        self.end_exclusive - self.start
    }

    pub(super) fn end_inclusive(self) -> u64 {
        self.end_exclusive - 1
    }
}

pub(super) fn plan_source_blocks(
    source_len: u64,
    plans: &[ZipEntryPlan],
    block_bytes: usize,
    merge_gap_bytes: usize,
) -> Vec<SourceBlockRange> {
    if source_len == 0 {
        return Vec::new();
    }

    let block_size = block_bytes.max(1) as u64;
    let merge_gap = merge_gap_bytes as u64;
    let mut spans = plans
        .iter()
        .filter_map(|plan| {
            let start = plan.source_offset.min(source_len);
            let end = plan.source_span_end.min(source_len);
            (start < end).then_some((start, end))
        })
        .collect::<Vec<_>>();
    spans.sort_unstable();

    let mut coalesced = Vec::<(u64, u64)>::new();
    for (start, end) in spans {
        let Some((current_start, current_end)) = coalesced.last_mut() else {
            coalesced.push((start, end));
            continue;
        };
        let gap = start.saturating_sub(*current_end);
        let proposed_end = (*current_end).max(end);
        if gap <= merge_gap && proposed_end.saturating_sub(*current_start) <= block_size {
            *current_end = proposed_end;
        } else {
            coalesced.push((start, end));
        }
    }

    let mut blocks = Vec::new();
    for (start, end) in coalesced {
        let mut block_start = start;
        while block_start < end {
            let block_end_exclusive = block_start.saturating_add(block_size).min(end);
            blocks.push(SourceBlockRange {
                start: block_start,
                end_exclusive: block_end_exclusive,
            });
            block_start = block_end_exclusive;
        }
    }

    // Planning rejects archives whose entries share a local header offset, so entry
    // spans are disjoint and the blocks derived from them must be too. `block_index_at`
    // binary-searches this list and claim accounting assumes each byte belongs to at
    // most one block.
    assert!(
        blocks.iter().all(|block| block.start < block.end_exclusive)
            && blocks
                .windows(2)
                .all(|pair| pair[0].end_exclusive <= pair[1].start),
        "source blocks must be strictly increasing and disjoint"
    );

    blocks
}

pub(super) fn initial_claim_counts(
    blocks: &[SourceBlockRange],
    plans: &[ZipEntryPlan],
) -> Vec<usize> {
    let mut counts = vec![0_usize; blocks.len()];
    for plan in plans {
        for index in block_indices_for_span(blocks, plan.source_offset, plan.source_span_end) {
            counts[index] = counts[index].saturating_add(1);
        }
    }
    counts
}

pub(super) fn block_indices_for_span(
    blocks: &[SourceBlockRange],
    start: u64,
    end_exclusive: u64,
) -> Vec<usize> {
    if start >= end_exclusive {
        return Vec::new();
    }
    let first = blocks.partition_point(|block| block.end_exclusive <= start);
    let past_last = blocks.partition_point(|block| block.start < end_exclusive);
    (first..past_last.max(first)).collect()
}
