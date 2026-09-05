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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.43        | 72.172       | 1.962                 | 1961                | 2.059    | 0.096  | 106            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.57        | 71.653       | 1.959                 | 1957                | 2.077    | 0.117  | 123            | 1024          | 32              | 53  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.74        | 73.254       | 2.011                 | 2009                | 2.133    | 0.122  | 126            | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.89        | 75.287       | 2.058                 | 2056                | 2.216    | 0.158  | 129            | 1024          | 32              | 149 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.61        | 69.437       | 1.89                  | 1888                | 2.02     | 0.13   | 122            | 1024          | 32              | 197 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.54        | 33.6         | 0.243                 | 241                 | 0.366    | 0.123  | 33             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.62        | 38.439       | 0.25                  | 248                 | 0.368    | 0.117  | 33             | 1024          | 32              | 54  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19           | 41.109       | 0.288                 | 285                 | 0.411    | 0.123  | 33             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.4         | 37.209       | 0.246                 | 243                 | 0.365    | 0.119  | 33             | 1024          | 32              | 150 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.84        | 32.561       | 0.237                 | 235                 | 0.355    | 0.117  | 33             | 1024          | 32              | 198 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.67        | 39.957       | 0.59                  | 587                 | 0.705    | 0.115  | 39             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.58        | 40.038       | 0.468                 | 465                 | 0.592    | 0.124  | 40             | 1024          | 32              | 55  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.14        | 35.621       | 0.474                 | 471                 | 0.63     | 0.155  | 41             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.5         | 40.374       | 0.45                  | 448                 | 0.568    | 0.118  | 41             | 1024          | 32              | 151 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.1         | 41.132       | 0.432                 | 430                 | 0.547    | 0.115  | 39             | 1024          | 32              | 199 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.87        | 39.582       | 0.655                 | 652                 | 0.778    | 0.123  | 40             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.76        | 44.942       | 0.511                 | 509                 | 0.626    | 0.115  | 43             | 1024          | 32              | 56  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.22        | 35.877       | 0.545                 | 543                 | 0.666    | 0.121  | 40             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.98        | 37.91        | 0.491                 | 489                 | 0.605    | 0.113  | 40             | 1024          | 32              | 152 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.02        | 37.253       | 0.494                 | 492                 | 0.609    | 0.114  | 41             | 1024          | 32              | 200 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 255     | 71              | 77                | 0               | 0                  | 30                  | 1630        | 0         | 0             | 0                    | 44          |
| cold-create      | 161     | 22              | 28                | 0               | 0                  | 30                  | 1713        | 0         | 0             | 0                    | 51          |
| cold-create      | 177     | 33              | 30                | 0               | 0                  | 29                  | 1770        | 0         | 0             | 0                    | 32          |
| cold-create      | 189     | 28              | 32                | 0               | 0                  | 26                  | 1791        | 0         | 0             | 0                    | 48          |
| cold-create      | 176     | 29              | 32                | 0               | 0                  | 25                  | 1645        | 0         | 0             | 0                    | 39          |
| unchanged-update | 170     | 27              | 30                | 0               | 0                  | 29                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 175     | 32              | 32                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 181     | 32              | 34                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 165     | 25              | 27                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 159     | 24              | 28                | 0               | 0                  | 28                  | 0           | 0         | 0             | 0                    | 47          |
| changed-update   | 295     | 110             | 71                | 0               | 0                  | 31                  | 216         | 0         | 0             | 0                    | 44          |
| changed-update   | 179     | 32              | 34                | 0               | 0                  | 35                  | 207         | 0         | 0             | 0                    | 43          |
| changed-update   | 194     | 28              | 35                | 0               | 0                  | 37                  | 200         | 0         | 0             | 0                    | 39          |
| changed-update   | 171     | 23              | 32                | 0               | 0                  | 34                  | 200         | 0         | 0             | 0                    | 42          |
| changed-update   | 164     | 24              | 30                | 0               | 0                  | 30                  | 191         | 0         | 0             | 0                    | 43          |
| pruned-update    | 263     | 91              | 64                | 0               | 0                  | 35                  | 226         | 77        | 0             | 0                    | 40          |
| pruned-update    | 162     | 24              | 31                | 0               | 0                  | 31                  | 190         | 63        | 0             | 0                    | 44          |
| pruned-update    | 158     | 26              | 28                | 0               | 0                  | 33                  | 222         | 72        | 0             | 0                    | 40          |
| pruned-update    | 170     | 26              | 30                | 0               | 0                  | 27                  | 169         | 66        | 0             | 0                    | 42          |
| pruned-update    | 164     | 22              | 30                | 0               | 0                  | 32                  | 174         | 67        | 0             | 0                    | 40          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33475822            | 536870912           | 0                             | 33475822                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33212271            | 536870912           | 0                             | 33212271                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33537965            | 536870912           | 0                             | 33537965                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33133865            | 536870912           | 0                             | 33133865                   |
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 33553688            | 536870912           | 0                             | 33553688                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 208         | 208            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 295         | 295            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 12                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 180         | 180            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 11           | 0               | 155         | 155            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 182         | 182            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 4           | 4              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 51.13        | 65.997       | 1.199                 | 1197                | 1.317    | 0.117  | 186            | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.42        | 92.244       | 1.145                 | 1143                | 1.265    | 0.12   | 188            | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.3         | 69.27        | 1.09                  | 1088                | 1.206    | 0.115  | 161            | 2048          | 64              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.41        | 74.666       | 1.166                 | 1164                | 1.287    | 0.121  | 192            | 2048          | 64              | 157 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.48        | 70.59        | 1.018                 | 1015                | 1.112    | 0.094  | 193            | 2048          | 64              | 205 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.55        | 37.532       | 0.221                 | 218                 | 0.34     | 0.118  | 33             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.55        | 33.826       | 0.203                 | 201                 | 0.326    | 0.122  | 33             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19           | 41.721       | 0.215                 | 212                 | 0.333    | 0.118  | 33             | 2048          | 64              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.45        | 38.64        | 0.22                  | 218                 | 0.339    | 0.119  | 33             | 2048          | 64              | 158 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.94        | 38.04        | 0.223                 | 220                 | 0.339    | 0.116  | 33             | 2048          | 64              | 206 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.58        | 39.79        | 0.467                 | 465                 | 0.585    | 0.117  | 39             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.62        | 40.579       | 0.403                 | 401                 | 0.519    | 0.116  | 41             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.19        | 36.76        | 0.396                 | 394                 | 0.553    | 0.156  | 40             | 2048          | 64              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.56        | 42.767       | 0.4                   | 398                 | 0.552    | 0.151  | 39             | 2048          | 64              | 159 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.01        | 40.03        | 0.39                  | 388                 | 0.486    | 0.095  | 40             | 2048          | 64              | 207 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.9         | 39.568       | 0.475                 | 473                 | 0.594    | 0.119  | 42             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.68        | 34.357       | 0.452                 | 450                 | 0.573    | 0.12   | 39             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.33        | 45.561       | 0.498                 | 496                 | 0.648    | 0.149  | 42             | 2048          | 64              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.84        | 42.892       | 0.503                 | 501                 | 0.66     | 0.156  | 40             | 2048          | 64              | 160 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.08        | 37.764       | 0.483                 | 480                 | 0.609    | 0.126  | 41             | 2048          | 64              | 208 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 154     | 24              | 39                | 0               | 0                  | 27                  | 970         | 0         | 0             | 0                    | 44          |
| cold-create      | 147     | 28              | 32                | 0               | 0                  | 26                  | 928         | 0         | 0             | 0                    | 40          |
| cold-create      | 131     | 26              | 28                | 0               | 0                  | 26                  | 889         | 0         | 0             | 0                    | 41          |
| cold-create      | 124     | 26              | 29                | 0               | 0                  | 28                  | 963         | 0         | 0             | 0                    | 48          |
| cold-create      | 122     | 24              | 28                | 0               | 0                  | 30                  | 823         | 0         | 0             | 0                    | 38          |
| unchanged-update | 137     | 25              | 33                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 131     | 21              | 34                | 0               | 0                  | 32                  | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 134     | 27              | 28                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 135     | 22              | 32                | 0               | 0                  | 38                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 145     | 25              | 35                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 164     | 27              | 64                | 0               | 0                  | 32                  | 224         | 0         | 0             | 0                    | 43          |
| changed-update   | 149     | 33              | 33                | 0               | 0                  | 36                  | 172         | 0         | 0             | 0                    | 43          |
| changed-update   | 147     | 25              | 35                | 0               | 0                  | 38                  | 167         | 0         | 0             | 0                    | 41          |
| changed-update   | 148     | 26              | 28                | 0               | 0                  | 34                  | 181         | 0         | 0             | 0                    | 34          |
| changed-update   | 135     | 30              | 32                | 0               | 0                  | 35                  | 174         | 0         | 0             | 0                    | 43          |
| pruned-update    | 135     | 23              | 38                | 0               | 0                  | 33                  | 186         | 61        | 0             | 0                    | 42          |
| pruned-update    | 136     | 25              | 32                | 0               | 0                  | 37                  | 160         | 60        | 0             | 0                    | 47          |
| pruned-update    | 159     | 25              | 33                | 0               | 0                  | 34                  | 178         | 66        | 0             | 0                    | 43          |
| pruned-update    | 151     | 22              | 32                | 0               | 0                  | 34                  | 189         | 66        | 0             | 0                    | 43          |
| pruned-update    | 172     | 27              | 58                | 0               | 0                  | 35                  | 159         | 64        | 0             | 0                    | 37          |

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
| cold-create      | 96767849         | 144167470      | 0            | 96765230             | 96766480             | 96765230            | 1073741824          | 0                             | 96765230                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 201         | 201            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 187         | 187            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 238         | 238            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 12                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 189         | 189            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 246         | 246            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 14                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
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

