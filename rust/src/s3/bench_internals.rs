//! Dev-only harness surface for the `plan-entries` criterion bench.
//!
//! A criterion bench compiles as a separate crate, so it can only link the library's
//! `pub` API, and Rust forbids re-exporting `pub(crate)` / `pub(super)` items from a
//! `pub` module (E0364/E0365). Re-exporting the planning entry points would therefore
//! force widening the provider's real visibility, which this module deliberately
//! avoids: everything here is *new* dev-only code, compiled only when the off-by-default
//! `bench-internals` feature is enabled (`pnpm rust:bench`), and no existing item's
//! visibility or behavior changes in any build.
//!
//! The bench drives the provider's real planning path through two opaque handles:
//! [`PlanningBench`] runs `plan_deployment` against a replay-backed S3 client (the
//! same `StaticReplayClient` harness the unit tests use, so no network and no AWS
//! credentials are involved), and [`CollectPlansBench`] runs
//! `collect_zip_entry_plans` over a manifest built from the same fixture entries. The
//! signatures use only new types and main-dependency types; every `pub(crate)` type
//! stays crate-internal.

use std::collections::BTreeMap;
use std::sync::Arc;

use aws_sdk_cloudfront::Client as CloudFrontClient;
use aws_sdk_s3::Client as S3Client;
use reqwest::Client as HttpClient;

use crate::request::compile_filters;
use crate::s3::archive::budget::SourceByteBudget;
use crate::types::{
    AppState, ArchiveExpansionLimits, DeploymentManifest, DeploymentRequest, DeploymentStats,
    MarkerConfig, PlannedAction, PlannedObject, PutObjectRetryJitter, PutObjectRetryOptions,
    RuntimeOptions, TrustedEntryIntegrity, TrustedSourceCatalog,
};

const MIXED_PROFILE_ENTRY_COUNT: usize = 442;
const MIXED_PROFILE_TOTAL_BYTES: u64 = 52_904_649;

/// How the bench's fixture archive renders an entry's payload bytes: text-like series
/// get high-entropy identifier lines (deflate ~3-4:1, like real minified bundles);
/// binary series (`.webp`, `.woff2`) get an incompressible stream. Deliberately not a
/// constant-fill body or an LCG with a repeating low byte — both shipped here before
/// and compressed unrealistically.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum BenchPayloadKind {
    Text,
    Binary,
}

/// Embedded catalog path, mirroring `crate::s3::EMBEDDED_CATALOG_PATH`. The bench needs
/// the literal at fixture-build time; if the provider's constant ever moves, the
/// trusted-variant bench fails loudly at setup (the catalog entry is not found) rather
/// than silently measuring the wrong archive shape.
pub const EMBEDDED_CATALOG_PATH: &str = ".shin/catalog.v1.json";

/// One fixture entry as the bench describes it: the provider-side types that end up in
/// the manifest stay crate-internal, so the bench passes plain name/size pairs and this
/// module does the rest.
#[derive(Clone, Debug)]
pub struct BenchEntry {
    pub relative_key: String,
    pub size: u64,
    pub kind: BenchPayloadKind,
}

/// The `mixed` profile's four root files (`benchmarks/src/assets.ts`, generator v4), in
/// generator order: name, size.
const ROOT_FILES: [(&str, u64); 4] = [
    ("index.html", 24 * 1024),
    ("asset-manifest.json", 18 * 1024),
    ("service-worker.js", 32 * 1024),
    ("robots.txt", 1024),
];

/// The `mixed` profile's seven series: prefix, extension, count, minimum size, maximum
/// size, payload kind. Order matters — the generator emits them in this order and the
/// bench keeps the same central-directory order.
struct SeriesSpec {
    prefix: &'static str,
    extension: &'static str,
    count: usize,
    min_size: u64,
    max_size: u64,
    kind: BenchPayloadKind,
}

