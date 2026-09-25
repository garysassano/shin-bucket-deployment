# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-25
- Run ID: 082cd0d2-8b83-42a0-9a98-62e4a6d7f1e9
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: aws, shin
- Asset profiles: large-few, mixed, tiny-many
- Memory MiB: 1024, 2048
- Max concurrency: 32, 64
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes |                    Provider duration |                      Local wall time |                    CDK deploy time |                         Max memory |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -----------------------------------: | -----------------------------------: | ---------------------------------: | ---------------------------------: |
| large-few     | cold-create      |       1024 |              32 |            adaptive |   1.904 s vs 8.427 s (4.426x faster) |  70.299 s vs 75.935 s (1.08x faster) | 55.75 s vs 61.18 s (1.097x faster) | 109 MiB vs 451 MiB (75.831% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.253 s vs 8.193 s (32.383x faster) |  37.89 s vs 43.656 s (1.152x faster) | 18.26 s vs 28.91 s (1.583x faster) |  35 MiB vs 451 MiB (92.239% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.461 s vs 8.387 s (18.193x faster) | 39.176 s vs 49.686 s (1.268x faster) | 18.36 s vs 28.93 s (1.576x faster) |  42 MiB vs 451 MiB (90.687% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.543 s vs 7.985 s (14.705x faster) |     40 s vs 45.409 s (1.135x faster) | 18.44 s vs 29.11 s (1.579x faster) |  42 MiB vs 421 MiB (90.024% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.207 s vs 4.639 s (3.843x faster) | 70.221 s vs 70.281 s (1.001x faster) |  55.6 s vs 55.89 s (1.005x faster) | 167 MiB vs 451 MiB (62.971% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.224 s vs 4.691 s (20.942x faster) |  33.174 s vs 39.484 s (1.19x faster) | 18.27 s vs 23.58 s (1.291x faster) |  35 MiB vs 451 MiB (92.239% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.429 s vs 4.62 s (10.769x faster) | 38.009 s vs 42.661 s (1.122x faster) | 18.39 s vs 23.67 s (1.287x faster) |  41 MiB vs 451 MiB (90.909% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.499 s vs 4.434 s (8.886x faster) | 37.908 s vs 43.856 s (1.157x faster) | 18.47 s vs 23.73 s (1.285x faster) |  42 MiB vs 421 MiB (90.024% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.224 s vs 8.952 s (7.314x faster) |  70.44 s vs 76.995 s (1.093x faster) |  55.65 s vs 61.1 s (1.098x faster) |  89 MiB vs 288 MiB (69.097% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |  0.289 s vs 9.264 s (32.055x faster) |  33.18 s vs 43.522 s (1.312x faster) | 18.29 s vs 28.98 s (1.584x faster) |  35 MiB vs 287 MiB (87.805% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |  0.429 s vs 9.389 s (21.886x faster) | 37.962 s vs 44.901 s (1.183x faster) |  18.31 s vs 28.93 s (1.58x faster) |  39 MiB vs 288 MiB (86.458% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |    1.098 s vs 9.05 s (8.242x faster) | 37.936 s vs 48.664 s (1.283x faster) | 18.49 s vs 29.02 s (1.569x faster) |  39 MiB vs 279 MiB (86.022% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.807 s vs 5.069 s (6.281x faster) | 65.892 s vs 75.371 s (1.144x faster) | 50.57 s vs 56.58 s (1.119x faster) |  98 MiB vs 288 MiB (65.972% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.239 s vs 5.028 s (21.038x faster) | 32.655 s vs 42.049 s (1.288x faster) | 18.26 s vs 23.68 s (1.297x faster) |  37 MiB vs 288 MiB (87.153% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |   0.387 s vs 5.22 s (13.488x faster) | 38.603 s vs 42.434 s (1.099x faster) |  18.4 s vs 23.66 s (1.286x faster) |  39 MiB vs 288 MiB (86.458% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.055 s vs 5.116 s (4.849x faster) | 37.838 s vs 43.043 s (1.138x faster) | 18.47 s vs 23.67 s (1.282x faster) |  39 MiB vs 280 MiB (86.071% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.498 s vs 23.442 s (9.384x faster) | 70.843 s vs 91.895 s (1.297x faster) |  55.88 s vs 77.14 s (1.38x faster) |  55 MiB vs 226 MiB (75.664% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive |  0.51 s vs 25.455 s (49.912x faster) | 33.075 s vs 59.448 s (1.797x faster) | 18.23 s vs 45.04 s (2.471x faster) |  37 MiB vs 224 MiB (83.482% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.632 s vs 24.639 s (38.986x faster) | 38.312 s vs 73.458 s (1.917x faster) | 18.36 s vs 45.08 s (2.455x faster) |  38 MiB vs 225 MiB (83.111% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | 1.425 s vs 25.126 s (17.632x faster) | 38.444 s vs 61.938 s (1.611x faster) |  18.42 s vs 44.76 s (2.43x faster) |  38 MiB vs 221 MiB (82.805% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.471 s vs 13.355 s (9.079x faster) |  70.458 s vs 80.59 s (1.144x faster) | 55.85 s vs 66.67 s (1.194x faster) |  69 MiB vs 229 MiB (69.869% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive |  0.47 s vs 13.839 s (29.445x faster) | 32.635 s vs 48.467 s (1.485x faster) | 18.22 s vs 34.36 s (1.886x faster) |  37 MiB vs 229 MiB (83.843% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive |  0.56 s vs 13.616 s (24.314x faster) | 35.551 s vs 53.881 s (1.516x faster) |  18.3 s vs 34.28 s (1.873x faster) |   38 MiB vs 227 MiB (83.26% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.292 s vs 13.132 s (10.164x faster) | 37.904 s vs 50.739 s (1.339x faster) |  18.41 s vs 33.88 s (1.84x faster) |  38 MiB vs 225 MiB (83.111% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.904 s |              8.427 s |   +6.523 s |   4.426x |   +342.595% |
| Billed duration   |              2.024 s |              8.834 s |    +6.81 s |   4.365x |   +336.462% |
| Init duration     |               0.12 s |              0.395 s |   +0.275 s |   3.292x |   +229.167% |
| Local wall time   |             70.299 s |             75.935 s |   +5.636 s |    1.08x |     +8.017% |
| CDK deploy time   |              55.75 s |              61.18 s |    +5.43 s |   1.097x |      +9.74% |
| Max memory        |              109 MiB |              451 MiB |   +342 MiB |   4.138x |   +313.761% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.253 s |              8.193 s |    +7.94 s |  32.383x |   +3138.34% |
| Billed duration   |              0.372 s |              8.574 s |   +8.202 s |  23.048x |  +2204.839% |
| Init duration     |              0.121 s |              0.395 s |   +0.274 s |   3.264x |   +226.446% |
| Local wall time   |              37.89 s |             43.656 s |   +5.766 s |   1.152x |    +15.218% |
| CDK deploy time   |              18.26 s |              28.91 s |   +10.65 s |   1.583x |    +58.324% |
| Max memory        |               35 MiB |              451 MiB |   +416 MiB |  12.886x |  +1188.571% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.461 s |              8.387 s |   +7.926 s |  18.193x |  +1719.306% |
| Billed duration   |              0.604 s |              8.893 s |   +8.289 s |  14.724x |  +1372.351% |
| Init duration     |              0.135 s |              0.485 s |    +0.35 s |   3.593x |   +259.259% |
| Local wall time   |             39.176 s |             49.686 s |   +10.51 s |   1.268x |    +26.828% |
| CDK deploy time   |              18.36 s |              28.93 s |   +10.57 s |   1.576x |    +57.571% |
| Max memory        |               42 MiB |              451 MiB |   +409 MiB |  10.738x |    +973.81% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.543 s |              7.985 s |   +7.442 s |  14.705x |  +1370.534% |
| Billed duration   |              0.664 s |              8.372 s |   +7.708 s |  12.608x |  +1160.843% |
| Init duration     |              0.121 s |              0.393 s |   +0.272 s |   3.248x |   +224.793% |
| Local wall time   |                 40 s |             45.409 s |   +5.409 s |   1.135x |    +13.522% |
| CDK deploy time   |              18.44 s |              29.11 s |   +10.67 s |   1.579x |    +57.863% |
| Max memory        |               42 MiB |              421 MiB |   +379 MiB |  10.024x |   +902.381% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.207 s |              4.639 s |   +3.432 s |   3.843x |   +284.341% |
| Billed duration   |              1.336 s |               5.12 s |   +3.784 s |   3.832x |   +283.234% |
| Init duration     |              0.129 s |              0.434 s |   +0.305 s |   3.364x |   +236.434% |
| Local wall time   |             70.221 s |             70.281 s |    +0.06 s |   1.001x |     +0.085% |
| CDK deploy time   |               55.6 s |              55.89 s |    +0.29 s |   1.005x |     +0.522% |
| Max memory        |              167 MiB |              451 MiB |   +284 MiB |   2.701x |    +170.06% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.224 s |              4.691 s |   +4.467 s |  20.942x |  +1994.196% |
| Billed duration   |              0.349 s |              5.214 s |   +4.865 s |   14.94x |  +1393.983% |
| Init duration     |              0.125 s |              0.681 s |   +0.556 s |   5.448x |     +444.8% |
| Local wall time   |             33.174 s |             39.484 s |    +6.31 s |    1.19x |    +19.021% |
| CDK deploy time   |              18.27 s |              23.58 s |    +5.31 s |   1.291x |    +29.064% |
| Max memory        |               35 MiB |              451 MiB |   +416 MiB |  12.886x |  +1188.571% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.429 s |               4.62 s |   +4.191 s |  10.769x |   +976.923% |
| Billed duration   |              0.549 s |              5.212 s |   +4.663 s |   9.494x |   +849.362% |
| Init duration     |              0.122 s |              0.507 s |   +0.385 s |   4.156x |   +315.574% |
| Local wall time   |             38.009 s |             42.661 s |   +4.652 s |   1.122x |    +12.239% |
| CDK deploy time   |              18.39 s |              23.67 s |    +5.28 s |   1.287x |    +28.711% |
| Max memory        |               41 MiB |              451 MiB |   +410 MiB |      11x |      +1000% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.499 s |              4.434 s |   +3.935 s |   8.886x |   +788.577% |
| Billed duration   |              0.619 s |               4.85 s |   +4.231 s |   7.835x |   +683.522% |
| Init duration     |              0.121 s |              0.408 s |   +0.287 s |   3.372x |    +237.19% |
| Local wall time   |             37.908 s |             43.856 s |   +5.948 s |   1.157x |    +15.691% |
| CDK deploy time   |              18.47 s |              23.73 s |    +5.26 s |   1.285x |    +28.479% |
| Max memory        |               42 MiB |              421 MiB |   +379 MiB |  10.024x |   +902.381% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.224 s |              8.952 s |   +7.728 s |   7.314x |   +631.373% |
| Billed duration   |              1.351 s |              9.354 s |   +8.003 s |   6.924x |   +592.376% |
| Init duration     |              0.126 s |              0.408 s |   +0.282 s |   3.238x |    +223.81% |
| Local wall time   |              70.44 s |             76.995 s |   +6.555 s |   1.093x |     +9.306% |
| CDK deploy time   |              55.65 s |               61.1 s |    +5.45 s |   1.098x |     +9.793% |
| Max memory        |               89 MiB |              288 MiB |   +199 MiB |   3.236x |   +223.596% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.289 s |              9.264 s |   +8.975 s |  32.055x |  +3105.536% |
| Billed duration   |              0.408 s |              9.654 s |   +9.246 s |  23.662x |  +2266.176% |
| Init duration     |              0.119 s |              0.389 s |    +0.27 s |   3.269x |   +226.891% |
| Local wall time   |              33.18 s |             43.522 s |  +10.342 s |   1.312x |    +31.169% |
| CDK deploy time   |              18.29 s |              28.98 s |   +10.69 s |   1.584x |    +58.447% |
| Max memory        |               35 MiB |              287 MiB |   +252 MiB |     8.2x |       +720% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.429 s |              9.389 s |    +8.96 s |  21.886x |  +2088.578% |
| Billed duration   |              0.548 s |              9.787 s |   +9.239 s |  17.859x |  +1685.949% |
| Init duration     |              0.119 s |              0.398 s |   +0.279 s |   3.345x |   +234.454% |
| Local wall time   |             37.962 s |             44.901 s |   +6.939 s |   1.183x |    +18.279% |
| CDK deploy time   |              18.31 s |              28.93 s |   +10.62 s |    1.58x |    +58.001% |
| Max memory        |               39 MiB |              288 MiB |   +249 MiB |   7.385x |   +638.462% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.098 s |               9.05 s |   +7.952 s |   8.242x |   +724.226% |
| Billed duration   |              1.216 s |              9.443 s |   +8.227 s |   7.766x |   +676.563% |
| Init duration     |              0.118 s |              0.396 s |   +0.278 s |   3.356x |   +235.593% |
| Local wall time   |             37.936 s |             48.664 s |  +10.728 s |   1.283x |    +28.279% |
| CDK deploy time   |              18.49 s |              29.02 s |   +10.53 s |   1.569x |     +56.95% |
| Max memory        |               39 MiB |              279 MiB |   +240 MiB |   7.154x |   +615.385% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.807 s |              5.069 s |   +4.262 s |   6.281x |   +528.129% |
| Billed duration   |              0.927 s |              5.451 s |   +4.524 s |    5.88x |   +488.026% |
| Init duration     |               0.12 s |               0.39 s |    +0.27 s |    3.25x |       +225% |
| Local wall time   |             65.892 s |             75.371 s |   +9.479 s |   1.144x |    +14.386% |
| CDK deploy time   |              50.57 s |              56.58 s |    +6.01 s |   1.119x |    +11.885% |
| Max memory        |               98 MiB |              288 MiB |   +190 MiB |   2.939x |   +193.878% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.239 s |              5.028 s |   +4.789 s |  21.038x |  +2003.766% |
| Billed duration   |              0.363 s |              5.413 s |    +5.05 s |  14.912x |  +1391.185% |
| Init duration     |              0.122 s |              0.385 s |   +0.263 s |   3.156x |   +215.574% |
| Local wall time   |             32.655 s |             42.049 s |   +9.394 s |   1.288x |    +28.767% |
| CDK deploy time   |              18.26 s |              23.68 s |    +5.42 s |   1.297x |    +29.682% |
| Max memory        |               37 MiB |              288 MiB |   +251 MiB |   7.784x |   +678.378% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.387 s |               5.22 s |   +4.833 s |  13.488x |  +1248.837% |
| Billed duration   |              0.529 s |               5.72 s |   +5.191 s |  10.813x |   +981.285% |
| Init duration     |              0.126 s |               0.56 s |   +0.434 s |   4.444x |   +344.444% |
| Local wall time   |             38.603 s |             42.434 s |   +3.831 s |   1.099x |     +9.924% |
| CDK deploy time   |               18.4 s |              23.66 s |    +5.26 s |   1.286x |    +28.587% |
| Max memory        |               39 MiB |              288 MiB |   +249 MiB |   7.385x |   +638.462% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.055 s |              5.116 s |   +4.061 s |   4.849x |   +384.929% |
| Billed duration   |              1.188 s |               5.62 s |   +4.432 s |   4.731x |   +373.064% |
| Init duration     |              0.128 s |              0.407 s |   +0.279 s |    3.18x |   +217.969% |
| Local wall time   |             37.838 s |             43.043 s |   +5.205 s |   1.138x |    +13.756% |
| CDK deploy time   |              18.47 s |              23.67 s |     +5.2 s |   1.282x |    +28.154% |
| Max memory        |               39 MiB |              280 MiB |   +241 MiB |   7.179x |   +617.949% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.498 s |             23.442 s |  +20.944 s |   9.384x |   +838.431% |
| Billed duration   |              2.618 s |             23.828 s |   +21.21 s |   9.102x |    +810.16% |
| Init duration     |              0.119 s |                0.4 s |   +0.281 s |   3.361x |   +236.134% |
| Local wall time   |             70.843 s |             91.895 s |  +21.052 s |   1.297x |    +29.716% |
| CDK deploy time   |              55.88 s |              77.14 s |   +21.26 s |    1.38x |    +38.046% |
| Max memory        |               55 MiB |              226 MiB |   +171 MiB |   4.109x |   +310.909% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.51 s |             25.455 s |  +24.945 s |  49.912x |  +4891.176% |
| Billed duration   |              0.632 s |             25.849 s |  +25.217 s |    40.9x |  +3990.032% |
| Init duration     |               0.12 s |              0.391 s |   +0.271 s |   3.258x |   +225.833% |
| Local wall time   |             33.075 s |             59.448 s |  +26.373 s |   1.797x |    +79.737% |
| CDK deploy time   |              18.23 s |              45.04 s |   +26.81 s |   2.471x |   +147.065% |
| Max memory        |               37 MiB |              224 MiB |   +187 MiB |   6.054x |   +505.405% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.632 s |             24.639 s |  +24.007 s |  38.986x |  +3798.576% |
| Billed duration   |              0.753 s |             25.041 s |  +24.288 s |  33.255x |  +3225.498% |
| Init duration     |              0.126 s |              0.382 s |   +0.256 s |   3.032x |   +203.175% |
| Local wall time   |             38.312 s |             73.458 s |  +35.146 s |   1.917x |    +91.736% |
| CDK deploy time   |              18.36 s |              45.08 s |   +26.72 s |   2.455x |   +145.534% |
| Max memory        |               38 MiB |              225 MiB |   +187 MiB |   5.921x |   +492.105% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.425 s |             25.126 s |  +23.701 s |  17.632x |  +1663.228% |
| Billed duration   |              1.545 s |             25.794 s |  +24.249 s |  16.695x |  +1569.515% |
| Init duration     |              0.121 s |              0.524 s |   +0.403 s |   4.331x |   +333.058% |
| Local wall time   |             38.444 s |             61.938 s |  +23.494 s |   1.611x |    +61.112% |
| CDK deploy time   |              18.42 s |              44.76 s |   +26.34 s |    2.43x |   +142.997% |
| Max memory        |               38 MiB |              221 MiB |   +183 MiB |   5.816x |   +481.579% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.471 s |             13.355 s |  +11.884 s |   9.079x |   +807.886% |
| Billed duration   |              1.599 s |             13.757 s |  +12.158 s |   8.604x |    +760.35% |
| Init duration     |              0.121 s |              0.412 s |   +0.291 s |   3.405x |   +240.496% |
| Local wall time   |             70.458 s |              80.59 s |  +10.132 s |   1.144x |     +14.38% |
| CDK deploy time   |              55.85 s |              66.67 s |   +10.82 s |   1.194x |    +19.373% |
| Max memory        |               69 MiB |              229 MiB |   +160 MiB |   3.319x |   +231.884% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.47 s |             13.839 s |  +13.369 s |  29.445x |  +2844.468% |
| Billed duration   |              0.618 s |             14.243 s |  +13.625 s |  23.047x |  +2204.693% |
| Init duration     |              0.131 s |              0.404 s |   +0.273 s |   3.084x |   +208.397% |
| Local wall time   |             32.635 s |             48.467 s |  +15.832 s |   1.485x |    +48.512% |
| CDK deploy time   |              18.22 s |              34.36 s |   +16.14 s |   1.886x |    +88.584% |
| Max memory        |               37 MiB |              229 MiB |   +192 MiB |   6.189x |   +518.919% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.56 s |             13.616 s |  +13.056 s |  24.314x |  +2331.429% |
| Billed duration   |              0.689 s |                 14 s |  +13.311 s |  20.319x |   +1931.93% |
| Init duration     |              0.122 s |              0.384 s |   +0.262 s |   3.148x |   +214.754% |
| Local wall time   |             35.551 s |             53.881 s |   +18.33 s |   1.516x |     +51.56% |
| CDK deploy time   |               18.3 s |              34.28 s |   +15.98 s |   1.873x |    +87.322% |
| Max memory        |               38 MiB |              227 MiB |   +189 MiB |   5.974x |   +497.368% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.292 s |             13.132 s |   +11.84 s |  10.164x |   +916.409% |
| Billed duration   |              1.475 s |             13.541 s |  +12.066 s |    9.18x |   +818.034% |
| Init duration     |              0.127 s |              0.387 s |    +0.26 s |   3.047x |   +204.724% |
| Local wall time   |             37.904 s |             50.739 s |  +12.835 s |   1.339x |    +33.862% |
| CDK deploy time   |              18.41 s |              33.88 s |   +15.47 s |    1.84x |     +84.03% |
| Max memory        |               38 MiB |              225 MiB |   +187 MiB |   5.921x |   +492.105% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.427 |   8.33 |  8.451 |   0.121 |   8.197 |    9.36 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      8.193 |  8.132 |  8.499 |   0.367 |   8.111 |   8.585 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      8.387 |  8.361 |  8.964 |   0.603 |   8.077 |    9.31 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      7.985 |   7.93 |  8.169 |   0.239 |   7.694 |   8.764 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.904 |  1.901 |  1.928 |   0.027 |   1.872 |    2.18 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.253 |  0.244 |   0.26 |   0.016 |   0.242 |   0.277 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.461 |  0.457 |  0.469 |   0.012 |   0.456 |   0.681 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.543 |  0.514 |  0.635 |   0.121 |   0.495 |   0.686 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      4.639 |  4.596 |  4.685 |   0.089 |   4.513 |   4.693 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      4.691 |  4.527 |  4.693 |   0.166 |   4.524 |   4.776 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       4.62 |  4.534 |   5.52 |   0.986 |   3.652 |   5.549 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.434 |   4.38 |  4.442 |   0.062 |   3.548 |   4.492 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.207 |  1.164 |  1.254 |    0.09 |   1.128 |   1.533 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.224 |  0.217 |  0.237 |    0.02 |    0.19 |   0.238 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.429 |  0.376 |  0.441 |   0.065 |   0.374 |    0.56 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.499 |  0.467 |  0.504 |   0.037 |   0.458 |   0.509 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.952 |  8.499 |  8.971 |   0.472 |   8.434 |   8.991 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.264 |  9.109 |  9.432 |   0.323 |   8.809 |   9.444 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.389 |  9.301 |  9.972 |   0.671 |   8.982 |  10.042 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       9.05 |  8.938 |  9.577 |   0.639 |   8.773 |   9.698 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.224 |  1.222 |   1.25 |   0.028 |   1.189 |   1.437 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.289 |  0.285 |  0.294 |   0.009 |   0.264 |     0.3 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.429 |  0.389 |   0.43 |   0.041 |   0.365 |    0.57 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.098 |   1.06 |  1.101 |   0.041 |   1.038 |   1.399 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.069 |  5.019 |  5.076 |   0.057 |   4.941 |   5.103 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.028 |  4.955 |  5.037 |   0.082 |   4.911 |   5.048 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.22 |  5.172 |  5.929 |   0.757 |   5.028 |   6.058 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.116 |  4.977 |  5.119 |   0.142 |    4.93 |   5.297 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.807 |  0.799 |  0.812 |   0.013 |   0.633 |   0.825 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.239 |  0.238 |  0.244 |   0.006 |   0.233 |   0.255 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.387 |  0.367 |  0.408 |   0.041 |   0.353 |   0.413 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.055 |  1.041 |  1.059 |   0.018 |   1.019 |    1.07 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     23.442 |  23.29 | 23.592 |   0.302 |  22.146 |  23.902 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     25.455 | 25.428 | 25.712 |   0.284 |  24.487 |  26.677 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     24.639 | 24.553 | 25.175 |   0.622 |  24.377 |  25.849 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     25.126 | 24.491 | 25.424 |   0.933 |  23.829 |  26.754 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.498 |   2.47 |  2.536 |   0.066 |    2.45 |   2.609 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.51 |  0.487 |  0.513 |   0.026 |   0.482 |   0.536 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.632 |  0.588 |  0.634 |   0.046 |   0.586 |   0.746 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.425 |  1.359 |   1.47 |   0.111 |   1.341 |   1.528 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     13.355 | 13.086 | 13.635 |   0.549 |  12.959 |  14.445 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     13.839 | 13.599 | 13.843 |   0.244 |  13.051 |  15.426 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     13.616 | 13.352 |  14.08 |   0.728 |  11.214 |  15.685 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     13.132 | 12.949 | 13.399 |    0.45 |  12.556 |  13.613 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.471 |  1.461 |  1.518 |   0.057 |   1.458 |    1.52 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.47 |  0.467 |  0.486 |   0.019 |    0.46 |   0.531 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.56 |  0.527 |  0.591 |   0.064 |   0.525 |   0.602 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.292 |  1.262 |  1.361 |   0.099 |    1.23 |   1.485 |

```text
large-few cold-create 1024//adaptive aws         | ########## 8.427 s
large-few unchanged-update 1024//adaptive aws    | ########## 8.193 s
large-few changed-update 1024//adaptive aws      | ########## 8.387 s
large-few pruned-update 1024//adaptive aws       | ######### 7.985 s
large-few cold-create 1024/32/adaptive shin      | ## 1.904 s
large-few unchanged-update 1024/32/adaptive shin | # 0.253 s
large-few changed-update 1024/32/adaptive shin   | # 0.461 s
large-few pruned-update 1024/32/adaptive shin    | # 0.543 s
large-few cold-create 2048//adaptive aws         | ##### 4.639 s
large-few unchanged-update 2048//adaptive aws    | ###### 4.691 s
large-few changed-update 2048//adaptive aws      | ##### 4.62 s
large-few pruned-update 2048//adaptive aws       | ##### 4.434 s
large-few cold-create 2048/64/adaptive shin      | # 1.207 s
large-few unchanged-update 2048/64/adaptive shin | # 0.224 s
large-few changed-update 2048/64/adaptive shin   | # 0.429 s
large-few pruned-update 2048/64/adaptive shin    | # 0.499 s
mixed cold-create 1024//adaptive aws             | ########### 8.952 s
mixed unchanged-update 1024//adaptive aws        | ########### 9.264 s
mixed changed-update 1024//adaptive aws          | ########### 9.389 s
mixed pruned-update 1024//adaptive aws           | ########### 9.05 s
mixed cold-create 1024/32/adaptive shin          | # 1.224 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.289 s
mixed changed-update 1024/32/adaptive shin       | # 0.429 s
mixed pruned-update 1024/32/adaptive shin        | # 1.098 s
mixed cold-create 2048//adaptive aws             | ###### 5.069 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.028 s
mixed changed-update 2048//adaptive aws          | ###### 5.22 s
mixed pruned-update 2048//adaptive aws           | ###### 5.116 s
mixed cold-create 2048/64/adaptive shin          | # 0.807 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.239 s
mixed changed-update 2048/64/adaptive shin       | # 0.387 s
mixed pruned-update 2048/64/adaptive shin        | # 1.055 s
tiny-many cold-create 1024//adaptive aws         | ############################ 23.442 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 25.455 s
tiny-many changed-update 1024//adaptive aws      | ############################# 24.639 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 25.126 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.498 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.51 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.632 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.425 s
tiny-many cold-create 2048//adaptive aws         | ################ 13.355 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 13.839 s
tiny-many changed-update 2048//adaptive aws      | ################ 13.616 s
tiny-many pruned-update 2048//adaptive aws       | ############### 13.132 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.471 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.47 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.56 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.292 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.834 |  8.823 |  8.984 |   0.161 |   8.583 |   9.902 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      8.574 |  8.529 |  8.877 |   0.348 |   8.523 |    8.98 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      8.893 |  8.748 |   9.45 |   0.702 |    8.47 |   9.882 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.372 |  8.335 |  8.563 |   0.228 |   8.069 |   9.285 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.024 |  2.021 |   2.05 |   0.029 |   1.995 |   2.299 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.372 |  0.364 |  0.421 |   0.057 |   0.364 |    0.44 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.604 |  0.588 |  0.619 |   0.031 |   0.576 |   0.848 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.664 |  0.646 |  0.752 |   0.106 |   0.612 |   0.814 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       5.12 |   4.98 |  5.327 |   0.347 |     4.9 |    5.36 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.214 |  5.185 |  5.374 |   0.189 |   5.175 |   5.377 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.212 |  5.019 |  6.027 |   1.008 |   3.932 |   6.062 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       4.85 |  4.829 |  5.011 |   0.182 |   3.845 |   5.155 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.336 |  1.282 |  1.376 |   0.094 |   1.259 |   1.692 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.349 |  0.335 |  0.395 |    0.06 |   0.314 |   0.397 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.549 |  0.502 |   0.56 |   0.058 |   0.501 |   0.683 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.619 |  0.589 |  0.629 |    0.04 |   0.578 |   0.666 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.354 |  9.167 |   9.36 |   0.193 |   9.056 |   9.377 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.654 |  9.488 |  9.816 |   0.328 |   9.459 |   9.856 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.787 |  9.693 |  10.51 |   0.817 |   9.367 |  10.618 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.443 |  9.319 | 10.125 |   0.806 |   9.169 |  10.231 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.351 |  1.342 |  1.378 |   0.036 |   1.308 |   1.567 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.408 |  0.404 |  0.449 |   0.045 |   0.383 |   0.454 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.548 |   0.51 |  0.549 |   0.039 |   0.484 |   0.697 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.216 |  1.182 |  1.219 |   0.037 |   1.154 |   1.498 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.451 |  5.408 |  5.466 |   0.058 |   5.347 |   5.502 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.413 |  5.383 |  5.427 |   0.044 |   5.292 |   5.428 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.72 |  5.624 |  6.526 |   0.902 |   5.578 |   6.619 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       5.62 |  5.524 |   5.66 |   0.136 |   5.376 |   5.698 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.927 |  0.922 |  0.931 |   0.009 |   0.729 |   0.945 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.363 |  0.359 |  0.367 |   0.008 |   0.334 |    0.38 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.529 |  0.492 |  0.544 |   0.052 |    0.48 |   0.546 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.188 |  1.162 |  1.211 |   0.049 |   1.145 |   1.227 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     23.828 | 23.742 | 23.992 |    0.25 |  22.545 |  24.308 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     25.849 | 25.813 | 26.096 |   0.283 |  24.879 |  27.195 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     25.041 | 24.937 | 25.554 |   0.617 |  24.757 |  26.232 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     25.794 | 24.898 | 25.954 |   1.056 |  24.209 |  27.279 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.618 |  2.591 |  2.655 |   0.064 |   2.567 |   2.733 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.632 |  0.613 |  0.634 |   0.021 |    0.58 |   0.656 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.753 |  0.714 |  0.761 |   0.047 |   0.706 |   0.911 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.545 |  1.482 |  1.589 |   0.107 |    1.47 |    1.65 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     13.757 | 13.499 | 14.016 |   0.517 |  13.371 |  14.961 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     14.243 | 13.986 | 14.258 |   0.272 |  13.432 |  15.989 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |         14 | 13.737 | 14.487 |    0.75 |  11.513 |  16.208 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     13.541 | 13.323 | 13.787 |   0.464 |  12.941 |  14.016 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.599 |  1.583 |  1.617 |   0.034 |   1.577 |   1.645 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.618 |  0.595 |  0.626 |   0.031 |   0.589 |   0.666 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.689 |  0.644 |  0.714 |    0.07 |   0.627 |   0.726 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.475 |  1.457 |  1.487 |    0.03 |    1.35 |   1.612 |

```text
large-few cold-create 1024//adaptive aws         | ########## 8.834 s
large-few unchanged-update 1024//adaptive aws    | ########## 8.574 s
large-few changed-update 1024//adaptive aws      | ########## 8.893 s
large-few pruned-update 1024//adaptive aws       | ########## 8.372 s
large-few cold-create 1024/32/adaptive shin      | ## 2.024 s
large-few unchanged-update 1024/32/adaptive shin | # 0.372 s
large-few changed-update 1024/32/adaptive shin   | # 0.604 s
large-few pruned-update 1024/32/adaptive shin    | # 0.664 s
large-few cold-create 2048//adaptive aws         | ###### 5.12 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.214 s
large-few changed-update 2048//adaptive aws      | ###### 5.212 s
large-few pruned-update 2048//adaptive aws       | ###### 4.85 s
large-few cold-create 2048/64/adaptive shin      | ## 1.336 s
large-few unchanged-update 2048/64/adaptive shin | # 0.349 s
large-few changed-update 2048/64/adaptive shin   | # 0.549 s
large-few pruned-update 2048/64/adaptive shin    | # 0.619 s
mixed cold-create 1024//adaptive aws             | ########### 9.354 s
mixed unchanged-update 1024//adaptive aws        | ########### 9.654 s
mixed changed-update 1024//adaptive aws          | ########### 9.787 s
mixed pruned-update 1024//adaptive aws           | ########### 9.443 s
mixed cold-create 1024/32/adaptive shin          | ## 1.351 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.408 s
mixed changed-update 1024/32/adaptive shin       | # 0.548 s
mixed pruned-update 1024/32/adaptive shin        | # 1.216 s
mixed cold-create 2048//adaptive aws             | ###### 5.451 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.413 s
mixed changed-update 2048//adaptive aws          | ####### 5.72 s
mixed pruned-update 2048//adaptive aws           | ####### 5.62 s
mixed cold-create 2048/64/adaptive shin          | # 0.927 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.363 s
mixed changed-update 2048/64/adaptive shin       | # 0.529 s
mixed pruned-update 2048/64/adaptive shin        | # 1.188 s
tiny-many cold-create 1024//adaptive aws         | ############################ 23.828 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 25.849 s
tiny-many changed-update 1024//adaptive aws      | ############################# 25.041 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 25.794 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.618 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.632 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.753 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.545 s
tiny-many cold-create 2048//adaptive aws         | ################ 13.757 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 14.243 s
tiny-many changed-update 2048//adaptive aws      | ################ 14 s
tiny-many pruned-update 2048//adaptive aws       | ################ 13.541 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.599 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.618 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.689 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.475 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.395 |  0.386 |  0.542 |   0.156 |   0.382 |   0.654 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.395 |  0.381 |  0.397 |   0.016 |   0.377 |   0.412 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.485 |  0.392 |  0.506 |   0.114 |   0.387 |   0.571 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.393 |  0.386 |  0.405 |   0.019 |   0.374 |    0.52 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |   0.12 |  0.122 |   0.002 |   0.118 |   0.123 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |   0.12 |   0.16 |    0.04 |   0.119 |   0.162 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.135 |  0.131 |  0.157 |   0.026 |   0.118 |   0.167 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.117 |  0.128 |   0.011 |   0.117 |   0.131 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.434 |  0.387 |  0.667 |    0.28 |   0.384 |   0.688 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.681 |   0.66 |  0.685 |   0.025 |   0.399 |   0.686 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.507 |  0.399 |  0.513 |   0.114 |    0.28 |   0.677 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.408 |  0.395 |   0.63 |   0.235 |   0.297 |   0.663 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.129 |  0.122 |  0.131 |   0.009 |   0.118 |   0.158 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.125 |  0.124 |  0.157 |   0.033 |   0.117 |   0.159 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |   0.12 |  0.125 |   0.005 |   0.119 |   0.128 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |   0.12 |  0.125 |   0.005 |   0.119 |   0.157 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.408 |  0.385 |  0.622 |   0.237 |   0.383 |   0.667 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.389 |  0.384 |  0.412 |   0.028 |   0.379 |   0.649 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.398 |  0.392 |  0.537 |   0.145 |   0.384 |   0.576 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.396 |  0.392 |  0.532 |    0.14 |   0.381 |   0.547 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.126 |  0.119 |  0.128 |   0.009 |   0.119 |   0.129 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.119 |  0.154 |   0.035 |   0.118 |   0.154 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.119 |  0.121 |   0.002 |   0.118 |   0.127 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.115 |  0.118 |   0.003 |   0.099 |   0.121 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       0.39 |  0.389 |  0.398 |   0.009 |   0.381 |   0.405 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.385 |  0.381 |   0.39 |   0.009 |   0.379 |   0.427 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       0.56 |  0.406 |  0.596 |    0.19 |   0.404 |   0.691 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.407 |  0.401 |    0.5 |   0.099 |   0.399 |    0.73 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.119 |   0.12 |   0.001 |   0.095 |   0.122 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.119 |  0.124 |   0.005 |   0.096 |    0.13 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.126 |  0.125 |  0.132 |   0.007 |   0.121 |   0.156 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.128 |  0.126 |  0.156 |    0.03 |    0.12 |   0.156 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |        0.4 |  0.399 |  0.406 |   0.007 |   0.385 |   0.451 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.391 |  0.384 |  0.393 |   0.009 |   0.384 |   0.517 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.382 |  0.379 |  0.383 |   0.004 |   0.378 |   0.401 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.524 |  0.406 |  0.529 |   0.123 |   0.379 |   0.667 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.119 |   0.12 |   0.001 |   0.117 |   0.123 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |   0.12 |  0.121 |   0.001 |   0.098 |   0.126 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.126 |   0.12 |  0.127 |   0.007 |    0.12 |   0.164 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |   0.12 |  0.123 |   0.003 |   0.119 |   0.128 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.412 |  0.401 |  0.413 |   0.012 |    0.38 |   0.515 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.404 |  0.386 |  0.414 |   0.028 |   0.381 |   0.562 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.384 |  0.384 |  0.406 |   0.022 |   0.299 |   0.523 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.387 |  0.384 |  0.403 |   0.019 |   0.373 |   0.409 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.124 |   0.005 |   0.098 |   0.127 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.131 |  0.129 |  0.135 |   0.006 |   0.127 |   0.156 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.118 |  0.124 |   0.006 |     0.1 |   0.129 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.127 |  0.125 |  0.164 |   0.039 |    0.12 |   0.212 |

```text
large-few cold-create 1024//adaptive aws         | ################# 0.395 s
large-few unchanged-update 1024//adaptive aws    | ################# 0.395 s
large-few changed-update 1024//adaptive aws      | ##################### 0.485 s
large-few pruned-update 1024//adaptive aws       | ################# 0.393 s
large-few cold-create 1024/32/adaptive shin      | ##### 0.12 s
large-few unchanged-update 1024/32/adaptive shin | ##### 0.121 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.135 s
large-few pruned-update 1024/32/adaptive shin    | ##### 0.121 s
large-few cold-create 2048//adaptive aws         | ################### 0.434 s
large-few unchanged-update 2048//adaptive aws    | ############################## 0.681 s
large-few changed-update 2048//adaptive aws      | ###################### 0.507 s
large-few pruned-update 2048//adaptive aws       | ################## 0.408 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.129 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.125 s
large-few changed-update 2048/64/adaptive shin   | ##### 0.122 s
large-few pruned-update 2048/64/adaptive shin    | ##### 0.121 s
mixed cold-create 1024//adaptive aws             | ################## 0.408 s
mixed unchanged-update 1024//adaptive aws        | ################# 0.389 s
mixed changed-update 1024//adaptive aws          | ################## 0.398 s
mixed pruned-update 1024//adaptive aws           | ################# 0.396 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.126 s
mixed unchanged-update 1024/32/adaptive shin     | ##### 0.119 s
mixed changed-update 1024/32/adaptive shin       | ##### 0.119 s
mixed pruned-update 1024/32/adaptive shin        | ##### 0.118 s
mixed cold-create 2048//adaptive aws             | ################# 0.39 s
mixed unchanged-update 2048//adaptive aws        | ################# 0.385 s
mixed changed-update 2048//adaptive aws          | ######################### 0.56 s
mixed pruned-update 2048//adaptive aws           | ################## 0.407 s
mixed cold-create 2048/64/adaptive shin          | ##### 0.12 s
mixed unchanged-update 2048/64/adaptive shin     | ##### 0.122 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.126 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.128 s
tiny-many cold-create 1024//adaptive aws         | ################## 0.4 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 0.391 s
tiny-many changed-update 1024//adaptive aws      | ################# 0.382 s
tiny-many pruned-update 1024//adaptive aws       | ####################### 0.524 s
tiny-many cold-create 1024/32/adaptive shin      | ##### 0.119 s
tiny-many unchanged-update 1024/32/adaptive shin | ##### 0.12 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.126 s
tiny-many pruned-update 1024/32/adaptive shin    | ##### 0.121 s
tiny-many cold-create 2048//adaptive aws         | ################## 0.412 s
tiny-many unchanged-update 2048//adaptive aws    | ################## 0.404 s
tiny-many changed-update 2048//adaptive aws      | ################# 0.384 s
tiny-many pruned-update 2048//adaptive aws       | ################# 0.387 s
tiny-many cold-create 2048/64/adaptive shin      | ##### 0.121 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.131 s
tiny-many changed-update 2048/64/adaptive shin   | ##### 0.122 s
tiny-many pruned-update 2048/64/adaptive shin    | ###### 0.127 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     75.935 | 75.526 | 79.256 |    3.73 |  75.507 |  83.168 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.656 | 43.068 | 44.949 |   1.881 |  42.384 |   47.63 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     49.686 | 48.114 | 50.171 |   2.057 |  47.859 |  52.348 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     45.409 | 44.021 | 48.658 |   4.637 |  43.446 |  49.428 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.299 | 70.175 |  71.47 |   1.295 |  69.584 |  72.124 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      37.89 | 35.192 | 46.683 |  11.491 |  34.073 |  46.746 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     39.176 | 38.816 | 41.022 |   2.206 |  32.274 |  41.057 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |         40 | 36.086 | 40.216 |    4.13 |   33.43 |  42.981 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     70.281 | 69.946 | 71.695 |   1.749 |  69.087 |  74.273 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     39.484 | 38.319 | 42.427 |   4.108 |   37.73 |  42.664 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.661 | 42.585 |  43.82 |   1.235 |   39.53 |   43.87 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     43.856 | 42.738 | 44.184 |   1.446 |  42.294 |  50.581 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.221 | 69.915 | 70.446 |   0.531 |  66.776 |  82.877 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     33.174 | 32.614 | 33.411 |   0.797 |  32.184 |  34.971 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.009 | 37.239 | 39.089 |    1.85 |  33.023 |  39.535 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.908 | 37.595 | 41.565 |    3.97 |   34.76 |  43.688 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     76.995 |  76.13 | 77.505 |   1.375 |  75.441 |  79.901 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.522 |  43.47 | 44.705 |   1.235 |  42.113 |   47.69 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     44.901 | 43.211 | 47.696 |   4.485 |  42.628 |  49.167 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     48.664 | 47.958 | 67.003 |  19.045 |  47.736 |  70.275 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      70.44 | 69.987 |  71.24 |   1.253 |  66.538 |  72.795 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      33.18 | 32.777 | 34.668 |   1.891 |  32.589 |  34.697 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.962 | 37.596 | 38.492 |   0.896 |  34.175 |  39.937 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.936 |  36.14 | 38.344 |   2.204 |  33.331 |  38.457 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     75.371 | 71.729 | 80.729 |       9 |  69.821 |  92.803 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     42.049 |   37.4 |  47.48 |   10.08 |  37.221 |  51.792 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.434 |  39.76 | 43.563 |   3.803 |  37.746 |  43.677 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     43.043 | 39.823 | 43.355 |   3.532 |  37.358 |  44.069 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     65.892 | 64.773 | 68.668 |   3.895 |  63.421 |  73.042 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.655 | 32.475 | 34.096 |   1.621 |  32.421 |  34.341 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.603 | 37.627 | 39.051 |   1.424 |   31.94 |  40.467 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.838 | 37.478 | 39.011 |   1.533 |  33.029 |  40.495 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     91.895 | 91.011 | 92.218 |   1.207 |  90.234 |  93.782 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     59.448 | 58.239 | 59.841 |   1.602 |  58.187 |  61.911 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     73.458 | 67.149 | 76.302 |   9.153 |   60.24 |  78.175 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     61.938 | 61.162 | 64.586 |   3.424 |  60.657 |  64.651 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.843 |  70.45 |   71.1 |    0.65 |  70.363 |   72.52 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.075 | 32.983 | 34.285 |   1.302 |  32.606 |  37.342 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.312 | 34.903 | 38.315 |   3.412 |  33.555 |  39.168 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.444 | 38.162 | 39.434 |   1.272 |  37.946 |  40.463 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      80.59 |  79.67 | 81.395 |   1.725 |  79.572 |  82.532 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     48.467 | 48.455 | 49.299 |   0.844 |  48.163 |  50.736 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     53.881 | 50.826 | 54.119 |   3.293 |  48.668 |  55.055 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     50.739 | 49.791 | 53.688 |   3.897 |  48.539 |  54.355 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.458 | 70.221 | 71.308 |   1.087 |  69.882 |  72.284 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.635 | 32.307 | 33.426 |   1.119 |  32.272 |  34.485 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     35.551 | 33.793 |  38.09 |   4.297 |  33.262 |  38.218 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.904 | 34.708 | 38.014 |   3.306 |  33.079 |  39.628 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 75.935 s
large-few unchanged-update 1024//adaptive aws    | ############## 43.656 s
large-few changed-update 1024//adaptive aws      | ################ 49.686 s
large-few pruned-update 1024//adaptive aws       | ############### 45.409 s
large-few cold-create 1024/32/adaptive shin      | ####################### 70.299 s
large-few unchanged-update 1024/32/adaptive shin | ############ 37.89 s
large-few changed-update 1024/32/adaptive shin   | ############# 39.176 s
large-few pruned-update 1024/32/adaptive shin    | ############# 40 s
large-few cold-create 2048//adaptive aws         | ####################### 70.281 s
large-few unchanged-update 2048//adaptive aws    | ############# 39.484 s
large-few changed-update 2048//adaptive aws      | ############## 42.661 s
large-few pruned-update 2048//adaptive aws       | ############## 43.856 s
large-few cold-create 2048/64/adaptive shin      | ####################### 70.221 s
large-few unchanged-update 2048/64/adaptive shin | ########### 33.174 s
large-few changed-update 2048/64/adaptive shin   | ############ 38.009 s
large-few pruned-update 2048/64/adaptive shin    | ############ 37.908 s
mixed cold-create 1024//adaptive aws             | ######################### 76.995 s
mixed unchanged-update 1024//adaptive aws        | ############## 43.522 s
mixed changed-update 1024//adaptive aws          | ############### 44.901 s
mixed pruned-update 1024//adaptive aws           | ################ 48.664 s
mixed cold-create 1024/32/adaptive shin          | ####################### 70.44 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 33.18 s
mixed changed-update 1024/32/adaptive shin       | ############ 37.962 s
mixed pruned-update 1024/32/adaptive shin        | ############ 37.936 s
mixed cold-create 2048//adaptive aws             | ######################### 75.371 s
mixed unchanged-update 2048//adaptive aws        | ############## 42.049 s
mixed changed-update 2048//adaptive aws          | ############## 42.434 s
mixed pruned-update 2048//adaptive aws           | ############## 43.043 s
mixed cold-create 2048/64/adaptive shin          | ###################### 65.892 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 32.655 s
mixed changed-update 2048/64/adaptive shin       | ############# 38.603 s
mixed pruned-update 2048/64/adaptive shin        | ############ 37.838 s
tiny-many cold-create 1024//adaptive aws         | ############################## 91.895 s
tiny-many unchanged-update 1024//adaptive aws    | ################### 59.448 s
tiny-many changed-update 1024//adaptive aws      | ######################## 73.458 s
tiny-many pruned-update 1024//adaptive aws       | #################### 61.938 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 70.843 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 33.075 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 38.312 s
tiny-many pruned-update 1024/32/adaptive shin    | ############# 38.444 s
tiny-many cold-create 2048//adaptive aws         | ########################## 80.59 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 48.467 s
tiny-many changed-update 2048//adaptive aws      | ################## 53.881 s
tiny-many pruned-update 2048//adaptive aws       | ################# 50.739 s
tiny-many cold-create 2048/64/adaptive shin      | ####################### 70.458 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 32.635 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 35.551 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 37.904 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.18 |  61.15 |  61.87 |    0.72 |   60.42 |   65.76 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.91 |  28.72 |  28.95 |    0.23 |   28.58 |   29.45 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.93 |  28.58 |  29.01 |    0.43 |   28.46 |   29.53 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.11 |  28.57 |  29.12 |    0.55 |   23.35 |   29.71 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.75 |  55.69 |  55.77 |    0.08 |   55.13 |    56.5 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.26 |  17.97 |  18.31 |    0.34 |   17.87 |   18.66 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.36 |  18.05 |  18.37 |    0.32 |   17.98 |   18.82 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.44 |  18.16 |  18.54 |    0.38 |   18.15 |   18.91 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      55.89 |  55.83 |  56.63 |     0.8 |    55.3 |   60.82 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.58 |  23.27 |  23.66 |    0.39 |    23.2 |   24.08 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.67 |  23.29 |  23.75 |    0.46 |   23.24 |   24.12 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.73 |  23.37 |  23.74 |    0.37 |   23.19 |   29.57 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       55.6 |  55.47 |  55.77 |     0.3 |   51.23 |   55.87 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.27 |  17.95 |  18.32 |    0.37 |   17.84 |   18.75 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.39 |  18.06 |  18.46 |     0.4 |   18.03 |   18.74 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.47 |  18.03 |  18.54 |    0.51 |   18.02 |   18.81 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |       61.1 |  60.85 |  61.26 |    0.41 |    60.7 |   61.86 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.98 |  28.56 |  29.01 |    0.45 |   28.42 |    29.3 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.93 |  28.55 |  29.06 |    0.51 |   28.45 |   29.47 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.02 |  28.66 |   29.1 |    0.44 |   28.54 |   29.58 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.65 |  55.49 |  55.78 |    0.29 |   50.53 |   56.45 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.29 |  17.95 |  18.35 |     0.4 |   17.86 |   18.63 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.31 |  17.98 |  18.42 |    0.44 |   17.93 |   18.66 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.49 |  18.12 |  18.51 |    0.39 |   18.06 |   18.82 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      56.58 |  55.82 |  60.49 |    4.67 |    55.8 |   60.78 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.68 |  23.21 |   23.7 |    0.49 |   23.19 |   24.07 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.66 |  23.21 |   23.7 |    0.49 |   23.17 |   24.12 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.67 |  23.37 |  23.92 |    0.55 |   23.26 |   24.25 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      50.57 |  50.44 |  55.09 |    4.65 |    49.7 |   56.51 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.26 |  17.83 |  18.26 |    0.43 |   17.81 |    18.6 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       18.4 |     18 |  18.42 |    0.42 |   17.96 |   18.74 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.47 |  18.09 |  18.47 |    0.38 |   18.08 |   18.91 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      77.14 |   76.4 |  77.44 |    1.04 |   76.38 |   77.91 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      45.04 |  44.38 |  45.12 |    0.74 |   44.32 |    45.6 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      45.08 |  44.37 |  45.12 |    0.75 |   44.33 |   45.71 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      44.76 |   44.6 |  45.12 |    0.52 |    40.4 |   45.18 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.88 |  55.79 |  56.08 |    0.29 |   55.51 |   56.49 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.23 |  17.89 |  18.27 |    0.38 |   17.86 |   18.78 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.36 |  18.15 |  18.43 |    0.28 |   17.99 |   18.87 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.42 |   18.1 |  18.49 |    0.39 |   17.99 |   18.81 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      66.67 |  65.76 |  66.78 |    1.02 |   65.74 |   67.35 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      34.36 |  34.23 |  34.37 |    0.14 |   34.11 |   34.95 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.28 |   34.2 |  34.36 |    0.16 |   29.55 |   34.39 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      33.88 |  29.12 |  34.45 |    5.33 |   28.69 |   35.03 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.85 |  55.56 |  55.94 |    0.38 |   55.41 |   56.52 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.22 |  18.06 |  18.35 |    0.29 |   17.87 |   18.65 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       18.3 |  17.98 |  18.41 |    0.43 |   17.96 |    18.8 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.41 |  18.05 |  18.47 |    0.42 |   18.02 |   18.85 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 61.18 s
large-few unchanged-update 1024//adaptive aws    | ########### 28.91 s
large-few changed-update 1024//adaptive aws      | ########### 28.93 s
large-few pruned-update 1024//adaptive aws       | ########### 29.11 s
large-few cold-create 1024/32/adaptive shin      | ###################### 55.75 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.26 s
large-few changed-update 1024/32/adaptive shin   | ####### 18.36 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.44 s
large-few cold-create 2048//adaptive aws         | ###################### 55.89 s
large-few unchanged-update 2048//adaptive aws    | ######### 23.58 s
large-few changed-update 2048//adaptive aws      | ######### 23.67 s
large-few pruned-update 2048//adaptive aws       | ######### 23.73 s
large-few cold-create 2048/64/adaptive shin      | ###################### 55.6 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.27 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.39 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.47 s
mixed cold-create 1024//adaptive aws             | ######################## 61.1 s
mixed unchanged-update 1024//adaptive aws        | ########### 28.98 s
mixed changed-update 1024//adaptive aws          | ########### 28.93 s
mixed pruned-update 1024//adaptive aws           | ########### 29.02 s
mixed cold-create 1024/32/adaptive shin          | ###################### 55.65 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.29 s
mixed changed-update 1024/32/adaptive shin       | ####### 18.31 s
mixed pruned-update 1024/32/adaptive shin        | ####### 18.49 s
mixed cold-create 2048//adaptive aws             | ###################### 56.58 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.68 s
mixed changed-update 2048//adaptive aws          | ######### 23.66 s
mixed pruned-update 2048//adaptive aws           | ######### 23.67 s
mixed cold-create 2048/64/adaptive shin          | #################### 50.57 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.26 s
mixed changed-update 2048/64/adaptive shin       | ####### 18.4 s
mixed pruned-update 2048/64/adaptive shin        | ####### 18.47 s
tiny-many cold-create 1024//adaptive aws         | ############################## 77.14 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 45.04 s
tiny-many changed-update 1024//adaptive aws      | ################## 45.08 s
tiny-many pruned-update 1024//adaptive aws       | ################# 44.76 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 55.88 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.23 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 18.36 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.42 s
tiny-many cold-create 2048//adaptive aws         | ########################## 66.67 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 34.36 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.28 s
tiny-many pruned-update 2048//adaptive aws       | ############# 33.88 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 55.85 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.22 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.3 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.41 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       450 |       453 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       449 |       451 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          451 |      451 |      452 |         1 |       451 |       453 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          421 |      420 |      421 |         1 |       420 |       421 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          109 |      106 |      110 |         4 |        93 |       120 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           42 |       41 |       42 |         1 |        40 |        42 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           42 |       42 |       42 |         0 |        41 |        43 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      453 |         2 |       451 |       453 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       450 |       451 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       451 |       451 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          421 |      421 |      421 |         0 |       420 |       421 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          167 |      155 |      185 |        30 |       143 |       188 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           41 |       41 |       42 |         1 |        40 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           42 |       42 |       43 |         1 |        41 |        44 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          288 |      287 |      289 |         2 |       287 |       289 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          287 |      286 |      288 |         2 |       286 |       288 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          288 |      287 |      288 |         1 |       287 |       289 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          279 |      279 |      280 |         1 |       279 |       281 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           89 |       89 |       90 |         1 |        88 |        90 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        38 |        41 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        39 |        41 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          288 |      288 |      288 |         0 |       288 |       289 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          288 |      287 |      290 |         3 |       287 |       290 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          288 |      288 |      288 |         0 |       287 |       290 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       279 |       281 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           98 |       98 |      101 |         3 |        98 |       116 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           37 |       35 |       37 |         2 |        35 |        37 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       41 |         2 |        39 |        41 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        39 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          226 |      226 |      228 |         2 |       226 |       229 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          224 |      223 |      224 |         1 |       222 |       228 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          225 |      225 |      227 |         2 |       223 |       228 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          221 |      221 |      225 |         4 |       220 |       226 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           55 |       54 |       56 |         2 |        53 |        57 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        39 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        40 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        39 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          229 |      229 |      230 |         1 |       228 |       231 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          229 |      228 |      230 |         2 |       227 |       230 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          227 |      227 |      228 |         1 |       227 |       230 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          225 |      225 |      225 |         0 |       225 |       228 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           69 |       63 |       70 |         7 |        56 |        71 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       38 |         1 |        37 |        39 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        38 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        37 |        40 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 451 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 451 MiB
large-few changed-update 1024//adaptive aws      | ############################## 451 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 421 MiB
large-few cold-create 1024/32/adaptive shin      | ####### 109 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 35 MiB
large-few changed-update 1024/32/adaptive shin   | ### 42 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 42 MiB
large-few cold-create 2048//adaptive aws         | ############################## 451 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 451 MiB
large-few changed-update 2048//adaptive aws      | ############################## 451 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 421 MiB
large-few cold-create 2048/64/adaptive shin      | ########### 167 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 35 MiB
large-few changed-update 2048/64/adaptive shin   | ### 41 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 42 MiB
mixed cold-create 1024//adaptive aws             | ################### 288 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 287 MiB
mixed changed-update 1024//adaptive aws          | ################### 288 MiB
mixed pruned-update 1024//adaptive aws           | ################### 279 MiB
mixed cold-create 1024/32/adaptive shin          | ###### 89 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 35 MiB
mixed changed-update 1024/32/adaptive shin       | ### 39 MiB
mixed pruned-update 1024/32/adaptive shin        | ### 39 MiB
mixed cold-create 2048//adaptive aws             | ################### 288 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 288 MiB
mixed changed-update 2048//adaptive aws          | ################### 288 MiB
mixed pruned-update 2048//adaptive aws           | ################### 280 MiB
mixed cold-create 2048/64/adaptive shin          | ####### 98 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 37 MiB
mixed changed-update 2048/64/adaptive shin       | ### 39 MiB
mixed pruned-update 2048/64/adaptive shin        | ### 39 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 226 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############### 224 MiB
tiny-many changed-update 1024//adaptive aws      | ############### 225 MiB
tiny-many pruned-update 1024//adaptive aws       | ############### 221 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 55 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 37 MiB
tiny-many changed-update 1024/32/adaptive shin   | ### 38 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ### 38 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 229 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 229 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 227 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 225 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 69 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 37 MiB
tiny-many changed-update 2048/64/adaptive shin   | ### 38 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ### 38 MiB
```
