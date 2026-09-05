# Destination listing key review

## Reproducer

Deterministic HTTP replay on 2026-09-05 with `aws-sdk-s3` 1.145.0 confirmed that a literal XML-incompatible control character in a successful `ListObjectsV2` response fails SDK parsing. No AWS request is needed to reproduce this parser boundary. The SDK neither adds `encoding-type=url` nor decodes an explicitly URL-encoded response.

| Synthetic key content      | Unencoded XML response |
| -------------------------- | ---------------------- |
| Carriage return            | Exact key preserved    |
| Literal U+0001             | XML parsing fails      |
| Numeric reference `&#x1;`  | Exact key preserved    |
| Literal `%2F`              | Exact key preserved    |
| Plus sign                  | Exact key preserved    |
| Unicode                    | Exact key preserved    |
| Escaped XML metacharacters | Exact key preserved    |

[S3 documents URL encoding for keys that XML cannot represent](https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html). [Upstream CDK delegates synchronization to the AWS CLI](https://github.com/aws/aws-cdk/blob/main/packages/%40aws-cdk/custom-resource-handlers/lib/aws-s3-deployment/bucket-deployment-handler/index.py); [Botocore requests URL encoding and decodes listing keys before pagination](https://github.com/boto/botocore/blob/develop/botocore/handlers.py).

## Provider behavior

Destination planning and cleanup request URL encoding and decode every key exactly once in the existing SDK response page before returning it to callers. Decoded keys feed prefix stripping, filters, manifest matching, retained stale candidates, deletion, and the next `StartAfter` cursor. Pagination still uses the last object key; listing the next page can still overlap deleting the current page. There is no extra S3 request or full namespace copy.

The decoder follows S3 form-style URL encoding: response text `plus+sign.txt` becomes `plus sign.txt`, while `plus%2Bsign.txt` becomes `plus+sign.txt`. Literal percent sequences decode exactly once: `a%252Fb.txt` becomes `a%2Fb.txt`, while `a%2Fb.txt` becomes `a/b.txt`. A string without percent escapes or plus signs keeps its allocation. Encoded strings are decoded in place in the SDK allocation, with raw-plus handling folded into the existing compaction loop and malformed percent escapes and invalid UTF-8 rejected. Botocore's listing decoder uses `unquote_str`, an alias for `unquote_plus`, matching this boundary. The earlier decoder incorrectly preserved raw plus signs and conflated space and literal-plus keys in real S3 responses.

A malformed page fails before any of its keys reach predicates or deletion. Work already authorized from an earlier valid page can finish while the next page is being fetched; this does not make cleanup transactional. SDK XML parsing errors also fail without a new retry loop. Excluded valid keys containing unusual characters remain excluded and cannot redirect deletion to a different key.

Replay coverage includes encoded prefixes, a two-page listing with an encoded last key, exact `StartAfter` serialization, distinct literal-percent and slash keys, excluded control characters, retained and overflow/re-list cleanup, exact deletion payloads, malformed encoding, allocation reuse, and arbitrary UTF-8 round trips.

The scenario verifier also requests URL encoding and replaces raw `+` with a space before applying `decodeURIComponent` once per key. Its JavaScript SDK leaves explicitly encoded values untouched, while its unencoded XML parser normalizes a literal carriage return to a line feed. Real SDK replay tests cover exact decoded keys, rejected malformed encodings, and unchanged opaque continuation tokens; the verifier continues using its existing continuation-token pagination.

## Local decoding cost

The earlier local experiment compiled the percent-only decoder with Rust 1.97.1 and `rustc -O` on x86_64. Nine alternating baseline/decoder samples each processed 2,000 batches of 1,000 owned keys; fixture allocation occurred outside the timed region, and both paths consumed and dropped their strings through `black_box`. These are median nanoseconds per key for the decoder loop, excluding SDK XML parsing, page handling, and network time.

| Synthetic key shape                         | Consume/drop baseline | Decode/drop |  Added cost |
| ------------------------------------------- | --------------------: | ----------: | ----------: |
| Ordinary short asset key                    |               5.32 ns |     8.57 ns |     3.25 ns |
| Short key with one escape                   |               4.49 ns |    15.19 ns |    10.70 ns |
| Short encoded Unicode key                   |               4.56 ns |    29.01 ns |    24.45 ns |
| 1,024-byte ordinary key                     |              50.49 ns |    92.10 ns |    41.61 ns |
| 1,024-byte UTF-8 key encoded as 3,072 bytes |             127.25 ns | 1,633.80 ns | 1,506.56 ns |

Allocation-identity tests prove that successful decoding reuses the SDK string buffer, including raw-plus and mixed percent/plus inputs. The timings above and the [earlier benchmark performance decision](benchmark.md#destination-listing-performance-review) describe the previous percent-only decoder; they do not establish performance acceptance for the corrected form decoder. Comparable exact-main before/after Shin measurements and an upstream AWS CDK baseline for this correction are pending. Deployed correctness is a separate pending boundary.

## Local validation

The form-decoding correction passed 330 Rust tests, Clippy with warnings denied, formatting, DEFLATE feature parity, TypeScript build/typecheck/lint, and 27 focused verifier tests. SDK replays cover space and literal-plus separation, CR/LF, Unicode, XML metacharacters, single percent decoding, retained and re-listed deletion, and each decoded `StartAfter` spelling. The exact contract comparison against `db54f56` passed with seven unchanged public declarations, unchanged runtime exports and package entrypoints, 33 verification templates, and two benchmark templates. The prior fixture-change acknowledgement was removed because this correction changes no synthesized contract. Deployed validation and rebuilt provider archives remain pending.

Earlier validation on the final runtime-dependency baseline `b499009` passed 329 Rust tests, Clippy with warnings denied, formatting, DEFLATE feature parity, TypeScript build/typecheck/lint, and 465 Vitest plus 60 script tests with staged archives. Fresh arm64 and x86_64 archives pass the provider-input/toolchain/build-environment freshness gate; all 33 verification scenarios synthesize.

The exact TypeScript contract comparison against `b499009` passed with six unchanged public declarations, unchanged runtime exports and package entrypoints, 33 verification templates, and two unchanged benchmark templates. The acknowledgement contains only the 12 observed fixture changes: template, assets, tree, and assembly manifest for `filters`, `stale-object-cleanup-initial`, and `stale-object-cleanup-updated`.

## Fixture packaging guard

The CDK CLI directory ZIP writer omits CR and LF filenames through its glob enumeration. A local replay of the installed writer produced empty archives for both control-character keys and the excluded CR key, explaining the first deployed filters key-set failure before those names reached the provider. The three affected scenarios now use committed deterministic ZIP fixtures passed as regular-file assets, bypassing directory enumeration. Local tests inspect exact entry names, bodies, CRCs and file packaging; regenerate the base64 fixtures with `python3 scenarios/fixtures/listing-keys/generate.py`. The corrected fixtures retain the original expected key sets and still require deployed verification.

## AWS validation boundary

A deployed diagnostic confirmed that S3 returns spaces as raw `+` and literal plus signs as `%2B`; the previous decoder and verifier consequently produced duplicate key spellings. Correctness of the corrected decoder remains pending the intentional final release-candidate full verification suite, which includes the `filters` and `stale-object-cleanup` groups. The existing groups now use eight synthetic key shapes: distinct CR and LF names, literal-percent and slash names, plus and space names, Unicode, and XML metacharacters. No new scenario group or cloud resource type is required.

| Phase                          | Expected boundary                                                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `filters`                      | Ten exact destination keys and bodies; ordinary JavaScript and the unusual excluded JavaScript source are absent.                                                                                      |
| `stale-object-cleanup-initial` | Twenty-one exact destination keys: the base fixture, current and legacy files, eight kept edge keys, eight stale edge keys, and one key to exclude on update.                                          |
| `stale-object-cleanup-updated` | Twelve exact destination keys: the base fixture, changed current file, eight unchanged kept edge keys, and the excluded CR/plus/percent key. The legacy file and all eight stale edge keys are absent. |

The selected integration run will execute the full suite after current provider archives are built. For a future isolated rerun of this boundary, the smallest relevant scope is below; use the same group selection for cleanup:

```bash
pnpm verify deploy --groups filters,stale-object-cleanup --concurrency 1
pnpm verify destroy --groups filters,stale-object-cleanup --concurrency 1
```

The runner checks exact key sets and bodies after each phase and independently checks captured buckets are absent after destruction. Capture provider telemetry before cleanup; expected update work is one changed object and nine stale deletions, with kept and excluded keys preserved. A completed deploy command alone is not correctness evidence.

A replayed deletion response proves the exact request payload, not that S3 accepts every control character in `DeleteObjects` XML. The SDK escapes carriage returns and XML metacharacters but leaves U+0001 literal in deletion bodies. U+0001 remains in replay coverage, where it is excluded from deletion; deployed fixtures use the safe key shapes above and introduce no separate deletion fallback.

Raw replay and timing output remain in external scratch. This review contains no AWS resource identifiers or performance benchmark rows.
