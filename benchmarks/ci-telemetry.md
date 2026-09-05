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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.44        | 70.214       | 2.101                 | 2099                | 2.219    | 0.117  | 119            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.21        | 71.729       | 1.758                 | 1756                | 1.856    | 0.098  | 127            | 1024          | 32              | 53  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.83        | 75.763       | 1.738                 | 1736                | 1.834    | 0.096  | 134            | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.69        | 70.797       | 1.901                 | 1899                | 2.015    | 0.114  | 121            | 1024          | 32              | 149 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.43        | 69.328       | 1.859                 | 1857                | 1.974    | 0.114  | 127            | 1024          | 32              | 197 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.02        | 31.643       | 0.248                 | 246                 | 0.365    | 0.117  | 33             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.5         | 34.469       | 0.241                 | 239                 | 0.366    | 0.124  | 33             | 1024          | 32              | 54  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.43        | 37.214       | 0.34                  | 337                 | 0.453    | 0.113  | 33             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.21        | 33.401       | 0.261                 | 259                 | 0.378    | 0.117  | 33             | 1024          | 32              | 150 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.9         | 32.048       | 0.221                 | 219                 | 0.322    | 0.1    | 33             | 1024          | 32              | 198 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.14        | 40.925       | 0.624                 | 622                 | 0.741    | 0.117  | 39             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.7         | 41.472       | 0.445                 | 443                 | 0.561    | 0.115  | 40             | 1024          | 32              | 55  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.65        | 47.485       | 0.433                 | 430                 | 0.551    | 0.118  | 41             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.31        | 38.874       | 0.442                 | 440                 | 0.571    | 0.128  | 40             | 1024          | 32              | 151 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.15        | 39.117       | 0.444                 | 442                 | 0.569    | 0.124  | 40             | 1024          | 32              | 199 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18           | 37.367       | 0.637                 | 635                 | 0.76     | 0.122  | 39             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.69        | 34.178       | 0.523                 | 520                 | 0.642    | 0.119  | 41             | 1024          | 32              | 56  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.91        | 42.907       | 0.512                 | 509                 | 0.63     | 0.118  | 38             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.45        | 39.334       | 0.577                 | 575                 | 0.698    | 0.12   | 40             | 1024          | 32              | 152 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.18        | 41.432       | 0.52                  | 518                 | 0.639    | 0.118  | 41             | 1024          | 32              | 200 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 287     | 71              | 94                | 0               | 0                  | 29                  | 1737        | 0         | 0             | 0                    | 44          |
| cold-create      | 162     | 28              | 28                | 0               | 0                  | 29                  | 1522        | 0         | 0             | 0                    | 41          |
| cold-create      | 179     | 38              | 30                | 0               | 0                  | 31                  | 1480        | 0         | 0             | 0                    | 45          |
| cold-create      | 171     | 26              | 32                | 0               | 0                  | 35                  | 1654        | 0         | 0             | 0                    | 37          |
| cold-create      | 151     | 24              | 27                | 0               | 0                  | 30                  | 1632        | 0         | 0             | 0                    | 44          |
| unchanged-update | 169     | 22              | 33                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 163     | 22              | 29                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 259     | 29              | 36                | 0               | 0                  | 37                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 183     | 30              | 35                | 0               | 0                  | 26                  | 0           | 0         | 0             | 0                    | 49          |
| unchanged-update | 148     | 26              | 28                | 0               | 0                  | 29                  | 0           | 0         | 0             | 0                    | 41          |
| changed-update   | 289     | 79              | 94                | 0               | 0                  | 29                  | 256         | 0         | 0             | 0                    | 47          |
| changed-update   | 167     | 22              | 34                | 0               | 0                  | 36                  | 192         | 0         | 0             | 0                    | 47          |
| changed-update   | 163     | 23              | 29                | 0               | 0                  | 35                  | 189         | 0         | 0             | 0                    | 42          |
| changed-update   | 167     | 23              | 31                | 0               | 0                  | 28                  | 201         | 0         | 0             | 0                    | 42          |
| changed-update   | 163     | 26              | 28                | 0               | 0                  | 38                  | 200         | 0         | 0             | 0                    | 38          |
| pruned-update    | 248     | 64              | 70                | 0               | 0                  | 34                  | 214         | 70        | 0             | 0                    | 51          |
| pruned-update    | 169     | 27              | 31                | 0               | 0                  | 32                  | 199         | 62        | 0             | 0                    | 44          |
| pruned-update    | 178     | 30              | 36                | 0               | 0                  | 35                  | 182         | 69        | 0             | 0                    | 33          |
| pruned-update    | 168     | 22              | 36                | 0               | 0                  | 33                  | 215         | 64        | 0             | 0                    | 77          |
| pruned-update    | 150     | 28              | 25                | 0               | 0                  | 34                  | 209         | 66        | 0             | 0                    | 44          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33537965            | 536870912           | 0                             | 33537965                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33133865            | 536870912           | 0                             | 33133865                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33553688            | 536870912           | 0                             | 33553688                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33118142            | 536870912           | 0                             | 33118142                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33522242            | 536870912           | 0                             | 33522242                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 11           | 0               | 159         | 159            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 297         | 297            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 181         | 181            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 12                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 11           | 0               | 156         | 156            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 253         | 253            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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

