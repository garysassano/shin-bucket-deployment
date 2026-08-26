//! Criterion bench for the per-entry source planning loop (workstream N-3).
//!
//! # What this measures
//!
//! `phaseMs.planEntries` is the per-entry manifest loop inside
//! `add_archive_entries_to_manifest` (`s3/planner.rs`): path normalization, duplicate
//! detection, expansion checks, span derivation, and manifest insertion, per archive.
//! That loop is inline inside an S3-coupled function, so the bench drives the whole
//! source-planning run — `plan_deployment` over an in-memory 442-entry ZIP served by
//! `aws-smithy-http-client`'s replay connector, the same harness the unit tests use —
//! and reports two numbers per iteration:
//!
//! 1. the whole planning run, timed by criterion (`iter_custom`); and
//! 2. the `planEntries` bucket alone, read from the run's own `DeploymentStats`
//!    (`plan_parts_micros` in `s3/bench_internals.rs`), which is the same instrument
//!    the provider reports in `phaseMs.planEntries` — measured on this host with zero
//!    S3 traffic.
//!
//! A second group benchmarks `collect_zip_entry_plans`, the follow-up per-entry pass
//! (grouping + destination-key formatting + sort) that planning performs after the
//! manifest loop; it is not part of the `planEntries` bucket (see the accounting rules
//! at the `PhaseMillis` definition site in `diagnostics.rs`), so it is reported separately.
//!
//! # The fixture
//!
//! The synthetic archive replicates the repository's own `mixed` benchmark profile
//! (`benchmarks/src/assets.ts`, generator v4): 442 entries totalling 52,904,649 bytes,
//! with the same path depths (4 root files, 438 under two-level directories) and the
//! same per-series name and size distributions. The generator lives in
//! `s3/bench_internals.rs` (`mixed_entries`) and is pinned by a golden unit test
//! against values captured from the real generator, so a drift in either direction
//! fails loudly instead of silently benchmarking a different shape. Payload bytes are
//! generated here: text-like series get high-entropy identifier lines (deflate
//! ~3-4:1, like real minified bundles); binary series (`.webp`, `.woff2`) get an
//! incompressible xorshift32 stream. Deliberately *not* a constant-fill body or an
//! LCG whose low byte repeats — both shipped here before and compressed
//! unrealistically (a repeated block also trips the provider's compression-ratio
//! guard, so planning would fail rather than measure).
//!
//! # Running
//!
//! `cargo bench --manifest-path rust/Cargo.toml --features bench-internals` (or
//! `pnpm rust:bench`). The bench is dev-only: `criterion` is a dev-dependency, the
//! `bench-internals` feature is off by default, and no gate runs `cargo bench`.

#![cfg(feature = "bench-internals")]

use std::hint::black_box;
use std::io::{Cursor, Write};
use std::time::{Duration, Instant};

use aws_sdk_s3::config::{Credentials, Region};
use aws_sdk_s3::primitives::SdkBody;
use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
use bytes::Bytes;
use criterion::{Criterion, criterion_group, criterion_main};
use http::{Request, Response};
use sha2::{Digest, Sha256};
use shin_bucket_deployment_handler::bench_internals;
use shin_bucket_deployment_handler::bench_internals::{BenchEntry, BenchPayloadKind};
use tokio::runtime::Builder as RuntimeBuilder;
use zip::CompressionMethod;
use zip::write::{SimpleFileOptions, ZipWriter};

const DESTINATION_PREFIX: &str = "site";

/// Deterministic xorshift32, the same recurrence as the benchmark generator's
/// `nextRandom`; seeds are an FNV-1a hash of the entry path, so payloads are stable
/// across machines and runs.
struct XorShift32(u32);

impl XorShift32 {
    fn seeded(path: &str) -> Self {
        let mut state: u32 = 2_166_136_261;
        for byte in path.bytes() {
            state ^= u32::from(byte);
            state = state.wrapping_mul(16_777_619);
        }
        XorShift32(state)
    }

    fn next(&mut self) -> u32 {
        let mut x = self.0;
        x ^= x << 13;
        x ^= x >> 17;
        x ^= x << 5;
        self.0 = x;
        x
    }
}

/// Text payload of exactly `size` bytes: high-entropy identifier lines in the shape of
/// the real generator's minified-bundle text, so deflate lands near the realistic
/// ~3.8:1 instead of a repeated block's 100:1+.
fn text_payload(path: &str, size: u64) -> Vec<u8> {
    let mut random = XorShift32::seeded(path);
    let mut payload = Vec::with_capacity(size as usize);
    let _ = writeln!(payload, "/* {path} */");
    while (payload.len() as u64) < size {
        let name = format!("{:x}", random.next());
        let class = format!("{:x}", random.next());
        let _ = writeln!(
            payload,
            "export const r{name}=()=>h('div',{{className:'{class}'}});"
        );
    }
    payload.truncate(size as usize);
    payload
}