## mixed / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 51.06        | 66.509       | 1.245                 | 1243                | 1.359    | 0.114  | 103            | 1024          | 32              | 21  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 56.25        | 71.962       | 1.344                 | 1342                | 1.469    | 0.124  | 107            | 1024          | 32              | 69  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.17        | 73.797       | 1.292                 | 1290                | 1.41     | 0.118  | 107            | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.9         | 75.452       | 1.283                 | 1281                | 1.4      | 0.116  | 106            | 1024          | 32              | 165 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.5         | 71.067       | 1.315                 | 1312                | 1.432    | 0.117  | 100            | 1024          | 32              | 213 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.52        | 33.562       | 0.256                 | 254                 | 0.381    | 0.125  | 33             | 1024          | 32              | 22  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.42        | 34.924       | 0.271                 | 269                 | 0.367    | 0.096  | 33             | 1024          | 32              | 70  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.97        | 35.117       | 0.27                  | 266                 | 0.388    | 0.117  | 33             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.43        | 37.144       | 0.277                 | 275                 | 0.392    | 0.115  | 33             | 1024          | 32              | 166 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.88        | 32.502       | 0.271                 | 269                 | 0.368    | 0.097  | 35             | 1024          | 32              | 214 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.68        | 39.497       | 0.433                 | 431                 | 0.549    | 0.116  | 39             | 1024          | 32              | 23  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.83        | 39.988       | 0.388                 | 385                 | 0.505    | 0.117  | 37             | 1024          | 32              | 71  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.12        | 41.334       | 0.415                 | 412                 | 0.536    | 0.121  | 37             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.51        | 37.215       | 0.402                 | 400                 | 0.518    | 0.115  | 39             | 1024          | 32              | 167 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.9         | 37.232       | 0.424                 | 421                 | 0.539    | 0.115  | 39             | 1024          | 32              | 215 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.84        | 33.995       | 1.176                 | 1174                | 1.272    | 0.095  | 39             | 1024          | 32              | 24  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.75        | 39.919       | 1.078                 | 1076                | 1.194    | 0.116  | 41             | 1024          | 32              | 72  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.28        | 41.33        | 1.083                 | 1081                | 1.242    | 0.158  | 37             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.86        | 37.245       | 1.176                 | 1174                | 1.293    | 0.116  | 37             | 1024          | 32              | 168 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.03        | 37.674       | 1.099                 | 1096                | 1.25     | 0.151  | 39             | 1024          | 32              | 216 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 166     | 25              | 33                | 0               | 0                  | 32                  | 999         | 0         | 0             | 0                    | 44          |
| cold-create      | 170     | 30              | 31                | 0               | 0                  | 30                  | 1062        | 0         | 0             | 0                    | 78          |
| cold-create      | 182     | 36              | 28                | 0               | 0                  | 31                  | 1032        | 0         | 0             | 0                    | 43          |
| cold-create      | 174     | 24              | 30                | 0               | 0                  | 30                  | 1028        | 0         | 0             | 0                    | 48          |
| cold-create      | 199     | 56              | 36                | 0               | 0                  | 33                  | 1036        | 0         | 0             | 0                    | 43          |
| unchanged-update | 157     | 29              | 29                | 0               | 0                  | 64                  | 0           | 0         | 0             | 0                    | 31          |
| unchanged-update | 169     | 29              | 32                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 162     | 23              | 29                | 0               | 0                  | 59                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 163     | 26              | 30                | 0               | 0                  | 71                  | 0           | 0         | 0             | 0                    | 39          |
| unchanged-update | 162     | 30              | 36                | 0               | 0                  | 64                  | 0           | 0         | 0             | 0                    | 42          |
| changed-update   | 182     | 28              | 35                | 0               | 0                  | 77                  | 126         | 0         | 0             | 0                    | 45          |
| changed-update   | 151     | 25              | 27                | 0               | 0                  | 59                  | 133         | 0         | 0             | 0                    | 41          |
| changed-update   | 165     | 24              | 29                | 0               | 0                  | 65                  | 139         | 0         | 0             | 0                    | 41          |
| changed-update   | 182     | 27              | 32                | 0               | 0                  | 57                  | 127         | 0         | 0             | 0                    | 33          |
| changed-update   | 180     | 33              | 33                | 0               | 0                  | 63                  | 132         | 0         | 0             | 0                    | 43          |
| pruned-update    | 248     | 63              | 74                | 0               | 0                  | 51                  | 139         | 675       | 0             | 0                    | 43          |
| pruned-update    | 163     | 24              | 32                | 0               | 0                  | 66                  | 117         | 676       | 0             | 0                    | 41          |
| pruned-update    | 183     | 22              | 29                | 0               | 0                  | 60                  | 122         | 659       | 0             | 0                    | 45          |
| pruned-update    | 178     | 29              | 31                | 0               | 0                  | 67                  | 161         | 705       | 0             | 0                    | 49          |
| pruned-update    | 203     | 26              | 51                | 0               | 0                  | 70                  | 119         | 647       | 0             | 0                    | 41          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 18          | 18             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 50.94        | 66.312       | 0.845                 | 843                 | 0.961    | 0.115  | 136            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 50.75        | 65.547       | 0.784                 | 782                 | 0.904    | 0.119  | 114            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.22        | 67.745       | 0.809                 | 807                 | 0.929    | 0.12   | 121            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.4         | 68.641       | 0.845                 | 843                 | 0.961    | 0.116  | 109            | 2048          | 64              | 173 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 49.82        | 63.323       | 0.796                 | 794                 | 0.914    | 0.118  | 117            | 2048          | 64              | 221 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.62        | 33.227       | 0.253                 | 250                 | 0.372    | 0.119  | 35             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.48        | 34.33        | 0.256                 | 253                 | 0.371    | 0.115  | 35             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.04        | 35.932       | 0.266                 | 264                 | 0.381    | 0.114  | 35             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.42        | 36.698       | 0.247                 | 244                 | 0.375    | 0.127  | 35             | 2048          | 64              | 174 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.94        | 32.397       | 0.254                 | 252                 | 0.373    | 0.119  | 33             | 2048          | 64              | 222 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.61        | 33.305       | 0.491                 | 489                 | 0.61     | 0.118  | 37             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.58        | 41.216       | 0.361                 | 359                 | 0.457    | 0.096  | 37             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.17        | 35.661       | 0.364                 | 362                 | 0.485    | 0.12   | 39             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.52        | 37.135       | 0.375                 | 373                 | 0.493    | 0.118  | 37             | 2048          | 64              | 175 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.96        | 37.666       | 0.362                 | 360                 | 0.481    | 0.119  | 37             | 2048          | 64              | 223 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 24.09        | 45.497       | 1.009                 | 1007                | 1.127    | 0.117  | 37             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.86        | 34.167       | 1.027                 | 1025                | 1.145    | 0.118  | 37             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.31        | 35.679       | 1.024                 | 1022                | 1.14     | 0.116  | 37             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.86        | 42.543       | 1.068                 | 1066                | 1.194    | 0.125  | 39             | 2048          | 64              | 176 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.03        | 37.386       | 1.016                 | 1013                | 1.135    | 0.119  | 39             | 2048          | 64              | 224 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 144     | 24              | 33                | 0               | 0                  | 28                  | 625         | 0         | 0             | 0                    | 44          |
| cold-create      | 146     | 36              | 29                | 0               | 0                  | 27                  | 567         | 0         | 0             | 0                    | 40          |
| cold-create      | 132     | 18              | 29                | 0               | 0                  | 32                  | 602         | 0         | 0             | 0                    | 40          |
| cold-create      | 139     | 26              | 31                | 0               | 0                  | 28                  | 631         | 0         | 0             | 0                    | 43          |
| cold-create      | 139     | 25              | 32                | 0               | 0                  | 28                  | 582         | 0         | 0             | 0                    | 43          |
| unchanged-update | 142     | 28              | 32                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 155     | 48              | 34                | 0               | 0                  | 53                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 147     | 27              | 31                | 0               | 0                  | 69                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 142     | 30              | 32                | 0               | 0                  | 54                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 133     | 25              | 29                | 0               | 0                  | 74                  | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 239     | 85              | 60                | 0               | 0                  | 53                  | 155         | 0         | 0             | 0                    | 40          |
| changed-update   | 131     | 23              | 32                | 0               | 0                  | 66                  | 116         | 0         | 0             | 0                    | 45          |
| changed-update   | 151     | 30              | 35                | 0               | 0                  | 53                  | 117         | 0         | 0             | 0                    | 40          |
| changed-update   | 141     | 22              | 34                | 0               | 0                  | 65                  | 117         | 0         | 0             | 0                    | 48          |
| changed-update   | 125     | 23              | 31                | 0               | 0                  | 63                  | 124         | 0         | 0             | 0                    | 46          |
| pruned-update    | 137     | 24              | 30                | 0               | 0                  | 66                  | 115         | 633       | 0             | 0                    | 40          |
| pruned-update    | 128     | 31              | 32                | 0               | 0                  | 61                  | 118         | 655       | 0             | 0                    | 48          |
| pruned-update    | 143     | 24              | 32                | 0               | 0                  | 49                  | 122         | 650       | 0             | 0                    | 43          |
| pruned-update    | 127     | 22              | 30                | 0               | 0                  | 57                  | 115         | 703       | 0             | 0                    | 47          |
| pruned-update    | 140     | 24              | 32                | 0               | 0                  | 51                  | 110         | 653       | 0             | 0                    | 44          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 189         | 189            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
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
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 13          | 13             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |

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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.46        | 71.851       | 2.848                 | 2846                | 2.982    | 0.133  | 57             | 1024          | 32              | 37  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.27        | 72.455       | 2.617                 | 2615                | 2.732    | 0.115  | 55             | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.7         | 73.789       | 2.747                 | 2744                | 2.878    | 0.131  | 58             | 1024          | 32              | 133 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.85        | 75.907       | 2.68                  | 2678                | 2.797    | 0.117  | 58             | 1024          | 32              | 181 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.58        | 70.165       | 2.825                 | 2823                | 2.942    | 0.116  | 58             | 1024          | 32              | 229 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.54        | 32.791       | 0.485                 | 483                 | 0.604    | 0.119  | 35             | 1024          | 32              | 38  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.5         | 34.084       | 0.512                 | 510                 | 0.626    | 0.114  | 35             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.07        | 35.464       | 0.439                 | 437                 | 0.533    | 0.093  | 36             | 1024          | 32              | 134 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.35        | 37.031       | 0.564                 | 562                 | 0.692    | 0.128  | 39             | 1024          | 32              | 182 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.86        | 32.649       | 0.519                 | 517                 | 0.634    | 0.114  | 35             | 1024          | 32              | 230 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.67        | 39.754       | 0.664                 | 662                 | 0.782    | 0.118  | 36             | 1024          | 32              | 39  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.6         | 39.83        | 0.591                 | 588                 | 0.705    | 0.114  | 38             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.15        | 41.806       | 0.579                 | 577                 | 0.672    | 0.092  | 36             | 1024          | 32              | 135 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.55        | 37.901       | 0.65                  | 647                 | 0.77     | 0.12   | 36             | 1024          | 32              | 183 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.91        | 37.729       | 0.629                 | 627                 | 0.746    | 0.117  | 36             | 1024          | 32              | 231 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.74        | 33.667       | 1.493                 | 1491                | 1.61     | 0.116  | 36             | 1024          | 32              | 40  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.76        | 35.505       | 1.413                 | 1411                | 1.527    | 0.114  | 36             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.26        | 36.07        | 1.395                 | 1392                | 1.519    | 0.124  | 36             | 1024          | 32              | 136 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 20.02        | 38.276       | 1.377                 | 1375                | 1.492    | 0.114  | 36             | 1024          | 32              | 184 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.03        | 37.815       | 1.453                 | 1450                | 1.57     | 0.117  | 36             | 1024          | 32              | 232 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 255     | 25              | 115               | 2               | 2                  | 31                  | 2513        | 0         | 0             | 0                    | 45          |
| cold-create      | 231     | 29              | 81                | 2               | 2                  | 32                  | 2306        | 0         | 0             | 0                    | 44          |
| cold-create      | 231     | 33              | 87                | 2               | 2                  | 33                  | 2439        | 0         | 0             | 0                    | 40          |
| cold-create      | 238     | 29              | 98                | 2               | 2                  | 35                  | 2367        | 0         | 0             | 0                    | 37          |
| cold-create      | 236     | 27              | 92                | 2               | 2                  | 26                  | 2514        | 0         | 0             | 0                    | 45          |
| unchanged-update | 240     | 31              | 87                | 2               | 2                  | 195                 | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 239     | 28              | 89                | 2               | 2                  | 225                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 229     | 25              | 84                | 1               | 1                  | 177                 | 0           | 0         | 0             | 0                    | 29          |
| unchanged-update | 245     | 31              | 87                | 2               | 2                  | 265                 | 0           | 0         | 0             | 0                    | 50          |
| unchanged-update | 270     | 28              | 96                | 2               | 2                  | 193                 | 0           | 0         | 0             | 0                    | 52          |
| changed-update   | 278     | 25              | 130               | 2               | 2                  | 241                 | 95          | 0         | 0             | 0                    | 46          |
| changed-update   | 227     | 27              | 85                | 2               | 2                  | 218                 | 96          | 0         | 0             | 0                    | 46          |
| changed-update   | 227     | 28              | 83                | 1               | 1                  | 202                 | 101         | 0         | 0             | 0                    | 45          |
| changed-update   | 230     | 28              | 85                | 2               | 2                  | 262                 | 110         | 0         | 0             | 0                    | 43          |
| changed-update   | 242     | 33              | 92                | 2               | 2                  | 234                 | 105         | 0         | 0             | 0                    | 43          |
| pruned-update    | 294     | 32              | 144               | 2               | 2                  | 222                 | 114         | 803       | 0             | 0                    | 45          |
| pruned-update    | 234     | 27              | 91                | 1               | 2                  | 236                 | 93          | 782       | 0             | 0                    | 50          |
| pruned-update    | 253     | 25              | 87                | 2               | 2                  | 206                 | 101         | 776       | 0             | 0                    | 38          |
| pruned-update    | 225     | 26              | 82                | 2               | 2                  | 241                 | 101         | 757       | 0             | 0                    | 34          |
| pruned-update    | 263     | 26              | 120               | 2               | 2                  | 202                 | 118         | 805       | 0             | 0                    | 47          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 29          | 29             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 1            | 0               | 32          | 32             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.28        | 70.718       | 1.5                   | 1497                | 1.616    | 0.116  | 62             | 2048          | 64              | 45  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 56.22        | 72.36        | 1.501                 | 1498                | 1.626    | 0.125  | 49             | 2048          | 64              | 93  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.63        | 74.249       | 1.513                 | 1511                | 1.63     | 0.116  | 70             | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.91        | 75.419       | 1.64                  | 1638                | 1.789    | 0.148  | 59             | 2048          | 64              | 189 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.1         | 69.132       | 1.544                 | 1541                | 1.658    | 0.114  | 71             | 2048          | 64              | 237 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.61        | 32.989       | 0.443                 | 441                 | 0.559    | 0.115  | 35             | 2048          | 64              | 46  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.54        | 34.049       | 0.436                 | 434                 | 0.533    | 0.096  | 35             | 2048          | 64              | 94  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.04        | 35.436       | 0.558                 | 556                 | 0.71     | 0.151  | 36             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.41        | 36.754       | 0.439                 | 437                 | 0.568    | 0.128  | 36             | 2048          | 64              | 190 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.97        | 32.512       | 0.519                 | 516                 | 0.636    | 0.117  | 36             | 2048          | 64              | 238 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.71        | 33.607       | 0.643                 | 640                 | 0.759    | 0.116  | 36             | 2048          | 64              | 47  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.56        | 39.919       | 0.521                 | 518                 | 0.635    | 0.114  | 36             | 2048          | 64              | 95  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.17        | 36.035       | 0.584                 | 581                 | 0.7      | 0.116  | 36             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.51        | 37.643       | 0.599                 | 597                 | 0.717    | 0.117  | 36             | 2048          | 64              | 191 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.97        | 37.978       | 0.605                 | 603                 | 0.724    | 0.118  | 36             | 2048          | 64              | 239 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.84        | 39.912       | 1.346                 | 1344                | 1.469    | 0.122  | 36             | 2048          | 64              | 48  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.74        | 40.222       | 1.433                 | 1431                | 1.57     | 0.136  | 36             | 2048          | 64              | 96  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.23        | 35.905       | 1.381                 | 1379                | 1.498    | 0.116  | 36             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.98        | 37.861       | 1.382                 | 1379                | 1.5      | 0.118  | 36             | 2048          | 64              | 192 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.11        | 38.037       | 1.318                 | 1315                | 1.435    | 0.117  | 36             | 2048          | 64              | 240 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 203     | 25              | 91                | 2               | 2                  | 28                  | 1224        | 0         | 0             | 0                    | 39          |
| cold-create      | 200     | 33              | 83                | 2               | 2                  | 28                  | 1225        | 0         | 0             | 0                    | 43          |
| cold-create      | 204     | 27              | 85                | 2               | 2                  | 25                  | 1241        | 0         | 0             | 0                    | 40          |
| cold-create      | 237     | 35              | 95                | 3               | 3                  | 29                  | 1324        | 0         | 0             | 0                    | 47          |
| cold-create      | 208     | 31              | 95                | 2               | 2                  | 30                  | 1259        | 0         | 0             | 0                    | 43          |
| unchanged-update | 211     | 33              | 83                | 2               | 2                  | 182                 | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 196     | 27              | 91                | 1               | 1                  | 193                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 234     | 28              | 92                | 3               | 3                  | 272                 | 1           | 0         | 0             | 0                    | 47          |
| unchanged-update | 208     | 26              | 93                | 2               | 2                  | 185                 | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 230     | 29              | 104               | 2               | 2                  | 244                 | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 246     | 30              | 105               | 2               | 2                  | 246                 | 101         | 0         | 0             | 0                    | 46          |
| changed-update   | 199     | 27              | 87                | 2               | 2                  | 174                 | 97          | 0         | 0             | 0                    | 46          |
| changed-update   | 191     | 26              | 81                | 2               | 2                  | 232                 | 112         | 0         | 0             | 0                    | 44          |
| changed-update   | 213     | 31              | 86                | 2               | 2                  | 243                 | 97          | 0         | 0             | 0                    | 42          |
| changed-update   | 213     | 29              | 90                | 2               | 2                  | 247                 | 101         | 0         | 0             | 0                    | 41          |
| pruned-update    | 194     | 30              | 78                | 2               | 2                  | 247                 | 95          | 757       | 0             | 0                    | 37          |
| pruned-update    | 213     | 25              | 92                | 2               | 2                  | 239                 | 101         | 811       | 0             | 0                    | 41          |
| pruned-update    | 208     | 27              | 93                | 2               | 2                  | 251                 | 97          | 768       | 0             | 0                    | 37          |
| pruned-update    | 212     | 27              | 89                | 2               | 2                  | 179                 | 94          | 831       | 0             | 0                    | 46          |
| pruned-update    | 196     | 24              | 81                | 2               | 2                  | 176                 | 94          | 788       | 0             | 0                    | 44          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 27          | 27             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 18          | 18             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 4            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| changed-update   | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 2            | 0               | 2           | 2              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