const SERIES: [SeriesSpec; 7] = [
    SeriesSpec {
        prefix: "assets/chunks/route",
        extension: ".js",
        count: 140,
        min_size: 12 * 1024,
        max_size: 96 * 1024,
        kind: BenchPayloadKind::Text,
    },
    SeriesSpec {
        prefix: "assets/chunks/vendor",
        extension: ".js",
        count: 12,
        min_size: 512 * 1024,
        max_size: 1536 * 1024,
        kind: BenchPayloadKind::Text,
    },
    SeriesSpec {
        prefix: "assets/maps/route",
        extension: ".js.map",
        count: 80,
        min_size: 32 * 1024,
        max_size: 220 * 1024,
        kind: BenchPayloadKind::Text,
    },
    SeriesSpec {
        prefix: "assets/css/scope",
        extension: ".css",
        count: 36,
        min_size: 8 * 1024,
        max_size: 64 * 1024,
        kind: BenchPayloadKind::Text,
    },
    SeriesSpec {
        prefix: "assets/data/page",
        extension: ".json",
        count: 120,
        min_size: 2 * 1024,
        max_size: 24 * 1024,
        kind: BenchPayloadKind::Text,
    },
    SeriesSpec {
        prefix: "assets/media/image",
        extension: ".webp",
        count: 42,
        min_size: 64 * 1024,
        max_size: 768 * 1024,
        kind: BenchPayloadKind::Binary,
    },
    SeriesSpec {
        prefix: "assets/fonts/font",
        extension: ".woff2",
        count: 8,
        min_size: 96 * 1024,
        max_size: 220 * 1024,
        kind: BenchPayloadKind::Binary,
    },
];

/// Replicates the `mixed` profile from `benchmarks/src/assets.ts` (generator v4): 442
/// entries totalling 52,904,649 bytes, with the same path depths (4 root files, 438
/// under two-level directories), the same per-series counts, and the same name and
/// size distributions. The distribution choices are copied from that generator rather
/// than invented:
///
/// - names: `<prefix>-<index:04>.<hash8><ext>`, where `hash8` is an FNV-1a hash of
///   `<prefix>:<index>` rendered in base36 with JavaScript `Math.imul` semantics and
///   truncated to 8 characters — exactly `hashName` in `assets.ts`. This is what makes
///   names vary per entry like real content-hashed bundles.
/// - sizes: the generator's LCG, `min + ((index * 1103515245 + 12345) mod 2^32) %
///   span`, per series. This is what makes the fixture's sizes realistic and uneven
///   (1 KiB `robots.txt` up to 1.5 MiB vendor chunks) rather than 442 identical
///   entries.
pub fn mixed_entries() -> Vec<BenchEntry> {
    let mut entries = Vec::with_capacity(MIXED_PROFILE_ENTRY_COUNT);
    for (name, size) in ROOT_FILES {
        entries.push(BenchEntry {
            relative_key: name.to_string(),
            size,
            kind: BenchPayloadKind::Text,
        });
    }
    for series in &SERIES {
        for index in 0..series.count {
            entries.push(BenchEntry {
                relative_key: format!(
                    "{}-{:04}.{}{}",
                    series.prefix,
                    index,
                    hash_name(series.prefix, index),
                    series.extension
                ),
                size: sized(index, series.min_size, series.max_size),
                kind: series.kind,
            });
        }
    }
    entries
}

/// FNV-1a byte-for-byte the `hashName`/`hash` pair in `assets.ts`: each step is a
/// JavaScript `Math.imul` signed 32-bit multiply (bit-identical to wrapping `u32`
/// arithmetic), and the function ends with `>>> 0`, so the hash is always unsigned.
/// `toString(36).slice(0, 8)` becomes base36 truncated to 8 characters.
fn hash_name(prefix: &str, index: usize) -> String {
    // The initial state is > `i32::MAX`, so the first XOR lands in negative int32
    // territory; keeping `u32` state is bit-identical because two's-complement
    // wrapping multiplication ignores signedness.
    let mut state: u32 = 2_166_136_261;
    for byte in format!("{prefix}:{index}").bytes() {
        state ^= u32::from(byte);
        state = state.wrapping_mul(16_777_619);
    }
    base36(state).chars().take(8).collect()
}

fn base36(mut value: u32) -> String {
    const DIGITS: &[u8; 36] = b"0123456789abcdefghijklmnopqrstuvwxyz";
    if value == 0 {
        return "0".to_string();
    }
    let mut digits = Vec::new();
    while value > 0 {
        digits.push(DIGITS[(value % 36) as usize]);
        value /= 36;
    }
    digits.reverse();
    String::from_utf8(digits).expect("base36 digits are ASCII")
}