/// Binary payload of exactly `size` bytes: an incompressible xorshift32 byte stream,
/// the shape of already-compressed `.webp`/`.woff2` assets. Not an LCG byte stream —
/// the low-byte repetition pattern shipped here before and compressed 256:1.
fn binary_payload(path: &str, size: u64) -> Vec<u8> {
    let mut random = XorShift32::seeded(path);
    let mut payload = Vec::with_capacity(size as usize);
    while (payload.len() as u64) < size {
        payload.extend_from_slice(&random.next().to_le_bytes());
    }
    payload.truncate(size as usize);
    payload
}

/// Builds the fixture archive: every `mixed` entry (deflated, real sizes), plus the
/// embedded source catalog when `catalog_json` is present — the same archive shape a
/// cataloged deployment source has (442 deployable entries + the `.shin` catalog).
fn build_mixed_zip(entries: &[BenchEntry], catalog_json: Option<&[u8]>) -> Vec<u8> {
    let cursor = Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    for spec in entries {
        writer.start_file(&spec.relative_key, options).unwrap();
        let payload = match spec.kind {
            BenchPayloadKind::Text => text_payload(&spec.relative_key, spec.size),
            BenchPayloadKind::Binary => binary_payload(&spec.relative_key, spec.size),
        };
        writer.write_all(&payload).unwrap();
    }
    if let Some(catalog) = catalog_json {
        writer
            .start_file(bench_internals::EMBEDDED_CATALOG_PATH, options)
            .unwrap();
        writer.write_all(catalog).unwrap();
    }
    writer.finish().unwrap().into_inner()
}

/// The embedded-catalog JSON for the trusted variant, in the v1 schema the provider's
/// `load_authenticated_catalog` parses (same shape as `synthetic_catalog_json` in the
/// planner tests): every entry with its real size and a placeholder lowercase MD5.
fn catalog_json(entries: &[BenchEntry]) -> Vec<u8> {
    let mut json = String::from(r#"{"version":1,"entries":["#);
    for (index, spec) in entries.iter().enumerate() {
        if index > 0 {
            json.push(',');
        }
        json.push_str(&format!(
            r#"{{"path":"{}","size":{},"md5":"{}"}}"#,
            spec.relative_key,
            spec.size,
            "0".repeat(32)
        ));
    }
    json.push_str("]}");
    json.into_bytes()
}

/// Offset of the end-of-central-directory record's declared central-directory start —
/// the same scan the planner tests use.
fn central_directory_start_of(zip: &[u8]) -> u64 {
    const END_OF_DIRECTORY_SIGNATURE: [u8; 4] = [0x50, 0x4b, 0x05, 0x06];
    let end_of_directory = zip
        .windows(4)
        .rposition(|window| window == END_OF_DIRECTORY_SIGNATURE)
        .expect("archive must contain an end of central directory record");
    u32::from_le_bytes(
        zip[end_of_directory + 16..end_of_directory + 20]
            .try_into()
            .expect("central directory offset is four bytes"),
    ) as u64
}

/// The one ranged GET a planning run makes for the directory: `locate_eocd` probes the
/// last `METADATA_SCAN_CHUNK_BYTES`-aligned block (`archive/directory.rs`), and the
/// range reader validates the response's `Content-Range` against the request, so the
/// event must serve exactly this range. The bench's request uses the provider's default
/// 8 MiB source blocks, so the scan chunk is the 256 KiB metadata cap.
fn directory_tail_range(source_len: u64) -> (u64, u64) {
    const METADATA_SCAN_CHUNK: u64 = 256 * 1024;
    let start = (source_len - 1) & !(METADATA_SCAN_CHUNK - 1);
    (start, source_len - 1)
}

/// Replay events for one planning run: a HEAD for the source object, the directory
/// probe GET described above, and — for a trusted catalog — one more GET serving the
/// catalog block (from the catalog entry's local header to the central directory, the
/// same range the planner tests replay). Events are rebuilt per run because the replay
/// connector pops them; the bodies are `Bytes`, so rebuilding is an Arc bump, not a
/// copy of the archive.
fn replay_events(zip: &Bytes, catalog_slice: Option<(u64, u64)>) -> Vec<ReplayEvent> {
    let len = zip.len() as u64;
    let mut events = vec![ReplayEvent::new(
        Request::builder()
            .method("HEAD")
            .uri("https://s3.test/source/source.zip")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(200)
            .header("content-length", len.to_string())
            .header("etag", "\"test-etag\"")
            .body(SdkBody::empty())
            .unwrap(),
    )];
    let (directory_start, directory_end) = directory_tail_range(len);
    let directory_bytes = zip.slice(directory_start as usize..=directory_end as usize);
    events.push(ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/source/source.zip")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(206)
            .header("content-length", directory_bytes.len().to_string())
            .header(
                "content-range",
                format!("bytes {directory_start}-{directory_end}/{len}"),
            )
            .body(SdkBody::from(directory_bytes))
            .unwrap(),
    ));
    if let Some((start, end_exclusive)) = catalog_slice {
        let slice = zip.slice(start as usize..end_exclusive as usize);
        events.push(ReplayEvent::new(
            Request::builder()
                .uri("https://s3.test/source/source.zip")
                .body(SdkBody::empty())
                .unwrap(),
            Response::builder()
                .status(206)
                .header("content-length", slice.len().to_string())
                .header(
                    "content-range",
                    format!("bytes {start}-{}/{len}", end_exclusive - 1),
                )
                .body(SdkBody::from(slice))
                .unwrap(),
        ));
    }
    events
}

