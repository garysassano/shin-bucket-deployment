# Shin Provider Benchmark Telemetry

> [!WARNING]
> Preliminary preview from an incomplete methodology-v2 run. Do not treat these values as accepted benchmark evidence.

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value        |
| ------------------- | ------------ |
| Shin telemetry rows | 60           |
| Config groups       | 3            |
| Snapshot dates      | 2026-08-03   |
| Regions             | eu-central-1 |
| Profiles            | mixed        |

## mixed / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Checksum strategy | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | ----------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.81        | 94.15        | 1.106                 | 1103                | 1.222    | 0.115  | 97             | 1024          | 32              | sse-s3-etag       | 1   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.66        | 60.051       | 1.291                 | 1288                | 1.447    | 0.155  | 90             | 1024          | 32              | sse-s3-etag       | 25  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.42        | 62.227       | 1.298                 | 1295                | 1.439    | 0.14   | 92             | 1024          | 32              | sse-s3-etag       | 37  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.65        | 59.96        | 1.267                 | 1264                | 1.395    | 0.128  | 93             | 1024          | 32              | sse-s3-etag       | 49  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.76        | 62.469       | 1.249                 | 1245                | 1.372    | 0.123  | 96             | 1024          | 32              | sse-s3-etag       | 61  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.37        | 34.389       | 0.303                 | 300                 | 0.426    | 0.122  | 40             | 1024          | 32              | sse-s3-etag       | 2   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.1         | 34.536       | 0.324                 | 321                 | 0.448    | 0.123  | 43             | 1024          | 32              | sse-s3-etag       | 26  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 16.34        | 28.598       | 0.316                 | 312                 | 0.44     | 0.124  | 40             | 1024          | 32              | sse-s3-etag       | 38  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 13.97        | 28.979       | 0.336                 | 332                 | 0.495    | 0.158  | 42             | 1024          | 32              | sse-s3-etag       | 50  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 21.49        | 34           | 0.338                 | 334                 | 0.488    | 0.15   | 44             | 1024          | 32              | sse-s3-etag       | 62  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.14        | 48.002       | 0.456                 | 452                 | 0.57     | 0.114  | 41             | 1024          | 32              | sse-s3-etag       | 3   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 21.56        | 34.286       | 0.442                 | 439                 | 0.571    | 0.128  | 41             | 1024          | 32              | sse-s3-etag       | 27  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 13.93        | 29.098       | 0.573                 | 568                 | 0.709    | 0.135  | 42             | 1024          | 32              | sse-s3-etag       | 39  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 14.04        | 29.14        | 0.584                 | 581                 | 0.738    | 0.153  | 40             | 1024          | 32              | sse-s3-etag       | 51  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.1         | 34.109       | 0.552                 | 549                 | 0.718    | 0.166  | 42             | 1024          | 32              | sse-s3-etag       | 63  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 22.58        | 53.665       | 1.092                 | 1088                | 1.207    | 0.115  | 37             | 1024          | 32              | sse-s3-etag       | 4   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.14        | 34.167       | 1.051                 | 1048                | 1.169    | 0.117  | 37             | 1024          | 32              | sse-s3-etag       | 28  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.14        | 34.275       | 1.187                 | 1184                | 1.304    | 0.116  | 37             | 1024          | 32              | sse-s3-etag       | 40  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 21.5         | 34.013       | 1.259                 | 1255                | 1.379    | 0.12   | 37             | 1024          | 32              | sse-s3-etag       | 52  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.07        | 34.076       | 1.236                 | 1233                | 1.363    | 0.126  | 40             | 1024          | 32              | sse-s3-etag       | 64  |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 182     | 31                  | 844         | 0         | 0             | 0                    | 44          |
| cold-create      | 278     | 31                  | 934         | 0         | 0             | 0                    | 43          |
| cold-create      | 342     | 34                  | 873         | 0         | 0             | 0                    | 44          |
| cold-create      | 290     | 34                  | 896         | 0         | 0             | 0                    | 43          |
| cold-create      | 283     | 33                  | 886         | 0         | 0             | 0                    | 41          |
| unchanged-update | 176     | 68                  | 0           | 0         | 0             | 0                    | 55          |
| unchanged-update | 216     | 63                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 201     | 66                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 220     | 66                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 224     | 63                  | 0           | 0         | 0             | 0                    | 46          |
| changed-update   | 206     | 72                  | 127         | 0         | 0             | 0                    | 45          |
| changed-update   | 223     | 58                  | 115         | 0         | 0             | 0                    | 41          |
| changed-update   | 307     | 69                  | 152         | 0         | 0             | 0                    | 38          |
| changed-update   | 341     | 57                  | 131         | 0         | 0             | 0                    | 50          |
| changed-update   | 305     | 80                  | 115         | 0         | 0             | 0                    | 46          |
| pruned-update    | 186     | 66                  | 106         | 675       | 0             | 0                    | 39          |
| pruned-update    | 178     | 72                  | 121         | 616       | 0             | 0                    | 42          |
| pruned-update    | 276     | 55                  | 119         | 667       | 0             | 0                    | 45          |
| pruned-update    | 279     | 64                  | 135         | 666       | 0             | 0                    | 49          |
| pruned-update    | 301     | 58                  | 136         | 679       | 0             | 0                    | 42          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 536870912           | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 536870912           | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 536870912           | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 536870912           | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 536870912           | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 536870912           | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 536870912           | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 536870912           | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 536870912           | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 536870912           | 0                             | 23653166                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 536870912           | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 536870912           | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 536870912           | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 536870912           | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 536870912           | 0                             | 23655417                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 536870912           | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 536870912           | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 536870912           | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 536870912           | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 536870912           | 0                             | 20423509                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 6                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 3                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 3                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 10          | 10             | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 32             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 32             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 32             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 32             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 32             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### CopyObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### DeleteObjects Pressure

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |

