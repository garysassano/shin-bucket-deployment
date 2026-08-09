use std::collections::BTreeMap;
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Instant;

use serde::Serialize;

use crate::deployment::DeploymentRequest;
use crate::util::{duration_ms, lock_telemetry};

pub(crate) const MAX_FAILURE_DIAGNOSTIC_GROUPS: usize = 32;
pub(crate) const MAX_FAILURE_DIAGNOSTIC_LABELS: usize = 32;
pub(crate) const OTHER_DIAGNOSTIC_LABEL: &str = "Other";

/// Which transfer-phase span contains a source block fetch. The transfer entry
/// reader records each fetch wait into the counter of the phase that drove the
/// read, so a streaming upload body generating its content during the PUT is
/// attributed to the put span and a comparison-pass read to the prepare span.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum SourceFetchPhase {
    Prepare,
    Put,
}

/// Stats handle plus the phase label for a transfer entry reader. `None` is
/// threaded where a read must stay uncounted (the plan-phase embedded-catalog
/// read, which is not a transfer reader).
#[derive(Clone)]
pub(crate) struct TransferFetchStats {
    pub(crate) stats: Arc<DeploymentStats>,
    pub(crate) phase: SourceFetchPhase,
}

#[derive(Default)]
pub(crate) struct DeploymentStats {
    started: OnceInstant,
    plan_millis: AtomicU64,
    plan_source_heads_micros: AtomicU64,
    plan_catalog_micros: AtomicU64,
    plan_directory_micros: AtomicU64,
    plan_entries_micros: AtomicU64,
    plan_validation_micros: AtomicU64,
    plan_parts_micros: AtomicU64,
    destination_list_millis: AtomicU64,
    transfer_millis: AtomicU64,
    transfer_task_total_micros: AtomicU64,
    transfer_prepare_micros: AtomicU64,
    transfer_put_wait_micros: AtomicU64,
    transfer_prepare_source_wait_micros: AtomicU64,
    transfer_put_source_wait_micros: AtomicU64,
    delete_millis: AtomicU64,
    cloudfront_millis: AtomicU64,
    old_prefix_delete_millis: AtomicU64,
    callback_millis: AtomicU64,
    source_archives: AtomicU64,
    source_zip_bytes: AtomicU64,
    planned_entries: AtomicU64,
    filtered_entries: AtomicU64,
    marker_entries: AtomicU64,
    destination_objects: AtomicU64,
    destination_metadata_retained: AtomicU64,
    destination_page_objects_high_water: AtomicU64,
    delete_objects: AtomicU64,
    delete_batches: AtomicU64,
    delete_sdk_calls: AtomicU64,
    delete_failed_calls: AtomicU64,
    delete_requested_objects: AtomicU64,
    delete_unconfirmed_objects: AtomicU64,
    delete_no_such_bucket_requested_identifiers: AtomicU64,
    uploaded_objects: AtomicU64,
    uploaded_bytes: AtomicU64,
    skipped_objects: AtomicU64,
    conditional_conflicts: AtomicU64,
    copied_objects: AtomicU64,
    copied_bytes: AtomicU64,
    md5_non_fallback_hash_attempts: AtomicU64,
    md5_skips: AtomicU64,
    catalog_skips: AtomicU64,
    catalog_trusted_archives: AtomicU64,
    catalog_untrusted_archives: AtomicU64,
    catalog_trusted_entries: AtomicU64,
    catalog_fallback_hash_attempts: AtomicU64,
    marker_planning_passes: AtomicU64,
    marker_upload_passes: AtomicU64,
    marker_spooled_uploads: AtomicU64,
    source_planned_blocks: AtomicU64,
    source_planned_bytes: AtomicU64,
    source_fetched_blocks: AtomicU64,
    source_fetched_bytes: AtomicU64,
    source_get_attempts: AtomicU64,
    source_get_retries: AtomicU64,
    source_get_throttled_attempts: AtomicU64,
    source_get_retryable_errors: AtomicU64,
    source_get_permanent_errors: AtomicU64,
    source_get_request_errors: AtomicU64,
    source_get_body_errors: AtomicU64,
    source_get_short_body_errors: AtomicU64,
    source_get_errors: AtomicU64,
    source_block_hits: AtomicU64,
    source_block_misses: AtomicU64,
    source_block_refetches: AtomicU64,
    source_block_waits: AtomicU64,
    source_block_waits_fetching: AtomicU64,
    source_block_waits_capacity: AtomicU64,
    source_replay_claims: AtomicU64,
    source_replay_claims_after_release: AtomicU64,
    source_replay_claims_after_failure: AtomicU64,
    source_body_attempts: AtomicU64,
    source_body_replays: AtomicU64,
    source_active_gets_high_water: AtomicU64,
    source_active_readers_high_water: AtomicU64,
    source_resident_bytes_high_water: AtomicU64,
    source_global_budget_bytes: AtomicU64,
    source_global_resident_bytes: AtomicU64,
    source_global_resident_bytes_high_water: AtomicU64,
    source_global_release_anomalies: AtomicU64,
    transfer_scheduled_objects: AtomicU64,
    transfer_completed_objects: AtomicU64,
    transfer_failed_objects: AtomicU64,
    transfer_cancelled_objects: AtomicU64,
    transfer_panicked_objects: AtomicU64,
    transfer_in_flight_high_water: AtomicU64,
    put_wire_attempts: AtomicU64,
    put_failed_attempts: AtomicU64,
    put_retry_attempts: AtomicU64,
    put_throttled_attempts: AtomicU64,
    put_retry_wait_millis: AtomicU64,
    put_throttle_cooldown_waits: AtomicU64,
    put_throttle_cooldown_wait_millis: AtomicU64,
    detailed_put_object: Option<Box<DetailedPutObjectStats>>,
    copy_wire_attempts: AtomicU64,
    copy_failed_attempts: AtomicU64,
    copy_retry_attempts: AtomicU64,
    copy_throttled_attempts: AtomicU64,
    copy_retry_wait_millis: AtomicU64,
    copy_throttle_cooldown_waits: AtomicU64,
    copy_throttle_cooldown_wait_millis: AtomicU64,
    callback_wire_attempts: AtomicU64,
    callback_failed_attempts: AtomicU64,
    callback_retry_attempts: AtomicU64,
    callback_confirmed_responses: AtomicU64,
}

#[derive(Default)]
struct DetailedPutObjectStats {
    failures_by_sdk_error_kind: Mutex<BTreeMap<String, u64>>,
    failures_by_service_code: Mutex<BTreeMap<String, u64>>,
    failure_states: Mutex<Vec<PutObjectFailureStateStats>>,
    failure_state_overflow_attempts: AtomicU64,
}

struct OnceInstant(Instant);