/// The generator's LCG for entry sizes: `min + ((index * 1103515245 + 12345) >>> 0) %
/// span` in JS, which is `mod 2^32` arithmetic — the same bits as Rust's wrapping
/// multiply-add on `u32`.
fn sized(index: usize, min_size: u64, max_size: u64) -> u64 {
    if min_size == max_size {
        return min_size;
    }
    let span = max_size - min_size;
    let lcg = (index as u32)
        .wrapping_mul(1_103_515_245)
        .wrapping_add(12_345);
    min_size + u64::from(lcg % span as u32)
}

/// The per-run result of one planning pass. `plan_entries_micros` is the `planEntries`
/// bucket measured by the production instrument (the same `phaseMs.planEntries` the
/// provider reports); the bench keeps its own clock for the whole-run time, which also
/// covers the head request, the directory fetch and validation.
#[derive(Clone, Copy, Debug)]
pub struct PlanningOutcome {
    pub plan_entries_micros: u64,
    pub manifest_len: usize,
}

/// Opaque handle to one planning configuration. The `DeploymentRequest` lives here
/// (its fields are `pub(crate)`), so the bench selects trusted/untrusted by
/// construction and never names provider types.
pub struct PlanningBench {
    request: DeploymentRequest,
}

impl PlanningBench {
    /// Extract-mode request shaped like the canonical benchmark's `mixed` run: one
    /// source archive, no markers, 8 MiB source blocks (the provider default), the
    /// default expansion limits, and — when `catalog_sha256` is `Some` — a trusted
    /// source catalog binding so the per-entry loop takes the authenticated path.
    pub fn new(catalog_sha256: Option<[u8; 32]>) -> Self {
        PlanningBench {
            request: DeploymentRequest {
                source_bucket_names: vec!["source".to_string()],
                source_object_keys: vec!["source.zip".to_string()],
                source_catalogs: vec![catalog_sha256.map(|sha256| TrustedSourceCatalog { sha256 })],
                source_markers: vec![std::collections::HashMap::new()],
                source_markers_config: vec![MarkerConfig::default()],
                dest_bucket_name: "destination".to_string(),
                dest_bucket_prefix: "site".to_string(),
                extract: true,
                delete_current_objects_on_delete: false,
                distribution_id: None,
                distribution_paths: vec!["/*".to_string()],
                wait_for_distribution_invalidation: true,
                delete_stale_objects_on_deployment: true,
                exclude: Vec::new(),
                include: Vec::new(),
                output_object_keys: true,
                destination_bucket_arn: None,
                destination_owner_id: "owner".to_string(),
                delete_previous_objects_on_change: None,
                invalidate_previous_distribution_on_change: None,
                archive_expansion: ArchiveExpansionLimits {
                    max_uncompressed_entry_bytes: 1024 * 1024 * 1024,
                    max_compression_ratio: 100,
                },
                runtime: RuntimeOptions {
                    available_memory_mb: 1024,
                    max_parallel_transfers: 1,
                    source_block_bytes: 8 * 1024 * 1024,
                    source_block_merge_gap_bytes: 256 * 1024,
                    source_get_concurrency: 1,
                    source_window_bytes: None,
                    source_memory_budget_bytes: 256 * 1024 * 1024,
                    put_object_retry: PutObjectRetryOptions {
                        max_attempts: 1,
                        retry_base_delay_ms: 1,
                        retry_max_delay_ms: 1,
                        slowdown_retry_base_delay_ms: 1,
                        slowdown_retry_max_delay_ms: 1,
                        jitter: PutObjectRetryJitter::None,
                    },
                },
            },
        }
    }

