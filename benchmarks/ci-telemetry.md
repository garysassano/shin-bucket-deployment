# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field | Value |
| --- | --- |
| Shin telemetry rows | 40 |
| Config groups | 2 |
| Snapshot dates | 2026-07-18 |
| Regions | eu-central-1 |
| Profiles | tiny-many, large-few |

## large-few / 1024 MiB / parallel 32

### Runtime

| Phase | State | Request | Deployment work | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Checksum strategy | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 32 | 144167470 | 55.83 | 69.126 | 2.395 | 2392 | 2.527 | 0.132 | 133 | 1024 | 32 | sse-s3-etag | 9 |
| cold-create | baseline | Create | success | 32 | 144167470 | 57.5 | 73.298 | 2.147 | 2144 | 2.276 | 0.129 | 125 | 1024 | 32 | sse-s3-etag | 25 |
| cold-create | baseline | Create | success | 32 | 144167470 | 106.82 | 123.426 | 56.04 | 56037 | 56.152 | 0.111 | 116 | 1024 | 32 | sse-s3-etag | 41 |
| cold-create | baseline | Create | success | 32 | 144167470 | 57.69 | 73.637 | 2.484 | 2481 | 2.6 | 0.115 | 121 | 1024 | 32 | sse-s3-etag | 57 |
| cold-create | baseline | Create | success | 32 | 144167470 | 117.85 | 133.921 | 56.297 | 56294 | 56.425 | 0.127 | 113 | 1024 | 32 | sse-s3-etag | 73 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 17.96 | 31.617 | 0.316 | 313 | 0.434 | 0.117 | 34 | 1024 | 32 | sse-s3-etag | 10 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 19.2 | 35.316 | 0.319 | 316 | 0.459 | 0.139 | 34 | 1024 | 32 | sse-s3-etag | 26 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 19.31 | 35.53 | 0.336 | 332 | 0.498 | 0.161 | 34 | 1024 | 32 | sse-s3-etag | 42 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 19.32 | 35.582 | 0.339 | 335 | 0.484 | 0.145 | 34 | 1024 | 32 | sse-s3-etag | 58 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 19.36 | 35.583 | 0.32 | 317 | 0.472 | 0.152 | 34 | 1024 | 32 | sse-s3-etag | 74 |
| changed-update | changed | Update | success | 32 | 144167470 | 18.08 | 37.006 | 0.571 | 568 | 0.727 | 0.156 | 36 | 1024 | 32 | sse-s3-etag | 11 |
| changed-update | changed | Update | success | 32 | 144167470 | 19.34 | 41.458 | 0.558 | 554 | 0.706 | 0.148 | 39 | 1024 | 32 | sse-s3-etag | 27 |
| changed-update | changed | Update | success | 32 | 144167470 | 19.33 | 36.285 | 0.502 | 498 | 0.625 | 0.123 | 39 | 1024 | 32 | sse-s3-etag | 43 |
| changed-update | changed | Update | success | 32 | 144167470 | 19.32 | 36.249 | 0.523 | 519 | 0.647 | 0.123 | 38 | 1024 | 32 | sse-s3-etag | 59 |
| changed-update | changed | Update | success | 32 | 144167470 | 19.24 | 41.839 | 0.521 | 518 | 0.637 | 0.115 | 37 | 1024 | 32 | sse-s3-etag | 75 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 18.11 | 37.02 | 0.662 | 659 | 0.779 | 0.116 | 55 | 1024 | 32 | sse-s3-etag | 12 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 19.43 | 35.985 | 0.703 | 700 | 0.834 | 0.131 | 52 | 1024 | 32 | sse-s3-etag | 28 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 19.47 | 41.535 | 0.857 | 854 | 1.009 | 0.151 | 53 | 1024 | 32 | sse-s3-etag | 44 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 19.52 | 36.261 | 0.885 | 882 | 1.04 | 0.155 | 56 | 1024 | 32 | sse-s3-etag | 60 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 19.46 | 36.402 | 0.762 | 759 | 0.891 | 0.128 | 54 | 1024 | 32 | sse-s3-etag | 76 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 283 | 31 | 2036 | 0 | 0 | 0 | 41 |
| cold-create | 248 | 30 | 1822 | 0 | 0 | 0 | 42 |
| cold-create | 276 | 27 | 55692 | 0 | 0 | 0 | 40 |
| cold-create | 296 | 35 | 2100 | 0 | 0 | 0 | 49 |
| cold-create | 280 | 34 | 55938 | 0 | 0 | 0 | 41 |
| unchanged-update | 235 | 36 | 0 | 0 | 0 | 0 | 40 |
| unchanged-update | 240 | 32 | 0 | 0 | 0 | 0 | 43 |
| unchanged-update | 260 | 36 | 0 | 0 | 0 | 0 | 36 |
| unchanged-update | 255 | 39 | 0 | 0 | 0 | 0 | 40 |
| unchanged-update | 242 | 32 | 0 | 0 | 0 | 0 | 41 |
| changed-update | 330 | 35 | 153 | 0 | 0 | 0 | 48 |
| changed-update | 323 | 38 | 150 | 0 | 0 | 0 | 41 |
| changed-update | 281 | 29 | 140 | 0 | 0 | 0 | 46 |
| changed-update | 293 | 36 | 146 | 0 | 0 | 0 | 43 |
| changed-update | 271 | 32 | 155 | 0 | 0 | 0 | 58 |
| pruned-update | 373 | 31 | 119 | 77 | 0 | 0 | 47 |
| pruned-update | 392 | 34 | 139 | 78 | 0 | 0 | 39 |
| pruned-update | 513 | 36 | 158 | 88 | 0 | 0 | 40 |
| pruned-update | 552 | 37 | 147 | 88 | 0 | 0 | 40 |
| pruned-update | 444 | 35 | 133 | 83 | 0 | 0 | 47 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 32 | 0 | 0 | 32 | 32 | 32 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| unchanged-update | 32 | 0 | 0 | 32 | 32 | 32 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| unchanged-update | 32 | 0 | 0 | 32 | 32 | 32 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| unchanged-update | 32 | 0 | 0 | 32 | 32 | 32 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| unchanged-update | 32 | 0 | 0 | 32 | 32 | 32 | 0 | 32 | 0 | 0 | 0 | 0 | 0 | 0 | 32 |
| changed-update | 32 | 0 | 0 | 32 | 32 | 32 | 3 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| changed-update | 32 | 0 | 0 | 32 | 32 | 32 | 3 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| changed-update | 32 | 0 | 0 | 32 | 32 | 32 | 3 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| changed-update | 32 | 0 | 0 | 32 | 32 | 32 | 3 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| changed-update | 32 | 0 | 0 | 32 | 32 | 32 | 3 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| pruned-update | 28 | 0 | 0 | 32 | 28 | 32 | 3 | 25 | 4 | 1 | 0 | 0 | 0 | 0 | 25 |
| pruned-update | 28 | 0 | 0 | 32 | 28 | 32 | 3 | 25 | 4 | 1 | 0 | 0 | 0 | 0 | 25 |
| pruned-update | 28 | 0 | 0 | 32 | 28 | 32 | 3 | 25 | 4 | 1 | 0 | 0 | 0 | 0 | 25 |
| pruned-update | 28 | 0 | 0 | 32 | 28 | 32 | 3 | 25 | 4 | 1 | 0 | 0 | 0 | 0 | 25 |
| pruned-update | 28 | 0 | 0 | 32 | 28 | 32 | 3 | 25 | 4 | 1 | 0 | 0 | 0 | 0 | 25 |

