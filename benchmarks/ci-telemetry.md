# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-09-05                  |
| Regions             | eu-central-1                |
| Profiles            | large-few, mixed, tiny-many |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.4         | 72.445       | 2                     | 1997                | 2.134    | 0.134  | 128            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.1         | 69.677       | 2.011                 | 2008                | 2.105    | 0.094  | 101            | 1024          | 32              | 53  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 71.923       | 1.967                 | 1964                | 2.089    | 0.121  | 116            | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.36        | 72.604       | 1.892                 | 1889                | 2.014    | 0.122  | 126            | 1024          | 32              | 149 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.65        | 71.352       | 2.126                 | 2122                | 2.249    | 0.123  | 142            | 1024          | 32              | 197 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.61        | 34.157       | 0.236                 | 233                 | 0.332    | 0.096  | 32             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.89        | 37.709       | 0.237                 | 234                 | 0.362    | 0.124  | 32             | 1024          | 32              | 54  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.28        | 34.274       | 0.298                 | 295                 | 0.419    | 0.121  | 32             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.51        | 35.172       | 0.241                 | 237                 | 0.373    | 0.132  | 32             | 1024          | 32              | 150 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.84        | 35.099       | 0.239                 | 236                 | 0.366    | 0.126  | 32             | 1024          | 32              | 198 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.66        | 34.899       | 0.452                 | 449                 | 0.579    | 0.127  | 43             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.88        | 38.442       | 0.528                 | 525                 | 0.66     | 0.132  | 41             | 1024          | 32              | 55  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.51        | 40.835       | 0.525                 | 522                 | 0.647    | 0.122  | 40             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.75        | 42.507       | 0.493                 | 490                 | 0.611    | 0.118  | 41             | 1024          | 32              | 151 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.96        | 33.089       | 0.427                 | 424                 | 0.55     | 0.122  | 43             | 1024          | 32              | 199 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.81        | 41.174       | 0.511                 | 508                 | 0.638    | 0.126  | 39             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.07        | 39.079       | 0.638                 | 635                 | 0.756    | 0.117  | 39             | 1024          | 32              | 56  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.47        | 41.332       | 0.522                 | 519                 | 0.654    | 0.132  | 40             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.8         | 40.944       | 0.501                 | 498                 | 0.597    | 0.095  | 42             | 1024          | 32              | 152 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18           | 33.753       | 0.479                 | 476                 | 0.598    | 0.119  | 39             | 1024          | 32              | 200 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 201     | 58              | 34                | 0               | 0                  | 24                  | 1732        | 0         | 0             | 0                    | 38          |
| cold-create      | 250     | 90              | 69                | 0               | 0                  | 30                  | 1684        | 0         | 0             | 0                    | 42          |
| cold-create      | 171     | 30              | 32                | 0               | 0                  | 32                  | 1651        | 0         | 0             | 0                    | 108         |
| cold-create      | 150     | 21              | 26                | 0               | 0                  | 26                  | 1608        | 0         | 0             | 0                    | 103         |
| cold-create      | 196     | 31              | 59                | 0               | 0                  | 35                  | 1851        | 0         | 0             | 0                    | 40          |
| unchanged-update | 163     | 31              | 29                | 0               | 0                  | 28                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 162     | 27              | 28                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 158     | 22              | 31                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 104         |
| unchanged-update | 163     | 26              | 32                | 0               | 0                  | 29                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 159     | 24              | 28                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 168     | 32              | 30                | 0               | 0                  | 35                  | 201         | 0         | 0             | 0                    | 43          |
| changed-update   | 226     | 58              | 59                | 0               | 0                  | 30                  | 227         | 0         | 0             | 0                    | 41          |
| changed-update   | 168     | 33              | 29                | 0               | 0                  | 39                  | 202         | 0         | 0             | 0                    | 112         |
| changed-update   | 165     | 28              | 32                | 0               | 0                  | 35                  | 247         | 0         | 0             | 0                    | 42          |
| changed-update   | 165     | 26              | 33                | 0               | 0                  | 39                  | 183         | 0         | 0             | 0                    | 35          |
| pruned-update    | 163     | 27              | 37                | 0               | 0                  | 34                  | 186         | 66        | 0             | 0                    | 43          |
| pruned-update    | 262     | 93              | 69                | 0               | 0                  | 37                  | 206         | 68        | 0             | 0                    | 44          |
| pruned-update    | 159     | 25              | 28                | 0               | 0                  | 29                  | 200         | 69        | 0             | 0                    | 44          |
| pruned-update    | 151     | 29              | 28                | 0               | 0                  | 33                  | 196         | 64        | 0             | 0                    | 38          |
| pruned-update    | 153     | 22              | 30                | 0               | 0                  | 27                  | 177         | 65        | 0             | 0                    | 42          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33553688            | 536870912           | 0                             | 33553688                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33490801            | 536870912           | 0                             | 33490801                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33133865            | 536870912           | 0                             | 33133865                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33534869            | 536870912           | 0                             | 33534869                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33519151            | 536870912           | 0                             | 33519151                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 536870912           | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 536870912           | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 536870912           | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 536870912           | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 536870912           | 0                             | 21049775                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 536870912           | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 536870912           | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 536870912           | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 536870912           | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 536870912           | 0                             | 21049522                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 536870912           | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 536870912           | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 536870912           | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 536870912           | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 536870912           | 0                             | 21180245                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 122         | 122            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 193         | 193            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 280         | 280            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 256         | 256            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 284         | 284            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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