/// One planning run against the fixture archive, timed. The replay client, S3 client,
/// stats, budget and filters are harness plumbing and are built before the clock
/// starts; the timed region is exactly the provider's source-planning path.
fn run_planning(
    runtime: &tokio::runtime::Runtime,
    zip: &Bytes,
    planning: &bench_internals::PlanningBench,
    catalog_slice: Option<(u64, u64)>,
) -> (Duration, u64, usize) {
    let replay = StaticReplayClient::new(replay_events(zip, catalog_slice));
    let s3 = aws_sdk_s3::Client::from_conf(
        aws_sdk_s3::Config::builder()
            .behavior_version_latest()
            .region(Region::new("us-east-1"))
            .credentials_provider(Credentials::new(
                "test-access-key",
                "test-secret-key",
                None,
                None,
                "shin-bucket-deployment-test",
            ))
            .endpoint_url("https://s3.test")
            .force_path_style(true)
            .http_client(replay)
            .build(),
    );

    let started = Instant::now();
    let outcome = runtime.block_on(planning.run(&s3));
    let elapsed = started.elapsed();
    (elapsed, outcome.plan_entries_micros, outcome.manifest_len)
}

fn bench_planning_run(c: &mut Criterion, group: &str, trusted: bool) {
    let entries = bench_internals::mixed_entries();
    let catalog = trusted.then(|| catalog_json(&entries));
    let zip = Bytes::from(build_mixed_zip(&entries, catalog.as_deref()));
    let catalog_sha256 = catalog.as_deref().map(|json| {
        let digest = Sha256::digest(json);
        digest.into()
    });
    let planning = bench_internals::PlanningBench::new(catalog_sha256);
    let catalog_slice = if trusted {
        let runtime = RuntimeBuilder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let reader = runtime.block_on(async_zip::base::read::seek::ZipFileReader::with_tokio(
            Cursor::new(zip.to_vec()),
        ));
        let reader = reader.expect("fixture archive parses");
        let catalog_offset = reader
            .file()
            .entries()
            .iter()
            .find(|entry| {
                entry.filename().as_str().ok() == Some(bench_internals::EMBEDDED_CATALOG_PATH)
            })
            .expect("fixture archive carries its embedded catalog")
            .header_offset();
        Some((catalog_offset, central_directory_start_of(&zip)))
    } else {
        None
    };
    let runtime = RuntimeBuilder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();

    let mut entries_micros_total = 0_u64;
    let mut runs = 0_u64;
    c.bench_function(group, |bencher| {
        bencher.iter_custom(|iters| {
            let mut total = Duration::ZERO;
            for _ in 0..iters {
                let (elapsed, entries_micros, manifest_len) =
                    run_planning(&runtime, &zip, &planning, catalog_slice);
                black_box(manifest_len);
                total += elapsed;
                entries_micros_total += entries_micros;
                runs += 1;
            }
            total
        });
    });
    if runs > 0 {
        let mean_run = entries_micros_total as f64 / runs as f64;
        let mean_per_entry = mean_run / 442.0;
        println!(
            "[{group}] internal planEntries timer over {runs} runs: \
             mean {mean_run:.1} µs per 442-entry archive, {mean_per_entry:.3} µs per entry"
        );
    }
}

fn bench_planning_run_untrusted(c: &mut Criterion) {
    bench_planning_run(
        c,
        "plan_entries/whole_planning_run_untrusted_442_mixed",
        false,
    );
}

fn bench_planning_run_trusted(c: &mut Criterion) {
    bench_planning_run(c, "plan_entries/whole_planning_run_trusted_442_mixed", true);
}

fn bench_collect_zip_entry_plans(c: &mut Criterion) {
    let fixture = bench_internals::mixed_entries();
    let collect = bench_internals::CollectPlansBench::from_entries(&fixture);
    c.bench_function(
        "plan_entries/collect_zip_entry_plans_442_mixed",
        |bencher| {
            bencher.iter(|| black_box(collect.collect(DESTINATION_PREFIX)));
        },
    );
}

fn bench_key_lifecycle_100_000(c: &mut Criterion) {
    let lifecycle = bench_internals::KeyLifecycleBench::large();
    let mut group = c.benchmark_group("plan_entries/key_lifecycle_100000");
    group.sample_size(10);
    group.warm_up_time(Duration::from_secs(1));
    group.measurement_time(Duration::from_secs(10));
    group.bench_function("build_manifest_and_transfer_plans", |bencher| {
        bencher.iter(|| black_box(lifecycle.run(DESTINATION_PREFIX)));
    });
    group.finish();
}

criterion_group!(
    plan_entries_benches,
    bench_planning_run_untrusted,
    bench_planning_run_trusted,
    bench_collect_zip_entry_plans,
    bench_key_lifecycle_100_000
);
criterion_main!(plan_entries_benches);