## large-few / 2048 MiB / max concurrency 64

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.37        | 72.898       | 1.203                 | 1201                | 1.32     | 0.116  | 199            | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.22        | 74.187       | 2.111                 | 2109                | 2.228    | 0.116  | 190            | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.33        | 73.38        | 0.998                 | 997                 | 1.093    | 0.095  | 192            | 2048          | 64              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.61        | 75.769       | 1.176                 | 1173                | 1.301    | 0.125  | 184            | 2048          | 64              | 157 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.02        | 69.481       | 1.155                 | 1152                | 1.272    | 0.116  | 172            | 2048          | 64              | 205 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18           | 50.59        | 0.201                 | 198                 | 0.3      | 0.099  | 33             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.54        | 34.58        | 0.206                 | 204                 | 0.334    | 0.128  | 33             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.42        | 40.695       | 0.207                 | 205                 | 0.326    | 0.118  | 33             | 2048          | 64              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.21        | 34.043       | 0.212                 | 209                 | 0.331    | 0.119  | 33             | 2048          | 64              | 158 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.97        | 38.73        | 0.196                 | 194                 | 0.319    | 0.123  | 33             | 2048          | 64              | 206 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.98        | 37.651       | 0.481                 | 478                 | 0.608    | 0.127  | 40             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.69        | 39.875       | 0.451                 | 449                 | 0.565    | 0.113  | 41             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.5         | 37.147       | 0.374                 | 372                 | 0.473    | 0.099  | 41             | 2048          | 64              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.35        | 38.513       | 0.423                 | 421                 | 0.549    | 0.125  | 40             | 2048          | 64              | 159 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.94        | 37.496       | 0.384                 | 382                 | 0.5      | 0.115  | 40             | 2048          | 64              | 207 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.07        | 37.444       | 0.506                 | 503                 | 0.623    | 0.117  | 39             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.81        | 40.383       | 0.474                 | 471                 | 0.593    | 0.119  | 40             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 20.13        | 42.884       | 0.465                 | 463                 | 0.583    | 0.118  | 42             | 2048          | 64              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.45        | 38.518       | 0.466                 | 464                 | 0.583    | 0.117  | 43             | 2048          | 64              | 160 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.1         | 37.792       | 0.447                 | 445                 | 0.543    | 0.096  | 39             | 2048          | 64              | 208 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 144     | 26              | 30                | 0               | 0                  | 31                  | 978         | 0         | 0             | 0                    | 47          |
| cold-create      | 139     | 31              | 32                | 0               | 0                  | 32                  | 1890        | 0         | 0             | 0                    | 46          |
| cold-create      | 130     | 25              | 31                | 0               | 0                  | 28                  | 789         | 0         | 0             | 0                    | 48          |
| cold-create      | 130     | 23              | 27                | 0               | 0                  | 26                  | 972         | 0         | 0             | 0                    | 43          |
| cold-create      | 167     | 28              | 56                | 0               | 0                  | 29                  | 907         | 0         | 0             | 0                    | 48          |
| unchanged-update | 121     | 20              | 29                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 124     | 22              | 28                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 133     | 25              | 31                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 139     | 30              | 31                | 0               | 0                  | 29                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 129     | 28              | 26                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 28          |
| changed-update   | 168     | 22              | 61                | 0               | 0                  | 32                  | 236         | 0         | 0             | 0                    | 40          |
| changed-update   | 121     | 24              | 29                | 0               | 0                  | 35                  | 254         | 0         | 0             | 0                    | 38          |
| changed-update   | 115     | 31              | 29                | 0               | 0                  | 33                  | 178         | 0         | 0             | 0                    | 44          |
| changed-update   | 150     | 34              | 31                | 0               | 0                  | 29                  | 204         | 0         | 0             | 0                    | 36          |
| changed-update   | 126     | 22              | 31                | 0               | 0                  | 31                  | 182         | 0         | 0             | 0                    | 42          |
| pruned-update    | 147     | 21              | 48                | 0               | 0                  | 30                  | 199         | 65        | 0             | 0                    | 46          |
| pruned-update    | 151     | 33              | 30                | 0               | 0                  | 34                  | 156         | 73        | 0             | 0                    | 42          |
| pruned-update    | 137     | 23              | 26                | 0               | 0                  | 31                  | 166         | 68        | 0             | 0                    | 44          |
| pruned-update    | 138     | 25              | 34                | 0               | 0                  | 30                  | 180         | 63        | 0             | 0                    | 40          |
| pruned-update    | 129     | 26              | 29                | 0               | 0                  | 33                  | 171         | 60        | 0             | 0                    | 37          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 92143814            | 1073741824          | 0                             | 92143814                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 214         | 214            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 261         | 261            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 13                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 140         | 140            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 6                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 270         | 270            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 13                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 171         | 171            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 8                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.76        | 70.733       | 1.281                 | 1279                | 1.397    | 0.115  | 99             | 1024          | 32              | 21  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.19        | 72.132       | 1.291                 | 1289                | 1.419    | 0.127  | 105            | 1024          | 32              | 69  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 58.11        | 76.105       | 1.411                 | 1409                | 1.569    | 0.158  | 107            | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.85        | 71.106       | 1.305                 | 1302                | 1.421    | 0.116  | 104            | 1024          | 32              | 165 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.01        | 70.955       | 1.334                 | 1332                | 1.45     | 0.116  | 113            | 1024          | 32              | 213 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.85        | 31.851       | 0.269                 | 267                 | 0.368    | 0.099  | 33             | 1024          | 32              | 22  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.46        | 34.361       | 0.253                 | 251                 | 0.369    | 0.116  | 33             | 1024          | 32              | 70  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.48        | 38.053       | 0.281                 | 278                 | 0.405    | 0.124  | 33             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.29        | 33.697       | 0.283                 | 280                 | 0.4      | 0.117  | 33             | 1024          | 32              | 166 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.83        | 32.921       | 0.274                 | 271                 | 0.388    | 0.113  | 37             | 1024          | 32              | 214 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.97        | 37.057       | 0.461                 | 459                 | 0.559    | 0.098  | 37             | 1024          | 32              | 23  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.56        | 39.694       | 0.397                 | 394                 | 0.515    | 0.117  | 39             | 1024          | 32              | 71  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.48        | 37.145       | 0.404                 | 402                 | 0.52     | 0.116  | 36             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.35        | 38.685       | 0.421                 | 419                 | 0.516    | 0.095  | 37             | 1024          | 32              | 167 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.17        | 37.737       | 0.428                 | 426                 | 0.544    | 0.115  | 37             | 1024          | 32              | 215 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.01        | 37.476       | 1.24                  | 1238                | 1.392    | 0.151  | 37             | 1024          | 32              | 24  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.74        | 40.048       | 1.052                 | 1050                | 1.175    | 0.122  | 41             | 1024          | 32              | 72  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 20.02        | 37.687       | 1.031                 | 1029                | 1.145    | 0.113  | 37             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.37        | 38.777       | 1.044                 | 1041                | 1.161    | 0.117  | 37             | 1024          | 32              | 168 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.12        | 37.444       | 1.066                 | 1063                | 1.183    | 0.117  | 37             | 1024          | 32              | 216 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 191     | 28              | 32                | 0               | 0                  | 25                  | 1017        | 0         | 0             | 0                    | 44          |
| cold-create      | 177     | 30              | 32                | 0               | 0                  | 31                  | 1035        | 0         | 0             | 0                    | 44          |
| cold-create      | 192     | 24              | 32                | 0               | 0                  | 29                  | 1145        | 0         | 0             | 0                    | 41          |
| cold-create      | 184     | 36              | 34                | 0               | 0                  | 30                  | 1051        | 0         | 0             | 0                    | 35          |
| cold-create      | 240     | 83              | 47                | 0               | 0                  | 26                  | 1023        | 0         | 0             | 0                    | 41          |
| unchanged-update | 155     | 23              | 29                | 0               | 0                  | 64                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 156     | 21              | 30                | 0               | 0                  | 52                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 184     | 33              | 39                | 0               | 0                  | 51                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 175     | 24              | 35                | 0               | 0                  | 60                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 180     | 28              | 34                | 0               | 0                  | 60                  | 0           | 0         | 0             | 0                    | 30          |
| changed-update   | 229     | 67              | 55                | 0               | 0                  | 45                  | 138         | 0         | 0             | 0                    | 45          |
| changed-update   | 173     | 26              | 36                | 0               | 0                  | 52                  | 124         | 0         | 0             | 0                    | 44          |
| changed-update   | 169     | 22              | 32                | 0               | 0                  | 69                  | 130         | 0         | 0             | 0                    | 32          |
| changed-update   | 170     | 29              | 33                | 0               | 0                  | 51                  | 158         | 0         | 0             | 0                    | 38          |
| changed-update   | 174     | 25              | 34                | 0               | 0                  | 68                  | 132         | 0         | 0             | 0                    | 50          |
| pruned-update    | 272     | 58              | 83                | 0               | 0                  | 62                  | 176         | 654       | 0             | 0                    | 47          |
| pruned-update    | 169     | 21              | 32                | 0               | 0                  | 54                  | 116         | 665       | 0             | 0                    | 35          |
| pruned-update    | 173     | 32              | 35                | 0               | 0                  | 48                  | 123         | 624       | 0             | 0                    | 44          |
| pruned-update    | 164     | 27              | 30                | 0               | 0                  | 52                  | 122         | 644       | 0             | 0                    | 45          |
| pruned-update    | 203     | 30              | 53                | 0               | 0                  | 61                  | 116         | 639       | 0             | 0                    | 33          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 32          | 32             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 49.71        | 62.694       | 0.788                 | 786                 | 0.903    | 0.115  | 118            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.15        | 71.115       | 0.832                 | 830                 | 0.952    | 0.119  | 105            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.45        | 68.965       | 0.814                 | 812                 | 0.932    | 0.117  | 109            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.77        | 69.897       | 0.864                 | 862                 | 0.98     | 0.116  | 109            | 2048          | 64              | 173 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.6         | 69.303       | 0.85                  | 848                 | 0.967    | 0.116  | 101            | 2048          | 64              | 221 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.92        | 31.687       | 0.231                 | 229                 | 0.349    | 0.117  | 33             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.52        | 34.437       | 0.246                 | 244                 | 0.362    | 0.116  | 35             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.41        | 37.38        | 0.251                 | 249                 | 0.371    | 0.119  | 33             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.22        | 33.964       | 0.276                 | 274                 | 0.396    | 0.12   | 33             | 2048          | 64              | 174 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.87        | 33.517       | 0.232                 | 230                 | 0.332    | 0.099  | 35             | 2048          | 64              | 222 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.01        | 38.127       | 0.352                 | 350                 | 0.472    | 0.119  | 38             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.61        | 39.791       | 0.392                 | 390                 | 0.511    | 0.118  | 37             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.56        | 38.94        | 0.364                 | 362                 | 0.461    | 0.096  | 39             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.3         | 38.831       | 0.354                 | 352                 | 0.471    | 0.116  | 39             | 2048          | 64              | 175 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.06        | 37.717       | 0.393                 | 391                 | 0.509    | 0.115  | 37             | 2048          | 64              | 223 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.01        | 36.952       | 1.035                 | 1033                | 1.151    | 0.116  | 37             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.67        | 39.8         | 1.032                 | 1030                | 1.146    | 0.114  | 38             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 20.12        | 38.617       | 1                     | 998                 | 1.115    | 0.115  | 37             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.48        | 38.593       | 1.088                 | 1085                | 1.242    | 0.153  | 39             | 2048          | 64              | 176 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.02        | 37.317       | 1.066                 | 1064                | 1.183    | 0.116  | 36             | 2048          | 64              | 224 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 137     | 25              | 28                | 0               | 0                  | 29                  | 576         | 0         | 0             | 0                    | 42          |
| cold-create      | 153     | 33              | 34                | 0               | 0                  | 31                  | 606         | 0         | 0             | 0                    | 39          |
| cold-create      | 141     | 22              | 32                | 0               | 0                  | 34                  | 596         | 0         | 0             | 0                    | 39          |
| cold-create      | 160     | 33              | 39                | 0               | 0                  | 34                  | 626         | 0         | 0             | 0                    | 40          |
| cold-create      | 150     | 30              | 33                | 0               | 0                  | 32                  | 621         | 0         | 0             | 0                    | 45          |
| unchanged-update | 134     | 29              | 29                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 36          |
| unchanged-update | 145     | 34              | 33                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 34          |
| unchanged-update | 135     | 27              | 32                | 0               | 0                  | 69                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 138     | 23              | 30                | 0               | 0                  | 73                  | 0           | 0         | 0             | 0                    | 61          |
| unchanged-update | 132     | 25              | 34                | 0               | 0                  | 52                  | 0           | 0         | 0             | 0                    | 45          |
| changed-update   | 144     | 28              | 31                | 0               | 0                  | 51                  | 118         | 0         | 0             | 0                    | 36          |
| changed-update   | 139     | 25              | 33                | 0               | 0                  | 60                  | 159         | 0         | 0             | 0                    | 30          |
| changed-update   | 129     | 18              | 33                | 0               | 0                  | 57                  | 132         | 0         | 0             | 0                    | 43          |
| changed-update   | 129     | 21              | 33                | 0               | 0                  | 57                  | 118         | 0         | 0             | 0                    | 46          |
| changed-update   | 133     | 28              | 31                | 0               | 0                  | 72                  | 145         | 0         | 0             | 0                    | 40          |
| pruned-update    | 143     | 22              | 32                | 0               | 0                  | 65                  | 125         | 650       | 0             | 0                    | 34          |
| pruned-update    | 122     | 25              | 30                | 0               | 0                  | 45                  | 123         | 675       | 0             | 0                    | 47          |
| pruned-update    | 147     | 33              | 31                | 0               | 0                  | 56                  | 132         | 614       | 0             | 0                    | 32          |
| pruned-update    | 156     | 27              | 33                | 0               | 0                  | 60                  | 138         | 671       | 0             | 0                    | 42          |
| pruned-update    | 137     | 21              | 29                | 0               | 0                  | 64                  | 127         | 684       | 0             | 0                    | 41          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 39          | 39             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 13          | 13             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 13          | 13             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.69        | 69.296       | 2.568                 | 2566                | 2.682    | 0.113  | 54             | 1024          | 32              | 37  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.14        | 72.214       | 2.632                 | 2630                | 2.751    | 0.118  | 57             | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 58.02        | 75.63        | 2.611                 | 2609                | 2.731    | 0.119  | 58             | 1024          | 32              | 133 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.69        | 71.03        | 2.566                 | 2564                | 2.683    | 0.116  | 55             | 1024          | 32              | 181 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.59        | 70.467       | 2.538                 | 2536                | 2.657    | 0.118  | 58             | 1024          | 32              | 229 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.87        | 31.445       | 0.554                 | 552                 | 0.67     | 0.115  | 35             | 1024          | 32              | 38  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.64        | 39.372       | 0.521                 | 519                 | 0.636    | 0.115  | 36             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.37        | 36.584       | 0.529                 | 527                 | 0.627    | 0.098  | 36             | 1024          | 32              | 134 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.21        | 33.324       | 0.482                 | 480                 | 0.596    | 0.113  | 35             | 1024          | 32              | 182 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.86        | 32.142       | 0.529                 | 526                 | 0.645    | 0.116  | 35             | 1024          | 32              | 230 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.97        | 37.163       | 0.77                  | 768                 | 0.897    | 0.126  | 36             | 1024          | 32              | 39  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.51        | 35.826       | 0.533                 | 531                 | 0.626    | 0.092  | 36             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.5         | 43.065       | 0.57                  | 568                 | 0.688    | 0.117  | 36             | 1024          | 32              | 135 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.43        | 39.147       | 0.567                 | 564                 | 0.692    | 0.124  | 36             | 1024          | 32              | 183 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.05        | 38.791       | 0.624                 | 622                 | 0.741    | 0.116  | 38             | 1024          | 32              | 231 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.09        | 37.42        | 1.404                 | 1401                | 1.526    | 0.122  | 36             | 1024          | 32              | 40  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.72        | 40.258       | 1.279                 | 1277                | 1.392    | 0.113  | 36             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.89        | 37.641       | 1.374                 | 1371                | 1.492    | 0.118  | 36             | 1024          | 32              | 136 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.41        | 39.141       | 1.394                 | 1392                | 1.51     | 0.116  | 36             | 1024          | 32              | 184 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.11        | 37.991       | 1.365                 | 1363                | 1.48     | 0.114  | 36             | 1024          | 32              | 232 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 280     | 28              | 126               | 2               | 2                  | 30                  | 2212        | 0         | 0             | 0                    | 42          |
| cold-create      | 228     | 24              | 88                | 2               | 2                  | 27                  | 2330        | 0         | 0             | 0                    | 44          |
| cold-create      | 233     | 28              | 86                | 2               | 2                  | 31                  | 2298        | 0         | 0             | 0                    | 44          |
| cold-create      | 242     | 33              | 88                | 2               | 2                  | 26                  | 2255        | 0         | 0             | 0                    | 40          |
| cold-create      | 206     | 22              | 75                | 2               | 2                  | 29                  | 2256        | 0         | 0             | 0                    | 43          |
| unchanged-update | 242     | 27              | 97                | 2               | 2                  | 264                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 217     | 27              | 82                | 2               | 2                  | 254                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 228     | 30              | 87                | 1               | 2                  | 246                 | 0           | 0         | 0             | 0                    | 50          |
| unchanged-update | 234     | 28              | 85                | 2               | 2                  | 197                 | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 244     | 33              | 97                | 2               | 2                  | 238                 | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 300     | 31              | 146               | 2               | 2                  | 289                 | 106         | 0         | 0             | 0                    | 72          |
| changed-update   | 215     | 22              | 93                | 1               | 1                  | 175                 | 96          | 0         | 0             | 0                    | 43          |
| changed-update   | 235     | 26              | 90                | 2               | 2                  | 202                 | 87          | 0         | 0             | 0                    | 42          |
| changed-update   | 230     | 25              | 84                | 2               | 2                  | 205                 | 92          | 0         | 0             | 0                    | 35          |
| changed-update   | 237     | 30              | 85                | 2               | 2                  | 240                 | 101         | 0         | 0             | 0                    | 42          |
| pruned-update    | 285     | 26              | 129               | 2               | 2                  | 209                 | 87          | 758       | 0             | 0                    | 47          |
| pruned-update    | 224     | 24              | 79                | 2               | 2                  | 168                 | 98          | 732       | 0             | 0                    | 39          |
| pruned-update    | 229     | 26              | 93                | 2               | 2                  | 237                 | 102         | 741       | 0             | 0                    | 43          |
| pruned-update    | 238     | 28              | 90                | 2               | 2                  | 249                 | 119         | 723       | 0             | 0                    | 48          |
| pruned-update    | 249     | 33              | 91                | 2               | 2                  | 197                 | 97          | 761       | 0             | 0                    | 41          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 30          | 30             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 1           | 1              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.38        | 68.798       | 1.515                 | 1513                | 1.633    | 0.118  | 71             | 2048          | 64              | 45  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.05        | 71.163       | 1.535                 | 1532                | 1.653    | 0.118  | 52             | 2048          | 64              | 93  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 52.41        | 69.842       | 1.426                 | 1424                | 1.542    | 0.116  | 69             | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.72        | 70.602       | 1.591                 | 1588                | 1.709    | 0.117  | 64             | 2048          | 64              | 189 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.57        | 70.25        | 1.535                 | 1533                | 1.655    | 0.119  | 69             | 2048          | 64              | 237 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.9         | 31.612       | 0.47                  | 468                 | 0.59     | 0.12   | 37             | 2048          | 64              | 46  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.48        | 33.76        | 0.456                 | 454                 | 0.57     | 0.113  | 36             | 2048          | 64              | 94  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.46        | 36.717       | 0.49                  | 487                 | 0.609    | 0.119  | 38             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.23        | 32.983       | 0.534                 | 532                 | 0.652    | 0.117  | 36             | 2048          | 64              | 190 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.89        | 32.631       | 0.488                 | 486                 | 0.611    | 0.122  | 38             | 2048          | 64              | 238 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.97        | 37.239       | 0.563                 | 561                 | 0.66     | 0.097  | 36             | 2048          | 64              | 47  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.62        | 34.928       | 0.609                 | 607                 | 0.729    | 0.119  | 36             | 2048          | 64              | 95  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.54        | 37.274       | 0.509                 | 507                 | 0.626    | 0.117  | 36             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.41        | 38.728       | 0.585                 | 583                 | 0.698    | 0.112  | 35             | 2048          | 64              | 191 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.93        | 38.507       | 0.532                 | 530                 | 0.66     | 0.127  | 36             | 2048          | 64              | 239 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.01        | 37.134       | 1.425                 | 1423                | 1.574    | 0.148  | 36             | 2048          | 64              | 48  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.65        | 40.417       | 1.284                 | 1282                | 1.406    | 0.121  | 36             | 2048          | 64              | 96  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 20.01        | 43.142       | 1.285                 | 1283                | 1.403    | 0.117  | 36             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.42        | 33.339       | 1.405                 | 1403                | 1.527    | 0.121  | 36             | 2048          | 64              | 192 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.05        | 38.808       | 1.373                 | 1371                | 1.524    | 0.15   | 36             | 2048          | 64              | 240 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 235     | 27              | 91                | 2               | 2                  | 24                  | 1220        | 0         | 0             | 0                    | 32          |
| cold-create      | 211     | 36              | 81                | 2               | 2                  | 34                  | 1246        | 0         | 0             | 0                    | 40          |
| cold-create      | 199     | 28              | 88                | 2               | 2                  | 29                  | 1151        | 0         | 0             | 0                    | 43          |
| cold-create      | 211     | 34              | 87                | 2               | 2                  | 30                  | 1270        | 0         | 0             | 0                    | 75          |
| cold-create      | 222     | 34              | 91                | 2               | 2                  | 28                  | 1236        | 0         | 0             | 0                    | 45          |
| unchanged-update | 210     | 28              | 93                | 2               | 2                  | 213                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 222     | 29              | 95                | 2               | 2                  | 189                 | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 217     | 32              | 94                | 2               | 2                  | 229                 | 0           | 0         | 0             | 0                    | 39          |
| unchanged-update | 218     | 31              | 99                | 2               | 2                  | 265                 | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 211     | 34              | 89                | 2               | 2                  | 232                 | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 191     | 32              | 76                | 1               | 2                  | 228                 | 99          | 0         | 0             | 0                    | 41          |
| changed-update   | 230     | 37              | 103               | 2               | 2                  | 228                 | 103         | 0         | 0             | 0                    | 44          |
| changed-update   | 192     | 25              | 83                | 2               | 2                  | 183                 | 87          | 0         | 0             | 0                    | 43          |
| changed-update   | 210     | 28              | 94                | 2               | 2                  | 236                 | 95          | 0         | 0             | 0                    | 39          |
| changed-update   | 195     | 33              | 78                | 2               | 2                  | 202                 | 85          | 0         | 0             | 0                    | 46          |
| pruned-update    | 218     | 26              | 83                | 2               | 3                  | 260                 | 103         | 781       | 0             | 0                    | 44          |
| pruned-update    | 199     | 24              | 91                | 2               | 2                  | 188                 | 92          | 745       | 0             | 0                    | 45          |
| pruned-update    | 213     | 28              | 91                | 2               | 2                  | 210                 | 92          | 717       | 0             | 0                    | 39          |
| pruned-update    | 239     | 27              | 90                | 2               | 2                  | 246                 | 114         | 735       | 0             | 0                    | 49          |
| pruned-update    | 218     | 27              | 84                | 2               | 2                  | 267                 | 99          | 733       | 0             | 0                    | 39          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 55          | 55             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 41          | 41             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 43          | 43             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