### Catalog Trust And Fallback

| Phase | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 0 | 32 | 0 | 0 |
| cold-create | 1 | 0 | 32 | 0 | 0 |
| cold-create | 1 | 0 | 32 | 0 | 0 |
| cold-create | 1 | 0 | 32 | 0 | 0 |
| cold-create | 1 | 0 | 32 | 0 | 0 |
| unchanged-update | 1 | 0 | 32 | 0 | 32 |
| unchanged-update | 1 | 0 | 32 | 0 | 32 |
| unchanged-update | 1 | 0 | 32 | 0 | 32 |
| unchanged-update | 1 | 0 | 32 | 0 | 32 |
| unchanged-update | 1 | 0 | 32 | 0 | 32 |
| changed-update | 1 | 0 | 32 | 0 | 29 |
| changed-update | 1 | 0 | 32 | 0 | 29 |
| changed-update | 1 | 0 | 32 | 0 | 29 |
| changed-update | 1 | 0 | 32 | 0 | 29 |
| changed-update | 1 | 0 | 32 | 0 | 29 |
| pruned-update | 1 | 0 | 28 | 0 | 25 |
| pruned-update | 1 | 0 | 28 | 0 | 25 |
| pruned-update | 1 | 0 | 28 | 0 | 25 |
| pruned-update | 1 | 0 | 28 | 0 | 25 |
| pruned-update | 1 | 0 | 28 | 0 | 25 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 84644928 | 144167470 | 0 | 84642309 | 84643592 | 33442657 | 536870912 | 0 | 33442657 |
| cold-create | 84644928 | 144167470 | 0 | 84642309 | 84643592 | 33442657 | 536870912 | 0 | 33442657 |
| cold-create | 84644928 | 144167470 | 0 | 84642309 | 101420096 | 33442657 | 536870912 | 0 | 33442657 |
| cold-create | 84644928 | 144167470 | 0 | 84642309 | 84643592 | 33442657 | 536870912 | 0 | 33442657 |
| cold-create | 84644928 | 144167470 | 0 | 84642309 | 101420096 | 33538725 | 536870912 | 0 | 33538725 |
| unchanged-update | 84644928 | 0 | 0 | 1283 | 1283 | 1283 | 536870912 | 0 | 21758935 |
| unchanged-update | 84644928 | 0 | 0 | 1283 | 1283 | 1283 | 536870912 | 0 | 21758935 |
| unchanged-update | 84644928 | 0 | 0 | 1283 | 1283 | 1283 | 536870912 | 0 | 21758935 |
| unchanged-update | 84644928 | 0 | 0 | 1283 | 1283 | 1283 | 536870912 | 0 | 21758935 |
| unchanged-update | 84644928 | 0 | 0 | 1283 | 1283 | 1283 | 536870912 | 0 | 21758935 |
| changed-update | 84644884 | 8209740 | 0 | 90408 | 91689 | 90408 | 536870912 | 0 | 21758889 |
| changed-update | 84644884 | 8209740 | 0 | 90408 | 91689 | 90408 | 536870912 | 0 | 21758889 |
| changed-update | 84644884 | 8209740 | 0 | 90408 | 91689 | 90408 | 536870912 | 0 | 21758889 |
| changed-update | 84644884 | 8209740 | 0 | 90408 | 91689 | 90408 | 536870912 | 0 | 21758889 |
| changed-update | 84644884 | 8209740 | 0 | 90408 | 91689 | 90408 | 536870912 | 0 | 21758889 |
| pruned-update | 74946198 | 8209740 | 0 | 317411 | 318555 | 317411 | 536870912 | 0 | 28834026 |
| pruned-update | 74946198 | 8209740 | 0 | 317411 | 318555 | 317411 | 536870912 | 0 | 28834026 |
| pruned-update | 74946198 | 8209740 | 0 | 317411 | 318555 | 317411 | 536870912 | 0 | 28834026 |
| pruned-update | 74946198 | 8209740 | 0 | 317411 | 318555 | 317411 | 536870912 | 0 | 28834026 |
| pruned-update | 74946198 | 8209740 | 0 | 317411 | 318555 | 317411 | 536870912 | 0 | 28834026 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 15 | 16 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 | 12 | 0 | 85 | 85 | 0 | 0 | 0 | 0 | 32 | 0 | 4 | 16 |
| cold-create | 15 | 16 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 | 10 | 0 | 89 | 89 | 0 | 0 | 0 | 0 | 32 | 0 | 4 | 17 |
| cold-create | 15 | 19 | 20 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 | 16 | 3 | 71 | 71 | 0 | 6 | 3 | 0 | 36 | 4 | 4 | 17 |
| cold-create | 15 | 16 | 17 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 70 | 11 | 0 | 103 | 103 | 0 | 0 | 0 | 0 | 32 | 0 | 4 | 17 |
| cold-create | 15 | 19 | 22 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 72 | 17 | 3 | 92 | 92 | 0 | 8 | 3 | 0 | 37 | 5 | 4 | 16 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 2 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 3 | 0 | 2 | 2 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 3 | 0 | 2 | 2 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 3 | 0 | 2 | 2 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 4 | 4 | 0 | 0 | 0 | 0 | 3 | 0 | 2 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 1 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 8 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 2 |

