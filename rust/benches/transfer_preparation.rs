//! Production transfer CPU harness. Run through `pnpm rust:bench:transfer` for
//! release-build provenance; CI uses `--check-fixtures` without timing thresholds.

use std::hint::black_box;
use std::io::{Cursor, Read, Write};
use std::path::{Path, PathBuf};
use std::time::Instant;

use aws_sdk_s3::config::{Credentials, Region};
use bytes::Bytes;
use md5::{Digest, Md5};
use serde_json::json;
use sha2::Sha256;
use shin_bucket_deployment_handler::bench_internals::{
    TransferBench, TransferFixture, TransferOperation,
};
use tokio::runtime::Runtime;
use zip::CompressionMethod;
use zip::write::{SimpleFileOptions, ZipWriter};

const SAMPLES: usize = 7;
const MARKER: &[u8] = b"__SHIN_BASE__";
const REPLACEMENT: &[u8] = b"https://example.invalid/static/";

struct Fixture {
    spec: TransferFixture,
    input: Vec<u8>,
    output: Vec<u8>,
    sha256: String,
    method: &'static str,
    entropy: &'static str,
}

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

fn fixture(
    size: usize,
    repetitive: bool,
    markers: bool,
    method: CompressionMethod,
    fixture_dir: Option<&Path>,
) -> Fixture {
    let mut input = vec![0; size];
    let mut random = fastrand::Rng::with_seed(0x5348_494e);
    if repetitive {
        // Unique JSON records with repeated field names/values, not constant fill.
        // The random identifiers keep legitimate redundancy below the 100:1 limit.
        let mut offset = 0;
        while offset < size {
            let id = random.u64(..);
            let line = format!(
                "{{\"id\":\"{id:016x}\",\"route\":\"/assets/{id:016x}\",\"enabled\":true,\"cache\":\"public,max-age=3600\"}}\n"
            );
            let count = line.len().min(size - offset);
            input[offset..offset + count].copy_from_slice(&line.as_bytes()[..count]);
            offset += count;
        }
    } else {
        random.fill(&mut input);
    }
    if markers {
        for offset in (0..size.saturating_sub(MARKER.len())).step_by(4096) {
            input[offset..offset + MARKER.len()].copy_from_slice(MARKER);
        }
    }
    // Independent, untimed reference replacement used by exact-body checks.
    let mut output = Vec::new();
    let mut remaining = input.as_slice();
    while markers && let Some(offset) = remaining.windows(MARKER.len()).position(|w| w == MARKER) {
        output.extend_from_slice(&remaining[..offset]);
        output.extend_from_slice(REPLACEMENT);
        remaining = &remaining[offset + MARKER.len()..];
    }
    output.extend_from_slice(remaining);
    let method_name = if method == CompressionMethod::Stored {
        "stored"
    } else {
        "deflate"
    };
    let fixture_path =
        fixture_dir.map(|dir| dir.join(format!("{method_name}-{size}-{repetitive}-{markers}.zip")));
    // Persist once and reuse for backend comparisons: fixture compression must
    // not change when P02 changes the decoder's unified flate2 backend.
    let archive = if let Some(path) = fixture_path.as_ref().filter(|path| path.exists()) {
        std::fs::read(path).unwrap()
    } else {
        let mut writer = ZipWriter::new(Cursor::new(Vec::new()));
        writer
            .start_file(
                "fixture.bin",
                SimpleFileOptions::default().compression_method(method),
            )
            .unwrap();
        writer.write_all(&input).unwrap();
        let archive = writer.finish().unwrap().into_inner();
        if let Some(path) = fixture_path {
            std::fs::write(path, &archive).unwrap();
        }
        archive
    };
    let mut parsed = zip::ZipArchive::new(Cursor::new(&archive)).unwrap();
    let mut entry = parsed.by_name("fixture.bin").unwrap();
    assert_eq!(entry.compression(), method);
    assert!(entry.size() <= 1024 * 1024 * 1024);
    assert!(entry.size() <= entry.compressed_size() * 100);
    let mut roundtrip = Vec::new();
    entry.read_to_end(&mut roundtrip).unwrap();
    assert_eq!(roundtrip, input);
    let spec = TransferFixture {
        archive: Bytes::copy_from_slice(&archive),
        size: entry.size(),
        compressed_size: entry.compressed_size(),
        compression_code: if method == CompressionMethod::Stored {
            0
        } else {
            8
        },
        crc32: entry.crc32(),
        source_offset: entry.header_start(),
        source_span_end_exclusive: entry.data_start().unwrap() + entry.compressed_size(),
        input_md5: hex(&Md5::digest(&input)),
        output_md5: hex(&Md5::digest(&output)),
        output_size: output.len() as u64,
        marker: markers.then(|| {
            (
                String::from_utf8(MARKER.to_vec()).unwrap(),
                String::from_utf8(REPLACEMENT.to_vec()).unwrap(),
            )
        }),
    };
    Fixture {
        spec,
        input,
        output,
        sha256: hex(&Sha256::digest(&archive)),
        method: if method == CompressionMethod::Stored {
            "stored"
        } else {
            "deflate"
        },
        entropy: if repetitive {
            "repetitive-json"
        } else {
            "high-entropy"
        },
    }
}