## large-few / 2048 MiB / max concurrency 64

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.4         | 84.576       | 1.121                 | 1118                | 1.25     | 0.128  | 173            | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.16        | 87.596       | 1.22                  | 1217                | 1.348    | 0.128  | 207            | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 70.865       | 1.185                 | 1182                | 1.317    | 0.131  | 202            | 2048          | 64              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.22        | 77.189       | 1.133                 | 1130                | 1.253    | 0.12   | 180            | 2048          | 64              | 157 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.08        | 69.59        | 1.162                 | 1159                | 1.289    | 0.126  | 193            | 2048          | 64              | 205 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.59        | 36.512       | 0.253                 | 249                 | 0.378    | 0.125  | 32             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.92        | 32.912       | 0.222                 | 218                 | 0.34     | 0.118  | 32             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.14        | 33.359       | 0.227                 | 223                 | 0.35     | 0.122  | 32             | 2048          | 64              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.48        | 35.863       | 0.215                 | 211                 | 0.338    | 0.123  | 32             | 2048          | 64              | 158 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.94        | 32.914       | 0.203                 | 199                 | 0.325    | 0.122  | 32             | 2048          | 64              | 206 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.68        | 40.057       | 0.454                 | 451                 | 0.576    | 0.122  | 40             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.94        | 33.333       | 0.496                 | 493                 | 0.622    | 0.125  | 40             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.46        | 39.626       | 0.381                 | 377                 | 0.513    | 0.132  | 40             | 2048          | 64              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.62        | 42.666       | 0.412                 | 409                 | 0.53     | 0.118  | 40             | 2048          | 64              | 159 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.19        | 43.518       | 0.419                 | 416                 | 0.516    | 0.096  | 40             | 2048          | 64              | 207 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.84        | 40.464       | 0.477                 | 474                 | 0.603    | 0.125  | 41             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.02        | 38.143       | 0.447                 | 444                 | 0.577    | 0.129  | 40             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.47        | 39.76        | 0.459                 | 456                 | 0.588    | 0.128  | 43             | 2048          | 64              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.71        | 40.348       | 0.454                 | 451                 | 0.576    | 0.121  | 39             | 2048          | 64              | 160 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.03        | 38.203       | 0.431                 | 428                 | 0.554    | 0.122  | 40             | 2048          | 64              | 208 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 128     | 21              | 29                | 0               | 0                  | 28                  | 916         | 0         | 0             | 0                    | 46          |
| cold-create      | 141     | 24              | 33                | 0               | 0                  | 30                  | 997         | 0         | 0             | 0                    | 47          |
| cold-create      | 141     | 26              | 33                | 0               | 0                  | 31                  | 969         | 0         | 0             | 0                    | 40          |
| cold-create      | 137     | 26              | 30                | 0               | 0                  | 23                  | 933         | 0         | 0             | 0                    | 36          |
| cold-create      | 134     | 29              | 31                | 0               | 0                  | 28                  | 953         | 0         | 0             | 0                    | 42          |
| unchanged-update | 168     | 27              | 61                | 0               | 0                  | 40                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 142     | 29              | 31                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 148     | 30              | 34                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 131     | 24              | 28                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 48          |
| unchanged-update | 133     | 25              | 27                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 30          |
| changed-update   | 139     | 24              | 30                | 0               | 0                  | 33                  | 176         | 0         | 0             | 0                    | 101         |
| changed-update   | 147     | 27              | 31                | 0               | 0                  | 37                  | 196         | 0         | 0             | 0                    | 111         |
| changed-update   | 143     | 30              | 30                | 0               | 0                  | 30                  | 164         | 0         | 0             | 0                    | 38          |
| changed-update   | 139     | 25              | 28                | 0               | 0                  | 38                  | 188         | 0         | 0             | 0                    | 42          |
| changed-update   | 148     | 24              | 43                | 0               | 0                  | 29                  | 200         | 0         | 0             | 0                    | 38          |
| pruned-update    | 133     | 27              | 31                | 0               | 0                  | 35                  | 178         | 72        | 0             | 0                    | 39          |
| pruned-update    | 146     | 27              | 29                | 0               | 0                  | 34                  | 144         | 63        | 0             | 0                    | 41          |
| pruned-update    | 129     | 18              | 27                | 0               | 0                  | 29                  | 177         | 65        | 0             | 0                    | 39          |
| pruned-update    | 138     | 21              | 34                | 0               | 0                  | 33                  | 145         | 62        | 0             | 0                    | 50          |
| pruned-update    | 127     | 20              | 27                | 0               | 0                  | 27                  | 153         | 69        | 0             | 0                    | 36          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 32      | 0        | 0       | 0                   | 0                             | 0                             | 32       | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| unchanged-update | 32      | 0        | 0       | 32                  | 32                            | 32                            | 0        | 32      | 0                | 0              | 0                     | 0      | 0                 | 0         | 32            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| changed-update   | 32      | 0        | 0       | 32                  | 32                            | 32                            | 3        | 29      | 0                | 0              | 0                     | 0      | 0                 | 0         | 29            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |
| pruned-update    | 28      | 0        | 0       | 32                  | 28                            | 32                            | 3        | 25      | 4                | 1              | 0                     | 0      | 0                 | 0         | 25            |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| cold-create      | 1                | 0                  | 32              | 0                      | 0            |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| unchanged-update | 1                | 0                  | 32              | 0                      | 32           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| changed-update   | 1                | 0                  | 32              | 0                      | 29           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |
| pruned-update    | 1                | 0                  | 28              | 0                      | 25           |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 89309456            | 1073741824          | 0                             | 89309456                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 1073741824          | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 1073741824          | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 1073741824          | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 1073741824          | 0                             | 21049775                   |
| unchanged-update | 96767849         | 0              | 0            | 1250                 | 1250                 | 1250                | 1073741824          | 0                             | 21049775                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 1073741824          | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 1073741824          | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 1073741824          | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 1073741824          | 0                             | 21049522                   |
| changed-update   | 96767595         | 8209740        | 0            | 1633396              | 1634647              | 1633396             | 1073741824          | 0                             | 21049522                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 1073741824          | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 1073741824          | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 1073741824          | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 1073741824          | 0                             | 21180245                   |
| pruned-update    | 85106780         | 8209740        | 0            | 1633651              | 1634768              | 1633651             | 1073741824          | 0                             | 21180245                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 8            | 0               | 232         | 232            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 251         | 251            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 15                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 115         | 115            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 7                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 216         | 216            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 7                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 175         | 175            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 12                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| cold-create      | 32        | 32        | 0      | 0         | 0        | 32             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| changed-update   | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |
| pruned-update    | 3         | 3         | 0      | 0         | 0        | 3              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 32            | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 3             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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

