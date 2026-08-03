# ShinBucketDeployment — Deep Analysis & Improvement Plan

Date: 2026-08-03
Scope: full repository, with priority on the Rust provider (`rust/`). Based on the post-v0.11.0
tree (`adcb640`). Every finding was verified against the current source; the hottest claims were
additionally verified first-hand (noted where relevant).

This document is analysis only. It proposes no AWS runs by itself. Per `AGENTS.md`, any
performance-relevant provider change below requires comparable before/after Shin benchmark
evidence plus the upstream AWS CDK baseline before it is treated as performance-accepted, and
verification evidence (`pnpm verify`, smallest relevant group) for any deployed-behavior change.

---

## 1. Executive summary

The codebase is in good shape overall: fail-closed deadline handling, ETag-pinned ranged reads,
budget-bounded source memory, redirect-disabled callback client, `cargo-deny` with a hard-banned
legacy TLS chain, correct delete batching, and a verified ZIP-slip defense
(`normalize_archive_key` rejects `..`, backslashes, and empty resolutions). No CRITICAL issues
were found.

The highest-value improvements concentrate in the Rust provider:

| # | Finding | Severity | Theme |
|---|---------|----------|-------|
| R-P1 | Triple per-byte memcpy on the direct upload hot path | HIGH | performance |
| R-P2 | Aho-Corasick automaton rebuilt and full marker map cloned **per file** | HIGH | performance |
| R-P3 | Previous/current CloudFront invalidations fully serialized (incl. wait) | HIGH | performance |
| R-P4 | List→delete pagination fully serialized in cleanup loops | HIGH | performance |
| R-A1 | Valid archives fail deployment when a 30-byte local header straddles a source-block boundary | HIGH | availability |
| R-P5 | Changed entries without a trusted catalog pay two full source passes; marker entries always do | MEDIUM | performance |
| R-P6 | Destination namespace listed up to 3× per deployment | MEDIUM | performance |
| R-P7 | Sources planned strictly sequentially | MEDIUM | performance |
| R-Q1 | Poisoned-mutex `.expect()` in diagnostics/stats paths can kill the handler after work but before callback | MEDIUM | quality/availability |
| R-S2 | CloudFormation response URL accepted for any HTTPS host (no allow-list) | MEDIUM | security |
| R-S3 | Attacker-influenced strings (ZIP entry names, resource type) flow unsanitized into logs and the CFN `Reason` | MEDIUM | security |
| R-S4 | Decompression bombs bounded only by attacker-declared central-directory size | MEDIUM | security |
| R-S5 | Namespace-delete functions carry no in-function authorization guard | MEDIUM | security |
| R-Q2 | Panic sites in production paths (availability risk in Lambda) | MEDIUM | quality |
| R-Q3 | `archive.rs` is a 3,828-line god-module; mixed inclusive/exclusive range conventions | MEDIUM | quality |
| T-Q1 | `securityGroups` handler-identity sort is a silent no-op (sorts objects) → duplicate handlers | MEDIUM | quality (real bug) |
| T-Q4 | Imported `providerLambda.role` grants silently dropped → guaranteed deploy-time AccessDenied | MEDIUM | quality |
| T-Q6 | No destination versioning check: deletes on versioned buckets only add delete markers | MEDIUM | quality/security |

A note on the observed v0.11.0 update-phase numbers is in §2 — treated as hypotheses to confirm
or reject while executing Phase 1–2, not as established root causes.

## 2. v0.11.0 update-phase observation (context, not root cause)

Committed benchmark rows (`benchmarks/results.jsonl`, tiny-many @ 1024 MiB / parallel 32,
Shin only): v0.10.4-era `35f7383c` (5 samples) vs v0.11.0 `2e511b6a` (1 sample — low confidence).

Provider-internal phase medians, changed-update:

- `plan` 266 ms → 279 ms (+5%)
- `destinationList` 239 ms → 267 ms (+12%)
- `transfer` 107 ms → 160 ms (+50% on a small absolute base; cold-create transfer is also up ~10%)
- `delete` (pruned-update) 2320 ms → 2543 ms (+10%)
- unchanged-update: flat (0.508 s → 0.490 s) — the fast path did not regress.

Single-sample v0.11.0 rows make this directional, not conclusive. Plausible mechanisms to check
while doing Phase 1–2 work (each maps to a finding that is worth fixing regardless):