### Transfer Scheduler

| Phase | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 32 | 32 | 0 | 0 | 0 | 32 |
| cold-create | 32 | 32 | 0 | 0 | 0 | 32 |
| cold-create | 32 | 32 | 0 | 0 | 0 | 32 |
| cold-create | 32 | 32 | 0 | 0 | 0 | 32 |
| cold-create | 32 | 32 | 0 | 0 | 0 | 32 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 3 | 0 | 0 | 0 | 3 |
| changed-update | 3 | 3 | 0 | 0 | 0 | 3 |
| changed-update | 3 | 3 | 0 | 0 | 0 | 3 |
| changed-update | 3 | 3 | 0 | 0 | 0 | 3 |
| changed-update | 3 | 3 | 0 | 0 | 0 | 3 |
| pruned-update | 3 | 3 | 0 | 0 | 0 | 3 |
| pruned-update | 3 | 3 | 0 | 0 | 0 | 3 |
| pruned-update | 3 | 3 | 0 | 0 | 0 | 3 |
| pruned-update | 3 | 3 | 0 | 0 | 0 | 3 |
| pruned-update | 3 | 3 | 0 | 0 | 0 | 3 |

### PutObject Pressure

| Phase | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 36 | 4 | 4 | 0 | 642 | 0 | 0 |
| cold-create | 32 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 37 | 5 | 5 | 0 | 749 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 0 | 0 | 0 | 0 | 0 |