    /// One planning pass against a replay-backed S3 client. The client is built by the
    /// bench with the replay connector (a dev-dependency, so it cannot appear here);
    /// the app state, stats, byte budget and filters are constructed inside this
    /// module, and the provider's own `planEntries` timer is read back from the stats.
    pub async fn run(&self, source_s3: &S3Client) -> PlanningOutcome {
        let state = AppState {
            source_s3: source_s3.clone(),
            destination_s3: source_s3.clone(),
            cloudfront: CloudFrontClient::from_conf(
                aws_sdk_cloudfront::Config::builder()
                    .behavior_version_latest()
                    .region(aws_sdk_cloudfront::config::Region::new("us-east-1"))
                    .credentials_provider(aws_sdk_cloudfront::config::Credentials::new(
                        "test-access-key",
                        "test-secret-key",
                        None,
                        None,
                        "shin-bucket-deployment-test",
                    ))
                    .build(),
            ),
            http: HttpClient::new(),
            detailed_failure_diagnostics: false,
        };
        let stats = Arc::new(DeploymentStats::default());
        let budget = SourceByteBudget::new(256 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid bench source budget");
        let filters = compile_filters(&[], &[]).expect("empty filters compile");
        let (_, manifest) =
            super::planner::plan_deployment(&state, &self.request, &filters, &stats, budget)
                .await
                .expect("synthetic planning run must succeed");
        let (_, _, entries_micros, _, _, _) = stats.plan_parts_micros_for_test();
        PlanningOutcome {
            plan_entries_micros: entries_micros,
            manifest_len: manifest.len(),
        }
    }
}

/// Opaque handle to a fixture manifest for `collect_zip_entry_plans`. The manifest and
/// the planned objects stay crate-internal; the bench feeds plain entries and receives
/// back a count to keep the result alive.
pub struct CollectPlansBench {
    manifest: DeploymentManifest,
}

impl CollectPlansBench {
    pub fn from_entries(entries: &[BenchEntry]) -> Self {
        let mut manifest = BTreeMap::new();
        let mut source_offset = 0_u64;
        for entry in entries {
            // Trusted integrity is always present (the canonical `mixed` run is
            // cataloged), so the per-entry `Option<TrustedEntryIntegrity>` clone
            // allocates its MD5 string exactly as for a real authenticated deployment.
            let planned = PlannedObject {
                relative_key: entry.relative_key.clone(),
                expected_etag: None,
                action: PlannedAction::ZipEntry {
                    archive_index: 0,
                    source_index: 0,
                    size: entry.size,
                    compressed_size: entry.size,
                    compression_code: 0,
                    crc32: 0,
                    trusted_integrity: Some(TrustedEntryIntegrity {
                        size: entry.size,
                        md5: "0".repeat(32),
                    }),
                    source_offset,
                    source_span_end_exclusive: source_offset + entry.size,
                },
            };
            source_offset += entry.size + 30; // local file header, as in a real archive
            manifest.insert(entry.relative_key.clone(), planned);
        }
        CollectPlansBench { manifest }
    }

    pub fn collect(&self, destination_prefix: &str) -> usize {
        let plans = super::planner::collect_zip_entry_plans(&self.manifest, destination_prefix);
        plans.values().map(Vec::len).sum()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Pins the fixture to the real `mixed` generator output (captured from
    /// `benchmarks/src/assets.ts` generator v4). If the replication drifts, these
    /// assertions fail loudly instead of silently benchmarking a different shape.
    #[test]
    fn mixed_fixture_replicates_the_benchmark_generator() {
        let entries = mixed_entries();
        assert_eq!(entries.len(), MIXED_PROFILE_ENTRY_COUNT);
        let total: u64 = entries.iter().map(|entry| entry.size).sum();
        assert_eq!(total, MIXED_PROFILE_TOTAL_BYTES);

        let at = |path: &str| {
            entries
                .iter()
                .find(|entry| entry.relative_key == path)
                .unwrap_or_else(|| panic!("fixture is missing `{path}`"))
                .size
        };
        assert_eq!(at("index.html"), 24_576);
        assert_eq!(at("asset-manifest.json"), 18_432);
        assert_eq!(at("service-worker.js"), 32_768);
        assert_eq!(at("robots.txt"), 1024);
        assert_eq!(at("assets/chunks/route-0000.beiv7v.js"), 24_633);
        assert_eq!(at("assets/chunks/route-0001.b4j9iw.js"), 40_614);
        assert_eq!(at("assets/chunks/vendor-0000.1nc8mfc.js"), 536_633);
        assert_eq!(at("assets/maps/route-0000.9hxbki.js.map"), 45_113);
        assert_eq!(at("assets/css/scope-0000.3xsuo1.css"), 20_537);
        assert_eq!(at("assets/data/page-0000.bfdbav.json"), 14_393);
        assert_eq!(at("assets/media/image-0000.w1cwdf.webp"), 77_881);
        assert_eq!(at("assets/fonts/font-0000.w0wzxt.woff2"), 110_649);
        assert_eq!(at("assets/fonts/font-0007.wawlms.woff2"), 128_308);

        let names: std::collections::HashSet<_> =
            entries.iter().map(|entry| &entry.relative_key).collect();
        assert_eq!(
            names.len(),
            entries.len(),
            "all fixture names must be distinct"
        );
    }
}
