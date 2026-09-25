# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-09-25                  |
| Regions             | eu-central-1                |
| Profiles            | large-few, mixed, tiny-many |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.19        | 69.556       | 2.014                 | 2012                | 2.132    | 0.117  | 119            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.76        | 93.647       | 2.008                 | 2006                | 2.129    | 0.121  | 125            | 1024          | 32              | 53  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 51.92        | 72.408       | 1.907                 | 1904                | 2.03     | 0.123  | 115            | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.11        | 72.11        | 2.367                 | 2364                | 2.486    | 0.119  | 117            | 1024          | 32              | 149 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.7         | 74.7         | 1.977                 | 1975                | 2.094    | 0.117  | 121            | 1024          | 32              | 197 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.93        | 38.748       | 0.239                 | 237                 | 0.355    | 0.115  | 35             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.38        | 36.862       | 0.247                 | 245                 | 0.364    | 0.117  | 35             | 1024          | 32              | 54  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.87        | 39.214       | 0.282                 | 280                 | 0.416    | 0.134  | 35             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.89        | 32.273       | 0.319                 | 317                 | 0.437    | 0.117  | 37             | 1024          | 32              | 150 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.04        | 35.205       | 0.336                 | 333                 | 0.454    | 0.118  | 35             | 1024          | 32              | 198 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.97        | 38.404       | 0.43                  | 428                 | 0.558    | 0.127  | 45             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.51        | 44.481       | 0.449                 | 447                 | 0.566    | 0.117  | 43             | 1024          | 32              | 55  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.12        | 41.445       | 0.427                 | 425                 | 0.543    | 0.115  | 42             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.07        | 39.65        | 0.624                 | 622                 | 0.752    | 0.127  | 42             | 1024          | 32              | 151 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.19        | 41.531       | 0.449                 | 447                 | 0.568    | 0.118  | 41             | 1024          | 32              | 199 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.05        | 37.774       | 0.886                 | 884                 | 1.004    | 0.117  | 43             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.96        | 37.474       | 0.523                 | 521                 | 0.645    | 0.121  | 42             | 1024          | 32              | 56  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.02        | 40.634       | 0.527                 | 524                 | 0.652    | 0.125  | 42             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.13        | 38.211       | 0.513                 | 510                 | 0.634    | 0.121  | 42             | 1024          | 32              | 152 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.3         | 41.861       | 0.704                 | 702                 | 0.822    | 0.118  | 42             | 1024          | 32              | 200 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 174     | 26              | 32                | 0               | 0                  | 32                  | 1764        | 0         | 0             | 0                    | 42          |
| cold-create      | 171     | 25              | 31                | 0               | 0                  | 29                  | 1765        | 0         | 0             | 0                    | 40          |
| cold-create      | 168     | 24              | 30                | 0               | 0                  | 32                  | 1658        | 0         | 0             | 0                    | 45          |
| cold-create      | 314     | 91              | 114               | 0               | 0                  | 32                  | 1980        | 0         | 0             | 0                    | 37          |
| cold-create      | 171     | 26              | 32                | 0               | 0                  | 39                  | 1722        | 0         | 0             | 0                    | 40          |
| unchanged-update | 164     | 25              | 31                | 0               | 0                  | 26                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 165     | 22              | 30                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 173     | 27              | 32                | 0               | 0                  | 38                  | 0           | 0         | 0             | 0                    | 67          |
| unchanged-update | 217     | 58              | 47                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 69          |
| unchanged-update | 175     | 28              | 31                | 0               | 0                  | 110                 | 0           | 0         | 0             | 0                    | 47          |
| changed-update   | 162     | 25              | 29                | 0               | 0                  | 32                  | 191         | 0         | 0             | 0                    | 41          |
| changed-update   | 158     | 27              | 28                | 0               | 0                  | 35                  | 203         | 0         | 0             | 0                    | 49          |
| changed-update   | 150     | 21              | 25                | 0               | 0                  | 27                  | 202         | 0         | 0             | 0                    | 44          |
| changed-update   | 299     | 88              | 96                | 0               | 0                  | 35                  | 244         | 0         | 0             | 0                    | 43          |
| changed-update   | 165     | 23              | 34                | 0               | 0                  | 31                  | 210         | 0         | 0             | 0                    | 39          |
| pruned-update    | 175     | 27              | 33                | 0               | 0                  | 46                  | 279         | 194       | 0             | 0                    | 41          |
| pruned-update    | 173     | 32              | 34                | 0               | 0                  | 34                  | 192         | 62        | 0             | 0                    | 44          |
| pruned-update    | 172     | 27              | 29                | 0               | 0                  | 34                  | 203         | 53        | 0             | 0                    | 43          |
| pruned-update    | 162     | 27              | 31                | 0               | 0                  | 29                  | 191         | 74        | 0             | 0                    | 43          |
| pruned-update    | 338     | 117             | 105               | 0               | 0                  | 32                  | 215         | 61        | 0             | 0                    | 43          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33537965            | 536870912           | 0                             | 33537965                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33490801            | 536870912           | 0                             | 33490801                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33537965            | 536870912           | 0                             | 33537965                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33537965            | 536870912           | 0                             | 33537965                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 190         | 190            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 246         | 246            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 196         | 196            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 148         | 148            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 12           | 0               | 170         | 170            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 9                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.25        | 70.533       | 1.278                 | 1276                | 1.397    | 0.119  | 162            | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.27        | 69.929       | 1.247                 | 1245                | 1.367    | 0.12   | 207            | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.26        | 72.886       | 1.217                 | 1215                | 1.335    | 0.117  | 203            | 2048          | 64              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.13        | 69.029       | 1.181                 | 1178                | 1.304    | 0.123  | 183            | 2048          | 64              | 157 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 51.77        | 67.801       | 1.181                 | 1179                | 1.308    | 0.126  | 187            | 2048          | 64              | 205 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.96        | 32.484       | 0.231                 | 229                 | 0.352    | 0.12   | 35             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.36        | 39.445       | 0.219                 | 217                 | 0.335    | 0.116  | 35             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.86        | 38.093       | 0.206                 | 204                 | 0.304    | 0.097  | 35             | 2048          | 64              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.85        | 35.995       | 0.251                 | 249                 | 0.369    | 0.117  | 37             | 2048          | 64              | 158 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.05        | 35.116       | 0.216                 | 214                 | 0.34     | 0.123  | 35             | 2048          | 64              | 206 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.97        | 38.047       | 0.47                  | 467                 | 0.631    | 0.16   | 42             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.52        | 42.744       | 0.369                 | 367                 | 0.497    | 0.127  | 43             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.9         | 35.778       | 0.383                 | 381                 | 0.502    | 0.119  | 43             | 2048          | 64              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.04        | 38.088       | 0.404                 | 402                 | 0.532    | 0.127  | 43             | 2048          | 64              | 159 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.19        | 38.81        | 0.538                 | 536                 | 0.66     | 0.121  | 41             | 2048          | 64              | 207 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.1         | 37.97        | 0.493                 | 491                 | 0.62     | 0.126  | 40             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.96        | 37.764       | 0.466                 | 464                 | 0.581    | 0.114  | 41             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.09        | 41.381       | 0.551                 | 549                 | 0.676    | 0.125  | 42             | 2048          | 64              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.06        | 40.079       | 0.459                 | 457                 | 0.581    | 0.121  | 42             | 2048          | 64              | 160 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.48        | 44.118       | 0.484                 | 482                 | 0.606    | 0.122  | 41             | 2048          | 64              | 208 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 139     | 29              | 32                | 0               | 0                  | 32                  | 1062        | 0         | 0             | 0                    | 41          |
| cold-create      | 149     | 29              | 33                | 0               | 0                  | 32                  | 989         | 0         | 0             | 0                    | 75          |
| cold-create      | 143     | 30              | 29                | 0               | 0                  | 32                  | 989         | 0         | 0             | 0                    | 50          |
| cold-create      | 141     | 30              | 32                | 0               | 0                  | 26                  | 967         | 0         | 0             | 0                    | 43          |
| cold-create      | 135     | 26              | 31                | 0               | 0                  | 31                  | 966         | 0         | 0             | 0                    | 44          |
| unchanged-update | 144     | 27              | 35                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 48          |
| unchanged-update | 130     | 22              | 26                | 0               | 0                  | 40                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 124     | 23              | 31                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 149     | 30              | 33                | 0               | 0                  | 45                  | 0           | 0         | 0             | 0                    | 54          |
| unchanged-update | 137     | 26              | 32                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 163     | 27              | 42                | 0               | 0                  | 36                  | 225         | 0         | 0             | 0                    | 41          |
| changed-update   | 138     | 29              | 32                | 0               | 0                  | 30                  | 162         | 0         | 0             | 0                    | 35          |
| changed-update   | 127     | 21              | 30                | 0               | 0                  | 34                  | 174         | 0         | 0             | 0                    | 44          |
| changed-update   | 138     | 27              | 30                | 0               | 0                  | 29                  | 170         | 0         | 0             | 0                    | 63          |
| changed-update   | 198     | 42              | 69                | 0               | 0                  | 40                  | 260         | 0         | 0             | 0                    | 36          |
| pruned-update    | 163     | 30              | 54                | 0               | 0                  | 31                  | 179         | 67        | 0             | 0                    | 34          |
| pruned-update    | 135     | 21              | 30                | 0               | 0                  | 34                  | 172         | 64        | 0             | 0                    | 44          |
| pruned-update    | 138     | 24              | 34                | 0               | 0                  | 35                  | 193         | 64        | 0             | 0                    | 105         |
| pruned-update    | 140     | 21              | 32                | 0               | 0                  | 31                  | 167         | 63        | 0             | 0                    | 43          |
| pruned-update    | 140     | 29              | 30                | 0               | 0                  | 31                  | 204         | 55        | 0             | 0                    | 39          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93858880            | 1073741824          | 0                             | 93858880                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 93029484            | 1073741824          | 0                             | 93029484                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 91804948            | 1073741824          | 0                             | 91804948                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 204         | 204            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 201         | 201            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 158         | 158            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 8                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 201         | 201            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 169         | 169            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.48        | 71.749       | 1.429                 | 1426                | 1.557    | 0.128  | 101            | 1024          | 32              | 21  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.23        | 70.069       | 1.231                 | 1229                | 1.351    | 0.12   | 105            | 1024          | 32              | 69  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.23        | 73.698       | 2.074                 | 2071                | 2.192    | 0.118  | 106            | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.28        | 70.227       | 1.267                 | 1264                | 1.393    | 0.126  | 101            | 1024          | 32              | 165 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 51.78        | 68.454       | 1.454                 | 1452                | 1.58     | 0.125  | 111            | 1024          | 32              | 213 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.96        | 33.053       | 0.285                 | 283                 | 0.401    | 0.116  | 36             | 1024          | 32              | 22  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.4         | 36.904       | 0.293                 | 291                 | 0.391    | 0.097  | 35             | 1024          | 32              | 70  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.9         | 35.811       | 0.276                 | 274                 | 0.399    | 0.122  | 37             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.95        | 32.867       | 0.27                  | 268                 | 0.388    | 0.118  | 35             | 1024          | 32              | 166 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.96        | 34.93        | 0.309                 | 307                 | 0.465    | 0.155  | 35             | 1024          | 32              | 214 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.99        | 37.467       | 0.571                 | 569                 | 0.691    | 0.12   | 41             | 1024          | 32              | 23  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.45        | 37.172       | 0.465                 | 462                 | 0.583    | 0.118  | 40             | 1024          | 32              | 71  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.01        | 41.054       | 0.378                 | 376                 | 0.496    | 0.117  | 39             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.93        | 37.473       | 0.792                 | 789                 | 0.911    | 0.119  | 39             | 1024          | 32              | 167 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.16        | 40.644       | 0.422                 | 420                 | 0.576    | 0.154  | 39             | 1024          | 32              | 215 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.04        | 38.177       | 1.055                 | 1053                | 1.173    | 0.118  | 39             | 1024          | 32              | 24  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.77        | 37.35        | 1.058                 | 1055                | 1.217    | 0.158  | 39             | 1024          | 32              | 72  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.16        | 41.618       | 1.066                 | 1064                | 1.183    | 0.116  | 41             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.06        | 32.555       | 1.228                 | 1226                | 1.35     | 0.122  | 41             | 1024          | 32              | 168 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.33        | 35.588       | 1.045                 | 1042                | 1.164    | 0.119  | 43             | 1024          | 32              | 216 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 334     | 81              | 136               | 0               | 0                  | 27                  | 1024        | 0         | 0             | 0                    | 40          |
| cold-create      | 176     | 28              | 36                | 0               | 0                  | 28                  | 985         | 0         | 0             | 0                    | 38          |
| cold-create      | 174     | 24              | 33                | 0               | 0                  | 32                  | 1825        | 0         | 0             | 0                    | 40          |
| cold-create      | 177     | 26              | 36                | 0               | 0                  | 27                  | 1023        | 0         | 0             | 0                    | 35          |
| cold-create      | 288     | 108             | 46                | 0               | 0                  | 31                  | 1084        | 0         | 0             | 0                    | 47          |
| unchanged-update | 180     | 34              | 31                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 158     | 21              | 31                | 0               | 0                  | 98                  | 0           | 0         | 0             | 0                    | 34          |
| unchanged-update | 173     | 28              | 34                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 165     | 28              | 31                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 39          |
| unchanged-update | 195     | 22              | 39                | 0               | 0                  | 69                  | 0           | 0         | 0             | 0                    | 41          |
| changed-update   | 302     | 109             | 65                | 0               | 0                  | 55                  | 174         | 0         | 0             | 0                    | 37          |
| changed-update   | 228     | 49              | 55                | 0               | 0                  | 59                  | 135         | 0         | 0             | 0                    | 38          |
| changed-update   | 166     | 22              | 32                | 0               | 0                  | 56                  | 116         | 0         | 0             | 0                    | 37          |
| changed-update   | 195     | 24              | 63                | 0               | 0                  | 141                 | 414         | 0         | 0             | 0                    | 38          |
| changed-update   | 186     | 26              | 33                | 0               | 0                  | 66                  | 125         | 0         | 0             | 0                    | 42          |
| pruned-update    | 170     | 23              | 34                | 0               | 0                  | 55                  | 119         | 639       | 0             | 0                    | 54          |
| pruned-update    | 189     | 29              | 29                | 0               | 0                  | 58                  | 128         | 625       | 0             | 0                    | 40          |
| pruned-update    | 175     | 25              | 34                | 0               | 0                  | 83                  | 127         | 628       | 0             | 0                    | 32          |
| pruned-update    | 327     | 70              | 149               | 0               | 0                  | 56                  | 170         | 613       | 0             | 0                    | 41          |
| pruned-update    | 158     | 26              | 32                | 0               | 0                  | 63                  | 131         | 634       | 0             | 0                    | 39          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 32          | 32             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 32          | 32             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 124         | 124            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.48        | 69.768       | 1.38                  | 1378                | 1.531    | 0.15   | 118            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.29        | 68.865       | 0.775                 | 773                 | 0.891    | 0.116  | 130            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 51.68        | 67.037       | 0.802                 | 799                 | 0.927    | 0.125  | 118            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.02        | 68.804       | 0.848                 | 846                 | 0.965    | 0.117  | 120            | 2048          | 64              | 173 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 51.72        | 67.827       | 0.781                 | 779                 | 0.899    | 0.117  | 103            | 2048          | 64              | 221 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.82        | 31.717       | 0.265                 | 262                 | 0.42     | 0.154  | 35             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.39        | 37.007       | 0.261                 | 259                 | 0.384    | 0.122  | 37             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.85        | 35.439       | 0.289                 | 286                 | 0.441    | 0.152  | 36             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.98        | 32.156       | 0.268                 | 265                 | 0.386    | 0.118  | 35             | 2048          | 64              | 174 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19           | 34.713       | 0.265                 | 263                 | 0.388    | 0.122  | 37             | 2048          | 64              | 222 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.94        | 37.701       | 0.408                 | 405                 | 0.529    | 0.121  | 39             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.52        | 38.874       | 0.379                 | 377                 | 0.498    | 0.119  | 41             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.08        | 41.151       | 0.354                 | 352                 | 0.479    | 0.124  | 39             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.96        | 37.852       | 0.353                 | 351                 | 0.453    | 0.099  | 40             | 2048          | 64              | 175 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.09        | 36.474       | 0.35                  | 348                 | 0.472    | 0.122  | 39             | 2048          | 64              | 223 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.19        | 32.475       | 1.064                 | 1062                | 1.18     | 0.116  | 39             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.92        | 37.235       | 1.034                 | 1031                | 1.154    | 0.119  | 39             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.15        | 41.203       | 1.152                 | 1150                | 1.274    | 0.121  | 39             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.03        | 37.462       | 1.093                 | 1091                | 1.21     | 0.116  | 40             | 2048          | 64              | 176 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.26        | 35.498       | 1.05                  | 1048                | 1.167    | 0.117  | 39             | 2048          | 64              | 224 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 600     | 51              | 62                | 0               | 0                  | 30                  | 701         | 0         | 0             | 0                    | 45          |
| cold-create      | 133     | 22              | 30                | 0               | 0                  | 41                  | 567         | 0         | 0             | 0                    | 30          |
| cold-create      | 132     | 24              | 33                | 0               | 0                  | 31                  | 596         | 0         | 0             | 0                    | 39          |
| cold-create      | 145     | 24              | 35                | 0               | 0                  | 32                  | 623         | 0         | 0             | 0                    | 45          |
| cold-create      | 147     | 30              | 37                | 0               | 0                  | 30                  | 561         | 0         | 0             | 0                    | 41          |
| unchanged-update | 164     | 25              | 30                | 0               | 0                  | 59                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 147     | 26              | 35                | 0               | 0                  | 69                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 166     | 31              | 38                | 0               | 0                  | 78                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 144     | 32              | 36                | 0               | 0                  | 74                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 157     | 34              | 33                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 44          |
| changed-update   | 151     | 23              | 31                | 0               | 0                  | 58                  | 160         | 0         | 0             | 0                    | 35          |
| changed-update   | 141     | 28              | 31                | 0               | 0                  | 69                  | 128         | 0         | 0             | 0                    | 38          |
| changed-update   | 127     | 22              | 35                | 0               | 0                  | 60                  | 121         | 0         | 0             | 0                    | 43          |
| changed-update   | 143     | 33              | 31                | 0               | 0                  | 54                  | 113         | 0         | 0             | 0                    | 40          |
| changed-update   | 143     | 26              | 39                | 0               | 0                  | 44                  | 119         | 0         | 0             | 0                    | 40          |
| pruned-update    | 143     | 27              | 31                | 0               | 0                  | 72                  | 149         | 636       | 0             | 0                    | 48          |
| pruned-update    | 142     | 28              | 34                | 0               | 0                  | 56                  | 144         | 635       | 0             | 0                    | 38          |
| pruned-update    | 140     | 25              | 35                | 0               | 0                  | 63                  | 148         | 701       | 0             | 0                    | 46          |
| pruned-update    | 143     | 32              | 29                | 0               | 0                  | 71                  | 133         | 671       | 0             | 0                    | 54          |
| pruned-update    | 133     | 29              | 31                | 0               | 0                  | 55                  | 121         | 679       | 0             | 0                    | 43          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 17          | 17             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 2                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.4         | 70.585       | 2.516                 | 2514                | 2.633    | 0.117  | 60             | 1024          | 32              | 37  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.82        | 75.496       | 2.633                 | 2631                | 2.753    | 0.119  | 59             | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.23        | 73.882       | 2.617                 | 2615                | 2.734    | 0.116  | 60             | 1024          | 32              | 133 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.11        | 69.308       | 2.694                 | 2691                | 2.813    | 0.119  | 51             | 1024          | 32              | 181 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.74        | 73.438       | 2.574                 | 2572                | 2.7      | 0.125  | 59             | 1024          | 32              | 229 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.9         | 32.573       | 0.544                 | 542                 | 0.665    | 0.12   | 38             | 1024          | 32              | 38  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.4         | 37.015       | 0.495                 | 493                 | 0.624    | 0.128  | 40             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.91        | 35.43        | 0.482                 | 480                 | 0.602    | 0.119  | 38             | 1024          | 32              | 134 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.87        | 32.004       | 0.506                 | 504                 | 0.626    | 0.119  | 38             | 1024          | 32              | 182 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.04        | 35.017       | 0.54                  | 537                 | 0.665    | 0.124  | 38             | 1024          | 32              | 230 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.02        | 38.186       | 0.619                 | 616                 | 0.736    | 0.116  | 38             | 1024          | 32              | 39  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.5         | 37.619       | 0.563                 | 560                 | 0.681    | 0.118  | 38             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.04        | 41.44        | 0.612                 | 610                 | 0.73     | 0.117  | 38             | 1024          | 32              | 135 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.03        | 38.185       | 0.704                 | 702                 | 0.82     | 0.115  | 38             | 1024          | 32              | 183 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.1         | 41.051       | 0.638                 | 636                 | 0.756    | 0.118  | 38             | 1024          | 32              | 231 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.05        | 38.203       | 1.397                 | 1393                | 1.518    | 0.12   | 38             | 1024          | 32              | 40  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.98        | 43.518       | 1.402                 | 1400                | 1.518    | 0.116  | 38             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.13        | 41.099       | 1.885                 | 1883                | 2.006    | 0.12   | 38             | 1024          | 32              | 136 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.02        | 38.037       | 1.487                 | 1485                | 1.582    | 0.094  | 38             | 1024          | 32              | 184 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.28        | 41.259       | 1.378                 | 1376                | 1.493    | 0.114  | 38             | 1024          | 32              | 232 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 251     | 29              | 101               | 2               | 2                  | 28                  | 2184        | 0         | 0             | 0                    | 49          |
| cold-create      | 235     | 32              | 82                | 2               | 2                  | 27                  | 2322        | 0         | 0             | 0                    | 46          |
| cold-create      | 248     | 33              | 92                | 2               | 2                  | 29                  | 2292        | 0         | 0             | 0                    | 44          |
| cold-create      | 377     | 30              | 195               | 2               | 2                  | 25                  | 2246        | 0         | 0             | 0                    | 41          |
| cold-create      | 260     | 31              | 99                | 2               | 2                  | 35                  | 2232        | 0         | 0             | 0                    | 42          |
| unchanged-update | 247     | 33              | 100               | 2               | 2                  | 248                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 253     | 28              | 94                | 2               | 2                  | 198                 | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 235     | 29              | 89                | 2               | 2                  | 198                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 254     | 32              | 100               | 2               | 2                  | 207                 | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 253     | 27              | 94                | 2               | 2                  | 245                 | 0           | 0         | 0             | 0                    | 38          |
| changed-update   | 240     | 27              | 87                | 2               | 2                  | 227                 | 103         | 0         | 0             | 0                    | 44          |
| changed-update   | 227     | 22              | 90                | 2               | 2                  | 180                 | 111         | 0         | 0             | 0                    | 40          |
| changed-update   | 268     | 38              | 103               | 2               | 2                  | 195                 | 97          | 0         | 0             | 0                    | 48          |
| changed-update   | 368     | 29              | 192               | 2               | 2                  | 188                 | 105         | 0         | 0             | 0                    | 39          |
| changed-update   | 251     | 36              | 90                | 2               | 2                  | 236                 | 101         | 0         | 0             | 0                    | 45          |
| pruned-update    | 244     | 29              | 97                | 2               | 2                  | 182                 | 92          | 816       | 0             | 0                    | 43          |
| pruned-update    | 262     | 39              | 97                | 2               | 2                  | 204                 | 101         | 771       | 0             | 0                    | 44          |
| pruned-update    | 252     | 35              | 98                | 2               | 2                  | 211                 | 160         | 1169      | 0             | 0                    | 42          |
| pruned-update    | 346     | 24              | 163               | 1               | 1                  | 249                 | 101         | 729       | 0             | 0                    | 44          |
| pruned-update    | 247     | 31              | 97                | 2               | 2                  | 216                 | 103         | 753       | 0             | 0                    | 44          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.49        | 70.452       | 1.558                 | 1556                | 1.677    | 0.119  | 74             | 2048          | 64              | 45  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 52.28        | 70.457       | 1.482                 | 1480                | 1.603    | 0.121  | 73             | 2048          | 64              | 93  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.19        | 74.325       | 1.573                 | 1571                | 1.689    | 0.116  | 71             | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.63        | 71.04        | 1.452                 | 1450                | 1.573    | 0.12   | 76             | 2048          | 64              | 189 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.84        | 73.912       | 1.499                 | 1497                | 1.62     | 0.121  | 72             | 2048          | 64              | 237 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.85        | 32.279       | 0.521                 | 518                 | 0.639    | 0.118  | 38             | 2048          | 64              | 46  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.33        | 36.708       | 0.527                 | 525                 | 0.679    | 0.151  | 38             | 2048          | 64              | 94  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.93        | 35.47        | 0.49                  | 487                 | 0.608    | 0.118  | 38             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.83        | 32.118       | 0.484                 | 482                 | 0.61     | 0.125  | 38             | 2048          | 64              | 190 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.97        | 34.895       | 0.464                 | 462                 | 0.583    | 0.119  | 38             | 2048          | 64              | 238 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.96        | 32.632       | 0.576                 | 574                 | 0.702    | 0.125  | 38             | 2048          | 64              | 47  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.56        | 43.238       | 0.538                 | 536                 | 0.657    | 0.119  | 38             | 2048          | 64              | 95  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.98        | 35.74        | 0.581                 | 579                 | 0.699    | 0.118  | 38             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.05        | 37.947       | 0.555                 | 552                 | 0.675    | 0.12   | 38             | 2048          | 64              | 191 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.12        | 40.82        | 0.584                 | 581                 | 0.74     | 0.156  | 40             | 2048          | 64              | 239 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.05        | 38.271       | 1.404                 | 1402                | 1.525    | 0.121  | 38             | 2048          | 64              | 48  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.86        | 37.597       | 1.333                 | 1331                | 1.449    | 0.116  | 38             | 2048          | 64              | 96  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.2         | 41.383       | 1.259                 | 1257                | 1.374    | 0.115  | 38             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.16        | 40.764       | 1.391                 | 1388                | 1.55     | 0.159  | 38             | 2048          | 64              | 192 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 24.84        | 47.23        | 1.357                 | 1354                | 1.477    | 0.12   | 38             | 2048          | 64              | 240 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 215     | 29              | 92                | 2               | 2                  | 29                  | 1273        | 0         | 0             | 0                    | 37          |
| cold-create      | 234     | 32              | 100               | 2               | 2                  | 25                  | 1182        | 0         | 0             | 0                    | 37          |
| cold-create      | 206     | 27              | 92                | 2               | 2                  | 27                  | 1286        | 0         | 0             | 0                    | 51          |
| cold-create      | 219     | 29              | 91                | 2               | 2                  | 27                  | 1162        | 0         | 0             | 0                    | 42          |
| cold-create      | 230     | 32              | 101               | 2               | 2                  | 34                  | 1190        | 0         | 0             | 0                    | 41          |
| unchanged-update | 229     | 31              | 101               | 2               | 2                  | 245                 | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 232     | 29              | 98                | 3               | 3                  | 244                 | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 209     | 29              | 94                | 2               | 2                  | 232                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 191     | 26              | 88                | 2               | 2                  | 247                 | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 191     | 30              | 84                | 2               | 2                  | 224                 | 0           | 0         | 0             | 0                    | 44          |
| changed-update   | 205     | 33              | 91                | 2               | 2                  | 229                 | 97          | 0         | 0             | 0                    | 40          |
| changed-update   | 219     | 29              | 95                | 2               | 2                  | 176                 | 98          | 0         | 0             | 0                    | 42          |
| changed-update   | 217     | 30              | 94                | 2               | 2                  | 222                 | 98          | 0         | 0             | 0                    | 40          |
| changed-update   | 197     | 24              | 90                | 2               | 2                  | 212                 | 104         | 0         | 0             | 0                    | 38          |
| changed-update   | 240     | 31              | 100               | 3               | 3                  | 196                 | 101         | 0         | 0             | 0                    | 43          |
| pruned-update    | 215     | 28              | 91                | 2               | 2                  | 230                 | 130         | 764       | 0             | 0                    | 44          |
| pruned-update    | 206     | 28              | 93                | 2               | 2                  | 237                 | 108         | 727       | 0             | 0                    | 32          |
| pruned-update    | 179     | 22              | 75                | 2               | 2                  | 202                 | 91          | 732       | 0             | 0                    | 34          |
| pruned-update    | 230     | 31              | 98                | 2               | 3                  | 203                 | 99          | 799       | 0             | 0                    | 40          |
| pruned-update    | 215     | 36              | 98                | 2               | 2                  | 245                 | 107         | 734       | 0             | 0                    | 37          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 48          | 48             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