### DeleteObjects Pressure

| Phase | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 1 | 0 | 4 | 4 | 0 | 0 |
| pruned-update | 1 | 0 | 4 | 4 | 0 | 0 |
| pruned-update | 1 | 0 | 4 | 4 | 0 | 0 |
| pruned-update | 1 | 0 | 4 | 4 | 0 | 0 |
| pruned-update | 1 | 0 | 4 | 4 | 0 | 0 |

### CloudFormation Callback

| Phase | Wire attempts | Failed attempts | Retry attempts | Confirmed responses |
| --- | --- | --- | --- | --- |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |

## tiny-many / 1024 MiB / parallel 32

### Runtime

| Phase | State | Request | Deployment work | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Checksum strategy | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 55.28 | 70.234 | 2.461 | 2457 | 2.616 | 0.155 | 45 | 1024 | 32 | sse-s3-etag | 1 |
| cold-create | baseline | Create | success | 2584 | 8178618 | 57.53 | 73.506 | 2.564 | 2560 | 2.716 | 0.151 | 47 | 1024 | 32 | sse-s3-etag | 17 |
| cold-create | baseline | Create | success | 2584 | 8178618 | 57.64 | 73.078 | 2.629 | 2625 | 2.778 | 0.149 | 47 | 1024 | 32 | sse-s3-etag | 33 |
| cold-create | baseline | Create | success | 2584 | 8178618 | 57.61 | 73.253 | 2.641 | 2638 | 2.79 | 0.148 | 47 | 1024 | 32 | sse-s3-etag | 49 |
| cold-create | baseline | Create | success | 2584 | 8178618 | 57.55 | 73.043 | 2.631 | 2628 | 2.814 | 0.182 | 47 | 1024 | 32 | sse-s3-etag | 65 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 17.94 | 32.03 | 0.473 | 470 | 0.602 | 0.128 | 38 | 1024 | 32 | sse-s3-etag | 2 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 19.3 | 35.406 | 0.512 | 509 | 0.66 | 0.148 | 36 | 1024 | 32 | sse-s3-etag | 18 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 19.32 | 35.425 | 0.481 | 478 | 0.605 | 0.124 | 35 | 1024 | 32 | sse-s3-etag | 34 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 19.39 | 35.553 | 0.547 | 543 | 0.703 | 0.156 | 36 | 1024 | 32 | sse-s3-etag | 50 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 19.36 | 35.558 | 0.529 | 526 | 0.688 | 0.158 | 36 | 1024 | 32 | sse-s3-etag | 66 |
| changed-update | changed | Update | success | 2584 | 8178618 | 17.97 | 37.507 | 0.637 | 634 | 0.75 | 0.113 | 36 | 1024 | 32 | sse-s3-etag | 3 |
| changed-update | changed | Update | success | 2584 | 8178618 | 19.24 | 41.022 | 0.647 | 644 | 0.769 | 0.122 | 36 | 1024 | 32 | sse-s3-etag | 19 |
| changed-update | changed | Update | success | 2584 | 8178618 | 19.41 | 35.915 | 0.657 | 654 | 0.773 | 0.115 | 36 | 1024 | 32 | sse-s3-etag | 35 |
| changed-update | changed | Update | success | 2584 | 8178618 | 19.2 | 35.436 | 0.691 | 687 | 0.843 | 0.151 | 36 | 1024 | 32 | sse-s3-etag | 51 |
| changed-update | changed | Update | success | 2584 | 8178618 | 19.3 | 36.015 | 0.682 | 678 | 0.844 | 0.162 | 36 | 1024 | 32 | sse-s3-etag | 67 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 23.37 | 42.682 | 2.991 | 2987 | 3.144 | 0.153 | 36 | 1024 | 32 | sse-s3-etag | 4 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 25.17 | 41.753 | 2.919 | 2916 | 3.033 | 0.113 | 35 | 1024 | 32 | sse-s3-etag | 20 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 24.96 | 41.281 | 2.978 | 2975 | 3.129 | 0.15 | 36 | 1024 | 32 | sse-s3-etag | 36 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 25.12 | 41.402 | 2.952 | 2948 | 3.079 | 0.127 | 37 | 1024 | 32 | sse-s3-etag | 52 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 25.25 | 47.559 | 3.097 | 3093 | 3.215 | 0.118 | 37 | 1024 | 32 | sse-s3-etag | 68 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 301 | 36 | 2073 | 0 | 0 | 0 | 45 |
| cold-create | 289 | 40 | 2188 | 0 | 0 | 0 | 42 |
| cold-create | 261 | 40 | 2279 | 0 | 0 | 0 | 44 |
| cold-create | 269 | 42 | 2283 | 0 | 0 | 0 | 42 |
| cold-create | 285 | 36 | 2256 | 0 | 0 | 0 | 50 |
| unchanged-update | 186 | 245 | 0 | 0 | 0 | 0 | 38 |
| unchanged-update | 218 | 244 | 0 | 0 | 0 | 0 | 44 |
| unchanged-update | 180 | 257 | 0 | 0 | 0 | 0 | 38 |
| unchanged-update | 214 | 277 | 0 | 0 | 0 | 0 | 49 |
| unchanged-update | 226 | 248 | 1 | 0 | 0 | 0 | 49 |
| changed-update | 259 | 230 | 105 | 0 | 0 | 0 | 38 |
| changed-update | 253 | 240 | 105 | 0 | 0 | 0 | 43 |
| changed-update | 230 | 282 | 102 | 0 | 0 | 0 | 38 |
| changed-update | 304 | 227 | 112 | 0 | 0 | 0 | 41 |
| changed-update | 285 | 217 | 110 | 0 | 0 | 0 | 65 |
| pruned-update | 262 | 267 | 123 | 2271 | 0 | 0 | 45 |
| pruned-update | 251 | 260 | 106 | 2242 | 0 | 0 | 41 |
| pruned-update | 274 | 247 | 102 | 2287 | 0 | 0 | 45 |
| pruned-update | 278 | 172 | 97 | 2343 | 0 | 0 | 42 |
| pruned-update | 247 | 231 | 93 | 2459 | 0 | 0 | 47 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 2584 |
| unchanged-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 2584 |
| unchanged-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 2584 |
| unchanged-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 2584 |
| unchanged-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 0 | 2584 | 0 | 0 | 0 | 0 | 0 | 0 | 2584 |
| changed-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 2 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| changed-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 2 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| changed-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 2 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| changed-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 2 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| changed-update | 2584 | 0 | 0 | 2584 | 2584 | 1000 | 2 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2325 | 0 | 0 | 2584 | 2325 | 1000 | 2 | 2323 | 259 | 3 | 0 | 0 | 0 | 0 | 2323 |
| pruned-update | 2325 | 0 | 0 | 2584 | 2325 | 1000 | 2 | 2323 | 259 | 3 | 0 | 0 | 0 | 0 | 2323 |
| pruned-update | 2325 | 0 | 0 | 2584 | 2325 | 1000 | 2 | 2323 | 259 | 3 | 0 | 0 | 0 | 0 | 2323 |
| pruned-update | 2325 | 0 | 0 | 2584 | 2325 | 1000 | 2 | 2323 | 259 | 3 | 0 | 0 | 0 | 0 | 2323 |
| pruned-update | 2325 | 0 | 0 | 2584 | 2325 | 1000 | 2 | 2323 | 259 | 3 | 0 | 0 | 0 | 0 | 2323 |