## mixed / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 50.99        | 66.903       | 1.373                 | 1369                | 1.524    | 0.151  | 102            | 1024          | 32              | 21  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.14        | 70.977       | 1.436                 | 1433                | 1.566    | 0.129  | 101            | 1024          | 32              | 69  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.76        | 71.632       | 1.261                 | 1258                | 1.388    | 0.126  | 107            | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.36        | 72.471       | 1.244                 | 1241                | 1.374    | 0.129  | 111            | 1024          | 32              | 165 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.5         | 70.257       | 1.262                 | 1259                | 1.385    | 0.123  | 111            | 1024          | 32              | 213 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.52        | 39.078       | 0.28                  | 277                 | 0.373    | 0.093  | 34             | 1024          | 32              | 22  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.9         | 33.007       | 0.296                 | 293                 | 0.424    | 0.128  | 33             | 1024          | 32              | 70  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.32        | 33.557       | 0.276                 | 273                 | 0.398    | 0.121  | 33             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.64        | 35.081       | 0.274                 | 271                 | 0.392    | 0.117  | 33             | 1024          | 32              | 166 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.9         | 32.277       | 0.281                 | 278                 | 0.406    | 0.124  | 33             | 1024          | 32              | 214 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.67        | 39.146       | 0.388                 | 385                 | 0.51     | 0.122  | 36             | 1024          | 32              | 23  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.92        | 38.034       | 0.526                 | 523                 | 0.645    | 0.119  | 39             | 1024          | 32              | 71  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.39        | 38.957       | 0.405                 | 402                 | 0.526    | 0.121  | 36             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.66        | 39.773       | 0.402                 | 399                 | 0.498    | 0.095  | 38             | 1024          | 32              | 167 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.93        | 38.026       | 0.386                 | 383                 | 0.515    | 0.129  | 37             | 1024          | 32              | 215 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.8         | 40.018       | 1.071                 | 1068                | 1.189    | 0.118  | 38             | 1024          | 32              | 24  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.03        | 38.287       | 1.16                  | 1156                | 1.291    | 0.13   | 39             | 1024          | 32              | 72  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.54        | 39.259       | 1.051                 | 1048                | 1.171    | 0.119  | 38             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.7         | 34.488       | 1.108                 | 1103                | 1.229    | 0.121  | 37             | 1024          | 32              | 168 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.08        | 38.451       | 1.064                 | 1060                | 1.189    | 0.124  | 38             | 1024          | 32              | 216 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 195     | 29              | 28                | 0               | 0                  | 29                  | 1105        | 0         | 0             | 0                    | 39          |
| cold-create      | 330     | 81              | 82                | 0               | 0                  | 27                  | 1029        | 0         | 0             | 0                    | 45          |
| cold-create      | 168     | 28              | 33                | 0               | 0                  | 36                  | 1002        | 0         | 0             | 0                    | 50          |
| cold-create      | 172     | 26              | 36                | 0               | 0                  | 28                  | 1008        | 0         | 0             | 0                    | 32          |
| cold-create      | 165     | 23              | 35                | 0               | 0                  | 26                  | 1029        | 0         | 0             | 0                    | 38          |
| unchanged-update | 168     | 23              | 35                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 166     | 22              | 37                | 0               | 0                  | 86                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 165     | 26              | 31                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 171     | 23              | 38                | 0               | 0                  | 55                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 170     | 27              | 34                | 0               | 0                  | 64                  | 0           | 0         | 0             | 0                    | 42          |
| changed-update   | 158     | 22              | 35                | 0               | 0                  | 60                  | 121         | 0         | 0             | 0                    | 43          |
| changed-update   | 278     | 79              | 62                | 0               | 0                  | 55                  | 149         | 0         | 0             | 0                    | 39          |
| changed-update   | 164     | 29              | 35                | 0               | 0                  | 55                  | 134         | 0         | 0             | 0                    | 47          |
| changed-update   | 159     | 28              | 33                | 0               | 0                  | 67                  | 129         | 0         | 0             | 0                    | 43          |
| changed-update   | 171     | 22              | 35                | 0               | 0                  | 52                  | 111         | 0         | 0             | 0                    | 46          |
| pruned-update    | 167     | 30              | 34                | 0               | 0                  | 54                  | 139         | 653       | 0             | 0                    | 39          |
| pruned-update    | 260     | 51              | 81                | 0               | 0                  | 65                  | 167         | 613       | 0             | 0                    | 38          |
| pruned-update    | 175     | 29              | 35                | 0               | 0                  | 58                  | 122         | 639       | 0             | 0                    | 39          |
| pruned-update    | 163     | 31              | 32                | 0               | 0                  | 59                  | 129         | 691       | 0             | 0                    | 45          |
| pruned-update    | 147     | 21              | 29                | 0               | 0                  | 69                  | 129         | 660       | 0             | 0                    | 41          |

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
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 536870912           | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 536870912           | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 536870912           | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 536870912           | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 536870912           | 0                             | 26632437                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 536870912           | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 536870912           | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 536870912           | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 536870912           | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 536870912           | 0                             | 21725112                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 536870912           | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 536870912           | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 536870912           | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 536870912           | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 536870912           | 0                             | 21725199                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 536870912           | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 536870912           | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 536870912           | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 536870912           | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 536870912           | 0                             | 21572066                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 2                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 13          | 13             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.41        | 77.526       | 0.973                 | 969                 | 1.127    | 0.154  | 123            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.11        | 69.039       | 0.875                 | 872                 | 1.001    | 0.126  | 133            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.75        | 70.185       | 0.634                 | 631                 | 0.735    | 0.101  | 111            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.38        | 71.21        | 0.827                 | 824                 | 0.951    | 0.124  | 105            | 2048          | 64              | 173 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.09        | 69.14        | 0.802                 | 799                 | 0.931    | 0.129  | 117            | 2048          | 64              | 221 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.52        | 33.311       | 0.247                 | 243                 | 0.368    | 0.121  | 33             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.92        | 32.854       | 0.234                 | 231                 | 0.355    | 0.12   | 35             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.18        | 33.054       | 0.274                 | 271                 | 0.397    | 0.122  | 33             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.47        | 33.94        | 0.261                 | 258                 | 0.384    | 0.123  | 33             | 2048          | 64              | 174 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.06        | 33.003       | 0.328                 | 324                 | 0.476    | 0.148  | 33             | 2048          | 64              | 222 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.7         | 39.273       | 0.331                 | 329                 | 0.429    | 0.097  | 37             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.04        | 38.342       | 0.368                 | 364                 | 0.489    | 0.121  | 36             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.37        | 39.151       | 0.353                 | 350                 | 0.475    | 0.121  | 36             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.66        | 39.814       | 0.362                 | 359                 | 0.483    | 0.121  | 38             | 2048          | 64              | 175 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.94        | 38.093       | 0.359                 | 356                 | 0.48     | 0.121  | 39             | 2048          | 64              | 223 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.73        | 34.018       | 1.024                 | 1021                | 1.144    | 0.119  | 36             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.05        | 38.444       | 1.135                 | 1132                | 1.256    | 0.12   | 37             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.47        | 33.582       | 0.993                 | 990                 | 1.092    | 0.099  | 39             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.78        | 34.409       | 1.022                 | 1019                | 1.141    | 0.118  | 37             | 2048          | 64              | 176 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.09        | 37.84        | 1.078                 | 1075                | 1.217    | 0.138  | 36             | 2048          | 64              | 224 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 166     | 20              | 31                | 0               | 0                  | 42                  | 720         | 0         | 0             | 0                    | 40          |
| cold-create      | 146     | 30              | 37                | 0               | 0                  | 31                  | 653         | 0         | 0             | 0                    | 40          |
| cold-create      | 130     | 23              | 32                | 0               | 0                  | 29                  | 421         | 0         | 0             | 0                    | 50          |
| cold-create      | 152     | 29              | 35                | 0               | 0                  | 31                  | 606         | 0         | 0             | 0                    | 33          |
| cold-create      | 134     | 28              | 32                | 0               | 0                  | 31                  | 592         | 0         | 0             | 0                    | 41          |
| unchanged-update | 145     | 24              | 34                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 126     | 23              | 31                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 144     | 31              | 31                | 0               | 0                  | 77                  | 0           | 0         | 0             | 0                    | 49          |
| unchanged-update | 156     | 24              | 43                | 0               | 0                  | 55                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 159     | 31              | 31                | 0               | 0                  | 114                 | 0           | 0         | 0             | 0                    | 50          |
| changed-update   | 121     | 22              | 27                | 0               | 0                  | 47                  | 109         | 0         | 0             | 0                    | 50          |
| changed-update   | 143     | 24              | 34                | 0               | 0                  | 67                  | 120         | 0         | 0             | 0                    | 33          |
| changed-update   | 136     | 26              | 29                | 0               | 0                  | 55                  | 111         | 0         | 0             | 0                    | 45          |
| changed-update   | 143     | 29              | 31                | 0               | 0                  | 58                  | 116         | 0         | 0             | 0                    | 40          |
| changed-update   | 135     | 23              | 32                | 0               | 0                  | 62                  | 116         | 0         | 0             | 0                    | 41          |
| pruned-update    | 141     | 29              | 30                | 0               | 0                  | 61                  | 153         | 611       | 0             | 0                    | 42          |
| pruned-update    | 139     | 26              | 32                | 0               | 0                  | 61                  | 114         | 695       | 0             | 0                    | 110         |
| pruned-update    | 126     | 22              | 31                | 0               | 0                  | 68                  | 132         | 610       | 0             | 0                    | 42          |
| pruned-update    | 137     | 28              | 30                | 0               | 0                  | 62                  | 113         | 647       | 0             | 0                    | 45          |
| pruned-update    | 138     | 24              | 29                | 0               | 0                  | 72                  | 137         | 672       | 0             | 0                    | 44          |

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
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 1073741824          | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 1073741824          | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 1073741824          | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 1073741824          | 0                             | 26632437                   |
| cold-create      | 26668055         | 52904649       | 0            | 26632437             | 26647466             | 26632437            | 1073741824          | 0                             | 26632437                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 1073741824          | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 1073741824          | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 1073741824          | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 1073741824          | 0                             | 21725112                   |
| unchanged-update | 26668055         | 0              | 0            | 15029                | 15029                | 15029               | 1073741824          | 0                             | 21725112                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 1073741824          | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 1073741824          | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 1073741824          | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 1073741824          | 0                             | 21725199                   |
| changed-update   | 26668131         | 1379190        | 0            | 672816               | 687856               | 672816              | 1073741824          | 0                             | 21725199                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 1073741824          | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 1073741824          | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 1073741824          | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 1073741824          | 0                             | 21572066                   |
| pruned-update    | 24474828         | 1379190        | 0            | 659706               | 673228               | 659706              | 1073741824          | 0                             | 21572066                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 58          | 58             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 45                | 45                       | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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

