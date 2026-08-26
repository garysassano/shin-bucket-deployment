# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-08-10                  |
| Regions             | eu-central-1                |
| Profiles            | mixed, tiny-many, large-few |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.41        | 71.263       | 1.903                 | 1901                | 2.022    | 0.118  | 112            | 1024          | 32              | 29  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.83        | 68.981       | 2.01                  | 2008                | 2.125    | 0.114  | 116            | 1024          | 32              | 77  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.62        | 69.253       | 2.084                 | 2082                | 2.203    | 0.118  | 127            | 1024          | 32              | 113 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 73.099       | 2.264                 | 2262                | 2.379    | 0.115  | 111            | 1024          | 32              | 145 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 69.766       | 2.279                 | 2277                | 2.402    | 0.122  | 123            | 1024          | 32              | 181 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.94        | 39.063       | 0.26                  | 258                 | 0.376    | 0.115  | 33             | 1024          | 32              | 30  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.12        | 29.095       | 0.266                 | 264                 | 0.427    | 0.161  | 33             | 1024          | 32              | 78  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.25        | 36.774       | 0.301                 | 298                 | 0.432    | 0.13   | 33             | 1024          | 32              | 114 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.31        | 37.493       | 0.254                 | 252                 | 0.372    | 0.118  | 33             | 1024          | 32              | 146 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.43        | 33.986       | 0.266                 | 264                 | 0.382    | 0.115  | 33             | 1024          | 32              | 182 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.92        | 36.835       | 0.435                 | 433                 | 0.553    | 0.117  | 39             | 1024          | 32              | 31  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.34        | 32.585       | 0.466                 | 463                 | 0.581    | 0.115  | 38             | 1024          | 32              | 79  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.38        | 38.219       | 0.583                 | 580                 | 0.697    | 0.114  | 39             | 1024          | 32              | 115 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.39        | 32.873       | 0.539                 | 537                 | 0.657    | 0.118  | 39             | 1024          | 32              | 147 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.23        | 38.507       | 0.536                 | 533                 | 0.663    | 0.127  | 40             | 1024          | 32              | 183 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.12        | 37.083       | 0.541                 | 538                 | 0.661    | 0.119  | 41             | 1024          | 32              | 32  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.49        | 35.853       | 0.549                 | 545                 | 0.696    | 0.146  | 42             | 1024          | 32              | 80  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.59        | 39.484       | 0.581                 | 579                 | 0.697    | 0.116  | 40             | 1024          | 32              | 116 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.42        | 38.26        | 0.562                 | 560                 | 0.673    | 0.11   | 39             | 1024          | 32              | 148 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.42        | 32.791       | 0.59                  | 588                 | 0.713    | 0.122  | 39             | 1024          | 32              | 184 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 165     | 27              | 32                | 0               | 0                  | 30                  | 1663        | 0         | 0             | 0                    | 41          |
| cold-create      | 189     | 29              | 40                | 0               | 0                  | 35                  | 1745        | 0         | 0             | 0                    | 38          |
| cold-create      | 202     | 48              | 40                | 0               | 0                  | 29                  | 1812        | 0         | 0             | 0                    | 38          |
| cold-create      | 198     | 57              | 33                | 0               | 0                  | 33                  | 1983        | 0         | 0             | 0                    | 46          |
| cold-create      | 237     | 55              | 56                | 0               | 0                  | 32                  | 1960        | 0         | 0             | 0                    | 47          |
| unchanged-update | 171     | 23              | 37                | 0               | 0                  | 39                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 184     | 22              | 33                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 203     | 51              | 30                | 0               | 0                  | 53                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 172     | 36              | 30                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 189     | 49              | 31                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 181     | 29              | 46                | 0               | 0                  | 34                  | 173         | 0         | 0             | 0                    | 43          |
| changed-update   | 187     | 27              | 48                | 0               | 0                  | 34                  | 201         | 0         | 0             | 0                    | 40          |
| changed-update   | 270     | 67              | 84                | 0               | 0                  | 36                  | 233         | 0         | 0             | 0                    | 41          |
| changed-update   | 259     | 52              | 96                | 0               | 0                  | 30                  | 202         | 0         | 0             | 0                    | 45          |
| changed-update   | 256     | 70              | 60                | 0               | 0                  | 35                  | 200         | 0         | 0             | 0                    | 40          |
| pruned-update    | 199     | 22              | 57                | 0               | 0                  | 26                  | 180         | 68        | 0             | 0                    | 47          |
| pruned-update    | 202     | 25              | 49                | 0               | 0                  | 37                  | 197         | 54        | 0             | 0                    | 41          |
| pruned-update    | 224     | 38              | 77                | 0               | 0                  | 34                  | 206         | 65        | 0             | 0                    | 33          |
| pruned-update    | 217     | 45              | 69                | 0               | 0                  | 30                  | 194         | 60        | 0             | 0                    | 46          |
| pruned-update    | 243     | 65              | 72                | 0               | 0                  | 31                  | 211         | 53        | 0             | 0                    | 36          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 32795971            | 536870912           | 0                             | 32795971                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33522306            | 536870912           | 0                             | 33522306                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33538013            | 536870912           | 0                             | 33538013                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33506599            | 536870912           | 0                             | 33506599                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33488025            | 536870912           | 0                             | 33488025                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 536870912           | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 536870912           | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 536870912           | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 536870912           | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 536870912           | 0                             | 21063539                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 536870912           | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 536870912           | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 536870912           | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 536870912           | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 536870912           | 0                             | 21063506                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 536870912           | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 536870912           | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 536870912           | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 536870912           | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 536870912           | 0                             | 21150653                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 140         | 140            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 243         | 243            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 208         | 208            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 131         | 131            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 288         | 288            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 9                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |

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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.17        | 69.043       | 1.338                 | 1336                | 1.464    | 0.125  | 165            | 2048          | 64              | 25  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.64        | 68.215       | 1.354                 | 1352                | 1.48     | 0.126  | 199            | 2048          | 64              | 73  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.75        | 69.448       | 1.387                 | 1385                | 1.537    | 0.149  | 163            | 2048          | 64              | 105 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 56.01        | 81.455       | 1.294                 | 1291                | 1.41     | 0.116  | 182            | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.77        | 70.497       | 1.301                 | 1299                | 1.416    | 0.114  | 191            | 2048          | 64              | 177 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.09        | 32.337       | 0.267                 | 264                 | 0.388    | 0.121  | 33             | 2048          | 64              | 26  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.31        | 31.26        | 0.238                 | 235                 | 0.396    | 0.158  | 32             | 2048          | 64              | 74  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.26        | 32.398       | 0.226                 | 224                 | 0.344    | 0.118  | 33             | 2048          | 64              | 106 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.32        | 32.691       | 0.333                 | 330                 | 0.457    | 0.123  | 33             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.34        | 41.275       | 0.238                 | 236                 | 0.357    | 0.119  | 32             | 2048          | 64              | 178 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.02        | 37.226       | 0.553                 | 550                 | 0.703    | 0.15   | 39             | 2048          | 64              | 27  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.43        | 51.017       | 0.539                 | 537                 | 0.66     | 0.12   | 43             | 2048          | 64              | 75  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.38        | 32.906       | 0.547                 | 545                 | 0.706    | 0.158  | 38             | 2048          | 64              | 107 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.27        | 38.176       | 0.533                 | 530                 | 0.657    | 0.123  | 39             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.27        | 37.972       | 0.529                 | 527                 | 0.648    | 0.118  | 39             | 2048          | 64              | 179 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.13        | 34.933       | 0.647                 | 645                 | 0.765    | 0.118  | 39             | 2048          | 64              | 28  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.49        | 35.966       | 0.634                 | 632                 | 0.757    | 0.123  | 42             | 2048          | 64              | 76  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.4         | 38.405       | 0.667                 | 665                 | 0.788    | 0.121  | 41             | 2048          | 64              | 108 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.7         | 38.524       | 0.599                 | 596                 | 0.716    | 0.117  | 40             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.43        | 41.43        | 0.604                 | 602                 | 0.729    | 0.124  | 40             | 2048          | 64              | 180 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 256     | 98              | 79                | 0               | 0                  | 29                  | 1010        | 0         | 0             | 0                    | 39          |
| cold-create      | 228     | 68              | 72                | 0               | 0                  | 31                  | 1048        | 0         | 0             | 0                    | 44          |
| cold-create      | 223     | 64              | 63                | 0               | 0                  | 27                  | 1091        | 0         | 0             | 0                    | 43          |
| cold-create      | 222     | 67              | 71                | 0               | 0                  | 33                  | 985         | 0         | 0             | 0                    | 50          |
| cold-create      | 254     | 83              | 87                | 0               | 0                  | 29                  | 975         | 0         | 0             | 0                    | 39          |
| unchanged-update | 143     | 23              | 36                | 0               | 0                  | 39                  | 0           | 0         | 0             | 0                    | 81          |
| unchanged-update | 158     | 25              | 36                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 136     | 26              | 30                | 0               | 0                  | 35                  | 0           | 0         | 0             | 0                    | 52          |
| unchanged-update | 234     | 74              | 74                | 0               | 0                  | 37                  | 0           | 0         | 0             | 0                    | 58          |
| unchanged-update | 156     | 50              | 27                | 0               | 0                  | 33                  | 0           | 0         | 0             | 0                    | 46          |
| changed-update   | 283     | 83              | 98                | 0               | 0                  | 26                  | 208         | 0         | 0             | 0                    | 32          |
| changed-update   | 261     | 68              | 102               | 0               | 0                  | 34                  | 197         | 0         | 0             | 0                    | 43          |
| changed-update   | 248     | 84              | 72                | 0               | 0                  | 34                  | 182         | 0         | 0             | 0                    | 79          |
| changed-update   | 252     | 86              | 88                | 0               | 0                  | 35                  | 204         | 0         | 0             | 0                    | 37          |
| changed-update   | 247     | 78              | 82                | 0               | 0                  | 32                  | 197         | 0         | 0             | 0                    | 50          |
| pruned-update    | 304     | 87              | 140               | 0               | 0                  | 31                  | 200         | 65        | 0             | 0                    | 28          |
| pruned-update    | 245     | 72              | 87                | 0               | 0                  | 35                  | 205         | 81        | 0             | 0                    | 47          |
| pruned-update    | 249     | 58              | 104               | 0               | 0                  | 32                  | 256         | 59        | 0             | 0                    | 51          |
| pruned-update    | 231     | 67              | 81                | 0               | 0                  | 40                  | 212         | 59        | 0             | 0                    | 40          |
| pruned-update    | 235     | 64              | 84                | 0               | 0                  | 39                  | 196         | 71        | 0             | 0                    | 45          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 92080798            | 1073741824          | 0                             | 92080798                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 92080798            | 1073741824          | 0                             | 92080798                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 92080798            | 1073741824          | 0                             | 92080798                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 97041112            | 1073741824          | 0                             | 97041112                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 93305350            | 1073741824          | 0                             | 93305350                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 1073741824          | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 1073741824          | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 1073741824          | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 1073741824          | 0                             | 21063539                   |
| unchanged-update | 97043731         | 0              | 0            | 1276                 | 1276                 | 1276                | 1073741824          | 0                             | 21063539                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 1073741824          | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 1073741824          | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 1073741824          | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 1073741824          | 0                             | 21063506                   |
| changed-update   | 97043694         | 8209740        | 0            | 1670249              | 1671529              | 1670249             | 1073741824          | 0                             | 21063506                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 1073741824          | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 1073741824          | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 1073741824          | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 1073741824          | 0                             | 21150653                   |
| pruned-update    | 85339309         | 8209740        | 0            | 1670290              | 1671430              | 1670290             | 1073741824          | 0                             | 21150653                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 238         | 238            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 7                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 153         | 153            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 6                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 198         | 198            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 136         | 136            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 17                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 140         | 140            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
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
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 4                 | 4                        | 0                   | 0                                  |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.43        | 68.344       | 1.347                 | 1345                | 1.472    | 0.125  | 108            | 1024          | 32              | 5   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.78        | 67.599       | 1.442                 | 1440                | 1.602    | 0.159  | 106            | 1024          | 32              | 49  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.8         | 68.408       | 1.313                 | 1311                | 1.43     | 0.116  | 104            | 1024          | 32              | 89  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.72        | 69.394       | 1.294                 | 1292                | 1.413    | 0.119  | 105            | 1024          | 32              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.87        | 89.807       | 1.364                 | 1362                | 1.482    | 0.118  | 107            | 1024          | 32              | 157 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.91        | 36.631       | 0.293                 | 291                 | 0.409    | 0.116  | 34             | 1024          | 32              | 6   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.35        | 30.308       | 0.278                 | 275                 | 0.394    | 0.116  | 35             | 1024          | 32              | 50  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.21        | 33.819       | 0.262                 | 260                 | 0.38     | 0.118  | 34             | 1024          | 32              | 90  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.36        | 32.65        | 0.288                 | 286                 | 0.409    | 0.12   | 34             | 1024          | 32              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.37        | 32.679       | 0.348                 | 346                 | 0.466    | 0.117  | 34             | 1024          | 32              | 158 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.89        | 36.744       | 0.429                 | 427                 | 0.547    | 0.118  | 36             | 1024          | 32              | 7   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.34        | 35.696       | 0.491                 | 489                 | 0.609    | 0.117  | 39             | 1024          | 32              | 51  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.24        | 56.92        | 0.432                 | 429                 | 0.584    | 0.152  | 37             | 1024          | 32              | 91  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.45        | 33.103       | 0.452                 | 450                 | 0.571    | 0.119  | 37             | 1024          | 32              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.3         | 38.03        | 0.474                 | 472                 | 0.589    | 0.114  | 39             | 1024          | 32              | 159 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.03        | 36.75        | 1.127                 | 1125                | 1.245    | 0.118  | 37             | 1024          | 32              | 8   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.42        | 35.698       | 1.274                 | 1271                | 1.399    | 0.124  | 37             | 1024          | 32              | 52  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.48        | 38.312       | 1.149                 | 1147                | 1.27     | 0.12   | 39             | 1024          | 32              | 92  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.42        | 36.551       | 1.053                 | 1051                | 1.17     | 0.117  | 39             | 1024          | 32              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.51        | 38.188       | 1.134                 | 1131                | 1.247    | 0.113  | 37             | 1024          | 32              | 160 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 187     | 31              | 31                | 0               | 0                  | 29                  | 1084        | 0         | 0             | 0                    | 42          |
| cold-create      | 291     | 76              | 82                | 0               | 0                  | 33                  | 1071        | 0         | 0             | 0                    | 44          |
| cold-create      | 161     | 22              | 32                | 0               | 0                  | 30                  | 1078        | 0         | 0             | 0                    | 41          |
| cold-create      | 187     | 56              | 28                | 0               | 0                  | 30                  | 1031        | 0         | 0             | 0                    | 42          |
| cold-create      | 230     | 61              | 30                | 0               | 0                  | 29                  | 1053        | 0         | 0             | 0                    | 47          |
| unchanged-update | 187     | 25              | 38                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 176     | 31              | 32                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 165     | 24              | 34                | 0               | 0                  | 51                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 192     | 49              | 34                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 35          |
| unchanged-update | 216     | 77              | 31                | 0               | 0                  | 86                  | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 200     | 33              | 48                | 0               | 0                  | 62                  | 123         | 0         | 0             | 0                    | 40          |
| changed-update   | 239     | 48              | 64                | 0               | 0                  | 45                  | 161         | 0         | 0             | 0                    | 42          |
| changed-update   | 206     | 29              | 51                | 0               | 0                  | 58                  | 121         | 0         | 0             | 0                    | 43          |
| changed-update   | 206     | 54              | 34                | 0               | 0                  | 51                  | 147         | 0         | 0             | 0                    | 44          |
| changed-update   | 217     | 58              | 48                | 0               | 0                  | 58                  | 155         | 0         | 0             | 0                    | 41          |
| pruned-update    | 201     | 28              | 59                | 0               | 0                  | 66                  | 126         | 671       | 0             | 0                    | 44          |
| pruned-update    | 255     | 69              | 75                | 0               | 0                  | 66                  | 203         | 700       | 0             | 0                    | 31          |
| pruned-update    | 292     | 92              | 85                | 0               | 0                  | 56                  | 132         | 603       | 0             | 0                    | 49          |
| pruned-update    | 237     | 60              | 77                | 0               | 0                  | 59                  | 143         | 552       | 0             | 0                    | 46          |
| pruned-update    | 279     | 64              | 96                | 0               | 0                  | 60                  | 167         | 570       | 0             | 0                    | 43          |

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
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 536870912           | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 536870912           | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 536870912           | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 536870912           | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 536870912           | 0                             | 26780623                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 536870912           | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 536870912           | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 536870912           | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 536870912           | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 536870912           | 0                             | 21611596                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 536870912           | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 536870912           | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 536870912           | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 536870912           | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 536870912           | 0                             | 21611428                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 536870912           | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 536870912           | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 536870912           | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 536870912           | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 536870912           | 0                             | 21707117                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |

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

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.25        | 70.002       | 1.064                 | 1062                | 1.216    | 0.152  | 117            | 2048          | 64              | 1   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.69        | 66.869       | 0.925                 | 922                 | 1.072    | 0.147  | 117            | 2048          | 64              | 53  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.7         | 67.452       | 0.858                 | 856                 | 0.987    | 0.128  | 111            | 2048          | 64              | 85  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.83        | 72.752       | 0.951                 | 949                 | 1.107    | 0.155  | 125            | 2048          | 64              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.92        | 70.887       | 0.908                 | 906                 | 1.022    | 0.113  | 107            | 2048          | 64              | 153 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.93        | 31.436       | 0.346                 | 344                 | 0.464    | 0.117  | 33             | 2048          | 64              | 2   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.29        | 30.103       | 0.253                 | 250                 | 0.409    | 0.156  | 34             | 2048          | 64              | 54  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.3         | 32.497       | 0.267                 | 265                 | 0.389    | 0.122  | 37             | 2048          | 64              | 86  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.26        | 32.589       | 0.285                 | 283                 | 0.406    | 0.12   | 33             | 2048          | 64              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.37        | 32.643       | 0.284                 | 281                 | 0.4      | 0.116  | 33             | 2048          | 64              | 154 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18           | 36.732       | 0.556                 | 554                 | 0.669    | 0.113  | 37             | 2048          | 64              | 3   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.3         | 30.511       | 0.379                 | 377                 | 0.499    | 0.12   | 39             | 2048          | 64              | 55  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.45        | 32.84        | 0.54                  | 538                 | 0.69     | 0.149  | 37             | 2048          | 64              | 87  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.41        | 38.901       | 0.503                 | 501                 | 0.623    | 0.12   | 37             | 2048          | 64              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.35        | 36.745       | 0.483                 | 481                 | 0.597    | 0.114  | 39             | 2048          | 64              | 155 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.11        | 37.77        | 1.183                 | 1181                | 1.302    | 0.118  | 37             | 2048          | 64              | 4   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.45        | 35.74        | 1.53                  | 1528                | 1.647    | 0.117  | 39             | 2048          | 64              | 56  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.39        | 38.764       | 1.111                 | 1108                | 1.234    | 0.122  | 39             | 2048          | 64              | 88  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.49        | 35.99        | 1.113                 | 1111                | 1.205    | 0.092  | 37             | 2048          | 64              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.39        | 39.981       | 1.101                 | 1098                | 1.223    | 0.122  | 39             | 2048          | 64              | 156 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 265     | 73              | 91                | 0               | 0                  | 30                  | 718         | 0         | 0             | 0                    | 47          |
| cold-create      | 170     | 37              | 35                | 0               | 0                  | 31                  | 670         | 0         | 0             | 0                    | 49          |
| cold-create      | 184     | 45              | 59                | 0               | 0                  | 30                  | 598         | 0         | 0             | 0                    | 41          |
| cold-create      | 221     | 61              | 63                | 0               | 0                  | 38                  | 647         | 0         | 0             | 0                    | 42          |
| cold-create      | 206     | 74              | 53                | 0               | 0                  | 26                  | 628         | 0         | 0             | 0                    | 44          |
| unchanged-update | 159     | 32              | 38                | 0               | 0                  | 62                  | 0           | 0         | 0             | 0                    | 122         |
| unchanged-update | 148     | 25              | 29                | 0               | 0                  | 59                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 170     | 44              | 44                | 0               | 0                  | 54                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 177     | 60              | 31                | 0               | 0                  | 65                  | 0           | 0         | 0             | 0                    | 39          |
| unchanged-update | 174     | 62              | 31                | 0               | 0                  | 65                  | 0           | 0         | 0             | 0                    | 41          |
| changed-update   | 258     | 94              | 87                | 0               | 0                  | 61                  | 190         | 0         | 0             | 0                    | 42          |
| changed-update   | 154     | 26              | 47                | 0               | 0                  | 54                  | 133         | 0         | 0             | 0                    | 35          |
| changed-update   | 274     | 98              | 74                | 0               | 0                  | 71                  | 144         | 0         | 0             | 0                    | 47          |
| changed-update   | 230     | 69              | 76                | 0               | 0                  | 59                  | 167         | 0         | 0             | 0                    | 43          |
| changed-update   | 224     | 68              | 74                | 0               | 0                  | 54                  | 156         | 0         | 0             | 0                    | 44          |
| pruned-update    | 224     | 67              | 82                | 0               | 0                  | 64                  | 185         | 654       | 0             | 0                    | 40          |
| pruned-update    | 166     | 32              | 53                | 0               | 0                  | 75                  | 224         | 1007      | 0             | 0                    | 37          |
| pruned-update    | 248     | 82              | 70                | 0               | 0                  | 57                  | 196         | 556       | 0             | 0                    | 41          |
| pruned-update    | 239     | 81              | 79                | 0               | 0                  | 80                  | 160         | 571       | 0             | 0                    | 44          |
| pruned-update    | 249     | 65              | 94                | 0               | 0                  | 55                  | 176         | 563       | 0             | 0                    | 40          |

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
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 1073741824          | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 1073741824          | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 1073741824          | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 1073741824          | 0                             | 26780623                   |
| cold-create      | 26816241         | 52904649       | 0            | 26780623             | 26796094             | 26780623            | 1073741824          | 0                             | 26780623                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 1073741824          | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 1073741824          | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 1073741824          | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 1073741824          | 0                             | 21611596                   |
| unchanged-update | 26816241         | 0              | 0            | 15471                | 15471                | 15471               | 1073741824          | 0                             | 21611596                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 1073741824          | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 1073741824          | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 1073741824          | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 1073741824          | 0                             | 21611428                   |
| changed-update   | 26816069         | 1379190        | 0            | 680670               | 696145               | 680670              | 1073741824          | 0                             | 21611428                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 1073741824          | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 1073741824          | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 1073741824          | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 1073741824          | 0                             | 21707117                   |
| pruned-update    | 24609503         | 1379190        | 0            | 667544               | 681442               | 667544              | 1073741824          | 0                             | 21707117                   |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 92          | 92             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 1            | 0               | 128         | 128            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 1            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
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

