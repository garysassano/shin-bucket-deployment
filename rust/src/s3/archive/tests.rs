use std::collections::HashMap;
use std::future::pending;
use std::io::{self, Write};
use std::pin::Pin;
use std::sync::Arc;
use std::sync::atomic::{AtomicBool, AtomicUsize, Ordering};
use std::task::{Context, Poll};
use std::time::Duration;

use aws_sdk_s3::primitives::SdkBody;
use aws_smithy_http_client::test_util::{ReplayEvent, StaticReplayClient};
use base64::Engine as _;
use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use bytes::Bytes;
use futures_util::task::AtomicWaker;
use http::{Request, Response};
use http_body::{Body as _, Frame, SizeHint};
use proptest::prelude::*;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::sync::Semaphore;
use tokio::time::Instant;
use zip::write::{SimpleFileOptions, ZipWriter};

use super::block_store::{
    SourceBlockOptions, SourceBlockRange, SourceBlockSlot, SourceBlockState, SourceBlockStatus,
    SourceBlockStore, SourceFetchMode, block_indices_for_span, initial_claim_counts,
    plan_source_blocks,
};
use super::budget::{SourceBudgetWaitGuard, SourceByteBudget};
use super::diagnostics::SourceDiagnostics;
use super::directory::prepare_zip_directory_reader;
use super::entry::{
    BodyFrame, LOCAL_FILE_HEADER_LEN, MarkerBodyContext, UploadBodyState,
    forward_replaced_body_chunks, marker_zip_entry_body, open_entry_data_reader,
    plan_marker_zip_entry, plan_marker_zip_entry_spooled, send_marker_zip_entry_chunks,
    send_zip_entry_chunks, zip_entry_body, zip_entry_reader,
};
use super::{
    SourceClient, head_source, range_get_request_error, source_get_retry_cap_millis,
    source_get_retry_delay,
};
use crate::deployment::{MarkerConfig, TrustedEntryIntegrity};
use crate::diagnostics::DeploymentStats;
use crate::replace::MarkerReplacements;
use crate::s3::planner::ZipEntryPlan;
use crate::s3::{DEFAULT_SOURCE_BLOCK_BYTES, DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES};
use crate::state::AppState;
use crate::util::finalize_digest;
use md5::{Digest as Md5Digest, Md5};

const INFO_ZIP_FIXTURE: &str =
    include_str!("../../../test-fixtures/external-zips/info-zip.zip.b64");
const PYTHON_FORCE_ZIP64_FIXTURE: &str =
    include_str!("../../../test-fixtures/external-zips/python-force-zip64.zip.b64");

struct DropSignal(Arc<AtomicBool>);

struct PendingResponseBody {
    started: Arc<AtomicBool>,
    dropped: Arc<AtomicBool>,
    content_length: u64,
}

struct GatedResponseBody {
    started: Arc<AtomicBool>,
    released: Arc<AtomicBool>,
    waker: Arc<AtomicWaker>,
    bytes: Option<bytes::Bytes>,
}

impl http_body::Body for PendingResponseBody {
    type Data = bytes::Bytes;
    type Error = std::io::Error;

    fn poll_frame(
        self: Pin<&mut Self>,
        _cx: &mut Context<'_>,
    ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
        self.started.store(true, Ordering::Release);
        Poll::Pending
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.content_length)
    }
}

impl Drop for PendingResponseBody {
    fn drop(&mut self) {
        self.dropped.store(true, Ordering::Release);
    }
}

impl http_body::Body for GatedResponseBody {
    type Data = bytes::Bytes;
    type Error = std::io::Error;

    fn poll_frame(
        mut self: Pin<&mut Self>,
        cx: &mut Context<'_>,
    ) -> Poll<Option<std::result::Result<Frame<Self::Data>, Self::Error>>> {
        self.started.store(true, Ordering::Release);
        if !self.released.load(Ordering::Acquire) {
            self.waker.register(cx.waker());
            if !self.released.load(Ordering::Acquire) {
                return Poll::Pending;
            }
        }
        Poll::Ready(self.bytes.take().map(|bytes| Ok(Frame::data(bytes))))
    }

    fn size_hint(&self) -> SizeHint {
        SizeHint::with_exact(self.bytes.as_ref().map_or(0, |bytes| bytes.len() as u64))
    }
}

#[tokio::test]
async fn external_zip_local_extra_fields_stream_with_directory_bounds() {
    for (encoded, expected, expected_local_extra, expected_central_extra) in [
        (
            INFO_ZIP_FIXTURE,
            b"info-zip external archive\n" as &[u8],
            28_u16,
            24_u16,
        ),
        (
            PYTHON_FORCE_ZIP64_FIXTURE,
            b"python force_zip64 external archive\n" as &[u8],
            20_u16,
            0_u16,
        ),
    ] {
        let bytes = BASE64_STANDARD.decode(encoded.trim()).unwrap();
        let central_directory_start = bytes
            .windows(4)
            .position(|window| window == b"PK\x01\x02")
            .expect("central directory signature") as u64;
        let reader = async_zip::base::read::seek::ZipFileReader::with_tokio(std::io::Cursor::new(
            bytes.clone(),
        ))
        .await
        .expect("fixture central directory");
        let stored = &reader.file().entries()[0];
        let source_offset = stored.header_offset();
        let local_extra_offset = usize::try_from(source_offset).unwrap() + 28;
        let central_extra_offset = usize::try_from(central_directory_start).unwrap() + 30;
        assert_eq!(
            u16::from_le_bytes([bytes[local_extra_offset], bytes[local_extra_offset + 1]]),
            expected_local_extra
        );
        assert_eq!(
            u16::from_le_bytes([bytes[central_extra_offset], bytes[central_extra_offset + 1]]),
            expected_central_extra
        );

        let plan = ZipEntryPlan {
            compressed_size: stored.compressed_size(),
            compression_code: u16::from(stored.compression()),
            crc32: stored.crc32(),
            ..ZipEntryPlan::for_test(
                "index.html",
                stored.uncompressed_size(),
                source_offset,
                central_directory_start,
            )
        };
        let store = ready_store_for_plan(&bytes, &plan);
        let mut entry = zip_entry_reader(store, plan, None).expect("fixture entry reader");
        let mut output = Vec::new();
        entry.read_to_end(&mut output).await.unwrap();

        assert_eq!(output, expected);
    }
}

#[tokio::test]
async fn directory_preflight_reuses_its_single_source_request_and_accounts_memory() {
    for encoded in [INFO_ZIP_FIXTURE, PYTHON_FORCE_ZIP64_FIXTURE] {
        let bytes = BASE64_STANDARD.decode(encoded.trim()).unwrap();
        let replay = StaticReplayClient::new(vec![get_success_bytes(bytes.clone())]);
        let source = replay_source_client(replay.clone(), bytes.len() as u64);
        let stats = Arc::new(DeploymentStats::default());
        let budget = SourceByteBudget::new(64 * 1024 * 1024, Arc::clone(&stats), false)
            .expect("valid test source budget");

        let prepared = prepare_zip_directory_reader(source, 8 * 1024 * 1024, budget, 0)
            .await
            .expect("directory preflight");
        let planning_permit = prepared._planning_permit;
        let reader = async_zip::base::read::seek::ZipFileReader::with_tokio(prepared.reader)
            .await
            .expect("preloaded parser");

        assert_eq!(reader.file().entries().len(), 1);
        assert_eq!(replay.actual_requests().count(), 1);
        let (_, current, high_water) = stats.source_global_memory_for_test();
        assert!(current > bytes.len() as u64);
        assert_eq!(current, high_water);

        drop(reader);
        drop(planning_permit);
        assert_eq!(stats.source_global_memory_for_test().1, 0);
    }
}