## tiny-many / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes   | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | ------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.73        | 72.051       | 2.607                 | 2603                | 2.725    | 0.118  | 54             | 1024          | 32              | 37  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.79        | 70.849       | 2.492                 | 2489                | 2.589    | 0.096  | 57             | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.9         | 72.569       | 2.534                 | 2531                | 2.66     | 0.125  | 57             | 1024          | 32              | 133 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.18        | 73.199       | 2.641                 | 2638                | 2.807    | 0.165  | 57             | 1024          | 32              | 181 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.7         | 70.928       | 2.615                 | 2612                | 2.733    | 0.117  | 58             | 1024          | 32              | 229 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.55        | 33.308       | 0.468                 | 465                 | 0.567    | 0.099  | 35             | 1024          | 32              | 38  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.93        | 32.463       | 0.463                 | 460                 | 0.593    | 0.129  | 35             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.26        | 33.749       | 0.531                 | 528                 | 0.653    | 0.122  | 35             | 1024          | 32              | 134 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.4         | 34.222       | 0.46                  | 457                 | 0.587    | 0.126  | 35             | 1024          | 32              | 182 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.85        | 38.258       | 0.505                 | 502                 | 0.604    | 0.098  | 35             | 1024          | 32              | 230 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.6         | 40.445       | 0.606                 | 603                 | 0.703    | 0.097  | 36             | 1024          | 32              | 39  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.97        | 38.226       | 0.71                  | 708                 | 0.808    | 0.097  | 36             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.35        | 39.926       | 0.578                 | 575                 | 0.701    | 0.122  | 36             | 1024          | 32              | 135 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.61        | 40.509       | 0.583                 | 579                 | 0.7      | 0.117  | 37             | 1024          | 32              | 183 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18           | 38.289       | 0.568                 | 565                 | 0.694    | 0.125  | 35             | 1024          | 32              | 231 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.92        | 39.76        | 1.35                  | 1347                | 1.469    | 0.119  | 36             | 1024          | 32              | 40  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.05        | 38.424       | 1.381                 | 1378                | 1.475    | 0.093  | 36             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.49        | 35.765       | 1.407                 | 1403                | 1.526    | 0.118  | 35             | 1024          | 32              | 136 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.7         | 41.811       | 1.295                 | 1292                | 1.417    | 0.121  | 35             | 1024          | 32              | 184 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.18        | 38.567       | 1.323                 | 1320                | 1.446    | 0.122  | 35             | 1024          | 32              | 232 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 241     | 32              | 92                | 2               | 2                  | 35                  | 2284        | 0         | 0             | 0                    | 41          |
| cold-create      | 319     | 27              | 179               | 1               | 2                  | 25                  | 2097        | 0         | 0             | 0                    | 46          |
| cold-create      | 229     | 26              | 86                | 2               | 2                  | 34                  | 2220        | 0         | 0             | 0                    | 46          |
| cold-create      | 241     | 33              | 80                | 2               | 3                  | 40                  | 2311        | 0         | 0             | 0                    | 45          |
| cold-create      | 268     | 44              | 101               | 2               | 2                  | 26                  | 2273        | 0         | 0             | 0                    | 43          |
| unchanged-update | 234     | 27              | 100               | 1               | 1                  | 195                 | 0           | 0         | 0             | 0                    | 34          |
| unchanged-update | 222     | 24              | 84                | 2               | 2                  | 192                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 258     | 34              | 103               | 2               | 2                  | 223                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 227     | 24              | 94                | 2               | 2                  | 185                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 248     | 29              | 87                | 1               | 2                  | 214                 | 0           | 0         | 0             | 0                    | 39          |
| changed-update   | 206     | 33              | 77                | 1               | 2                  | 239                 | 104         | 0         | 0             | 0                    | 52          |
| changed-update   | 357     | 30              | 169               | 1               | 2                  | 217                 | 86          | 0         | 0             | 0                    | 46          |
| changed-update   | 246     | 28              | 92                | 2               | 2                  | 185                 | 97          | 0         | 0             | 0                    | 44          |
| changed-update   | 239     | 28              | 92                | 2               | 2                  | 200                 | 98          | 0         | 0             | 0                    | 41          |
| changed-update   | 222     | 30              | 85                | 3               | 2                  | 194                 | 110         | 0         | 0             | 0                    | 37          |
| pruned-update    | 212     | 27              | 79                | 2               | 2                  | 244                 | 105         | 733       | 0             | 0                    | 32          |
| pruned-update    | 343     | 32              | 198               | 1               | 1                  | 177                 | 90          | 722       | 0             | 0                    | 29          |
| pruned-update    | 235     | 30              | 84                | 2               | 2                  | 210                 | 107         | 786       | 0             | 0                    | 45          |
| pruned-update    | 218     | 27              | 81                | 1               | 2                  | 235                 | 96          | 692       | 0             | 0                    | 40          |
| pruned-update    | 225     | 30              | 84                | 2               | 2                  | 223                 | 98          | 711       | 0             | 0                    | 45          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 536870912           | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 536870912           | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 536870912           | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 536870912           | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 536870912           | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 536870912           | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 536870912           | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 536870912           | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 536870912           | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 536870912           | 0                             | 5890077                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 536870912           | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 536870912           | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 536870912           | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 536870912           | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 536870912           | 0                             | 5890028                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 536870912           | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 536870912           | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 536870912           | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 536870912           | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 536870912           | 0                             | 5286308                    |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 18          | 18             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 32             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 32             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 32             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 32             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 32             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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