### Catalog Trust And Fallback

| Phase | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 0 | 2584 | 0 | 0 |
| cold-create | 1 | 0 | 2584 | 0 | 0 |
| cold-create | 1 | 0 | 2584 | 0 | 0 |
| cold-create | 1 | 0 | 2584 | 0 | 0 |
| cold-create | 1 | 0 | 2584 | 0 | 0 |
| unchanged-update | 1 | 0 | 2584 | 0 | 2584 |
| unchanged-update | 1 | 0 | 2584 | 0 | 2584 |
| unchanged-update | 1 | 0 | 2584 | 0 | 2584 |
| unchanged-update | 1 | 0 | 2584 | 0 | 2584 |
| unchanged-update | 1 | 0 | 2584 | 0 | 2584 |
| changed-update | 1 | 0 | 2584 | 0 | 2582 |
| changed-update | 1 | 0 | 2584 | 0 | 2582 |
| changed-update | 1 | 0 | 2584 | 0 | 2582 |
| changed-update | 1 | 0 | 2584 | 0 | 2582 |
| changed-update | 1 | 0 | 2584 | 0 | 2582 |
| pruned-update | 1 | 0 | 2325 | 0 | 2323 |
| pruned-update | 1 | 0 | 2325 | 0 | 2323 |
| pruned-update | 1 | 0 | 2325 | 0 | 2323 |
| pruned-update | 1 | 0 | 2325 | 0 | 2323 |
| pruned-update | 1 | 0 | 2325 | 0 | 2323 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1159102 | 8178618 | 0 | 951943 | 1037082 | 951943 | 536870912 | 0 | 4348252 |
| cold-create | 1159102 | 8178618 | 0 | 951943 | 1037082 | 951943 | 536870912 | 0 | 4348252 |
| cold-create | 1159102 | 8178618 | 0 | 951943 | 1037082 | 951943 | 536870912 | 0 | 4348252 |
| cold-create | 1159102 | 8178618 | 0 | 951943 | 1037082 | 951943 | 536870912 | 0 | 4348252 |
| cold-create | 1159102 | 8178618 | 0 | 951943 | 1037082 | 951943 | 536870912 | 0 | 4348252 |
| unchanged-update | 1159102 | 0 | 0 | 85139 | 85139 | 85139 | 536870912 | 0 | 4348252 |
| unchanged-update | 1159102 | 0 | 0 | 85139 | 85139 | 85139 | 536870912 | 0 | 4348252 |
| unchanged-update | 1159102 | 0 | 0 | 85139 | 85139 | 85139 | 536870912 | 0 | 4348252 |
| unchanged-update | 1159102 | 0 | 0 | 85139 | 85139 | 85139 | 536870912 | 0 | 4348252 |
| unchanged-update | 1159102 | 0 | 0 | 85139 | 85139 | 85139 | 536870912 | 0 | 4348252 |
| changed-update | 1159075 | 20712 | 0 | 889 | 86026 | 85137 | 536870912 | 0 | 4348196 |
| changed-update | 1159075 | 20712 | 0 | 889 | 86026 | 85137 | 536870912 | 0 | 4348196 |
| changed-update | 1159075 | 20712 | 0 | 889 | 86026 | 85137 | 536870912 | 0 | 4348196 |
| changed-update | 1159075 | 20712 | 0 | 889 | 86026 | 85137 | 536870912 | 0 | 4348196 |
| changed-update | 1159075 | 20712 | 0 | 889 | 86026 | 85137 | 536870912 | 0 | 4348196 |
| pruned-update | 1042684 | 20712 | 0 | 914 | 77612 | 76698 | 536870912 | 0 | 3912141 |
| pruned-update | 1042684 | 20712 | 0 | 914 | 77612 | 76698 | 536870912 | 0 | 3912141 |
| pruned-update | 1042684 | 20712 | 0 | 914 | 77612 | 76698 | 536870912 | 0 | 3912141 |
| pruned-update | 1042684 | 20712 | 0 | 914 | 77612 | 76698 | 536870912 | 0 | 3912141 |
| pruned-update | 1042684 | 20712 | 0 | 914 | 77612 | 76698 | 536870912 | 0 | 3912141 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5170 | 2 | 0 | 9 | 9 | 0 | 0 | 0 | 0 | 2584 | 0 | 1 | 2 |
| cold-create | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5170 | 1 | 0 | 32 | 32 | 0 | 0 | 0 | 0 | 2584 | 0 | 1 | 2 |
| cold-create | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5170 | 2 | 0 | 21 | 21 | 0 | 0 | 0 | 0 | 2584 | 0 | 1 | 2 |
| cold-create | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5170 | 1 | 0 | 32 | 32 | 0 | 0 | 0 | 0 | 2584 | 0 | 1 | 2 |
| cold-create | 1 | 2 | 3 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 5170 | 2 | 0 | 26 | 26 | 0 | 0 | 0 | 0 | 2584 | 0 | 1 | 2 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| pruned-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| pruned-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| pruned-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| pruned-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 2 | 0 | 2 | 2 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |
| pruned-update | 2 | 3 | 4 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 1 | 0 | 3 | 3 | 0 | 0 | 0 | 0 | 2 | 0 | 2 | 1 |

