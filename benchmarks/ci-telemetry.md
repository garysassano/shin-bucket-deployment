# Shin Provider Benchmark Telemetry

Generated from Shin rows in `results.jsonl`. Raw benchmark evidence stays outside the repo.

## Summary

| Field               | Value                       |
| ------------------- | --------------------------- |
| Shin telemetry rows | 120                         |
| Config groups       | 6                           |
| Snapshot dates      | 2026-08-08                  |
| Regions             | eu-central-1                |
| Profiles            | mixed, tiny-many, large-few |

## large-few / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.41        | 73.789       | 2.554                 | 2552                | 2.709    | 0.154  | 112            | 1024          | 32              | 25  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.76        | 92.757       | 2.012                 | 2010                | 2.129    | 0.116  | 127            | 1024          | 32              | 77  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.75        | 73.509       | 1.992                 | 1990                | 2.109    | 0.116  | 110            | 1024          | 32              | 113 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.66        | 73.571       | 2.198                 | 2196                | 2.356    | 0.158  | 114            | 1024          | 32              | 145 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.72        | 73.468       | 2.197                 | 2195                | 2.361    | 0.164  | 113            | 1024          | 32              | 181 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19           | 35.083       | 0.272                 | 270                 | 0.398    | 0.125  | 33             | 1024          | 32              | 26  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.39        | 36.068       | 0.253                 | 251                 | 0.368    | 0.115  | 33             | 1024          | 32              | 78  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.42        | 36.407       | 0.283                 | 280                 | 0.411    | 0.127  | 33             | 1024          | 32              | 114 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.34        | 35.871       | 0.247                 | 245                 | 0.373    | 0.125  | 33             | 1024          | 32              | 146 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.41        | 42.386       | 0.249                 | 247                 | 0.37     | 0.12   | 33             | 1024          | 32              | 182 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.05        | 40.222       | 0.658                 | 656                 | 0.816    | 0.158  | 42             | 1024          | 32              | 27  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.37        | 36.093       | 0.425                 | 423                 | 0.544    | 0.119  | 38             | 1024          | 32              | 79  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.37        | 36.143       | 0.53                  | 528                 | 0.658    | 0.128  | 40             | 1024          | 32              | 115 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.37        | 36.186       | 0.508                 | 506                 | 0.631    | 0.123  | 40             | 1024          | 32              | 147 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.38        | 41.856       | 0.517                 | 515                 | 0.643    | 0.125  | 40             | 1024          | 32              | 183 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.2         | 44.166       | 0.789                 | 786                 | 0.94     | 0.151  | 39             | 1024          | 32              | 28  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.87        | 41.136       | 0.51                  | 507                 | 0.632    | 0.122  | 40             | 1024          | 32              | 80  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.92        | 59.902       | 0.608                 | 606                 | 0.768    | 0.16   | 39             | 1024          | 32              | 116 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.86        | 38.596       | 0.618                 | 615                 | 0.776    | 0.157  | 39             | 1024          | 32              | 148 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.88        | 36.692       | 0.58                  | 578                 | 0.701    | 0.12   | 38             | 1024          | 32              | 184 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 325     | 72              | 124               | 0               | 0                  | 32                  | 2150        | 0         | 0             | 0                    | 44          |
| cold-create      | 178     | 25              | 36                | 0               | 0                  | 31                  | 1757        | 0         | 0             | 0                    | 42          |
| cold-create      | 171     | 34              | 29                | 0               | 0                  | 27                  | 1745        | 0         | 0             | 0                    | 47          |
| cold-create      | 195     | 23              | 33                | 0               | 0                  | 30                  | 1932        | 0         | 0             | 0                    | 37          |
| cold-create      | 209     | 43              | 32                | 0               | 0                  | 26                  | 1919        | 0         | 0             | 0                    | 39          |
| unchanged-update | 194     | 47              | 31                | 0               | 0                  | 37                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 174     | 26              | 30                | 0               | 0                  | 36                  | 0           | 0         | 0             | 0                    | 39          |
| unchanged-update | 199     | 28              | 38                | 0               | 0                  | 37                  | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 168     | 21              | 33                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 173     | 27              | 32                | 0               | 0                  | 31                  | 0           | 0         | 0             | 0                    | 42          |
| changed-update   | 304     | 80              | 100               | 0               | 0                  | 41                  | 274         | 0         | 0             | 0                    | 35          |
| changed-update   | 164     | 25              | 30                | 0               | 0                  | 32                  | 182         | 0         | 0             | 0                    | 43          |
| changed-update   | 241     | 33              | 79                | 0               | 0                  | 34                  | 208         | 0         | 0             | 0                    | 42          |
| changed-update   | 245     | 74              | 60                | 0               | 0                  | 32                  | 189         | 0         | 0             | 0                    | 39          |
| changed-update   | 227     | 30              | 81                | 0               | 0                  | 32                  | 216         | 0         | 0             | 0                    | 38          |
| pruned-update    | 381     | 90              | 148               | 0               | 0                  | 36                  | 255         | 62        | 0             | 0                    | 34          |
| pruned-update    | 161     | 21              | 30                | 0               | 0                  | 37                  | 191         | 60        | 0             | 0                    | 40          |
| pruned-update    | 227     | 66              | 33                | 0               | 0                  | 38                  | 208         | 80        | 0             | 0                    | 41          |
| pruned-update    | 237     | 67              | 51                | 0               | 0                  | 33                  | 200         | 80        | 0             | 0                    | 49          |
| pruned-update    | 223     | 41              | 55                | 0               | 0                  | 41                  | 191         | 65        | 0             | 0                    | 43          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33488025            | 536870912           | 0                             | 33488025                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33488025            | 536870912           | 0                             | 33488025                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 33522306            | 536870912           | 0                             | 33522306                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 231         | 231            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 325         | 325            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 14           | 0               | 243         | 243            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 11           | 0               | 115         | 115            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 13           | 0               | 137         | 137            | 0              | 0             | 0                    | 0                    | 32            | 0            | 4                | 10                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 3           | 3              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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