fn check_case(
    runtime: &Runtime,
    client: &aws_sdk_s3::Client,
    fixture: &Fixture,
    cataloged: bool,
    operation: TransferOperation,
) {
    let bench = TransferBench::new(client, &fixture.spec, cataloged, operation).unwrap();
    let outcome = runtime.block_on(bench.run(Some(&fixture.output))).unwrap();
    let decode = matches!(operation, TransferOperation::DecodeValidate);
    let unchanged = matches!(operation, TransferOperation::Unchanged);
    assert_eq!(outcome.skipped, unchanged);
    if !decode && !unchanged {
        assert_eq!(outcome.emitted_bytes, fixture.output.len() as u64);
        let compare = fixture.spec.marker.is_some()
            || (!cataloged && matches!(operation, TransferOperation::Changed));
        let spooled = compare && fixture.spec.output_size <= TransferBench::spool_limit_bytes();
        assert_eq!(outcome.spooled, spooled);
        assert_eq!(
            outcome.decoded_bytes,
            fixture.spec.size * (u64::from(compare) + u64::from(!spooled))
        );
    }
    if decode {
        assert_eq!(outcome.decoded_bytes, fixture.input.len() as u64);
    } else if unchanged {
        assert_eq!(
            outcome.decoded_bytes,
            if cataloged && fixture.spec.marker.is_none() {
                0
            } else {
                fixture.spec.size
            }
        );
    }
}

fn check_corruption(runtime: &Runtime, client: &aws_sdk_s3::Client, fixture: &Fixture) {
    for operation in [
        TransferOperation::DecodeValidate,
        TransferOperation::ColdCreate,
        TransferOperation::Changed,
    ] {
        for corruption in ["crc", "size", "trusted-md5", "truncated"] {
            let mut damaged = fixture.spec.clone();
            match corruption {
                "crc" => damaged.crc32 ^= 1,
                "size" => damaged.size -= 1,
                "trusted-md5" => damaged.input_md5 = "1".repeat(32),
                "truncated" => {
                    damaged.compressed_size -= 1;
                    damaged.source_span_end_exclusive -= 1;
                }
                _ => unreachable!(),
            }
            let bench = TransferBench::new(client, &damaged, true, operation).unwrap();
            assert!(
                runtime.block_on(bench.run(None)).is_err(),
                "{operation:?} accepted {corruption}"
            );
        }
    }
}

