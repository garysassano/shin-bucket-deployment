# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-08-26                  |
| Regions             | eu-central-1                |
| Profiles            | mixed, tiny-many, large-few |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.18        | 88.769       | 2.157                 | 2153                | 2.31     | 0.152  | 128            | 1024          | 32              | 29  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.78        | 74.381       | 2.48                  | 2477                | 2.595    | 0.114  | 117            | 1024          | 32              | 73  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.74        | 83.434       | 2.453                 | 2450                | 2.571    | 0.117  | 119            | 1024          | 32              | 105 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.44        | 86.506       | 2.258                 | 2255                | 2.375    | 0.116  | 120            | 1024          | 32              | 141 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.9         | 89.813       | 2.254                 | 2251                | 2.371    | 0.117  | 128            | 1024          | 32              | 177 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.99        | 35.444       | 0.288                 | 284                 | 0.433    | 0.145  | 32             | 1024          | 32              | 30  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.16        | 41.865       | 0.237                 | 234                 | 0.354    | 0.116  | 32             | 1024          | 32              | 74  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.01        | 35.413       | 0.315                 | 312                 | 0.428    | 0.112  | 32             | 1024          | 32              | 106 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.03        | 35.414       | 0.327                 | 324                 | 0.446    | 0.118  | 32             | 1024          | 32              | 142 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.03        | 35.594       | 0.316                 | 314                 | 0.413    | 0.096  | 32             | 1024          | 32              | 178 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.2         | 36.979       | 0.606                 | 604                 | 0.702    | 0.096  | 39             | 1024          | 32              | 31  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.16        | 42.133       | 0.61                  | 607                 | 0.727    | 0.116  | 39             | 1024          | 32              | 75  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.13        | 42.533       | 0.549                 | 546                 | 0.646    | 0.096  | 40             | 1024          | 32              | 107 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.15        | 42.415       | 0.607                 | 603                 | 0.725    | 0.118  | 41             | 1024          | 32              | 143 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.16        | 36.657       | 0.546                 | 543                 | 0.64     | 0.094  | 39             | 1024          | 32              | 179 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.36        | 43.195       | 0.5                   | 497                 | 0.615    | 0.115  | 38             | 1024          | 32              | 32  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.32        | 36.927       | 0.63                  | 627                 | 0.746    | 0.116  | 40             | 1024          | 32              | 76  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.3         | 42.562       | 0.641                 | 637                 | 0.763    | 0.121  | 39             | 1024          | 32              | 108 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.27        | 42.344       | 0.678                 | 675                 | 0.796    | 0.117  | 41             | 1024          | 32              | 144 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.31        | 37.658       | 0.625                 | 622                 | 0.747    | 0.121  | 39             | 1024          | 32              | 180 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 199     | 37              | 32                | 0               | 0                  | 31                  | 1893        | 0         | 0             | 0                    | 30          |
| cold-create      | 270     | 66              | 89                | 0               | 0                  | 28                  | 2135        | 0         | 0             | 0                    | 43          |
| cold-create      | 251     | 69              | 78                | 0               | 0                  | 31                  | 2121        | 0         | 0             | 0                    | 45          |
| cold-create      | 273     | 74              | 96                | 0               | 0                  | 28                  | 1910        | 0         | 0             | 0                    | 41          |
| cold-create      | 251     | 76              | 66                | 0               | 0                  | 29                  | 1935        | 0         | 0             | 0                    | 34          |
| unchanged-update | 205     | 51              | 29                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 169     | 38              | 28                | 0               | 0                  | 30                  | 0           | 0         | 0             | 0                    | 34          |
| unchanged-update | 221     | 50              | 72                | 0               | 0                  | 44                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 244     | 69              | 66                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 233     | 67              | 56                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 46          |
| changed-update   | 250     | 72              | 75                | 0               | 0                  | 32                  | 281         | 0         | 0             | 0                    | 39          |
| changed-update   | 275     | 87              | 71                | 0               | 0                  | 37                  | 249         | 0         | 0             | 0                    | 44          |
| changed-update   | 230     | 62              | 68                | 0               | 0                  | 35                  | 241         | 0         | 0             | 0                    | 39          |
| changed-update   | 245     | 68              | 69                | 0               | 0                  | 33                  | 280         | 0         | 0             | 0                    | 44          |
| changed-update   | 256     | 76              | 71                | 0               | 0                  | 33                  | 206         | 0         | 0             | 0                    | 47          |
| pruned-update    | 164     | 25              | 33                | 0               | 0                  | 35                  | 171         | 71        | 0             | 0                    | 42          |
| pruned-update    | 265     | 80              | 77                | 0               | 0                  | 35                  | 199         | 66        | 0             | 0                    | 45          |
| pruned-update    | 271     | 84              | 78                | 0               | 0                  | 34                  | 213         | 63        | 0             | 0                    | 39          |
| pruned-update    | 260     | 78              | 73                | 0               | 0                  | 36                  | 233         | 92        | 0             | 0                    | 40          |
| pruned-update    | 290     | 75              | 104               | 0               | 0                  | 33                  | 178         | 68        | 0             | 0                    | 37          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33212271            | 536870912           | 0                             | 33212271                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33553688            | 536870912           | 0                             | 33553688                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33133865            | 536870912           | 0                             | 33133865                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33118142            | 536870912           | 0                             | 33118142                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33491545            | 536870912           | 0                             | 33491545                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 271         | 271            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 149         | 149            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 320         | 320            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 234         | 234            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 130         | 130            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.8         | 85.916       | 1.225                 | 1223                | 1.341    | 0.115  | 181            | 2048          | 64              | 25  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.85        | 75.445       | 1.261                 | 1258                | 1.385    | 0.123  | 186            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.65        | 74.915       | 1.249                 | 1245                | 1.364    | 0.115  | 177            | 2048          | 64              | 113 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.82        | 74.629       | 1.349                 | 1346                | 1.503    | 0.154  | 189            | 2048          | 64              | 145 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.47        | 69.182       | 1.057                 | 1055                | 1.154    | 0.096  | 167            | 2048          | 64              | 181 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.01        | 35.64        | 0.227                 | 222                 | 0.339    | 0.112  | 32             | 2048          | 64              | 26  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.01        | 35.7         | 0.24                  | 236                 | 0.357    | 0.117  | 32             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.06        | 35.401       | 0.265                 | 262                 | 0.393    | 0.127  | 32             | 2048          | 64              | 114 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.03        | 35.425       | 0.232                 | 229                 | 0.329    | 0.096  | 32             | 2048          | 64              | 146 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.12        | 45.04        | 0.253                 | 249                 | 0.368    | 0.115  | 32             | 2048          | 64              | 182 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.14        | 58.724       | 0.579                 | 576                 | 0.706    | 0.127  | 40             | 2048          | 64              | 27  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.13        | 41.983       | 0.492                 | 489                 | 0.611    | 0.119  | 43             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.24        | 42.449       | 0.546                 | 543                 | 0.663    | 0.116  | 38             | 2048          | 64              | 115 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.11        | 36.502       | 0.541                 | 538                 | 0.658    | 0.116  | 37             | 2048          | 64              | 147 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.16        | 41.792       | 0.552                 | 548                 | 0.67     | 0.118  | 38             | 2048          | 64              | 183 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.26        | 55.899       | 0.566                 | 562                 | 0.713    | 0.147  | 40             | 2048          | 64              | 28  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.42        | 42.474       | 0.492                 | 489                 | 0.616    | 0.123  | 38             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.3         | 48.647       | 0.589                 | 585                 | 0.705    | 0.115  | 39             | 2048          | 64              | 116 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.41        | 54.974       | 0.569                 | 566                 | 0.683    | 0.113  | 39             | 2048          | 64              | 148 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.37        | 42.332       | 0.569                 | 565                 | 0.666    | 0.097  | 38             | 2048          | 64              | 184 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 214     | 63              | 70                | 0               | 0                  | 30                  | 932         | 0         | 0             | 0                    | 44          |
| cold-create      | 158     | 29              | 36                | 0               | 0                  | 30                  | 1028        | 0         | 0             | 0                    | 41          |
| cold-create      | 170     | 51              | 33                | 0               | 0                  | 29                  | 1001        | 0         | 0             | 0                    | 44          |
| cold-create      | 170     | 45              | 32                | 0               | 0                  | 26                  | 1105        | 0         | 0             | 0                    | 43          |
| cold-create      | 156     | 47              | 31                | 0               | 0                  | 28                  | 827         | 0         | 0             | 0                    | 42          |
| unchanged-update | 143     | 22              | 34                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 165     | 46              | 37                | 0               | 0                  | 28                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 180     | 63              | 31                | 0               | 0                  | 39                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 162     | 44              | 45                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 33          |
| unchanged-update | 184     | 57              | 42                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 32          |
| changed-update   | 250     | 105             | 61                | 0               | 0                  | 34                  | 249         | 0         | 0             | 0                    | 41          |
| changed-update   | 185     | 44              | 64                | 0               | 0                  | 35                  | 228         | 0         | 0             | 0                    | 40          |
| changed-update   | 251     | 92              | 84                | 0               | 0                  | 34                  | 211         | 0         | 0             | 0                    | 45          |
| changed-update   | 258     | 71              | 83                | 0               | 0                  | 37                  | 201         | 0         | 0             | 0                    | 41          |
| changed-update   | 230     | 64              | 80                | 0               | 0                  | 36                  | 241         | 0         | 0             | 0                    | 41          |
| pruned-update    | 220     | 68              | 56                | 0               | 0                  | 38                  | 178         | 66        | 0             | 0                    | 45          |
| pruned-update    | 169     | 53              | 33                | 0               | 0                  | 34                  | 172         | 58        | 0             | 0                    | 40          |
| pruned-update    | 216     | 89              | 54                | 0               | 0                  | 45                  | 205         | 63        | 0             | 0                    | 40          |
| pruned-update    | 205     | 71              | 57                | 0               | 0                  | 32                  | 196         | 74        | 0             | 0                    | 40          |
| pruned-update    | 196     | 58              | 59                | 0               | 0                  | 38                  | 218         | 63        | 0             | 0                    | 36          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 89309456            | 1073741824          | 0                             | 89309456                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 96765230            | 1073741824          | 0                             | 96765230                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 89309456            | 1073741824          | 0                             | 89309456                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 155         | 155            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 12                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 134         | 134            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 7                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 124         | 124            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 190         | 190            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 8                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 142         | 142            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 12                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.21        | 75.907       | 1.455                 | 1451                | 1.58     | 0.125  | 106            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.86        | 80.296       | 1.099                 | 1096                | 1.192    | 0.093  | 102            | 1024          | 32              | 49  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 54.85        | 70.695       | 1.082                 | 1079                | 1.176    | 0.094  | 102            | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.31        | 68.6         | 1.463                 | 1459                | 1.612    | 0.149  | 99             | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.78        | 72.828       | 1.394                 | 1391                | 1.514    | 0.12   | 98             | 1024          | 32              | 153 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.02        | 35.986       | 0.274                 | 271                 | 0.369    | 0.095  | 32             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.08        | 35.907       | 0.3                   | 296                 | 0.413    | 0.113  | 34             | 1024          | 32              | 50  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.04        | 35.555       | 0.32                  | 316                 | 0.468    | 0.148  | 33             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.05        | 35.182       | 0.297                 | 293                 | 0.421    | 0.124  | 34             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19           | 35.285       | 0.318                 | 315                 | 0.438    | 0.12   | 32             | 1024          | 32              | 154 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.15        | 41.584       | 0.399                 | 395                 | 0.517    | 0.118  | 36             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.26        | 41.623       | 0.503                 | 499                 | 0.657    | 0.154  | 39             | 1024          | 32              | 51  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.16        | 42.094       | 0.552                 | 548                 | 0.676    | 0.123  | 38             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.15        | 40.856       | 0.506                 | 503                 | 0.625    | 0.119  | 39             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.13        | 36.193       | 0.494                 | 490                 | 0.612    | 0.118  | 37             | 1024          | 32              | 155 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.31        | 41.503       | 1.103                 | 1099                | 1.199    | 0.095  | 37             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.28        | 41.749       | 1.304                 | 1301                | 1.418    | 0.114  | 36             | 1024          | 32              | 52  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.34        | 41.62        | 1.174                 | 1171                | 1.301    | 0.127  | 37             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.26        | 37.864       | 1.203                 | 1199                | 1.322    | 0.119  | 36             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.33        | 41.693       | 1.307                 | 1304                | 1.425    | 0.118  | 37             | 1024          | 32              | 156 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 297     | 75              | 112               | 0               | 0                  | 30                  | 1085        | 0         | 0             | 0                    | 39          |
| cold-create      | 257     | 77              | 67                | 0               | 0                  | 28                  | 770         | 0         | 0             | 0                    | 40          |
| cold-create      | 252     | 84              | 79                | 0               | 0                  | 26                  | 759         | 0         | 0             | 0                    | 41          |
| cold-create      | 279     | 84              | 64                | 0               | 0                  | 27                  | 1111        | 0         | 0             | 0                    | 39          |
| cold-create      | 272     | 98              | 68                | 0               | 0                  | 33                  | 1041        | 0         | 0             | 0                    | 43          |
| unchanged-update | 165     | 31              | 37                | 0               | 0                  | 65                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 198     | 51              | 34                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 207     | 55              | 28                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 192     | 58              | 30                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 204     | 59              | 31                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 47          |
| changed-update   | 164     | 24              | 31                | 0               | 0                  | 61                  | 133         | 0         | 0             | 0                    | 35          |
| changed-update   | 249     | 60              | 60                | 0               | 0                  | 57                  | 150         | 0         | 0             | 0                    | 41          |
| changed-update   | 256     | 67              | 79                | 0               | 0                  | 49                  | 143         | 0         | 0             | 0                    | 99          |
| changed-update   | 237     | 65              | 63                | 0               | 0                  | 56                  | 162         | 0         | 0             | 0                    | 46          |
| changed-update   | 266     | 92              | 63                | 0               | 0                  | 44                  | 143         | 0         | 0             | 0                    | 36          |
| pruned-update    | 174     | 26              | 35                | 0               | 0                  | 62                  | 121         | 685       | 0             | 0                    | 41          |
| pruned-update    | 249     | 79              | 68                | 0               | 0                  | 70                  | 215         | 707       | 0             | 0                    | 43          |
| pruned-update    | 241     | 60              | 71                | 0               | 0                  | 54                  | 166         | 653       | 0             | 0                    | 42          |
| pruned-update    | 259     | 68              | 91                | 0               | 0                  | 60                  | 172         | 649       | 0             | 0                    | 42          |
| pruned-update    | 306     | 84              | 110               | 0               | 0                  | 69                  | 203         | 667       | 0             | 0                    | 44          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 17          | 17             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 51.76        | 70.397       | 0.827                 | 823                 | 0.943    | 0.116  | 111            | 2048          | 64              | 1   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.54        | 73.178       | 0.73                  | 727                 | 0.828    | 0.098  | 107            | 2048          | 64              | 53  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.5         | 68.336       | 0.951                 | 948                 | 1.063    | 0.112  | 118            | 2048          | 64              | 89  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.31        | 68.152       | 0.9                   | 897                 | 1.025    | 0.124  | 107            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.02        | 78.874       | 0.846                 | 842                 | 0.967    | 0.121  | 114            | 2048          | 64              | 157 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.01        | 35.574       | 0.28                  | 276                 | 0.43     | 0.149  | 34             | 2048          | 64              | 2   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.09        | 36.199       | 0.256                 | 253                 | 0.381    | 0.125  | 32             | 2048          | 64              | 54  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.96        | 35.666       | 0.282                 | 279                 | 0.397    | 0.115  | 33             | 2048          | 64              | 90  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.99        | 35.65        | 0.292                 | 289                 | 0.41     | 0.117  | 33             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.01        | 35.139       | 0.279                 | 276                 | 0.402    | 0.122  | 33             | 2048          | 64              | 158 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.12        | 46.157       | 0.469                 | 466                 | 0.566    | 0.097  | 36             | 2048          | 64              | 3   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.18        | 45.792       | 0.402                 | 399                 | 0.517    | 0.115  | 39             | 2048          | 64              | 55  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.14        | 41.28        | 0.415                 | 412                 | 0.533    | 0.118  | 36             | 2048          | 64              | 91  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.14        | 41.151       | 0.476                 | 473                 | 0.595    | 0.119  | 39             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.16        | 42.473       | 0.442                 | 439                 | 0.563    | 0.12   | 36             | 2048          | 64              | 159 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.28        | 46.51        | 1.154                 | 1150                | 1.275    | 0.12   | 39             | 2048          | 64              | 4   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.18        | 41.643       | 1.085                 | 1082                | 1.198    | 0.113  | 38             | 2048          | 64              | 56  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.4         | 41.681       | 1.168                 | 1164                | 1.282    | 0.114  | 40             | 2048          | 64              | 92  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.32        | 45.488       | 1.201                 | 1197                | 1.351    | 0.15   | 39             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.2         | 47.023       | 1.137                 | 1134                | 1.263    | 0.126  | 39             | 2048          | 64              | 160 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 146     | 26              | 34                | 0               | 0                  | 31                  | 603         | 0         | 0             | 0                    | 42          |
| cold-create      | 138     | 31              | 31                | 0               | 0                  | 27                  | 468         | 0         | 0             | 0                    | 92          |
| cold-create      | 159     | 36              | 34                | 0               | 0                  | 31                  | 657         | 0         | 0             | 0                    | 99          |
| cold-create      | 159     | 51              | 29                | 0               | 0                  | 35                  | 659         | 0         | 0             | 0                    | 43          |
| cold-create      | 163     | 52              | 33                | 0               | 0                  | 29                  | 603         | 0         | 0             | 0                    | 46          |
| unchanged-update | 176     | 47              | 32                | 0               | 0                  | 58                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 140     | 25              | 36                | 0               | 0                  | 55                  | 0           | 0         | 0             | 0                    | 56          |
| unchanged-update | 184     | 67              | 35                | 0               | 0                  | 51                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 176     | 66              | 31                | 0               | 0                  | 67                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 169     | 58              | 31                | 0               | 0                  | 71                  | 0           | 0         | 0             | 0                    | 34          |
| changed-update   | 178     | 71              | 34                | 0               | 0                  | 62                  | 178         | 0         | 0             | 0                    | 46          |
| changed-update   | 145     | 27              | 31                | 0               | 0                  | 56                  | 157         | 0         | 0             | 0                    | 39          |
| changed-update   | 185     | 71              | 37                | 0               | 0                  | 53                  | 144         | 0         | 0             | 0                    | 28          |
| changed-update   | 199     | 72              | 53                | 0               | 0                  | 68                  | 168         | 0         | 0             | 0                    | 37          |
| changed-update   | 180     | 60              | 34                | 0               | 0                  | 61                  | 153         | 0         | 0             | 0                    | 44          |
| pruned-update    | 246     | 61              | 82                | 0               | 0                  | 69                  | 162         | 620       | 0             | 0                    | 37          |
| pruned-update    | 145     | 27              | 40                | 0               | 0                  | 60                  | 126         | 692       | 0             | 0                    | 43          |
| pruned-update    | 237     | 68              | 78                | 0               | 0                  | 56                  | 191         | 618       | 0             | 0                    | 43          |
| pruned-update    | 253     | 57              | 89                | 0               | 0                  | 66                  | 188         | 631       | 0             | 0                    | 44          |
| pruned-update    | 210     | 47              | 86                | 0               | 0                  | 65                  | 127         | 673       | 0             | 0                    | 44          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 145         | 145            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 18          | 18             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |

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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.76        | 74.322       | 2.489                 | 2486                | 2.606    | 0.116  | 57             | 1024          | 32              | 17  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.9         | 74.31        | 2.647                 | 2644                | 2.764    | 0.116  | 56             | 1024          | 32              | 61  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.86        | 73.846       | 2.606                 | 2603                | 2.725    | 0.119  | 57             | 1024          | 32              | 97  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.66        | 73.807       | 2.673                 | 2669                | 2.787    | 0.114  | 56             | 1024          | 32              | 129 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.8         | 74.569       | 2.72                  | 2717                | 2.841    | 0.121  | 59             | 1024          | 32              | 165 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19           | 35.345       | 0.523                 | 520                 | 0.639    | 0.115  | 35             | 1024          | 32              | 18  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.06        | 35.471       | 0.515                 | 511                 | 0.635    | 0.12   | 37             | 1024          | 32              | 62  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.99        | 35.501       | 0.521                 | 517                 | 0.672    | 0.151  | 35             | 1024          | 32              | 98  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.98        | 46.07        | 0.574                 | 571                 | 0.69     | 0.116  | 35             | 1024          | 32              | 130 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.94        | 35.917       | 0.479                 | 476                 | 0.592    | 0.112  | 35             | 1024          | 32              | 166 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.21        | 41.764       | 0.605                 | 602                 | 0.728    | 0.123  | 35             | 1024          | 32              | 19  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.14        | 42.322       | 0.614                 | 611                 | 0.733    | 0.119  | 35             | 1024          | 32              | 63  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.17        | 41.628       | 0.631                 | 628                 | 0.746    | 0.114  | 37             | 1024          | 32              | 99  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.1         | 41.542       | 0.75                  | 747                 | 0.866    | 0.115  | 36             | 1024          | 32              | 131 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.14        | 41.596       | 0.744                 | 741                 | 0.893    | 0.148  | 35             | 1024          | 32              | 167 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.32        | 48.166       | 1.424                 | 1421                | 1.552    | 0.127  | 35             | 1024          | 32              | 20  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.33        | 46.129       | 1.38                  | 1377                | 1.5      | 0.119  | 35             | 1024          | 32              | 64  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.36        | 47.256       | 1.356                 | 1353                | 1.475    | 0.118  | 35             | 1024          | 32              | 100 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.23        | 41.572       | 1.472                 | 1469                | 1.591    | 0.118  | 35             | 1024          | 32              | 132 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.31        | 36.261       | 1.509                 | 1506                | 1.625    | 0.115  | 37             | 1024          | 32              | 168 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 242     | 40              | 86                | 2               | 2                  | 32                  | 2177        | 0         | 0             | 0                    | 34          |
| cold-create      | 334     | 26              | 186               | 2               | 2                  | 30                  | 2222        | 0         | 0             | 0                    | 57          |
| cold-create      | 349     | 23              | 214               | 2               | 2                  | 36                  | 2180        | 0         | 0             | 0                    | 37          |
| cold-create      | 276     | 24              | 137               | 2               | 2                  | 31                  | 2317        | 0         | 0             | 0                    | 44          |
| cold-create      | 297     | 26              | 139               | 2               | 2                  | 26                  | 2331        | 0         | 0             | 0                    | 61          |
| unchanged-update | 232     | 27              | 91                | 2               | 2                  | 247                 | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 232     | 26              | 91                | 2               | 2                  | 233                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 258     | 33              | 84                | 2               | 3                  | 228                 | 0           | 0         | 0             | 0                    | 29          |
| unchanged-update | 268     | 38              | 103               | 2               | 2                  | 257                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 230     | 29              | 93                | 2               | 2                  | 197                 | 0           | 0         | 0             | 0                    | 46          |
| changed-update   | 226     | 33              | 82                | 2               | 2                  | 230                 | 103         | 0         | 0             | 0                    | 41          |
| changed-update   | 295     | 30              | 152               | 2               | 2                  | 184                 | 90          | 0         | 0             | 0                    | 40          |
| changed-update   | 306     | 26              | 155               | 2               | 2                  | 187                 | 97          | 0         | 0             | 0                    | 35          |
| changed-update   | 337     | 31              | 181               | 2               | 2                  | 256                 | 116         | 0         | 0             | 0                    | 36          |
| changed-update   | 331     | 30              | 168               | 3               | 3                  | 252                 | 111         | 0         | 0             | 0                    | 45          |
| pruned-update    | 260     | 33              | 106               | 2               | 2                  | 224                 | 98          | 785       | 0             | 0                    | 39          |
| pruned-update    | 229     | 31              | 82                | 2               | 2                  | 254                 | 94          | 739       | 0             | 0                    | 44          |
| pruned-update    | 331     | 34              | 186               | 2               | 2                  | 182                 | 97          | 688       | 0             | 0                    | 44          |
| pruned-update    | 293     | 30              | 146               | 2               | 2                  | 246                 | 101         | 773       | 0             | 0                    | 42          |
| pruned-update    | 294     | 29              | 150               | 2               | 2                  | 235                 | 99          | 823       | 0             | 0                    | 39          |

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
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 1           | 1              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 51.81        | 70.885       | 1.54                  | 1537                | 1.663    | 0.123  | 68             | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.87        | 73.749       | 1.529                 | 1526                | 1.643    | 0.113  | 75             | 2048          | 64              | 65  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.81        | 74.05        | 1.425                 | 1422                | 1.524    | 0.099  | 63             | 2048          | 64              | 101 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.37        | 83.762       | 1.589                 | 1586                | 1.708    | 0.118  | 71             | 2048          | 64              | 137 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.69        | 73.92        | 1.514                 | 1511                | 1.633    | 0.118  | 70             | 2048          | 64              | 169 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.97        | 35.181       | 0.497                 | 494                 | 0.591    | 0.094  | 35             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.05        | 35.429       | 0.399                 | 395                 | 0.515    | 0.116  | 35             | 2048          | 64              | 66  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.74        | 37.761       | 0.556                 | 552                 | 0.707    | 0.151  | 35             | 2048          | 64              | 102 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.99        | 35.337       | 0.508                 | 504                 | 0.626    | 0.117  | 37             | 2048          | 64              | 138 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.01        | 35.776       | 0.5                   | 497                 | 0.6      | 0.1    | 35             | 2048          | 64              | 170 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.18        | 38.779       | 0.621                 | 618                 | 0.768    | 0.146  | 36             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.17        | 41.893       | 0.592                 | 589                 | 0.707    | 0.114  | 35             | 2048          | 64              | 67  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.13        | 41.502       | 0.573                 | 570                 | 0.696    | 0.123  | 35             | 2048          | 64              | 103 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.18        | 42.144       | 0.652                 | 648                 | 0.801    | 0.148  | 35             | 2048          | 64              | 139 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.17        | 36.917       | 0.594                 | 591                 | 0.713    | 0.118  | 35             | 2048          | 64              | 171 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.54        | 43.517       | 1.35                  | 1346                | 1.47     | 0.12   | 35             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.31        | 42.091       | 1.413                 | 1411                | 1.51     | 0.096  | 35             | 2048          | 64              | 68  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.29        | 41.864       | 1.344                 | 1340                | 1.469    | 0.125  | 35             | 2048          | 64              | 104 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.29        | 49.177       | 1.349                 | 1346                | 1.467    | 0.117  | 35             | 2048          | 64              | 140 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 24.46        | 46.737       | 1.256                 | 1252                | 1.373    | 0.117  | 35             | 2048          | 64              | 172 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 262     | 31              | 140               | 2               | 2                  | 31                  | 1203        | 0         | 0             | 0                    | 40          |
| cold-create      | 195     | 24              | 86                | 2               | 2                  | 29                  | 1266        | 0         | 0             | 0                    | 34          |
| cold-create      | 186     | 25              | 86                | 2               | 2                  | 31                  | 1165        | 0         | 0             | 0                    | 38          |
| cold-create      | 205     | 33              | 86                | 2               | 2                  | 29                  | 1305        | 0         | 0             | 0                    | 46          |
| cold-create      | 198     | 26              | 85                | 2               | 2                  | 31                  | 1242        | 0         | 0             | 0                    | 38          |
| unchanged-update | 199     | 28              | 92                | 1               | 2                  | 249                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 187     | 33              | 73                | 2               | 2                  | 162                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 243     | 29              | 95                | 3               | 3                  | 268                 | 1           | 0         | 0             | 0                    | 38          |
| unchanged-update | 206     | 29              | 89                | 2               | 2                  | 259                 | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 215     | 29              | 102               | 1               | 2                  | 236                 | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 237     | 27              | 102               | 3               | 3                  | 231                 | 108         | 0         | 0             | 0                    | 39          |
| changed-update   | 207     | 27              | 95                | 2               | 2                  | 234                 | 111         | 0         | 0             | 0                    | 36          |
| changed-update   | 202     | 32              | 84                | 2               | 2                  | 233                 | 103         | 0         | 0             | 0                    | 29          |
| changed-update   | 236     | 27              | 98                | 3               | 3                  | 265                 | 101         | 0         | 0             | 0                    | 43          |
| changed-update   | 219     | 26              | 102               | 2               | 2                  | 231                 | 100         | 0         | 0             | 0                    | 39          |
| pruned-update    | 254     | 33              | 128               | 2               | 2                  | 193                 | 108         | 736       | 0             | 0                    | 42          |
| pruned-update    | 280     | 31              | 173               | 1               | 1                  | 234                 | 99          | 738       | 0             | 0                    | 42          |
| pruned-update    | 217     | 33              | 93                | 2               | 2                  | 208                 | 107         | 750       | 0             | 0                    | 42          |
| pruned-update    | 205     | 24              | 89                | 2               | 2                  | 175                 | 105         | 781       | 0             | 0                    | 61          |
| pruned-update    | 212     | 28              | 91                | 2               | 2                  | 172                 | 84          | 734       | 0             | 0                    | 39          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 44          | 44             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