## large-few / 2048 MiB / max concurrency 64

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes     | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | --------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.23        | 74.796       | 1.407                 | 1404                | 1.572    | 0.165  | 189            | 2048          | 64              | 29  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 57.69        | 73.887       | 1.515                 | 1513                | 1.67     | 0.155  | 199            | 2048          | 64              | 73  |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.24        | 68.686       | 1.241                 | 1238                | 1.359    | 0.118  | 162            | 2048          | 64              | 109 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.28        | 68.587       | 1.41                  | 1408                | 1.562    | 0.151  | 192            | 2048          | 64              | 141 |
| cold-create      | baseline | Create  | success         | 32    | 144167470 | 52.31        | 68.532       | 1.326                 | 1324                | 1.446    | 0.119  | 173            | 2048          | 64              | 177 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 18.99        | 40.345       | 0.226                 | 223                 | 0.352    | 0.126  | 33             | 2048          | 64              | 30  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.4         | 36.197       | 0.228                 | 226                 | 0.358    | 0.13   | 33             | 2048          | 64              | 74  |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.42        | 36.145       | 0.223                 | 221                 | 0.343    | 0.12   | 33             | 2048          | 64              | 110 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.39        | 35.865       | 0.269                 | 267                 | 0.397    | 0.128  | 33             | 2048          | 64              | 142 |
| unchanged-update | baseline | Update  | success         | 32    | 144167470 | 19.4         | 35.952       | 0.227                 | 225                 | 0.349    | 0.121  | 35             | 2048          | 64              | 178 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.08        | 37.699       | 0.456                 | 454                 | 0.608    | 0.151  | 40             | 2048          | 64              | 31  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.41        | 40.612       | 0.511                 | 509                 | 0.643    | 0.131  | 39             | 2048          | 64              | 75  |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.41        | 41.239       | 0.537                 | 535                 | 0.657    | 0.12   | 41             | 2048          | 64              | 111 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.38        | 36.125       | 0.515                 | 512                 | 0.644    | 0.129  | 40             | 2048          | 64              | 143 |
| changed-update   | changed  | Update  | success         | 32    | 144167470 | 19.47        | 37.482       | 0.536                 | 534                 | 0.692    | 0.155  | 40             | 2048          | 64              | 179 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.16        | 35.141       | 0.522                 | 520                 | 0.677    | 0.154  | 39             | 2048          | 64              | 32  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.75        | 41.815       | 0.595                 | 593                 | 0.715    | 0.12   | 39             | 2048          | 64              | 76  |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.87        | 36.56        | 0.616                 | 613                 | 0.734    | 0.118  | 41             | 2048          | 64              | 112 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.92        | 41.996       | 0.66                  | 657                 | 0.815    | 0.154  | 42             | 2048          | 64              | 144 |
| pruned-update    | pruned   | Update  | success         | 28    | 125354239 | 19.78        | 36.462       | 0.643                 | 640                 | 0.793    | 0.15   | 39             | 2048          | 64              | 180 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 171     | 27              | 50                | 0               | 0                  | 27                  | 1161        | 0         | 0             | 0                    | 44          |
| cold-create      | 261     | 79              | 84                | 0               | 0                  | 35                  | 1170        | 0         | 0             | 0                    | 44          |
| cold-create      | 219     | 66              | 65                | 0               | 0                  | 30                  | 947         | 0         | 0             | 0                    | 41          |
| cold-create      | 257     | 82              | 73                | 0               | 0                  | 34                  | 1069        | 0         | 0             | 0                    | 46          |
| cold-create      | 242     | 79              | 78                | 0               | 0                  | 29                  | 1013        | 0         | 0             | 0                    | 38          |
| unchanged-update | 145     | 27              | 32                | 0               | 0                  | 37                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 150     | 29              | 32                | 0               | 0                  | 34                  | 0           | 0         | 0             | 0                    | 41          |
| unchanged-update | 136     | 24              | 30                | 0               | 0                  | 38                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 190     | 57              | 46                | 0               | 0                  | 38                  | 0           | 0         | 0             | 0                    | 38          |
| unchanged-update | 137     | 22              | 32                | 0               | 0                  | 44                  | 0           | 0         | 0             | 0                    | 43          |
| changed-update   | 187     | 23              | 64                | 0               | 0                  | 39                  | 189         | 0         | 0             | 0                    | 37          |
| changed-update   | 233     | 67              | 77                | 0               | 0                  | 34                  | 194         | 0         | 0             | 0                    | 46          |
| changed-update   | 238     | 78              | 68                | 0               | 0                  | 56                  | 193         | 0         | 0             | 0                    | 47          |
| changed-update   | 246     | 67              | 95                | 0               | 0                  | 36                  | 186         | 0         | 0             | 0                    | 43          |
| changed-update   | 254     | 78              | 81                | 0               | 0                  | 38                  | 201         | 0         | 0             | 0                    | 39          |
| pruned-update    | 155     | 28              | 38                | 0               | 0                  | 36                  | 188         | 70        | 0             | 0                    | 54          |
| pruned-update    | 242     | 73              | 81                | 0               | 0                  | 35                  | 187         | 69        | 0             | 0                    | 42          |
| pruned-update    | 255     | 76              | 91                | 0               | 0                  | 39                  | 193         | 65        | 0             | 0                    | 43          |
| pruned-update    | 280     | 76              | 103               | 0               | 0                  | 32                  | 214         | 69        | 0             | 0                    | 45          |
| pruned-update    | 270     | 88              | 82                | 0               | 0                  | 35                  | 207         | 63        | 0             | 0                    | 50          |

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
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 89585290            | 1073741824          | 0                             | 89585290                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 89585290            | 1073741824          | 0                             | 89585290                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 89585290            | 1073741824          | 0                             | 89585290                   |
| cold-create      | 97043731         | 144167470      | 0            | 97041112             | 97042388             | 89585290            | 1073741824          | 0                             | 89585290                   |
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
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 171         | 171            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 10                  |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 195         | 195            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 8                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 213         | 213            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 162         | 162            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 9                   |
| cold-create      | 17             | 18             | 19           | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 70         | 7            | 0               | 154         | 154            | 0              | 0             | 0                    | 0                    | 32            | 0            | 8                | 11                  |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 2                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 5           | 5              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| changed-update   | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 2            | 0               | 4           | 4              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
| pruned-update    | 3              | 4              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 8          | 1            | 0               | 6           | 6              | 0              | 0             | 0                    | 0                    | 3             | 0            | 3                | 1                   |
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