## tiny-many / 2048 MiB / max concurrency 64

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes   | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | ------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.4         | 71.53        | 1.55                  | 1547                | 1.674    | 0.123  | 69             | 2048          | 64              | 45  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.07        | 70.076       | 1.461                 | 1458                | 1.583    | 0.121  | 65             | 2048          | 64              | 93  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.87        | 70.909       | 1.539                 | 1536                | 1.658    | 0.119  | 71             | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.21        | 71.935       | 1.515                 | 1512                | 1.647    | 0.131  | 67             | 2048          | 64              | 189 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.69        | 70.928       | 1.507                 | 1504                | 1.631    | 0.124  | 73             | 2048          | 64              | 237 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.66        | 33.326       | 0.508                 | 505                 | 0.631    | 0.122  | 35             | 2048          | 64              | 46  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.94        | 32.251       | 0.472                 | 469                 | 0.594    | 0.122  | 35             | 2048          | 64              | 94  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.3         | 33.494       | 0.48                  | 477                 | 0.58     | 0.1    | 35             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.44        | 34.732       | 0.483                 | 480                 | 0.604    | 0.121  | 35             | 2048          | 64              | 190 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.94        | 32.707       | 0.488                 | 484                 | 0.636    | 0.148  | 35             | 2048          | 64              | 238 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.65        | 39.457       | 0.555                 | 552                 | 0.683    | 0.127  | 35             | 2048          | 64              | 47  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.99        | 38.746       | 0.563                 | 560                 | 0.692    | 0.129  | 36             | 2048          | 64              | 95  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.37        | 34.192       | 0.606                 | 603                 | 0.73     | 0.123  | 35             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.66        | 40.601       | 0.579                 | 574                 | 0.704    | 0.125  | 36             | 2048          | 64              | 191 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18           | 38.792       | 0.564                 | 560                 | 0.685    | 0.12   | 38             | 2048          | 64              | 239 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.86        | 40.332       | 1.306                 | 1304                | 1.402    | 0.095  | 35             | 2048          | 64              | 48  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.12        | 38.743       | 1.215                 | 1212                | 1.314    | 0.098  | 37             | 2048          | 64              | 96  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.43        | 39.79        | 1.382                 | 1379                | 1.501    | 0.118  | 35             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.93        | 41.4         | 1.229                 | 1226                | 1.356    | 0.126  | 36             | 2048          | 64              | 192 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.02        | 39.058       | 1.368                 | 1364                | 1.489    | 0.121  | 36             | 2048          | 64              | 240 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 214     | 30              | 90                | 2               | 2                  | 28                  | 1258        | 0         | 0             | 0                    | 46          |
| cold-create      | 212     | 28              | 94                | 2               | 2                  | 29                  | 1173        | 0         | 0             | 0                    | 42          |
| cold-create      | 206     | 31              | 85                | 2               | 2                  | 33                  | 1250        | 0         | 0             | 0                    | 44          |
| cold-create      | 215     | 30              | 87                | 2               | 2                  | 26                  | 1236        | 0         | 0             | 0                    | 34          |
| cold-create      | 219     | 29              | 99                | 2               | 2                  | 34                  | 1205        | 0         | 0             | 0                    | 44          |
| unchanged-update | 212     | 27              | 92                | 2               | 2                  | 245                 | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 213     | 34              | 92                | 2               | 2                  | 218                 | 0           | 0         | 0             | 0                    | 35          |
| unchanged-update | 192     | 28              | 88                | 1               | 2                  | 251                 | 0           | 0         | 0             | 0                    | 32          |
| unchanged-update | 210     | 28              | 94                | 2               | 2                  | 224                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 229     | 32              | 94                | 2               | 3                  | 206                 | 1           | 0         | 0             | 0                    | 47          |
| changed-update   | 215     | 33              | 94                | 2               | 2                  | 186                 | 104         | 0         | 0             | 0                    | 46          |
| changed-update   | 203     | 32              | 86                | 2               | 2                  | 227                 | 93          | 0         | 0             | 0                    | 33          |
| changed-update   | 201     | 29              | 89                | 2               | 2                  | 253                 | 99          | 0         | 0             | 0                    | 48          |
| changed-update   | 194     | 25              | 90                | 2               | 2                  | 228                 | 108         | 0         | 0             | 0                    | 42          |
| changed-update   | 207     | 32              | 90                | 2               | 2                  | 207                 | 99          | 0         | 0             | 0                    | 45          |
| pruned-update    | 182     | 30              | 78                | 1               | 1                  | 239                 | 94          | 729       | 0             | 0                    | 45          |
| pruned-update    | 205     | 26              | 89                | 1               | 2                  | 169                 | 82          | 701       | 0             | 0                    | 43          |
| pruned-update    | 192     | 23              | 85                | 1               | 2                  | 233                 | 97          | 799       | 0             | 0                    | 42          |
| pruned-update    | 202     | 25              | 90                | 2               | 2                  | 187                 | 93          | 697       | 0             | 0                    | 33          |
| pruned-update    | 200     | 29              | 80                | 2               | 2                  | 244                 | 96          | 756       | 0             | 0                    | 54          |

