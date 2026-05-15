# Shin Provider Benchmark Telemetry

Generated from Shin rows in `benchmarks/results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field | Value |
| --- | --- |
| Shin telemetry rows | 52 |
| Config groups | 13 |
| Snapshot dates | 2026-05-14, 2026-05-15 |
| Regions | ap-southeast-2 |
| Profiles | tiny-many, large-few, mixed |

## large-few / 2048 MiB / parallel 32

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 32 | 144167470 | 58.34 | 109.234 | 1.006 | 961 | 1.17 | 0.164 | 244 | 2048 | 32 | 49 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 14.1 | 56.202 | 0.205 | 160 | 0.206 | null | 244 | 2048 | 32 | 50 |
| changed-update | changed | Update | success | 32 | 144167470 | 14.15 | 62.941 | 0.335 | 295 | 0.335 | null | 244 | 2048 | 32 | 51 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 14.12 | 58.752 | 0.85 | 815 | 0.85 | null | 244 | 2048 | 32 | 52 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 173 | 28 | 759 | 0 | 0 | 0 |
| unchanged-update | 117 | 41 | 0 | 0 | 0 | 0 |
| changed-update | 114 | 38 | 142 | 0 | 0 | 0 |
| pruned-update | 112 | 42 | 586 | 73 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 33 | 0 | 0 | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 33 | 0 | 0 | 33 | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 33 |
| changed-update | 33 | 0 | 0 | 33 | 4 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| pruned-update | 29 | 0 | 0 | 33 | 29 | 0 | 4 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 623550 | 144167568 | 0 | 619754 | 620870 | 619754 |
| unchanged-update | 623550 | 0 | 0 | 1116 | 1116 | 1116 |
| changed-update | 623548 | 8209837 | 0 | 198305 | 199420 | 198305 |
| pruned-update | 541970 | 125354335 | 0 | 538598 | 539592 | 538598 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 332 | 1 | 0 | 302 | 302 | 0 | 132 | 0 | 0 | 110 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 1 | 2 | 3 | 0 | 0 | 42 | 1 | 0 | 46 | 46 | 0 | 16 | 0 | 0 | 8 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 292 | 1 | 0 | 275 | 275 | 0 | 116 | 0 | 0 | 99 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## large-few / 4096 MiB / parallel 64

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 32 | 144167470 | 58.39 | 104.986 | 0.761 | 711 | 0.889 | 0.127 | 245 | 4096 | 64 | 41 |
| unchanged-update | baseline | Update | success | 32 | 144167470 | 14.07 | 56.206 | 0.194 | 147 | 0.195 | null | 245 | 4096 | 64 | 42 |
| changed-update | changed | Update | success | 32 | 144167470 | 14.15 | 59.504 | 0.467 | 418 | 0.467 | null | 245 | 4096 | 64 | 43 |
| pruned-update | pruned | Update | success | 28 | 125354239 | 14.13 | 59.331 | 0.805 | 763 | 0.806 | null | 245 | 4096 | 64 | 44 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 234 | 36 | 441 | 0 | 0 | 0 |
| unchanged-update | 108 | 38 | 0 | 0 | 0 | 0 |
| changed-update | 257 | 39 | 121 | 0 | 0 | 0 |
| pruned-update | 247 | 42 | 395 | 77 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 33 | 0 | 0 | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 33 | 0 | 0 | 33 | 0 | 33 | 0 | 0 | 0 | 0 | 0 | 0 | 33 |
| changed-update | 33 | 0 | 0 | 33 | 4 | 29 | 0 | 0 | 0 | 0 | 0 | 0 | 29 |
| pruned-update | 29 | 0 | 0 | 33 | 29 | 0 | 4 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 623550 | 144167568 | 0 | 619754 | 620870 | 619754 |
| unchanged-update | 623550 | 0 | 0 | 1116 | 1116 | 1116 |
| changed-update | 623548 | 8209837 | 0 | 198305 | 199420 | 198305 |
| pruned-update | 541970 | 125354335 | 0 | 538598 | 539592 | 538598 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 332 | 1 | 0 | 398 | 398 | 0 | 132 | 0 | 0 | 109 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 1 | 2 | 3 | 0 | 0 | 42 | 1 | 0 | 46 | 46 | 0 | 16 | 0 | 0 | 9 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 292 | 1 | 0 | 323 | 323 | 0 | 116 | 0 | 0 | 97 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## mixed / 5120 MiB / parallel 256

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 442 | 52904649 | 74.4 | 278.612 | 1.016 | 974 | 1.149 | 0.132 | 384 | 5120 | 256 | 93 |
| unchanged-update | baseline | Update | success | 442 | 52904649 | 31.07 | 117.369 | 0.244 | 196 | 0.245 | null | 441 | 5120 | 256 | 94 |
| changed-update | changed | Update | success | 442 | 52904649 | 30.4 | 177.187 | 0.424 | 384 | 0.424 | null | 544 | 5120 | 256 | 95 |
| pruned-update | pruned | Update | success | 397 | 48185955 | 38.6 | 182.584 | 1.3 | 1252 | 1.301 | null | 623 | 5120 | 256 | 96 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 275 | 32 | 666 | 0 | 0 | 0 |
| unchanged-update | 116 | 79 | 0 | 0 | 0 | 0 |
| changed-update | 231 | 60 | 91 | 0 | 0 | 0 |
| pruned-update | 115 | 75 | 341 | 721 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 443 | 0 | 0 | 0 | 443 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 443 | 0 | 0 | 443 | 0 | 443 | 0 | 0 | 0 | 0 | 0 | 0 | 443 |
| changed-update | 443 | 0 | 0 | 443 | 7 | 436 | 0 | 0 | 0 | 0 | 0 | 0 | 436 |
| pruned-update | 398 | 0 | 0 | 443 | 398 | 0 | 45 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 424388 | 52904743 | 0 | 375581 | 388709 | 375581 |
| unchanged-update | 424388 | 0 | 0 | 13128 | 13128 | 13128 |
| changed-update | 424378 | 1379283 | 0 | 294601 | 307725 | 294601 |
| pruned-update | 383743 | 48186047 | 0 | 339836 | 351663 | 339836 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 4432 | 1 | 0 | 1748 | 1748 | 0 | 1772 | 0 | 0 | 21 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 1 | 2 | 3 | 0 | 0 | 72 | 1 | 0 | 96 | 96 | 0 | 28 | 0 | 0 | 3 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 3982 | 1 | 0 | 1568 | 1568 | 0 | 1592 | 0 | 0 | 21 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## mixed / 6144 MiB / parallel 256

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 442 | 52904649 | 70.42 | 302.637 | 0.981 | 932 | 1.148 | 0.167 | 378 | 6144 | 256 | 89 |
| unchanged-update | baseline | Update | success | 442 | 52904649 | 33.32 | 133.789 | 0.252 | 203 | 0.253 | null | 449 | 6144 | 256 | 90 |
| changed-update | changed | Update | success | 442 | 52904649 | 30.13 | 171.867 | 0.285 | 247 | 0.285 | null | 561 | 6144 | 256 | 91 |
| pruned-update | pruned | Update | success | 397 | 48185955 | 40.7 | 145.282 | 1.429 | 1378 | 1.43 | null | 625 | 6144 | 256 | 92 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 165 | 38 | 728 | 0 | 0 | 0 |
| unchanged-update | 130 | 71 | 0 | 0 | 0 | 0 |
| changed-update | 95 | 64 | 87 | 0 | 0 | 0 |
| pruned-update | 249 | 74 | 353 | 700 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 443 | 0 | 0 | 0 | 443 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 443 | 0 | 0 | 443 | 0 | 443 | 0 | 0 | 0 | 0 | 0 | 0 | 443 |
| changed-update | 443 | 0 | 0 | 443 | 7 | 436 | 0 | 0 | 0 | 0 | 0 | 0 | 436 |
| pruned-update | 398 | 0 | 0 | 443 | 398 | 0 | 45 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 424388 | 52904743 | 0 | 375581 | 388709 | 375581 |
| unchanged-update | 424388 | 0 | 0 | 13128 | 13128 | 13128 |
| changed-update | 424378 | 1379283 | 0 | 294601 | 307725 | 294601 |
| pruned-update | 383743 | 48186047 | 0 | 339836 | 351663 | 339836 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 4432 | 1 | 0 | 1792 | 1792 | 0 | 1772 | 0 | 0 | 22 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 1 | 2 | 3 | 0 | 0 | 72 | 1 | 0 | 83 | 83 | 0 | 28 | 0 | 0 | 4 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 3982 | 1 | 0 | 1063 | 1063 | 0 | 1592 | 0 | 0 | 27 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 1024 MiB / parallel 16

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 65.95 | 120.229 | 5.429 | 5380 | 5.558 | 0.129 | 83 | 1024 | 16 | 29 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 14.09 | 65.379 | 0.441 | 398 | 0.442 | null | 107 | 1024 | 16 | 30 |
| changed-update | changed | Update | success | 2584 | 8178618 | 14.19 | 56.726 | 0.535 | 491 | 0.535 | null | 107 | 1024 | 16 | 31 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 20.13 | 76.995 | 6.63 | 6585 | 6.631 | null | 108 | 1024 | 16 | 32 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 198 | 41 | 5140 | 0 | 0 | 0 |
| unchanged-update | 130 | 265 | 1 | 0 | 0 | 0 |
| changed-update | 107 | 255 | 127 | 0 | 0 | 0 |
| pruned-update | 114 | 230 | 5404 | 835 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 127 | 127 | 0 | 10340 | 0 | 0 | 2 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 37 | 37 | 0 | 12 | 0 | 0 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 122 | 122 | 0 | 9304 | 0 | 0 | 2 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 1024 MiB / parallel 32

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 66.1 | 120.069 | 3.261 | 3207 | 3.386 | 0.124 | 97 | 1024 | 32 | 25 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 14.15 | 55.952 | 0.427 | 377 | 0.427 | null | 117 | 1024 | 32 | 26 |
| changed-update | changed | Update | success | 2584 | 8178618 | 14.16 | 65.522 | 0.634 | 587 | 0.634 | null | 117 | 1024 | 32 | 27 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 20.13 | 77.004 | 4.12 | 4085 | 4.121 | null | 144 | 1024 | 32 | 28 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 328 | 34 | 2843 | 0 | 0 | 0 |
| unchanged-update | 117 | 257 | 1 | 0 | 0 | 0 |
| changed-update | 227 | 240 | 118 | 0 | 0 | 0 |
| pruned-update | 195 | 187 | 2848 | 852 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 2 | 0 | 275 | 275 | 0 | 10340 | 0 | 0 | 2 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 21 | 21 | 0 | 12 | 0 | 0 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 212 | 212 | 0 | 9304 | 0 | 0 | 2 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 2048 MiB / parallel 32

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 76.21 | 197.621 | 2.847 | 2796 | 3.015 | 0.167 | 94 | 2048 | 32 | 65 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 30.45 | 159.842 | 0.472 | 433 | 0.473 | null | 114 | 2048 | 32 | 66 |
| changed-update | changed | Update | success | 2584 | 8178618 | 44.75 | 158.925 | 0.592 | 550 | 0.592 | null | 114 | 2048 | 32 | 67 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 26.82 | 156.415 | 4.125 | 4081 | 4.125 | null | 138 | 2048 | 32 | 68 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 269 | 36 | 2490 | 0 | 0 | 0 |
| unchanged-update | 172 | 258 | 1 | 0 | 0 | 0 |
| changed-update | 226 | 209 | 112 | 0 | 0 | 0 |
| pruned-update | 204 | 260 | 2768 | 845 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 236 | 236 | 0 | 10340 | 0 | 0 | 2 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 21 | 21 | 0 | 12 | 0 | 0 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 336 | 336 | 0 | 9304 | 0 | 0 | 2 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 2048 MiB / parallel 64

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 73.33 | 131.105 | 2.074 | 2029 | 2.243 | 0.168 | 122 | 2048 | 64 | 1 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 15.75 | 59.36 | 0.416 | 371 | 0.416 | null | 150 | 2048 | 64 | 2 |
| changed-update | changed | Update | success | 2584 | 8178618 | 18.02 | 76.166 | 0.616 | 564 | 0.616 | null | 181 | 2048 | 64 | 3 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 24.08 | 82.044 | 2.959 | 2911 | 2.959 | null | 219 | 2048 | 64 | 4 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 234 | 30 | 1765 | 0 | 0 | 0 |
| unchanged-update | 110 | 257 | 1 | 0 | 0 | 0 |
| changed-update | 208 | 233 | 120 | 0 | 0 | 0 |
| pruned-update | 234 | 254 | 1599 | 822 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 492 | 492 | 0 | 10340 | 0 | 0 | 2 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 43 | 43 | 0 | 12 | 0 | 0 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 548 | 548 | 0 | 9304 | 0 | 0 | 2 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 4096 MiB / parallel 64

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 64.33 | 119.549 | 1.889 | 1836 | 2.054 | 0.165 | 119 | 4096 | 64 | 57 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 14.13 | 55.431 | 0.406 | 359 | 0.406 | null | 121 | 4096 | 64 | 58 |
| changed-update | changed | Update | success | 2584 | 8178618 | 14.2 | 55.315 | 0.655 | 602 | 0.655 | null | 165 | 4096 | 64 | 59 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 14.1 | 62.055 | 2.887 | 2849 | 2.888 | null | 219 | 4096 | 64 | 60 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 256 | 35 | 1544 | 0 | 0 | 0 |
| unchanged-update | 119 | 236 | 1 | 0 | 0 | 0 |
| changed-update | 209 | 280 | 110 | 0 | 0 | 0 |
| pruned-update | 238 | 294 | 1477 | 837 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 463 | 463 | 0 | 10340 | 0 | 0 | 3 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 20 | 20 | 0 | 12 | 0 | 0 | 3 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 551 | 551 | 0 | 9304 | 0 | 0 | 3 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 4096 MiB / parallel 128

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 67.55 | 130.051 | 1.37 | 1319 | 1.502 | 0.132 | 169 | 4096 | 128 | 9 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 17.73 | 67.21 | 0.424 | 379 | 0.425 | null | 177 | 4096 | 128 | 10 |
| changed-update | changed | Update | success | 2584 | 8178618 | 18.17 | 73.82 | 0.651 | 603 | 0.652 | null | 231 | 4096 | 128 | 11 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 17.45 | 67.999 | 2.191 | 2149 | 2.191 | null | 352 | 4096 | 128 | 12 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 217 | 35 | 1065 | 0 | 0 | 0 |
| unchanged-update | 113 | 263 | 1 | 0 | 0 | 0 |
| changed-update | 220 | 268 | 113 | 0 | 0 | 0 |
| pruned-update | 173 | 268 | 886 | 821 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 939 | 939 | 0 | 10340 | 0 | 0 | 3 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 53 | 53 | 0 | 12 | 0 | 0 | 2 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 592 | 592 | 0 | 9304 | 0 | 0 | 3 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 5120 MiB / parallel 256

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 82.19 | 149.125 | 1.394 | 1353 | 1.528 | 0.133 | 265 | 5120 | 256 | 77 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 34.72 | 116.075 | 0.384 | 323 | 0.385 | null | 332 | 5120 | 256 | 78 |
| changed-update | changed | Update | success | 2584 | 8178618 | 39.28 | 137.317 | 0.524 | 477 | 0.525 | null | 493 | 5120 | 256 | 79 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 41.46 | 142.043 | 1.997 | 1951 | 1.998 | null | 648 | 5120 | 256 | 80 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 218 | 39 | 1096 | 0 | 0 | 0 |
| unchanged-update | 118 | 202 | 1 | 0 | 0 | 0 |
| changed-update | 119 | 241 | 116 | 0 | 0 | 0 |
| pruned-update | 129 | 295 | 710 | 815 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 1786 | 1786 | 0 | 10340 | 0 | 0 | 3 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 25 | 25 | 0 | 12 | 0 | 0 | 3 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 1434 | 1434 | 0 | 9304 | 0 | 0 | 3 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 6144 MiB / parallel 256

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 73.08 | 152.468 | 1.501 | 1387 | 1.672 | 0.171 | 265 | 6144 | 256 | 73 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 32.54 | 109.784 | 0.371 | 326 | 0.371 | null | 321 | 6144 | 256 | 74 |
| changed-update | changed | Update | success | 2584 | 8178618 | 26.29 | 122.842 | 0.648 | 608 | 0.648 | null | 456 | 6144 | 256 | 75 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 45.72 | 127.765 | 2.278 | 2228 | 2.278 | null | 658 | 6144 | 256 | 76 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 187 | 34 | 1165 | 0 | 0 | 0 |
| unchanged-update | 109 | 214 | 1 | 0 | 0 | 0 |
| changed-update | 226 | 266 | 114 | 0 | 0 | 0 |
| pruned-update | 190 | 267 | 858 | 910 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 1961 | 1961 | 0 | 10340 | 0 | 0 | 4 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 30 | 30 | 0 | 12 | 0 | 0 | 3 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 1847 | 1847 | 0 | 9304 | 0 | 0 | 4 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |

## tiny-many / 10240 MiB / parallel 320

### Runtime

| Phase | State | Request | Status | Files | Bytes | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max transfers | Row |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | baseline | Create | success | 2584 | 8178618 | 60.11 | 113.222 | 1.283 | 1242 | 1.458 | 0.174 | 315 | 10240 | 320 | 17 |
| unchanged-update | baseline | Update | success | 2584 | 8178618 | 14.14 | 75.757 | 0.389 | 338 | 0.39 | null | 377 | 10240 | 320 | 18 |
| changed-update | changed | Update | success | 2584 | 8178618 | 14.41 | 64.008 | 0.648 | 602 | 0.649 | null | 425 | 10240 | 320 | 19 |
| pruned-update | pruned | Update | success | 2325 | 7332858 | 14.2 | 66.315 | 1.986 | 1938 | 1.986 | null | 630 | 10240 | 320 | 20 |

### Provider Phase Timing

| Phase | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 257 | 34 | 950 | 0 | 0 | 0 |
| unchanged-update | 124 | 211 | 1 | 0 | 0 | 0 |
| changed-update | 194 | 269 | 136 | 0 | 0 | 0 |
| pruned-update | 231 | 220 | 679 | 804 | 0 | 0 |

### Object Work

| Phase | Planned | Filtered | Markers | Destination objects | Uploaded | Skipped | Deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 2585 | 0 | 0 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 2585 | 0 | 0 | 2585 | 0 | 2585 | 0 | 0 | 0 | 0 | 0 | 0 | 2585 |
| changed-update | 2585 | 0 | 0 | 2585 | 3 | 2582 | 0 | 0 | 0 | 0 | 0 | 0 | 2582 |
| pruned-update | 2326 | 0 | 0 | 2585 | 2326 | 0 | 259 | 1 | 0 | 0 | 0 | 0 | 0 |

### Bytes And Memory Window

| Phase | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1063994 | 8178716 | 0 | 782630 | 856774 | 782630 |
| unchanged-update | 1063994 | 0 | 0 | 74144 | 74144 | 74144 |
| changed-update | 1063981 | 20809 | 0 | 803 | 74938 | 74135 |
| pruned-update | 957275 | 7332954 | 0 | 703941 | 770797 | 703941 |

### Source Range Reads

| Phase | Planned blocks | Fetched blocks | Get attempts | Get retries | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Active readers high |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| cold-create | 1 | 2 | 3 | 0 | 0 | 25852 | 1 | 0 | 2181 | 2181 | 0 | 10340 | 0 | 0 | 6 |
| unchanged-update | 1 | 1 | 2 | 0 | 0 | 2 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| changed-update | 2 | 3 | 4 | 0 | 0 | 32 | 1 | 0 | 34 | 34 | 0 | 12 | 0 | 0 | 3 |
| pruned-update | 1 | 2 | 3 | 0 | 0 | 23262 | 1 | 0 | 1724 | 1724 | 0 | 9304 | 0 | 0 | 6 |

### PutObject Pressure

| Phase | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| --- | --- | --- | --- | --- | --- | --- |
| cold-create | 0 | 0 | 0 | 0 | 0 | 0 |
| unchanged-update | 0 | 0 | 0 | 0 | 0 | 0 |
| changed-update | 0 | 0 | 0 | 0 | 0 | 0 |
| pruned-update | 0 | 0 | 0 | 0 | 0 | 0 |