## mixed / 1024 MiB / max concurrency 32

### Runtime

| Phase            | State    | Request | Deployment work | Files | Bytes    | CDK deploy s | Local wall s | CloudWatch provider s | Summary duration ms | Billed s | Init s | Max memory MiB | Available MiB | Max concurrency | Row |
| ---------------- | -------- | ------- | --------------- | ----- | -------- | ------------ | ------------ | --------------------- | ------------------- | -------- | ------ | -------------- | ------------- | --------------- | --- |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.54        | 74.079       | 1.306                 | 1304                | 1.426    | 0.119  | 102            | 1024          | 32              | 1   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.25        | 69.051       | 1.529                 | 1527                | 1.682    | 0.152  | 109            | 1024          | 32              | 53  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.73        | 73.401       | 1.376                 | 1374                | 1.525    | 0.149  | 107            | 1024          | 32              | 89  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 52.28        | 67.916       | 1.294                 | 1292                | 1.421    | 0.126  | 101            | 1024          | 32              | 125 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.72        | 73.916       | 1.265                 | 1263                | 1.379    | 0.114  | 99             | 1024          | 32              | 157 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 18.91        | 35.19        | 0.284                 | 282                 | 0.402    | 0.118  | 33             | 1024          | 32              | 2   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.43        | 37.088       | 0.289                 | 287                 | 0.412    | 0.123  | 33             | 1024          | 32              | 54  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 30.5         | 46.958       | 0.298                 | 296                 | 0.418    | 0.119  | 34             | 1024          | 32              | 90  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.5         | 38.113       | 0.289                 | 287                 | 0.405    | 0.115  | 34             | 1024          | 32              | 126 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.39        | 36.982       | 0.268                 | 266                 | 0.388    | 0.119  | 35             | 1024          | 32              | 158 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.09        | 40.487       | 0.542                 | 540                 | 0.66     | 0.118  | 37             | 1024          | 32              | 3   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.47        | 37.539       | 0.433                 | 430                 | 0.553    | 0.12   | 38             | 1024          | 32              | 55  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.38        | 41.486       | 0.474                 | 472                 | 0.591    | 0.116  | 37             | 1024          | 32              | 91  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.35        | 41.806       | 0.481                 | 479                 | 0.6      | 0.118  | 37             | 1024          | 32              | 127 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.42        | 35.941       | 0.528                 | 526                 | 0.685    | 0.156  | 37             | 1024          | 32              | 159 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.07        | 34.815       | 1.259                 | 1257                | 1.38     | 0.121  | 37             | 1024          | 32              | 4   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 31.12        | 47.682       | 1.206                 | 1203                | 1.328    | 0.121  | 41             | 1024          | 32              | 56  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.74        | 36.361       | 1.16                  | 1158                | 1.287    | 0.126  | 39             | 1024          | 32              | 92  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.84        | 47.817       | 1.121                 | 1119                | 1.233    | 0.112  | 37             | 1024          | 32              | 128 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.73        | 46.107       | 1.241                 | 1239                | 1.406    | 0.165  | 37             | 1024          | 32              | 160 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 261     | 75              | 71                | 0               | 0                  | 29                  | 980         | 0         | 0             | 0                    | 33          |
| cold-create      | 308     | 82              | 84                | 0               | 0                  | 32                  | 1147        | 0         | 0             | 0                    | 39          |
| cold-create      | 194     | 30              | 33                | 0               | 0                  | 31                  | 1102        | 0         | 0             | 0                    | 44          |
| cold-create      | 181     | 32              | 33                | 0               | 0                  | 30                  | 1037        | 0         | 0             | 0                    | 43          |
| cold-create      | 194     | 43              | 29                | 0               | 0                  | 30                  | 996         | 0         | 0             | 0                    | 42          |
| unchanged-update | 174     | 24              | 34                | 0               | 0                  | 61                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 177     | 26              | 35                | 0               | 0                  | 63                  | 0           | 0         | 0             | 0                    | 46          |
| unchanged-update | 193     | 27              | 37                | 0               | 0                  | 58                  | 0           | 0         | 0             | 0                    | 45          |
| unchanged-update | 185     | 33              | 34                | 0               | 0                  | 66                  | 0           | 0         | 0             | 0                    | 35          |
| unchanged-update | 166     | 24              | 31                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 42          |
| changed-update   | 278     | 80              | 79                | 0               | 0                  | 53                  | 174         | 0         | 0             | 0                    | 34          |
| changed-update   | 188     | 30              | 46                | 0               | 0                  | 70                  | 129         | 0         | 0             | 0                    | 41          |
| changed-update   | 204     | 26              | 54                | 0               | 0                  | 70                  | 152         | 0         | 0             | 0                    | 44          |
| changed-update   | 207     | 49              | 52                | 0               | 0                  | 62                  | 165         | 0         | 0             | 0                    | 44          |
| changed-update   | 207     | 23              | 54                | 0               | 0                  | 100                 | 175         | 0         | 0             | 0                    | 43          |
| pruned-update    | 259     | 72              | 71                | 0               | 0                  | 54                  | 160         | 730       | 0             | 0                    | 42          |
| pruned-update    | 207     | 26              | 53                | 0               | 0                  | 70                  | 147         | 717       | 0             | 0                    | 48          |
| pruned-update    | 212     | 24              | 60                | 0               | 0                  | 70                  | 154         | 663       | 0             | 0                    | 40          |
| pruned-update    | 236     | 51              | 80                | 0               | 0                  | 66                  | 113         | 647       | 0             | 0                    | 39          |
| pruned-update    | 258     | 22              | 101               | 0               | 0                  | 74                  | 144         | 706       | 0             | 0                    | 39          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 62          | 62             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 2                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 31          | 31             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| unchanged-update | 1              | 1              | 2            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 2          | 1            | 0               | 0           | 0              | 0              | 0             | 0                    | 0                    | 0             | 0            | 1                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| changed-update   | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 4                | 2                   |
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
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.38        | 72.344       | 0.866                 | 864                 | 0.987    | 0.121  | 117            | 2048          | 64              | 5   |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.77        | 73.548       | 0.796                 | 793                 | 0.911    | 0.114  | 114            | 2048          | 64              | 49  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.74        | 73.616       | 1.028                 | 1026                | 1.18     | 0.152  | 114            | 2048          | 64              | 85  |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.8         | 73.704       | 0.961                 | 959                 | 1.08     | 0.118  | 110            | 2048          | 64              | 117 |
| cold-create      | baseline | Create  | success         | 442   | 52904649 | 57.76        | 74.188       | 0.897                 | 895                 | 1.014    | 0.117  | 110            | 2048          | 64              | 153 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.04        | 34.81        | 0.284                 | 282                 | 0.434    | 0.149  | 35             | 2048          | 64              | 6   |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.41        | 36.729       | 0.292                 | 289                 | 0.412    | 0.12   | 35             | 2048          | 64              | 50  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.4         | 44.139       | 0.274                 | 271                 | 0.425    | 0.151  | 33             | 2048          | 64              | 86  |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.39        | 36.071       | 0.286                 | 284                 | 0.403    | 0.117  | 33             | 2048          | 64              | 118 |
| unchanged-update | baseline | Update  | success         | 442   | 52904649 | 19.33        | 48.766       | 0.263                 | 261                 | 0.385    | 0.122  | 33             | 2048          | 64              | 154 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 18.96        | 40.189       | 0.414                 | 412                 | 0.578    | 0.164  | 39             | 2048          | 64              | 7   |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.45        | 36.177       | 0.492                 | 490                 | 0.611    | 0.118  | 37             | 2048          | 64              | 51  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.46        | 41.568       | 0.524                 | 521                 | 0.681    | 0.157  | 36             | 2048          | 64              | 87  |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.4         | 36.121       | 0.543                 | 541                 | 0.697    | 0.153  | 39             | 2048          | 64              | 119 |
| changed-update   | changed  | Update  | success         | 442   | 52904649 | 19.42        | 36.099       | 0.523                 | 520                 | 0.675    | 0.151  | 37             | 2048          | 64              | 155 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.13        | 40.332       | 1.1                   | 1098                | 1.218    | 0.118  | 36             | 2048          | 64              | 8   |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.67        | 41.796       | 1.211                 | 1208                | 1.361    | 0.15   | 41             | 2048          | 64              | 52  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.74        | 36.426       | 1.158                 | 1156                | 1.278    | 0.119  | 39             | 2048          | 64              | 88  |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.67        | 39.179       | 1.257                 | 1254                | 1.379    | 0.122  | 37             | 2048          | 64              | 120 |
| pruned-update    | pruned   | Update  | success         | 397   | 48185955 | 19.9         | 43.789       | 1.268                 | 1265                | 1.387    | 0.118  | 37             | 2048          | 64              | 156 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 198     | 36              | 33                | 0               | 0                  | 28                  | 589         | 0         | 0             | 0                    | 47          |
| cold-create      | 139     | 26              | 35                | 0               | 0                  | 32                  | 585         | 0         | 0             | 0                    | 35          |
| cold-create      | 223     | 66              | 59                | 0               | 0                  | 33                  | 731         | 0         | 0             | 0                    | 37          |
| cold-create      | 202     | 60              | 61                | 0               | 0                  | 30                  | 685         | 0         | 0             | 0                    | 40          |
| cold-create      | 189     | 76              | 33                | 0               | 0                  | 29                  | 626         | 0         | 0             | 0                    | 49          |
| unchanged-update | 162     | 25              | 40                | 0               | 0                  | 72                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 156     | 30              | 33                | 0               | 0                  | 83                  | 0           | 0         | 0             | 0                    | 48          |
| unchanged-update | 173     | 25              | 35                | 0               | 0                  | 57                  | 0           | 0         | 0             | 0                    | 40          |
| unchanged-update | 159     | 53              | 31                | 0               | 0                  | 76                  | 0           | 0         | 0             | 0                    | 47          |
| unchanged-update | 155     | 38              | 28                | 0               | 0                  | 64                  | 0           | 0         | 0             | 0                    | 41          |
| changed-update   | 170     | 24              | 43                | 0               | 0                  | 67                  | 131         | 0         | 0             | 0                    | 42          |
| changed-update   | 216     | 64              | 70                | 0               | 0                  | 56                  | 174         | 0         | 0             | 0                    | 41          |
| changed-update   | 239     | 68              | 74                | 0               | 0                  | 64                  | 175         | 0         | 0             | 0                    | 41          |
| changed-update   | 239     | 71              | 73                | 0               | 0                  | 67                  | 193         | 0         | 0             | 0                    | 41          |
| changed-update   | 238     | 65              | 73                | 0               | 0                  | 64                  | 172         | 0         | 0             | 0                    | 45          |
| pruned-update    | 137     | 24              | 31                | 0               | 0                  | 72                  | 135         | 687       | 0             | 0                    | 47          |
| pruned-update    | 264     | 65              | 93                | 0               | 0                  | 66                  | 195         | 621       | 0             | 0                    | 46          |
| pruned-update    | 219     | 61              | 81                | 0               | 0                  | 66                  | 156         | 667       | 0             | 0                    | 37          |
| pruned-update    | 261     | 76              | 99                | 0               | 0                  | 64                  | 191         | 677       | 0             | 0                    | 43          |
| pruned-update    | 275     | 83              | 105               | 0               | 0                  | 70                  | 171         | 691       | 0             | 0                    | 44          |

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
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 6                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 5                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 4                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
| cold-create      | 4              | 5              | 6            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 886        | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 442           | 0            | 4                | 3                   |
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
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 15          | 15             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 1                   |
| pruned-update    | 5              | 6              | 7            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 14         | 2            | 0               | 16          | 16             | 0              | 0             | 0                    | 0                    | 6             | 0            | 5                | 2                   |

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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.56        | 73.274       | 2.675                 | 2673                | 2.804    | 0.128  | 53             | 1024          | 32              | 13  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.68        | 74.425       | 2.648                 | 2645                | 2.798    | 0.15   | 56             | 1024          | 32              | 65  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.67        | 73.868       | 2.693                 | 2691                | 2.81     | 0.116  | 58             | 1024          | 32              | 101 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.74        | 74.466       | 2.763                 | 2761                | 2.883    | 0.12   | 56             | 1024          | 32              | 137 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.77        | 74.501       | 2.653                 | 2650                | 2.771    | 0.118  | 55             | 1024          | 32              | 169 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 18.96        | 34.842       | 0.504                 | 502                 | 0.623    | 0.118  | 35             | 1024          | 32              | 14  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.36        | 36.043       | 0.567                 | 565                 | 0.712    | 0.145  | 38             | 1024          | 32              | 66  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.39        | 36.148       | 0.581                 | 578                 | 0.738    | 0.156  | 35             | 1024          | 32              | 102 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.4         | 36.304       | 0.556                 | 554                 | 0.68     | 0.124  | 35             | 1024          | 32              | 138 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.41        | 41.691       | 0.536                 | 534                 | 0.653    | 0.117  | 35             | 1024          | 32              | 170 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.03        | 40.896       | 0.683                 | 680                 | 0.812    | 0.128  | 36             | 1024          | 32              | 15  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.39        | 36.74        | 0.63                  | 628                 | 0.748    | 0.117  | 36             | 1024          | 32              | 67  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.45        | 42.744       | 0.645                 | 643                 | 0.763    | 0.118  | 36             | 1024          | 32              | 103 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.41        | 36.763       | 0.65                  | 648                 | 0.771    | 0.12   | 36             | 1024          | 32              | 139 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.35        | 36.815       | 0.612                 | 608                 | 0.735    | 0.123  | 36             | 1024          | 32              | 171 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.09        | 35.325       | 1.552                 | 1550                | 1.685    | 0.132  | 36             | 1024          | 32              | 16  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.85        | 37.068       | 1.473                 | 1471                | 1.596    | 0.122  | 36             | 1024          | 32              | 68  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.82        | 42.348       | 1.334                 | 1332                | 1.454    | 0.12   | 36             | 1024          | 32              | 104 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.89        | 37.11        | 1.489                 | 1487                | 1.655    | 0.165  | 36             | 1024          | 32              | 140 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.7         | 36.974       | 1.355                 | 1352                | 1.474    | 0.119  | 36             | 1024          | 32              | 172 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 278     | 32              | 124               | 2               | 2                  | 32                  | 2315        | 0         | 0             | 0                    | 46          |
| cold-create      | 247     | 27              | 85                | 2               | 3                  | 35                  | 2297        | 0         | 0             | 0                    | 65          |
| cold-create      | 229     | 21              | 84                | 2               | 2                  | 32                  | 2381        | 0         | 0             | 0                    | 47          |
| cold-create      | 248     | 33              | 87                | 2               | 2                  | 33                  | 2436        | 0         | 0             | 0                    | 43          |
| cold-create      | 247     | 28              | 92                | 2               | 2                  | 31                  | 2331        | 0         | 0             | 0                    | 40          |
| unchanged-update | 226     | 27              | 81                | 2               | 2                  | 225                 | 0           | 0         | 0             | 0                    | 48          |
| unchanged-update | 262     | 30              | 87                | 3               | 3                  | 250                 | 0           | 0         | 0             | 0                    | 50          |
| unchanged-update | 258     | 28              | 87                | 3               | 3                  | 270                 | 1           | 0         | 0             | 0                    | 47          |
| unchanged-update | 247     | 29              | 88                | 2               | 2                  | 253                 | 1           | 0         | 0             | 0                    | 50          |
| unchanged-update | 247     | 27              | 96                | 2               | 2                  | 241                 | 0           | 0         | 0             | 0                    | 44          |
| changed-update   | 297     | 25              | 146               | 2               | 2                  | 242                 | 96          | 0         | 0             | 0                    | 43          |
| changed-update   | 242     | 27              | 95                | 2               | 2                  | 218                 | 94          | 0         | 0             | 0                    | 72          |
| changed-update   | 237     | 33              | 87                | 2               | 2                  | 245                 | 113         | 0         | 0             | 0                    | 45          |
| changed-update   | 240     | 27              | 90                | 2               | 2                  | 258                 | 107         | 0         | 0             | 0                    | 41          |
| changed-update   | 257     | 34              | 89                | 2               | 2                  | 228                 | 82          | 0         | 0             | 0                    | 38          |
| pruned-update    | 355     | 27              | 167               | 2               | 2                  | 256                 | 129         | 754       | 0             | 0                    | 37          |
| pruned-update    | 251     | 29              | 91                | 2               | 2                  | 249                 | 114         | 799       | 0             | 0                    | 41          |
| pruned-update    | 236     | 33              | 86                | 2               | 2                  | 199                 | 101         | 739       | 0             | 0                    | 42          |
| pruned-update    | 282     | 33              | 108               | 2               | 3                  | 269                 | 97          | 777       | 0             | 0                    | 42          |
| pruned-update    | 239     | 31              | 90                | 2               | 2                  | 193                 | 104         | 766       | 0             | 0                    | 38          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 17          | 17             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 28          | 28             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.32        | 73.208       | 1.607                 | 1604                | 1.761    | 0.154  | 71             | 2048          | 64              | 17  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 52.22        | 68.879       | 1.706                 | 1704                | 1.858    | 0.151  | 70             | 2048          | 64              | 61  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.75        | 75.098       | 1.635                 | 1633                | 1.756    | 0.12   | 70             | 2048          | 64              | 97  |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 57.77        | 88.511       | 1.675                 | 1673                | 1.795    | 0.12   | 64             | 2048          | 64              | 129 |
| cold-create      | baseline | Create  | success         | 2584  | 8178618 | 52.24        | 71.362       | 1.586                 | 1583                | 1.71     | 0.124  | 72             | 2048          | 64              | 165 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.01        | 34.907       | 0.453                 | 451                 | 0.57     | 0.116  | 35             | 2048          | 64              | 18  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.39        | 36.173       | 0.46                  | 457                 | 0.586    | 0.126  | 36             | 2048          | 64              | 62  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.36        | 36.694       | 0.509                 | 507                 | 0.626    | 0.117  | 35             | 2048          | 64              | 98  |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.41        | 36.203       | 0.492                 | 490                 | 0.61     | 0.118  | 35             | 2048          | 64              | 130 |
| unchanged-update | baseline | Update  | success         | 2584  | 8178618 | 19.36        | 36.336       | 0.487                 | 484                 | 0.603    | 0.116  | 35             | 2048          | 64              | 166 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 18.97        | 40.742       | 0.611                 | 609                 | 0.74     | 0.128  | 36             | 2048          | 64              | 19  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.4         | 36.608       | 0.701                 | 698                 | 0.853    | 0.152  | 38             | 2048          | 64              | 63  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.39        | 39.601       | 0.681                 | 678                 | 0.805    | 0.124  | 36             | 2048          | 64              | 99  |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.41        | 42.085       | 0.68                  | 677                 | 0.799    | 0.119  | 36             | 2048          | 64              | 131 |
| changed-update   | changed  | Update  | success         | 2584  | 8178618 | 19.38        | 42.147       | 0.677                 | 675                 | 0.795    | 0.118  | 36             | 2048          | 64              | 167 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.03        | 41.712       | 1.383                 | 1381                | 1.502    | 0.119  | 36             | 2048          | 64              | 20  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.78        | 42.268       | 1.483                 | 1480                | 1.603    | 0.119  | 36             | 2048          | 64              | 64  |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.7         | 37.249       | 1.497                 | 1495                | 1.649    | 0.151  | 36             | 2048          | 64              | 100 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.73        | 38.032       | 1.454                 | 1452                | 1.604    | 0.149  | 36             | 2048          | 64              | 132 |
| pruned-update    | pruned   | Update  | success         | 2325  | 7332858 | 19.86        | 37.257       | 1.459                 | 1457                | 1.575    | 0.115  | 36             | 2048          | 64              | 168 |

