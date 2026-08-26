//! Allocation and peak-resident-memory companion to `plan_entries`.
//!
//! `allocation-counter` measures the synchronous, single-threaded key lifecycle from
//! manifest construction through ZIP transfer-plan derivation. Fixture construction
//! and one warm-up run stay outside the five measured samples. `/proc/self/status`
//! supplies the Linux process high-water RSS after the samples; this target is local
//! evidence for the Linux Lambda provider and is not part of normal gates.

#![cfg(feature = "bench-key-allocations")]

use std::hint::black_box;
use std::time::Instant;

use allocation_counter::AllocationInfo;
use serde_json::json;
use shin_bucket_deployment_handler::bench_internals::{
    KeyLifecycleBench, LARGE_KEY_PROFILE_ENTRY_COUNT,
};

const DESTINATION_PREFIX: &str = "site";
const SAMPLES: usize = 5;

fn median_u64(values: &mut [u64]) -> u64 {
    values.sort_unstable();
    values[values.len() / 2]
}

fn peak_rss_kib() -> Option<u64> {
    let status = std::fs::read_to_string("/proc/self/status").ok()?;
    let line = status.lines().find(|line| line.starts_with("VmHWM:"))?;
    line.split_ascii_whitespace().nth(1)?.parse().ok()
}

fn main() {
    let lifecycle = KeyLifecycleBench::large();
    let warmup = lifecycle.run(DESTINATION_PREFIX);
    assert_eq!(warmup.manifest_len, LARGE_KEY_PROFILE_ENTRY_COUNT);
    assert_eq!(warmup.transfer_plan_len, LARGE_KEY_PROFILE_ENTRY_COUNT);

    let mut elapsed_micros = Vec::with_capacity(SAMPLES);
    let mut allocation_samples = Vec::<AllocationInfo>::with_capacity(SAMPLES);
    for _ in 0..SAMPLES {
        let mut outcome = None;
        let started = Instant::now();
        let allocations = allocation_counter::measure(|| {
            outcome = Some(black_box(lifecycle.run(DESTINATION_PREFIX)));
        });
        elapsed_micros.push(started.elapsed().as_micros() as u64);
        let outcome = outcome.expect("measured key lifecycle returns an outcome");
        assert_eq!(outcome.manifest_len, LARGE_KEY_PROFILE_ENTRY_COUNT);
        assert_eq!(outcome.transfer_plan_len, LARGE_KEY_PROFILE_ENTRY_COUNT);
        allocation_samples.push(allocations);
    }

    let mut count_total: Vec<_> = allocation_samples
        .iter()
        .map(|sample| sample.count_total)
        .collect();
    let mut count_max: Vec<_> = allocation_samples
        .iter()
        .map(|sample| sample.count_max)
        .collect();
    let mut bytes_total: Vec<_> = allocation_samples
        .iter()
        .map(|sample| sample.bytes_total)
        .collect();
    let mut bytes_max: Vec<_> = allocation_samples
        .iter()
        .map(|sample| sample.bytes_max)
        .collect();

    println!(
        "{}",
        json!({
            "profile": "key-lifecycle-100000",
            "entries": LARGE_KEY_PROFILE_ENTRY_COUNT,
            "samples": SAMPLES,
            "profiledElapsedMicrosMedian": median_u64(&mut elapsed_micros),
            "allocationsTotalMedian": median_u64(&mut count_total),
            "allocationsPeakLiveMedian": median_u64(&mut count_max),
            "allocatedBytesTotalMedian": median_u64(&mut bytes_total),
            "allocatedBytesPeakLiveMedian": median_u64(&mut bytes_max),
            "processPeakRssKiB": peak_rss_kib(),
        })
    );
}