- Per-upload/per-entry costs added or amplified in v0.11.0 → R-P1, R-P2, R-P5 (transfer phase).
- Delete/cleanup serialization → R-P4, R-P6 (delete phase of pruned-update).
- Plan-phase additions (ZIP hardening #67, catalog budget charging #85, schema-v5 tightening #73)
  → R-P7 and the planning micro-costs in R-P8/R-P9.
- The #83 multipart `HeadObject` probe adds one RTT per surviving `extract: false` copy plan whose
  destination has identical length but changed content — intended trade-off; keep an eye on it in
  `extract: false` benchmark profiles (no committed profile exercises it today — see G-1 in §7).

Do not treat any of these as confirmed until a repeated-measures before/after run isolates them
(methodology v2, 5 repetitions, same config, per `benchmarks/configs/methodology-v2-1024-32.json`).

## 3. Severity legend

- **CRITICAL** — exploit or data-loss path reachable in normal operation. (None found.)
- **HIGH** — measurable hot-path regression, structural latency on common operations, or
  availability failure on legitimate input.
- **MEDIUM** — real cost or risk under specific workloads/inputs; correctness-of-intent bugs with
  bounded blast radius; defense-in-depth gaps.
- **LOW** — polish, micro-costs, latent drift risks, documentation-level hardening.

---

## 4. Rust provider findings (`rust/`) — highest priority

### 4.1 Performance

#### R-P1 — HIGH — Triple per-byte memcpy on the direct upload hot path

`rust/src/s3/archive/entry.rs:763-784` (producer loop) + `entry.rs:978-1041`
(`append_and_send_body_chunks` / `send_final_body_chunks`). Verified first-hand.

Every uploaded byte flows: inflate/read into `buffer` → **copy 1** into `pending`
(`entry.rs:782-783`, whole payload) → **copy 2** into `body_chunk`
(`extend_from_slice`, `entry.rs:987/1016`) → **copy 3** `Bytes::copy_from_slice`
(`entry.rs:992/1020/1034`) — plus the required MD5 and CRC32 passes. `pending` exists only to
hold back the tail so the final frame can be tagged after size/CRC/MD5 validation; the marker
path (`forward_replaced_body_chunks`) already achieves the same hold-back with one fewer pass.

Fix: drop `pending`/`body_chunk` staging. Copy each read directly into one frame-sized buffer,
hold back a single `Bytes` frame, send the previous frame. Target: 1 memcpy/byte + 2 hash passes.
Also fold in `entry.rs:763-765` (three per-attempt `Vec` allocations) by reusing buffers across
attempts. Unify the two near-identical chunk-packing loops while there.

Evidence: before/after benchmark on `large-few` and `mixed` (byte-heavy) profiles, watching
`providerDurationSeconds`, `source_amplification`, and max memory; plus upstream AWS baseline.

#### R-P2 — HIGH — Marker replacements rebuilt per file

`rust/src/s3/transfer.rs:375` clones `request.source_markers[plan.source_index]` (a full
`HashMap<String,String>`) per plan; `transfer.rs:376` clones the config; then
`transfer.rs:792` builds `MarkerReplacements::new(...)` per entry, which sorts all pairs and
builds an Aho-Corasick automaton (`rust/src/replace.rs:40-67`) — O(total pattern bytes) with a
large constant. Markers are per-source, not per-entry, so a 10,000-file marker source clones the
map and rebuilds the automaton 10,000 times. Verified first-hand.

Fix: build `MarkerReplacements` once per `source_index` (cache in a `Vec<Option<Arc<…>>>` keyed
by source index), pass `Arc` down; borrow the marker map instead of cloning it.

Evidence: `benchmarks/configs/marker-replacement-2048-32.json` before/after; watch
`markerPlanningPasses`, provider duration, memory.

#### R-P3 — HIGH — Sequential CloudFront invalidations serialize two waits

`rust/src/cloudformation.rs:639-689`: the previous-distribution invalidation (create + 20s-interval
poll loop) is fully awaited before the current-distribution invalidation is even created, because
`rust/src/cloudfront.rs:13-105` fuses create+poll into one `invalidate()`. On a
distribution-changing Update with `wait_for_distribution_invalidation=true` (the default,
`rust/src/s3/mod.rs:461`), the CloudFront phase doubles in wall-clock (invalidations routinely
take minutes).

Fix: split into `create_invalidation()` + `wait_invalidation()`; create both up front, then
`tokio::join!` the waits.

Evidence: verification group covering distribution change; benchmark note only (CloudFront waits
are service-bound).

#### R-P4 — HIGH — List→delete pagination fully serialized in cleanup loops

`rust/src/s3/destination.rs:79-118` (`delete_prefix`) and `destination.rs:286-330`
(`delete_unplanned_objects`): each iteration awaits `ListObjectsV2`, then awaits `DeleteObjects`,
then lists the next page. The next list is independent of the delete (`start_after` is derivable
from the current page's last key; deleting behind the cursor cannot affect forward listing).
Cleanup of N stale objects costs ~2 serialized RTTs per 1,000 instead of ~1 pipelined. This sits
directly on the pruned-update `delete` phase that moved +10% in §2.

Fix: issue page N+1's list concurrently with page N's delete (hold the delete future across the
loop iteration; join before the following delete). Preserve the existing per-batch error
accounting (`destination.rs:342-405`) and the 1,000-key `DeleteObjects` batching, which is correct
today.

Evidence: pruned-update phase on `tiny-many`; a large-stale-set scenario if one exists.

#### R-P5 — MEDIUM — Changed entries without a trusted catalog pay two full source passes

`rust/src/s3/transfer.rs:773-815` (`prepare_zip_entry_for_comparison`): for a marker-free entry
without trusted integrity whose destination object has the same size, the provider streams the
whole entry (`hash_zip_entry_reader` → `digest_async_reader`, MD5+CRC32) to compare ETags. On
mismatch it calls `store.retain_zip_entry_for_replay(plan)` (`transfer.rs:507`) and the upload
body re-streams, re-inflates, re-hashes the entry a second time. Marker entries pay the same
double pass unconditionally (plan pass at `entry.rs:676-706`, upload pass at
`entry.rs:1080-1093`). `retain_zip_entry_for_replay` retains compressed source blocks, not
decoded output, so residency luck is the only mitigation.

Fix: spool small decoded outputs from the comparison/plan pass (bounded by the source budget,
e.g. entries ≤ a few MiB) and upload from the spool instead of re-streaming. Keep the two-pass
design for large entries; document the threshold.

Evidence: `source_amplification`, `block_refetches`, `replay_claims_after_release`, and provider
duration on a no-catalog asset profile (see G-1) and `marker-replacement-2048-32.json`.

#### R-P6 — MEDIUM — Destination namespace listed up to 3× per deployment

`rust/src/s3/mod.rs:158-170` (`plan_destination` full listing), `s3/mod.rs:223-235`
(`delete_stale_objects` re-listing), and `s3/mod.rs:259-270` (previous-namespace re-listing, a
strict subset of the current-prefix listing when namespaces overlap). The re-list after transfer
is a deliberate memory/failure-semantics trade-off (document it), but the third pass is pure
redundancy.

Fix: fuse previous-namespace deletion into the stale-deletion listing (one pass, two predicates).
Optionally collect stale candidates during planning below a size cap with re-list fallback.

#### R-P7 — MEDIUM — Sources planned strictly sequentially

`rust/src/s3/planner.rs:153-205`: per source, `prepare_source_zip` (HeadObject) →
`prepare_zip_directory_reader` (ranged tail reads) → central directory parse → optional
authenticated-catalog load (`planner.rs:499-593`) — all serial. Multi-source deployments pay
sum-of-sources latency on every Create **and** every Update (updates re-plan everything).
#85's fail-fast budget admission (`planner.rs:526-539`) is explicitly built on sequential
planning, so concurrency requires reworking that admission.

Fix: overlap the I/O phases of independent sources with bounded concurrency (e.g. 2–4),
keeping the manifest insert sequential; revisit budget admission so reservations remain
fail-fast per source. Measure plan-phase delta on a multi-source profile.

#### R-P8 — MEDIUM — Request payload vectors allocated ~4× per event

`rust/src/cloudformation.rs:254-260` (event `Value` → typed envelope → `value.clone()` →
`RawDeploymentRequest`) then `rust/src/request.rs:154-206` clones every vector field into
`DeploymentRequest` (`source_bucket_names.clone()`, `source_object_keys.clone()`, marker maps,
include/exclude, distribution paths). One-time per invocation, but these vectors scale with
source count × key length.

Fix: deserialize `RawDeploymentRequest` from `&Value` (no intermediate clone) and move fields in
`parse_request` (take `RawDeploymentRequest` by value).

#### R-P9 — LOW — Per-object allocation churn in planning and listing

- `rust/src/request.rs:520-526`: `strip_destination_prefix` returns an owned `String` per listed
  object; return `Cow<'_, str>` (called at `destination.rs:541`, `destination.rs:578`).
- `rust/src/s3/destination.rs:551`: `relative_key.clone()` into the map though the value is
  dropped right after; move it.
- `rust/src/s3/planner.rs`: each entry's key string is allocated ~4–5×
  (`seen.insert(relative_key.clone())` :438, manifest key+field clones :476-479,
  `collect_zip_entry_plans` re-clone :287 + `join_s3_key` alloc). With a trusted catalog,
  `stored_zip_file_path` (+ UTF-8 validation + `normalize_archive_key`) runs **3× per entry**
  (`planner.rs:431`, `planner.rs:632`, `planner.rs:707`). Normalize once and thread the result.
- `rust/src/s3/destination.rs:346-349`: delete keys collected into `Vec<String>` then cloned
  again into `ObjectIdentifier::builder().key(...)`; consume via `into_iter`.

#### R-P10 — LOW — Assorted micro-costs

- `rust/src/request.rs:135-152`: `Filters::should_include` never short-circuits; skip the include
  loop once `included` is true, and skip both loops entirely when both lists are empty (the common
  case — precompute a `has_filters` flag). Per-object in planning and stale-scan. Verified first-hand.
- `rust/src/s3/mod.rs:207/243`, `cloudformation.rs:523/573`: up to 4 identical `GetBucketTagging`
  calls per request; fetch once per bucket and pass down.
- `rust/src/cloudfront.rs:67-91`: first invalidation poll fires immediately after create (nearly
  always `InProgress` — one wasted call) and the 20 s interval has no jitter.
- `rust/src/s3/archive.rs:1444/1499/1841`: `block_indices_for_span` allocates a `Vec<usize>` per
  claim/replay/plan; iterator or SmallVec.
- `rust/src/s3/archive/entry.rs:728-732`: `DeflateDecoder` wraps a default 8 KiB `BufReader`;
  size it to `ZIP_ENTRY_READ_CHUNK_BYTES`.
- `rust/src/s3/archive/entry.rs:640/692/722-724`: `plan.clone()` (two `String`s) per body
  attempt; `Arc<ZipEntryPlan>` or restructure borrows.
- `rust/src/s3/archive.rs:424`: `format!("bytes={start}-{end}")` per ranged-GET attempt; hoist
  per block.
- `rust/src/s3/archive.rs:1707-1711`: `Box::pin` of a fresh `OwnedNotified` per wait-loop turn.
- `rust/src/s3/archive.rs:1182-1195`: `spawn_body_task` drains finished tasks while holding the
  `std::sync::Mutex`.
- `rust/src/replace.rs:136-139`: two awaited `write_all` calls per marker match (prefix +
  replacement); coalesce into one buffered write on marker-dense files.

### 4.2 Quality / availability

#### R-Q1 — MEDIUM — Poisoned-mutex `.expect()` can kill the handler after work but before callback

`rust/src/types.rs:1044/1054/1064/1114/1135`, plus the same pattern in
`rust/src/s3/transfer.rs:1277-1280/1365-1368/1394-1424/1481-1484/1558-1628` and
`scheduler.rs:209-226`. A panic in any task while holding one of these locks poisons it; every
subsequent `snapshot()` (end of every later invocation on a warm runtime) then panics — after
deployment work but **before** the CloudFormation callback, so the stack hangs to its own timeout.

Fix: recover with `lock().unwrap_or_else(|e| e.into_inner())` (counters are best-effort), or
switch diagnostics to `parking_lot::Mutex` (no poisoning). One systemic pass; add a regression
test that panics a worker and asserts the callback still fires.

#### R-Q2 — MEDIUM — Panic sites in production paths

- `rust/src/cloudformation.rs:672`: `.expect("checked above")` — re-derives `previous_destination`
  instead of binding it; restructure as a single `if let Some(previous)` scope.
- `rust/src/s3/archive/directory.rs:111/388` (`expect("preloaded source block exists")`) and
  `directory.rs:447-465` (`u16_at`/`u32_at`/`u64_at` index + `expect`) — attacker-influenced
  offsets reach these; currently guarded by `cached_span`'s exact-length contract, but one
  refactor away from a hostile-archive panic. Convert to checked reads returning errors.
- `rust/src/s3/archive.rs:774` (`assert!(limit_bytes > 0)` — config error → panic),
  `archive.rs:991` (`expect("in-flight source fetch exists")`), `entry.rs:342/352/1225`.
- `rust/src/lifecycle.rs:83`: `unreachable!()` — fold the `Same` arm into the guard above.
- `rust/src/main.rs:88`: `.expect("static tracing directive")` at init — add a unit test that
  every target in `CALLBACK_SENSITIVE_LOG_TARGETS` parses (cheap) or degrade to `warn`.
- `rust/src/s3/archive/entry.rs:837-839`: `checked_mul(2).unwrap_or(...)` for a constant
  doubling; simplify.

Rule of thumb for this codebase: a Lambda panic means no callback means a hung stack; every
production-path panic site is an availability bug in waiting.

#### R-Q3 — MEDIUM — `archive.rs` god-module and mixed range conventions

`rust/src/s3/archive.rs` is 3,828 lines (~1,900 of them inline tests) covering retry policy,
diagnostics, budget semaphore, block store, range reader, and scheduler. Split into
`budget.rs`, `block_store.rs`, `range_reader.rs`, `diagnostics.rs`, `archive/tests.rs` —
mechanical move, no behavior change, do it in isolation.

While there: `SourceBlockRange { start, end }` is **inclusive** (`archive.rs:183-187`,
`len() = end - start + 1` :1718-1719) while `ZipEntryPlan.source_span_end` is **exclusive**;
the test helper's `end: plan.source_span_end - 1` (`archive.rs:3412`) shows the footgun. Rename
to `end_inclusive`/`end_exclusive` or use a range newtype. Only a `debug_assert`
(`archive.rs:1811-1816`) guards the disjointness invariant — keep a cheap release-mode check.

Also: `SourceDiagnostics` has 31 atomic fields with hand-written `new()`/`snapshot()`
(`archive.rs:64-103/522-654`) — macro or derive to stop touching 4 places per counter; tests
hand-construct `SourceBlockStore` 3× (`archive.rs:3231-3268`, `3414-3450`) — one builder helper.

#### R-Q4 — MEDIUM — Duplicated orchestration blocks

- Guarded ownership-check→warn/delete→stats blocks: `s3/mod.rs:204-238` vs `240-273`, and again
  `cloudformation.rs:519-551` vs `565-619`. One helper.
- Hand-rolled list pagination triplicated: `destination.rs:67-121`, `175-216`, `279-333`. Extract
  one paginator helper (or the SDK paginator) with per-page closures.
- Namespace canonicalization/overlap logic duplicated with drifting semantics:
  `lifecycle.rs:130-139/156-158` vs `destination.rs:455-465/518-528` vs `request.rs:476-478/509-518`.
  Consolidate into one `namespace` module.
- Failure-response construction duplicated ~3×: `cloudformation.rs:146-172`, `182-205`, `220-250`.
- `hash_identity_field`/`hash_caller_reference_field` are the same function twice
  (`cloudformation.rs:797-817`); make one function generic over the digest.
- Per-variant match triplication in `callback.rs:46-77` / `cloudformation.rs:285-337`.

#### R-Q5 — LOW — Assorted quality items

- `rust/src/types.rs:803-811`: `release_source_global_bytes` underflow protection is
  `debug_assert!`-only; a double-release wraps the counter to ~u64::MAX in release, corrupting
  the global memory budget this type exists to enforce. Use `fetch_update`/`saturating_sub` +
  an anomaly counter.
- `rust/src/request.rs:29-132`: `RawDeploymentRequest` lacks `#[serde(deny_unknown_fields)]`
  while its nested structs have it — a misspelled property is silently ignored and destructive
  defaults (e.g. stale deletion) apply. Add it (note: `DestinationChecksumStrategy` was
  deliberately tolerated post-#88 — handle that one field explicitly).
- `rust/src/request.rs:257`: `std::env::var(LAMBDA_MEMORY_ENV).ok()` swallows `NotUnicode`;
  treat as error like the non-numeric path.
- `rust/src/types.rs:233` vs `950-953`: internal `md5_non_fallback_hash_attempts` vs serialized
  `md5HashAttempts` (which *adds* fallback attempts) — rename one side.
- `rust/src/cloudformation.rs:807-817`: summary JSON serialized even when `info` is disabled;
  gate with `tracing::enabled!`.
- `rust/src/cloudformation.rs:665-677`: `distribution_paths.clone()` on the non-merge branch;
  bind `&[String]`.
- `rust/src/cloudformation.rs:100`: eager 4–5 string clones per event for a failure-only target;
  make lazy.
- `rust/src/callback.rs:109-153`: `json!` intermediate tree + per-retry `body.to_vec()` /
  `response_url.clone()`; a borrowed `Serialize` struct + hoisted `Bytes` body.
- `rust/src/destination.rs:176-183/287-294`: listing errors lack bucket context the delete path has.
- `rust/src/destination.rs:541-544/578-579`: a zero-byte object exactly at the namespace root
  (`"site/"`) is dropped by both record and stale-check — immortal until namespace change;
  decide and document.
- `rust/src/destination.rs:90/367-371`: `NoSuchBucket` silently succeeds even on the
  Create/Update stale-cleanup path; keep behavior, add `warn`.
- `rust/src/cloudfront.rs:46-54/81-89`: duplicated `NoSuchDistribution` arms; helper.
- `rust/src/cloudfront.rs:122-167`: path-count quota (3,000/invalidation) not validated
  provider-side; `ensure!(paths.len() <= 3_000)` (see also T-Q5).
- `rust/src/cloudfront.rs:93-96`: an invalidation response missing a recognizable status polls
  until the work deadline; treat as error.
- `rust/src/request.rs:476-478`: `normalize_destination_prefix` only collapses exactly `"/"`.
- `rust/src/request.rs:520-526`: the non-matching-key fallback in `strip_destination_prefix`
  masks planning bugs; call sites always pass a trailing-slash prefix (verified), so downgrade
  the fallback to a debug log/assert.

### 4.3 Security

#### R-A1 (security-availability) — HIGH — Valid archives fail when a 30-byte local header straddles a block boundary

`rust/src/s3/archive/entry.rs:380-393`: the local file header is read via one block-local
`slice_from`; if an entry's `source_offset` sits within 29 bytes of a source-block boundary, the
read is short and the entry errors out — a clean error, but a **legitimate archive fails the
whole deployment**. Fail-closed is correct; the false positive is not.

Fix: stitch the header from two block-local slices (or a 30-byte bounce buffer across two
claims) instead of requiring single-block residency. Add a fixture archive crafted to straddle.

#### R-S2 — MEDIUM — Response URL accepted for any HTTPS host

`rust/src/cloudformation/callback.rs:324-345` checks scheme/host/userinfo/port but not the host
itself (a test even asserts `https://example.com/response` is acceptable). The response body
carries stack ID, physical resource ID, source keys, destination bucket ARN, and failure detail.
Exploitability requires invoking the Lambda with a forged event (over-permissive resource policy
/ confused deputy), so this is defense-in-depth. Verified: the callback client is already
redirect-disabled (`main.rs:99-106`, `RedirectPolicy::none()`) and timeouts are bounded — good.

Fix: allow-list the partition's custom-resource response hosts
(`cloudformation-custom-resource-response-*.s3[.-]*.amazonaws.com[.cn]`), or at minimum reject IP
literals and loopback/RFC1918 hosts. Keep the current no-URL-in-errors redaction (already good).

#### R-S3 — MEDIUM — Attacker-influenced strings flow unsanitized into logs and the CFN `Reason`

ZIP entry names (`request.rs:489/495`, `entry.rs:1280-1289`), resource type
(`cloudformation.rs:398-400`), glob patterns (`request.rs:688`), and S3 error text reach
`error!(...)` (`cloudformation.rs:149/185/228`) and the truncated `Reason`
(`callback.rs:19-44`). Entry names can contain newlines/control characters → CloudWatch log
forging and CFN response-message injection. Anyone with write access to a *source* bucket
crosses into the deployer's logs. `truncate_failure_reason_to` truncates bytes but strips nothing.

Fix: escape control characters (`{:?}`-style or explicit sanitize) in
`truncate_failure_reason_to` and when interpolating entry names into errors; cap name length in
error strings.

#### R-S4 — MEDIUM — Decompression bombs bounded only by attacker-declared size

`rust/src/s3/archive/entry.rs:1310-1319` caps inflated output at `plan.size` from the central
directory, and CRC/size equality catches lies — but a crafted archive *declaring* a huge size
streams that many inflated bytes to S3 (egress/cost DoS within the Lambda window). Only the
marker path has a hard cap (`S3_SINGLE_PUT_LIMIT`, `entry.rs:699`); `planner.rs:811-816` rejects
entries above the 5 GiB single-PUT limit, so the bound exists but is 5 GiB × entry count.

Fix: enforce a configurable max uncompressed entry size (and optionally a compression-ratio cap)
at planning; document the bound in `docs/architecture.md`.

#### R-S5 — MEDIUM — Namespace-delete functions carry no in-function authorization

`rust/src/s3/destination.rs:48-65` (`delete_prefix` / `delete_prefix_excluding`) delete
everything under a prefix; safety rests entirely on every caller remembering
`bucket_has_competing_owner` first (`cloudformation.rs:519-619`, `s3/mod.rs:204-273`). The
functions are `pub(crate)` re-exported, so any future call site that skips the check gets silent
unbounded deletion.

Fix: fuse the ownership check into the delete functions, or make `bucket_has_competing_owner`
return a clearance token the delete functions require. Pairs naturally with R-Q4's dedup.

#### R-S6 — LOW — Assorted hardening

- `rust/src/s3/destination.rs:505-516`: owner-tag key splits on the **last** colon; an owner ID
  containing `:` shifts the prefix/owner boundary (encoding not injective). Reject `:` in
  `destination_owner_id` at synthesis and parse.
- TOCTOU between the owner-tag read (`destination.rs:123-157`) and the multi-minute delete pass;
  tags are advisory. Document; optionally re-read once after the final page.
- `rust/src/lifecycle.rs:65-71`: owner verification skipped when either side lacks an owner ID —
  document the both-present precondition; `warn` when authorizing without one.
- Empty-prefix Delete + `delete_current_objects_on_delete=true` wipes the whole bucket
  (`destination.rs:74-118`); only competing-owner tags guard a shared bucket. Consider a
  synthesis-time acknowledgement (TS side).
- `rust/src/cloudfront.rs:129-146`: invalidation paths reject `~` (good, incl. `%7E`) but not
  control characters; reject `char::is_control`.
- `rust/src/s3/archive.rs:456-485`: ranged-GET responses validated by length only, not
  `Content-Range`; parse and compare as defense-in-depth (ETag pinning already mitigates
  mutation, not range confusion).
- `rust/src/s3/archive/entry.rs:1291-1308`: integrity fallback is CRC32 when no trusted catalog
  exists; acceptable given ETag pinning + TLS — document the threat model in
  `docs/architecture.md`.
- `rust/Cargo.toml`: `astral_async_zip 0.0.20` is a pre-1.0 fork parsing attacker-influenced
  metadata; record the fork rationale/version floor and track upstream releases explicitly.
- `rust/src/request.rs:353-368`: cheap preflight shape checks for `DestinationOwnerId` /
  distribution IDs alongside the existing path preflight.
- Event deserialization relies on the Lambda 256 KB async payload cap (`cloudformation.rs:254-256`);
  document the reliance.

## 5. TypeScript construct findings (`src/`) — second priority

The TS side is synth-time only; weight performance items accordingly. Architecture: eager prop
validation → source binding (with authenticated `.shin/catalog.v1.json` for `Source.asset`) →
stack-scoped shared provider (identity = canonical SHA-256 of config) → custom-resource
properties → IAM grants. Emitted `.d.ts` surface and the AGENTS.md toolchain contract
(`engines.node >=22`, ES2022/`Node20`, no `devEngines`) were verified compliant — no action there.

### 5.1 Correctness-of-intent (fix first)

- **T-Q1 — MEDIUM** — `src/provider.ts:332-337`: `[...config.securityGroups].map(normalizeSingletonValue).sort()`
  sorts *objects*; default `.sort()` stringifies to `"[object Object]"`, so ordering is never
  normalized and handler identity stays order-sensitive → two deployments listing the same SGs in
  different orders get duplicate handlers/roles. Map to `sg.node.addr` strings, then sort.
- **T-Q2 — MEDIUM** — `src/shin-bucket-deployment.ts:963-968`: `addSource()` binds (full catalog
  materialization + `Asset` creation) before dedup; a dropped duplicate leaves an orphan asset in
  the tree that is still staged/uploaded. Remove the created child on dedup-drop or defer creation.
- **T-Q3 — MEDIUM** — `src/iam.ts:106-120`: `role.addToPrincipalPolicy()` returns
  `statementAdded: false` for imported roles; the return is ignored, so an imported
  `providerLambda.role` proceeds to a guaranteed deploy-time AccessDenied. Warn or throw at synth.
- **T-Q4 — MEDIUM** — `src/validation.ts:242-243`: include/exclude globs validated only as string
  arrays; syntax errors fail a 15-minute Lambda instead of synth. Add a synth-time pattern check
  matching provider (`globset`) semantics.
- **T-Q5 — MEDIUM** — `src/validation.ts:702-741`: no bound on `cloudfrontInvalidation.paths`
  length (CloudFront caps at 15 wildcard paths/3,000 total; see R-Q5 counterpart). Enforce at synth
  or verify provider batching.
- **T-Q6 — MEDIUM** — no destination versioning check (`src/destination.ts` already renders the
  `CfnBucket`): on a versioned bucket, `DeleteObject` only adds delete markers — stale content
  silently persists as noncurrent versions (cost + confusion). Fail or warn at synth when
  `VersioningConfiguration` is enabled.
- **T-Q7 — MEDIUM** — `src/shin-bucket-deployment.ts:39-171` + `src/provider.ts:275`: bundling
  option interfaces structurally fork the optional peer `cargo-lambda-cdk`'s `BundlingOptions`
  with no compile-time link; drift surfaces as a runtime error for consumers. Add a type-level
  structural assertion in `test/types/`.
- **T-B1 — MEDIUM** — `package.json:97`: peer `cargo-lambda-cdk: "^0.0.36"` over a `0.0.x` version
  allows patch-only, effectively pinning 0.0.36. Widen to `>=0.0.36 <1.0.0` after an API-compat
  check.

### 5.2 Security

- **T-S1 — MEDIUM (documented, accepted)** — `src/iam.ts:52-65`: `onChange.deletePreviousObjects`
  grants bucket-wide `s3:DeleteObject` on the shared role. Docs already advise disabling after
  migration; add an `Annotations.addWarning` recommending `ProviderSharing.DEPLOYMENT` when set.
- **T-S2 — LOW** — `src/iam.ts:138-145`: distribution ARN built with the stack's own account;
  imported cross-account distributions yield a wrong-account ARN. Document or accept an ARN override.
- **T-S3 — LOW** — `src/iam.ts:130-136`: `cloudfront:GetInvalidation` granted even when
  `waitForCompletion: false`; grant only when waiting.
- **T-S4 — LOW** — `src/iam.ts:28-33`: `s3:GetObject` on the destination prefix — if the provider
  never GETs destination objects (reconciliation is List+ETag), drop the grant.
- **T-S5 — LOW** — `src/provider.ts:110`: `RUST_BACKTRACE: "1"` in production env; gate behind
  `FailureDiagnostics.DETAILED`.
- **T-S6 — LOW** — `src/shin-bucket-deployment.ts:906-908`: 32-bit ownership tag suffix
  (`addr.slice(-8)`); birthday-bound makes collision impractical (~77k same-prefix deployments);
  informational only.

### 5.3 Quality / packaging (LOW)

- `src/shin-bucket-deployment.ts:858-860` vs `906-908`: `this.cr.node.addr.slice(-8)` computed
  twice — one private readonly field.
- `src/shin-bucket-deployment.ts:795-797` vs `963-968`: constructor doesn't dedup initial
  `sources`, `addSource()` does — align or document.
- `src/shin-bucket-deployment.ts:883-894`: custom-resource property names diverge from public
  names (`MaxParallelTransfers` vs `transfer.maxConcurrency`; `...Mb` vs `...MiB`) — rename on the
  next provider-contract bump.
- `src/provider.ts:150-156`: compile-path handler identity hashes an absolute `manifestPath` —
  machine-specific logical IDs; normalize.
- `src/provider.ts:164-198`: `resolvePackageVersion` requires a walkable package.json — bundler
  users break; bake a version constant at build time with fs fallback.
- `src/provider.ts:222-235`: prebuilt-archive lookup prefers `../../assets` over `../assets` —
  check package-local first.
- `src/cataloged-source.ts:591-593` (`literalString()` identity fn), `:200` (redundant cast) —
  remove.
- `src/validation.ts:874-880`: error-code format inconsistent with `invalidValue` (`:848-854`).
- `src/iam.ts:111-115/148/168`: unreachable defensive branches — remove or downgrade to assertions.
- `src/validation.ts:972-977`: `sourceGetConcurrency` default duplicated from the provider —
  skip the cross-check when unset and let the provider own the default.
- `src/stable-json.ts:8-35`: function/class normalization edge cases — document the limitation.
- `src/destination.ts:52`: `Object.values(rendered.Resources)[0]` — assert exactly one entry.
- `package.json`: add `"sideEffects": false` (verified side-effect-free imports).
- Synth-time micro-costs: O(n²) `CatalogedAsset${id}` probing (`cataloged-source.ts:186-189`),
  O(n²) resolve+stringify per dedup comparison (`shin-bucket-deployment.ts:965` +
  `source-config.ts:47-59`), per-comparison Buffer allocs in `compareUtf8`
  (`cataloged-source.ts:587-589`), double full-file read for MD5 + CDK asset hashing
  (`cataloged-source.ts:332/447-464` — inherent, document), unbounded recursion depth in
  `visit()` (`cataloged-source.ts:367-403`).
- Test note: synth tests import `../../src`, not the packaged entry — packaging regressions rely
  solely on `scripts/verify-package.mjs`; consider one packaged-import smoke test.

## 6. Verified-clean areas (do not re-litigate)

- ZIP-slip: `normalize_archive_key` rejects `..`, maps `\`→`/`, collapses `.`/empty segments,
  rejects empty resolutions (verified first-hand, `request.rs:480-499`). Reserved catalog paths
  rejected (`planner.rs:742-744`).
- Callback client: redirect-disabled, connect/request timeouts bounded (`main.rs:99-106`);
  response-URL validation never echoes the URL (tested); callback log targets forced to `info`
  (`main.rs:29-40/78-92`).
- Deadline derivation is fail-closed; all underflow/overflow clamps keep the callback reserve
  (`deadline.rs:65-99`).
- Delete batching: 1,000-key `chunks`, `quiet(true)`, per-batch error accounting; delete keys
  come from listings, never from plans (`destination.rs:342-405`).
- ETag `If-Match` pinning on every ranged source GET; source HEAD requires an ETag (#67 made it
  unrepresentable).
- EOCD↔locator↔ZIP64 binding checks, entry-count-vs-directory-size sanity, budget multiplication
  overflow checks, local-header encryption rejection (`directory.rs`).
- Scheduler: admission gate + `catch_unwind` + deadline-bounded drain (`scheduler.rs`) — sound.
- Supply chain: `deny.toml` hard-bans the legacy rustls 0.21/webpki 0.101/sct chain, denies
  unknown registries/git sources, fails on RustSec advisories; toolchain pinned (#82).
- Staging hygiene (TS): temp dirs `0o700`, catalog `0o600`, `O_EXCL`, symlink/non-regular-file
  rejection with stat-based TOCTOU snapshots (`cataloged-source.ts:466-554`).
- Package contract: `engines.node >=22`, ES2022/`Node20`, no `devEngines`, tight `exports`,
  self-contained shipped `.d.ts` graph — AGENTS.md-compliant.

## 7. Evidence gaps to close (feeds later phases)

- **G-1** — No committed benchmark profile exercises `extract: false` (copy path) or a no-catalog
  asset source. R-P5 and the #83 probe trade-off are invisible to current evidence. Add one
  profile each to `benchmarks/` (config + app wiring) so copy-skip, probe, and double-pass costs
  are measurable.
- **G-2** — v0.11.0-era rows are single-sample (methodology 1). Any regression claim needs a
  methodology-v2, 5-repetition run; do it once as the Phase-0 baseline and reuse it for all
  Phase 1–2 before/after comparisons.
- **G-3** — `marker-replacement-2048-32.json` exists but no committed rows reference a
  marker-heavy result for the current provider; capture one as the R-P2 baseline.

---

## 8. Recommended sequence

Each step lists its findings, why it sits where it does, and its gate. Gates: `pnpm check`
(local: typecheck, biome, vitest, cargo fmt/clippy/test, audits, package/synth verification) is
assumed for **every** step and not repeated. Perf steps additionally require benchmark evidence
per `AGENTS.md` (before/after Shin + upstream baseline, committed via the shin-benchmark skill);
deployed-behavior changes require `pnpm verify` with the smallest relevant named group.

### Phase 0 — Baseline evidence (1 run, reused everywhere)

1. Run methodology-v2 baseline on the current tree (`methodology-v2-1024-32.json`, 5 reps,
   shin+aws) + `marker-replacement-2048-32.json` + `transfer-scheduler-2048-32.json`. Commit
   sanitized rows. This is both the §2 regression check (repeated measures) and the shared
   "before" for Phases 1–2.
2. Land G-1's two new benchmark profiles (no provider change; app/config only) and baseline them
   too.

### Phase 1 — Rust hot-path CPU/copy wins (HIGH, isolated, measurable)

Order within the phase: each item is an independent PR with its own before/after benchmark rows.

1. **R-P1** — single-copy upload path. Biggest expected CPU win on byte-heavy profiles.
   Benchmark: `large-few`, `mixed` @ 1024/32 + one larger config; verify max memory unchanged.
2. **R-P2** — per-source `MarkerReplacements` cache + borrow marker maps.
   Benchmark: `marker-replacement-2048-32.json`.
3. **R-P5** — spool small comparison-pass outputs for reuse on upload (budget-bounded).
   Benchmark: new no-catalog profile (G-1) + marker profile; watch `source_amplification`,
   `block_refetches`, `replay_claims_after_release`.
4. **R-P8** — request deserialization by reference + move semantics (no behavior change).
5. **R-P9 + R-P10** — allocation-churn batch (Cow strip-prefix, key-clone elimination, 3×
   normalize → 1×, `has_filters` fast path, single `GetBucketTagging`, delete-key `into_iter`,
   BufReader sizing, per-attempt buffer reuse). One PR, one benchmark row set; low risk.

### Phase 2 — Rust structural latency (HIGH/MEDIUM, deployed-behavior-relevant)

1. **R-P4** — pipeline list/delete pagination in cleanup loops. Directly targets the
   pruned-update `delete` phase from §2. Verify: deletion correctness group.
2. **R-P6** — fuse previous-namespace listing into the stale pass. Verify: same group as R-P4;
   do both in one measurement cycle.
3. **R-P3** — split CloudFront create/wait, `join!` the two distributions. Verify:
   invalidation/distribution-change group. Wall-clock win is service-bound; document rather than
   benchmark-row it.
4. **R-P7** — bounded-concurrent source planning (includes #85 admission rework). Largest design
   surface of Phase 2; do last, separately, with plan-phase telemetry before/after.

### Phase 3 — Rust availability & correctness hardening

1. **R-A1** — stitch local headers across block boundaries (HIGH; false-positive failure on
   valid archives). Verify: archive-reading group + new straddling fixture.
2. **R-Q1** — depoison diagnostics/stats mutexes (systemic one-pass) + regression test.
3. **R-Q2** — convert production-path panics to errors (directory accessors, `expect`s,
   `unreachable!`, config assert); init-directive parse test.
4. **R-Q5** (first two bullets) — `release_source_global_bytes` saturating release + anomaly
   counter; `deny_unknown_fields` on `RawDeploymentRequest` with explicit
   `DestinationChecksumStrategy` tolerance.

### Phase 4 — Rust security hardening (defense-in-depth)

1. **R-S2** — response-host allow-list (or IP-literal/RFC1918 rejection) + tests.
2. **R-S3** — sanitize attacker-influenced strings in logs/Reason (entry names, resource type,
   patterns); cap lengths.
3. **R-S4** — configurable max uncompressed entry size (+ optional ratio cap) at planning;
   document in `docs/architecture.md`.
4. **R-S5** — clearance-token/fused ownership check for namespace deletes (combine with R-Q4
   dedup to touch the code once).
5. **R-S6** — owner-tag `:` rejection, control-char invalidation paths, `Content-Range` check,
   threat-model doc notes, async_zip version-floor note.

### Phase 5 — Rust code organization (no behavior change)

1. **R-Q3** — split `archive.rs`; rename range conventions; diagnostics macro; test builders.
2. **R-Q4** — orchestration dedup (guarded-delete helper, paginator, namespace module,
   failure-response helper, digest-generic helper).
3. Remaining **R-Q5** items. Gate: `pnpm check` only; benchmark rows not required
   (prove deployed behavior unchanged by synthesis/byte-identity where possible, else a smoke
   verification group).

### Phase 6 — TypeScript construct fixes

1. Correctness-of-intent batch: **T-Q1** (one-liner real bug), **T-Q2**, **T-Q3**, **T-Q7**,
   **T-B1**. Gate: `pnpm check` + synth verification (no AWS — synthesis-only changes per
   AGENTS.md).
2. Validation parity batch: **T-Q4**, **T-Q5**, **T-Q6** (+ provider-side counterparts noted).
3. Security/packaging batch: **T-S1** warning, **T-S3**, **T-S4** (after confirming the provider
   never GETs destination), **T-S5**, `sideEffects: false`, T-S6/T-S2 docs.
4. Quality batch: §5.3 items.

### Phase 7 — Documentation & close-out

1. Update `docs/architecture.md` (threat-model notes, budget semantics, new limits) and
   `AGENTS.md`-referenced docs where behavior changed.
2. Re-run the Phase-0 baseline configs once at the end; commit the cumulative before/after
   comparison to `docs/benchmark.md` via the shin-benchmark skill.
3. Revisit §2 with final numbers: confirm or close the v0.11.0 update-phase question with
   repeated-measures evidence.

### Dependency/ordering notes

- R-Q3's split should land **before** Phase 5 dedup but **after** Phase 1–2 behavior changes, to
  avoid rebase churn on hot files.
- R-S5 and R-Q4 (guarded-delete dedup) touch the same call sites — do together.
- R-P7 depends on reworking #85's fail-fast budget admission — keep it after R-A1/R-Q2 so the
  budget code is stable first.
- TS phases are independent of Rust phases and can interleave; keep provider-contract renames
  (§5.3 property names) for a dedicated contract-bump release.