### CloudFormation Callback

| Phase            | Wire attempts | Failed attempts | Retry attempts | Confirmed responses |
| ---------------- | ------------- | --------------- | -------------- | ------------------- |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |

## mixed / 2048 MiB / max concurrency 64

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Checksum strategy | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | ----------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.76        | 92.223       | 0.884                 | 881                 | 0.997    | 0.113  | 92             | 2048          | 64              | sse-s3-etag       | 5   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.66        | 62.452       | 0.806                 | 803                 | 0.928    | 0.121  | 105            | 2048          | 64              | sse-s3-etag       | 29  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.04        | 62.282       | 0.785                 | 781                 | 0.911    | 0.125  | 100            | 2048          | 64              | sse-s3-etag       | 41  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.57        | 62.188       | 0.802                 | 799                 | 0.919    | 0.117  | 112            | 2048          | 64              | sse-s3-etag       | 53  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.62        | 62.58        | 0.792                 | 789                 | 0.919    | 0.126  | 105            | 2048          | 64              | sse-s3-etag       | 65  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 14.05        | 29.21        | 0.249                 | 246                 | 0.365    | 0.115  | 41             | 2048          | 64              | sse-s3-etag       | 6   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 13.95        | 29.02        | 0.277                 | 274                 | 0.402    | 0.125  | 41             | 2048          | 64              | sse-s3-etag       | 30  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.11        | 33.712       | 0.261                 | 257                 | 0.382    | 0.121  | 41             | 2048          | 64              | sse-s3-etag       | 42  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 13.87        | 29.029       | 0.262                 | 259                 | 0.384    | 0.122  | 39             | 2048          | 64              | sse-s3-etag       | 54  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 14.03        | 29.049       | 0.27                  | 267                 | 0.386    | 0.115  | 40             | 2048          | 64              | sse-s3-etag       | 66  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 14.16        | 46.883       | 0.495                 | 492                 | 0.614    | 0.118  | 41             | 2048          | 64              | sse-s3-etag       | 7   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 16.33        | 29.082       | 0.474                 | 470                 | 0.628    | 0.154  | 41             | 2048          | 64              | sse-s3-etag       | 31  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.1         | 33.959       | 0.385                 | 382                 | 0.503    | 0.118  | 40             | 2048          | 64              | sse-s3-etag       | 43  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 16.32        | 29.274       | 0.411                 | 408                 | 0.53     | 0.118  | 41             | 2048          | 64              | sse-s3-etag       | 55  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 14.19        | 29.13        | 0.383                 | 379                 | 0.499    | 0.116  | 43             | 2048          | 64              | sse-s3-etag       | 67  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 21.55        | 51.321       | 1.183                 | 1180                | 1.308    | 0.125  | 38             | 2048          | 64              | sse-s3-etag       | 8   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 21.52        | 33.999       | 1.138                 | 1134                | 1.297    | 0.159  | 40             | 2048          | 64              | sse-s3-etag       | 32  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 21.47        | 34.203       | 1.037                 | 1033                | 1.191    | 0.153  | 38             | 2048          | 64              | sse-s3-etag       | 44  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.14        | 34.104       | 1.069                 | 1065                | 1.22     | 0.151  | 38             | 2048          | 64              | sse-s3-etag       | 56  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.04        | 34.242       | 1.168                 | 1164                | 1.292    | 0.124  | 38             | 2048          | 64              | sse-s3-etag       | 68  |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 260     | 33                  | 542         | 0         | 0             | 0                    | 44          |
| cold-create      | 166     | 35                  | 564         | 0         | 0             | 0                    | 37          |
| cold-create      | 162     | 35                  | 534         | 0         | 0             | 0                    | 48          |
| cold-create      | 175     | 32                  | 540         | 0         | 0             | 0                    | 50          |
| cold-create      | 174     | 30                  | 531         | 0         | 0             | 0                    | 52          |
| unchanged-update | 147     | 57                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 161     | 66                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 164     | 55                  | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 159     | 57                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 153     | 70                  | 0           | 0         | 0             | 0                    | 42          |
| changed-update   | 254     | 72                  | 126         | 0         | 0             | 0                    | 38          |
| changed-update   | 239     | 67                  | 110         | 0         | 0             | 0                    | 52          |
| changed-update   | 156     | 65                  | 116         | 0         | 0             | 0                    | 44          |
| changed-update   | 170     | 68                  | 125         | 0         | 0             | 0                    | 43          |
| changed-update   | 154     | 67                  | 110         | 0         | 0             | 0                    | 47          |
| pruned-update    | 235     | 66                  | 125         | 696       | 0             | 0                    | 42          |
| pruned-update    | 263     | 69                  | 121         | 623       | 0             | 0                    | 41          |
| pruned-update    | 169     | 73                  | 114         | 620       | 0             | 0                    | 42          |
| pruned-update    | 171     | 64                  | 153         | 623       | 0             | 0                    | 36          |
| pruned-update    | 167     | 54                  | 113         | 757       | 0             | 0                    | 51          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 1073741824          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 1073741824          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 1073741824          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 1073741824          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 1073741824          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 1073741824          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 1073741824          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 1073741824          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 1073741824          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 1073741824          | 0                             | 23653166                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 1073741824          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 1073741824          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 1073741824          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 1073741824          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 1073741824          | 0                             | 23655417                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 1073741824          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 1073741824          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 1073741824          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 1073741824          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 1073741824          | 0                             | 20423509                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 13          | 13             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 5                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 44          | 44             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 6                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 2                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 64             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 64             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 64             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 64             |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 64             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### CopyObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### DeleteObjects Pressure

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |

### CloudFormation Callback

| Phase            | Wire attempts | Failed attempts | Retry attempts | Confirmed responses |
| ---------------- | ------------- | --------------- | -------------- | ------------------- |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |

## mixed / 4096 MiB / max concurrency 128

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Checksum strategy | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | ----------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.98        | 62.788       | 0.801                 | 798                 | 0.931    | 0.13   | 119            | 4096          | 128             | sse-s3-etag       | 13  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.61        | 62.362       | 0.757                 | 754                 | 0.874    | 0.117  | 133            | 4096          | 128             | sse-s3-etag       | 73  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.05        | 62.844       | 0.782                 | 777                 | 0.936    | 0.154  | 125            | 4096          | 128             | sse-s3-etag       | 85  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.52        | 62.224       | 0.887                 | 884                 | 1.041    | 0.153  | 127            | 4096          | 128             | sse-s3-etag       | 97  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.66        | 62.305       | 0.728                 | 725                 | 0.847    | 0.119  | 126            | 4096          | 128             | sse-s3-etag       | 109 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 16.29        | 29.124       | 0.253                 | 250                 | 0.369    | 0.116  | 43             | 4096          | 128             | sse-s3-etag       | 14  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 14.03        | 29.259       | 0.284                 | 281                 | 0.4      | 0.116  | 42             | 4096          | 128             | sse-s3-etag       | 74  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.13        | 34.03        | 0.28                  | 277                 | 0.4      | 0.119  | 42             | 4096          | 128             | sse-s3-etag       | 86  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 21.42        | 34.066       | 0.294                 | 291                 | 0.422    | 0.128  | 42             | 4096          | 128             | sse-s3-etag       | 98  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 16.32        | 28.959       | 0.296                 | 293                 | 0.412    | 0.116  | 41             | 4096          | 128             | sse-s3-etag       | 110 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 14.03        | 29.192       | 0.474                 | 471                 | 0.59     | 0.116  | 40             | 4096          | 128             | sse-s3-etag       | 15  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 16.45        | 29.092       | 0.435                 | 432                 | 0.552    | 0.116  | 40             | 4096          | 128             | sse-s3-etag       | 75  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 21.48        | 34.186       | 0.44                  | 437                 | 0.559    | 0.119  | 42             | 4096          | 128             | sse-s3-etag       | 87  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.02        | 35.336       | 0.464                 | 460                 | 0.583    | 0.119  | 41             | 4096          | 128             | sse-s3-etag       | 99  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 16.36        | 29.079       | 0.495                 | 491                 | 0.613    | 0.118  | 42             | 4096          | 128             | sse-s3-etag       | 111 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.24        | 34.296       | 1.106                 | 1103                | 1.224    | 0.117  | 39             | 4096          | 128             | sse-s3-etag       | 16  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.34        | 34.316       | 1.425                 | 1422                | 1.546    | 0.12   | 39             | 4096          | 128             | sse-s3-etag       | 76  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.02        | 33.707       | 1.162                 | 1159                | 1.28     | 0.118  | 41             | 4096          | 128             | sse-s3-etag       | 88  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 21.54        | 34.503       | 1.262                 | 1258                | 1.378    | 0.116  | 39             | 4096          | 128             | sse-s3-etag       | 100 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.18        | 34.337       | 1.118                 | 1115                | 1.233    | 0.115  | 40             | 4096          | 128             | sse-s3-etag       | 112 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 208     | 34                  | 509         | 0         | 0             | 0                    | 46          |
| cold-create      | 216     | 34                  | 462         | 0         | 0             | 0                    | 40          |
| cold-create      | 239     | 31                  | 453         | 0         | 0             | 0                    | 52          |
| cold-create      | 248     | 28                  | 559         | 0         | 0             | 0                    | 47          |
| cold-create      | 224     | 32                  | 420         | 0         | 0             | 0                    | 47          |
| unchanged-update | 148     | 56                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 166     | 67                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 174     | 57                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 190     | 57                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 175     | 54                  | 0           | 0         | 0             | 0                    | 62          |
| changed-update   | 231     | 70                  | 128         | 0         | 0             | 0                    | 41          |
| changed-update   | 213     | 65                  | 110         | 0         | 0             | 0                    | 42          |
| changed-update   | 220     | 56                  | 119         | 0         | 0             | 0                    | 40          |
| changed-update   | 236     | 65                  | 110         | 0         | 0             | 0                    | 49          |
| changed-update   | 267     | 64                  | 122         | 0         | 0             | 0                    | 37          |
| pruned-update    | 223     | 69                  | 115         | 631       | 0             | 0                    | 48          |
| pruned-update    | 218     | 65                  | 104         | 974       | 0             | 0                    | 45          |
| pruned-update    | 223     | 73                  | 135         | 672       | 0             | 0                    | 41          |
| pruned-update    | 275     | 78                  | 115         | 734       | 0             | 0                    | 36          |
| pruned-update    | 216     | 73                  | 117         | 640       | 0             | 0                    | 50          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 442     | 0        | 0       | 0                   | 0                             | 0                             | 442      | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| unchanged-update | 442     | 0        | 0       | 442                 | 442                           | 442                           | 0        | 442     | 0                | 0              | 0                     | 0      | 0                 | 0         | 442           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| changed-update   | 442     | 0        | 0       | 442                 | 442                           | 442                           | 6        | 436     | 0                | 0              | 0                     | 0      | 0                 | 0         | 436           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |
| pruned-update    | 397     | 0        | 0       | 442                 | 397                           | 442                           | 6        | 391     | 45               | 1              | 0                     | 0      | 0                 | 0         | 391           |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| cold-create      | 1                | 0                  | 442             | 0                      | 0            |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| unchanged-update | 1                | 0                  | 442             | 0                      | 442          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| changed-update   | 1                | 0                  | 442             | 0                      | 436          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |
| pruned-update    | 1                | 0                  | 397             | 0                      | 391          |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 2147483648          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 2147483648          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 2147483648          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 2147483648          | 0                             | 23653166                   |
| cold-create      | 19951748         | 52904649       | 0            | 19916130             | 19931582             | 19916130            | 2147483648          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 2147483648          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 2147483648          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 2147483648          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 2147483648          | 0                             | 23653166                   |
| unchanged-update | 19951748         | 0              | 0            | 15452                | 15452                | 15452               | 2147483648          | 0                             | 23653166                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 2147483648          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 2147483648          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 2147483648          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 2147483648          | 0                             | 23655417                   |
| changed-update   | 19952874         | 1379190        | 0            | 543947               | 559398               | 543947              | 2147483648          | 0                             | 23655417                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 2147483648          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 2147483648          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 2147483648          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 2147483648          | 0                             | 20423509                   |
| pruned-update    | 18363632         | 1379190        | 0            | 518191               | 532083               | 518191              | 2147483648          | 0                             | 20423509                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 254         | 254            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 5                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 264         | 264            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 272         | 272            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 272         | 272            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 6                   |
| cold-create      | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 128         | 128            | 0              | 0             | 0                    | 0                    | 442           | 0            | 3                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 8           | 8              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 6             | 0            | 3                | 3                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 128            |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 128            |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 128            |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 128            |
| cold-create      | 442       | 442       | 0      | 0         | 0        | 128            |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| changed-update   | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |
| pruned-update    | 6         | 6         | 0      | 0         | 0        | 6              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 442           | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 6             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### CopyObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

### DeleteObjects Pressure

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  |

### CloudFormation Callback

| Phase            | Wire attempts | Failed attempts | Retry attempts | Confirmed responses |
| ---------------- | ------------- | --------------- | -------------- | ------------------- |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| cold-create      | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| unchanged-update | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| changed-update   | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
| pruned-update    | 1             | 0               | 0              | 1                   |