#[tokio::test]
async fn completed_entry_reader_drops_its_source_block_slice_before_releasing_capacity() {
    let zip = zip_from_entry("buffer.txt", b"source buffer lifetime");
    let plan = zip_plan_from_archive(&zip, "buffer.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let mut reader = open_entry_data_reader(store, plan, None)
        .await
        .expect("entry data reader");
    let mut compressed = Vec::new();

    reader.read_to_end(&mut compressed).await.unwrap();

    assert!(!compressed.is_empty());
    assert_eq!(reader.buffered_source_bytes_for_test(), 0);
}

impl Drop for DropSignal {
    fn drop(&mut self) {
        self.0.store(true, Ordering::Release);
    }
}

#[test]
fn zero_source_budget_is_rejected_without_panicking() {
    let result = SourceByteBudget::new(0, Arc::new(DeploymentStats::default()), false);

    assert!(result.is_err());
}

#[test]
fn disabled_budget_waiter_diagnostics_are_a_noop() {
    let budget = SourceByteBudget::new(64, Arc::new(DeploymentStats::default()), false)
        .expect("valid source budget");

    drop(SourceBudgetWaitGuard::new(Arc::clone(&budget)));

    assert!(budget.capacity_waiters.is_none());
}

#[test]
fn source_blocks_are_sorted_coalesced_and_split() {
    let plans = vec![
        plan_with_span("b.txt", 9 * 1024 * 1024, 18 * 1024 * 1024),
        plan_with_span("a.txt", 0, 1024),
        plan_with_span("near.txt", 128 * 1024, 256 * 1024),
    ];

    let blocks = plan_source_blocks(
        32 * 1024 * 1024,
        &plans,
        DEFAULT_SOURCE_BLOCK_BYTES,
        DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES,
    )
    .expect("planning succeeds");

    assert_eq!(blocks[0].start, 0);
    assert_eq!(blocks[0].end_exclusive, 256 * 1024);
    assert_eq!(blocks[1].start, 9 * 1024 * 1024);
    assert_eq!(blocks[1].end_exclusive, 17 * 1024 * 1024);
    assert_eq!(blocks[2].start, 17 * 1024 * 1024);
    assert_eq!(blocks[2].end_exclusive, 18 * 1024 * 1024);
}

proptest! {
    #[test]
    fn indexed_block_spans_match_the_linear_reference(
        shapes in prop::collection::vec((0_u16..128, 1_u16..256), 0..64),
        query_start in 0_u64..20_000,
        query_len in 0_u64..5_000,
    ) {
        let mut cursor = 0_u64;
        let blocks = shapes
            .into_iter()
            .map(|(gap, len)| {
                cursor = cursor.saturating_add(u64::from(gap));
                    let block = SourceBlockRange {
                        start: cursor,
                        end_exclusive: cursor.saturating_add(u64::from(len)),
                    };
                    cursor = block.end_exclusive;
                block
            })
            .collect::<Vec<_>>();
        let query_end = query_start.saturating_add(query_len);
        let expected = if query_start >= query_end {
            Vec::new()
        } else {
            blocks
                .iter()
                .enumerate()
                .filter_map(|(index, block)| {
                        (block.start < query_end && query_start < block.end_exclusive)
                        .then_some(index)
                })
                .collect::<Vec<_>>()
        };

        prop_assert_eq!(
            block_indices_for_span(&blocks, query_start, query_end),
            expected
        );
    }
}

#[tokio::test]
async fn invocation_budget_bounds_multiple_sources_and_cancel_releases_permits() {
    let stats = Arc::new(crate::diagnostics::DeploymentStats::default());
    let budget =
        SourceByteBudget::new(64, Arc::clone(&stats), true).expect("valid test source budget");
    let first = pending_store_for_span(48, Arc::clone(&budget));
    let second = pending_store_for_span(48, budget);

    let first_reservation = first
        .reserve_fetch(0, SourceFetchMode::Prefetch)
        .await
        .unwrap()
        .expect("first source reservation");
    assert_eq!(stats.source_global_memory_for_test(), (64, 48, 48));
    assert_eq!(first.attempt_snapshot().global_permit_waiters, 0);

    let waiting_store = Arc::clone(&second);
    let waiting = tokio::spawn(async move {
        waiting_store
            .reserve_fetch(0, SourceFetchMode::Prefetch)
            .await
    });
    wait_for_test_condition(|| second.attempt_snapshot().global_permit_waiters == 1).await;
    assert!(!waiting.is_finished());
    assert_eq!(second.attempt_snapshot().global_permit_waiters, 1);

    first.cancel("injected first-source cancellation");
    let second_reservation = tokio::time::timeout(Duration::from_secs(1), waiting)
        .await
        .expect("second source reservation should be unblocked")
        .expect("second source reservation task")
        .expect("second source reservation")
        .expect("second source block");
    assert_eq!(stats.source_global_memory_for_test(), (64, 48, 48));
    assert_eq!(second.attempt_snapshot().global_permit_waiters, 0);

    second.cancel("test complete");
    assert_eq!(stats.source_global_memory_for_test(), (64, 0, 48));
    drop((first_reservation, second_reservation));
}

#[tokio::test(start_paused = true)]
async fn replay_demand_borrows_global_capacity_when_the_local_window_is_full() {
    const BLOCK_BYTES: usize = 4 * 1024;
    let stats = Arc::new(crate::diagnostics::DeploymentStats::default());
    let budget = SourceByteBudget::new(BLOCK_BYTES * 2, Arc::clone(&stats), false)
        .expect("valid test source budget");
    let plans = [
        plan_with_span("early.txt", 0, BLOCK_BYTES as u64),
        plan_with_span("later.txt", BLOCK_BYTES as u64, (BLOCK_BYTES * 2) as u64),
    ];
    let source = Arc::new(SourceClient {
        client: dummy_s3_client(),
        bucket: "bucket".to_string(),
        key: "archive.zip".to_string(),
        len: (BLOCK_BYTES * 2) as u64,
        etag: "\"test-source-etag\"".to_string(),
        diagnostics: Arc::new(SourceDiagnostics::new((BLOCK_BYTES * 2) as u64)),
    });
    let store = SourceBlockStore::new(
        source,
        &plans,
        SourceBlockOptions {
            block_bytes: BLOCK_BYTES,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: BLOCK_BYTES,
        },
        budget,
    )
    .expect("store constructs");

    let later = store
        .reserve_fetch(1, SourceFetchMode::Prefetch)
        .await
        .expect("later prefetch reservation")
        .expect("later block");
    let later_block = later.block;
    std::mem::forget(later);
    store.finish_fetch(
        1,
        later_block,
        Ok(bytes::Bytes::from(vec![0_u8; BLOCK_BYTES])),
    );
    assert!(
        tokio::time::timeout(
            Duration::from_millis(1),
            store.reserve_fetch(0, SourceFetchMode::Demand),
        )
        .await
        .is_err(),
        "an ordinary demand read must still honor the local window"
    );
    {
        let mut state = store.state.lock().expect("source block state");
        state.slots[0].remaining_claims = 0;
        state.slots[0].status = SourceBlockStatus::Released;
    }
    store.add_replay_claims(0, BLOCK_BYTES as u64);

    let replay = tokio::time::timeout(
        Duration::from_secs(1),
        store.reserve_fetch(0, SourceFetchMode::Demand),
    )
    .await
    .expect("replay demand must not wait behind the local prefetch window")
    .expect("replay reservation")
    .expect("replay block");

    assert_eq!(replay.block.start, 0);
    assert_eq!(
        store
            .state
            .lock()
            .expect("source block state")
            .window_committed_bytes,
        (BLOCK_BYTES * 2) as u64
    );
    assert_eq!(
        stats.source_global_memory_for_test(),
        (
            (BLOCK_BYTES * 2) as u64,
            (BLOCK_BYTES * 2) as u64,
            (BLOCK_BYTES * 2) as u64
        )
    );

    store.cancel("test complete");
    assert_eq!(stats.source_global_memory_for_test().1, 0);
}

#[tokio::test]
async fn zip_entry_reader_decompresses_and_validates_crc() {
    let zip = zip_from_entry("index.txt", b"hello zipped world");
    let plan = zip_plan_from_archive(&zip, "index.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let mut reader = zip_entry_reader(store, plan, None).unwrap();
    let mut output = Vec::new();

    reader.read_to_end(&mut output).await.unwrap();

    assert_eq!(output, b"hello zipped world");
}

/// Entry names are attacker-influenceable UTF-8 from the archive's central
/// directory, and the planner carries them through to destination keys. The
/// suite only ever used ASCII names, so a mishandled multi-byte or astral name
/// -- a byte-vs-char offset slip, or a lossy decode -- would not have failed
/// anything.
#[tokio::test]
async fn zip_entry_reader_round_trips_non_ascii_entry_names() {
    for name in [
        "café/menú.txt",
        "\u{65e5}\u{672c}\u{8a9e}/\u{30d5}\u{30a1}\u{30a4}\u{30eb}.txt",
        "emoji/\u{1F600}.txt",
        "\u{0440}\u{0443}\u{0441}/\u{0444}\u{0430}\u{0439}\u{043b}.txt",
    ] {
        let body = format!("contents of {name}").into_bytes();
        let zip = zip_from_entry(name, &body);
        let plan = zip_plan_from_archive(&zip, name);
        assert_eq!(
            plan.relative_key, name,
            "planner must preserve the exact name"
        );

        let store = ready_store_for_plan(&zip, &plan);
        let mut reader = zip_entry_reader(store, plan, None).unwrap();
        let mut output = Vec::new();
        reader.read_to_end(&mut output).await.unwrap();

        assert_eq!(output, body, "round trip failed for {name:?}");
    }
}

/// A ZIP with a valid end-of-central-directory record and no entries at all.
/// Planning must treat it as an empty archive rather than failing or producing
/// a block for a zero-length span.
#[tokio::test]
async fn zero_entry_archive_plans_no_entries_and_no_blocks() {
    let cursor = std::io::Cursor::new(Vec::new());
    let zip = ZipWriter::new(cursor).finish().unwrap().into_inner();

    let reader =
        async_zip::base::read::seek::ZipFileReader::with_tokio(std::io::Cursor::new(zip.clone()))
            .await
            .expect("an empty archive still has a readable central directory");
    assert!(
        reader.file().entries().is_empty(),
        "fixture should contain no entries"
    );

    let blocks = plan_source_blocks(
        zip.len() as u64,
        &[],
        DEFAULT_SOURCE_BLOCK_BYTES,
        DEFAULT_SOURCE_BLOCK_MERGE_GAP_BYTES,
    )
    .expect("planning an entry-less archive succeeds");
    assert!(
        blocks.is_empty(),
        "no entries means no source blocks to fetch, got {blocks:?}"
    );
}

#[tokio::test]
async fn zip_entry_reader_rejects_crc_mismatch() {
    let zip = zip_from_entry("bad.txt", b"hello zipped world");
    let mut plan = zip_plan_from_archive(&zip, "bad.txt");
    plan.crc32 ^= 1;
    let store = ready_store_for_plan(&zip, &plan);
    let (sender, _receiver) = tokio::sync::mpsc::channel(1);

    let error = send_zip_entry_chunks(
        store,
        plan,
        sender,
        Arc::new(UploadBodyState::default()),
        None,
    )
    .await
    .unwrap_err();

    assert!(error.to_string().contains("CRC32"));
}

#[tokio::test]
async fn direct_stream_withholds_completion_when_authenticated_md5_mismatches() {
    let zip = zip_from_entry("tampered.txt", b"tampered source bytes");
    let mut plan = zip_plan_from_archive(&zip, "tampered.txt");
    plan.trusted_integrity = Some(TrustedEntryIntegrity {
        size: plan.size,
        md5: "00000000000000000000000000000000".to_string(),
    });
    let store = ready_store_for_plan(&zip, &plan);
    let (sender, mut receiver) = tokio::sync::mpsc::channel(1);

    let error = send_zip_entry_chunks(
        store,
        plan,
        sender,
        Arc::new(UploadBodyState::default()),
        None,
    )
    .await
    .expect_err("trusted MD5 mismatch must fail the body");

    assert!(error.to_string().contains("authenticated catalog entry"));
    assert!(
        !error
            .to_string()
            .contains("00000000000000000000000000000000")
    );
    assert!(receiver.try_recv().is_err());
}

#[tokio::test]
async fn streaming_an_entry_always_records_its_md5() {
    // SSE-S3 is the only supported destination encryption, so the MD5 that proves an
    // object's content is computed unconditionally rather than selected by strategy.
    let zip = zip_from_entry("index.txt", b"hello zipped world");
    let plan = zip_plan_from_archive(&zip, "index.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let (sender, _receiver) = tokio::sync::mpsc::channel(2);
    let state = Arc::new(UploadBodyState::default());

    send_zip_entry_chunks(store, plan, sender, Arc::clone(&state), None)
        .await
        .expect("SSE-S3 stream");

    assert!(state.etag_md5().is_some());
}

#[tokio::test]
async fn direct_stream_frames_preserve_body_boundaries() {
    let frame_bytes = crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES;
    for (size, expected_frames) in [
        (frame_bytes - 1, vec![(false, frame_bytes - 1)]),
        (frame_bytes, vec![(false, frame_bytes)]),
        (
            frame_bytes * 2 + 17,
            vec![(true, frame_bytes), (true, frame_bytes), (false, 17)],
        ),
    ] {
        let contents = vec![b'x'; size];
        let zip = zip_from_entry("boundaries.bin", &contents);
        let plan = zip_plan_from_archive(&zip, "boundaries.bin");
        let store = ready_store_for_plan(&zip, &plan);
        let (sender, mut receiver) = tokio::sync::mpsc::channel(expected_frames.len());

        send_zip_entry_chunks(
            store,
            plan,
            sender,
            Arc::new(UploadBodyState::default()),
            None,
        )
        .await
        .expect("direct stream");

        let mut actual_frames = Vec::new();
        while let Ok(frame) = receiver.try_recv() {
            let frame = frame.expect("valid body frame");
            let classification = match frame {
                BodyFrame::Data(bytes) => (true, bytes.len()),
                BodyFrame::Final(bytes) => (false, bytes.len()),
                BodyFrame::Complete => (false, 0),
            };
            assert!(classification.1 <= frame_bytes);
            actual_frames.push(classification);
        }
        assert_eq!(actual_frames, expected_frames, "entry size {size}");
    }
}

/// Non-periodic body content for the marker forwarding tests.
///
/// A constant fill makes byte equality nearly vacuous: it detects a length
/// change and nothing else, so reversing or duplicating frames compares equal.
/// A modular counter is better but still periodic, so any displacement by a
/// multiple of its stride is also invisible. xorshift64 has period 2^64-1, so
/// no displacement within a test body can alias. The high byte is taken
/// deliberately: the low bits of this generator family have short periods, the
/// exact defect that left the `large-archive` fixture compressing 256:1 while
/// appearing to test a large transfer.
fn marker_forward_body(size: usize) -> Vec<u8> {
    let mut state = 0x2545_f491_4f6c_dd1d_u64;
    (0..size)
        .map(|_| {
            state ^= state << 13;
            state ^= state >> 7;
            state ^= state << 17;
            (state >> 56) as u8
        })
        .collect()
}

async fn forward_marker_body(contents: &[u8]) -> (Vec<Bytes>, Option<Bytes>) {
    let frame_bytes = crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES;
    let (mut output_reader, mut output_writer) =
        tokio::io::duplex(contents.len() + frame_bytes + 1);
    let (sender, mut receiver) = tokio::sync::mpsc::channel(16);

    output_writer.write_all(contents).await.expect("pipe write");
    drop(output_writer);

    let held = forward_replaced_body_chunks(&mut output_reader, &sender)
        .await
        .expect("marker forward must not fail");
    drop(sender);

    let mut sent = Vec::new();
    while let Ok(frame) = receiver.try_recv() {
        match frame.expect("valid body frame") {
            BodyFrame::Data(bytes) => sent.push(bytes),
            _ => panic!("forward path must send only Data frames"),
        }
    }
    (sent, held)
}

#[tokio::test]
async fn marker_forward_frames_preserve_body_boundaries() {
    let frame_bytes = crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES;
    // Every boundary the frame arithmetic can get wrong: empty, sub-frame,
    // one byte short of a frame, an exact single frame, one byte past it, an
    // exact multiple, and a multi-frame body with a partial tail.
    for size in [
        0,
        1,
        frame_bytes - 1,
        frame_bytes,
        frame_bytes + 1,
        frame_bytes * 2,
        frame_bytes * 3 + 17,
    ] {
        let contents = marker_forward_body(size);
        let (sent, held) = forward_marker_body(&contents).await;

        // Every chunk but the last is sent; the last is always withheld so
        // validation can still fail before S3 sees a complete body.
        let expected_sent = size.div_ceil(frame_bytes).saturating_sub(1);
        assert_eq!(
            sent.len(),
            expected_sent,
            "sent frame count for size {size}"
        );
        for bytes in &sent {
            assert_eq!(bytes.len(), frame_bytes, "sent frames are whole chunks");
        }

        let mut actual = Vec::with_capacity(size);
        for bytes in &sent {
            actual.extend_from_slice(bytes);
        }
        match held {
            Some(bytes) => {
                assert_eq!(
                    bytes.len(),
                    size - expected_sent * frame_bytes,
                    "held frame length for size {size}"
                );
                actual.extend_from_slice(&bytes);
            }
            None => assert_eq!(size, 0, "only an empty body withholds nothing"),
        }

        assert_eq!(
            actual, contents,
            "frames plus the held frame must equal the input byte for byte at size {size}"
        );
    }
}

#[tokio::test]
async fn marker_forward_reports_broken_pipe_from_the_trailing_partial_frame() {
    // A body of frame + tail reaches the trailing-partial send site without
    // ever completing a second frame, so this is the only input that exercises
    // that branch's cancellation in isolation: the first frame is withheld
    // rather than sent, and the send happens only when the tail is handed off.
    let frame_bytes = crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES;
    let contents = marker_forward_body(frame_bytes + 17);
    let (mut output_reader, mut output_writer) =
        tokio::io::duplex(contents.len() + frame_bytes + 1);
    let (sender, receiver) = tokio::sync::mpsc::channel(1);

    output_writer
        .write_all(&contents)
        .await
        .expect("pipe write");
    drop(output_writer);
    drop(receiver);

    let error = forward_replaced_body_chunks(&mut output_reader, &sender)
        .await
        .expect_err("a dropped receiver must fail the forwarding side");

    let io_error = error
        .downcast_ref::<io::Error>()
        .expect("marker forwarding must fail with an io::Error");
    assert_eq!(io_error.kind(), io::ErrorKind::BrokenPipe);
    assert_eq!(io_error.to_string(), "marker body receiver closed");
}

#[tokio::test]
async fn marker_planning_streams_exact_length_and_rejects_crc_failure() {
    let zip = zip_from_entry("marker.txt", b"before TOKEN after");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    let replacements = MarkerReplacements::new(
        &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
        &MarkerConfig::default(),
    )
    .expect("marker automaton");
    let store = ready_store_for_plan(&zip, &plan);

    let result = plan_marker_zip_entry(store, plan.clone(), &replacements, None)
        .await
        .expect("marker planning pass");

    assert_eq!(
        result.output_bytes,
        b"before expanded-value after".len() as u64
    );
    assert!(!result.md5.is_empty());

    let mut invalid = plan;
    invalid.crc32 ^= 1;
    let invalid_store = ready_store_for_plan(&zip, &invalid);
    let error = plan_marker_zip_entry(invalid_store, invalid, &replacements, None)
        .await
        .expect_err("marker planning must preserve CRC validation");
    assert!(error.to_string().contains("CRC32"));
}

#[tokio::test]
async fn marker_spooled_planning_retains_bytes_within_the_cap() {
    let zip = zip_from_entry("marker.txt", b"before TOKEN after");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    let replacements = MarkerReplacements::new(
        &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
        &MarkerConfig::default(),
    )
    .expect("marker automaton");
    let store = ready_store_for_plan(&zip, &plan);
    let expected = b"before expanded-value after";

    // The cap sits exactly on the output length: the boundary is inclusive.
    let (result, spooled) =
        plan_marker_zip_entry_spooled(store, plan, &replacements, expected.len() as u64, None)
            .await
            .expect("spooled marker planning pass");

    assert_eq!(result.output_bytes, expected.len() as u64);
    assert_eq!(
        spooled.as_deref(),
        Some(&expected[..]),
        "the spool must be the exact replaced output, byte for byte"
    );
    let mut hasher = Md5::new();
    hasher.update(expected);
    assert_eq!(
        result.md5,
        finalize_digest(hasher),
        "the planned MD5 must be the hash of the spooled bytes"
    );
}

#[tokio::test]
async fn marker_spooled_planning_over_cap_drops_the_spool_but_still_hashes() {
    let zip = zip_from_entry("marker.txt", b"before TOKEN after");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    let replacements = MarkerReplacements::new(
        &HashMap::from([("TOKEN".to_string(), "expanded-value".to_string())]),
        &MarkerConfig::default(),
    )
    .expect("marker automaton");
    let store = ready_store_for_plan(&zip, &plan);
    let expected = b"before expanded-value after";

    let (result, spooled) =
        plan_marker_zip_entry_spooled(store, plan, &replacements, expected.len() as u64 - 1, None)
            .await
            .expect("marker planning must run to completion past the cap");

    assert!(spooled.is_none());
    assert_eq!(
        result.output_bytes,
        expected.len() as u64,
        "the exact output length must survive the dropped spool"
    );
    let mut hasher = Md5::new();
    hasher.update(expected);
    assert_eq!(
        result.md5,
        finalize_digest(hasher),
        "the MD5 must still cover the whole replaced output"
    );
}

#[tokio::test]
async fn marker_spooled_planning_enforces_the_cap_on_output_not_input() {
    // The input fits the cap; only the replacement expansion crosses it, so any
    // pre-decision from `plan.size` (the marker-free path's trick) would wrongly
    // spool this entry.
    let zip = zip_from_entry("marker.txt", b"TOKEN");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    assert_eq!(plan.size, 5);
    let cap = plan.size;
    let replacements = MarkerReplacements::new(
        &HashMap::from([("TOKEN".to_string(), "0123456789".to_string())]),
        &MarkerConfig::default(),
    )
    .expect("marker automaton");
    let store = ready_store_for_plan(&zip, &plan);

    let (result, spooled) = plan_marker_zip_entry_spooled(store, plan, &replacements, cap, None)
        .await
        .expect("marker planning pass");

    assert!(
        spooled.is_none(),
        "the cap must be enforced on the replaced output (10 bytes), not the input size \
         (5 bytes, which fits the cap)"
    );
    assert_eq!(result.output_bytes, 10);
}

#[tokio::test]
async fn marker_upload_stream_is_retryable_and_withholds_the_final_chunk_until_validation() {
    let zip = zip_from_entry("marker.txt", b"TOKEN and TOKEN");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    let replacements = Arc::new(
        MarkerReplacements::new(
            &HashMap::from([("TOKEN".to_string(), "replacement".to_string())]),
            &MarkerConfig::default(),
        )
        .expect("marker automaton"),
    );
    let output = b"replacement and replacement";
    let store = ready_store_for_plan_with_claims(&zip, &plan, 4);
    let body_state = Arc::new(UploadBodyState::default());
    let body_attempts = Arc::new(AtomicUsize::new(0));
    let body = marker_zip_entry_body(
        Arc::clone(&store),
        plan,
        output.len() as u64,
        Arc::clone(&body_state),
        body_attempts,
        MarkerBodyContext {
            replacements,
            stats: Arc::new(DeploymentStats::default()),
        },
        None,
    );
    let sdk_body = body.into_inner();
    let replay = sdk_body.try_clone().expect("retryable marker body");

    let first = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
        .collect()
        .await
        .expect("first marker body")
        .into_bytes();
    let second = aws_sdk_s3::primitives::ByteStream::new(replay)
        .collect()
        .await
        .expect("replayed marker body")
        .into_bytes();

    assert_eq!(first.as_ref(), output);
    assert_eq!(second.as_ref(), output);
    assert!(body_state.etag_md5().is_some());
    let diagnostics = store.source.diagnostics.snapshot();
    assert_eq!(diagnostics.body_attempts, 2);
    assert_eq!(diagnostics.body_replays, 1);
}

#[tokio::test]
async fn marker_upload_crc_failure_releases_no_final_body_frame() {
    let zip = zip_from_entry("marker.txt", b"TOKEN");
    let mut plan = zip_plan_from_archive(&zip, "marker.txt");
    plan.crc32 ^= 1;
    let store = ready_store_for_plan(&zip, &plan);
    let replacements = Arc::new(
        MarkerReplacements::new(
            &HashMap::from([("TOKEN".to_string(), "replacement".to_string())]),
            &MarkerConfig::default(),
        )
        .expect("marker automaton"),
    );
    let (sender, mut receiver) = tokio::sync::mpsc::channel(2);

    let error = send_marker_zip_entry_chunks(
        store,
        plan,
        b"replacement".len() as u64,
        replacements,
        sender,
        Arc::new(UploadBodyState::default()),
        None,
    )
    .await
    .expect_err("CRC failure must fail the marker body");

    assert!(error.to_string().contains("CRC32"));
    assert!(receiver.try_recv().is_err());
}

#[tokio::test]
async fn marker_upload_stops_when_body_receiver_is_dropped() {
    let zip = zip_from_entry("marker.txt", b"TOKEN");
    let plan = zip_plan_from_archive(&zip, "marker.txt");
    let output = "x".repeat(crate::s3::ZIP_ENTRY_BODY_CHUNK_BYTES * 8);
    let store = ready_store_for_plan(&zip, &plan);
    let replacements = Arc::new(
        MarkerReplacements::new(
            &HashMap::from([("TOKEN".to_string(), output.clone())]),
            &MarkerConfig::default(),
        )
        .expect("marker automaton"),
    );
    let (sender, receiver) = tokio::sync::mpsc::channel(1);
    drop(receiver);

    let completed = tokio::time::timeout(
        Duration::from_secs(1),
        send_marker_zip_entry_chunks(
            store,
            plan,
            output.len() as u64,
            replacements,
            sender,
            Arc::new(UploadBodyState::default()),
            None,
        ),
    )
    .await;

    assert!(
        completed.is_ok(),
        "marker producer hung after its body receiver was dropped"
    );
}

#[tokio::test]
async fn unpolled_retryable_body_clones_create_no_source_work() {
    let zip = zip_from_entry("lazy.txt", b"lazy body");
    let plan = zip_plan_from_archive(&zip, "lazy.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let body_state = Arc::new(UploadBodyState::default());
    let body_attempts = Arc::new(AtomicUsize::new(0));
    let body = zip_entry_body(Arc::clone(&store), plan, 9, body_state, body_attempts, None);
    let sdk_body = body.into_inner();
    let unpolled_clone = sdk_body.try_clone().expect("retryable body clone");

    let before = store.source.diagnostics.snapshot();
    assert_eq!(before.body_attempts, 0);
    assert_eq!(before.body_replays, 0);
    assert_eq!(before.replay_claims, 0);
    assert_eq!(before.active_readers_high_water, 0);
    drop(unpolled_clone);

    let bytes = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
        .collect()
        .await
        .expect("polled body")
        .into_bytes();
    assert_eq!(bytes.as_ref(), b"lazy body");
    let after = store.source.diagnostics.snapshot();
    assert_eq!(after.body_attempts, 1);
    assert_eq!(after.body_replays, 0);
    assert_eq!(after.replay_claims, 0);
    assert_eq!(after.active_readers_high_water, 1);
}

#[tokio::test]
async fn unpolled_retryable_clone_does_not_overwrite_consumed_attempt_state() {
    let zip = zip_from_entry("snapshot.txt", b"snapshot body");
    let plan = zip_plan_from_archive(&zip, "snapshot.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let body_state = Arc::new(UploadBodyState::new(true));
    let body = zip_entry_body(
        Arc::clone(&store),
        plan,
        b"snapshot body".len() as u64,
        Arc::clone(&body_state),
        Arc::new(AtomicUsize::new(0)),
        None,
    );
    let sdk_body = body.into_inner();
    let unpolled_clone = sdk_body.try_clone().expect("retryable body clone");

    let bytes = aws_sdk_s3::primitives::ByteStream::new(sdk_body)
        .collect()
        .await
        .expect("consumed body")
        .into_bytes();
    assert_eq!(bytes.as_ref(), b"snapshot body");
    wait_for_test_condition(|| {
        body_state
            .attempt_snapshot()
            .is_some_and(|snapshot| snapshot.producer_completed)
    })
    .await;
    let before = body_state
        .attempt_snapshot()
        .expect("consumed attempt snapshot");

    drop(unpolled_clone);

    let after = body_state
        .attempt_snapshot()
        .expect("unpolled clone must not clear the snapshot");
    assert_eq!(after.attempt_number, before.attempt_number);
    assert_eq!(after.producer_stage, "complete");
    assert!(after.producer_completed);
    assert_eq!(after.bytes_emitted, b"snapshot body".len() as u64);
    assert_eq!(after.remaining_bytes, 0);
    assert!(after.final_frame_delivered);
    assert!(!after.receiver_dropped);
    assert!(!after.receiver_drop_aborted_producer);
    assert!(after.source_at_receiver_drop.is_none());
}

#[tokio::test]
async fn abandoned_polled_upload_body_releases_claims_without_retry() {
    let zip = zip_from_entry("abandoned.txt", b"abandoned body");
    let plan = zip_plan_from_archive(&zip, "abandoned.txt");
    let block_bytes = usize::try_from(plan.source_span_end_exclusive - plan.source_offset).unwrap();
    let stats = Arc::new(DeploymentStats::default());
    let budget = SourceByteBudget::new(block_bytes, Arc::clone(&stats), false)
        .expect("valid test source budget");
    let held_capacity = budget
        .reserve_planning(block_bytes as u64)
        .await
        .expect("hold the complete source budget");
    let store = SourceBlockStore::new(
        Arc::new(SourceClient {
            client: dummy_s3_client(),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len: zip.len() as u64,
            etag: "\"test-source-etag\"".to_string(),
            diagnostics: Arc::new(SourceDiagnostics::new(zip.len() as u64)),
        }),
        std::slice::from_ref(&plan),
        SourceBlockOptions {
            block_bytes,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: block_bytes,
        },
        budget,
    )
    .expect("store constructs");
    let body_state = Arc::new(UploadBodyState::default());
    let mut body = zip_entry_body(
        Arc::clone(&store),
        plan.clone(),
        plan.size,
        Arc::clone(&body_state),
        Arc::new(AtomicUsize::new(0)),
        None,
    )
    .into_inner();

    let mut context = Context::from_waker(std::task::Waker::noop());
    assert!(Pin::new(&mut body).poll_frame(&mut context).is_pending());
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if matches!(
                store.state.lock().expect("source block state").slots[0].status,
                SourceBlockStatus::Reserving
            ) {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("polled body producer should wait on global capacity");

    drop(body);

    assert!(
        body_state.attempt_snapshot().is_none(),
        "production-disabled diagnostics must not publish an attempt snapshot"
    );

    let released = tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            let released = {
                let state = store.state.lock().expect("source block state");
                let slot = &state.slots[0];
                matches!(slot.status, SourceBlockStatus::Pending)
                    && slot.remaining_claims == 0
                    && slot.live_claims == 0
                    && state.window_committed_bytes == 0
                    && state.resident_bytes == 0
            };
            if released {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await;
    if released.is_err() {
        let state = store.state.lock().expect("source block state");
        let slot = &state.slots[0];
        let status = match &slot.status {
            SourceBlockStatus::Pending => "Pending",
            SourceBlockStatus::Reserving => "Reserving",
            SourceBlockStatus::Fetching => "Fetching",
            SourceBlockStatus::Ready(_) => "Ready",
            SourceBlockStatus::Released => "Released",
            SourceBlockStatus::Failed(_) => "Failed",
        };
        panic!(
            "abandoned body retained producer state: status={status}, remaining_claims={}, live_claims={}, window_committed_bytes={}, resident_bytes={}",
            slot.remaining_claims,
            slot.live_claims,
            state.window_committed_bytes,
            state.resident_bytes
        );
    }

    assert_eq!(
        stats.source_global_memory_for_test().1,
        block_bytes as u64,
        "only the deliberately held planning capacity should remain"
    );
    drop(held_capacity);
    assert_eq!(stats.source_global_memory_for_test().1, 0);
}

#[tokio::test]
async fn abandoned_polled_upload_body_captures_detailed_state_before_abort() {
    let zip = zip_from_entry("abandoned-detailed.txt", b"abandoned detailed body");
    let plan = zip_plan_from_archive(&zip, "abandoned-detailed.txt");
    let block_bytes = usize::try_from(plan.source_span_end_exclusive - plan.source_offset).unwrap();
    let stats = Arc::new(DeploymentStats::new(true));
    let budget = SourceByteBudget::new(block_bytes, Arc::clone(&stats), true)
        .expect("valid test source budget");
    let held_capacity = budget
        .reserve_planning(block_bytes as u64)
        .await
        .expect("hold the complete source budget");
    let store = SourceBlockStore::new(
        Arc::new(SourceClient {
            client: dummy_s3_client(),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len: zip.len() as u64,
            etag: "\"test-source-etag\"".to_string(),
            diagnostics: Arc::new(SourceDiagnostics::new(zip.len() as u64)),
        }),
        std::slice::from_ref(&plan),
        SourceBlockOptions {
            block_bytes,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: block_bytes,
        },
        budget,
    )
    .expect("store constructs");
    let body_state = Arc::new(UploadBodyState::new(true));
    let mut body = zip_entry_body(
        Arc::clone(&store),
        plan.clone(),
        plan.size,
        Arc::clone(&body_state),
        Arc::new(AtomicUsize::new(0)),
        None,
    )
    .into_inner();

    let mut context = Context::from_waker(std::task::Waker::noop());
    assert!(Pin::new(&mut body).poll_frame(&mut context).is_pending());
    tokio::time::timeout(Duration::from_secs(1), async {
        loop {
            if matches!(
                store.state.lock().expect("source block state").slots[0].status,
                SourceBlockStatus::Reserving
            ) && store.attempt_snapshot().global_permit_waiters == 1
            {
                break;
            }
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("polled body producer should wait on global capacity");

    drop(body);

    let dropped = body_state
        .attempt_snapshot()
        .expect("dropped receiver should publish its detailed attempt");
    assert_eq!(dropped.attempt_number, 1);
    assert!(!dropped.replay);
    assert_eq!(dropped.bytes_emitted, 0);
    assert_eq!(dropped.remaining_bytes, plan.size);
    assert_eq!(dropped.producer_stage, "reading-source");
    assert!(!dropped.final_frame_delivered);
    assert!(!dropped.producer_completed);
    assert!(!dropped.body_error_observed);
    assert!(dropped.receiver_dropped);
    assert!(dropped.receiver_drop_aborted_producer);
    let source = dropped
        .source_at_receiver_drop
        .expect("source state must be captured before producer abort");
    assert_eq!(source.local_window_bytes, block_bytes as u64);
    assert_eq!(source.local_committed_bytes, block_bytes as u64);
    assert_eq!(source.local_resident_bytes, 0);
    assert_eq!(source.local_capacity_waiters, 0);
    assert_eq!(source.global_budget_bytes, block_bytes as u64);
    assert_eq!(source.global_resident_bytes, block_bytes as u64);
    assert_eq!(source.global_available_permits, 0);
    assert_eq!(source.global_permit_waiters, 1);
    assert_eq!(source.active_fetches, 0);

    wait_for_test_condition(|| {
        let state = store.state.lock().expect("source block state");
        let slot = &state.slots[0];
        matches!(slot.status, SourceBlockStatus::Pending)
            && slot.remaining_claims == 0
            && slot.live_claims == 0
            && state.window_committed_bytes == 0
            && state.resident_bytes == 0
    })
    .await;
    drop(held_capacity);
    assert_eq!(stats.source_global_memory_for_test().1, 0);
}

#[tokio::test]
async fn completed_upload_body_reports_end_before_terminal_poll() {
    let expected = b"complete body";
    let zip = zip_from_entry("complete.txt", expected);
    let plan = zip_plan_from_archive(&zip, "complete.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let mut body = zip_entry_body(
        Arc::clone(&store),
        plan,
        expected.len() as u64,
        Arc::new(UploadBodyState::default()),
        Arc::new(AtomicUsize::new(0)),
        None,
    )
    .into_inner();

    assert!(!body.is_end_stream());
    assert_eq!(body.size_hint().exact(), Some(expected.len() as u64));

    let mut received = Vec::new();
    while received.len() < expected.len() {
        let frame = std::future::poll_fn(|cx| Pin::new(&mut body).poll_frame(cx))
            .await
            .expect("body frame before declared length")
            .expect("valid body frame");
        received.extend_from_slice(frame.data_ref().expect("data frame"));
    }

    assert_eq!(received, expected);
    assert!(body.is_end_stream());
    assert_eq!(body.size_hint().exact(), Some(0));

    let state = store.state.lock().expect("source block state");
    for slot in &state.slots {
        assert!(matches!(slot.status, SourceBlockStatus::Released));
        assert_eq!(slot.remaining_claims, 0);
        assert_eq!(slot.live_claims, 0);
    }
    assert_eq!(state.window_committed_bytes, 0);
    assert_eq!(state.resident_bytes, 0);
    drop(state);
    drop(body);
}

#[tokio::test]
async fn empty_upload_body_completes_on_terminal_poll() {
    let zip = zip_from_entry("empty.txt", b"");
    let plan = zip_plan_from_archive(&zip, "empty.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let mut body = zip_entry_body(
        Arc::clone(&store),
        plan,
        0,
        Arc::new(UploadBodyState::default()),
        Arc::new(AtomicUsize::new(0)),
        None,
    )
    .into_inner();

    assert!(!body.is_end_stream());
    assert_eq!(body.size_hint().exact(), Some(0));
    assert!(
        std::future::poll_fn(|cx| Pin::new(&mut body).poll_frame(cx))
            .await
            .is_none()
    );
    assert!(body.is_end_stream());
    drop(body);

    let state = store.state.lock().expect("source block state");
    assert!(
        state
            .slots
            .iter()
            .all(|slot| matches!(slot.status, SourceBlockStatus::Released))
    );
}

#[tokio::test]
async fn dropped_upload_body_cancels_global_capacity_wait_and_replays() {
    let zip = zip_from_entry("capacity.txt", b"capacity replay");
    let plan = zip_plan_from_archive(&zip, "capacity.txt");
    let block_bytes = usize::try_from(plan.source_span_end_exclusive - plan.source_offset).unwrap();
    let response_bytes =
        zip[plan.source_offset as usize..plan.source_span_end_exclusive as usize].to_vec();
    let replay = StaticReplayClient::new(vec![get_range_success_bytes(
        response_bytes,
        plan.source_offset,
        zip.len() as u64,
    )]);
    let stats = Arc::new(DeploymentStats::default());
    let budget = SourceByteBudget::new(block_bytes, Arc::clone(&stats), false)
        .expect("valid test source budget");
    let held_capacity = budget
        .reserve_planning(block_bytes as u64)
        .await
        .expect("hold the complete source budget");
    let store = pending_replay_store(
        &zip,
        &plan,
        replay.clone(),
        Arc::clone(&budget),
        block_bytes,
    );
    let body = zip_entry_body(
        Arc::clone(&store),
        plan.clone(),
        plan.size,
        Arc::new(UploadBodyState::default()),
        Arc::new(AtomicUsize::new(0)),
        None,
    );
    let mut first = body.into_inner();
    let mut replay_body = first.try_clone().expect("retryable ZIP body");

    poll_body_once(&mut first);
    wait_for_test_condition(|| {
        matches!(
            store.state.lock().expect("source block state").slots[0].status,
            SourceBlockStatus::Reserving
        )
    })
    .await;
    drop(first);
    poll_body_once(&mut replay_body);
    wait_for_test_condition(|| {
        let state = store.state.lock().expect("source block state");
        matches!(state.slots[0].status, SourceBlockStatus::Reserving)
            && state.slots[0].remaining_claims == 1
            && !state.slots[0].replay_priority
    })
    .await;
    let diagnostics = store.source.diagnostics.snapshot();
    assert_eq!(diagnostics.body_attempts, 2);
    assert_eq!(diagnostics.body_replays, 1);
    assert_eq!(stats.source_global_memory_for_test().1, block_bytes as u64);

    drop(held_capacity);
    let bytes = tokio::time::timeout(
        Duration::from_secs(1),
        aws_sdk_s3::primitives::ByteStream::new(replay_body).collect(),
    )
    .await
    .expect("replayed body should not hang after capacity cancellation")
    .expect("replayed body after capacity cancellation")
    .into_bytes();

    assert_eq!(bytes.as_ref(), b"capacity replay");
    assert_eq!(replay.actual_requests().count(), 1);
    assert_eq!(stats.source_global_memory_for_test().1, 0);
    assert_replayed_body_released(&store);
}

#[tokio::test]
async fn dropped_upload_body_cancels_ranged_get_and_replays() {
    const BLOCK_BYTES: usize = 64;
    let expected = (0..512)
        .map(|index| (index % 251) as u8)
        .collect::<Vec<_>>();
    let zip = stored_zip_from_entry("range.txt", &expected);
    let plan = zip_plan_from_archive(&zip, "range.txt");
    let blocks = plan_source_blocks(
        zip.len() as u64,
        std::slice::from_ref(&plan),
        BLOCK_BYTES,
        0,
    )
    .expect("planning succeeds");
    assert!(blocks.len() > 2);
    let get_started = Arc::new(AtomicBool::new(false));
    let get_dropped = Arc::new(AtomicBool::new(false));
    let replay_get_started = Arc::new(AtomicBool::new(false));
    let replay_get_released = Arc::new(AtomicBool::new(false));
    let replay_get_waker = Arc::new(AtomicWaker::new());
    let mut events = vec![
        get_block_success_event(&zip, blocks[0]),
        get_pending_range_event(
            usize::try_from(blocks[1].len()).unwrap(),
            blocks[1].start,
            zip.len() as u64,
            Arc::clone(&get_started),
            Arc::clone(&get_dropped),
        ),
        get_gated_range_event(
            &zip,
            blocks[0],
            Arc::clone(&replay_get_started),
            Arc::clone(&replay_get_released),
            Arc::clone(&replay_get_waker),
        ),
    ];
    events.extend(
        blocks
            .iter()
            .skip(1)
            .copied()
            .map(|block| get_block_success_event(&zip, block)),
    );
    let expected_requests = events.len();
    let replay = StaticReplayClient::new(events);
    let stats = Arc::new(DeploymentStats::default());
    let budget = SourceByteBudget::new(BLOCK_BYTES, Arc::clone(&stats), false)
        .expect("valid test source budget");
    let store = pending_replay_store(&zip, &plan, replay.clone(), budget, BLOCK_BYTES);
    let body = zip_entry_body(
        Arc::clone(&store),
        plan.clone(),
        plan.size,
        Arc::new(UploadBodyState::default()),
        Arc::new(AtomicUsize::new(0)),
        None,
    );
    let mut first = body.into_inner();
    let mut replay_body = first.try_clone().expect("retryable ZIP body");

    poll_body_once(&mut first);
    wait_for_test_condition(|| {
        get_started.load(Ordering::Acquire)
            && matches!(
                store.state.lock().expect("source block state").slots[1].status,
                SourceBlockStatus::Fetching
            )
    })
    .await;
    assert_eq!(stats.source_global_memory_for_test().1, BLOCK_BYTES as u64);
    drop(first);
    poll_body_once(&mut replay_body);
    wait_for_test_condition(|| {
        get_dropped.load(Ordering::Acquire) && replay_get_started.load(Ordering::Acquire)
    })
    .await;
    {
        let state = store.state.lock().expect("source block state");
        assert!(matches!(state.slots[0].status, SourceBlockStatus::Fetching));
        assert_eq!(state.slots[0].remaining_claims, 1);
        assert_eq!(state.slots[0].live_claims, 0);
        for slot in &state.slots[1..] {
            assert!(matches!(slot.status, SourceBlockStatus::Pending));
            assert_eq!(slot.remaining_claims, 1);
            assert_eq!(slot.live_claims, 0);
            assert!(slot.replay_priority);
        }
    }
    replay_get_released.store(true, Ordering::Release);
    replay_get_waker.wake();

    let bytes = tokio::time::timeout(
        Duration::from_secs(1),
        aws_sdk_s3::primitives::ByteStream::new(replay_body).collect(),
    )
    .await
    .expect("replayed body should not hang after ranged GET cancellation")
    .expect("replayed body after ranged GET cancellation")
    .into_bytes();

    assert_eq!(bytes.as_ref(), expected);
    assert!(get_dropped.load(Ordering::Acquire));
    assert_eq!(replay.actual_requests().count(), expected_requests);
    assert_eq!(stats.source_global_memory_for_test().1, 0);
    assert_replayed_body_released(&store);
}

#[tokio::test]
async fn ranged_get_retries_transient_failures_with_one_sdk_attempt_each() {
    let replay = StaticReplayClient::new(vec![
        get_error_event(500, "InternalError"),
        get_error_event(503, "SlowDown"),
        get_success_event(b"hello"),
    ]);
    let source = replay_source_client(replay.clone(), 5);

    let bytes = source
        .get_range(0, 4)
        .await
        .expect("third attempt succeeds");
    assert_eq!(bytes.as_ref(), b"hello");
    assert_eq!(replay.actual_requests().count(), 3);
    let diagnostics = source.diagnostics.snapshot();
    assert_eq!(diagnostics.source_get_attempts, 3);
    assert_eq!(diagnostics.source_get_retries, 2);
    assert_eq!(diagnostics.source_get_retryable_errors, 2);
    assert_eq!(diagnostics.source_get_throttled_attempts, 1);
    assert_eq!(diagnostics.source_get_errors, 0);
}

#[tokio::test]
async fn ranged_get_does_not_retry_permanent_4xx() {
    let replay = StaticReplayClient::new(vec![get_error_event(400, "InvalidRequest")]);
    let source = replay_source_client(replay.clone(), 5);

    let error = source
        .get_range(0, 4)
        .await
        .expect_err("permanent request should fail");
    assert!(error.to_string().contains("GetObject"));
    assert_eq!(replay.actual_requests().count(), 1);
    let diagnostics = source.diagnostics.snapshot();
    assert_eq!(diagnostics.source_get_attempts, 1);
    assert_eq!(diagnostics.source_get_retries, 0);
    assert_eq!(diagnostics.source_get_permanent_errors, 1);
    assert_eq!(diagnostics.source_get_errors, 1);
}

#[tokio::test]
async fn ranged_get_retries_incomplete_bodies() {
    let replay = StaticReplayClient::new(vec![
        get_range_response(b"hey", Some("bytes 0-4/5")),
        get_success_event(b"hello"),
    ]);
    let source = replay_source_client(replay.clone(), 5);

    let bytes = source
        .get_range(0, 4)
        .await
        .expect("short body should be retried");
    assert_eq!(bytes.as_ref(), b"hello");
    assert_eq!(replay.actual_requests().count(), 2);
    let diagnostics = source.diagnostics.snapshot();
    assert_eq!(diagnostics.source_get_short_body_errors, 1);
    assert_eq!(diagnostics.source_get_retryable_errors, 1);
    assert_eq!(diagnostics.source_get_retries, 1);
}

#[tokio::test]
async fn ranged_get_retries_a_mismatched_content_range() {
    let replay = StaticReplayClient::new(vec![
        get_range_response(b"hello", Some("bytes 1-5/5")),
        get_success_event(b"hello"),
    ]);
    let source = replay_source_client(replay.clone(), 5);

    let bytes = source
        .get_range(0, 4)
        .await
        .expect("a valid replay after a mismatched Content-Range should succeed");

    assert_eq!(bytes.as_ref(), b"hello");
    assert_eq!(replay.actual_requests().count(), 2);
    assert_eq!(source.diagnostics().source_get_retryable_errors, 1);
}

#[tokio::test]
async fn ranged_get_rejects_a_missing_content_range() {
    let replay = StaticReplayClient::new(vec![
        get_range_response(b"hello", None),
        get_range_response(b"hello", None),
        get_range_response(b"hello", None),
    ]);
    let source = replay_source_client(replay.clone(), 5);

    let error = source
        .get_range(0, 4)
        .await
        .expect_err("a missing Content-Range must fail closed");

    assert!(error.to_string().contains("missing Content-Range"));
    assert_eq!(replay.actual_requests().count(), 3);
}

#[test]
fn ranged_get_classifies_timeout_and_construction_failures() {
    let timeout = range_get_request_error(aws_sdk_s3::error::SdkError::<
        aws_sdk_s3::operation::get_object::GetObjectError,
    >::timeout_error(std::io::Error::new(
        std::io::ErrorKind::TimedOut,
        "injected timeout",
    )));
    assert!(timeout.retryable);
    assert!(!timeout.throttled);

    let construction = range_get_request_error(aws_sdk_s3::error::SdkError::<
        aws_sdk_s3::operation::get_object::GetObjectError,
    >::construction_failure(std::io::Error::new(
        std::io::ErrorKind::InvalidInput,
        "injected construction failure",
    )));
    assert!(!construction.retryable);
    assert!(!construction.throttled);
}

#[tokio::test(start_paused = true)]
async fn spawned_source_bodies_are_aborted_and_drained() {
    let zip = zip_from_entry("body.txt", b"body task");
    let plan = zip_plan_from_archive(&zip, "body.txt");
    let store = ready_store_for_plan(&zip, &plan);
    let dropped = Arc::new(AtomicBool::new(false));
    let task_dropped = Arc::clone(&dropped);
    let _ = store.spawn_body_task(async move {
        let _signal = DropSignal(task_dropped);
        pending::<()>().await;
    });
    tokio::task::yield_now().await;

    store
        .abort_and_drain_body_tasks(Instant::now() + Duration::from_secs(1))
        .await
        .expect("body task drain");

    assert!(dropped.load(Ordering::Acquire));
}

#[tokio::test]
async fn scheduler_cancellation_wakes_capacity_waiters() {
    let zip = zip_from_entry("waiter.txt", b"waiter");
    let plan = zip_plan_from_archive(&zip, "waiter.txt");
    let store = ready_store_for_plan(&zip, &plan);
    {
        let mut state = store.state.lock().expect("source block state");
        state.slots[0].status = SourceBlockStatus::Pending;
        state.window_committed_bytes = store.window_bytes;
    }
    let waiter_store = Arc::clone(&store);
    let waiter = tokio::spawn(async move {
        waiter_store
            .reserve_fetch(0, SourceFetchMode::Prefetch)
            .await
    });
    tokio::task::yield_now().await;

    store.cancel("injected scheduler failure");
    let result = tokio::time::timeout(Duration::from_secs(1), waiter)
        .await
        .expect("waiter should wake")
        .expect("waiter task");
    let error = match result {
        Ok(_) => panic!("cancelled scheduler should fail the waiter"),
        Err(error) => error,
    };

    assert!(error.to_string().contains("injected scheduler failure"));
}

#[tokio::test]
async fn open_entry_data_reader_stitches_a_local_header_across_a_block_boundary() {
    let zip = zip_from_entry("straddle.txt", b"local header straddles a source block");
    let plan = zip_plan_from_archive(&zip, "straddle.txt");
    let single_block = ready_store_for_plan(&zip, &plan);
    let mut expected = Vec::new();
    open_entry_data_reader(single_block, plan.clone(), None)
        .await
        .expect("single-block reader")
        .read_to_end(&mut expected)
        .await
        .unwrap();
    assert!(!expected.is_empty());

    // Every block size that puts the first boundary strictly inside the 30-byte header,
    // so the split lands after a different header byte each iteration. These sizes are below
    // `MIN_SOURCE_BLOCK_BYTES` and the current planner never emits such a split at all
    // (see `read_local_file_header`); they are the only way to drive the stitching
    // path, which exists so a future coalescing change cannot resurrect the failure.
    for block_bytes in 1..LOCAL_FILE_HEADER_LEN {
        let store = ready_store_for_plan_with_block_bytes(&zip, &plan, block_bytes);
        assert!(
            store.blocks.len() > 1,
            "block size {block_bytes} must split the entry"
        );
        assert!(
            store.blocks[0].len() < LOCAL_FILE_HEADER_LEN as u64,
            "block size {block_bytes} must split the header itself"
        );

        let mut actual = Vec::new();
        open_entry_data_reader(store, plan.clone(), None)
            .await
            .unwrap_or_else(|error| {
                panic!("straddling header at block size {block_bytes} must parse: {error}")
            })
            .read_to_end(&mut actual)
            .await
            .unwrap();

        assert_eq!(actual, expected, "block size {block_bytes}");
    }
}

#[tokio::test]
async fn open_entry_data_reader_rejects_header_bytes_outside_every_planned_block() {
    // Header bytes that no planned block covers are unreachable through real
    // planning, which always covers an entry's whole span contiguously. Stitching
    // must still degrade to a clean error rather than looping or panicking.
    let short_len: u64 = (LOCAL_FILE_HEADER_LEN as u64) - 1;
    let block = SourceBlockRange {
        start: 0,
        end_exclusive: short_len,
    };
    let store = ready_store(
        1024,
        vec![block],
        vec![1],
        vec![bytes::Bytes::from(vec![0u8; short_len as usize])],
    );
    let plan = ZipEntryPlan::for_test("entry.txt", 1, 0, 64);

    let error = match open_entry_data_reader(store, plan, None).await {
        Ok(_) => panic!("expected unplanned local header bytes to be rejected"),
        Err(error) => error,
    };

    assert!(
        error
            .to_string()
            .contains("no planned source block covers offset"),
        "unexpected error: {error}"
    );
}

#[test]
fn source_diagnostics_splits_waits_and_replay_refetch_reasons() {
    let diagnostics = SourceDiagnostics::new(1024);
    diagnostics.record_plan(
        SourceBlockOptions {
            block_bytes: 64,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: 128,
        },
        &[SourceBlockRange {
            start: 0,
            end_exclusive: 64,
        }],
        1,
    );
    diagnostics.record_wait_fetching();
    diagnostics.record_wait_capacity();
    diagnostics.record_replay_claim();
    diagnostics.record_replay_claim_after_release();
    diagnostics.record_replay_claim_after_failure();
    diagnostics.record_resident_bytes(64);
    diagnostics.record_resident_bytes(32);
    diagnostics.record_reader_started();
    diagnostics.record_reader_finished();

    let snapshot = diagnostics.snapshot();

    assert_eq!(snapshot.block_waits, 2);
    assert_eq!(snapshot.block_waits_fetching, 1);
    assert_eq!(snapshot.block_waits_capacity, 1);
    assert_eq!(snapshot.block_refetches, 1);
    assert_eq!(snapshot.replay_claims, 1);
    assert_eq!(snapshot.replay_claims_after_release, 1);
    assert_eq!(snapshot.replay_claims_after_failure, 1);
    assert_eq!(snapshot.resident_bytes_high_water, 64);
    assert_eq!(snapshot.active_readers_high_water, 1);
}

fn pending_store_for_span(
    span_bytes: usize,
    budget: Arc<SourceByteBudget>,
) -> Arc<SourceBlockStore> {
    let plan = plan_with_span("entry.txt", 0, span_bytes as u64);
    let source = Arc::new(SourceClient {
        client: dummy_s3_client(),
        bucket: "bucket".to_string(),
        key: "archive.zip".to_string(),
        len: span_bytes as u64,
        etag: "\"test-source-etag\"".to_string(),
        diagnostics: Arc::new(SourceDiagnostics::new(span_bytes as u64)),
    });
    SourceBlockStore::new(
        source,
        std::slice::from_ref(&plan),
        SourceBlockOptions {
            block_bytes: span_bytes,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: span_bytes,
        },
        budget,
    )
    .expect("store constructs")
}

fn pending_replay_store(
    zip: &[u8],
    plan: &ZipEntryPlan,
    replay: StaticReplayClient,
    budget: Arc<SourceByteBudget>,
    block_bytes: usize,
) -> Arc<SourceBlockStore> {
    SourceBlockStore::new(
        replay_source_client(replay, zip.len() as u64),
        std::slice::from_ref(plan),
        SourceBlockOptions {
            block_bytes,
            merge_gap_bytes: 0,
            get_concurrency: 1,
            window_bytes: block_bytes,
        },
        budget,
    )
    .expect("store constructs")
}

fn poll_body_once(body: &mut SdkBody) {
    let mut context = Context::from_waker(std::task::Waker::noop());
    assert!(Pin::new(body).poll_frame(&mut context).is_pending());
}

async fn wait_for_test_condition(mut condition: impl FnMut() -> bool) {
    tokio::time::timeout(Duration::from_secs(1), async {
        while !condition() {
            tokio::task::yield_now().await;
        }
    })
    .await
    .expect("test condition should become true");
}

fn assert_replayed_body_released(store: &SourceBlockStore) {
    let state = store.state.lock().expect("source block state");
    for slot in &state.slots {
        assert!(matches!(slot.status, SourceBlockStatus::Released));
        assert_eq!(slot.remaining_claims, 0);
        assert_eq!(slot.live_claims, 0);
    }
    assert_eq!(state.window_committed_bytes, 0);
    assert_eq!(state.resident_bytes, 0);
    let diagnostics = store.source.diagnostics.snapshot();
    assert_eq!(diagnostics.body_attempts, 2);
    assert_eq!(diagnostics.body_replays, 1);
}

pub(crate) fn ready_store_for_plan(zip: &[u8], plan: &ZipEntryPlan) -> Arc<SourceBlockStore> {
    ready_store_for_plan_with_claims(zip, plan, 1)
}

pub(crate) fn ready_store_for_plan_with_claims(
    zip: &[u8],
    plan: &ZipEntryPlan,
    claims: usize,
) -> Arc<SourceBlockStore> {
    let block = SourceBlockRange {
        start: plan.source_offset,
        end_exclusive: plan.source_span_end_exclusive,
    };
    ready_store(
        zip.len() as u64,
        vec![block],
        vec![claims],
        vec![bytes::Bytes::copy_from_slice(
            &zip[block.start as usize..block.end_exclusive as usize],
        )],
    )
}

/// Builds a store whose blocks come from the real planner at `block_bytes`, so an
/// entry's local header and data can be split across genuine block boundaries.
fn ready_store_for_plan_with_block_bytes(
    zip: &[u8],
    plan: &ZipEntryPlan,
    block_bytes: usize,
) -> Arc<SourceBlockStore> {
    let plans = std::slice::from_ref(plan);
    let blocks =
        plan_source_blocks(zip.len() as u64, plans, block_bytes, 0).expect("planning succeeds");
    let claims = initial_claim_counts(&blocks, plans);
    let ready_blocks = blocks
        .iter()
        .map(|block| {
            bytes::Bytes::copy_from_slice(&zip[block.start as usize..block.end_exclusive as usize])
        })
        .collect();
    ready_store(zip.len() as u64, blocks, claims, ready_blocks)
}

fn ready_store(
    source_len: u64,
    blocks: Vec<SourceBlockRange>,
    claims: Vec<usize>,
    ready_blocks: Vec<bytes::Bytes>,
) -> Arc<SourceBlockStore> {
    assert_eq!(blocks.len(), claims.len());
    assert_eq!(blocks.len(), ready_blocks.len());
    for (block, bytes) in blocks.iter().zip(&ready_blocks) {
        assert_eq!(block.len(), bytes.len() as u64);
    }

    let resident = blocks.iter().map(|block| block.len()).sum();
    let slots = claims
        .into_iter()
        .zip(ready_blocks)
        .map(|(remaining_claims, bytes)| SourceBlockSlot {
            remaining_claims,
            live_claims: 0,
            replay_priority: false,
            budget_permit: None,
            status: SourceBlockStatus::Ready(bytes),
        })
        .collect();

    Arc::new(SourceBlockStore {
        source: Arc::new(SourceClient {
            client: dummy_s3_client(),
            bucket: "bucket".to_string(),
            key: "archive.zip".to_string(),
            len: source_len,
            etag: "\"test-source-etag\"".to_string(),
            diagnostics: Arc::new(SourceDiagnostics::new(source_len)),
        }),
        blocks,
        state: std::sync::Mutex::new(SourceBlockState {
            slots,
            window_committed_bytes: resident,
            resident_bytes: resident,
            failure: None,
        }),
        notify: Arc::new(tokio::sync::Notify::new()),
        capacity_notify: Arc::new(tokio::sync::Notify::new()),
        cancel_notify: Arc::new(tokio::sync::Notify::new()),
        budget: SourceByteBudget::new(
            usize::try_from(resident).unwrap(),
            Arc::new(crate::diagnostics::DeploymentStats::default()),
            false,
        )
        .expect("valid test source budget"),
        source_get_concurrency: 1,
        window_bytes: resident,
        fetch_semaphore: Semaphore::new(1),
        body_tasks: std::sync::Mutex::new(tokio::task::JoinSet::new()),
    })
}

pub(crate) fn zip_plan_from_archive(bytes: &[u8], name: &str) -> ZipEntryPlan {
    let mut archive = zip::ZipArchive::new(std::io::Cursor::new(bytes)).unwrap();
    let file = archive.by_name(name).unwrap();
    let data_start = file.data_start().unwrap();
    let compression_code = match file.compression() {
        zip::CompressionMethod::Stored => 0,
        zip::CompressionMethod::Deflated => 8,
        method => panic!("unsupported test compression method {method:?}"),
    };
    ZipEntryPlan {
        compressed_size: file.compressed_size(),
        compression_code,
        crc32: file.crc32(),
        ..ZipEntryPlan::for_test(
            name,
            file.size(),
            file.header_start(),
            data_start + file.compressed_size(),
        )
    }
}

pub(crate) fn zip_from_entry(name: &str, bytes: &[u8]) -> Vec<u8> {
    let cursor = std::io::Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    writer.start_file(name, options).unwrap();
    writer.write_all(bytes).unwrap();
    writer.finish().unwrap().into_inner()
}

fn stored_zip_from_entry(name: &str, bytes: &[u8]) -> Vec<u8> {
    let cursor = std::io::Cursor::new(Vec::new());
    let mut writer = ZipWriter::new(cursor);
    let options = SimpleFileOptions::default().compression_method(zip::CompressionMethod::Stored);
    writer.start_file(name, options).unwrap();
    writer.write_all(bytes).unwrap();
    writer.finish().unwrap().into_inner()
}

fn plan_with_span(
    relative_key: &str,
    source_offset: u64,
    source_span_end_exclusive: u64,
) -> ZipEntryPlan {
    ZipEntryPlan::for_test(
        relative_key,
        source_span_end_exclusive - source_offset,
        source_offset,
        source_span_end_exclusive,
    )
}

fn dummy_s3_client() -> aws_sdk_s3::Client {
    let config = aws_sdk_s3::Config::builder()
        .behavior_version_latest()
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            "test-access-key",
            "test-secret-key",
            None,
            None,
            "shin-bucket-deployment-test",
        ))
        .build();
    aws_sdk_s3::Client::from_conf(config)
}

fn replay_source_client(replay: StaticReplayClient, len: u64) -> Arc<SourceClient> {
    let config = aws_sdk_s3::Config::builder()
        .behavior_version_latest()
        .region(aws_sdk_s3::config::Region::new("us-east-1"))
        .credentials_provider(aws_sdk_s3::config::Credentials::new(
            "test-access-key",
            "test-secret-key",
            None,
            None,
            "shin-bucket-deployment-test",
        ))
        .endpoint_url("https://s3.test")
        .force_path_style(true)
        .retry_config(aws_sdk_s3::config::retry::RetryConfig::standard().with_max_attempts(3))
        .http_client(replay)
        .build();
    Arc::new(SourceClient {
        client: aws_sdk_s3::Client::from_conf(config),
        bucket: "bucket".to_string(),
        key: "archive.zip".to_string(),
        len,
        etag: "\"test-source-etag\"".to_string(),
        diagnostics: Arc::new(SourceDiagnostics::new(len)),
    })
}

#[test]
fn source_get_retry_cap_grows_exponentially_and_clamps() {
    // Transient errors: 100, 200, 400, then clamped at the maximum.
    assert_eq!(source_get_retry_cap_millis(1, false), 100);
    assert_eq!(source_get_retry_cap_millis(2, false), 200);
    assert_eq!(source_get_retry_cap_millis(3, false), 400);
    assert_eq!(source_get_retry_cap_millis(4, false), 400);

    // Throttled responses back off harder: 250, 500, 1000, 2000, then clamped.
    assert_eq!(source_get_retry_cap_millis(1, true), 250);
    assert_eq!(source_get_retry_cap_millis(2, true), 500);
    assert_eq!(source_get_retry_cap_millis(4, true), 2_000);
    assert_eq!(source_get_retry_cap_millis(5, true), 2_000);

    // A large attempt count must clamp rather than wrap.
    assert_eq!(source_get_retry_cap_millis(usize::MAX, true), 2_000);
}

#[test]
fn source_get_retry_delay_applies_full_jitter_under_the_cap() {
    // Full jitter samples 0..=cap, so the floor is zero and the ceiling is the cap.
    assert_eq!(
        source_get_retry_delay(2, false, 0),
        Duration::from_millis(0)
    );
    assert_eq!(
        source_get_retry_delay(2, false, 200),
        Duration::from_millis(200)
    );

    // Every sample stays within the cap for its attempt and error class.
    for attempt in 1..=6 {
        for throttled in [false, true] {
            let cap = source_get_retry_cap_millis(attempt, throttled);
            for jitter in [0, 1, 7, 12_345, u64::MAX] {
                let delay = source_get_retry_delay(attempt, throttled, jitter);
                assert!(
                    delay <= Duration::from_millis(cap),
                    "attempt {attempt} throttled {throttled} jitter {jitter} gave {delay:?} over cap {cap}"
                );
            }
        }
    }

    // Throttled retries are never cheaper than transient ones at the same attempt.
    for attempt in 1..=6 {
        assert!(
            source_get_retry_cap_millis(attempt, true)
                >= source_get_retry_cap_millis(attempt, false)
        );
    }
}

fn head_replay_event(etag: Option<&str>, len: u64) -> ReplayEvent {
    let mut response = Response::builder()
        .status(200)
        .header("content-length", len.to_string());
    if let Some(etag) = etag {
        response = response.header("etag", etag);
    }
    ReplayEvent::new(
        Request::builder()
            .method("HEAD")
            .uri("https://s3.test/bucket/archive.zip")
            .body(SdkBody::empty())
            .unwrap(),
        response.body(SdkBody::empty()).unwrap(),
    )
}

fn replay_app_state(replay: StaticReplayClient) -> AppState {
    crate::state::test_app_state_with_replay(replay)
}

#[tokio::test]
async fn head_source_rejects_a_source_without_an_etag() {
    let state = replay_app_state(StaticReplayClient::new(vec![head_replay_event(None, 128)]));

    let error = head_source(&state, "bucket", "archive.zip", &DeploymentStats::default())
        .await
        .expect_err("a source HEAD without an ETag must fail closed");
    assert!(
        error.to_string().contains("missing an ETag"),
        "unexpected error: {error}"
    );
}

#[tokio::test]
async fn head_source_records_the_wait_span_on_a_failed_head() {
    // The HEAD request itself fails (500), so `.send().await` errors; the
    // request still waited, and that span must land in `planSourceHeads` on the
    // error path too, because failure summaries retain and log these stats.
    let state = replay_app_state(StaticReplayClient::new(vec![ReplayEvent::new(
        Request::builder()
            .method("HEAD")
            .uri("https://s3.test/bucket/archive.zip")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(500)
            .body(SdkBody::empty())
            .unwrap(),
    )]));
    let stats = DeploymentStats::default();

    let error = head_source(&state, "bucket", "archive.zip", &stats)
        .await
        .expect_err("a failed source HEAD must fail closed");
    assert!(
        error
            .to_string()
            .contains("failed to read source archive metadata"),
        "unexpected error: {error}"
    );

    let (source_heads_micros, ..) = stats.plan_parts_micros_for_test();
    assert!(
        source_heads_micros > 0,
        "a failed HEAD still waited for its span, got {source_heads_micros} us"
    );
}

#[tokio::test]
async fn head_source_keeps_the_returned_etag_verbatim() {
    let state = replay_app_state(StaticReplayClient::new(vec![head_replay_event(
        Some("\"source-etag\""),
        128,
    )]));

    let head = head_source(&state, "bucket", "archive.zip", &DeploymentStats::default())
        .await
        .expect("a source HEAD with an ETag must succeed");
    assert_eq!(head.len, 128);
    assert_eq!(head.etag, "\"source-etag\"");
}

#[tokio::test]
async fn source_range_gets_pin_the_source_with_if_match() {
    let replay = StaticReplayClient::new(vec![get_success_bytes(b"hello".to_vec())]);
    let source = replay_source_client(replay.clone(), 5);

    source
        .get_range(0, 4)
        .await
        .expect("the ranged GET should succeed");

    let request = replay
        .actual_requests()
        .next()
        .expect("one ranged GET request");
    assert_eq!(
        request.headers().get("if-match"),
        Some("\"test-source-etag\""),
        "ranged GETs must pin the source ETag"
    );
}

fn get_error_event(status: u16, code: &str) -> ReplayEvent {
    let body = format!("<Error><Code>{code}</Code><Message>test error</Message></Error>");
    ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/expected")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(status)
            .header("content-type", "application/xml")
            .body(SdkBody::from(body.into_bytes()))
            .unwrap(),
    )
}

fn get_success_event(bytes: &'static [u8]) -> ReplayEvent {
    get_range_response(bytes, Some(&format!("bytes 0-{}/5", bytes.len() - 1)))
}

fn get_range_response(bytes: &'static [u8], content_range: Option<&str>) -> ReplayEvent {
    let mut response = Response::builder()
        .status(206)
        .header("content-length", bytes.len());
    if let Some(content_range) = content_range {
        response = response.header("content-range", content_range);
    }
    ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/expected")
            .body(SdkBody::empty())
            .unwrap(),
        response.body(SdkBody::from(bytes)).unwrap(),
    )
}

fn get_success_bytes(bytes: Vec<u8>) -> ReplayEvent {
    let len = bytes.len();
    get_range_success_bytes(bytes, 0, len as u64)
}

fn get_range_success_bytes(bytes: Vec<u8>, start: u64, source_len: u64) -> ReplayEvent {
    let len = bytes.len();
    let end = start + len as u64 - 1;
    ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/expected")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(206)
            .header("content-length", len)
            .header("content-range", format!("bytes {start}-{end}/{source_len}"))
            .body(SdkBody::from(bytes))
            .unwrap(),
    )
}

fn get_block_success_event(source: &[u8], block: SourceBlockRange) -> ReplayEvent {
    get_range_success_bytes(
        source[block.start as usize..block.end_exclusive as usize].to_vec(),
        block.start,
        source.len() as u64,
    )
}

fn get_pending_range_event(
    len: usize,
    start: u64,
    source_len: u64,
    started: Arc<AtomicBool>,
    dropped: Arc<AtomicBool>,
) -> ReplayEvent {
    let end = start + len as u64 - 1;
    ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/expected")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(206)
            .header("content-length", len)
            .header("content-range", format!("bytes {start}-{end}/{source_len}"))
            .body(SdkBody::from_body_1_x(PendingResponseBody {
                started,
                dropped,
                content_length: len as u64,
            }))
            .unwrap(),
    )
}

fn get_gated_range_event(
    source: &[u8],
    block: SourceBlockRange,
    started: Arc<AtomicBool>,
    released: Arc<AtomicBool>,
    waker: Arc<AtomicWaker>,
) -> ReplayEvent {
    let bytes =
        bytes::Bytes::copy_from_slice(&source[block.start as usize..block.end_exclusive as usize]);
    ReplayEvent::new(
        Request::builder()
            .uri("https://s3.test/expected")
            .body(SdkBody::empty())
            .unwrap(),
        Response::builder()
            .status(206)
            .header("content-length", bytes.len())
            .header(
                "content-range",
                format!(
                    "bytes {}-{}/{}",
                    block.start,
                    block.end_inclusive(),
                    source.len()
                ),
            )
            .body(SdkBody::from_body_1_x(GatedResponseBody {
                started,
                released,
                waker,
                bytes: Some(bytes),
            }))
            .unwrap(),
    )
}