/// Converts an accumulated microsecond span to whole milliseconds, rounding to
/// the nearest millisecond so a sub-millisecond span reports 1 ms instead of 0.
///
/// This conversion happens exactly once, at snapshot time, after the planning
/// stages have accumulated at microsecond resolution. The rounding is part of
/// the `phaseMs` contract: a nonzero stage never disappears into a constant 0
/// the way per-call `duration_ms` truncation erased every sub-millisecond
/// span, and a stage that never ran stays 0 because its counter was never
/// incremented.
fn micros_to_millis(micros: u64) -> u64 {
    micros.saturating_add(500) / 1_000
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentStatsSnapshot<'a> {
    pub(crate) event: &'static str,
    pub(crate) request_type: &'a str,
    pub(crate) deployment_status: &'a str,
    pub(crate) extract: bool,
    pub(crate) delete_stale_objects_on_deployment: bool,
    pub(crate) available_memory_mb: u64,
    pub(crate) max_parallel_transfers: usize,
    pub(crate) detailed_failure_diagnostics_enabled: bool,
    pub(crate) duration_ms: u64,
    pub(crate) phase_ms: PhaseMillis,
    pub(crate) counts: DeploymentCounts,
    pub(crate) bytes: DeploymentBytes,
    pub(crate) transfer: TransferStats,
    pub(crate) marker_replacement: MarkerReplacementStats,
    pub(crate) catalog: CatalogStats,
    pub(crate) source: SourceStats,
    pub(crate) put_object: PutObjectStats,
    pub(crate) copy_object: CopyObjectStats,
    pub(crate) delete_object: DeleteObjectStats,
    pub(crate) callback: CallbackStats,
}