fn main() {
    let mut check_only = false;
    let mut fixture_dir = None;
    let mut args = std::env::args().skip(1);
    while let Some(arg) = args.next() {
        match arg.as_str() {
            "--check-fixtures" => check_only = true,
            "--fixtures-dir" => {
                fixture_dir = Some(PathBuf::from(args.next().expect("fixture directory")))
            }
            _ => panic!("unknown argument {arg}"),
        }
    }
    if let Some(dir) = &fixture_dir {
        std::fs::create_dir_all(dir).unwrap();
    }
    let provenance = if check_only {
        ""
    } else {
        match option_env!("SHIN_TRANSFER_BENCH_PROVENANCE") {
            Some(value) => value,
            None => panic!(
                "run pnpm rust:bench:transfer to build with provenance, or pass --check-fixtures"
            ),
        }
    };
    let build_id = hex(&Sha256::digest(provenance.as_bytes()));
    let runtime = tokio::runtime::Builder::new_current_thread()
        .enable_all()
        .build()
        .unwrap();
    let client = {
        let _guard = runtime.enter();
        aws_sdk_s3::Client::from_conf(
            aws_sdk_s3::Config::builder()
                .behavior_version_latest()
                .region(Region::new("us-east-1"))
                .credentials_provider(Credentials::new(
                    "fixture", "fixture", None, None, "fixture",
                ))
                .endpoint_url("http://127.0.0.1:1")
                .build(),
        )
    };
    let mut cases = 0;
    for method in [CompressionMethod::Stored, CompressionMethod::Deflated] {
        for repetitive in [false, true] {
            for size in [16 * 1024, 2 * 1024 * 1024] {
                for markers in [false, true] {
                    let fixture =
                        fixture(size, repetitive, markers, method, fixture_dir.as_deref());
                    if check_only && size == 16 * 1024 && !repetitive {
                        check_corruption(&runtime, &client, &fixture);
                    }
                    for cataloged in [false, true] {
                        for operation in [
                            TransferOperation::DecodeValidate,
                            TransferOperation::ColdCreate,
                            TransferOperation::Unchanged,
                            TransferOperation::Changed,
                        ] {
                            if markers && matches!(operation, TransferOperation::DecodeValidate) {
                                continue;
                            }
                            // Exact bytes and branch outcomes double as the untimed warmup.
                            check_case(&runtime, &client, &fixture, cataloged, operation);
                            cases += 1;
                            if check_only {
                                continue;
                            }
                            for sample in 1..=SAMPLES {
                                let bench = TransferBench::new(
                                    &client,
                                    &fixture.spec,
                                    cataloged,
                                    operation,
                                )
                                .unwrap();
                                let started = Instant::now();
                                let outcome = runtime.block_on(bench.run(None)).unwrap();
                                let elapsed_nanos = started.elapsed().as_nanos() as u64;
                                // Allocation instrumentation affects wall time: use a separate
                                // pass on this same thread and drain all spawned producer tasks.
                                let allocation_bench = TransferBench::new(
                                    &client,
                                    &fixture.spec,
                                    cataloged,
                                    operation,
                                )
                                .unwrap();
                                let allocations = allocation_counter::measure(|| {
                                    black_box(
                                        runtime.block_on(allocation_bench.run(None)).unwrap(),
                                    );
                                });
                                assert_eq!(
                                    allocations.bytes_current, 0,
                                    "sample retained an allocation"
                                );
                                println!(
                                    "{}",
                                    json!({
                                        "kind": "transfer-preparation-sample",
                                        "schemaVersion": 1,
                                    "buildId": build_id,
                                        "fixtureSha256": fixture.sha256,
                                        "compression": fixture.method,
                                        "entropy": fixture.entropy,
                                        "inputBytes": fixture.spec.size,
                                        "compressedBytes": fixture.spec.compressed_size,
                                        "outputBytes": fixture.spec.output_size,
                                        "cataloged": cataloged,
                                        "markers": markers,
                                        "markerIntervalBytes": if markers { Some(4096) } else { None },
                                        "operation": operation,
                                        "sample": sample,
                                        "elapsedNanos": elapsed_nanos,
                                        "decodedMiBPerSecond": if outcome.decoded_bytes == 0 { None } else { Some(outcome.decoded_bytes as f64 / 1048576.0 / (elapsed_nanos as f64 / 1e9)) },
                                        "allocatedBytes": allocations.bytes_total,
                                        "peakLiveAllocatedBytes": allocations.bytes_max,
                                        "allocationCount": allocations.count_total,
                                        "outcome": outcome,
                                    })
                                );
                            }
                        }
                    }
                }
            }
        }
    }
    if check_only {
        println!(
            "Validated {cases} transfer cases and CRC, size, trusted MD5, truncation failures (no timing thresholds)."
        );
    }
}