## tiny-many / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes   | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | ------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.48        | 68.982       | 2.762                 | 2759                | 2.88     | 0.118  | 58             | 1024          | 32              | 17  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.85        | 68.216       | 2.705                 | 2703                | 2.822    | 0.116  | 57             | 1024          | 32              | 65  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.84        | 70.374       | 2.573                 | 2570                | 2.686    | 0.113  | 54             | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.74        | 70.054       | 2.618                 | 2616                | 2.733    | 0.114  | 57             | 1024          | 32              | 133 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.76        | 86.338       | 2.747                 | 2744                | 2.872    | 0.124  | 53             | 1024          | 32              | 169 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.89        | 31.698       | 0.481                 | 479                 | 0.598    | 0.116  | 35             | 1024          | 32              | 18  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.34        | 30.518       | 0.561                 | 559                 | 0.716    | 0.154  | 35             | 1024          | 32              | 66  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.3         | 32.562       | 0.515                 | 513                 | 0.634    | 0.118  | 35             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.35        | 32.772       | 0.439                 | 437                 | 0.564    | 0.124  | 35             | 1024          | 32              | 134 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.42        | 32.935       | 0.478                 | 476                 | 0.594    | 0.115  | 35             | 1024          | 32              | 170 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.87        | 37.856       | 0.748                 | 746                 | 0.896    | 0.147  | 36             | 1024          | 32              | 19  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.25        | 30.668       | 0.696                 | 694                 | 0.822    | 0.125  | 36             | 1024          | 32              | 67  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.34        | 56.962       | 0.518                 | 515                 | 0.637    | 0.119  | 36             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.32        | 33.168       | 0.569                 | 567                 | 0.693    | 0.124  | 38             | 1024          | 32              | 135 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.35        | 50.819       | 0.595                 | 593                 | 0.716    | 0.12   | 36             | 1024          | 32              | 171 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.07        | 37.563       | 1.4                   | 1398                | 1.518    | 0.118  | 36             | 1024          | 32              | 20  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.4         | 36.276       | 1.409                 | 1407                | 1.528    | 0.118  | 36             | 1024          | 32              | 68  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.49        | 38.527       | 1.33                  | 1327                | 1.489    | 0.159  | 36             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.48        | 38.526       | 1.257                 | 1255                | 1.374    | 0.116  | 36             | 1024          | 32              | 136 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.43        | 33.196       | 1.251                 | 1249                | 1.373    | 0.122  | 38             | 1024          | 32              | 172 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 243     | 27              | 86                | 2               | 2                  | 32                  | 2435        | 0         | 0             | 0                    | 49          |
| cold-create      | 307     | 25              | 153               | 2               | 2                  | 31                  | 2320        | 0         | 0             | 0                    | 43          |
| cold-create      | 247     | 37              | 93                | 2               | 2                  | 27                  | 2249        | 0         | 0             | 0                    | 45          |
| cold-create      | 234     | 28              | 88                | 2               | 2                  | 31                  | 2309        | 0         | 0             | 0                    | 40          |
| cold-create      | 253     | 29              | 105               | 2               | 2                  | 32                  | 2411        | 0         | 0             | 0                    | 46          |
| unchanged-update | 241     | 21              | 94                | 2               | 2                  | 192                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 266     | 32              | 91                | 2               | 3                  | 243                 | 1           | 0         | 0             | 0                    | 47          |
| unchanged-update | 238     | 33              | 91                | 2               | 2                  | 228                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 220     | 25              | 79                | 2               | 2                  | 173                 | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 233     | 36              | 79                | 2               | 2                  | 200                 | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 349     | 32              | 171               | 2               | 3                  | 240                 | 112         | 0         | 0             | 0                    | 43          |
| changed-update   | 293     | 35              | 138               | 2               | 2                  | 250                 | 101         | 0         | 0             | 0                    | 48          |
| changed-update   | 221     | 25              | 86                | 2               | 2                  | 164                 | 80          | 0         | 0             | 0                    | 48          |
| changed-update   | 236     | 33              | 82                | 2               | 2                  | 196                 | 89          | 0         | 0             | 0                    | 44          |
| changed-update   | 243     | 27              | 91                | 2               | 2                  | 214                 | 96          | 0         | 0             | 0                    | 38          |
| pruned-update    | 260     | 28              | 91                | 2               | 2                  | 210                 | 102         | 759       | 0             | 0                    | 53          |
| pruned-update    | 306     | 28              | 154               | 2               | 2                  | 234                 | 93          | 717       | 0             | 0                    | 40          |
| pruned-update    | 264     | 31              | 84                | 2               | 3                  | 238                 | 102         | 663       | 0             | 0                    | 42          |
| pruned-update    | 238     | 27              | 89                | 1               | 2                  | 190                 | 103         | 668       | 0             | 0                    | 39          |
| pruned-update    | 234     | 26              | 92                | 2               | 2                  | 169                 | 101         | 682       | 0             | 0                    | 43          |

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
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 536870912           | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 536870912           | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 536870912           | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 536870912           | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 536870912           | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 536870912           | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 536870912           | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 536870912           | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 536870912           | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 536870912           | 0                             | 6039819                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 536870912           | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 536870912           | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 536870912           | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 536870912           | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 536870912           | 0                             | 6039760                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 536870912           | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 536870912           | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 536870912           | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 536870912           | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 536870912           | 0                             | 5421002                    |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 30          | 30             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 30          | 30             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 29          | 29             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 28          | 28             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 24          | 24             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |

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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.53        | 69.864       | 1.588                 | 1585                | 1.707    | 0.118  | 58             | 2048          | 64              | 13  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.87        | 67.959       | 1.589                 | 1587                | 1.738    | 0.149  | 64             | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.82        | 70.34        | 1.443                 | 1441                | 1.562    | 0.118  | 69             | 2048          | 64              | 97  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 50.58        | 65.711       | 1.493                 | 1490                | 1.618    | 0.124  | 65             | 2048          | 64              | 129 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.77        | 69.872       | 1.528                 | 1525                | 1.653    | 0.125  | 74             | 2048          | 64              | 165 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.93        | 31.766       | 0.491                 | 488                 | 0.611    | 0.12   | 35             | 2048          | 64              | 14  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.3         | 30.313       | 0.466                 | 463                 | 0.585    | 0.119  | 35             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.31        | 32.614       | 0.474                 | 471                 | 0.592    | 0.118  | 35             | 2048          | 64              | 98  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.37        | 33.151       | 0.417                 | 415                 | 0.534    | 0.116  | 35             | 2048          | 64              | 130 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.41        | 40.265       | 0.475                 | 473                 | 0.589    | 0.113  | 35             | 2048          | 64              | 166 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.99        | 37.316       | 0.534                 | 530                 | 0.649    | 0.114  | 36             | 2048          | 64              | 15  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.31        | 30.925       | 0.597                 | 594                 | 0.715    | 0.118  | 36             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.34        | 38.91        | 0.557                 | 555                 | 0.669    | 0.112  | 36             | 2048          | 64              | 99  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.38        | 38.52        | 0.656                 | 654                 | 0.78     | 0.124  | 36             | 2048          | 64              | 131 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.32        | 38.445       | 0.655                 | 653                 | 0.776    | 0.12   | 36             | 2048          | 64              | 167 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.03        | 37.566       | 1.478                 | 1476                | 1.593    | 0.115  | 35             | 2048          | 64              | 16  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.33        | 30.979       | 1.334                 | 1332                | 1.484    | 0.15   | 36             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.45        | 38.491       | 1.399                 | 1397                | 1.549    | 0.15   | 36             | 2048          | 64              | 100 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.49        | 39.348       | 1.398                 | 1395                | 1.552    | 0.154  | 35             | 2048          | 64              | 132 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.52        | 38.877       | 1.436                 | 1433                | 1.585    | 0.148  | 36             | 2048          | 64              | 168 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 264     | 29              | 140               | 2               | 2                  | 28                  | 1244        | 0         | 0             | 0                    | 48          |
| cold-create      | 230     | 30              | 90                | 3               | 3                  | 34                  | 1276        | 0         | 0             | 0                    | 46          |
| cold-create      | 259     | 28              | 144               | 2               | 2                  | 25                  | 1115        | 0         | 0             | 0                    | 40          |
| cold-create      | 265     | 31              | 150               | 2               | 2                  | 24                  | 1155        | 0         | 0             | 0                    | 45          |
| cold-create      | 266     | 28              | 150               | 2               | 2                  | 43                  | 1171        | 0         | 0             | 0                    | 44          |
| unchanged-update | 214     | 28              | 91                | 2               | 2                  | 232                 | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 193     | 29              | 83                | 2               | 2                  | 223                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 198     | 27              | 88                | 2               | 2                  | 232                 | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 200     | 29              | 81                | 2               | 2                  | 172                 | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 208     | 32              | 89                | 2               | 2                  | 218                 | 0           | 0         | 0             | 0                    | 45          |
| changed-update   | 202     | 26              | 85                | 2               | 2                  | 183                 | 101         | 0         | 0             | 0                    | 42          |
| changed-update   | 207     | 30              | 95                | 2               | 2                  | 222                 | 132         | 0         | 0             | 0                    | 31          |
| changed-update   | 223     | 26              | 112               | 2               | 2                  | 186                 | 106         | 0         | 0             | 0                    | 38          |
| changed-update   | 264     | 30              | 137               | 2               | 2                  | 245                 | 95          | 0         | 0             | 0                    | 47          |
| changed-update   | 271     | 34              | 140               | 2               | 2                  | 198                 | 138         | 0         | 0             | 0                    | 44          |
| pruned-update    | 321     | 34              | 203               | 2               | 2                  | 213                 | 93          | 784       | 0             | 0                    | 47          |
| pruned-update    | 226     | 32              | 94                | 2               | 3                  | 256                 | 89          | 709       | 0             | 0                    | 35          |
| pruned-update    | 295     | 27              | 155               | 2               | 3                  | 247                 | 101         | 686       | 0             | 0                    | 50          |
| pruned-update    | 284     | 35              | 143               | 2               | 3                  | 241                 | 94          | 676       | 0             | 0                    | 84          |
| pruned-update    | 276     | 40              | 131               | 2               | 3                  | 250                 | 102         | 748       | 0             | 0                    | 43          |

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
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 1073741824          | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 1073741824          | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 1073741824          | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 1073741824          | 0                             | 6039819                    |
| cold-create      | 2803524          | 8178618        | 0            | 2596365              | 2681447              | 2596365             | 1073741824          | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 1073741824          | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 1073741824          | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 1073741824          | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 1073741824          | 0                             | 6039819                    |
| unchanged-update | 2803524          | 0              | 0            | 85082                | 85082                | 85082               | 1073741824          | 0                             | 6039819                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 1073741824          | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 1073741824          | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 1073741824          | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 1073741824          | 0                             | 6039760                    |
| changed-update   | 2803498          | 20712          | 0            | 3457                 | 88532                | 85075               | 1073741824          | 0                             | 6039760                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 1073741824          | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 1073741824          | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 1073741824          | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 1073741824          | 0                             | 5421002                    |
| pruned-update    | 2515982          | 20712          | 0            | 3476                 | 80119                | 76643               | 1073741824          | 0                             | 5421002                    |

### Source Range Reads

| Phase            | Planned blocks | Fetched blocks | Get attempts | Get retries | Get throttled | Get retryable errors | Get permanent errors | Get request errors | Get body errors | Get short bodies | Get errors | Block hits | Block misses | Block refetches | Block waits | Waits fetching | Waits capacity | Replay claims | Replay after release | Replay after failure | Body attempts | Body replays | Active GETs high | Active readers high |
| ---------------- | -------------- | -------------- | ------------ | ----------- | ------------- | -------------------- | -------------------- | ------------------ | --------------- | ---------------- | ---------- | ---------- | ------------ | --------------- | ----------- | -------------- | -------------- | ------------- | -------------------- | -------------------- | ------------- | ------------ | ---------------- | ------------------- |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 12          | 12             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 42          | 42             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 55          | 55             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 35          | 35             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| pruned-update    | 2              | 3              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 6          | 1            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 2             | 0            | 2                | 1                   |
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
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |
| pruned-update    | 1         | 0            | 259               | 259                      | 0                   | 0                                  |

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
