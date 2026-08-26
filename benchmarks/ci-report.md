# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-08-26
- Run ID: 673c7141-7632-4cc4-866f-3e5a2dea1ccf
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: shin, aws
- Asset profiles: mixed, tiny-many, large-few
- Memory MiB: 2048, 1024
- Max concurrency: 64, 32
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes |                    Provider duration |                      Local wall time |                    CDK deploy time |                         Max memory |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -----------------------------------: | -----------------------------------: | ---------------------------------: | ---------------------------------: |
| large-few     | cold-create      |       1024 |              32 |            adaptive |   2.258 s vs 9.226 s (4.086x faster) | 86.506 s vs 79.242 s (1.092x slower) |  57.44 s vs 62.62 s (1.09x faster) | 120 MiB vs 448 MiB (73.214% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.315 s vs 9.231 s (29.305x faster) |   35.444 s vs 46.7 s (1.318x faster) |  19.03 s vs 29.88 s (1.57x faster) |  32 MiB vs 448 MiB (92.857% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |   0.606 s vs 9.35 s (15.429x faster) | 42.133 s vs 52.905 s (1.256x faster) | 19.16 s vs 29.97 s (1.564x faster) |  39 MiB vs 447 MiB (91.275% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |   0.63 s vs 8.873 s (14.084x faster) | 42.344 s vs 52.749 s (1.246x faster) | 19.31 s vs 30.08 s (1.558x faster) |  39 MiB vs 417 MiB (90.647% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.249 s vs 5.165 s (4.135x faster) |  74.915 s vs 73.71 s (1.016x slower) |  57.8 s vs 57.26 s (1.009x slower) | 181 MiB vs 448 MiB (59.598% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |   0.24 s vs 5.151 s (21.462x faster) |  35.64 s vs 40.905 s (1.148x faster) | 19.03 s vs 24.51 s (1.288x faster) |  32 MiB vs 447 MiB (92.841% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.546 s vs 5.183 s (9.493x faster) | 41.983 s vs 47.129 s (1.123x faster) | 19.14 s vs 24.47 s (1.278x faster) |  38 MiB vs 448 MiB (91.518% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.569 s vs 4.998 s (8.784x faster) | 48.647 s vs 47.423 s (1.026x slower) | 19.37 s vs 24.61 s (1.271x faster) |   39 MiB vs 418 MiB (90.67% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.394 s vs 9.656 s (6.927x faster) | 72.828 s vs 82.798 s (1.137x faster) |  57.21 s vs 62.8 s (1.098x faster) |  102 MiB vs 282 MiB (63.83% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |   0.3 s vs 10.138 s (33.793x faster) | 35.555 s vs 46.049 s (1.295x faster) | 19.04 s vs 29.86 s (1.568x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |  0.503 s vs 9.973 s (19.827x faster) | 41.584 s vs 52.061 s (1.252x faster) | 19.15 s vs 29.95 s (1.564x faster) |  38 MiB vs 281 MiB (86.477% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |   1.203 s vs 9.538 s (7.929x faster) |  41.62 s vs 52.048 s (1.251x faster) | 19.31 s vs 30.05 s (1.556x faster) |  37 MiB vs 273 MiB (86.447% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |    0.846 s vs 5.685 s (6.72x faster) | 70.397 s vs 73.582 s (1.045x faster) |  52.5 s vs 57.32 s (1.092x faster) | 111 MiB vs 282 MiB (60.638% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |   0.28 s vs 5.846 s (20.879x faster) |  35.65 s vs 40.739 s (1.143x faster) |  19.01 s vs 24.53 s (1.29x faster) |  33 MiB vs 282 MiB (88.298% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.442 s vs 5.823 s (13.174x faster) | 42.473 s vs 46.516 s (1.095x faster) |   19.14 s vs 24.5 s (1.28x faster) |  36 MiB vs 283 MiB (87.279% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.154 s vs 5.864 s (5.081x faster) | 45.488 s vs 46.679 s (1.026x faster) | 19.28 s vs 24.66 s (1.279x faster) |  39 MiB vs 275 MiB (85.818% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |   2.647 s vs 25.172 s (9.51x faster) |  74.31 s vs 95.526 s (1.286x faster) |  57.8 s vs 78.99 s (1.367x faster) |  57 MiB vs 219 MiB (73.973% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.521 s vs 26.026 s (49.954x faster) | 35.501 s vs 67.519 s (1.902x faster) | 18.99 s vs 46.25 s (2.435x faster) |  35 MiB vs 212 MiB (83.491% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.631 s vs 26.078 s (41.328x faster) | 41.628 s vs 72.065 s (1.731x faster) |  19.14 s vs 46.3 s (2.419x faster) |  35 MiB vs 212 MiB (83.491% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | 1.424 s vs 25.211 s (17.704x faster) |  46.129 s vs 68.724 s (1.49x faster) | 19.32 s vs 46.38 s (2.401x faster) |  35 MiB vs 208 MiB (83.173% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.529 s vs 14.849 s (9.712x faster) |  73.92 s vs 84.138 s (1.138x faster) | 57.69 s vs 68.15 s (1.181x faster) |   70 MiB vs 223 MiB (68.61% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive |    0.5 s vs 15.225 s (30.45x faster) | 35.429 s vs 53.546 s (1.511x faster) | 19.01 s vs 35.38 s (1.861x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive |  0.594 s vs 15.31 s (25.774x faster) | 41.502 s vs 57.564 s (1.387x faster) | 19.17 s vs 35.35 s (1.844x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.349 s vs 14.607 s (10.828x faster) | 43.517 s vs 57.947 s (1.332x faster) | 19.31 s vs 35.64 s (1.846x faster) |  35 MiB vs 219 MiB (84.018% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.258 s |              9.226 s |   +6.968 s |   4.086x |   +308.592% |
| Billed duration   |              2.375 s |              9.743 s |   +7.368 s |   4.102x |   +310.232% |
| Init duration     |              0.117 s |              0.504 s |   +0.387 s |   4.308x |   +330.769% |
| Local wall time   |             86.506 s |             79.242 s |   -7.264 s |   0.916x |     -8.397% |
| CDK deploy time   |              57.44 s |              62.62 s |    +5.18 s |    1.09x |     +9.018% |
| Max memory        |              120 MiB |              448 MiB |   +328 MiB |   3.733x |   +273.333% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.315 s |              9.231 s |   +8.916 s |  29.305x |  +2830.476% |
| Billed duration   |              0.428 s |              9.748 s |    +9.32 s |  22.776x |   +2177.57% |
| Init duration     |              0.116 s |              0.516 s |     +0.4 s |   4.448x |   +344.828% |
| Local wall time   |             35.444 s |               46.7 s |  +11.256 s |   1.318x |    +31.757% |
| CDK deploy time   |              19.03 s |              29.88 s |   +10.85 s |    1.57x |    +57.015% |
| Max memory        |               32 MiB |              448 MiB |   +416 MiB |      14x |      +1300% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.606 s |               9.35 s |   +8.744 s |  15.429x |  +1442.904% |
| Billed duration   |              0.702 s |              9.857 s |   +9.155 s |  14.041x |  +1304.131% |
| Init duration     |              0.096 s |              0.515 s |   +0.419 s |   5.365x |   +436.458% |
| Local wall time   |             42.133 s |             52.905 s |  +10.772 s |   1.256x |    +25.567% |
| CDK deploy time   |              19.16 s |              29.97 s |   +10.81 s |   1.564x |     +56.42% |
| Max memory        |               39 MiB |              447 MiB |   +408 MiB |  11.462x |  +1046.154% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.63 s |              8.873 s |   +8.243 s |  14.084x |  +1308.413% |
| Billed duration   |              0.747 s |              9.383 s |   +8.636 s |  12.561x |  +1156.091% |
| Init duration     |              0.117 s |              0.521 s |   +0.404 s |   4.453x |   +345.299% |
| Local wall time   |             42.344 s |             52.749 s |  +10.405 s |   1.246x |    +24.573% |
| CDK deploy time   |              19.31 s |              30.08 s |   +10.77 s |   1.558x |    +55.774% |
| Max memory        |               39 MiB |              417 MiB |   +378 MiB |  10.692x |   +969.231% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.249 s |              5.165 s |   +3.916 s |   4.135x |   +313.531% |
| Billed duration   |              1.364 s |                5.7 s |   +4.336 s |   4.179x |   +317.889% |
| Init duration     |              0.115 s |              0.523 s |   +0.408 s |   4.548x |   +354.783% |
| Local wall time   |             74.915 s |              73.71 s |   -1.205 s |   0.984x |     -1.608% |
| CDK deploy time   |               57.8 s |              57.26 s |    -0.54 s |   0.991x |     -0.934% |
| Max memory        |              181 MiB |              448 MiB |   +267 MiB |   2.475x |   +147.514% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.24 s |              5.151 s |   +4.911 s |  21.462x |   +2046.25% |
| Billed duration   |              0.357 s |              5.666 s |   +5.309 s |  15.871x |  +1487.115% |
| Init duration     |              0.115 s |              0.516 s |   +0.401 s |   4.487x |   +348.696% |
| Local wall time   |              35.64 s |             40.905 s |   +5.265 s |   1.148x |    +14.773% |
| CDK deploy time   |              19.03 s |              24.51 s |    +5.48 s |   1.288x |    +28.797% |
| Max memory        |               32 MiB |              447 MiB |   +415 MiB |  13.969x |  +1296.875% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.546 s |              5.183 s |   +4.637 s |   9.493x |   +849.267% |
| Billed duration   |              0.663 s |              5.694 s |   +5.031 s |   8.588x |   +758.824% |
| Init duration     |              0.118 s |              0.514 s |   +0.396 s |   4.356x |   +335.593% |
| Local wall time   |             41.983 s |             47.129 s |   +5.146 s |   1.123x |    +12.257% |
| CDK deploy time   |              19.14 s |              24.47 s |    +5.33 s |   1.278x |    +27.847% |
| Max memory        |               38 MiB |              448 MiB |   +410 MiB |  11.789x |  +1078.947% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.569 s |              4.998 s |   +4.429 s |   8.784x |   +778.383% |
| Billed duration   |              0.683 s |              5.501 s |   +4.818 s |   8.054x |   +705.417% |
| Init duration     |              0.115 s |              0.503 s |   +0.388 s |   4.374x |   +337.391% |
| Local wall time   |             48.647 s |             47.423 s |   -1.224 s |   0.975x |     -2.516% |
| CDK deploy time   |              19.37 s |              24.61 s |    +5.24 s |   1.271x |    +27.052% |
| Max memory        |               39 MiB |              418 MiB |   +379 MiB |  10.718x |   +971.795% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.394 s |              9.656 s |   +8.262 s |   6.927x |   +592.683% |
| Billed duration   |              1.514 s |             10.161 s |   +8.647 s |   6.711x |   +571.136% |
| Init duration     |               0.12 s |              0.501 s |   +0.381 s |   4.175x |     +317.5% |
| Local wall time   |             72.828 s |             82.798 s |    +9.97 s |   1.137x |     +13.69% |
| CDK deploy time   |              57.21 s |               62.8 s |    +5.59 s |   1.098x |     +9.771% |
| Max memory        |              102 MiB |              282 MiB |   +180 MiB |   2.765x |   +176.471% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |                0.3 s |             10.138 s |   +9.838 s |  33.793x |  +3279.333% |
| Billed duration   |              0.421 s |             10.675 s |  +10.254 s |  25.356x |  +2435.629% |
| Init duration     |               0.12 s |              0.505 s |   +0.385 s |   4.208x |   +320.833% |
| Local wall time   |             35.555 s |             46.049 s |  +10.494 s |   1.295x |    +29.515% |
| CDK deploy time   |              19.04 s |              29.86 s |   +10.82 s |   1.568x |    +56.828% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.503 s |              9.973 s |    +9.47 s |  19.827x |  +1882.704% |
| Billed duration   |              0.625 s |             10.491 s |   +9.866 s |  16.786x |   +1578.56% |
| Init duration     |              0.119 s |              0.514 s |   +0.395 s |   4.319x |   +331.933% |
| Local wall time   |             41.584 s |             52.061 s |  +10.477 s |   1.252x |    +25.195% |
| CDK deploy time   |              19.15 s |              29.95 s |    +10.8 s |   1.564x |    +56.397% |
| Max memory        |               38 MiB |              281 MiB |   +243 MiB |   7.395x |   +639.474% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.203 s |              9.538 s |   +8.335 s |   7.929x |   +692.851% |
| Billed duration   |              1.322 s |             10.056 s |   +8.734 s |   7.607x |   +660.666% |
| Init duration     |              0.118 s |              0.515 s |   +0.397 s |   4.364x |   +336.441% |
| Local wall time   |              41.62 s |             52.048 s |  +10.428 s |   1.251x |    +25.055% |
| CDK deploy time   |              19.31 s |              30.05 s |   +10.74 s |   1.556x |    +55.619% |
| Max memory        |               37 MiB |              273 MiB |   +236 MiB |   7.378x |   +637.838% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.846 s |              5.685 s |   +4.839 s |    6.72x |   +571.986% |
| Billed duration   |              0.967 s |              6.201 s |   +5.234 s |   6.413x |   +541.262% |
| Init duration     |              0.116 s |              0.502 s |   +0.386 s |   4.328x |   +332.759% |
| Local wall time   |             70.397 s |             73.582 s |   +3.185 s |   1.045x |     +4.524% |
| CDK deploy time   |               52.5 s |              57.32 s |    +4.82 s |   1.092x |     +9.181% |
| Max memory        |              111 MiB |              282 MiB |   +171 MiB |   2.541x |   +154.054% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.28 s |              5.846 s |   +5.566 s |  20.879x |  +1987.857% |
| Billed duration   |              0.402 s |              6.376 s |   +5.974 s |  15.861x |   +1486.07% |
| Init duration     |              0.122 s |              0.504 s |   +0.382 s |   4.131x |   +313.115% |
| Local wall time   |              35.65 s |             40.739 s |   +5.089 s |   1.143x |    +14.275% |
| CDK deploy time   |              19.01 s |              24.53 s |    +5.52 s |    1.29x |    +29.037% |
| Max memory        |               33 MiB |              282 MiB |   +249 MiB |   8.545x |   +754.545% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.442 s |              5.823 s |   +5.381 s |  13.174x |  +1217.421% |
| Billed duration   |              0.563 s |              6.353 s |    +5.79 s |  11.284x |  +1028.419% |
| Init duration     |              0.118 s |              0.506 s |   +0.388 s |   4.288x |   +328.814% |
| Local wall time   |             42.473 s |             46.516 s |   +4.043 s |   1.095x |     +9.519% |
| CDK deploy time   |              19.14 s |               24.5 s |    +5.36 s |    1.28x |    +28.004% |
| Max memory        |               36 MiB |              283 MiB |   +247 MiB |   7.861x |   +686.111% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.154 s |              5.864 s |    +4.71 s |   5.081x |   +408.146% |
| Billed duration   |              1.275 s |              6.399 s |   +5.124 s |   5.019x |   +401.882% |
| Init duration     |               0.12 s |              0.501 s |   +0.381 s |   4.175x |     +317.5% |
| Local wall time   |             45.488 s |             46.679 s |   +1.191 s |   1.026x |     +2.618% |
| CDK deploy time   |              19.28 s |              24.66 s |    +5.38 s |   1.279x |    +27.905% |
| Max memory        |               39 MiB |              275 MiB |   +236 MiB |   7.051x |   +605.128% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.647 s |             25.172 s |  +22.525 s |    9.51x |   +850.963% |
| Billed duration   |              2.764 s |             25.683 s |  +22.919 s |   9.292x |   +829.197% |
| Init duration     |              0.116 s |              0.515 s |   +0.399 s |    4.44x |   +343.966% |
| Local wall time   |              74.31 s |             95.526 s |  +21.216 s |   1.286x |    +28.551% |
| CDK deploy time   |               57.8 s |              78.99 s |   +21.19 s |   1.367x |    +36.661% |
| Max memory        |               57 MiB |              219 MiB |   +162 MiB |   3.842x |   +284.211% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.521 s |             26.026 s |  +25.505 s |  49.954x |  +4895.393% |
| Billed duration   |              0.639 s |             26.544 s |  +25.905 s |   41.54x |  +4053.991% |
| Init duration     |              0.116 s |              0.517 s |   +0.401 s |   4.457x |    +345.69% |
| Local wall time   |             35.501 s |             67.519 s |  +32.018 s |   1.902x |    +90.189% |
| CDK deploy time   |              18.99 s |              46.25 s |   +27.26 s |   2.435x |   +143.549% |
| Max memory        |               35 MiB |              212 MiB |   +177 MiB |   6.057x |   +505.714% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.631 s |             26.078 s |  +25.447 s |  41.328x |  +4032.805% |
| Billed duration   |              0.746 s |              26.59 s |  +25.844 s |  35.643x |  +3464.343% |
| Init duration     |              0.119 s |              0.501 s |   +0.382 s |    4.21x |   +321.008% |
| Local wall time   |             41.628 s |             72.065 s |  +30.437 s |   1.731x |    +73.117% |
| CDK deploy time   |              19.14 s |               46.3 s |   +27.16 s |   2.419x |   +141.902% |
| Max memory        |               35 MiB |              212 MiB |   +177 MiB |   6.057x |   +505.714% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.424 s |             25.211 s |  +23.787 s |  17.704x |  +1670.435% |
| Billed duration   |              1.552 s |              25.72 s |  +24.168 s |  16.572x |  +1557.216% |
| Init duration     |              0.118 s |              0.509 s |   +0.391 s |   4.314x |   +331.356% |
| Local wall time   |             46.129 s |             68.724 s |  +22.595 s |    1.49x |    +48.982% |
| CDK deploy time   |              19.32 s |              46.38 s |   +27.06 s |   2.401x |   +140.062% |
| Max memory        |               35 MiB |              208 MiB |   +173 MiB |   5.943x |   +494.286% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.529 s |             14.849 s |   +13.32 s |   9.712x |   +871.158% |
| Billed duration   |              1.643 s |             15.373 s |   +13.73 s |   9.357x |   +835.666% |
| Init duration     |              0.118 s |              0.523 s |   +0.405 s |   4.432x |    +343.22% |
| Local wall time   |              73.92 s |             84.138 s |  +10.218 s |   1.138x |    +13.823% |
| CDK deploy time   |              57.69 s |              68.15 s |   +10.46 s |   1.181x |    +18.131% |
| Max memory        |               70 MiB |              223 MiB |   +153 MiB |   3.186x |   +218.571% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |                0.5 s |             15.225 s |  +14.725 s |   30.45x |      +2945% |
| Billed duration   |                0.6 s |             15.742 s |  +15.142 s |  26.237x |  +2523.667% |
| Init duration     |              0.116 s |              0.517 s |   +0.401 s |   4.457x |    +345.69% |
| Local wall time   |             35.429 s |             53.546 s |  +18.117 s |   1.511x |    +51.136% |
| CDK deploy time   |              19.01 s |              35.38 s |   +16.37 s |   1.861x |    +86.113% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.594 s |              15.31 s |  +14.716 s |  25.774x |  +2477.441% |
| Billed duration   |              0.713 s |             15.822 s |  +15.109 s |  22.191x |  +2119.074% |
| Init duration     |              0.123 s |              0.507 s |   +0.384 s |   4.122x |   +312.195% |
| Local wall time   |             41.502 s |             57.564 s |  +16.062 s |   1.387x |    +38.702% |
| CDK deploy time   |              19.17 s |              35.35 s |   +16.18 s |   1.844x |    +84.403% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.349 s |             14.607 s |  +13.258 s |  10.828x |   +982.802% |
| Billed duration   |              1.469 s |             15.124 s |  +13.655 s |  10.295x |   +929.544% |
| Init duration     |              0.117 s |              0.507 s |    +0.39 s |   4.333x |   +333.333% |
| Local wall time   |             43.517 s |             57.947 s |   +14.43 s |   1.332x |    +33.159% |
| CDK deploy time   |              19.31 s |              35.64 s |   +16.33 s |   1.846x |    +84.568% |
| Max memory        |               35 MiB |              219 MiB |   +184 MiB |   6.257x |   +525.714% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.226 |  8.832 |  9.238 |   0.406 |   8.745 |   9.452 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.231 |  9.049 |  9.521 |   0.472 |   9.028 |   9.618 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |       9.35 |  9.142 |  9.425 |   0.283 |   9.026 |     9.5 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.873 |  8.813 |  8.962 |   0.149 |   8.677 |   8.989 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.258 |  2.254 |  2.453 |   0.199 |   2.157 |    2.48 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.315 |  0.288 |  0.316 |   0.028 |   0.237 |   0.327 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.606 |  0.549 |  0.607 |   0.058 |   0.546 |    0.61 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |       0.63 |  0.625 |  0.641 |   0.016 |     0.5 |   0.678 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.165 |  5.153 |  5.236 |   0.083 |   5.124 |    5.32 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.151 |  5.141 |  5.163 |   0.022 |    5.12 |   5.267 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.183 |  5.169 |  5.189 |    0.02 |   5.145 |   5.905 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.998 |  4.862 |  5.052 |    0.19 |   4.852 |    5.22 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.249 |  1.225 |  1.261 |   0.036 |   1.057 |   1.349 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.24 |  0.232 |  0.253 |   0.021 |   0.227 |   0.265 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.546 |  0.541 |  0.552 |   0.011 |   0.492 |   0.579 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.569 |  0.566 |  0.569 |   0.003 |   0.492 |   0.589 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.656 |  9.391 | 10.403 |   1.012 |   9.181 |  10.617 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.138 |  9.845 | 10.187 |   0.342 |   9.543 |  10.212 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.973 |  9.838 | 10.111 |   0.273 |   9.757 |  11.326 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.538 |  9.521 |   9.58 |   0.059 |   9.458 |   9.651 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.394 |  1.099 |  1.455 |   0.356 |   1.082 |   1.463 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |        0.3 |  0.297 |  0.318 |   0.021 |   0.274 |    0.32 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.503 |  0.494 |  0.506 |   0.012 |   0.399 |   0.552 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.203 |  1.174 |  1.304 |    0.13 |   1.103 |   1.307 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.685 |  5.627 |  5.709 |   0.082 |     5.6 |   6.134 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.846 |  5.735 |   6.49 |   0.755 |   5.711 |   6.499 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.823 |  5.817 |  5.853 |   0.036 |   5.697 |   6.501 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.864 |  5.787 |  6.247 |    0.46 |   5.545 |   6.313 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.846 |  0.827 |    0.9 |   0.073 |    0.73 |   0.951 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.28 |  0.279 |  0.282 |   0.003 |   0.256 |   0.292 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.442 |  0.415 |  0.469 |   0.054 |   0.402 |   0.476 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.154 |  1.137 |  1.168 |   0.031 |   1.085 |   1.201 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.172 | 23.929 | 26.175 |   2.246 |  23.242 |   28.29 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.026 | 25.689 |  26.21 |   0.521 |  25.646 |  26.727 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.078 | 25.442 | 26.469 |   1.027 |  23.684 |  26.695 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     25.211 | 25.203 | 25.488 |   0.285 |  24.866 |  26.468 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.647 |  2.606 |  2.673 |   0.067 |   2.489 |    2.72 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.521 |  0.515 |  0.523 |   0.008 |   0.479 |   0.574 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.631 |  0.614 |  0.744 |    0.13 |   0.605 |    0.75 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.424 |   1.38 |  1.472 |   0.092 |   1.356 |   1.509 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.849 | 14.815 | 15.281 |   0.466 |  14.809 |  15.336 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.225 | 15.001 |   15.3 |   0.299 |  14.239 |  15.743 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      15.31 | 15.051 | 15.451 |     0.4 |  14.999 |  18.123 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.607 | 14.399 | 16.923 |   2.524 |  14.363 |  17.004 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.529 |  1.514 |   1.54 |   0.026 |   1.425 |   1.589 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |        0.5 |  0.497 |  0.508 |   0.011 |   0.399 |   0.556 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.594 |  0.592 |  0.621 |   0.029 |   0.573 |   0.652 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.349 |  1.344 |   1.35 |   0.006 |   1.256 |   1.413 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.226 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.231 s
large-few changed-update 1024//adaptive aws      | ########### 9.35 s
large-few pruned-update 1024//adaptive aws       | ########## 8.873 s
large-few cold-create 1024/32/adaptive shin      | ### 2.258 s
large-few unchanged-update 1024/32/adaptive shin | # 0.315 s
large-few changed-update 1024/32/adaptive shin   | # 0.606 s
large-few pruned-update 1024/32/adaptive shin    | # 0.63 s
large-few cold-create 2048//adaptive aws         | ###### 5.165 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.151 s
large-few changed-update 2048//adaptive aws      | ###### 5.183 s
large-few pruned-update 2048//adaptive aws       | ###### 4.998 s
large-few cold-create 2048/64/adaptive shin      | # 1.249 s
large-few unchanged-update 2048/64/adaptive shin | # 0.24 s
large-few changed-update 2048/64/adaptive shin   | # 0.546 s
large-few pruned-update 2048/64/adaptive shin    | # 0.569 s
mixed cold-create 1024//adaptive aws             | ########### 9.656 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.138 s
mixed changed-update 1024//adaptive aws          | ########### 9.973 s
mixed pruned-update 1024//adaptive aws           | ########### 9.538 s
mixed cold-create 1024/32/adaptive shin          | ## 1.394 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.3 s
mixed changed-update 1024/32/adaptive shin       | # 0.503 s
mixed pruned-update 1024/32/adaptive shin        | # 1.203 s
mixed cold-create 2048//adaptive aws             | ####### 5.685 s
mixed unchanged-update 2048//adaptive aws        | ####### 5.846 s
mixed changed-update 2048//adaptive aws          | ####### 5.823 s
mixed pruned-update 2048//adaptive aws           | ####### 5.864 s
mixed cold-create 2048/64/adaptive shin          | # 0.846 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.28 s
mixed changed-update 2048/64/adaptive shin       | # 0.442 s
mixed pruned-update 2048/64/adaptive shin        | # 1.154 s
tiny-many cold-create 1024//adaptive aws         | ############################# 25.172 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 26.026 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.078 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 25.211 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.647 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.521 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.631 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.424 s
tiny-many cold-create 2048//adaptive aws         | ################# 14.849 s
tiny-many unchanged-update 2048//adaptive aws    | ################## 15.225 s
tiny-many changed-update 2048//adaptive aws      | ################## 15.31 s
tiny-many pruned-update 2048//adaptive aws       | ################# 14.607 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.529 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.5 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.594 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.349 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.743 |  9.323 |  9.744 |   0.421 |   9.188 |    9.98 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.748 |  9.544 | 10.037 |   0.493 |   9.536 |  10.147 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.857 |  9.658 |  9.986 |   0.328 |   9.478 |  10.025 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.383 |  9.324 |  9.498 |   0.174 |   9.198 |   9.536 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.375 |  2.371 |  2.571 |     0.2 |    2.31 |   2.595 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.428 |  0.413 |  0.433 |    0.02 |   0.354 |   0.446 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.702 |  0.646 |  0.725 |   0.079 |    0.64 |   0.727 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.747 |  0.746 |  0.763 |   0.017 |   0.615 |   0.796 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |        5.7 |  5.664 |  5.759 |   0.095 |    5.65 |   5.843 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.666 |  5.648 |  5.674 |   0.026 |   5.647 |   5.783 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.694 |  5.694 |  5.704 |    0.01 |    5.67 |   6.315 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.501 |  5.361 |  5.573 |   0.212 |   5.355 |    5.74 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.364 |  1.341 |  1.385 |   0.044 |   1.154 |   1.503 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.357 |  0.339 |  0.368 |   0.029 |   0.329 |   0.393 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.663 |  0.658 |   0.67 |   0.012 |   0.611 |   0.706 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.683 |  0.666 |  0.705 |   0.039 |   0.616 |   0.713 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.161 |  9.883 | 10.957 |   1.074 |   9.683 |   11.03 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.675 | 10.351 | 10.717 |   0.366 |  10.045 |  10.754 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.491 | 10.333 |  10.63 |   0.297 |  10.272 |  11.734 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.056 | 10.045 | 10.113 |   0.068 |   9.973 |  10.156 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.514 |  1.192 |   1.58 |   0.388 |   1.176 |   1.612 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.421 |  0.413 |  0.438 |   0.025 |   0.369 |   0.468 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.625 |  0.612 |  0.657 |   0.045 |   0.517 |   0.676 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.322 |  1.301 |  1.418 |   0.117 |   1.199 |   1.425 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.201 |  6.129 |  6.212 |   0.083 |   6.112 |   6.543 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.376 |  6.256 |  6.931 |   0.675 |   6.216 |   6.943 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.353 |  6.324 |   6.37 |   0.046 |   6.196 |   6.942 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.399 |  6.321 |  6.656 |   0.335 |   6.047 |   6.762 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.967 |  0.943 |  1.025 |   0.082 |   0.828 |   1.063 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.402 |  0.397 |   0.41 |   0.013 |   0.381 |    0.43 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.563 |  0.533 |  0.566 |   0.033 |   0.517 |   0.595 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.275 |  1.263 |  1.282 |   0.019 |   1.198 |   1.351 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.683 | 24.446 | 26.694 |   2.248 |  23.758 |  28.716 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.544 | 26.203 | 26.717 |   0.514 |  26.165 |  27.262 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      26.59 | 25.943 | 26.971 |   1.028 |  24.131 |  27.231 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      25.72 | 25.713 | 26.004 |   0.291 |  25.369 |  26.989 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.764 |  2.725 |  2.787 |   0.062 |   2.606 |   2.841 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.639 |  0.635 |  0.672 |   0.037 |   0.592 |    0.69 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.746 |  0.733 |  0.866 |   0.133 |   0.728 |   0.893 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.552 |    1.5 |  1.591 |   0.091 |   1.475 |   1.625 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.373 | 15.349 | 15.797 |   0.448 |  15.332 |  15.869 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.742 | 15.519 | 15.823 |   0.304 |  14.722 |  16.306 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.822 | 15.558 | 15.976 |   0.418 |  15.496 |  18.559 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.124 | 14.913 | 17.351 |   2.438 |   14.87 |  17.431 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.643 |  1.633 |  1.663 |    0.03 |   1.524 |   1.708 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |        0.6 |  0.591 |  0.626 |   0.035 |   0.515 |   0.707 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.713 |  0.707 |  0.768 |   0.061 |   0.696 |   0.801 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.469 |  1.467 |   1.47 |   0.003 |   1.373 |    1.51 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.743 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.748 s
large-few changed-update 1024//adaptive aws      | ########### 9.857 s
large-few pruned-update 1024//adaptive aws       | ########### 9.383 s
large-few cold-create 1024/32/adaptive shin      | ### 2.375 s
large-few unchanged-update 1024/32/adaptive shin | # 0.428 s
large-few changed-update 1024/32/adaptive shin   | # 0.702 s
large-few pruned-update 1024/32/adaptive shin    | # 0.747 s
large-few cold-create 2048//adaptive aws         | ###### 5.7 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.666 s
large-few changed-update 2048//adaptive aws      | ###### 5.694 s
large-few pruned-update 2048//adaptive aws       | ###### 5.501 s
large-few cold-create 2048/64/adaptive shin      | ## 1.364 s
large-few unchanged-update 2048/64/adaptive shin | # 0.357 s
large-few changed-update 2048/64/adaptive shin   | # 0.663 s
large-few pruned-update 2048/64/adaptive shin    | # 0.683 s
mixed cold-create 1024//adaptive aws             | ########### 10.161 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.675 s
mixed changed-update 1024//adaptive aws          | ############ 10.491 s
mixed pruned-update 1024//adaptive aws           | ########### 10.056 s
mixed cold-create 1024/32/adaptive shin          | ## 1.514 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.421 s
mixed changed-update 1024/32/adaptive shin       | # 0.625 s
mixed pruned-update 1024/32/adaptive shin        | # 1.322 s
mixed cold-create 2048//adaptive aws             | ####### 6.201 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.376 s
mixed changed-update 2048//adaptive aws          | ####### 6.353 s
mixed pruned-update 2048//adaptive aws           | ####### 6.399 s
mixed cold-create 2048/64/adaptive shin          | # 0.967 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.402 s
mixed changed-update 2048/64/adaptive shin       | # 0.563 s
mixed pruned-update 2048/64/adaptive shin        | # 1.275 s
tiny-many cold-create 1024//adaptive aws         | ############################# 25.683 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 26.544 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.59 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 25.72 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.764 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.639 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.746 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.552 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.373 s
tiny-many unchanged-update 2048//adaptive aws    | ################## 15.742 s
tiny-many changed-update 2048//adaptive aws      | ################## 15.822 s
tiny-many pruned-update 2048//adaptive aws       | ################# 15.124 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.643 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.6 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.713 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.469 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.504 |  0.491 |  0.517 |   0.026 |   0.442 |   0.527 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.516 |  0.507 |  0.517 |    0.01 |   0.495 |   0.529 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.507 |  0.525 |   0.018 |   0.452 |   0.561 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.521 |  0.511 |  0.536 |   0.025 |   0.509 |   0.546 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.117 |   0.001 |   0.114 |   0.152 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.112 |  0.118 |   0.006 |   0.096 |   0.145 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.096 |  0.096 |  0.116 |    0.02 |   0.094 |   0.118 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.121 |   0.005 |   0.115 |   0.121 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.523 |  0.522 |  0.525 |   0.003 |    0.51 |   0.535 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.516 |  0.507 |  0.522 |   0.015 |   0.503 |   0.526 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.514 |   0.51 |  0.525 |   0.015 |    0.41 |   0.525 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.503 |  0.503 |   0.52 |   0.017 |   0.499 |   0.521 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.115 |  0.115 |  0.123 |   0.008 |   0.096 |   0.154 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.115 |  0.112 |  0.117 |   0.005 |   0.096 |   0.127 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.119 |   0.003 |   0.116 |   0.127 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.115 |  0.113 |  0.123 |    0.01 |   0.097 |   0.147 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.501 |  0.492 |  0.504 |   0.012 |   0.412 |   0.553 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.505 |  0.505 |  0.536 |   0.031 |   0.502 |   0.566 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.514 |  0.495 |  0.518 |   0.023 |   0.407 |   0.518 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.507 |  0.532 |   0.025 |   0.504 |   0.534 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.094 |  0.125 |   0.031 |   0.093 |   0.149 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.113 |  0.124 |   0.011 |   0.095 |   0.148 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.123 |   0.005 |   0.118 |   0.154 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.114 |  0.119 |   0.005 |   0.095 |   0.127 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.502 |  0.501 |  0.511 |    0.01 |   0.409 |   0.516 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.504 |  0.443 |  0.521 |   0.078 |    0.44 |   0.529 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.506 |  0.498 |  0.517 |   0.019 |    0.44 |   0.529 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.501 |  0.448 |  0.534 |   0.086 |   0.409 |   0.534 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.112 |  0.121 |   0.009 |   0.098 |   0.124 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.117 |  0.125 |   0.008 |   0.115 |   0.149 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.115 |  0.119 |   0.004 |   0.097 |    0.12 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.114 |  0.126 |   0.012 |   0.113 |    0.15 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.511 |  0.516 |   0.005 |   0.425 |   0.518 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.517 |  0.513 |  0.518 |   0.005 |   0.506 |   0.535 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.501 |  0.501 |  0.512 |   0.011 |   0.447 |   0.536 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.509 |  0.508 |  0.515 |   0.007 |   0.503 |   0.521 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.119 |   0.003 |   0.114 |   0.121 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.115 |   0.12 |   0.005 |   0.112 |   0.151 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.115 |  0.123 |   0.008 |   0.114 |   0.148 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.119 |   0.001 |   0.115 |   0.127 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.523 |  0.516 |  0.532 |   0.016 |   0.516 |    0.54 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.517 |  0.517 |  0.522 |   0.005 |   0.482 |   0.563 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.507 |  0.496 |  0.511 |   0.015 |   0.436 |   0.524 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.507 |  0.427 |  0.513 |   0.086 |   0.427 |   0.516 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.113 |  0.118 |   0.005 |   0.099 |   0.123 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |    0.1 |  0.117 |   0.017 |   0.094 |   0.151 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.123 |  0.118 |  0.146 |   0.028 |   0.114 |   0.148 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.117 |   0.12 |   0.003 |   0.096 |   0.125 |

```text
large-few cold-create 1024//adaptive aws         | ############################# 0.504 s
large-few unchanged-update 1024//adaptive aws    | ############################## 0.516 s
large-few changed-update 1024//adaptive aws      | ############################## 0.515 s
large-few pruned-update 1024//adaptive aws       | ############################## 0.521 s
large-few cold-create 1024/32/adaptive shin      | ####### 0.117 s
large-few unchanged-update 1024/32/adaptive shin | ####### 0.116 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.096 s
large-few pruned-update 1024/32/adaptive shin    | ####### 0.117 s
large-few cold-create 2048//adaptive aws         | ############################## 0.523 s
large-few unchanged-update 2048//adaptive aws    | ############################## 0.516 s
large-few changed-update 2048//adaptive aws      | ############################# 0.514 s
large-few pruned-update 2048//adaptive aws       | ############################# 0.503 s
large-few cold-create 2048/64/adaptive shin      | ####### 0.115 s
large-few unchanged-update 2048/64/adaptive shin | ####### 0.115 s
large-few changed-update 2048/64/adaptive shin   | ####### 0.118 s
large-few pruned-update 2048/64/adaptive shin    | ####### 0.115 s
mixed cold-create 1024//adaptive aws             | ############################# 0.501 s
mixed unchanged-update 1024//adaptive aws        | ############################# 0.505 s
mixed changed-update 1024//adaptive aws          | ############################# 0.514 s
mixed pruned-update 1024//adaptive aws           | ############################## 0.515 s
mixed cold-create 1024/32/adaptive shin          | ####### 0.12 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 0.12 s
mixed changed-update 1024/32/adaptive shin       | ####### 0.119 s
mixed pruned-update 1024/32/adaptive shin        | ####### 0.118 s
mixed cold-create 2048//adaptive aws             | ############################# 0.502 s
mixed unchanged-update 2048//adaptive aws        | ############################# 0.504 s
mixed changed-update 2048//adaptive aws          | ############################# 0.506 s
mixed pruned-update 2048//adaptive aws           | ############################# 0.501 s
mixed cold-create 2048/64/adaptive shin          | ####### 0.116 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 0.122 s
mixed changed-update 2048/64/adaptive shin       | ####### 0.118 s
mixed pruned-update 2048/64/adaptive shin        | ####### 0.12 s
tiny-many cold-create 1024//adaptive aws         | ############################## 0.515 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 0.517 s
tiny-many changed-update 1024//adaptive aws      | ############################# 0.501 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 0.509 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.116 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 0.116 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 0.119 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 0.118 s
tiny-many cold-create 2048//adaptive aws         | ############################## 0.523 s
tiny-many unchanged-update 2048//adaptive aws    | ############################## 0.517 s
tiny-many changed-update 2048//adaptive aws      | ############################# 0.507 s
tiny-many pruned-update 2048//adaptive aws       | ############################# 0.507 s
tiny-many cold-create 2048/64/adaptive shin      | ####### 0.118 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 0.116 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 0.123 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 0.117 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     79.242 | 79.216 | 80.125 |   0.909 |  78.941 |  81.801 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       46.7 | 46.004 | 46.782 |   0.778 |  45.972 |   56.92 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     52.905 | 52.791 | 57.642 |   4.851 |   47.78 |  62.588 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     52.749 | 52.726 | 52.796 |    0.07 |  50.425 |  61.856 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     86.506 | 83.434 | 88.769 |   5.335 |  74.381 |  89.813 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     35.444 | 35.414 | 35.594 |    0.18 |  35.413 |  41.865 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     42.133 | 36.979 | 42.415 |   5.436 |  36.657 |  42.533 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     42.344 | 37.658 | 42.562 |   4.904 |  36.927 |  43.195 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      73.71 | 73.666 | 73.713 |   0.047 |  73.368 |  73.958 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     40.905 | 40.758 | 51.643 |  10.885 |  40.663 |  52.781 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     47.129 | 47.085 | 47.149 |   0.064 |  46.591 |  52.155 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     47.423 | 47.389 | 47.507 |   0.118 |  47.281 |  47.568 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     74.915 | 74.629 | 75.445 |   0.816 |  69.182 |  85.916 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      35.64 | 35.425 |   35.7 |   0.275 |  35.401 |   45.04 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     41.983 | 41.792 | 42.449 |   0.657 |  36.502 |  58.724 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     48.647 | 42.474 | 54.974 |    12.5 |  42.332 |  55.899 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     82.798 | 79.928 | 83.327 |   3.399 |  78.745 |   88.27 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     46.049 | 45.883 |  46.13 |   0.247 |   45.28 |  46.272 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     52.061 | 51.994 | 52.402 |   0.408 |  51.887 |  53.048 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     52.048 |   46.8 | 52.211 |   5.411 |  46.756 |  52.231 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     72.828 | 70.695 | 75.907 |   5.212 |    68.6 |  80.296 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     35.555 | 35.285 | 35.907 |   0.622 |  35.182 |  35.986 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     41.584 | 40.856 | 41.623 |   0.767 |  36.193 |  42.094 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      41.62 | 41.503 | 41.693 |    0.19 |  37.864 |  41.749 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     73.582 | 73.238 | 78.537 |   5.299 |  73.133 |  79.541 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     40.739 | 40.679 |  40.89 |   0.211 |  40.614 |  43.825 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     46.516 | 41.243 |  46.52 |   5.277 |  40.996 |  46.572 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     46.679 | 46.678 | 46.697 |   0.019 |  41.379 |  46.791 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.397 | 68.336 | 73.178 |   4.842 |  68.152 |  78.874 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      35.65 | 35.574 | 35.666 |   0.092 |  35.139 |  36.199 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     42.473 |  41.28 | 45.792 |   4.512 |  41.151 |  46.157 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     45.488 | 41.681 |  46.51 |   4.829 |  41.643 |  47.023 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     95.526 | 95.304 | 95.738 |   0.434 |  95.182 | 100.965 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     67.519 | 66.644 | 67.664 |    1.02 |  63.897 |  69.085 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     72.065 | 68.633 | 72.924 |   4.291 |  68.207 |  74.382 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     68.724 | 68.441 | 68.793 |   0.352 |  66.109 |  69.177 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      74.31 | 73.846 | 74.322 |   0.476 |  73.807 |  74.569 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     35.501 | 35.471 | 35.917 |   0.446 |  35.345 |   46.07 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     41.628 | 41.596 | 41.764 |   0.168 |  41.542 |  42.322 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     46.129 | 41.572 | 47.256 |   5.684 |  36.261 |  48.166 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     84.138 | 84.088 | 87.769 |   3.681 |  84.018 |  89.688 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     53.546 | 51.653 | 54.025 |   2.372 |  51.579 |  56.974 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     57.564 | 57.548 |  57.62 |   0.072 |  57.253 |  61.711 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     57.947 | 57.922 | 63.282 |    5.36 |  57.761 |  63.333 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      73.92 | 73.749 |  74.05 |   0.301 |  70.885 |  83.762 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     35.429 | 35.337 | 35.776 |   0.439 |  35.181 |  37.761 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     41.502 | 38.779 | 41.893 |   3.114 |  36.917 |  42.144 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     43.517 | 42.091 | 46.737 |   4.646 |  41.864 |  49.177 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 79.242 s
large-few unchanged-update 1024//adaptive aws    | ############### 46.7 s
large-few changed-update 1024//adaptive aws      | ################# 52.905 s
large-few pruned-update 1024//adaptive aws       | ################# 52.749 s
large-few cold-create 1024/32/adaptive shin      | ########################### 86.506 s
large-few unchanged-update 1024/32/adaptive shin | ########### 35.444 s
large-few changed-update 1024/32/adaptive shin   | ############# 42.133 s
large-few pruned-update 1024/32/adaptive shin    | ############# 42.344 s
large-few cold-create 2048//adaptive aws         | ####################### 73.71 s
large-few unchanged-update 2048//adaptive aws    | ############# 40.905 s
large-few changed-update 2048//adaptive aws      | ############### 47.129 s
large-few pruned-update 2048//adaptive aws       | ############### 47.423 s
large-few cold-create 2048/64/adaptive shin      | ######################## 74.915 s
large-few unchanged-update 2048/64/adaptive shin | ########### 35.64 s
large-few changed-update 2048/64/adaptive shin   | ############# 41.983 s
large-few pruned-update 2048/64/adaptive shin    | ############### 48.647 s
mixed cold-create 1024//adaptive aws             | ########################## 82.798 s
mixed unchanged-update 1024//adaptive aws        | ############## 46.049 s
mixed changed-update 1024//adaptive aws          | ################ 52.061 s
mixed pruned-update 1024//adaptive aws           | ################ 52.048 s
mixed cold-create 1024/32/adaptive shin          | ####################### 72.828 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 35.555 s
mixed changed-update 1024/32/adaptive shin       | ############# 41.584 s
mixed pruned-update 1024/32/adaptive shin        | ############# 41.62 s
mixed cold-create 2048//adaptive aws             | ####################### 73.582 s
mixed unchanged-update 2048//adaptive aws        | ############# 40.739 s
mixed changed-update 2048//adaptive aws          | ############### 46.516 s
mixed pruned-update 2048//adaptive aws           | ############### 46.679 s
mixed cold-create 2048/64/adaptive shin          | ###################### 70.397 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 35.65 s
mixed changed-update 2048/64/adaptive shin       | ############# 42.473 s
mixed pruned-update 2048/64/adaptive shin        | ############## 45.488 s
tiny-many cold-create 1024//adaptive aws         | ############################## 95.526 s
tiny-many unchanged-update 1024//adaptive aws    | ##################### 67.519 s
tiny-many changed-update 1024//adaptive aws      | ####################### 72.065 s
tiny-many pruned-update 1024//adaptive aws       | ###################### 68.724 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 74.31 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 35.501 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 41.628 s
tiny-many pruned-update 1024/32/adaptive shin    | ############## 46.129 s
tiny-many cold-create 2048//adaptive aws         | ########################## 84.138 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 53.546 s
tiny-many changed-update 2048//adaptive aws      | ################## 57.564 s
tiny-many pruned-update 2048//adaptive aws       | ################## 57.947 s
tiny-many cold-create 2048/64/adaptive shin      | ####################### 73.92 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 35.429 s
tiny-many changed-update 2048/64/adaptive shin   | ############# 41.502 s
tiny-many pruned-update 2048/64/adaptive shin    | ############## 43.517 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      62.62 |  62.59 |   62.7 |    0.11 |   62.55 |   62.83 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.88 |  29.87 |  30.01 |    0.14 |   29.83 |   30.03 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.97 |  29.91 |  29.97 |    0.06 |   29.88 |   34.92 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.08 |  30.01 |  30.13 |    0.12 |   30.01 |   30.15 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.44 |  57.18 |  57.74 |    0.56 |    55.9 |   57.78 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.03 |  19.01 |  19.03 |    0.02 |   18.99 |   19.16 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.16 |  19.15 |  19.16 |    0.01 |   19.13 |    19.2 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.31 |   19.3 |  19.32 |    0.02 |   19.27 |   19.36 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.26 |  57.22 |  57.27 |    0.05 |   57.12 |   57.27 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.51 |  24.48 |   24.6 |    0.12 |   24.47 |   35.35 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.47 |  24.43 |   24.6 |    0.17 |   24.41 |   29.52 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.61 |  24.54 |  24.67 |    0.13 |   24.53 |   24.69 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       57.8 |  57.65 |  57.82 |    0.17 |   52.47 |   57.85 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.03 |  19.01 |  19.06 |    0.05 |   19.01 |   19.12 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.14 |  19.13 |  19.16 |    0.03 |   19.11 |   19.24 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.37 |   19.3 |  19.41 |    0.11 |   19.26 |   19.42 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |       62.8 |  62.76 |  65.69 |    2.93 |   62.63 |   71.46 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.86 |  29.82 |   29.9 |    0.08 |   28.99 |   29.99 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.95 |  29.88 |  29.96 |    0.08 |   29.86 |   29.98 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.05 |  30.03 |  30.06 |    0.03 |   29.91 |   30.18 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.21 |  54.85 |  57.78 |    2.93 |   52.31 |   57.86 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.04 |  19.02 |  19.05 |    0.03 |      19 |   19.08 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.15 |  19.15 |  19.16 |    0.01 |   19.13 |   19.26 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.31 |  19.28 |  19.33 |    0.05 |   19.26 |   19.34 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.32 |   57.3 |  62.61 |    5.31 |   57.23 |   63.51 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.53 |  24.51 |  24.55 |    0.04 |    24.5 |   24.55 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       24.5 |  24.49 |  24.52 |    0.03 |   24.45 |   24.54 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.66 |  24.65 |  24.67 |    0.02 |   24.64 |   24.68 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       52.5 |  52.31 |  52.54 |    0.23 |   51.76 |   57.02 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.01 |  18.99 |  19.01 |    0.02 |   18.96 |   19.09 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.14 |  19.14 |  19.16 |    0.02 |   19.12 |   19.18 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.28 |   19.2 |  19.32 |    0.12 |   19.18 |    19.4 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      78.99 |  78.96 |  79.79 |    0.83 |   78.96 |   84.45 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      46.25 |  46.18 |  51.22 |    5.04 |   46.04 |   51.61 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |       46.3 |  46.27 |  46.36 |    0.09 |    46.2 |   50.75 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      46.38 |  46.36 |   46.5 |    0.14 |   46.34 |   48.59 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       57.8 |  57.76 |  57.86 |     0.1 |   57.66 |    57.9 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.99 |  18.98 |     19 |    0.02 |   18.94 |   19.06 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.14 |  19.14 |  19.17 |    0.03 |    19.1 |   19.21 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.32 |  19.31 |  19.33 |    0.02 |   19.23 |   19.36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      68.15 |  68.09 |  68.16 |    0.07 |   68.07 |   71.64 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      35.38 |  35.32 |  35.41 |    0.09 |   35.31 |   37.24 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      35.35 |  35.32 |  35.41 |    0.09 |   35.29 |   35.49 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      35.64 |  35.53 |  35.74 |    0.21 |   35.45 |   40.98 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      57.69 |  57.37 |  57.81 |    0.44 |   51.81 |   57.87 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.01 |  18.99 |  19.05 |    0.06 |   18.97 |   19.74 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.17 |  19.17 |  19.18 |    0.01 |   19.13 |   19.18 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.31 |  19.29 |  19.54 |    0.25 |   19.29 |   24.46 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 62.62 s
large-few unchanged-update 1024//adaptive aws    | ########### 29.88 s
large-few changed-update 1024//adaptive aws      | ########### 29.97 s
large-few pruned-update 1024//adaptive aws       | ########### 30.08 s
large-few cold-create 1024/32/adaptive shin      | ###################### 57.44 s
large-few unchanged-update 1024/32/adaptive shin | ####### 19.03 s
large-few changed-update 1024/32/adaptive shin   | ####### 19.16 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.31 s
large-few cold-create 2048//adaptive aws         | ###################### 57.26 s
large-few unchanged-update 2048//adaptive aws    | ######### 24.51 s
large-few changed-update 2048//adaptive aws      | ######### 24.47 s
large-few pruned-update 2048//adaptive aws       | ######### 24.61 s
large-few cold-create 2048/64/adaptive shin      | ###################### 57.8 s
large-few unchanged-update 2048/64/adaptive shin | ####### 19.03 s
large-few changed-update 2048/64/adaptive shin   | ####### 19.14 s
large-few pruned-update 2048/64/adaptive shin    | ####### 19.37 s
mixed cold-create 1024//adaptive aws             | ######################## 62.8 s
mixed unchanged-update 1024//adaptive aws        | ########### 29.86 s
mixed changed-update 1024//adaptive aws          | ########### 29.95 s
mixed pruned-update 1024//adaptive aws           | ########### 30.05 s
mixed cold-create 1024/32/adaptive shin          | ###################### 57.21 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 19.04 s
mixed changed-update 1024/32/adaptive shin       | ####### 19.15 s
mixed pruned-update 1024/32/adaptive shin        | ####### 19.31 s
mixed cold-create 2048//adaptive aws             | ###################### 57.32 s
mixed unchanged-update 2048//adaptive aws        | ######### 24.53 s
mixed changed-update 2048//adaptive aws          | ######### 24.5 s
mixed pruned-update 2048//adaptive aws           | ######### 24.66 s
mixed cold-create 2048/64/adaptive shin          | #################### 52.5 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 19.01 s
mixed changed-update 2048/64/adaptive shin       | ####### 19.14 s
mixed pruned-update 2048/64/adaptive shin        | ####### 19.28 s
tiny-many cold-create 1024//adaptive aws         | ############################## 78.99 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 46.25 s
tiny-many changed-update 1024//adaptive aws      | ################## 46.3 s
tiny-many pruned-update 1024//adaptive aws       | ################## 46.38 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 57.8 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.99 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.14 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 19.32 s
tiny-many cold-create 2048//adaptive aws         | ########################## 68.15 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 35.38 s
tiny-many changed-update 2048//adaptive aws      | ############# 35.35 s
tiny-many pruned-update 2048//adaptive aws       | ############## 35.64 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 57.69 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 19.01 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 19.17 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 19.31 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          448 |      447 |      448 |         1 |       447 |       448 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          448 |      448 |      448 |         0 |       446 |       448 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      448 |         1 |       447 |       448 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      416 |      418 |         2 |       416 |       418 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          120 |      119 |      128 |         9 |       117 |       128 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        32 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        41 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        38 |        41 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          448 |      448 |      448 |         0 |       447 |       448 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      448 |         1 |       447 |       448 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          448 |      448 |      448 |         0 |       448 |       448 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          418 |      417 |      418 |         1 |       414 |       418 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          181 |      177 |      186 |         9 |       167 |       189 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        32 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       40 |         2 |        37 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       38 |       39 |         1 |        38 |        40 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       281 |       282 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       281 |       282 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       281 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       273 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          102 |       99 |      102 |         3 |        98 |       106 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       32 |       34 |         2 |        32 |        34 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           38 |       37 |       39 |         2 |        36 |        39 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       36 |       37 |         1 |        36 |        37 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       282 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       282 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      274 |      275 |         1 |       273 |       275 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          111 |      107 |      114 |         7 |       107 |       118 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        32 |        34 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       39 |         3 |        36 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        38 |        40 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      220 |         1 |       219 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          212 |      211 |      218 |         7 |       211 |       221 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          212 |      212 |      213 |         1 |       211 |       217 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          208 |      208 |      209 |         1 |       207 |       212 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           57 |       56 |       57 |         1 |        56 |        59 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       36 |         1 |        35 |        37 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      223 |         0 |       223 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       221 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       220 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      218 |      219 |         1 |       217 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           70 |       68 |       71 |         3 |        63 |        75 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 448 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 448 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 120 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 32 MiB
large-few changed-update 1024/32/adaptive shin   | ### 39 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 39 MiB
large-few cold-create 2048//adaptive aws         | ############################## 448 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 448 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 418 MiB
large-few cold-create 2048/64/adaptive shin      | ############ 181 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 32 MiB
large-few changed-update 2048/64/adaptive shin   | ### 38 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 39 MiB
mixed cold-create 1024//adaptive aws             | ################### 282 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 281 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 102 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ### 38 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 282 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 283 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ####### 111 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ## 36 MiB
mixed pruned-update 2048/64/adaptive shin        | ### 39 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 212 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 212 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 208 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 57 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 35 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 35 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 221 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 221 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 70 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 35 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 35 MiB
```