### Object Work

| Phase            | Planned | Filtered | Markers | Destination objects | Destination metadata retained | Destination page objects high | Uploaded | Skipped | Inferred deleted | Delete batches | Conditional conflicts | Copied | MD5 hash attempts | MD5 skips | Catalog skips |
| ---------------- | ------- | -------- | ------- | ------------------- | ----------------------------- | ----------------------------- | -------- | ------- | ---------------- | -------------- | --------------------- | ------ | ----------------- | --------- | ------------- |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| cold-create      | 2584    | 0        | 0       | 0                   | 0                             | 0                             | 2584     | 0       | 0                | 0              | 0                     | 0      | 0                 | 0         | 0             |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| unchanged-update | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 0        | 2584    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2584          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| changed-update   | 2584    | 0        | 0       | 2584                | 2584                          | 1000                          | 2        | 2582    | 0                | 0              | 0                     | 0      | 0                 | 0         | 2582          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |
| pruned-update    | 2325    | 0        | 0       | 2584                | 2325                          | 1000                          | 2        | 2323    | 259              | 1              | 0                     | 0      | 0                 | 0         | 2323          |

### Catalog Trust And Fallback

| Phase            | Trusted archives | Untrusted archives | Trusted entries | Fallback hash attempts | Sparse skips |
| ---------------- | ---------------- | ------------------ | --------------- | ---------------------- | ------------ |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| cold-create      | 1                | 0                  | 2584            | 0                      | 0            |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| unchanged-update | 1                | 0                  | 2584            | 0                      | 2584         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| changed-update   | 1                | 0                  | 2584            | 0                      | 2582         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |
| pruned-update    | 1                | 0                  | 2325            | 0                      | 2323         |