// Phase timing definition site. The `phaseMs.plan` split is the instrument that
// tells CPU cost apart from S3 round-trips inside source planning, so its
// accounting rules live here and the call sites in `s3/planner.rs` and
// `s3/mod.rs` must keep them:
//
// - `planCatalog` is catalog-object work only: locating the embedded catalog
//   entry, the ranged GET that fetches it, decompression, CRC, SHA-256
//   authentication, and JSON parse. Cross-archive catalog validation
//   (`validate_catalog_entries`) is charged to `planValidation`, not here:
//   "fetch and authenticate the catalog object" and "validate the catalog
//   against the archive" are different buckets, and `planValidation` is the
//   documented validation bucket.
// - `planDirectory` is the EOCD scan, central-directory fetch, and the
//   `ZipFileReader` construction that parses it, per archive.
// - `planEntries` is the per-entry manifest loop (path normalization, filters,
//   expansion checks, span derivation, manifest insertion), per archive.
// - `planValidation` is all validation: `validate_archive_directory` per
//   archive, `validate_catalog_entries` for authenticated catalogs, and the
//   phase-level `validate_deployment_preflight`.
//
// The five sub-timings accumulate at microsecond resolution and are converted
// to whole milliseconds once, at snapshot time: `planCatalog`, `planDirectory`,
// `planEntries`, and `planValidation` accumulate per archive, while
// `planSourceHeads` accumulates per source. Per-call millisecond truncation
// made every sub-millisecond stage report a constant 0, so the instrument was
// coarser than the ~0.5 ms-per-entry cost it exists to attribute; the snapshot
// conversion rounds to the nearest millisecond instead (see
// [`micros_to_millis`]).
//
// What `plan` measures beyond the five parts (the residual is exactly
// `plan - planSourceHeads - planCatalog - planDirectory - planEntries -
// planValidation`, all five of which are present in every summary, at
// microsecond resolution; the published millisecond values are rounded
// independently, so a residual computed from them is approximate rather than
// exact): request length checks, source-budget setup, filter compilation,
// manifest insertion in copy mode, `collect_zip_entry_plans`, and the
// planned-entries accounting.
// `planSourceHeads` carries the per-source metadata `HeadObject` await in both
// extract and copy mode; it is exclusive because those awaits happen in the
// `plan_deployment` loop, outside the catalog/directory/entries/validation
// buckets. In copy mode (`Extract: false`) none of the ZIP stages run, so the
// four ZIP parts report 0 and `plan` is the `planSourceHeads` round-trips plus
// the CPU-only residual; the parts being zero there is the honest answer, not
// an omission.
//
// Concurrency constraint: these are wall-clock spans, and summing them only
// means anything while source planning is sequential — it is today, one archive
// at a time in `plan_deployment`. If planning ever becomes concurrent (P-7),
// the spans overlap and `planCatalog + planDirectory + planEntries +
// planValidation` stops being a partition; the accounting must then move to
// per-archive self-time spans that degrade honestly instead of silently
// double-counting elapsed time.
//
// What `transfer` measures beyond the five sub-timings: the scheduler loop
// (per-archive source block stores, marker compilation, catalog skips) and the
// direct-copy path (`copy_source_object`, which is never instrumented by the
// transfer sub-timings), plus the post-transfer diagnostics logging. The five
// sub-timings do NOT partition `transfer`, and `transferTaskTotal` is NOT a
// wall-clock span: up to `maxParallelTransfers` ZIP-entry tasks run
// concurrently, so `transferTaskTotal`, `transferPrepare`, and
// `transferPutWait` are sums across tasks and can legitimately exceed the
// `transfer` wall clock, often by a large multiple. For tasks that run to
// completion, `transferPrepare + transferPutWait <= transferTaskTotal` holds
// at microsecond resolution (the remainder is scheduler and task overhead). A
// task aborted at the work deadline records `transferPrepare` but never
// reaches the `transferPutWait` or `transferTaskTotal` accumulations, so
// aborted tasks under-report the spans they never finished and can break that
// containment across the summary. The published millisecond values are each
// rounded independently, so every member can differ by up to its rounding
// envelope; the containment must not be asserted on published values.
//
// Source fetches are attributed to the phase span that contains them rather
// than accumulated in a separate overlay: the transfer entry reader carries a
// phase label (`SourceFetchPhase`) alongside its stats handle, and a fetch
// that resolves inside the comparison/prepare span lands in
// `transferPrepareSourceWait` while one inside the upload/PUT span (a
// streaming body that generates its content during the PUT) lands in
// `transferPutSourceWait`. The plan-phase embedded-catalog read passes no
// stats handle and is never counted. The resulting attribution:
// source-network time = `transferPrepareSourceWait +
// transferPutSourceWait`; prepare CPU = `transferPrepare -
// transferPrepareSourceWait`; `transferPutWait - transferPutSourceWait` is
// destination-network wait plus any streaming CPU done during the PUT — the
// two are NOT separable with the current instrument, so there is no clean
// three-way CPU/source/destination split. Only ZIP-entry transfer tasks are
// instrumented; direct-copy tasks are a separate path and are excluded from
// `transferTaskTotal`, so on copy-heavy workloads `transferTaskTotal` is much
// smaller than `transfer`. These counters accumulate at microsecond
// resolution and convert to whole milliseconds exactly once at snapshot time,
// like the plan sub-timings.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PhaseMillis {
    pub(crate) plan: u64,
    pub(crate) plan_source_heads: u64,
    pub(crate) plan_catalog: u64,
    pub(crate) plan_directory: u64,
    pub(crate) plan_entries: u64,
    pub(crate) plan_validation: u64,
    pub(crate) destination_list: u64,
    pub(crate) transfer: u64,
    pub(crate) transfer_task_total: u64,
    pub(crate) transfer_prepare: u64,
    pub(crate) transfer_put_wait: u64,
    pub(crate) transfer_prepare_source_wait: u64,
    pub(crate) transfer_put_source_wait: u64,
    pub(crate) delete: u64,
    pub(crate) cloudfront: u64,
    pub(crate) old_prefix_delete: u64,
    pub(crate) callback: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentCounts {
    pub(crate) source_archives: u64,
    pub(crate) planned_entries: u64,
    pub(crate) filtered_entries: u64,
    pub(crate) marker_entries: u64,
    pub(crate) destination_objects: u64,
    pub(crate) destination_metadata_retained: u64,
    pub(crate) destination_page_objects_high_water: u64,
    pub(crate) delete_objects: u64,
    pub(crate) delete_batches: u64,
    pub(crate) uploaded_objects: u64,
    pub(crate) skipped_objects: u64,
    pub(crate) conditional_conflicts: u64,
    pub(crate) copied_objects: u64,
    /// Planned entries whose content (or marker-replaced output) was read and hashed
    /// with MD5 for a pre-upload destination comparison pass. This aggregates the
    /// marker planning-pass hashes and the untrusted marker-free catalog-fallback
    /// hash (which the `catalog` section also reports separately as
    /// `fallbackHashAttempts`). Trusted marker-free entries are catalog-skipped or
    /// validated inline during upload and never count here. The serialized field
    /// name is part of the published diagnostics contract, so the aggregated meaning
    /// is documented here rather than by renaming the field.
    pub(crate) md5_hash_attempts: u64,
    pub(crate) md5_skips: u64,
    pub(crate) catalog_skips: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeploymentBytes {
    pub(crate) source_zip: u64,
    pub(crate) uploaded: u64,
    pub(crate) copied: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct SourceStats {
    pub(crate) planned_blocks: u64,
    pub(crate) planned_bytes: u64,
    pub(crate) fetched_blocks: u64,
    pub(crate) fetched_bytes: u64,
    pub(crate) get_attempts: u64,
    pub(crate) get_retries: u64,
    pub(crate) get_throttled_attempts: u64,
    pub(crate) get_retryable_errors: u64,
    pub(crate) get_permanent_errors: u64,
    pub(crate) get_request_errors: u64,
    pub(crate) get_body_errors: u64,
    pub(crate) get_short_body_errors: u64,
    pub(crate) get_errors: u64,
    pub(crate) block_hits: u64,
    pub(crate) block_misses: u64,
    pub(crate) block_refetches: u64,
    pub(crate) block_waits: u64,
    pub(crate) block_waits_fetching: u64,
    pub(crate) block_waits_capacity: u64,
    pub(crate) replay_claims: u64,
    pub(crate) replay_claims_after_release: u64,
    pub(crate) replay_claims_after_failure: u64,
    pub(crate) body_attempts: u64,
    pub(crate) body_replays: u64,
    pub(crate) active_gets_high_water: u64,
    pub(crate) active_readers_high_water: u64,
    pub(crate) resident_bytes_high_water: u64,
    pub(crate) global_budget_bytes: u64,
    pub(crate) global_resident_bytes_current: u64,
    pub(crate) global_resident_bytes_high_water: u64,
    pub(crate) global_release_anomalies: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TransferStats {
    pub(crate) scheduled_objects: u64,
    pub(crate) completed_objects: u64,
    pub(crate) failed_objects: u64,
    pub(crate) cancelled_objects: u64,
    pub(crate) panicked_objects: u64,
    pub(crate) in_flight_high_water: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct MarkerReplacementStats {
    pub(crate) strategy: &'static str,
    pub(crate) semantics: &'static str,
    pub(crate) planned_passes_per_upload: u8,
    pub(crate) planning_passes: u64,
    pub(crate) upload_passes: u64,
    pub(crate) spooled_uploads: u64,
}

#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectStats {
    pub(crate) wire_attempts: u64,
    pub(crate) failed_attempts: u64,
    pub(crate) retry_attempts: u64,
    pub(crate) throttled_attempts: u64,
    pub(crate) retry_wait_ms: u64,
    pub(crate) throttle_cooldown_waits: u64,
    pub(crate) throttle_cooldown_wait_ms: u64,
    pub(crate) failures_by_sdk_error_kind: BTreeMap<String, u64>,
    pub(crate) failures_by_service_code: BTreeMap<String, u64>,
    pub(crate) failure_states: Vec<PutObjectFailureStateStats>,
    pub(crate) failure_state_overflow_attempts: u64,
}

/// CopyObject counterpart to `PutObjectStats`. Only the seven counters that a copy
/// can actually produce are represented: copies run with detailed diagnostics
/// disabled and never call `record_put_failure`, so the four PutObject-only failure
/// breakdown fields are omitted rather than reported as empty.
#[derive(Clone, Debug, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CopyObjectStats {
    pub(crate) wire_attempts: u64,
    pub(crate) failed_attempts: u64,
    pub(crate) retry_attempts: u64,
    pub(crate) throttled_attempts: u64,
    pub(crate) retry_wait_ms: u64,
    pub(crate) throttle_cooldown_waits: u64,
    pub(crate) throttle_cooldown_wait_ms: u64,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectFailureStateStats {
    pub(crate) count: u64,
    pub(crate) sdk_error_kind: String,
    pub(crate) dispatch_failure_kind: Option<String>,
    pub(crate) service_code: Option<String>,
    pub(crate) elapsed_ms: DiagnosticRangeStats,
    pub(crate) body: PutObjectFailureBodyStats,
    pub(crate) source: PutObjectFailureSourceStats,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectFailureBodyStats {
    pub(crate) attempt_observed: bool,
    pub(crate) replay: bool,
    pub(crate) producer_stage: String,
    pub(crate) final_frame_delivered: bool,
    pub(crate) producer_completed: bool,
    pub(crate) body_error_observed: bool,
    pub(crate) receiver_dropped: bool,
    pub(crate) receiver_drop_aborted_producer: bool,
    pub(crate) attempt_number: DiagnosticRangeStats,
    pub(crate) bytes_emitted: DiagnosticRangeStats,
    pub(crate) remaining_bytes: DiagnosticRangeStats,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PutObjectFailureSourceStats {
    pub(crate) observed: bool,
    pub(crate) local_window_bytes: DiagnosticRangeStats,
    pub(crate) local_committed_bytes: DiagnosticRangeStats,
    pub(crate) local_resident_bytes: DiagnosticRangeStats,
    pub(crate) local_capacity_waiters: DiagnosticRangeStats,
    pub(crate) global_budget_bytes: DiagnosticRangeStats,
    pub(crate) global_resident_bytes: DiagnosticRangeStats,
    pub(crate) global_available_permits: DiagnosticRangeStats,
    pub(crate) global_permit_unit_bytes: DiagnosticRangeStats,
    pub(crate) global_permit_waiters: DiagnosticRangeStats,
    pub(crate) active_fetches: DiagnosticRangeStats,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DiagnosticRangeStats {
    pub(crate) min: u64,
    pub(crate) max: u64,
    pub(crate) total: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogStats {
    pub(crate) trusted_archives: u64,
    pub(crate) untrusted_archives: u64,
    pub(crate) trusted_entries: u64,
    pub(crate) fallback_hash_attempts: u64,
    pub(crate) sparse_skips: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct DeleteObjectStats {
    pub(crate) sdk_calls: u64,
    pub(crate) failed_calls: u64,
    pub(crate) requested_objects: u64,
    pub(crate) inferred_deleted_objects: u64,
    pub(crate) unconfirmed_objects: u64,
    pub(crate) no_such_bucket_requested_identifiers: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CallbackStats {
    pub(crate) wire_attempts: u64,
    pub(crate) failed_attempts: u64,
    pub(crate) retry_attempts: u64,
    pub(crate) confirmed_responses: u64,
}

impl Default for OnceInstant {
    fn default() -> Self {
        Self(Instant::now())
    }
}

impl DeploymentStats {
    pub(crate) fn new(detailed_failure_diagnostics: bool) -> Self {
        Self {
            detailed_put_object: detailed_failure_diagnostics
                .then(|| Box::new(DetailedPutObjectStats::default())),
            ..Self::default()
        }
    }

    pub(crate) fn detailed_failure_diagnostics_enabled(&self) -> bool {
        self.detailed_put_object.is_some()
    }

    pub(crate) fn add_plan_millis(&self, millis: u64) {
        self.plan_millis.fetch_add(millis, Ordering::Relaxed);
    }

    /// Records one source-planning stage span into its bucket and into the
    /// shared parts total, so `plan_parts_micros` is the exclusive union of the
    /// five buckets at microsecond resolution. The identity
    /// `parts == source_heads + catalog + directory + entries + validation` is what the
    /// sub-timing partition tests assert; the buckets are fed by the call sites
    /// in `s3/planner.rs` and `s3/mod.rs` described at the `PhaseMillis`
    /// definition site.
    fn add_plan_stage_micros(&self, bucket: &AtomicU64, micros: u64) {
        bucket.fetch_add(micros, Ordering::Relaxed);
        self.plan_parts_micros.fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_plan_source_heads_micros(&self, micros: u64) {
        self.add_plan_stage_micros(&self.plan_source_heads_micros, micros);
    }

    pub(crate) fn add_plan_catalog_micros(&self, micros: u64) {
        self.add_plan_stage_micros(&self.plan_catalog_micros, micros);
    }

    pub(crate) fn add_plan_directory_micros(&self, micros: u64) {
        self.add_plan_stage_micros(&self.plan_directory_micros, micros);
    }

    pub(crate) fn add_plan_entries_micros(&self, micros: u64) {
        self.add_plan_stage_micros(&self.plan_entries_micros, micros);
    }

    pub(crate) fn add_plan_validation_micros(&self, micros: u64) {
        self.add_plan_stage_micros(&self.plan_validation_micros, micros);
    }

    // Read accessors for the sub-timings. `bench-internals` is the dev-only
    // criterion-bench feature (`pnpm rust:bench`); the normal build is unchanged.
    #[cfg(any(test, feature = "bench-internals"))]
    #[cfg_attr(feature = "bench-internals", allow(dead_code))]
    pub(crate) fn plan_parts_micros_for_test(&self) -> (u64, u64, u64, u64, u64, u64) {
        (
            self.plan_source_heads_micros.load(Ordering::Relaxed),
            self.plan_catalog_micros.load(Ordering::Relaxed),
            self.plan_directory_micros.load(Ordering::Relaxed),
            self.plan_entries_micros.load(Ordering::Relaxed),
            self.plan_validation_micros.load(Ordering::Relaxed),
            self.plan_parts_micros.load(Ordering::Relaxed),
        )
    }

    #[cfg(any(test, feature = "bench-internals"))]
    #[cfg_attr(feature = "bench-internals", allow(dead_code))]
    pub(crate) fn transfer_subtimings_micros_for_test(&self) -> (u64, u64, u64, u64, u64) {
        (
            self.transfer_task_total_micros.load(Ordering::Relaxed),
            self.transfer_prepare_micros.load(Ordering::Relaxed),
            self.transfer_put_wait_micros.load(Ordering::Relaxed),
            self.transfer_prepare_source_wait_micros
                .load(Ordering::Relaxed),
            self.transfer_put_source_wait_micros.load(Ordering::Relaxed),
        )
    }

    pub(crate) fn add_destination_list_millis(&self, millis: u64) {
        self.destination_list_millis
            .fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_task_total_micros(&self, micros: u64) {
        self.transfer_task_total_micros
            .fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_prepare_micros(&self, micros: u64) {
        self.transfer_prepare_micros
            .fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_put_wait_micros(&self, micros: u64) {
        self.transfer_put_wait_micros
            .fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_prepare_source_wait_micros(&self, micros: u64) {
        self.transfer_prepare_source_wait_micros
            .fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_put_source_wait_micros(&self, micros: u64) {
        self.transfer_put_source_wait_micros
            .fetch_add(micros, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_millis(&self, millis: u64) {
        self.transfer_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_delete_millis(&self, millis: u64) {
        self.delete_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_cloudfront_millis(&self, millis: u64) {
        self.cloudfront_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_old_prefix_delete_millis(&self, millis: u64) {
        self.old_prefix_delete_millis
            .fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_callback_millis(&self, millis: u64) {
        self.callback_millis.fetch_add(millis, Ordering::Relaxed);
    }

    pub(crate) fn add_source_archive(&self, source_zip_bytes: u64) {
        self.source_archives.fetch_add(1, Ordering::Relaxed);
        self.source_zip_bytes
            .fetch_add(source_zip_bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_planned_entries(&self, count: u64) {
        self.planned_entries.fetch_add(count, Ordering::Relaxed);
    }

    pub(crate) fn add_filtered_entry(&self) {
        self.filtered_entries.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_entry(&self) {
        self.marker_entries.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_destination_objects(&self, count: u64) {
        self.destination_objects.fetch_add(count, Ordering::Relaxed);
    }

    pub(crate) fn set_destination_metadata_retained(&self, count: u64) {
        self.destination_metadata_retained
            .store(count, Ordering::Relaxed);
    }

    pub(crate) fn record_destination_page_objects(&self, count: u64) {
        self.destination_page_objects_high_water
            .fetch_max(count, Ordering::Relaxed);
    }

    pub(crate) fn record_delete_sdk_call(&self, requested: u64) {
        self.delete_sdk_calls.fetch_add(1, Ordering::Relaxed);
        self.delete_requested_objects
            .fetch_add(requested, Ordering::Relaxed);
    }

    pub(crate) fn record_delete_failure(&self, unconfirmed: u64) {
        self.delete_failed_calls.fetch_add(1, Ordering::Relaxed);
        self.delete_unconfirmed_objects
            .fetch_add(unconfirmed, Ordering::Relaxed);
    }

    pub(crate) fn record_delete_no_such_bucket(&self, requested_identifiers: u64) {
        self.delete_no_such_bucket_requested_identifiers
            .fetch_add(requested_identifiers, Ordering::Relaxed);
    }

    pub(crate) fn record_delete_response(&self, inferred_deleted: u64, unconfirmed: u64) {
        if inferred_deleted > 0 {
            self.delete_objects
                .fetch_add(inferred_deleted, Ordering::Relaxed);
            self.delete_batches.fetch_add(1, Ordering::Relaxed);
        }
        if unconfirmed > 0 {
            self.delete_failed_calls.fetch_add(1, Ordering::Relaxed);
            self.delete_unconfirmed_objects
                .fetch_add(unconfirmed, Ordering::Relaxed);
        }
    }

    pub(crate) fn add_uploaded_object(&self, bytes: u64) {
        self.uploaded_objects.fetch_add(1, Ordering::Relaxed);
        self.uploaded_bytes.fetch_add(bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_skipped_object(&self) {
        self.skipped_objects.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_conditional_conflict(&self) {
        self.conditional_conflicts.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_copied_object(&self, bytes: u64) {
        self.copied_objects.fetch_add(1, Ordering::Relaxed);
        self.copied_bytes.fetch_add(bytes, Ordering::Relaxed);
    }

    pub(crate) fn add_md5_hash_attempt(&self) {
        self.md5_non_fallback_hash_attempts
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_catalog_fallback_hash_attempt(&self) {
        self.catalog_fallback_hash_attempts
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_md5_skip(&self) {
        self.md5_skips.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_catalog_skip(&self) {
        self.catalog_skips.fetch_add(1, Ordering::Relaxed);
        self.add_skipped_object();
    }

    pub(crate) fn add_trusted_catalog(&self, entries: u64) {
        self.catalog_trusted_archives
            .fetch_add(1, Ordering::Relaxed);
        self.catalog_trusted_entries
            .fetch_add(entries, Ordering::Relaxed);
    }

    pub(crate) fn add_untrusted_catalog(&self) {
        self.catalog_untrusted_archives
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn record_callback_attempt(&self, retry: bool) {
        self.callback_wire_attempts.fetch_add(1, Ordering::Relaxed);
        if retry {
            self.callback_retry_attempts.fetch_add(1, Ordering::Relaxed);
        }
    }

    pub(crate) fn record_callback_failure(&self) {
        self.callback_failed_attempts
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn record_callback_success(&self) {
        self.callback_confirmed_responses
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_planning_pass(&self) {
        self.marker_planning_passes.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_upload_pass(&self) {
        self.marker_upload_passes.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_marker_spooled_upload(&self) {
        self.marker_spooled_uploads.fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_source_stats(
        &self,
        stats: &crate::s3::archive::diagnostics::SourceDiagnosticsSnapshot,
    ) {
        self.source_planned_blocks
            .fetch_add(stats.planned_blocks, Ordering::Relaxed);
        self.source_planned_bytes
            .fetch_add(stats.planned_source_bytes, Ordering::Relaxed);
        self.source_fetched_blocks
            .fetch_add(stats.fetched_blocks, Ordering::Relaxed);
        self.source_fetched_bytes
            .fetch_add(stats.fetched_source_bytes, Ordering::Relaxed);
        self.source_get_attempts
            .fetch_add(stats.source_get_attempts, Ordering::Relaxed);
        self.source_get_retries
            .fetch_add(stats.source_get_retries, Ordering::Relaxed);
        self.source_get_throttled_attempts
            .fetch_add(stats.source_get_throttled_attempts, Ordering::Relaxed);
        self.source_get_retryable_errors
            .fetch_add(stats.source_get_retryable_errors, Ordering::Relaxed);
        self.source_get_permanent_errors
            .fetch_add(stats.source_get_permanent_errors, Ordering::Relaxed);
        self.source_get_request_errors
            .fetch_add(stats.source_get_request_errors, Ordering::Relaxed);
        self.source_get_body_errors
            .fetch_add(stats.source_get_body_errors, Ordering::Relaxed);
        self.source_get_short_body_errors
            .fetch_add(stats.source_get_short_body_errors, Ordering::Relaxed);
        self.source_get_errors
            .fetch_add(stats.source_get_errors, Ordering::Relaxed);
        self.source_block_hits
            .fetch_add(stats.block_hits, Ordering::Relaxed);
        self.source_block_misses
            .fetch_add(stats.block_misses, Ordering::Relaxed);
        self.source_block_refetches
            .fetch_add(stats.block_refetches, Ordering::Relaxed);
        self.source_block_waits
            .fetch_add(stats.block_waits, Ordering::Relaxed);
        self.source_block_waits_fetching
            .fetch_add(stats.block_waits_fetching, Ordering::Relaxed);
        self.source_block_waits_capacity
            .fetch_add(stats.block_waits_capacity, Ordering::Relaxed);
        self.source_replay_claims
            .fetch_add(stats.replay_claims, Ordering::Relaxed);
        self.source_replay_claims_after_release
            .fetch_add(stats.replay_claims_after_release, Ordering::Relaxed);
        self.source_replay_claims_after_failure
            .fetch_add(stats.replay_claims_after_failure, Ordering::Relaxed);
        self.source_body_attempts
            .fetch_add(stats.body_attempts, Ordering::Relaxed);
        self.source_body_replays
            .fetch_add(stats.body_replays, Ordering::Relaxed);
        self.source_active_gets_high_water
            .fetch_max(stats.active_gets_high_water, Ordering::Relaxed);
        self.source_active_readers_high_water
            .fetch_max(stats.active_readers_high_water, Ordering::Relaxed);
        self.source_resident_bytes_high_water
            .fetch_max(stats.resident_bytes_high_water, Ordering::Relaxed);
    }

    pub(crate) fn configure_source_global_budget(&self, bytes: u64) {
        self.source_global_budget_bytes
            .store(bytes, Ordering::Relaxed);
    }

    pub(crate) fn acquire_source_global_bytes(&self, bytes: u64) {
        let resident = self
            .source_global_resident_bytes
            .fetch_add(bytes, Ordering::AcqRel)
            .saturating_add(bytes);
        self.source_global_resident_bytes_high_water
            .fetch_max(resident, Ordering::Relaxed);
    }

    pub(crate) fn release_source_global_bytes(&self, bytes: u64) {
        let previous = match self.source_global_resident_bytes.fetch_update(
            Ordering::AcqRel,
            Ordering::Acquire,
            |resident| Some(resident.saturating_sub(bytes)),
        ) {
            Ok(previous) | Err(previous) => previous,
        };
        if previous < bytes {
            self.source_global_release_anomalies
                .fetch_add(1, Ordering::Relaxed);
            tracing::warn!(
                released_bytes = bytes,
                accounted_bytes = previous,
                "source global byte accounting release exceeded resident bytes"
            );
        }
    }

    pub(crate) fn source_global_resident_bytes_current(&self) -> u64 {
        self.source_global_resident_bytes.load(Ordering::Acquire)
    }

    #[cfg(test)]
    pub(crate) fn source_global_memory_for_test(&self) -> (u64, u64, u64) {
        (
            self.source_global_budget_bytes.load(Ordering::Relaxed),
            self.source_global_resident_bytes.load(Ordering::Relaxed),
            self.source_global_resident_bytes_high_water
                .load(Ordering::Relaxed),
        )
    }

    pub(crate) fn add_transfer_scheduled_object(&self, in_flight: usize) {
        self.transfer_scheduled_objects
            .fetch_add(1, Ordering::Relaxed);
        self.transfer_in_flight_high_water.fetch_max(
            u64::try_from(in_flight).unwrap_or(u64::MAX),
            Ordering::Relaxed,
        );
    }

    pub(crate) fn add_transfer_completed_object(&self) {
        self.transfer_completed_objects
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_transfer_failed_object(&self, panicked: bool) {
        self.transfer_failed_objects.fetch_add(1, Ordering::Relaxed);
        if panicked {
            self.transfer_panicked_objects
                .fetch_add(1, Ordering::Relaxed);
        }
    }

    pub(crate) fn add_transfer_cancelled_object(&self) {
        self.transfer_cancelled_objects
            .fetch_add(1, Ordering::Relaxed);
    }

    pub(crate) fn add_copy_stats(&self, stats: &CopyObjectStats) {
        self.copy_wire_attempts
            .fetch_add(stats.wire_attempts, Ordering::Relaxed);
        self.copy_failed_attempts
            .fetch_add(stats.failed_attempts, Ordering::Relaxed);
        self.copy_retry_attempts
            .fetch_add(stats.retry_attempts, Ordering::Relaxed);
        self.copy_throttled_attempts
            .fetch_add(stats.throttled_attempts, Ordering::Relaxed);
        self.copy_retry_wait_millis
            .fetch_add(stats.retry_wait_ms, Ordering::Relaxed);
        self.copy_throttle_cooldown_waits
            .fetch_add(stats.throttle_cooldown_waits, Ordering::Relaxed);
        self.copy_throttle_cooldown_wait_millis
            .fetch_add(stats.throttle_cooldown_wait_ms, Ordering::Relaxed);
    }

    pub(crate) fn add_put_stats(&self, stats: &PutObjectStats) {
        self.put_wire_attempts
            .fetch_add(stats.wire_attempts, Ordering::Relaxed);
        self.put_failed_attempts
            .fetch_add(stats.failed_attempts, Ordering::Relaxed);
        self.put_retry_attempts
            .fetch_add(stats.retry_attempts, Ordering::Relaxed);
        self.put_throttled_attempts
            .fetch_add(stats.throttled_attempts, Ordering::Relaxed);
        self.put_retry_wait_millis
            .fetch_add(stats.retry_wait_ms, Ordering::Relaxed);
        self.put_throttle_cooldown_waits
            .fetch_add(stats.throttle_cooldown_waits, Ordering::Relaxed);
        self.put_throttle_cooldown_wait_millis
            .fetch_add(stats.throttle_cooldown_wait_ms, Ordering::Relaxed);
        if let Some(detailed) = &self.detailed_put_object {
            merge_diagnostic_counts(
                &detailed.failures_by_sdk_error_kind,
                &stats.failures_by_sdk_error_kind,
            );
            merge_diagnostic_counts(
                &detailed.failures_by_service_code,
                &stats.failures_by_service_code,
            );
            let overflow = merge_failure_states(&detailed.failure_states, &stats.failure_states)
                .saturating_add(stats.failure_state_overflow_attempts);
            detailed
                .failure_state_overflow_attempts
                .fetch_add(overflow, Ordering::Relaxed);
        }
    }

    pub(crate) fn snapshot<'a>(
        &'a self,
        request_type: &'a str,
        deployment_status: &'a str,
        request: &DeploymentRequest,
    ) -> DeploymentStatsSnapshot<'a> {
        DeploymentStatsSnapshot {
            event: "shin_deployment_summary",
            request_type,
            deployment_status,
            extract: request.extract,
            delete_stale_objects_on_deployment: request.delete_stale_objects_on_deployment,
            available_memory_mb: request.runtime.available_memory_mb,
            max_parallel_transfers: request.runtime.max_parallel_transfers,
            detailed_failure_diagnostics_enabled: self.detailed_failure_diagnostics_enabled(),
            duration_ms: duration_ms(self.started.0.elapsed()),
            phase_ms: PhaseMillis {
                plan: self.plan_millis.load(Ordering::Relaxed),
                plan_source_heads: micros_to_millis(
                    self.plan_source_heads_micros.load(Ordering::Relaxed),
                ),
                plan_catalog: micros_to_millis(self.plan_catalog_micros.load(Ordering::Relaxed)),
                plan_directory: micros_to_millis(
                    self.plan_directory_micros.load(Ordering::Relaxed),
                ),
                plan_entries: micros_to_millis(self.plan_entries_micros.load(Ordering::Relaxed)),
                plan_validation: micros_to_millis(
                    self.plan_validation_micros.load(Ordering::Relaxed),
                ),
                destination_list: self.destination_list_millis.load(Ordering::Relaxed),
                transfer: self.transfer_millis.load(Ordering::Relaxed),
                transfer_task_total: micros_to_millis(
                    self.transfer_task_total_micros.load(Ordering::Relaxed),
                ),
                transfer_prepare: micros_to_millis(
                    self.transfer_prepare_micros.load(Ordering::Relaxed),
                ),
                transfer_put_wait: micros_to_millis(
                    self.transfer_put_wait_micros.load(Ordering::Relaxed),
                ),
                transfer_prepare_source_wait: micros_to_millis(
                    self.transfer_prepare_source_wait_micros
                        .load(Ordering::Relaxed),
                ),
                transfer_put_source_wait: micros_to_millis(
                    self.transfer_put_source_wait_micros.load(Ordering::Relaxed),
                ),
                delete: self.delete_millis.load(Ordering::Relaxed),
                cloudfront: self.cloudfront_millis.load(Ordering::Relaxed),
                old_prefix_delete: self.old_prefix_delete_millis.load(Ordering::Relaxed),
                callback: self.callback_millis.load(Ordering::Relaxed),
            },
            counts: DeploymentCounts {
                source_archives: self.source_archives.load(Ordering::Relaxed),
                planned_entries: self.planned_entries.load(Ordering::Relaxed),
                filtered_entries: self.filtered_entries.load(Ordering::Relaxed),
                marker_entries: self.marker_entries.load(Ordering::Relaxed),
                destination_objects: self.destination_objects.load(Ordering::Relaxed),
                destination_metadata_retained: self
                    .destination_metadata_retained
                    .load(Ordering::Relaxed),
                destination_page_objects_high_water: self
                    .destination_page_objects_high_water
                    .load(Ordering::Relaxed),
                delete_objects: self.delete_objects.load(Ordering::Relaxed),
                delete_batches: self.delete_batches.load(Ordering::Relaxed),
                uploaded_objects: self.uploaded_objects.load(Ordering::Relaxed),
                skipped_objects: self.skipped_objects.load(Ordering::Relaxed),
                conditional_conflicts: self.conditional_conflicts.load(Ordering::Relaxed),
                copied_objects: self.copied_objects.load(Ordering::Relaxed),
                // `md5HashAttempts` is the sum of both hash-attempt counters: every
                // entry admitted to the pre-upload comparison pass hashes its content
                // (or its marker-replaced output) with MD5, whether that pass plans
                // marker output or falls back to hashing an untrusted marker-free
                // entry. The fallback half is also reported separately as
                // `catalog.fallbackHashAttempts`.
                md5_hash_attempts: self
                    .md5_non_fallback_hash_attempts
                    .load(Ordering::Relaxed)
                    .saturating_add(self.catalog_fallback_hash_attempts.load(Ordering::Relaxed)),
                md5_skips: self.md5_skips.load(Ordering::Relaxed),
                catalog_skips: self.catalog_skips.load(Ordering::Relaxed),
            },
            bytes: DeploymentBytes {
                source_zip: self.source_zip_bytes.load(Ordering::Relaxed),
                uploaded: self.uploaded_bytes.load(Ordering::Relaxed),
                copied: self.copied_bytes.load(Ordering::Relaxed),
            },
            transfer: TransferStats {
                scheduled_objects: self.transfer_scheduled_objects.load(Ordering::Relaxed),
                completed_objects: self.transfer_completed_objects.load(Ordering::Relaxed),
                failed_objects: self.transfer_failed_objects.load(Ordering::Relaxed),
                cancelled_objects: self.transfer_cancelled_objects.load(Ordering::Relaxed),
                panicked_objects: self.transfer_panicked_objects.load(Ordering::Relaxed),
                in_flight_high_water: self.transfer_in_flight_high_water.load(Ordering::Relaxed),
            },
            marker_replacement: MarkerReplacementStats {
                strategy: "planning-plus-retryable-stream",
                semantics: "leftmost-longest-non-recursive",
                planned_passes_per_upload: 2,
                planning_passes: self.marker_planning_passes.load(Ordering::Relaxed),
                upload_passes: self.marker_upload_passes.load(Ordering::Relaxed),
                spooled_uploads: self.marker_spooled_uploads.load(Ordering::Relaxed),
            },
            catalog: CatalogStats {
                trusted_archives: self.catalog_trusted_archives.load(Ordering::Relaxed),
                untrusted_archives: self.catalog_untrusted_archives.load(Ordering::Relaxed),
                trusted_entries: self.catalog_trusted_entries.load(Ordering::Relaxed),
                fallback_hash_attempts: self.catalog_fallback_hash_attempts.load(Ordering::Relaxed),
                sparse_skips: self.catalog_skips.load(Ordering::Relaxed),
            },
            source: SourceStats {
                planned_blocks: self.source_planned_blocks.load(Ordering::Relaxed),
                planned_bytes: self.source_planned_bytes.load(Ordering::Relaxed),
                fetched_blocks: self.source_fetched_blocks.load(Ordering::Relaxed),
                fetched_bytes: self.source_fetched_bytes.load(Ordering::Relaxed),
                get_attempts: self.source_get_attempts.load(Ordering::Relaxed),
                get_retries: self.source_get_retries.load(Ordering::Relaxed),
                get_throttled_attempts: self.source_get_throttled_attempts.load(Ordering::Relaxed),
                get_retryable_errors: self.source_get_retryable_errors.load(Ordering::Relaxed),
                get_permanent_errors: self.source_get_permanent_errors.load(Ordering::Relaxed),
                get_request_errors: self.source_get_request_errors.load(Ordering::Relaxed),
                get_body_errors: self.source_get_body_errors.load(Ordering::Relaxed),
                get_short_body_errors: self.source_get_short_body_errors.load(Ordering::Relaxed),
                get_errors: self.source_get_errors.load(Ordering::Relaxed),
                block_hits: self.source_block_hits.load(Ordering::Relaxed),
                block_misses: self.source_block_misses.load(Ordering::Relaxed),
                block_refetches: self.source_block_refetches.load(Ordering::Relaxed),
                block_waits: self.source_block_waits.load(Ordering::Relaxed),
                block_waits_fetching: self.source_block_waits_fetching.load(Ordering::Relaxed),
                block_waits_capacity: self.source_block_waits_capacity.load(Ordering::Relaxed),
                replay_claims: self.source_replay_claims.load(Ordering::Relaxed),
                replay_claims_after_release: self
                    .source_replay_claims_after_release
                    .load(Ordering::Relaxed),
                replay_claims_after_failure: self
                    .source_replay_claims_after_failure
                    .load(Ordering::Relaxed),
                body_attempts: self.source_body_attempts.load(Ordering::Relaxed),
                body_replays: self.source_body_replays.load(Ordering::Relaxed),
                active_gets_high_water: self.source_active_gets_high_water.load(Ordering::Relaxed),
                active_readers_high_water: self
                    .source_active_readers_high_water
                    .load(Ordering::Relaxed),
                resident_bytes_high_water: self
                    .source_resident_bytes_high_water
                    .load(Ordering::Relaxed),
                global_budget_bytes: self.source_global_budget_bytes.load(Ordering::Relaxed),
                global_resident_bytes_current: self
                    .source_global_resident_bytes
                    .load(Ordering::Relaxed),
                global_resident_bytes_high_water: self
                    .source_global_resident_bytes_high_water
                    .load(Ordering::Relaxed),
                global_release_anomalies: self
                    .source_global_release_anomalies
                    .load(Ordering::Relaxed),
            },
            put_object: PutObjectStats {
                wire_attempts: self.put_wire_attempts.load(Ordering::Relaxed),
                failed_attempts: self.put_failed_attempts.load(Ordering::Relaxed),
                retry_attempts: self.put_retry_attempts.load(Ordering::Relaxed),
                throttled_attempts: self.put_throttled_attempts.load(Ordering::Relaxed),
                retry_wait_ms: self.put_retry_wait_millis.load(Ordering::Relaxed),
                throttle_cooldown_waits: self.put_throttle_cooldown_waits.load(Ordering::Relaxed),
                throttle_cooldown_wait_ms: self
                    .put_throttle_cooldown_wait_millis
                    .load(Ordering::Relaxed),
                failures_by_sdk_error_kind: self
                    .detailed_put_object
                    .as_ref()
                    .map_or_else(BTreeMap::new, |detailed| {
                        lock_telemetry(&detailed.failures_by_sdk_error_kind).clone()
                    }),
                failures_by_service_code: self
                    .detailed_put_object
                    .as_ref()
                    .map_or_else(BTreeMap::new, |detailed| {
                        lock_telemetry(&detailed.failures_by_service_code).clone()
                    }),
                failure_states: self
                    .detailed_put_object
                    .as_ref()
                    .map_or_else(Vec::new, |detailed| {
                        lock_telemetry(&detailed.failure_states).clone()
                    }),
                failure_state_overflow_attempts: self.detailed_put_object.as_ref().map_or(
                    0,
                    |detailed| {
                        detailed
                            .failure_state_overflow_attempts
                            .load(Ordering::Relaxed)
                    },
                ),
            },
            copy_object: CopyObjectStats {
                wire_attempts: self.copy_wire_attempts.load(Ordering::Relaxed),
                failed_attempts: self.copy_failed_attempts.load(Ordering::Relaxed),
                retry_attempts: self.copy_retry_attempts.load(Ordering::Relaxed),
                throttled_attempts: self.copy_throttled_attempts.load(Ordering::Relaxed),
                retry_wait_ms: self.copy_retry_wait_millis.load(Ordering::Relaxed),
                throttle_cooldown_waits: self.copy_throttle_cooldown_waits.load(Ordering::Relaxed),
                throttle_cooldown_wait_ms: self
                    .copy_throttle_cooldown_wait_millis
                    .load(Ordering::Relaxed),
            },
            delete_object: DeleteObjectStats {
                sdk_calls: self.delete_sdk_calls.load(Ordering::Relaxed),
                failed_calls: self.delete_failed_calls.load(Ordering::Relaxed),
                requested_objects: self.delete_requested_objects.load(Ordering::Relaxed),
                inferred_deleted_objects: self.delete_objects.load(Ordering::Relaxed),
                unconfirmed_objects: self.delete_unconfirmed_objects.load(Ordering::Relaxed),
                no_such_bucket_requested_identifiers: self
                    .delete_no_such_bucket_requested_identifiers
                    .load(Ordering::Relaxed),
            },
            callback: CallbackStats {
                wire_attempts: self.callback_wire_attempts.load(Ordering::Relaxed),
                failed_attempts: self.callback_failed_attempts.load(Ordering::Relaxed),
                retry_attempts: self.callback_retry_attempts.load(Ordering::Relaxed),
                confirmed_responses: self.callback_confirmed_responses.load(Ordering::Relaxed),
            },
        }
    }
}

fn merge_diagnostic_counts(
    destination: &Mutex<BTreeMap<String, u64>>,
    source: &BTreeMap<String, u64>,
) {
    let mut destination = lock_telemetry(destination);
    for (key, count) in source {
        let key = if destination.contains_key(key)
            || (key != OTHER_DIAGNOSTIC_LABEL
                && destination.len() < MAX_FAILURE_DIAGNOSTIC_LABELS.saturating_sub(1))
        {
            key.clone()
        } else {
            OTHER_DIAGNOSTIC_LABEL.to_string()
        };
        let destination_count = destination.entry(key).or_default();
        *destination_count = destination_count.saturating_add(*count);
    }
}

fn merge_failure_states(
    destination: &Mutex<Vec<PutObjectFailureStateStats>>,
    source: &[PutObjectFailureStateStats],
) -> u64 {
    let mut destination = lock_telemetry(destination);
    let mut overflow = 0_u64;
    for failure in source {
        if let Some(existing) = destination
            .iter_mut()
            .find(|existing| same_failure_signature(existing, failure))
        {
            existing.merge(failure);
        } else if destination.len() < MAX_FAILURE_DIAGNOSTIC_GROUPS {
            destination.push(failure.clone());
        } else {
            overflow = overflow.saturating_add(failure.count);
        }
    }
    overflow
}

impl DiagnosticRangeStats {
    pub(crate) fn merge(&mut self, other: &Self) {
        self.min = self.min.min(other.min);
        self.max = self.max.max(other.max);
        self.total = self.total.saturating_add(other.total);
    }
}

impl PutObjectFailureBodyStats {
    pub(crate) fn merge(&mut self, other: &Self) {
        self.attempt_number.merge(&other.attempt_number);
        self.bytes_emitted.merge(&other.bytes_emitted);
        self.remaining_bytes.merge(&other.remaining_bytes);
    }
}

impl PutObjectFailureSourceStats {
    pub(crate) fn merge(&mut self, other: &Self) {
        self.local_window_bytes.merge(&other.local_window_bytes);
        self.local_committed_bytes
            .merge(&other.local_committed_bytes);
        self.local_resident_bytes.merge(&other.local_resident_bytes);
        self.local_capacity_waiters
            .merge(&other.local_capacity_waiters);
        self.global_budget_bytes.merge(&other.global_budget_bytes);
        self.global_resident_bytes
            .merge(&other.global_resident_bytes);
        self.global_available_permits
            .merge(&other.global_available_permits);
        self.global_permit_unit_bytes
            .merge(&other.global_permit_unit_bytes);
        self.global_permit_waiters
            .merge(&other.global_permit_waiters);
        self.active_fetches.merge(&other.active_fetches);
    }
}

impl PutObjectFailureStateStats {
    pub(crate) fn merge(&mut self, other: &Self) {
        self.count = self.count.saturating_add(other.count);
        self.elapsed_ms.merge(&other.elapsed_ms);
        self.body.merge(&other.body);
        self.source.merge(&other.source);
    }
}

pub(crate) fn same_failure_signature(
    left: &PutObjectFailureStateStats,
    right: &PutObjectFailureStateStats,
) -> bool {
    left.sdk_error_kind == right.sdk_error_kind
        && left.dispatch_failure_kind == right.dispatch_failure_kind
        && left.service_code == right.service_code
        && left.body.attempt_observed == right.body.attempt_observed
        && left.body.replay == right.body.replay
        && left.body.producer_stage == right.body.producer_stage
        && left.body.final_frame_delivered == right.body.final_frame_delivered
        && left.body.producer_completed == right.body.producer_completed
        && left.body.body_error_observed == right.body.body_error_observed
        && left.body.receiver_dropped == right.body.receiver_dropped
        && left.body.receiver_drop_aborted_producer == right.body.receiver_drop_aborted_producer
        && left.source.observed == right.source.observed
}

#[cfg(test)]
mod detailed_failure_diagnostics_tests {
    use std::sync::atomic::Ordering;

    use super::DeploymentStats;

    #[test]
    fn source_global_release_saturates_and_records_anomaly() {
        let stats = DeploymentStats::default();
        stats.acquire_source_global_bytes(8);

        stats.release_source_global_bytes(12);

        assert_eq!(stats.source_global_resident_bytes_current(), 0);
        assert_eq!(
            stats
                .source_global_release_anomalies
                .load(Ordering::Relaxed),
            1
        );
    }
}

#[cfg(test)]
mod marker_spooled_upload_tests {
    use std::sync::atomic::Ordering;

    use super::DeploymentStats;

    #[test]
    fn marker_spooled_upload_counter_starts_at_zero_and_increments() {
        let stats = DeploymentStats::default();

        assert_eq!(
            stats.marker_spooled_uploads.load(Ordering::Relaxed),
            0,
            "the F-3 spool fast path does not exist yet"
        );

        stats.add_marker_spooled_upload();

        assert_eq!(stats.marker_spooled_uploads.load(Ordering::Relaxed), 1);
    }
}
