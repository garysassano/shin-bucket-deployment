# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-05
- Run ID: ad8b41e3-b7dc-4be0-a087-dfcce4581cc0
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |   2.068 s vs 9.386 s (4.539x faster) | 75.151 s vs 80.803 s (1.075x faster) | 57.15 s vs 63.28 s (1.107x faster) |  132 MiB vs 447 MiB (70.47% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.253 s vs 9.267 s (36.628x faster) |  39.335 s vs 47.93 s (1.219x faster) |  19.38 s vs 30.4 s (1.569x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.459 s vs 9.325 s (20.316x faster) |  44.236 s vs 50.427 s (1.14x faster) | 19.52 s vs 30.43 s (1.559x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.535 s vs 9.167 s (17.135x faster) | 38.347 s vs 54.205 s (1.414x faster) | 19.92 s vs 30.86 s (1.549x faster) |  41 MiB vs 417 MiB (90.168% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.165 s vs 5.165 s (4.433x faster) | 71.966 s vs 74.216 s (1.031x faster) | 52.48 s vs 57.82 s (1.102x faster) | 191 MiB vs 447 MiB (57.271% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |   0.21 s vs 5.109 s (24.329x faster) | 37.633 s vs 42.249 s (1.123x faster) | 19.39 s vs 24.85 s (1.282x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |  0.391 s vs 5.136 s (13.136x faster) | 42.089 s vs 45.249 s (1.075x faster) | 19.52 s vs 24.86 s (1.274x faster) |  41 MiB vs 447 MiB (90.828% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.451 s vs 5.015 s (11.12x faster) | 42.585 s vs 48.617 s (1.142x faster) | 19.86 s vs 25.32 s (1.275x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |  1.358 s vs 10.054 s (7.404x faster) | 70.477 s vs 80.664 s (1.145x faster) | 52.42 s vs 63.38 s (1.209x faster) | 102 MiB vs 281 MiB (63.701% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |  0.28 s vs 10.198 s (36.421x faster) |  36.843 s vs 47.514 s (1.29x faster) | 19.38 s vs 30.34 s (1.566x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive | 0.426 s vs 10.166 s (23.864x faster) | 41.738 s vs 53.198 s (1.275x faster) |  19.5 s vs 30.36 s (1.557x faster) |  37 MiB vs 280 MiB (86.786% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |    1.064 s vs 9.821 s (9.23x faster) | 43.309 s vs 51.041 s (1.179x faster) |  19.84 s vs 30.8 s (1.552x faster) |  37 MiB vs 273 MiB (86.447% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.839 s vs 5.699 s (6.793x faster) |  69.097 s vs 74.633 s (1.08x faster) |  52.4 s vs 57.82 s (1.103x faster) | 113 MiB vs 283 MiB (60.071% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.243 s vs 5.914 s (24.337x faster) | 36.754 s vs 41.841 s (1.138x faster) | 19.33 s vs 24.86 s (1.286x faster) |  35 MiB vs 282 MiB (87.589% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.351 s vs 5.731 s (16.328x faster) | 42.036 s vs 48.436 s (1.152x faster) | 19.49 s vs 24.85 s (1.275x faster) |  37 MiB vs 283 MiB (86.926% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |    1.036 s vs 5.65 s (5.454x faster) | 38.254 s vs 42.643 s (1.115x faster) |  19.83 s vs 25.1 s (1.266x faster) |  39 MiB vs 275 MiB (85.818% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |   2.68 s vs 25.948 s (9.682x faster) | 75.945 s vs 98.579 s (1.298x faster) | 57.84 s vs 83.11 s (1.437x faster) |  58 MiB vs 219 MiB (73.516% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.478 s vs 26.789 s (56.044x faster) | 36.721 s vs 64.192 s (1.748x faster) | 19.33 s vs 47.09 s (2.436x faster) |  36 MiB vs 212 MiB (83.019% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.609 s vs 27.268 s (44.775x faster) |  41.086 s vs 71.33 s (1.736x faster) | 19.52 s vs 47.29 s (2.423x faster) |  36 MiB vs 213 MiB (83.099% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | 1.367 s vs 26.651 s (19.496x faster) | 38.867 s vs 67.506 s (1.737x faster) |    20 s vs 47.62 s (2.381x faster) |  36 MiB vs 215 MiB (83.256% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.492 s vs 15.025 s (10.07x faster) | 73.077 s vs 85.626 s (1.172x faster) |  57.14 s vs 68.8 s (1.204x faster) |  69 MiB vs 223 MiB (69.058% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive |  0.479 s vs 15.31 s (31.962x faster) | 36.743 s vs 53.153 s (1.447x faster) | 19.35 s vs 35.96 s (1.858x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive |  0.572 s vs 15.25 s (26.661x faster) | 41.306 s vs 53.885 s (1.305x faster) | 19.52 s vs 36.02 s (1.845x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.325 s vs 15.072 s (11.375x faster) | 41.882 s vs 59.826 s (1.428x faster) | 19.84 s vs 36.41 s (1.835x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.068 s |              9.386 s |   +7.318 s |   4.539x |   +353.868% |
| Billed duration   |              2.249 s |              9.913 s |   +7.664 s |   4.408x |   +340.774% |
| Init duration     |              0.122 s |              0.527 s |   +0.405 s |    4.32x |   +331.967% |
| Local wall time   |             75.151 s |             80.803 s |   +5.652 s |   1.075x |     +7.521% |
| CDK deploy time   |              57.15 s |              63.28 s |    +6.13 s |   1.107x |    +10.726% |
| Max memory        |              132 MiB |              447 MiB |   +315 MiB |   3.386x |   +238.636% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.253 s |              9.267 s |   +9.014 s |  36.628x |  +3562.846% |
| Billed duration   |              0.371 s |              9.838 s |   +9.467 s |  26.518x |  +2551.752% |
| Init duration     |              0.118 s |              0.519 s |   +0.401 s |   4.398x |   +339.831% |
| Local wall time   |             39.335 s |              47.93 s |   +8.595 s |   1.219x |    +21.851% |
| CDK deploy time   |              19.38 s |               30.4 s |   +11.02 s |   1.569x |    +56.863% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.459 s |              9.325 s |   +8.866 s |  20.316x |   +1931.59% |
| Billed duration   |              0.574 s |              9.859 s |   +9.285 s |  17.176x |  +1617.596% |
| Init duration     |              0.115 s |              0.523 s |   +0.408 s |   4.548x |   +354.783% |
| Local wall time   |             44.236 s |             50.427 s |   +6.191 s |    1.14x |    +13.995% |
| CDK deploy time   |              19.52 s |              30.43 s |   +10.91 s |   1.559x |    +55.891% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.535 s |              9.167 s |   +8.632 s |  17.135x |  +1613.458% |
| Billed duration   |              0.653 s |              9.717 s |   +9.064 s |  14.881x |  +1388.055% |
| Init duration     |              0.115 s |              0.537 s |   +0.422 s |    4.67x |   +366.957% |
| Local wall time   |             38.347 s |             54.205 s |  +15.858 s |   1.414x |    +41.354% |
| CDK deploy time   |              19.92 s |              30.86 s |   +10.94 s |   1.549x |     +54.92% |
| Max memory        |               41 MiB |              417 MiB |   +376 MiB |  10.171x |   +917.073% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.165 s |              5.165 s |       +4 s |   4.433x |   +343.348% |
| Billed duration   |              1.288 s |              5.673 s |   +4.385 s |   4.405x |    +340.45% |
| Init duration     |              0.117 s |              0.517 s |     +0.4 s |   4.419x |    +341.88% |
| Local wall time   |             71.966 s |             74.216 s |    +2.25 s |   1.031x |     +3.126% |
| CDK deploy time   |              52.48 s |              57.82 s |    +5.34 s |   1.102x |    +10.175% |
| Max memory        |              191 MiB |              447 MiB |   +256 MiB |    2.34x |   +134.031% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.21 s |              5.109 s |   +4.899 s |  24.329x |  +2332.857% |
| Billed duration   |              0.329 s |              5.631 s |   +5.302 s |  17.116x |   +1611.55% |
| Init duration     |              0.118 s |              0.522 s |   +0.404 s |   4.424x |   +342.373% |
| Local wall time   |             37.633 s |             42.249 s |   +4.616 s |   1.123x |    +12.266% |
| CDK deploy time   |              19.39 s |              24.85 s |    +5.46 s |   1.282x |    +28.159% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.391 s |              5.136 s |   +4.745 s |  13.136x |  +1213.555% |
| Billed duration   |              0.509 s |              5.647 s |   +5.138 s |  11.094x |   +1009.43% |
| Init duration     |              0.119 s |              0.524 s |   +0.405 s |   4.403x |   +340.336% |
| Local wall time   |             42.089 s |             45.249 s |    +3.16 s |   1.075x |     +7.508% |
| CDK deploy time   |              19.52 s |              24.86 s |    +5.34 s |   1.274x |    +27.357% |
| Max memory        |               41 MiB |              447 MiB |   +406 MiB |  10.902x |   +990.244% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.451 s |              5.015 s |   +4.564 s |   11.12x |  +1011.973% |
| Billed duration   |              0.576 s |               5.54 s |   +4.964 s |   9.618x |   +861.806% |
| Init duration     |              0.116 s |              0.521 s |   +0.405 s |   4.491x |   +349.138% |
| Local wall time   |             42.585 s |             48.617 s |   +6.032 s |   1.142x |    +14.165% |
| CDK deploy time   |              19.86 s |              25.32 s |    +5.46 s |   1.275x |    +27.492% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.358 s |             10.054 s |   +8.696 s |   7.404x |   +640.353% |
| Billed duration   |              1.479 s |             10.629 s |    +9.15 s |   7.187x |   +618.661% |
| Init duration     |               0.12 s |              0.541 s |   +0.421 s |   4.508x |   +350.833% |
| Local wall time   |             70.477 s |             80.664 s |  +10.187 s |   1.145x |    +14.454% |
| CDK deploy time   |              52.42 s |              63.38 s |   +10.96 s |   1.209x |    +20.908% |
| Max memory        |              102 MiB |              281 MiB |   +179 MiB |   2.755x |    +175.49% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.28 s |             10.198 s |   +9.918 s |  36.421x |  +3542.143% |
| Billed duration   |              0.397 s |             10.838 s |  +10.441 s |    27.3x |  +2629.975% |
| Init duration     |              0.117 s |              0.574 s |   +0.457 s |   4.906x |   +390.598% |
| Local wall time   |             36.843 s |             47.514 s |  +10.671 s |    1.29x |    +28.963% |
| CDK deploy time   |              19.38 s |              30.34 s |   +10.96 s |   1.566x |    +56.553% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.426 s |             10.166 s |    +9.74 s |  23.864x |  +2286.385% |
| Billed duration   |              0.549 s |             11.102 s |  +10.553 s |  20.222x |  +1922.222% |
| Init duration     |              0.116 s |              0.543 s |   +0.427 s |   4.681x |   +368.103% |
| Local wall time   |             41.738 s |             53.198 s |   +11.46 s |   1.275x |    +27.457% |
| CDK deploy time   |               19.5 s |              30.36 s |   +10.86 s |   1.557x |    +55.692% |
| Max memory        |               37 MiB |              280 MiB |   +243 MiB |   7.568x |   +656.757% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.064 s |              9.821 s |   +8.757 s |    9.23x |   +823.026% |
| Billed duration   |              1.174 s |             10.361 s |   +9.187 s |   8.825x |   +782.538% |
| Init duration     |              0.118 s |              0.539 s |   +0.421 s |   4.568x |    +356.78% |
| Local wall time   |             43.309 s |             51.041 s |   +7.732 s |   1.179x |    +17.853% |
| CDK deploy time   |              19.84 s |               30.8 s |   +10.96 s |   1.552x |    +55.242% |
| Max memory        |               37 MiB |              273 MiB |   +236 MiB |   7.378x |   +637.838% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.839 s |              5.699 s |    +4.86 s |   6.793x |   +579.261% |
| Billed duration   |              0.964 s |              6.231 s |   +5.267 s |   6.464x |   +546.369% |
| Init duration     |              0.121 s |              0.526 s |   +0.405 s |   4.347x |   +334.711% |
| Local wall time   |             69.097 s |             74.633 s |   +5.536 s |    1.08x |     +8.012% |
| CDK deploy time   |               52.4 s |              57.82 s |    +5.42 s |   1.103x |    +10.344% |
| Max memory        |              113 MiB |              283 MiB |   +170 MiB |   2.504x |   +150.442% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.243 s |              5.914 s |   +5.671 s |  24.337x |  +2333.745% |
| Billed duration   |              0.359 s |               6.49 s |   +6.131 s |  18.078x |  +1707.799% |
| Init duration     |              0.117 s |              0.493 s |   +0.376 s |   4.214x |   +321.368% |
| Local wall time   |             36.754 s |             41.841 s |   +5.087 s |   1.138x |    +13.841% |
| CDK deploy time   |              19.33 s |              24.86 s |    +5.53 s |   1.286x |    +28.608% |
| Max memory        |               35 MiB |              282 MiB |   +247 MiB |   8.057x |   +705.714% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.351 s |              5.731 s |    +5.38 s |  16.328x |  +1532.764% |
| Billed duration   |              0.479 s |              6.249 s |    +5.77 s |  13.046x |  +1204.593% |
| Init duration     |              0.119 s |              0.528 s |   +0.409 s |   4.437x |   +343.697% |
| Local wall time   |             42.036 s |             48.436 s |     +6.4 s |   1.152x |    +15.225% |
| CDK deploy time   |              19.49 s |              24.85 s |    +5.36 s |   1.275x |    +27.501% |
| Max memory        |               37 MiB |              283 MiB |   +246 MiB |   7.649x |   +664.865% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.036 s |               5.65 s |   +4.614 s |   5.454x |   +445.367% |
| Billed duration   |              1.161 s |              6.168 s |   +5.007 s |   5.313x |   +431.266% |
| Init duration     |              0.122 s |              0.518 s |   +0.396 s |   4.246x |    +324.59% |
| Local wall time   |             38.254 s |             42.643 s |   +4.389 s |   1.115x |    +11.473% |
| CDK deploy time   |              19.83 s |               25.1 s |    +5.27 s |   1.266x |    +26.576% |
| Max memory        |               39 MiB |              275 MiB |   +236 MiB |   7.051x |   +605.128% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               2.68 s |             25.948 s |  +23.268 s |   9.682x |   +868.209% |
| Billed duration   |              2.805 s |             26.467 s |  +23.662 s |   9.436x |   +843.565% |
| Init duration     |              0.118 s |              0.527 s |   +0.409 s |   4.466x |    +346.61% |
| Local wall time   |             75.945 s |             98.579 s |  +22.634 s |   1.298x |    +29.803% |
| CDK deploy time   |              57.84 s |              83.11 s |   +25.27 s |   1.437x |    +43.689% |
| Max memory        |               58 MiB |              219 MiB |   +161 MiB |   3.776x |   +277.586% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.478 s |             26.789 s |  +26.311 s |  56.044x |  +5504.393% |
| Billed duration   |              0.598 s |             27.318 s |   +26.72 s |  45.682x |  +4468.227% |
| Init duration     |               0.12 s |              0.545 s |   +0.425 s |   4.542x |   +354.167% |
| Local wall time   |             36.721 s |             64.192 s |  +27.471 s |   1.748x |     +74.81% |
| CDK deploy time   |              19.33 s |              47.09 s |   +27.76 s |   2.436x |   +143.611% |
| Max memory        |               36 MiB |              212 MiB |   +176 MiB |   5.889x |   +488.889% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.609 s |             27.268 s |  +26.659 s |  44.775x |  +4377.504% |
| Billed duration   |              0.726 s |              27.79 s |  +27.064 s |  38.278x |  +3727.824% |
| Init duration     |              0.122 s |              0.523 s |   +0.401 s |   4.287x |   +328.689% |
| Local wall time   |             41.086 s |              71.33 s |  +30.244 s |   1.736x |    +73.611% |
| CDK deploy time   |              19.52 s |              47.29 s |   +27.77 s |   2.423x |   +142.264% |
| Max memory        |               36 MiB |              213 MiB |   +177 MiB |   5.917x |   +491.667% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.367 s |             26.651 s |  +25.284 s |  19.496x |  +1849.598% |
| Billed duration   |              1.466 s |             27.186 s |   +25.72 s |  18.544x |  +1754.434% |
| Init duration     |              0.115 s |              0.534 s |   +0.419 s |   4.643x |   +364.348% |
| Local wall time   |             38.867 s |             67.506 s |  +28.639 s |   1.737x |    +73.685% |
| CDK deploy time   |                 20 s |              47.62 s |   +27.62 s |   2.381x |     +138.1% |
| Max memory        |               36 MiB |              215 MiB |   +179 MiB |   5.972x |   +497.222% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.492 s |             15.025 s |  +13.533 s |   10.07x |   +907.038% |
| Billed duration   |               1.61 s |             15.562 s |  +13.952 s |   9.666x |   +866.584% |
| Init duration     |              0.118 s |              0.525 s |   +0.407 s |   4.449x |   +344.915% |
| Local wall time   |             73.077 s |             85.626 s |  +12.549 s |   1.172x |    +17.172% |
| CDK deploy time   |              57.14 s |               68.8 s |   +11.66 s |   1.204x |    +20.406% |
| Max memory        |               69 MiB |              223 MiB |   +154 MiB |   3.232x |   +223.188% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.479 s |              15.31 s |  +14.831 s |  31.962x |  +3096.242% |
| Billed duration   |              0.598 s |             15.832 s |  +15.234 s |  26.475x |  +2547.492% |
| Init duration     |              0.114 s |              0.521 s |   +0.407 s |    4.57x |   +357.018% |
| Local wall time   |             36.743 s |             53.153 s |   +16.41 s |   1.447x |    +44.662% |
| CDK deploy time   |              19.35 s |              35.96 s |   +16.61 s |   1.858x |     +85.84% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.572 s |              15.25 s |  +14.678 s |  26.661x |  +2566.084% |
| Billed duration   |              0.673 s |             15.785 s |  +15.112 s |  23.455x |  +2245.468% |
| Init duration     |              0.117 s |              0.542 s |   +0.425 s |   4.632x |   +363.248% |
| Local wall time   |             41.306 s |             53.885 s |  +12.579 s |   1.305x |    +30.453% |
| CDK deploy time   |              19.52 s |              36.02 s |    +16.5 s |   1.845x |    +84.529% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.325 s |             15.072 s |  +13.747 s |  11.375x |  +1037.509% |
| Billed duration   |              1.443 s |             15.614 s |  +14.171 s |  10.821x |   +982.051% |
| Init duration     |              0.119 s |              0.518 s |   +0.399 s |   4.353x |   +335.294% |
| Local wall time   |             41.882 s |             59.826 s |  +17.944 s |   1.428x |    +42.844% |
| CDK deploy time   |              19.84 s |              36.41 s |   +16.57 s |   1.835x |    +83.518% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.386 |  9.385 |  9.465 |    0.08 |   9.171 |   9.581 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.267 |  9.143 |  9.467 |   0.324 |   9.004 |  10.302 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.325 |  9.272 |  9.335 |   0.063 |   9.143 |   9.528 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.167 |  8.731 |  9.231 |     0.5 |   8.716 |   9.794 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.068 |   2.04 |  2.222 |   0.182 |    1.92 |   2.284 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.253 |   0.25 |  0.257 |   0.007 |   0.249 |   0.262 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.459 |  0.427 |  0.468 |   0.041 |   0.417 |   0.606 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.535 |   0.48 |  0.573 |   0.093 |   0.471 |   0.599 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.165 |  5.072 |  5.209 |   0.137 |   5.062 |   5.303 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.109 |  5.101 |  5.222 |   0.121 |   5.094 |   5.396 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.136 |   5.09 |  5.167 |   0.077 |   5.012 |   5.288 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.015 |   4.95 |  5.035 |   0.085 |   4.905 |   5.057 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.165 |   1.14 |  1.188 |   0.048 |   0.964 |    1.19 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.21 |  0.209 |  0.211 |   0.002 |   0.202 |   0.216 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.391 |  0.377 |  0.415 |   0.038 |   0.371 |   0.451 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.451 |  0.451 |  0.462 |   0.011 |   0.449 |   0.479 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.054 |  9.853 | 10.087 |   0.234 |   9.633 |  10.206 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.198 | 10.115 | 10.387 |   0.272 |  10.026 |  11.307 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.166 |  10.16 | 10.535 |   0.375 |   9.972 |  10.629 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.821 |  9.763 |  9.997 |   0.234 |   9.648 |  11.408 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.358 |  1.332 |  1.368 |   0.036 |   1.321 |   1.372 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.28 |  0.259 |  0.282 |   0.023 |   0.258 |   0.284 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.426 |  0.424 |  0.432 |   0.008 |   0.402 |   0.491 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.064 |  1.056 |  1.076 |    0.02 |   1.016 |   1.183 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.699 |  5.632 |  5.764 |   0.132 |   5.313 |   5.808 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.914 |  5.689 |  6.472 |   0.783 |   5.669 |   6.551 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.731 |  5.702 |  5.738 |   0.036 |   5.493 |   5.836 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       5.65 |  5.476 |  5.674 |   0.198 |   4.969 |   6.339 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.839 |  0.828 |   0.88 |   0.052 |   0.808 |   0.897 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.243 |   0.24 |  0.258 |   0.018 |   0.232 |    0.26 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.351 |  0.351 |   0.38 |   0.029 |   0.349 |   0.391 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.036 |  1.026 |  1.036 |    0.01 |   1.011 |   1.074 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.948 | 25.564 | 25.975 |   0.411 |  25.092 |  26.208 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.789 |  26.67 | 26.918 |   0.248 |  26.191 |  27.825 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.268 |  27.08 |  27.27 |    0.19 |  25.925 |  27.864 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.651 | 25.207 | 26.976 |   1.769 |  24.308 |  27.618 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       2.68 |  2.625 |  2.777 |   0.152 |   2.583 |    2.79 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.478 |  0.467 |  0.499 |   0.032 |   0.458 |    0.52 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.609 |  0.598 |  0.634 |   0.036 |   0.587 |   0.642 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.367 |  1.334 |  1.373 |   0.039 |   1.309 |   1.418 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.025 | 15.003 | 15.219 |   0.216 |  14.797 |  15.422 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      15.31 | 14.955 | 15.455 |     0.5 |  14.691 |  15.643 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      15.25 | 15.243 | 15.712 |   0.469 |  14.964 |  16.368 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.072 | 14.906 | 15.202 |   0.296 |  14.468 |  16.844 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.492 |  1.491 |  1.522 |   0.031 |   1.488 |   1.553 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.479 |  0.473 |  0.497 |   0.024 |   0.437 |   0.502 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.572 |  0.549 |  0.582 |   0.033 |   0.513 |   0.632 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.325 |  1.322 |  1.424 |   0.102 |   1.311 |   1.444 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.386 s
large-few unchanged-update 1024//adaptive aws    | ########## 9.267 s
large-few changed-update 1024//adaptive aws      | ########## 9.325 s
large-few pruned-update 1024//adaptive aws       | ########## 9.167 s
large-few cold-create 1024/32/adaptive shin      | ## 2.068 s
large-few unchanged-update 1024/32/adaptive shin | # 0.253 s
large-few changed-update 1024/32/adaptive shin   | # 0.459 s
large-few pruned-update 1024/32/adaptive shin    | # 0.535 s
large-few cold-create 2048//adaptive aws         | ###### 5.165 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.109 s
large-few changed-update 2048//adaptive aws      | ###### 5.136 s
large-few pruned-update 2048//adaptive aws       | ###### 5.015 s
large-few cold-create 2048/64/adaptive shin      | # 1.165 s
large-few unchanged-update 2048/64/adaptive shin | # 0.21 s
large-few changed-update 2048/64/adaptive shin   | # 0.391 s
large-few pruned-update 2048/64/adaptive shin    | # 0.451 s
mixed cold-create 1024//adaptive aws             | ########### 10.054 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.198 s
mixed changed-update 1024//adaptive aws          | ########### 10.166 s
mixed pruned-update 1024//adaptive aws           | ########### 9.821 s
mixed cold-create 1024/32/adaptive shin          | # 1.358 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.28 s
mixed changed-update 1024/32/adaptive shin       | # 0.426 s
mixed pruned-update 1024/32/adaptive shin        | # 1.064 s
mixed cold-create 2048//adaptive aws             | ###### 5.699 s
mixed unchanged-update 2048//adaptive aws        | ####### 5.914 s
mixed changed-update 2048//adaptive aws          | ###### 5.731 s
mixed pruned-update 2048//adaptive aws           | ###### 5.65 s
mixed cold-create 2048/64/adaptive shin          | # 0.839 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.243 s
mixed changed-update 2048/64/adaptive shin       | # 0.351 s
mixed pruned-update 2048/64/adaptive shin        | # 1.036 s
tiny-many cold-create 1024//adaptive aws         | ############################# 25.948 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 26.789 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.268 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.651 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.68 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.478 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.609 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.367 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.025 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.31 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.25 s
tiny-many pruned-update 2048//adaptive aws       | ################# 15.072 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.492 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.479 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.572 s
tiny-many pruned-update 2048/64/adaptive shin    | # 1.325 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.913 |  9.897 | 10.033 |   0.136 |   9.698 |  10.143 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.838 |  9.663 | 10.017 |   0.354 |   9.516 |  10.747 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.859 |  9.789 |  9.876 |   0.087 |   9.665 |  10.376 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.717 |  9.269 |  9.798 |   0.529 |   9.241 |  10.245 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.249 |  2.162 |  2.341 |   0.179 |   2.038 |   2.432 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.371 |   0.37 |  0.371 |   0.001 |   0.366 |   0.386 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.574 |  0.543 |  0.618 |   0.075 |   0.513 |   0.725 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.653 |  0.596 |  0.696 |     0.1 |   0.568 |   0.721 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.673 |   5.58 |  5.727 |   0.147 |   5.575 |   5.828 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.631 |  5.623 |  5.774 |   0.151 |   5.616 |   5.965 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.647 |   5.62 |  5.698 |   0.078 |   5.524 |   5.812 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       5.54 |   5.47 |  5.572 |   0.102 |   5.426 |   5.576 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.288 |  1.258 |  1.303 |   0.045 |   1.062 |    1.31 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.329 |  0.328 |  0.333 |   0.005 |   0.298 |   0.334 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.509 |  0.496 |  0.535 |   0.039 |   0.493 |   0.572 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.576 |   0.57 |  0.577 |   0.007 |   0.565 |   0.595 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.629 | 10.596 | 10.697 |   0.101 |   10.15 |  10.725 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.838 | 10.734 | 10.962 |   0.228 |  10.694 |  11.745 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     11.102 | 10.695 | 11.172 |   0.477 |  10.685 |  11.265 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.361 | 10.299 | 10.535 |   0.236 |  10.191 |  12.174 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.479 |  1.451 |  1.491 |    0.04 |   1.442 |   1.517 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.397 |  0.375 |  0.399 |   0.024 |   0.373 |   0.402 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.549 |  0.542 |  0.554 |   0.012 |   0.518 |   0.606 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.174 |  1.173 |  1.179 |   0.006 |   1.134 |   1.302 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.231 |  6.159 |   6.27 |   0.111 |   5.807 |   6.343 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       6.49 |   6.46 |  6.926 |   0.466 |   6.162 |   7.036 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.249 |  6.214 |  6.266 |   0.052 |   6.033 |   6.383 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.168 |  5.976 |    6.2 |   0.224 |   5.471 |   7.086 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.964 |   0.95 |  0.999 |   0.049 |    0.93 |   1.047 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.359 |  0.348 |  0.376 |   0.028 |    0.34 |   0.377 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.479 |  0.471 |  0.496 |   0.025 |   0.468 |   0.511 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.161 |  1.148 |  1.165 |   0.017 |   1.133 |   1.172 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     26.467 | 26.118 | 26.502 |   0.384 |  25.903 |  26.728 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     27.318 | 27.195 | 27.467 |   0.272 |  26.737 |  28.416 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      27.79 | 27.603 | 27.839 |   0.236 |  26.445 |  28.487 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     27.186 | 25.798 | 27.501 |   1.703 |   24.83 |  28.177 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.805 |  2.741 |  2.896 |   0.155 |   2.702 |   2.906 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.598 |  0.591 |  0.615 |   0.024 |   0.572 |    0.67 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.726 |  0.721 |  0.758 |   0.037 |   0.706 |   0.765 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.466 |  1.454 |  1.488 |   0.034 |   1.405 |   1.535 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.562 | 15.529 | 15.744 |   0.215 |  15.299 |  15.937 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.832 | 15.469 | 16.013 |   0.544 |  15.199 |  16.491 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.785 | 15.784 | 16.488 |   0.704 |  15.483 |  16.931 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.614 | 15.434 | 15.721 |   0.287 |  14.968 |  17.294 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       1.61 |  1.608 |   1.64 |   0.032 |   1.607 |   1.678 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.598 |  0.594 |  0.601 |   0.007 |   0.556 |   0.612 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.673 |  0.667 |  0.702 |   0.035 |   0.627 |   0.753 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.443 |  1.442 |  1.543 |   0.101 |    1.41 |   1.568 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.913 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.838 s
large-few changed-update 1024//adaptive aws      | ########### 9.859 s
large-few pruned-update 1024//adaptive aws       | ########## 9.717 s
large-few cold-create 1024/32/adaptive shin      | ## 2.249 s
large-few unchanged-update 1024/32/adaptive shin | # 0.371 s
large-few changed-update 1024/32/adaptive shin   | # 0.574 s
large-few pruned-update 1024/32/adaptive shin    | # 0.653 s
large-few cold-create 2048//adaptive aws         | ###### 5.673 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.631 s
large-few changed-update 2048//adaptive aws      | ###### 5.647 s
large-few pruned-update 2048//adaptive aws       | ###### 5.54 s
large-few cold-create 2048/64/adaptive shin      | # 1.288 s
large-few unchanged-update 2048/64/adaptive shin | # 0.329 s
large-few changed-update 2048/64/adaptive shin   | # 0.509 s
large-few pruned-update 2048/64/adaptive shin    | # 0.576 s
mixed cold-create 1024//adaptive aws             | ########### 10.629 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.838 s
mixed changed-update 1024//adaptive aws          | ############ 11.102 s
mixed pruned-update 1024//adaptive aws           | ########### 10.361 s
mixed cold-create 1024/32/adaptive shin          | ## 1.479 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.397 s
mixed changed-update 1024/32/adaptive shin       | # 0.549 s
mixed pruned-update 1024/32/adaptive shin        | # 1.174 s
mixed cold-create 2048//adaptive aws             | ####### 6.231 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.49 s
mixed changed-update 2048//adaptive aws          | ####### 6.249 s
mixed pruned-update 2048//adaptive aws           | ####### 6.168 s
mixed cold-create 2048/64/adaptive shin          | # 0.964 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.359 s
mixed changed-update 2048/64/adaptive shin       | # 0.479 s
mixed pruned-update 2048/64/adaptive shin        | # 1.161 s
tiny-many cold-create 1024//adaptive aws         | ############################# 26.467 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 27.318 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.79 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 27.186 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.805 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.598 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.726 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.466 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.562 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.832 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.785 s
tiny-many pruned-update 2048//adaptive aws       | ################# 15.614 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.61 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.598 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.673 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.443 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.527 |  0.526 |  0.561 |   0.035 |    0.51 |   0.567 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.519 |  0.511 |  0.549 |   0.038 |   0.445 |   0.571 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.523 |  0.522 |  0.551 |   0.029 |   0.517 |   0.847 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.537 |  0.524 |  0.549 |   0.025 |    0.45 |   0.566 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.119 |  0.148 |   0.029 |   0.117 |   0.181 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |   0.12 |   0.004 |   0.114 |   0.124 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.114 |  0.118 |   0.004 |   0.096 |    0.15 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.096 |  0.118 |   0.022 |   0.096 |   0.148 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.517 |  0.507 |  0.518 |   0.011 |   0.503 |   0.524 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.522 |  0.521 |  0.552 |   0.031 |   0.521 |   0.569 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.524 |  0.512 |   0.53 |   0.018 |    0.51 |   0.531 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.519 |  0.524 |   0.005 |   0.514 |   0.541 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |   0.12 |   0.005 |   0.098 |   0.122 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.116 |   0.12 |   0.004 |   0.096 |   0.123 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.121 |   0.003 |   0.118 |   0.122 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.118 |   0.002 |   0.114 |   0.125 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.541 |  0.519 |  0.541 |   0.022 |   0.517 |   0.843 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.574 |  0.535 |  0.579 |   0.044 |   0.437 |   0.811 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.543 |  0.534 |  0.567 |   0.033 |   0.519 |   1.293 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.539 |  0.537 |  0.543 |   0.006 |   0.535 |   0.766 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.119 |  0.121 |   0.002 |   0.118 |   0.149 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.117 |   0.001 |   0.114 |   0.118 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.115 |  0.121 |   0.006 |   0.115 |   0.124 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.115 |  0.118 |   0.003 |   0.096 |   0.118 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.526 |  0.506 |  0.531 |   0.025 |   0.494 |   0.535 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.493 |  0.485 |  0.545 |    0.06 |   0.453 |     0.8 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.528 |  0.518 |   0.54 |   0.022 |   0.512 |   0.547 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.518 |  0.501 |  0.526 |   0.025 |     0.5 |   0.746 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.121 |  0.124 |   0.003 |   0.118 |    0.15 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.118 |   0.003 |   0.096 |   0.119 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |   0.12 |   0.002 |   0.116 |   0.127 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.122 |  0.124 |   0.002 |   0.098 |   0.129 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.527 |   0.52 |  0.553 |   0.033 |   0.519 |    0.81 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.545 |  0.529 |  0.549 |    0.02 |   0.525 |   0.591 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.523 |   0.52 |   0.57 |    0.05 |    0.52 |   0.622 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.534 |  0.524 |  0.558 |   0.034 |   0.522 |   0.591 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.119 |   0.003 |   0.115 |   0.124 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.116 |  0.124 |   0.008 |   0.114 |    0.15 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.119 |  0.123 |   0.004 |   0.116 |   0.123 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.098 |  0.117 |   0.019 |   0.095 |   0.119 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.525 |  0.514 |  0.526 |   0.012 |   0.502 |   0.537 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.513 |  0.558 |   0.045 |   0.507 |   0.847 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.542 |  0.533 |  0.563 |    0.03 |   0.518 |   0.775 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.518 |    0.5 |  0.528 |   0.028 |    0.45 |   0.542 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.118 |       0 |   0.117 |   0.125 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.114 |  0.114 |  0.119 |   0.005 |   0.096 |   0.127 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.113 |   0.12 |   0.007 |   0.101 |    0.12 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.117 |   0.12 |   0.003 |   0.099 |   0.124 |

```text
large-few cold-create 1024//adaptive aws         | ############################ 0.527 s
large-few unchanged-update 1024//adaptive aws    | ########################### 0.519 s
large-few changed-update 1024//adaptive aws      | ########################### 0.523 s
large-few pruned-update 1024//adaptive aws       | ############################ 0.537 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.122 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.118 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.115 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.115 s
large-few cold-create 2048//adaptive aws         | ########################### 0.517 s
large-few unchanged-update 2048//adaptive aws    | ########################### 0.522 s
large-few changed-update 2048//adaptive aws      | ########################### 0.524 s
large-few pruned-update 2048//adaptive aws       | ########################### 0.521 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.117 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.118 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.119 s
large-few pruned-update 2048/64/adaptive shin    | ###### 0.116 s
mixed cold-create 1024//adaptive aws             | ############################ 0.541 s
mixed unchanged-update 1024//adaptive aws        | ############################## 0.574 s
mixed changed-update 1024//adaptive aws          | ############################ 0.543 s
mixed pruned-update 1024//adaptive aws           | ############################ 0.539 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.12 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.117 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.116 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.118 s
mixed cold-create 2048//adaptive aws             | ########################### 0.526 s
mixed unchanged-update 2048//adaptive aws        | ########################## 0.493 s
mixed changed-update 2048//adaptive aws          | ############################ 0.528 s
mixed pruned-update 2048//adaptive aws           | ########################### 0.518 s
mixed cold-create 2048/64/adaptive shin          | ###### 0.121 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.117 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.119 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.122 s
tiny-many cold-create 1024//adaptive aws         | ############################ 0.527 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 0.545 s
tiny-many changed-update 1024//adaptive aws      | ########################### 0.523 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 0.534 s
tiny-many cold-create 1024/32/adaptive shin      | ###### 0.118 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.12 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.122 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.115 s
tiny-many cold-create 2048//adaptive aws         | ########################### 0.525 s
tiny-many unchanged-update 2048//adaptive aws    | ########################### 0.521 s
tiny-many changed-update 2048//adaptive aws      | ############################ 0.542 s
tiny-many pruned-update 2048//adaptive aws       | ########################### 0.518 s
tiny-many cold-create 2048/64/adaptive shin      | ###### 0.118 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.114 s
tiny-many changed-update 2048/64/adaptive shin   | ###### 0.117 s
tiny-many pruned-update 2048/64/adaptive shin    | ###### 0.119 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) |  Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | ------: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.803 | 80.324 |  81.092 |   0.768 |  79.726 |  84.254 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      47.93 | 47.511 |   55.47 |   7.959 |  46.199 |  67.309 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     50.427 |  48.97 |  54.427 |   5.457 |  47.271 |  54.892 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     54.205 | 51.745 |  54.371 |   2.626 |  48.271 |  54.764 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     75.151 | 74.421 |  76.254 |   1.833 |  71.474 |  77.689 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     39.335 | 36.897 |  42.031 |   5.134 |  35.941 |  48.284 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     44.236 | 43.038 |  45.765 |   2.727 |  37.611 |  62.087 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.347 | 38.009 |  40.417 |   2.408 |  36.817 |  43.907 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     74.216 | 74.095 |   74.34 |   0.245 |  71.556 |   74.38 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     42.249 | 42.018 |  42.264 |   0.246 |  39.625 |  52.327 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     45.249 | 42.475 |  47.783 |   5.308 |  42.399 |  47.812 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     48.617 | 47.953 |  48.655 |   0.702 |  45.406 |  48.749 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     71.966 | 69.477 |  72.705 |   3.228 |  69.176 |  82.463 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     37.633 | 36.863 |   37.71 |   0.847 |  34.625 |  40.734 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     42.089 | 41.567 |   42.56 |   0.993 |  37.817 |  43.169 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     42.585 | 38.164 |  47.286 |   9.122 |  34.599 |  49.299 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.664 | 80.629 |  81.847 |   1.218 |  79.705 |  82.983 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     47.514 | 47.513 |  47.602 |   0.089 |  44.714 |  47.961 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     53.198 |  50.27 |  53.367 |   3.097 |  47.088 |  59.082 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     51.041 | 48.422 |  52.678 |   4.256 |  48.393 |  66.715 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.477 | 70.264 |   73.36 |   3.096 |  69.885 |  75.599 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.843 | 35.861 |  37.301 |    1.44 |  34.784 |  37.896 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     41.738 | 39.928 |  42.773 |   2.845 |  39.256 |  43.147 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     43.309 | 41.836 |  43.466 |    1.63 |  40.423 |  44.793 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     74.633 | 74.365 |  76.062 |   1.697 |  74.346 |  77.445 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     41.841 | 40.995 |  41.926 |   0.931 |  38.947 |  42.016 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     48.436 | 47.884 |  50.552 |   2.668 |  45.179 |  56.907 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.643 | 41.662 |  48.016 |   6.354 |   39.83 |  48.074 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.097 | 69.062 |   69.93 |   0.868 |  65.974 |   74.07 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.754 | 35.761 |  37.332 |   1.571 |  34.545 |  37.738 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     42.036 | 40.667 |  44.083 |   3.416 |  37.431 |   44.66 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.254 | 37.465 |  39.936 |   2.471 |   36.33 |  43.377 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     98.579 | 97.298 | 100.174 |   2.876 |  96.723 |  102.94 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     64.192 | 62.565 |  64.488 |   1.923 |  61.842 |  64.593 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      71.33 | 71.081 |  75.308 |   4.227 |  70.456 |  79.967 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     67.506 | 66.969 |  69.211 |   2.242 |  66.121 |  70.804 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     75.945 | 74.249 |  76.081 |   1.832 |  72.797 |  77.959 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.721 | 35.315 |   36.87 |   1.555 |  35.111 |  37.405 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     41.086 | 37.945 |  43.429 |   5.484 |  36.236 |  43.534 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.867 | 38.341 |  41.957 |   3.616 |   36.19 |   44.04 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     85.626 | 84.296 |  85.637 |   1.341 |  82.582 |  85.811 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     53.153 | 52.278 |  53.218 |    0.94 |  49.958 |  53.385 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     53.885 | 53.701 |  53.962 |   0.261 |  52.859 |  56.606 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     59.826 | 56.889 |  60.026 |   3.137 |  53.142 |  60.085 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     73.077 | 72.593 |  75.678 |   3.085 |  70.208 |  76.552 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.743 | 35.342 |   36.77 |   1.428 |  34.481 |  36.804 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     41.306 | 37.828 |   42.06 |   4.232 |  37.595 |  43.382 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     41.882 | 41.026 |  43.707 |   2.681 |  38.597 |  43.914 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 80.803 s
large-few unchanged-update 1024//adaptive aws    | ############### 47.93 s
large-few changed-update 1024//adaptive aws      | ############### 50.427 s
large-few pruned-update 1024//adaptive aws       | ################ 54.205 s
large-few cold-create 1024/32/adaptive shin      | ####################### 75.151 s
large-few unchanged-update 1024/32/adaptive shin | ############ 39.335 s
large-few changed-update 1024/32/adaptive shin   | ############# 44.236 s
large-few pruned-update 1024/32/adaptive shin    | ############ 38.347 s
large-few cold-create 2048//adaptive aws         | ####################### 74.216 s
large-few unchanged-update 2048//adaptive aws    | ############# 42.249 s
large-few changed-update 2048//adaptive aws      | ############## 45.249 s
large-few pruned-update 2048//adaptive aws       | ############### 48.617 s
large-few cold-create 2048/64/adaptive shin      | ###################### 71.966 s
large-few unchanged-update 2048/64/adaptive shin | ########### 37.633 s
large-few changed-update 2048/64/adaptive shin   | ############# 42.089 s
large-few pruned-update 2048/64/adaptive shin    | ############# 42.585 s
mixed cold-create 1024//adaptive aws             | ######################### 80.664 s
mixed unchanged-update 1024//adaptive aws        | ############## 47.514 s
mixed changed-update 1024//adaptive aws          | ################ 53.198 s
mixed pruned-update 1024//adaptive aws           | ################ 51.041 s
mixed cold-create 1024/32/adaptive shin          | ##################### 70.477 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 36.843 s
mixed changed-update 1024/32/adaptive shin       | ############# 41.738 s
mixed pruned-update 1024/32/adaptive shin        | ############# 43.309 s
mixed cold-create 2048//adaptive aws             | ####################### 74.633 s
mixed unchanged-update 2048//adaptive aws        | ############# 41.841 s
mixed changed-update 2048//adaptive aws          | ############### 48.436 s
mixed pruned-update 2048//adaptive aws           | ############# 42.643 s
mixed cold-create 2048/64/adaptive shin          | ##################### 69.097 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 36.754 s
mixed changed-update 2048/64/adaptive shin       | ############# 42.036 s
mixed pruned-update 2048/64/adaptive shin        | ############ 38.254 s
tiny-many cold-create 1024//adaptive aws         | ############################## 98.579 s
tiny-many unchanged-update 1024//adaptive aws    | #################### 64.192 s
tiny-many changed-update 1024//adaptive aws      | ###################### 71.33 s
tiny-many pruned-update 1024//adaptive aws       | ##################### 67.506 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 75.945 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 36.721 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 41.086 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 38.867 s
tiny-many cold-create 2048//adaptive aws         | ########################## 85.626 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 53.153 s
tiny-many changed-update 2048//adaptive aws      | ################ 53.885 s
tiny-many pruned-update 2048//adaptive aws       | ################## 59.826 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 73.077 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 36.743 s
tiny-many changed-update 2048/64/adaptive shin   | ############# 41.306 s
tiny-many pruned-update 2048/64/adaptive shin    | ############# 41.882 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      63.28 |  62.52 |  63.38 |    0.86 |   61.62 |   63.38 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       30.4 |  29.86 |  30.46 |     0.6 |   29.38 |   30.51 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      30.43 |  29.85 |  30.43 |    0.58 |   29.29 |   30.46 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.86 |  30.02 |  30.88 |    0.86 |   29.46 |   30.95 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.15 |  56.26 |  57.84 |    1.58 |   52.45 |   57.92 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.38 |  19.03 |  19.42 |    0.39 |   18.55 |   19.42 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.52 |  19.16 |  19.53 |    0.37 |    18.6 |   19.61 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.92 |  19.22 |  20.02 |     0.8 |   18.75 |   20.12 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.82 |  57.39 |  57.85 |    0.46 |   56.44 |   57.87 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.85 |  24.55 |  24.91 |    0.36 |   24.05 |   24.94 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.86 |  24.53 |  24.91 |    0.38 |   23.91 |   24.94 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      25.32 |  24.74 |  25.33 |    0.59 |   24.14 |   25.55 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      52.48 |  52.42 |  56.08 |    3.66 |   52.33 |   57.92 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.39 |  19.02 |  19.41 |    0.39 |   18.57 |   19.43 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.52 |  19.11 |  19.53 |    0.42 |   18.75 |   19.56 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.86 |  19.31 |     20 |    0.69 |   18.71 |   20.08 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      63.38 |  63.36 |  63.38 |    0.02 |   62.68 |   67.11 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      30.34 |  29.81 |  30.38 |    0.57 |    29.3 |   30.39 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      30.36 |  29.91 |   30.4 |    0.49 |   29.21 |   30.44 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       30.8 |  30.11 |  30.84 |    0.73 |   29.71 |      31 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      52.42 |  52.35 |  56.23 |    3.88 |   52.34 |   57.82 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.38 |  19.04 |  19.41 |    0.37 |   18.66 |   19.43 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       19.5 |  19.18 |  19.53 |    0.35 |   18.57 |   21.63 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.84 |  19.28 |  19.94 |    0.66 |   18.71 |   19.97 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.82 |  57.27 |  57.86 |    0.59 |   56.48 |   57.88 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.86 |  24.48 |  24.86 |    0.38 |   23.83 |   24.91 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.85 |  24.81 |  24.87 |    0.06 |   23.98 |   24.87 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       25.1 |  24.58 |   25.3 |    0.72 |   24.12 |    25.3 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       52.4 |  52.35 |  52.44 |    0.09 |   50.94 |   57.73 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.33 |  19.13 |   19.4 |    0.27 |   18.48 |   19.43 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.49 |  19.12 |  19.56 |    0.44 |   18.51 |   19.56 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.83 |  19.24 |  19.94 |     0.7 |   18.67 |   19.99 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      83.11 |  79.77 |  84.25 |    4.48 |   79.75 |   85.21 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      47.09 |  46.16 |  47.11 |    0.95 |    45.4 |   47.16 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      47.29 |   47.1 |  47.32 |    0.22 |   46.37 |   50.82 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      47.62 |  47.59 |  47.91 |    0.32 |   46.26 |    50.8 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.84 |   57.6 |   57.9 |     0.3 |    56.3 |   57.96 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.33 |     19 |  19.34 |    0.34 |   18.49 |   19.37 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.52 |  19.16 |  19.53 |    0.37 |   18.59 |   19.56 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |         20 |  19.28 |  20.04 |    0.76 |   18.73 |   20.06 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       68.8 |  68.14 |  68.83 |    0.69 |   67.06 |   68.86 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      35.96 |  35.49 |  36.02 |    0.53 |   34.62 |   36.05 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      36.02 |  35.39 |  36.05 |    0.66 |   34.94 |   36.06 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      36.41 |  35.74 |  36.48 |    0.74 |   34.89 |   36.58 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      57.14 |   56.2 |  57.85 |    1.65 |   52.44 |   57.86 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.35 |  18.98 |  19.35 |    0.37 |   18.47 |    19.4 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.52 |  19.17 |  19.55 |    0.38 |   18.73 |   19.59 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.84 |  19.23 |  19.85 |    0.62 |    18.8 |   19.85 |

```text
large-few cold-create 1024//adaptive aws         | ####################### 63.28 s
large-few unchanged-update 1024//adaptive aws    | ########### 30.4 s
large-few changed-update 1024//adaptive aws      | ########### 30.43 s
large-few pruned-update 1024//adaptive aws       | ########### 30.86 s
large-few cold-create 1024/32/adaptive shin      | ##################### 57.15 s
large-few unchanged-update 1024/32/adaptive shin | ####### 19.38 s
large-few changed-update 1024/32/adaptive shin   | ####### 19.52 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.92 s
large-few cold-create 2048//adaptive aws         | ##################### 57.82 s
large-few unchanged-update 2048//adaptive aws    | ######### 24.85 s
large-few changed-update 2048//adaptive aws      | ######### 24.86 s
large-few pruned-update 2048//adaptive aws       | ######### 25.32 s
large-few cold-create 2048/64/adaptive shin      | ################### 52.48 s
large-few unchanged-update 2048/64/adaptive shin | ####### 19.39 s
large-few changed-update 2048/64/adaptive shin   | ####### 19.52 s
large-few pruned-update 2048/64/adaptive shin    | ####### 19.86 s
mixed cold-create 1024//adaptive aws             | ####################### 63.38 s
mixed unchanged-update 1024//adaptive aws        | ########### 30.34 s
mixed changed-update 1024//adaptive aws          | ########### 30.36 s
mixed pruned-update 1024//adaptive aws           | ########### 30.8 s
mixed cold-create 1024/32/adaptive shin          | ################### 52.42 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 19.38 s
mixed changed-update 1024/32/adaptive shin       | ####### 19.5 s
mixed pruned-update 1024/32/adaptive shin        | ####### 19.84 s
mixed cold-create 2048//adaptive aws             | ##################### 57.82 s
mixed unchanged-update 2048//adaptive aws        | ######### 24.86 s
mixed changed-update 2048//adaptive aws          | ######### 24.85 s
mixed pruned-update 2048//adaptive aws           | ######### 25.1 s
mixed cold-create 2048/64/adaptive shin          | ################### 52.4 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 19.33 s
mixed changed-update 2048/64/adaptive shin       | ####### 19.49 s
mixed pruned-update 2048/64/adaptive shin        | ####### 19.83 s
tiny-many cold-create 1024//adaptive aws         | ############################## 83.11 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 47.09 s
tiny-many changed-update 1024//adaptive aws      | ################# 47.29 s
tiny-many pruned-update 1024//adaptive aws       | ################# 47.62 s
tiny-many cold-create 1024/32/adaptive shin      | ##################### 57.84 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 19.33 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.52 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 20 s
tiny-many cold-create 2048//adaptive aws         | ######################### 68.8 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 35.96 s
tiny-many changed-update 2048//adaptive aws      | ############# 36.02 s
tiny-many pruned-update 2048//adaptive aws       | ############# 36.41 s
tiny-many cold-create 2048/64/adaptive shin      | ##################### 57.14 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 19.35 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 19.52 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 19.84 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      415 |      417 |         2 |       415 |       418 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          132 |      121 |      134 |        13 |       117 |       142 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        35 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        39 |        42 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           41 |       40 |       41 |         1 |        39 |        41 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       448 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       416 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          191 |      182 |      201 |        19 |       178 |       207 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           41 |       40 |       41 |         1 |        40 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        39 |        41 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      281 |         1 |       280 |       281 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       279 |       282 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      281 |         1 |       280 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       272 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          102 |      101 |      103 |         2 |       101 |       104 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       35 |         2 |        33 |        35 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        37 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        39 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       281 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       282 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      274 |      275 |         1 |       273 |       275 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          113 |      112 |      118 |         6 |       112 |       120 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       33 |       35 |         2 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       38 |         1 |        37 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       37 |       39 |         2 |        37 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      220 |         1 |       219 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          212 |      211 |      214 |         3 |       210 |       217 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          213 |      211 |      214 |         3 |       211 |       214 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          215 |      209 |      217 |         8 |       209 |       218 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           58 |       57 |       58 |         1 |        50 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        37 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      224 |         1 |       223 |       224 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      222 |         1 |       221 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       222 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       218 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           69 |       68 |       70 |         2 |        66 |        72 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        36 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ######### 132 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 40 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 41 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 191 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 41 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 40 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 280 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 102 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 283 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 283 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 113 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 35 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ### 39 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 212 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 213 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 215 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 58 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 36 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 221 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 222 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 69 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