### Provider Phase Timing

| Phase            | Plan ms | Plan catalog ms | Plan directory ms | Plan entries ms | Plan validation ms | Destination list ms | Transfer ms | Delete ms | CloudFront ms | Old prefix delete ms | Callback ms |
| ---------------- | ------- | --------------- | ----------------- | --------------- | ------------------ | ------------------- | ----------- | --------- | ------------- | -------------------- | ----------- |
| cold-create      | 238     | 29              | 102               | 3               | 3                  | 32                  | 1293        | 0         | 0             | 0                    | 39          |
| cold-create      | 317     | 27              | 187               | 3               | 3                  | 32                  | 1306        | 0         | 0             | 0                    | 48          |
| cold-create      | 278     | 31              | 152               | 2               | 2                  | 34                  | 1280        | 0         | 0             | 0                    | 40          |
| cold-create      | 283     | 25              | 162               | 2               | 2                  | 30                  | 1311        | 0         | 0             | 0                    | 46          |
| cold-create      | 231     | 28              | 108               | 2               | 2                  | 30                  | 1275        | 0         | 0             | 0                    | 46          |
| unchanged-update | 203     | 26              | 88                | 2               | 2                  | 209                 | 0           | 0         | 0             | 0                    | 37          |
| unchanged-update | 209     | 27              | 84                | 3               | 2                  | 203                 | 0           | 0         | 0             | 0                    | 43          |
| unchanged-update | 207     | 23              | 96                | 2               | 2                  | 253                 | 0           | 0         | 0             | 0                    | 44          |
| unchanged-update | 206     | 27              | 87                | 2               | 2                  | 246                 | 0           | 0         | 0             | 0                    | 35          |
| unchanged-update | 203     | 29              | 86                | 3               | 2                  | 234                 | 0           | 0         | 0             | 0                    | 45          |
| changed-update   | 209     | 30              | 95                | 2               | 2                  | 203                 | 151         | 0         | 0             | 0                    | 44          |
| changed-update   | 296     | 42              | 147               | 3               | 3                  | 253                 | 102         | 0         | 0             | 0                    | 46          |
| changed-update   | 289     | 31              | 169               | 2               | 2                  | 244                 | 99          | 0         | 0             | 0                    | 45          |
| changed-update   | 276     | 25              | 154               | 2               | 2                  | 246                 | 106         | 0         | 0             | 0                    | 47          |
| changed-update   | 277     | 28              | 153               | 2               | 2                  | 251                 | 106         | 0         | 0             | 0                    | 38          |
| pruned-update    | 211     | 29              | 90                | 2               | 2                  | 205                 | 109         | 796       | 0             | 0                    | 41          |
| pruned-update    | 294     | 35              | 161               | 1               | 2                  | 234                 | 101         | 795       | 0             | 0                    | 38          |
| pruned-update    | 258     | 26              | 136               | 2               | 3                  | 261                 | 101         | 815       | 0             | 0                    | 41          |
| pruned-update    | 272     | 32              | 134               | 2               | 3                  | 244                 | 108         | 770       | 0             | 0                    | 44          |
| pruned-update    | 265     | 27              | 144               | 2               | 2                  | 246                 | 99          | 791       | 0             | 0                    | 38          |

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
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 63          | 63             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
| cold-create      | 1              | 2              | 5            | 0           | 0             | 0                    | 0                    | 0                  | 0               | 0                | 0          | 5170       | 2            | 0               | 48          | 48             | 0              | 0             | 0                    | 0                    | 2584          | 0            | 1                | 2                   |
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