### Transfer Scheduler

| Phase | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2584 | 2584 | 0 | 0 | 0 | 32 |
| cold-create | 2584 | 2584 | 0 | 0 | 0 | 32 |
| cold-create | 2584 | 2584 | 0 | 0 | 0 | 32 |
| cold-create | 2584 | 2584 | 0 | 0 | 0 | 32 |
| cold-create | 2584 | 2584 | 0 | 0 | 0 | 32 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 2 | 0 | 0 | 0 | 2 |
| changed-update | 2 | 2 | 0 | 0 | 0 | 2 |
| changed-update | 2 | 2 | 0 | 0 | 0 | 2 |
| changed-update | 2 | 2 | 0 | 0 | 0 | 2 |
| changed-update | 2 | 2 | 0 | 0 | 0 | 2 |
| pruned-update | 2 | 2 | 0 | 0 | 0 | 2 |
| pruned-update | 2 | 2 | 0 | 0 | 0 | 2 |
| pruned-update | 2 | 2 | 0 | 0 | 0 | 2 |
| pruned-update | 2 | 2 | 0 | 0 | 0 | 2 |
| pruned-update | 2 | 2 | 0 | 0 | 0 | 2 |

### PutObject Pressure

| Phase | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 2584 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 2 | 0 | 0 | 0 | 0 | 0 | 0 |

### DeleteObjects Pressure

| Phase | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 3 | 0 | 259 | 259 | 0 | 0 |
| pruned-update | 3 | 0 | 259 | 259 | 0 | 0 |
| pruned-update | 3 | 0 | 259 | 259 | 0 | 0 |
| pruned-update | 3 | 0 | 259 | 259 | 0 | 0 |
| pruned-update | 3 | 0 | 259 | 259 | 0 | 0 |

### CloudFormation Callback

| Phase | Wire attempts | Failed attempts | Retry attempts | Confirmed responses |
| --- | --- | --- | --- | --- |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| cold-create | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| unchanged-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| changed-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
| pruned-update | 1 | 0 | 0 | 1 |
