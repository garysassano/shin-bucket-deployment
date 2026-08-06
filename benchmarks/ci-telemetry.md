# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-08-06                  |
| Regions             | eu-central-1                |
| Profiles            | mixed, tiny-many, large-few |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 70.645       | 2.606                 | 2604                | 2.721    | 0.115  | 109            | 1024          | 32              | 25  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.37        | 68.734       | 2.395                 | 2393                | 2.511    | 0.115  | 103            | 1024          | 32              | 73  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 60.44        | 73.57        | 2.562                 | 2560                | 2.721    | 0.158  | 121            | 1024          | 32              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.21        | 68.923       | 2.782                 | 2780                | 2.947    | 0.164  | 120            | 1024          | 32              | 141 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.24        | 68.807       | 2.152                 | 2150                | 2.276    | 0.123  | 102            | 1024          | 32              | 177 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.38        | 32.827       | 0.312                 | 309                 | 0.467    | 0.155  | 32             | 1024          | 32              | 26  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.84        | 35.237       | 0.261                 | 259                 | 0.384    | 0.122  | 33             | 1024          | 32              | 74  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.88        | 35.399       | 0.267                 | 265                 | 0.423    | 0.155  | 32             | 1024          | 32              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.86        | 31.339       | 0.373                 | 371                 | 0.49     | 0.116  | 32             | 1024          | 32              | 142 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.97        | 31.413       | 0.321                 | 319                 | 0.438    | 0.116  | 32             | 1024          | 32              | 178 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.31        | 38.395       | 0.66                  | 658                 | 0.774    | 0.114  | 40             | 1024          | 32              | 27  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.87        | 37.082       | 0.612                 | 610                 | 0.726    | 0.113  | 39             | 1024          | 32              | 75  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.9         | 37.329       | 0.616                 | 614                 | 0.746    | 0.129  | 40             | 1024          | 32              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.92        | 36.76        | 0.612                 | 610                 | 0.731    | 0.118  | 38             | 1024          | 32              | 143 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.01        | 36.634       | 0.655                 | 653                 | 0.772    | 0.116  | 39             | 1024          | 32              | 179 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.55        | 43.57        | 0.711                 | 709                 | 0.805    | 0.093  | 39             | 1024          | 32              | 28  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.12        | 37.661       | 0.666                 | 663                 | 0.823    | 0.157  | 39             | 1024          | 32              | 76  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.23        | 37.683       | 0.694                 | 692                 | 0.823    | 0.129  | 40             | 1024          | 32              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.05        | 36.714       | 0.684                 | 682                 | 0.803    | 0.119  | 42             | 1024          | 32              | 144 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 17.97        | 42.655       | 0.736                 | 734                 | 0.864    | 0.127  | 39             | 1024          | 32              | 180 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 307     | 31                  | 2217        | 0         | 0             | 0                    | 47          |
| cold-create      | 306     | 35                  | 2012        | 0         | 0             | 0                    | 40          |
| cold-create      | 335     | 36                  | 2151        | 0         | 0             | 0                    | 36          |
| cold-create      | 292     | 35                  | 2412        | 0         | 0             | 0                    | 40          |
| cold-create      | 287     | 35                  | 1780        | 0         | 0             | 0                    | 47          |
| unchanged-update | 195     | 39                  | 0           | 0         | 0             | 0                    | 75          |
| unchanged-update | 177     | 39                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 184     | 34                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 297     | 29                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 237     | 32                  | 0           | 0         | 0             | 0                    | 48          |
| changed-update   | 333     | 38                  | 243         | 0         | 0             | 0                    | 42          |
| changed-update   | 291     | 37                  | 246         | 0         | 0             | 0                    | 35          |
| changed-update   | 292     | 36                  | 247         | 0         | 0             | 0                    | 38          |
| changed-update   | 314     | 37                  | 213         | 0         | 0             | 0                    | 43          |
| changed-update   | 333     | 36                  | 242         | 0         | 0             | 0                    | 41          |
| pruned-update    | 317     | 31                  | 239         | 62        | 0             | 0                    | 44          |
| pruned-update    | 290     | 35                  | 209         | 69        | 0             | 0                    | 46          |
| pruned-update    | 305     | 35                  | 225         | 72        | 0             | 0                    | 38          |
| pruned-update    | 313     | 37                  | 196         | 73        | 0             | 0                    | 44          |
| pruned-update    | 348     | 35                  | 199         | 91        | 0             | 0                    | 43          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 32716316            | 536870912           | 0                             | 32716316                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33553720            | 536870912           | 0                             | 33553720                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33255787            | 536870912           | 0                             | 33255787                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 32795971            | 536870912           | 0                             | 32795971                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33538013            | 536870912           | 0                             | 33538013                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 290         | 290            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 123         | 123            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 272         | 272            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 6                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 319         | 319            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 11                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 11           | 0               | 133         | 133            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |

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
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.8         | 71.846       | 1.11                  | 1108                | 1.226    | 0.115  | 173            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.41        | 87.331       | 1.18                  | 1178                | 1.3      | 0.119  | 187            | 2048          | 64              | 77  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.28        | 68.306       | 1.217                 | 1215                | 1.333    | 0.116  | 196            | 2048          | 64              | 113 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.53        | 68.674       | 1.362                 | 1360                | 1.515    | 0.153  | 179            | 2048          | 64              | 145 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 55.38        | 68.861       | 1.232                 | 1230                | 1.357    | 0.124  | 188            | 2048          | 64              | 181 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.44        | 36.361       | 0.26                  | 258                 | 0.41     | 0.15   | 32             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.95        | 31.595       | 0.262                 | 260                 | 0.42     | 0.157  | 32             | 2048          | 64              | 78  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.9         | 31.439       | 0.231                 | 229                 | 0.347    | 0.115  | 32             | 2048          | 64              | 114 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.9         | 36.954       | 0.25                  | 248                 | 0.368    | 0.117  | 33             | 2048          | 64              | 146 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 17.86        | 46.237       | 0.251                 | 249                 | 0.37     | 0.119  | 32             | 2048          | 64              | 182 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.43        | 38.405       | 0.476                 | 474                 | 0.593    | 0.116  | 39             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.01        | 36.847       | 0.519                 | 516                 | 0.633    | 0.114  | 39             | 2048          | 64              | 79  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 18.17        | 37.542       | 0.546                 | 544                 | 0.695    | 0.148  | 39             | 2048          | 64              | 115 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.98        | 36.734       | 0.549                 | 546                 | 0.674    | 0.125  | 39             | 2048          | 64              | 147 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 17.84        | 36.89        | 0.537                 | 535                 | 0.659    | 0.121  | 39             | 2048          | 64              | 183 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.52        | 38.455       | 0.496                 | 494                 | 0.615    | 0.118  | 40             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 17.89        | 36.756       | 0.578                 | 576                 | 0.699    | 0.12   | 39             | 2048          | 64              | 80  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.09        | 37.44        | 0.521                 | 518                 | 0.64     | 0.118  | 40             | 2048          | 64              | 116 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 18.01        | 37.468       | 0.64                  | 638                 | 0.763    | 0.123  | 39             | 2048          | 64              | 148 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 17.99        | 36.828       | 0.664                 | 662                 | 0.813    | 0.148  | 39             | 2048          | 64              | 184 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 126     | 32                  | 906         | 0         | 0             | 0                    | 42          |
| cold-create      | 132     | 32                  | 954         | 0         | 0             | 0                    | 59          |
| cold-create      | 170     | 32                  | 965         | 0         | 0             | 0                    | 46          |
| cold-create      | 184     | 34                  | 1099        | 0         | 0             | 0                    | 42          |
| cold-create      | 173     | 30                  | 986         | 0         | 0             | 0                    | 39          |
| unchanged-update | 189     | 34                  | 0           | 0         | 0             | 0                    | 33          |
| unchanged-update | 171     | 41                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 144     | 32                  | 0           | 0         | 0             | 0                    | 52          |
| unchanged-update | 174     | 36                  | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 163     | 37                  | 0           | 0         | 0             | 0                    | 48          |
| changed-update   | 201     | 37                  | 189         | 0         | 0             | 0                    | 45          |
| changed-update   | 210     | 30                  | 212         | 0         | 0             | 0                    | 63          |
| changed-update   | 206     | 36                  | 258         | 0         | 0             | 0                    | 43          |
| changed-update   | 239     | 38                  | 223         | 0         | 0             | 0                    | 44          |
| changed-update   | 277     | 34                  | 185         | 0         | 0             | 0                    | 37          |
| pruned-update    | 162     | 37                  | 164         | 66        | 0             | 0                    | 45          |
| pruned-update    | 156     | 36                  | 247         | 74        | 0             | 0                    | 44          |
| pruned-update    | 161     | 38                  | 196         | 65        | 0             | 0                    | 44          |
| pruned-update    | 216     | 35                  | 258         | 69        | 0             | 0                    | 45          |
| pruned-update    | 311     | 35                  | 179         | 67        | 0             | 0                    | 51          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 93305350            | 1073741824          | 0                             | 93305350                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 97041112            | 1073741824          | 0                             | 97041112                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 92080798            | 1073741824          | 0                             | 92080798                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 145         | 145            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 7                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 182         | 182            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 12                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 169         | 169            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 6                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 173         | 173            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 8                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 245         | 245            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 4           | 4              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |

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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.81        | 71.416       | 1.307                 | 1305                | 1.422    | 0.114  | 103            | 1024          | 32              | 1   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.4         | 69.06        | 1.382                 | 1380                | 1.511    | 0.128  | 107            | 1024          | 32              | 49  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.48        | 68.304       | 1.452                 | 1450                | 1.604    | 0.151  | 103            | 1024          | 32              | 85  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.41        | 68.485       | 1.317                 | 1315                | 1.452    | 0.135  | 107            | 1024          | 32              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.49        | 69.617       | 1.513                 | 1510                | 1.665    | 0.152  | 101            | 1024          | 32              | 153 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.36        | 33.006       | 0.283                 | 281                 | 0.397    | 0.113  | 33             | 1024          | 32              | 2   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.95        | 32.081       | 0.312                 | 309                 | 0.436    | 0.124  | 34             | 1024          | 32              | 50  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.97        | 31.425       | 0.312                 | 309                 | 0.428    | 0.116  | 33             | 1024          | 32              | 86  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.84        | 31.118       | 0.316                 | 314                 | 0.433    | 0.116  | 33             | 1024          | 32              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.89        | 31.171       | 0.324                 | 321                 | 0.44     | 0.116  | 33             | 1024          | 32              | 154 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.31        | 38.051       | 0.595                 | 593                 | 0.746    | 0.151  | 37             | 1024          | 32              | 3   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.87        | 36.665       | 0.64                  | 638                 | 0.789    | 0.149  | 37             | 1024          | 32              | 51  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.91        | 37.242       | 0.601                 | 599                 | 0.72     | 0.118  | 37             | 1024          | 32              | 87  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.02        | 31.71        | 0.688                 | 686                 | 0.839    | 0.15   | 37             | 1024          | 32              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.99        | 40.863       | 0.628                 | 625                 | 0.75     | 0.122  | 38             | 1024          | 32              | 155 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 23.79        | 38.197       | 1.251                 | 1247                | 1.406    | 0.155  | 37             | 1024          | 32              | 4   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 17.98        | 36.653       | 1.296                 | 1294                | 1.409    | 0.113  | 37             | 1024          | 32              | 52  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 17.99        | 36.57        | 1.286                 | 1283                | 1.405    | 0.119  | 39             | 1024          | 32              | 88  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.05        | 36.662       | 1.257                 | 1255                | 1.38     | 0.123  | 39             | 1024          | 32              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 17.96        | 31.77        | 1.38                  | 1378                | 1.499    | 0.118  | 36             | 1024          | 32              | 156 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 257     | 33                  | 969         | 0         | 0             | 0                    | 45          |
| cold-create      | 281     | 29                  | 1032        | 0         | 0             | 0                    | 36          |
| cold-create      | 257     | 39                  | 1106        | 0         | 0             | 0                    | 47          |
| cold-create      | 234     | 28                  | 1007        | 0         | 0             | 0                    | 45          |
| cold-create      | 290     | 35                  | 1143        | 0         | 0             | 0                    | 41          |
| unchanged-update | 174     | 62                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 202     | 64                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 206     | 61                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 190     | 81                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 221     | 54                  | 0           | 0         | 0             | 0                    | 46          |
| changed-update   | 297     | 59                  | 203         | 0         | 0             | 0                    | 32          |
| changed-update   | 332     | 73                  | 185         | 0         | 0             | 0                    | 46          |
| changed-update   | 287     | 80                  | 188         | 0         | 0             | 0                    | 42          |
| changed-update   | 311     | 70                  | 262         | 0         | 0             | 0                    | 41          |
| changed-update   | 320     | 62                  | 199         | 0         | 0             | 0                    | 43          |
| pruned-update    | 318     | 55                  | 211         | 613       | 0             | 0                    | 37          |
| pruned-update    | 337     | 65                  | 177         | 654       | 0             | 0                    | 42          |
| pruned-update    | 293     | 61                  | 221         | 647       | 0             | 0                    | 43          |
| pruned-update    | 278     | 68                  | 172         | 674       | 0             | 0                    | 49          |
| pruned-update    | 330     | 69                  | 232         | 678       | 0             | 0                    | 54          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.35        | 70.967       | 0.799                 | 797                 | 0.931    | 0.131  | 128            | 2048          | 64              | 5   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.05        | 68.102       | 0.828                 | 826                 | 0.948    | 0.12   | 109            | 2048          | 64              | 53  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.41        | 83.371       | 0.724                 | 722                 | 0.837    | 0.113  | 92             | 2048          | 64              | 89  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.04        | 74.197       | 0.981                 | 979                 | 1.104    | 0.123  | 117            | 2048          | 64              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 55.39        | 88.179       | 0.963                 | 961                 | 1.114    | 0.15   | 116            | 2048          | 64              | 157 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.36        | 32.643       | 0.25                  | 248                 | 0.365    | 0.114  | 34             | 2048          | 64              | 6   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.91        | 31.492       | 0.259                 | 256                 | 0.389    | 0.129  | 34             | 2048          | 64              | 54  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.94        | 31.17        | 0.295                 | 292                 | 0.446    | 0.151  | 33             | 2048          | 64              | 90  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.89        | 31.349       | 0.31                  | 308                 | 0.468    | 0.158  | 33             | 2048          | 64              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 17.95        | 31.164       | 0.286                 | 284                 | 0.405    | 0.118  | 35             | 2048          | 64              | 158 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.41        | 39.284       | 0.414                 | 412                 | 0.564    | 0.149  | 37             | 2048          | 64              | 7   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.85        | 37.521       | 0.399                 | 397                 | 0.518    | 0.119  | 37             | 2048          | 64              | 55  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.84        | 36.61        | 0.382                 | 380                 | 0.5      | 0.117  | 37             | 2048          | 64              | 91  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.97        | 36.878       | 0.475                 | 473                 | 0.593    | 0.118  | 37             | 2048          | 64              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 17.95        | 41.239       | 0.498                 | 496                 | 0.616    | 0.117  | 37             | 2048          | 64              | 159 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.49        | 38.085       | 1.085                 | 1083                | 1.238    | 0.152  | 36             | 2048          | 64              | 8   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.05        | 36.675       | 1.192                 | 1189                | 1.31     | 0.118  | 37             | 2048          | 64              | 56  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 17.98        | 36.743       | 1.126                 | 1123                | 1.242    | 0.116  | 36             | 2048          | 64              | 92  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.02        | 43.825       | 1.239                 | 1237                | 1.355    | 0.115  | 39             | 2048          | 64              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 18.11        | 36.883       | 1.327                 | 1324                | 1.476    | 0.148  | 37             | 2048          | 64              | 160 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 134     | 29                  | 588         | 0         | 0             | 0                    | 45          |
| cold-create      | 146     | 38                  | 602         | 0         | 0             | 0                    | 38          |
| cold-create      | 136     | 33                  | 512         | 0         | 0             | 0                    | 39          |
| cold-create      | 202     | 32                  | 699         | 0         | 0             | 0                    | 45          |
| cold-create      | 181     | 28                  | 716         | 0         | 0             | 0                    | 34          |
| unchanged-update | 146     | 59                  | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 161     | 57                  | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 182     | 68                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 187     | 65                  | 0           | 0         | 0             | 0                    | 55          |
| unchanged-update | 176     | 66                  | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 174     | 67                  | 126         | 0         | 0             | 0                    | 43          |
| changed-update   | 168     | 59                  | 126         | 0         | 0             | 0                    | 41          |
| changed-update   | 132     | 74                  | 127         | 0         | 0             | 0                    | 44          |
| changed-update   | 198     | 55                  | 187         | 0         | 0             | 0                    | 31          |
| changed-update   | 211     | 67                  | 172         | 0         | 0             | 0                    | 44          |
| pruned-update    | 155     | 62                  | 125         | 676       | 0             | 0                    | 48          |
| pruned-update    | 210     | 69                  | 123         | 730       | 0             | 0                    | 40          |
| pruned-update    | 201     | 76                  | 139         | 644       | 0             | 0                    | 47          |
| pruned-update    | 263     | 57                  | 163         | 694       | 0             | 0                    | 44          |
| pruned-update    | 281     | 70                  | 206         | 699       | 0             | 0                    | 49          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 118         | 118            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 126         | 126            | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 93          | 93             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.94        | 70.911       | 2.637                 | 2635                | 2.752    | 0.115  | 49             | 1024          | 32              | 13  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.68        | 69.833       | 2.632                 | 2630                | 2.784    | 0.151  | 49             | 1024          | 32              | 61  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.36        | 71.004       | 2.682                 | 2680                | 2.809    | 0.126  | 56             | 1024          | 32              | 97  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.35        | 76.173       | 2.614                 | 2612                | 2.73     | 0.115  | 55             | 1024          | 32              | 129 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.21        | 68.625       | 2.594                 | 2592                | 2.71     | 0.115  | 55             | 1024          | 32              | 165 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.29        | 32.738       | 0.538                 | 535                 | 0.653    | 0.115  | 35             | 1024          | 32              | 14  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.87        | 31.758       | 0.496                 | 494                 | 0.612    | 0.116  | 35             | 1024          | 32              | 62  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.89        | 31.478       | 0.515                 | 513                 | 0.642    | 0.127  | 35             | 1024          | 32              | 98  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.88        | 31.44        | 0.554                 | 552                 | 0.669    | 0.114  | 35             | 1024          | 32              | 130 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.88        | 32.436       | 0.514                 | 511                 | 0.629    | 0.115  | 35             | 1024          | 32              | 166 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.38        | 38.94        | 0.7                   | 698                 | 0.817    | 0.117  | 36             | 1024          | 32              | 15  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.87        | 31.891       | 0.665                 | 662                 | 0.788    | 0.123  | 36             | 1024          | 32              | 63  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.95        | 37.186       | 0.636                 | 633                 | 0.756    | 0.12   | 35             | 1024          | 32              | 99  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.81        | 36.925       | 0.664                 | 662                 | 0.795    | 0.13   | 36             | 1024          | 32              | 131 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.04        | 37.472       | 0.659                 | 656                 | 0.779    | 0.12   | 36             | 1024          | 32              | 167 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.41        | 38.699       | 1.628                 | 1626                | 1.746    | 0.118  | 36             | 1024          | 32              | 16  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18           | 37.034       | 1.47                  | 1468                | 1.587    | 0.116  | 36             | 1024          | 32              | 64  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.02        | 38.02        | 1.509                 | 1507                | 1.625    | 0.115  | 35             | 1024          | 32              | 100 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.02        | 37.074       | 1.516                 | 1513                | 1.672    | 0.156  | 35             | 1024          | 32              | 132 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.08        | 53.077       | 1.645                 | 1643                | 1.765    | 0.119  | 36             | 1024          | 32              | 168 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 373     | 33                  | 2187        | 0         | 0             | 0                    | 40          |
| cold-create      | 334     | 35                  | 2217        | 0         | 0             | 0                    | 42          |
| cold-create      | 320     | 33                  | 2288        | 0         | 0             | 0                    | 37          |
| cold-create      | 296     | 34                  | 2233        | 0         | 0             | 0                    | 48          |
| cold-create      | 271     | 32                  | 2247        | 0         | 0             | 0                    | 40          |
| unchanged-update | 258     | 229                 | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 240     | 204                 | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 242     | 209                 | 0           | 0         | 0             | 0                    | 59          |
| unchanged-update | 250     | 258                 | 0           | 0         | 0             | 0                    | 42          |
| unchanged-update | 232     | 245                 | 0           | 0         | 0             | 0                    | 32          |
| changed-update   | 301     | 244                 | 108         | 0         | 0             | 0                    | 43          |
| changed-update   | 286     | 224                 | 104         | 0         | 0             | 0                    | 46          |
| changed-update   | 288     | 196                 | 105         | 0         | 0             | 0                    | 42          |
| changed-update   | 295     | 238                 | 83          | 0         | 0             | 0                    | 44          |
| changed-update   | 298     | 215                 | 101         | 0         | 0             | 0                    | 40          |
| pruned-update    | 383     | 269                 | 113         | 804       | 0             | 0                    | 44          |
| pruned-update    | 349     | 187                 | 115         | 753       | 0             | 0                    | 46          |
| pruned-update    | 353     | 223                 | 116         | 756       | 0             | 0                    | 43          |
| pruned-update    | 334     | 270                 | 102         | 754       | 0             | 0                    | 38          |
| pruned-update    | 397     | 241                 | 127         | 817       | 0             | 0                    | 39          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 9           | 9              | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 11          | 11             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 29          | 29             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 30          | 30             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 26          | 26             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.93        | 70.588       | 1.593                 | 1591                | 1.749    | 0.155  | 68             | 2048          | 64              | 17  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.54        | 69.346       | 1.524                 | 1522                | 1.644    | 0.119  | 64             | 2048          | 64              | 65  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.3         | 69.37        | 1.451                 | 1449                | 1.577    | 0.126  | 54             | 2048          | 64              | 101 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 54.98        | 68.702       | 1.471                 | 1469                | 1.596    | 0.124  | 55             | 2048          | 64              | 137 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 55.47        | 69.043       | 1.596                 | 1594                | 1.717    | 0.12   | 70             | 2048          | 64              | 169 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.39        | 32.94        | 0.529                 | 527                 | 0.684    | 0.154  | 35             | 2048          | 64              | 18  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.86        | 31.42        | 0.506                 | 504                 | 0.621    | 0.115  | 35             | 2048          | 64              | 66  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.94        | 38.337       | 0.554                 | 552                 | 0.711    | 0.156  | 35             | 2048          | 64              | 102 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.93        | 31.994       | 0.522                 | 520                 | 0.641    | 0.118  | 35             | 2048          | 64              | 138 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 17.95        | 34.688       | 0.527                 | 525                 | 0.646    | 0.118  | 36             | 2048          | 64              | 170 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.41        | 38.593       | 0.704                 | 702                 | 0.853    | 0.149  | 36             | 2048          | 64              | 19  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.86        | 37.171       | 0.648                 | 646                 | 0.763    | 0.115  | 36             | 2048          | 64              | 67  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.88        | 36.941       | 0.63                  | 628                 | 0.747    | 0.117  | 36             | 2048          | 64              | 103 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.86        | 36.912       | 0.569                 | 567                 | 0.685    | 0.115  | 36             | 2048          | 64              | 139 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 17.88        | 37.299       | 0.662                 | 660                 | 0.779    | 0.117  | 36             | 2048          | 64              | 171 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.48        | 38.79        | 1.361                 | 1359                | 1.476    | 0.114  | 35             | 2048          | 64              | 20  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 17.98        | 37.263       | 1.524                 | 1522                | 1.65     | 0.125  | 35             | 2048          | 64              | 68  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.07        | 36.971       | 1.321                 | 1319                | 1.441    | 0.119  | 35             | 2048          | 64              | 104 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.04        | 37.122       | 1.345                 | 1343                | 1.467    | 0.121  | 35             | 2048          | 64              | 140 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 18.02        | 39.42        | 1.382                 | 1380                | 1.531    | 0.149  | 35             | 2048          | 64              | 172 |