### Bytes And Memory Window

| Phase            | Source zip bytes | Uploaded bytes | Copied bytes | Source planned bytes | Source fetched bytes | Resident bytes high | Global budget bytes | Global resident bytes current | Global resident bytes high |
| ---------------- | ---------------- | -------------- | ------------ | -------------------- | -------------------- | ------------------- | ------------------- | ----------------------------- | -------------------------- |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 1073741824          | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 1073741824          | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 1073741824          | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 1073741824          | 0                             | 5890077                    |
| cold-create      | 2729559          | 8178618        | 0            | 2522400              | 2605670              | 2522400             | 1073741824          | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 1073741824          | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 1073741824          | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 1073741824          | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 1073741824          | 0                             | 5890077                    |
| unchanged-update | 2729559          | 0              | 0            | 83270                | 83270                | 83270               | 1073741824          | 0                             | 5890077                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 1073741824          | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 1073741824          | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 1073741824          | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 1073741824          | 0                             | 5890028                    |
| changed-update   | 2729537          | 20712          | 0            | 3347                 | 86612                | 83265               | 1073741824          | 0                             | 5890028                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 1073741824          | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 1073741824          | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 1073741824          | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 1073741824          | 0                             | 5286308                    |
| pruned-update    | 2449453          | 20712          | 0            | 3364                 | 78371                | 75007               | 1073741824          | 0                             | 5286308                    |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 59          | 59             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 35          | 35             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 57          | 57             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |

### Transfer Scheduler

| Phase            | Scheduled | Completed | Failed | Cancelled | Panicked | In flight high |
| ---------------- | --------- | --------- | ------ | --------- | -------- | -------------- |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 64             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 64             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 64             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 64             |
| cold-create      | 2584      | 2584      | 0      | 0         | 0        | 64             |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| unchanged-update | 0         | 0         | 0      | 0         | 0        | 0              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| changed-update   | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |
| pruned-update    | 2         | 2         | 0      | 0         | 0        | 2              |

### PutObject Pressure

| Phase            | Wire attempts | Failed attempts | Retry attempts | Throttled attempts | Retry wait ms | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | ------------- | --------------- | -------------- | ------------------ | ------------- | ----------------------- | -------------------- |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| cold-create      | 2584          | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| unchanged-update | 0             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| changed-update   | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |
| pruned-update    | 2             | 0               | 0              | 0                  | 0             | 0                       | 0                    |

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

| Phase            | SDK calls | Failed calls | Requested objects | Inferred deleted objects | Unconfirmed objects | NoSuchBucket requested identifiers | Retry attempts | Throttled attempts | Throttle cooldown waits | Throttle cooldown ms |
| ---------------- | --------- | ------------ | ----------------- | ------------------------ | ------------------- | ---------------------------------- | -------------- | ------------------ | ----------------------- | -------------------- |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| cold-create      | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| unchanged-update | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| changed-update   | 0         | 0            | 0                 | 0                        | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  | 0              | 0                  | 0                       | 0                    |

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
