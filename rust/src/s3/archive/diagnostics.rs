use std::sync::Arc;
use std::sync::atomic::{AtomicU64, Ordering};

use super::block_store::{SourceBlockOptions, SourceBlockRange};

macro_rules! define_source_diagnostics {
    ($($field:ident),+ $(,)?) => {
        #[derive(Debug)]
        pub(super) struct SourceDiagnostics {
            pub(super) source_zip_bytes: u64,
            $(pub(super) $field: AtomicU64,)+
            pub(super) active_gets: AtomicU64,
            pub(super) active_readers: AtomicU64,
            pub(super) local_capacity_waiters: AtomicU64,
        }

        #[derive(Debug)]
        pub(crate) struct SourceDiagnosticsSnapshot {
            pub(crate) source_zip_bytes: u64,
            $(pub(crate) $field: u64,)+
            pub(crate) source_amplification: f64,
        }

        impl SourceDiagnostics {
            pub(super) fn new(source_zip_bytes: u64) -> Self {
                Self {
                    source_zip_bytes,
                    $($field: AtomicU64::new(0),)+
                    active_gets: AtomicU64::new(0),
                    active_readers: AtomicU64::new(0),
                    local_capacity_waiters: AtomicU64::new(0),
                }
            }

            pub(super) fn snapshot(&self) -> SourceDiagnosticsSnapshot {
                let planned_source_bytes = self.planned_source_bytes.load(Ordering::Relaxed);
                let fetched_source_bytes = self.fetched_source_bytes.load(Ordering::Relaxed);
                let source_amplification = if planned_source_bytes == 0 {
                    0.0
                } else {
                    fetched_source_bytes as f64 / planned_source_bytes as f64
                };

                SourceDiagnosticsSnapshot {
                    source_zip_bytes: self.source_zip_bytes,
                    $($field: self.$field.load(Ordering::Relaxed),)+
                    source_amplification,
                }
            }
        }
    };
}

define_source_diagnostics!(
    planned_entries,
    planned_blocks,
    planned_source_bytes,
    source_block_bytes,
    source_block_merge_gap_bytes,
    source_get_concurrency,
    source_window_bytes,
    fetched_blocks,
    source_get_attempts,
    source_get_retries,
    source_get_request_errors,
    source_get_body_errors,
    source_get_short_body_errors,
    source_get_throttled_attempts,
    source_get_retryable_errors,
    source_get_permanent_errors,
    source_get_errors,
    fetched_source_bytes,
    block_hits,
    block_waits,
    block_waits_fetching,
    block_waits_capacity,
    block_releases,
    block_misses,
    block_refetches,
    replay_claims,
    replay_claims_after_release,
    replay_claims_after_failure,
    body_attempts,
    body_replays,
    active_gets_high_water,
    active_readers_high_water,
    resident_bytes_high_water,
);

pub(super) struct ActiveSourceGetGuard {
    diagnostics: Arc<SourceDiagnostics>,
}

pub(super) struct LocalCapacityWaitGuard {
    diagnostics: Arc<SourceDiagnostics>,
}

impl SourceDiagnostics {
    pub(super) fn record_plan(
        &self,
        options: SourceBlockOptions,
        blocks: &[SourceBlockRange],
        entries: usize,
    ) {
        self.planned_entries
            .store(entries as u64, Ordering::Relaxed);
        self.planned_blocks
            .store(blocks.len() as u64, Ordering::Relaxed);
        self.planned_source_bytes.store(
            blocks
                .iter()
                .map(|block| block.len())
                .fold(0_u64, u64::saturating_add),
            Ordering::Relaxed,
        );
        self.source_block_bytes
            .store(options.block_bytes as u64, Ordering::Relaxed);
        self.source_block_merge_gap_bytes
            .store(options.merge_gap_bytes as u64, Ordering::Relaxed);
        self.source_get_concurrency
            .store(options.get_concurrency as u64, Ordering::Relaxed);
        self.source_window_bytes
            .store(options.window_bytes as u64, Ordering::Relaxed);
    }

    pub(super) fn track_active_get(self: &Arc<Self>) -> ActiveSourceGetGuard {
        let active = self.active_gets.fetch_add(1, Ordering::AcqRel) + 1;
        update_high_water(&self.active_gets_high_water, active);
        ActiveSourceGetGuard {
            diagnostics: Arc::clone(self),
        }
    }

    pub(super) fn track_local_capacity_wait(self: &Arc<Self>) -> LocalCapacityWaitGuard {
        self.local_capacity_waiters.fetch_add(1, Ordering::AcqRel);
        LocalCapacityWaitGuard {
            diagnostics: Arc::clone(self),
        }
    }

    pub(super) fn record_resident_bytes(&self, resident_bytes: u64) {
        update_high_water(&self.resident_bytes_high_water, resident_bytes);
    }

    pub(super) fn record_reader_started(&self) {
        let active = self.active_readers.fetch_add(1, Ordering::Relaxed) + 1;
        update_high_water(&self.active_readers_high_water, active);
    }

    pub(super) fn record_reader_finished(&self) {
        self.active_readers.fetch_sub(1, Ordering::Relaxed);
    }

    pub(super) fn record_wait_fetching(&self) {
        self.block_waits.fetch_add(1, Ordering::Relaxed);
        self.block_waits_fetching.fetch_add(1, Ordering::Relaxed);
    }

    pub(super) fn record_wait_capacity(&self) {
        self.block_waits.fetch_add(1, Ordering::Relaxed);
        self.block_waits_capacity.fetch_add(1, Ordering::Relaxed);
    }

    pub(super) fn record_replay_claim(&self) {
        self.replay_claims.fetch_add(1, Ordering::Relaxed);
    }

    pub(super) fn record_replay_claim_after_release(&self) {
        self.replay_claims_after_release
            .fetch_add(1, Ordering::Relaxed);
        self.block_refetches.fetch_add(1, Ordering::Relaxed);
    }

    pub(super) fn record_replay_claim_after_failure(&self) {
        self.replay_claims_after_failure
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(super) fn record_body_started(&self, replay: bool) {
        self.body_attempts.fetch_add(1, Ordering::Relaxed);
        if replay {
            self.body_replays.fetch_add(1, Ordering::Relaxed);
        }
    }
}

fn update_high_water(target: &AtomicU64, candidate: u64) {
    let mut current = target.load(Ordering::Relaxed);
    while candidate > current {
        match target.compare_exchange_weak(current, candidate, Ordering::Relaxed, Ordering::Relaxed)
        {
            Ok(_) => break,
            Err(next) => current = next,
        }
    }
}

impl Drop for ActiveSourceGetGuard {
    fn drop(&mut self) {
        self.diagnostics.active_gets.fetch_sub(1, Ordering::AcqRel);
    }
}

impl Drop for LocalCapacityWaitGuard {
    fn drop(&mut self) {
        self.diagnostics
            .local_capacity_waiters
            .fetch_sub(1, Ordering::AcqRel);
    }
}