### Provider Phase Timing

| Phase            | Plan ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 238     | 36                  | 1277        | 0         | 0             | 0                    | 38          |
| cold-create      | 212     | 37                  | 1240        | 0         | 0             | 0                    | 31          |
| cold-create      | 197     | 33                  | 1183        | 0         | 0             | 0                    | 33          |
| cold-create      | 201     | 35                  | 1182        | 0         | 0             | 0                    | 49          |
| cold-create      | 239     | 29                  | 1282        | 0         | 0             | 0                    | 43          |
| unchanged-update | 231     | 253                 | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 218     | 202                 | 0           | 0         | 0             | 0                    | 81          |
| unchanged-update | 221     | 291                 | 1           | 0         | 0             | 0                    | 37          |
| unchanged-update | 227     | 247                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 229     | 254                 | 0           | 0         | 0             | 0                    | 40          |
| changed-update   | 261     | 285                 | 114         | 0         | 0             | 0                    | 39          |
| changed-update   | 213     | 226                 | 161         | 0         | 0             | 0                    | 44          |
| changed-update   | 211     | 258                 | 115         | 0         | 0             | 0                    | 42          |
| changed-update   | 214     | 201                 | 107         | 0         | 0             | 0                    | 44          |
| changed-update   | 240     | 273                 | 102         | 0         | 0             | 0                    | 43          |
| pruned-update    | 217     | 226                 | 110         | 739       | 0             | 0                    | 46          |
| pruned-update    | 216     | 272                 | 187         | 781       | 0             | 0                    | 45          |
| pruned-update    | 227     | 199                 | 104         | 728       | 0             | 0                    | 45          |
| pruned-update    | 198     | 235                 | 106         | 751       | 0             | 0                    | 34          |
| pruned-update    | 258     | 208                 | 105         | 745       | 0             | 0                    | 46          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 1            | 0               | 64          | 64             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 43          | 43             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 11          | 11             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 14          | 14             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
