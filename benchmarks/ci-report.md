# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-25
- Run ID: 98c176b7-469f-48f0-84c6-5a4b8dc2a259
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |   2.008 s vs 8.378 s (4.172x faster) | 72.408 s vs 80.146 s (1.107x faster) | 55.19 s vs 62.41 s (1.131x faster) | 119 MiB vs 450 MiB (73.556% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.282 s vs 8.224 s (29.163x faster) | 36.862 s vs 45.413 s (1.232x faster) |  18.87 s vs 29.8 s (1.579x faster) |  35 MiB vs 451 MiB (92.239% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.449 s vs 8.294 s (18.472x faster) | 41.445 s vs 48.932 s (1.181x faster) | 19.12 s vs 29.73 s (1.555x faster) |  42 MiB vs 451 MiB (90.687% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.527 s vs 7.989 s (15.159x faster) | 38.211 s vs 47.937 s (1.255x faster) |  19.02 s vs 28.7 s (1.509x faster) |  42 MiB vs 421 MiB (90.024% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.217 s vs 4.656 s (3.826x faster) | 69.929 s vs 72.984 s (1.044x faster) |  55.13 s vs 57.2 s (1.038x faster) | 187 MiB vs 451 MiB (58.537% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.219 s vs 4.688 s (21.406x faster) | 35.995 s vs 40.182 s (1.116x faster) | 18.86 s vs 24.35 s (1.291x faster) |  35 MiB vs 451 MiB (92.239% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |  0.404 s vs 4.621 s (11.438x faster) | 38.088 s vs 42.481 s (1.115x faster) |   18.9 s vs 24.3 s (1.286x faster) |  43 MiB vs 451 MiB (90.466% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.484 s vs 4.503 s (9.304x faster) | 40.079 s vs 42.923 s (1.071x faster) | 19.09 s vs 24.51 s (1.284x faster) |  41 MiB vs 421 MiB (90.261% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.429 s vs 8.775 s (6.141x faster) |  70.227 s vs 78.44 s (1.117x faster) | 55.28 s vs 62.57 s (1.132x faster) | 105 MiB vs 288 MiB (63.542% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |  0.285 s vs 9.059 s (31.786x faster) |  34.93 s vs 45.428 s (1.301x faster) |  18.9 s vs 29.71 s (1.572x faster) |  35 MiB vs 287 MiB (87.805% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |  0.465 s vs 8.859 s (19.052x faster) |  37.473 s vs 47.66 s (1.272x faster) | 19.01 s vs 29.79 s (1.567x faster) |  39 MiB vs 287 MiB (86.411% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |    1.058 s vs 8.919 s (8.43x faster) |  37.35 s vs 47.993 s (1.285x faster) | 19.16 s vs 29.92 s (1.562x faster) |  41 MiB vs 280 MiB (85.357% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.802 s vs 5.006 s (6.242x faster) | 68.804 s vs 72.809 s (1.058x faster) | 52.29 s vs 57.24 s (1.095x faster) | 118 MiB vs 288 MiB (59.028% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.265 s vs 5.002 s (18.875x faster) |  34.713 s vs 45.484 s (1.31x faster) | 18.85 s vs 24.34 s (1.291x faster) |  36 MiB vs 289 MiB (87.543% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |   0.354 s vs 5.11 s (14.435x faster) | 37.852 s vs 42.701 s (1.128x faster) | 19.08 s vs 24.37 s (1.277x faster) |  39 MiB vs 288 MiB (86.458% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.064 s vs 5.463 s (5.134x faster) |  37.235 s vs 42.834 s (1.15x faster) | 19.15 s vs 24.41 s (1.275x faster) |  39 MiB vs 280 MiB (86.071% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.617 s vs 23.202 s (8.866x faster) | 73.438 s vs 91.533 s (1.246x faster) | 57.23 s vs 76.28 s (1.333x faster) |  59 MiB vs 228 MiB (74.123% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.506 s vs 24.023 s (47.476x faster) | 35.017 s vs 62.821 s (1.794x faster) |  18.91 s vs 44.43 s (2.35x faster) |  38 MiB vs 226 MiB (83.186% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.619 s vs 26.017 s (42.031x faster) | 38.186 s vs 69.598 s (1.823x faster) | 19.04 s vs 47.13 s (2.475x faster) |   38 MiB vs 227 MiB (83.26% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.402 s vs 23.063 s (16.45x faster) | 41.099 s vs 66.351 s (1.614x faster) | 19.13 s vs 44.82 s (2.343x faster) |  38 MiB vs 222 MiB (82.883% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.499 s vs 12.919 s (8.618x faster) |  71.04 s vs 83.559 s (1.176x faster) | 55.63 s vs 68.08 s (1.224x faster) |  73 MiB vs 232 MiB (68.534% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive |  0.49 s vs 13.303 s (27.149x faster) | 34.895 s vs 48.318 s (1.385x faster) | 18.93 s vs 33.96 s (1.794x faster) |  38 MiB vs 229 MiB (83.406% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.576 s vs 13.591 s (23.595x faster) |  37.947 s vs 54.12 s (1.426x faster) | 18.98 s vs 34.14 s (1.799x faster) |  38 MiB vs 229 MiB (83.406% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive |  1.357 s vs 12.785 s (9.422x faster) | 40.764 s vs 51.531 s (1.264x faster) |  19.2 s vs 30.71 s (1.599x faster) |   38 MiB vs 227 MiB (83.26% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.008 s |              8.378 s |    +6.37 s |   4.172x |   +317.231% |
| Billed duration   |              2.129 s |              8.763 s |   +6.634 s |   4.116x |   +311.602% |
| Init duration     |              0.119 s |              0.399 s |    +0.28 s |   3.353x |   +235.294% |
| Local wall time   |             72.408 s |             80.146 s |   +7.738 s |   1.107x |    +10.687% |
| CDK deploy time   |              55.19 s |              62.41 s |    +7.22 s |   1.131x |    +13.082% |
| Max memory        |              119 MiB |              450 MiB |   +331 MiB |   3.782x |   +278.151% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.282 s |              8.224 s |   +7.942 s |  29.163x |  +2816.312% |
| Billed duration   |              0.416 s |               8.63 s |   +8.214 s |  20.745x |  +1974.519% |
| Init duration     |              0.117 s |               0.39 s |   +0.273 s |   3.333x |   +233.333% |
| Local wall time   |             36.862 s |             45.413 s |   +8.551 s |   1.232x |    +23.197% |
| CDK deploy time   |              18.87 s |               29.8 s |   +10.93 s |   1.579x |    +57.923% |
| Max memory        |               35 MiB |              451 MiB |   +416 MiB |  12.886x |  +1188.571% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.449 s |              8.294 s |   +7.845 s |  18.472x |  +1747.216% |
| Billed duration   |              0.566 s |              8.673 s |   +8.107 s |  15.323x |  +1432.332% |
| Init duration     |              0.118 s |              0.385 s |   +0.267 s |   3.263x |   +226.271% |
| Local wall time   |             41.445 s |             48.932 s |   +7.487 s |   1.181x |    +18.065% |
| CDK deploy time   |              19.12 s |              29.73 s |   +10.61 s |   1.555x |    +55.492% |
| Max memory        |               42 MiB |              451 MiB |   +409 MiB |  10.738x |    +973.81% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.527 s |              7.989 s |   +7.462 s |  15.159x |  +1415.939% |
| Billed duration   |              0.652 s |               8.38 s |   +7.728 s |  12.853x |  +1185.276% |
| Init duration     |              0.121 s |               0.39 s |   +0.269 s |   3.223x |   +222.314% |
| Local wall time   |             38.211 s |             47.937 s |   +9.726 s |   1.255x |    +25.453% |
| CDK deploy time   |              19.02 s |               28.7 s |    +9.68 s |   1.509x |    +50.894% |
| Max memory        |               42 MiB |              421 MiB |   +379 MiB |  10.024x |   +902.381% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.217 s |              4.656 s |   +3.439 s |   3.826x |    +282.58% |
| Billed duration   |              1.335 s |              5.042 s |   +3.707 s |   3.777x |   +277.678% |
| Init duration     |               0.12 s |              0.385 s |   +0.265 s |   3.208x |   +220.833% |
| Local wall time   |             69.929 s |             72.984 s |   +3.055 s |   1.044x |     +4.369% |
| CDK deploy time   |              55.13 s |               57.2 s |    +2.07 s |   1.038x |     +3.755% |
| Max memory        |              187 MiB |              451 MiB |   +264 MiB |   2.412x |   +141.176% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.219 s |              4.688 s |   +4.469 s |  21.406x |  +2040.639% |
| Billed duration   |               0.34 s |              5.072 s |   +4.732 s |  14.918x |  +1391.765% |
| Init duration     |              0.117 s |              0.404 s |   +0.287 s |   3.453x |   +245.299% |
| Local wall time   |             35.995 s |             40.182 s |   +4.187 s |   1.116x |    +11.632% |
| CDK deploy time   |              18.86 s |              24.35 s |    +5.49 s |   1.291x |    +29.109% |
| Max memory        |               35 MiB |              451 MiB |   +416 MiB |  12.886x |  +1188.571% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.404 s |              4.621 s |   +4.217 s |  11.438x |  +1043.812% |
| Billed duration   |              0.532 s |              5.021 s |   +4.489 s |   9.438x |   +843.797% |
| Init duration     |              0.127 s |              0.399 s |   +0.272 s |   3.142x |   +214.173% |
| Local wall time   |             38.088 s |             42.481 s |   +4.393 s |   1.115x |    +11.534% |
| CDK deploy time   |               18.9 s |               24.3 s |     +5.4 s |   1.286x |    +28.571% |
| Max memory        |               43 MiB |              451 MiB |   +408 MiB |  10.488x |   +948.837% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.484 s |              4.503 s |   +4.019 s |   9.304x |   +830.372% |
| Billed duration   |              0.606 s |              4.888 s |   +4.282 s |   8.066x |   +706.601% |
| Init duration     |              0.122 s |              0.385 s |   +0.263 s |   3.156x |   +215.574% |
| Local wall time   |             40.079 s |             42.923 s |   +2.844 s |   1.071x |     +7.096% |
| CDK deploy time   |              19.09 s |              24.51 s |    +5.42 s |   1.284x |    +28.392% |
| Max memory        |               41 MiB |              421 MiB |   +380 MiB |  10.268x |   +926.829% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.429 s |              8.775 s |   +7.346 s |   6.141x |   +514.066% |
| Billed duration   |              1.557 s |              9.175 s |   +7.618 s |   5.893x |   +489.274% |
| Init duration     |              0.125 s |              0.417 s |   +0.292 s |   3.336x |     +233.6% |
| Local wall time   |             70.227 s |              78.44 s |   +8.213 s |   1.117x |    +11.695% |
| CDK deploy time   |              55.28 s |              62.57 s |    +7.29 s |   1.132x |    +13.187% |
| Max memory        |              105 MiB |              288 MiB |   +183 MiB |   2.743x |   +174.286% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.285 s |              9.059 s |   +8.774 s |  31.786x |  +3078.596% |
| Billed duration   |              0.399 s |              9.447 s |   +9.048 s |  23.677x |  +2267.669% |
| Init duration     |              0.118 s |              0.387 s |   +0.269 s |    3.28x |   +227.966% |
| Local wall time   |              34.93 s |             45.428 s |  +10.498 s |   1.301x |    +30.054% |
| CDK deploy time   |               18.9 s |              29.71 s |   +10.81 s |   1.572x |    +57.196% |
| Max memory        |               35 MiB |              287 MiB |   +252 MiB |     8.2x |       +720% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.465 s |              8.859 s |   +8.394 s |  19.052x |  +1805.161% |
| Billed duration   |              0.583 s |              9.234 s |   +8.651 s |  15.839x |  +1483.877% |
| Init duration     |              0.119 s |              0.387 s |   +0.268 s |   3.252x |    +225.21% |
| Local wall time   |             37.473 s |              47.66 s |  +10.187 s |   1.272x |    +27.185% |
| CDK deploy time   |              19.01 s |              29.79 s |   +10.78 s |   1.567x |    +56.707% |
| Max memory        |               39 MiB |              287 MiB |   +248 MiB |   7.359x |   +635.897% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.058 s |              8.919 s |   +7.861 s |    8.43x |   +743.006% |
| Billed duration   |              1.183 s |              9.321 s |   +8.138 s |   7.879x |   +687.912% |
| Init duration     |              0.119 s |              0.401 s |   +0.282 s |    3.37x |   +236.975% |
| Local wall time   |              37.35 s |             47.993 s |  +10.643 s |   1.285x |    +28.495% |
| CDK deploy time   |              19.16 s |              29.92 s |   +10.76 s |   1.562x |    +56.159% |
| Max memory        |               41 MiB |              280 MiB |   +239 MiB |   6.829x |   +582.927% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.802 s |              5.006 s |   +4.204 s |   6.242x |    +524.19% |
| Billed duration   |              0.927 s |              5.389 s |   +4.462 s |   5.813x |   +481.338% |
| Init duration     |              0.117 s |              0.383 s |   +0.266 s |   3.274x |    +227.35% |
| Local wall time   |             68.804 s |             72.809 s |   +4.005 s |   1.058x |     +5.821% |
| CDK deploy time   |              52.29 s |              57.24 s |    +4.95 s |   1.095x |     +9.466% |
| Max memory        |              118 MiB |              288 MiB |   +170 MiB |   2.441x |   +144.068% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.265 s |              5.002 s |   +4.737 s |  18.875x |  +1787.547% |
| Billed duration   |              0.388 s |              5.379 s |   +4.991 s |  13.863x |   +1286.34% |
| Init duration     |              0.122 s |              0.392 s |    +0.27 s |   3.213x |   +221.311% |
| Local wall time   |             34.713 s |             45.484 s |  +10.771 s |    1.31x |    +31.029% |
| CDK deploy time   |              18.85 s |              24.34 s |    +5.49 s |   1.291x |    +29.125% |
| Max memory        |               36 MiB |              289 MiB |   +253 MiB |   8.028x |   +702.778% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.354 s |               5.11 s |   +4.756 s |  14.435x |  +1343.503% |
| Billed duration   |              0.479 s |               5.51 s |   +5.031 s |  11.503x |  +1050.313% |
| Init duration     |              0.121 s |              0.388 s |   +0.267 s |   3.207x |   +220.661% |
| Local wall time   |             37.852 s |             42.701 s |   +4.849 s |   1.128x |     +12.81% |
| CDK deploy time   |              19.08 s |              24.37 s |    +5.29 s |   1.277x |    +27.725% |
| Max memory        |               39 MiB |              288 MiB |   +249 MiB |   7.385x |   +638.462% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.064 s |              5.463 s |   +4.399 s |   5.134x |    +413.44% |
| Billed duration   |               1.18 s |              5.844 s |   +4.664 s |   4.953x |   +395.254% |
| Init duration     |              0.117 s |              0.402 s |   +0.285 s |   3.436x |    +243.59% |
| Local wall time   |             37.235 s |             42.834 s |   +5.599 s |    1.15x |    +15.037% |
| CDK deploy time   |              19.15 s |              24.41 s |    +5.26 s |   1.275x |    +27.467% |
| Max memory        |               39 MiB |              280 MiB |   +241 MiB |   7.179x |   +617.949% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.617 s |             23.202 s |  +20.585 s |   8.866x |   +786.588% |
| Billed duration   |              2.734 s |             23.607 s |  +20.873 s |   8.635x |    +763.46% |
| Init duration     |              0.119 s |              0.398 s |   +0.279 s |   3.345x |   +234.454% |
| Local wall time   |             73.438 s |             91.533 s |  +18.095 s |   1.246x |     +24.64% |
| CDK deploy time   |              57.23 s |              76.28 s |   +19.05 s |   1.333x |    +33.287% |
| Max memory        |               59 MiB |              228 MiB |   +169 MiB |   3.864x |   +286.441% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.506 s |             24.023 s |  +23.517 s |  47.476x |  +4647.628% |
| Billed duration   |              0.626 s |             24.404 s |  +23.778 s |  38.984x |  +3798.403% |
| Init duration     |               0.12 s |              0.383 s |   +0.263 s |   3.192x |   +219.167% |
| Local wall time   |             35.017 s |             62.821 s |  +27.804 s |   1.794x |    +79.401% |
| CDK deploy time   |              18.91 s |              44.43 s |   +25.52 s |    2.35x |   +134.955% |
| Max memory        |               38 MiB |              226 MiB |   +188 MiB |   5.947x |   +494.737% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.619 s |             26.017 s |  +25.398 s |  42.031x |  +4103.069% |
| Billed duration   |              0.736 s |             26.523 s |  +25.787 s |  36.037x |  +3503.668% |
| Init duration     |              0.117 s |              0.505 s |   +0.388 s |   4.316x |   +331.624% |
| Local wall time   |             38.186 s |             69.598 s |  +31.412 s |   1.823x |    +82.261% |
| CDK deploy time   |              19.04 s |              47.13 s |   +28.09 s |   2.475x |   +147.532% |
| Max memory        |               38 MiB |              227 MiB |   +189 MiB |   5.974x |   +497.368% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.402 s |             23.063 s |  +21.661 s |   16.45x |  +1545.007% |
| Billed duration   |              1.518 s |             23.444 s |  +21.926 s |  15.444x |  +1444.401% |
| Init duration     |              0.116 s |               0.39 s |   +0.274 s |   3.362x |   +236.207% |
| Local wall time   |             41.099 s |             66.351 s |  +25.252 s |   1.614x |    +61.442% |
| CDK deploy time   |              19.13 s |              44.82 s |   +25.69 s |   2.343x |   +134.292% |
| Max memory        |               38 MiB |              222 MiB |   +184 MiB |   5.842x |   +484.211% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.499 s |             12.919 s |   +11.42 s |   8.618x |   +761.841% |
| Billed duration   |               1.62 s |             13.314 s |  +11.694 s |   8.219x |   +721.852% |
| Init duration     |               0.12 s |              0.394 s |   +0.274 s |   3.283x |   +228.333% |
| Local wall time   |              71.04 s |             83.559 s |  +12.519 s |   1.176x |    +17.622% |
| CDK deploy time   |              55.63 s |              68.08 s |   +12.45 s |   1.224x |     +22.38% |
| Max memory        |               73 MiB |              232 MiB |   +159 MiB |   3.178x |   +217.808% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.49 s |             13.303 s |  +12.813 s |  27.149x |  +2614.898% |
| Billed duration   |               0.61 s |             13.689 s |  +13.079 s |  22.441x |  +2144.098% |
| Init duration     |              0.119 s |              0.386 s |   +0.267 s |   3.244x |    +224.37% |
| Local wall time   |             34.895 s |             48.318 s |  +13.423 s |   1.385x |    +38.467% |
| CDK deploy time   |              18.93 s |              33.96 s |   +15.03 s |   1.794x |    +79.398% |
| Max memory        |               38 MiB |              229 MiB |   +191 MiB |   6.026x |   +502.632% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.576 s |             13.591 s |  +13.015 s |  23.595x |  +2259.549% |
| Billed duration   |              0.699 s |             13.969 s |   +13.27 s |  19.984x |  +1898.426% |
| Init duration     |               0.12 s |              0.385 s |   +0.265 s |   3.208x |   +220.833% |
| Local wall time   |             37.947 s |              54.12 s |  +16.173 s |   1.426x |     +42.62% |
| CDK deploy time   |              18.98 s |              34.14 s |   +15.16 s |   1.799x |    +79.874% |
| Max memory        |               38 MiB |              229 MiB |   +191 MiB |   6.026x |   +502.632% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.357 s |             12.785 s |  +11.428 s |   9.422x |   +842.152% |
| Billed duration   |              1.477 s |             13.177 s |    +11.7 s |   8.921x |   +792.146% |
| Init duration     |               0.12 s |              0.391 s |   +0.271 s |   3.258x |   +225.833% |
| Local wall time   |             40.764 s |             51.531 s |  +10.767 s |   1.264x |    +26.413% |
| CDK deploy time   |               19.2 s |              30.71 s |   +11.51 s |   1.599x |    +59.948% |
| Max memory        |               38 MiB |              227 MiB |   +189 MiB |   5.974x |   +497.368% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.378 |  8.283 |  9.218 |   0.935 |   8.034 |    9.25 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      8.224 |  8.145 |  8.455 |    0.31 |   6.695 |   8.506 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      8.294 |  8.238 |  8.359 |   0.121 |   8.206 |   8.361 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      7.989 |  7.816 |  8.016 |     0.2 |   7.814 |    8.98 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.008 |  1.977 |  2.014 |   0.037 |   1.907 |   2.367 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.282 |  0.247 |  0.319 |   0.072 |   0.239 |   0.336 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.449 |   0.43 |  0.449 |   0.019 |   0.427 |   0.624 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.527 |  0.523 |  0.704 |   0.181 |   0.513 |   0.886 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      4.656 |  4.618 |  4.767 |   0.149 |   4.615 |     5.5 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      4.688 |  4.637 |  4.957 |    0.32 |   4.463 |   5.335 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      4.621 |  4.571 |  4.631 |    0.06 |   3.671 |    4.64 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.503 |  4.462 |  5.361 |   0.899 |   4.349 |   5.608 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.217 |  1.181 |  1.247 |   0.066 |   1.181 |   1.278 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.219 |  0.216 |  0.231 |   0.015 |   0.206 |   0.251 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.404 |  0.383 |   0.47 |   0.087 |   0.369 |   0.538 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.484 |  0.466 |  0.493 |   0.027 |   0.459 |   0.551 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.775 |  8.663 |  9.454 |   0.791 |   8.521 |   9.585 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.059 |  8.951 |  9.219 |   0.268 |    8.93 |  10.095 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      8.859 |  8.837 |  8.891 |   0.054 |   8.697 |   10.05 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.919 |  8.797 |  9.055 |   0.258 |   8.756 |   9.649 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.429 |  1.267 |  1.454 |   0.187 |   1.231 |   2.074 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.285 |  0.276 |  0.293 |   0.017 |    0.27 |   0.309 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.465 |  0.422 |  0.571 |   0.149 |   0.378 |   0.792 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.058 |  1.055 |  1.066 |   0.011 |   1.045 |   1.228 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.006 |  4.972 |  5.013 |   0.041 |   4.966 |   5.032 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.002 |  4.958 |  5.134 |   0.176 |   4.147 |   5.162 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.11 |  5.101 |   5.19 |   0.089 |   5.032 |   5.754 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.463 |  5.033 |  5.503 |    0.47 |   4.933 |   5.723 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.802 |  0.781 |  0.848 |   0.067 |   0.775 |    1.38 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.265 |  0.265 |  0.268 |   0.003 |   0.261 |   0.289 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.354 |  0.353 |  0.379 |   0.026 |    0.35 |   0.408 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.064 |   1.05 |  1.093 |   0.043 |   1.034 |   1.152 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     23.202 | 22.436 | 23.352 |   0.916 |  22.238 |  23.637 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     24.023 | 23.675 | 24.119 |   0.444 |  23.037 |  24.997 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.017 | 24.354 | 26.141 |   1.787 |  15.685 |  26.652 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     23.063 | 23.052 | 23.176 |   0.124 |  22.953 |   23.47 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.617 |  2.574 |  2.633 |   0.059 |   2.516 |   2.694 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.506 |  0.495 |   0.54 |   0.045 |   0.482 |   0.544 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.619 |  0.612 |  0.638 |   0.026 |   0.563 |   0.704 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.402 |  1.397 |  1.487 |    0.09 |   1.378 |   1.885 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     12.919 | 12.591 | 13.174 |   0.583 |  10.627 |  15.063 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     13.303 |  13.23 | 13.434 |   0.204 |  13.215 |  13.516 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     13.591 |  13.47 | 13.706 |   0.236 |  13.461 |  14.361 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     12.785 | 12.564 |  12.95 |   0.386 |   11.46 |  13.627 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.499 |  1.482 |  1.558 |   0.076 |   1.452 |   1.573 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.49 |  0.484 |  0.521 |   0.037 |   0.464 |   0.527 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.576 |  0.555 |  0.581 |   0.026 |   0.538 |   0.584 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.357 |  1.333 |  1.391 |   0.058 |   1.259 |   1.404 |

```text
large-few cold-create 1024//adaptive aws         | ########## 8.378 s
large-few unchanged-update 1024//adaptive aws    | ######### 8.224 s
large-few changed-update 1024//adaptive aws      | ########## 8.294 s
large-few pruned-update 1024//adaptive aws       | ######### 7.989 s
large-few cold-create 1024/32/adaptive shin      | ## 2.008 s
large-few unchanged-update 1024/32/adaptive shin | # 0.282 s
large-few changed-update 1024/32/adaptive shin   | # 0.449 s
large-few pruned-update 1024/32/adaptive shin    | # 0.527 s
large-few cold-create 2048//adaptive aws         | ##### 4.656 s
large-few unchanged-update 2048//adaptive aws    | ##### 4.688 s
large-few changed-update 2048//adaptive aws      | ##### 4.621 s
large-few pruned-update 2048//adaptive aws       | ##### 4.503 s
large-few cold-create 2048/64/adaptive shin      | # 1.217 s
large-few unchanged-update 2048/64/adaptive shin | # 0.219 s
large-few changed-update 2048/64/adaptive shin   | # 0.404 s
large-few pruned-update 2048/64/adaptive shin    | # 0.484 s
mixed cold-create 1024//adaptive aws             | ########## 8.775 s
mixed unchanged-update 1024//adaptive aws        | ########## 9.059 s
mixed changed-update 1024//adaptive aws          | ########## 8.859 s
mixed pruned-update 1024//adaptive aws           | ########## 8.919 s
mixed cold-create 1024/32/adaptive shin          | ## 1.429 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.285 s
mixed changed-update 1024/32/adaptive shin       | # 0.465 s
mixed pruned-update 1024/32/adaptive shin        | # 1.058 s
mixed cold-create 2048//adaptive aws             | ###### 5.006 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.002 s
mixed changed-update 2048//adaptive aws          | ###### 5.11 s
mixed pruned-update 2048//adaptive aws           | ###### 5.463 s
mixed cold-create 2048/64/adaptive shin          | # 0.802 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.265 s
mixed changed-update 2048/64/adaptive shin       | # 0.354 s
mixed pruned-update 2048/64/adaptive shin        | # 1.064 s
tiny-many cold-create 1024//adaptive aws         | ########################### 23.202 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 24.023 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.017 s
tiny-many pruned-update 1024//adaptive aws       | ########################### 23.063 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.617 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.506 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.619 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.402 s
tiny-many cold-create 2048//adaptive aws         | ############### 12.919 s
tiny-many unchanged-update 2048//adaptive aws    | ############### 13.303 s
tiny-many changed-update 2048//adaptive aws      | ################ 13.591 s
tiny-many pruned-update 2048//adaptive aws       | ############### 12.785 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.499 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.49 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.576 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.357 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      8.763 |  8.677 |   9.74 |   1.063 |   8.433 |   9.766 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       8.63 |  8.535 |  8.848 |   0.313 |   6.988 |   8.875 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      8.673 |  8.622 |  8.753 |   0.131 |   8.592 |   8.761 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       8.38 |   8.21 |    8.4 |    0.19 |   8.204 |   9.508 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.129 |  2.094 |  2.132 |   0.038 |    2.03 |   2.486 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.416 |  0.364 |  0.437 |   0.073 |   0.355 |   0.454 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.566 |  0.558 |  0.568 |    0.01 |   0.543 |   0.752 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.652 |  0.645 |  0.822 |   0.177 |   0.634 |   1.004 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.042 |  5.016 |  5.152 |   0.136 |       5 |   6.023 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.072 |  5.042 |  5.364 |   0.322 |   4.864 |   5.843 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.021 |  4.956 |  5.032 |   0.076 |   3.973 |   5.042 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.888 |  4.844 |  5.846 |   1.002 |   4.728 |   6.121 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.335 |  1.308 |  1.367 |   0.059 |   1.304 |   1.397 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.34 |  0.335 |  0.352 |   0.017 |   0.304 |   0.369 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.532 |  0.502 |  0.631 |   0.129 |   0.497 |    0.66 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.606 |  0.581 |   0.62 |   0.039 |   0.581 |   0.676 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.175 |  9.059 |  9.974 |   0.915 |   8.939 |  10.086 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.447 |  9.339 |  9.614 |   0.275 |   9.317 |  10.599 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.234 |  9.224 |  9.275 |   0.051 |    9.09 |  10.567 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.321 |  9.175 |  9.456 |   0.281 |    9.13 |  10.168 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.557 |  1.393 |   1.58 |   0.187 |   1.351 |   2.192 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.399 |  0.391 |  0.401 |    0.01 |   0.388 |   0.465 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.583 |  0.576 |  0.691 |   0.115 |   0.496 |   0.911 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.183 |  1.173 |  1.217 |   0.044 |   1.164 |    1.35 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.389 |  5.369 |  5.415 |   0.046 |   5.351 |   5.416 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.379 |  5.359 |  5.554 |   0.195 |    4.44 |   5.566 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.51 |  5.487 |  5.579 |   0.092 |   5.417 |   6.264 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.844 |  5.436 |  6.004 |   0.568 |   5.336 |   6.235 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.927 |  0.899 |  0.965 |   0.066 |   0.891 |   1.531 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.388 |  0.386 |   0.42 |   0.034 |   0.384 |   0.441 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.479 |  0.472 |  0.498 |   0.026 |   0.453 |   0.529 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       1.18 |  1.167 |   1.21 |   0.043 |   1.154 |   1.274 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     23.607 | 22.822 |  23.75 |   0.928 |  22.638 |  24.014 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     24.404 | 24.058 | 24.503 |   0.445 |  23.417 |  25.398 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.523 | 24.743 | 26.678 |   1.935 |  15.959 |  27.293 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     23.444 | 23.442 | 23.571 |   0.129 |   23.35 |  23.858 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.734 |    2.7 |  2.753 |   0.053 |   2.633 |   2.813 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.626 |  0.624 |  0.665 |   0.041 |   0.602 |   0.665 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.736 |   0.73 |  0.756 |   0.026 |   0.681 |    0.82 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.518 |  1.518 |  1.582 |   0.064 |   1.493 |   2.006 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     13.314 | 12.978 | 13.574 |   0.596 |  10.912 |  15.568 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     13.689 | 13.611 | 13.842 |   0.231 |  13.607 |  13.903 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     13.969 | 13.861 | 14.087 |   0.226 |  13.856 |  14.752 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     13.177 | 12.941 | 13.332 |   0.391 |  11.999 |  14.031 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       1.62 |  1.603 |  1.677 |   0.074 |   1.573 |   1.689 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.61 |  0.608 |  0.639 |   0.031 |   0.583 |   0.679 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.699 |  0.675 |  0.702 |   0.027 |   0.657 |    0.74 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.477 |  1.449 |  1.525 |   0.076 |   1.374 |    1.55 |

```text
large-few cold-create 1024//adaptive aws         | ########## 8.763 s
large-few unchanged-update 1024//adaptive aws    | ########## 8.63 s
large-few changed-update 1024//adaptive aws      | ########## 8.673 s
large-few pruned-update 1024//adaptive aws       | ######### 8.38 s
large-few cold-create 1024/32/adaptive shin      | ## 2.129 s
large-few unchanged-update 1024/32/adaptive shin | # 0.416 s
large-few changed-update 1024/32/adaptive shin   | # 0.566 s
large-few pruned-update 1024/32/adaptive shin    | # 0.652 s
large-few cold-create 2048//adaptive aws         | ###### 5.042 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.072 s
large-few changed-update 2048//adaptive aws      | ###### 5.021 s
large-few pruned-update 2048//adaptive aws       | ###### 4.888 s
large-few cold-create 2048/64/adaptive shin      | ## 1.335 s
large-few unchanged-update 2048/64/adaptive shin | # 0.34 s
large-few changed-update 2048/64/adaptive shin   | # 0.532 s
large-few pruned-update 2048/64/adaptive shin    | # 0.606 s
mixed cold-create 1024//adaptive aws             | ########## 9.175 s
mixed unchanged-update 1024//adaptive aws        | ########### 9.447 s
mixed changed-update 1024//adaptive aws          | ########## 9.234 s
mixed pruned-update 1024//adaptive aws           | ########### 9.321 s
mixed cold-create 1024/32/adaptive shin          | ## 1.557 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.399 s
mixed changed-update 1024/32/adaptive shin       | # 0.583 s
mixed pruned-update 1024/32/adaptive shin        | # 1.183 s
mixed cold-create 2048//adaptive aws             | ###### 5.389 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.379 s
mixed changed-update 2048//adaptive aws          | ###### 5.51 s
mixed pruned-update 2048//adaptive aws           | ####### 5.844 s
mixed cold-create 2048/64/adaptive shin          | # 0.927 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.388 s
mixed changed-update 2048/64/adaptive shin       | # 0.479 s
mixed pruned-update 2048/64/adaptive shin        | # 1.18 s
tiny-many cold-create 1024//adaptive aws         | ########################### 23.607 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 24.404 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.523 s
tiny-many pruned-update 1024//adaptive aws       | ########################### 23.444 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.734 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.626 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.736 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.518 s
tiny-many cold-create 2048//adaptive aws         | ############### 13.314 s
tiny-many unchanged-update 2048//adaptive aws    | ############### 13.689 s
tiny-many changed-update 2048//adaptive aws      | ################ 13.969 s
tiny-many pruned-update 2048//adaptive aws       | ############### 13.177 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.62 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.61 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.699 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.477 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.399 |  0.393 |  0.516 |   0.123 |   0.385 |   0.521 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       0.39 |  0.369 |  0.392 |   0.023 |   0.293 |   0.406 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.385 |  0.384 |  0.393 |   0.009 |   0.379 |   0.399 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       0.39 |  0.388 |  0.396 |   0.008 |   0.384 |   0.528 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.117 |  0.121 |   0.004 |   0.117 |   0.123 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.117 |  0.118 |   0.001 |   0.115 |   0.134 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.127 |    0.01 |   0.115 |   0.127 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.118 |  0.121 |   0.003 |   0.117 |   0.125 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.385 |  0.385 |  0.398 |   0.013 |   0.385 |   0.522 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.404 |    0.4 |  0.407 |   0.007 |   0.383 |   0.508 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.399 |  0.384 |  0.401 |   0.017 |   0.302 |   0.401 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.385 |  0.382 |  0.484 |   0.102 |   0.379 |   0.512 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.119 |  0.123 |   0.004 |   0.117 |   0.126 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.116 |   0.12 |   0.004 |   0.097 |   0.123 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.127 |  0.121 |  0.127 |   0.006 |   0.119 |    0.16 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.121 |  0.125 |   0.004 |   0.114 |   0.126 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.417 |  0.399 |  0.501 |   0.102 |   0.396 |   0.519 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.387 |  0.387 |  0.394 |   0.007 |   0.386 |   0.504 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.387 |  0.384 |  0.392 |   0.008 |   0.374 |   0.516 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.401 |  0.378 |  0.401 |   0.023 |   0.373 |   0.519 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.125 |   0.12 |  0.126 |   0.006 |   0.118 |   0.128 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.122 |   0.006 |   0.097 |   0.155 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |   0.12 |   0.002 |   0.117 |   0.154 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.122 |   0.004 |   0.116 |   0.158 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.383 |  0.382 |  0.402 |    0.02 |   0.378 |   0.402 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.392 |  0.377 |    0.4 |   0.023 |   0.293 |   0.432 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.388 |  0.386 |    0.4 |   0.014 |   0.384 |    0.51 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.402 |  0.402 |    0.5 |   0.098 |   0.381 |   0.512 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.117 |  0.125 |   0.008 |   0.116 |    0.15 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.122 |  0.152 |    0.03 |   0.118 |   0.154 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.122 |   0.003 |   0.099 |   0.124 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.119 |   0.003 |   0.116 |   0.121 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.398 |  0.386 |    0.4 |   0.014 |   0.377 |   0.405 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.383 |   0.38 |  0.383 |   0.003 |   0.379 |   0.401 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.505 |  0.389 |  0.536 |   0.147 |   0.273 |    0.64 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       0.39 |  0.388 |  0.395 |   0.007 |    0.38 |   0.397 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.117 |  0.119 |   0.002 |   0.116 |   0.125 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.119 |  0.124 |   0.005 |   0.119 |   0.128 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.118 |   0.002 |   0.115 |   0.118 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |   0.12 |   0.006 |   0.094 |    0.12 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.394 |  0.387 |  0.399 |   0.012 |   0.285 |   0.504 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.386 |  0.385 |  0.392 |   0.007 |    0.38 |   0.407 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.385 |  0.381 |   0.39 |   0.009 |   0.378 |   0.399 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.391 |  0.381 |  0.404 |   0.023 |   0.376 |   0.538 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.119 |  0.121 |   0.002 |   0.116 |   0.121 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.125 |   0.007 |   0.118 |   0.151 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.119 |  0.125 |   0.006 |   0.118 |   0.156 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.116 |  0.121 |   0.005 |   0.115 |   0.159 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 0.399 s
large-few unchanged-update 1024//adaptive aws    | ####################### 0.39 s
large-few changed-update 1024//adaptive aws      | ####################### 0.385 s
large-few pruned-update 1024//adaptive aws       | ####################### 0.39 s
large-few cold-create 1024/32/adaptive shin      | ####### 0.119 s
large-few unchanged-update 1024/32/adaptive shin | ####### 0.117 s
large-few changed-update 1024/32/adaptive shin   | ####### 0.118 s
large-few pruned-update 1024/32/adaptive shin    | ####### 0.121 s
large-few cold-create 2048//adaptive aws         | ####################### 0.385 s
large-few unchanged-update 2048//adaptive aws    | ######################## 0.404 s
large-few changed-update 2048//adaptive aws      | ######################## 0.399 s
large-few pruned-update 2048//adaptive aws       | ####################### 0.385 s
large-few cold-create 2048/64/adaptive shin      | ####### 0.12 s
large-few unchanged-update 2048/64/adaptive shin | ####### 0.117 s
large-few changed-update 2048/64/adaptive shin   | ######## 0.127 s
large-few pruned-update 2048/64/adaptive shin    | ####### 0.122 s
mixed cold-create 1024//adaptive aws             | ######################### 0.417 s
mixed unchanged-update 1024//adaptive aws        | ####################### 0.387 s
mixed changed-update 1024//adaptive aws          | ####################### 0.387 s
mixed pruned-update 1024//adaptive aws           | ######################## 0.401 s
mixed cold-create 1024/32/adaptive shin          | ####### 0.125 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 0.118 s
mixed changed-update 1024/32/adaptive shin       | ####### 0.119 s
mixed pruned-update 1024/32/adaptive shin        | ####### 0.119 s
mixed cold-create 2048//adaptive aws             | ####################### 0.383 s
mixed unchanged-update 2048//adaptive aws        | ####################### 0.392 s
mixed changed-update 2048//adaptive aws          | ####################### 0.388 s
mixed pruned-update 2048//adaptive aws           | ######################## 0.402 s
mixed cold-create 2048/64/adaptive shin          | ####### 0.117 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 0.122 s
mixed changed-update 2048/64/adaptive shin       | ####### 0.121 s
mixed pruned-update 2048/64/adaptive shin        | ####### 0.117 s
tiny-many cold-create 1024//adaptive aws         | ######################## 0.398 s
tiny-many unchanged-update 1024//adaptive aws    | ####################### 0.383 s
tiny-many changed-update 1024//adaptive aws      | ############################## 0.505 s
tiny-many pruned-update 1024//adaptive aws       | ####################### 0.39 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.119 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 0.12 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 0.117 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 0.116 s
tiny-many cold-create 2048//adaptive aws         | ####################### 0.394 s
tiny-many unchanged-update 2048//adaptive aws    | ####################### 0.386 s
tiny-many changed-update 2048//adaptive aws      | ####################### 0.385 s
tiny-many pruned-update 2048//adaptive aws       | ####################### 0.391 s
tiny-many cold-create 2048/64/adaptive shin      | ####### 0.12 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 0.119 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 0.12 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 0.12 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.146 | 76.228 | 80.348 |    4.12 |  74.809 |   83.82 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     45.413 | 42.457 | 45.768 |   3.311 |  37.331 |  47.453 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     48.932 | 48.518 | 52.001 |   3.483 |  46.452 |  67.529 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.937 | 47.921 | 48.169 |   0.248 |  40.728 |  51.779 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     72.408 |  72.11 |   74.7 |    2.59 |  69.556 |  93.647 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.862 | 35.205 | 38.748 |   3.543 |  32.273 |  39.214 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     41.445 |  39.65 | 41.531 |   1.881 |  38.404 |  44.481 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.211 | 37.774 | 40.634 |    2.86 |  37.474 |  41.861 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     72.984 | 72.399 | 73.681 |   1.282 |  69.459 |  74.352 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     40.182 | 37.245 | 40.383 |   3.138 |  37.163 |  42.107 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.481 | 41.912 | 42.541 |   0.629 |  40.295 |  46.188 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.923 | 42.453 | 46.532 |   4.079 |  40.432 |  47.761 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.929 | 69.029 | 70.533 |   1.504 |  67.801 |  72.886 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     35.995 | 35.116 | 38.093 |   2.977 |  32.484 |  39.445 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.088 | 38.047 |  38.81 |   0.763 |  35.778 |  42.744 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     40.079 |  37.97 | 41.381 |   3.411 |  37.764 |  44.118 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      78.44 | 77.085 | 79.866 |   2.781 |  75.824 |  80.464 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     45.428 | 44.563 | 45.709 |   1.146 |  43.218 |  47.305 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      47.66 | 45.903 | 47.966 |   2.063 |  42.672 |  51.366 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.993 | 47.832 | 51.555 |   3.723 |      46 |  53.594 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.227 | 70.069 | 71.749 |    1.68 |  68.454 |  73.698 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      34.93 | 33.053 | 35.811 |   2.758 |  32.867 |  36.904 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.473 | 37.467 | 40.644 |   3.177 |  37.172 |  41.054 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      37.35 | 35.588 | 38.177 |   2.589 |  32.555 |  41.618 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     72.809 | 72.615 |  74.56 |   1.945 |  68.742 |  75.045 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     45.484 | 42.611 | 50.796 |   8.185 |   41.85 |  55.053 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.701 | 42.133 | 43.075 |   0.942 |  40.536 |  45.972 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.834 | 42.833 | 46.211 |   3.378 |  40.428 |  48.264 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     68.804 | 67.827 | 68.865 |   1.038 |  67.037 |  69.768 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     34.713 | 32.156 | 35.439 |   3.283 |  31.717 |  37.007 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.852 | 37.701 | 38.874 |   1.173 |  36.474 |  41.151 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.235 | 35.498 | 37.462 |   1.964 |  32.475 |  41.203 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     91.533 | 91.238 | 94.723 |   3.485 |  90.876 |  95.527 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     62.821 | 58.613 | 64.112 |   5.499 |  56.458 |  64.346 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     69.598 | 67.581 | 70.428 |   2.847 |  55.203 |  85.676 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     66.351 | 65.891 | 68.546 |   2.655 |  64.215 |   69.79 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     73.438 | 70.585 | 73.882 |   3.297 |  69.308 |  75.496 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     35.017 | 32.573 |  35.43 |   2.857 |  32.004 |  37.015 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.186 | 38.185 | 41.051 |   2.866 |  37.619 |   41.44 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     41.099 | 38.203 | 41.259 |   3.056 |  38.037 |  43.518 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     83.559 | 79.993 | 84.121 |   4.128 |  79.914 |  85.375 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     48.318 |  48.12 |   51.2 |    3.08 |  45.618 |  52.985 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      54.12 | 47.837 | 54.209 |   6.372 |  45.826 |  56.799 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     51.531 | 48.106 | 53.569 |   5.463 |  46.095 |  53.667 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      71.04 | 70.457 | 73.912 |   3.455 |  70.452 |  74.325 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     34.895 | 32.279 |  35.47 |   3.191 |  32.118 |  36.708 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.947 |  35.74 |  40.82 |    5.08 |  32.632 |  43.238 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     40.764 | 38.271 | 41.383 |   3.112 |  37.597 |   47.23 |

```text
large-few cold-create 1024//adaptive aws         | ########################## 80.146 s
large-few unchanged-update 1024//adaptive aws    | ############### 45.413 s
large-few changed-update 1024//adaptive aws      | ################ 48.932 s
large-few pruned-update 1024//adaptive aws       | ################ 47.937 s
large-few cold-create 1024/32/adaptive shin      | ######################## 72.408 s
large-few unchanged-update 1024/32/adaptive shin | ############ 36.862 s
large-few changed-update 1024/32/adaptive shin   | ############## 41.445 s
large-few pruned-update 1024/32/adaptive shin    | ############# 38.211 s
large-few cold-create 2048//adaptive aws         | ######################## 72.984 s
large-few unchanged-update 2048//adaptive aws    | ############# 40.182 s
large-few changed-update 2048//adaptive aws      | ############## 42.481 s
large-few pruned-update 2048//adaptive aws       | ############## 42.923 s
large-few cold-create 2048/64/adaptive shin      | ####################### 69.929 s
large-few unchanged-update 2048/64/adaptive shin | ############ 35.995 s
large-few changed-update 2048/64/adaptive shin   | ############ 38.088 s
large-few pruned-update 2048/64/adaptive shin    | ############# 40.079 s
mixed cold-create 1024//adaptive aws             | ########################## 78.44 s
mixed unchanged-update 1024//adaptive aws        | ############### 45.428 s
mixed changed-update 1024//adaptive aws          | ################ 47.66 s
mixed pruned-update 1024//adaptive aws           | ################ 47.993 s
mixed cold-create 1024/32/adaptive shin          | ####################### 70.227 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 34.93 s
mixed changed-update 1024/32/adaptive shin       | ############ 37.473 s
mixed pruned-update 1024/32/adaptive shin        | ############ 37.35 s
mixed cold-create 2048//adaptive aws             | ######################## 72.809 s
mixed unchanged-update 2048//adaptive aws        | ############### 45.484 s
mixed changed-update 2048//adaptive aws          | ############## 42.701 s
mixed pruned-update 2048//adaptive aws           | ############## 42.834 s
mixed cold-create 2048/64/adaptive shin          | ####################### 68.804 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 34.713 s
mixed changed-update 2048/64/adaptive shin       | ############ 37.852 s
mixed pruned-update 2048/64/adaptive shin        | ############ 37.235 s
tiny-many cold-create 1024//adaptive aws         | ############################## 91.533 s
tiny-many unchanged-update 1024//adaptive aws    | ##################### 62.821 s
tiny-many changed-update 1024//adaptive aws      | ####################### 69.598 s
tiny-many pruned-update 1024//adaptive aws       | ###################### 66.351 s
tiny-many cold-create 1024/32/adaptive shin      | ######################## 73.438 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 35.017 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 38.186 s
tiny-many pruned-update 1024/32/adaptive shin    | ############# 41.099 s
tiny-many cold-create 2048//adaptive aws         | ########################### 83.559 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 48.318 s
tiny-many changed-update 2048//adaptive aws      | ################## 54.12 s
tiny-many pruned-update 2048//adaptive aws       | ################# 51.531 s
tiny-many cold-create 2048/64/adaptive shin      | ####################### 71.04 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 34.895 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 37.947 s
tiny-many pruned-update 2048/64/adaptive shin    | ############# 40.764 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      62.41 |  60.79 |  62.63 |    1.84 |   60.73 |   63.33 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       29.8 |  28.61 |  29.83 |    1.22 |   23.25 |   30.32 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.73 |  28.55 |  29.85 |     1.3 |   28.51 |   30.39 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       28.7 |  28.57 |  29.96 |    1.39 |   24.44 |   30.76 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.19 |  55.11 |   57.7 |    2.59 |   51.92 |   57.76 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.87 |  17.93 |  19.04 |    1.11 |   17.89 |   19.38 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.12 |  18.07 |  19.19 |    1.12 |   17.97 |   19.51 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.02 |  18.13 |   19.3 |    1.17 |   18.05 |   19.96 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       57.2 |  56.77 |  57.86 |    1.09 |   55.44 |   60.38 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.35 |   23.2 |  24.46 |    1.26 |   23.18 |   24.91 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       24.3 |  23.28 |  24.43 |    1.15 |   23.18 |   24.82 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.51 |  23.35 |  24.59 |    1.24 |   23.21 |   25.26 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.13 |  52.27 |  55.25 |    2.98 |   51.77 |   57.26 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.86 |  17.96 |  19.05 |    1.09 |   17.85 |   19.36 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       18.9 |  18.04 |  19.19 |    1.15 |   17.97 |   19.52 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.09 |   18.1 |  19.48 |    1.38 |   18.06 |   19.96 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      62.57 |  60.71 |  62.96 |    2.25 |   60.32 |   63.26 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.71 |  28.57 |  29.87 |     1.3 |   28.54 |    30.3 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.79 |   28.6 |  29.88 |    1.28 |   28.51 |   30.51 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.92 |  28.54 |  30.05 |    1.51 |   28.53 |   30.93 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.28 |  52.23 |  55.48 |    3.25 |   51.78 |   57.23 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       18.9 |  17.96 |  18.96 |       1 |   17.95 |    19.4 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.01 |  17.99 |  19.16 |    1.17 |   17.93 |   19.45 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.16 |  18.06 |  19.33 |    1.27 |   18.04 |   19.77 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.24 |  56.94 |  57.77 |    0.83 |   55.09 |   60.94 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.34 |  23.19 |  24.36 |    1.17 |   23.17 |   24.81 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.37 |  23.45 |  24.39 |    0.94 |   23.33 |   24.86 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.41 |  23.36 |  24.56 |     1.2 |   23.27 |   25.23 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      52.29 |  51.72 |  55.02 |     3.3 |   51.68 |   55.48 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.85 |  17.98 |     19 |    1.02 |   17.82 |   19.39 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.08 |  17.96 |  19.09 |    1.13 |   17.94 |   19.52 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.15 |  18.19 |  19.26 |    1.07 |   18.03 |   19.92 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      76.28 |  76.25 |  78.97 |    2.72 |    74.2 |   79.19 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      44.43 |   44.4 |  46.05 |    1.65 |   40.72 |   47.19 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      47.13 |  45.83 |  49.69 |    3.86 |   35.35 |   49.92 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      44.82 |  44.68 |  46.17 |    1.49 |   40.89 |   47.84 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.23 |   55.4 |  57.74 |    2.34 |   55.11 |   57.82 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.91 |   17.9 |  19.04 |    1.14 |   17.87 |    19.4 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.04 |  18.03 |   19.1 |    1.07 |   18.02 |    19.5 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.13 |  18.05 |  19.28 |    1.23 |   18.02 |   19.98 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      68.08 |     66 |  68.33 |    2.33 |   65.93 |   68.69 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      33.96 |  33.92 |  35.16 |    1.24 |    29.9 |    35.9 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.14 |  30.33 |  34.35 |    4.02 |    29.9 |   35.09 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      30.71 |  30.04 |  33.91 |    3.87 |   29.84 |   33.96 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.63 |  55.49 |  57.19 |     1.7 |   52.28 |   57.84 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.93 |  17.85 |  18.97 |    1.12 |   17.83 |   19.33 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.98 |  18.05 |  19.12 |    1.07 |   17.96 |   19.56 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       19.2 |  18.16 |  19.86 |     1.7 |   18.05 |   24.84 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 62.41 s
large-few unchanged-update 1024//adaptive aws    | ############ 29.8 s
large-few changed-update 1024//adaptive aws      | ############ 29.73 s
large-few pruned-update 1024//adaptive aws       | ########### 28.7 s
large-few cold-create 1024/32/adaptive shin      | ###################### 55.19 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.87 s
large-few changed-update 1024/32/adaptive shin   | ######## 19.12 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.02 s
large-few cold-create 2048//adaptive aws         | ###################### 57.2 s
large-few unchanged-update 2048//adaptive aws    | ########## 24.35 s
large-few changed-update 2048//adaptive aws      | ########## 24.3 s
large-few pruned-update 2048//adaptive aws       | ########## 24.51 s
large-few cold-create 2048/64/adaptive shin      | ###################### 55.13 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.86 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.9 s
large-few pruned-update 2048/64/adaptive shin    | ######## 19.09 s
mixed cold-create 1024//adaptive aws             | ######################### 62.57 s
mixed unchanged-update 1024//adaptive aws        | ############ 29.71 s
mixed changed-update 1024//adaptive aws          | ############ 29.79 s
mixed pruned-update 1024//adaptive aws           | ############ 29.92 s
mixed cold-create 1024/32/adaptive shin          | ###################### 55.28 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.9 s
mixed changed-update 1024/32/adaptive shin       | ####### 19.01 s
mixed pruned-update 1024/32/adaptive shin        | ######## 19.16 s
mixed cold-create 2048//adaptive aws             | ####################### 57.24 s
mixed unchanged-update 2048//adaptive aws        | ########## 24.34 s
mixed changed-update 2048//adaptive aws          | ########## 24.37 s
mixed pruned-update 2048//adaptive aws           | ########## 24.41 s
mixed cold-create 2048/64/adaptive shin          | ##################### 52.29 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.85 s
mixed changed-update 2048/64/adaptive shin       | ######## 19.08 s
mixed pruned-update 2048/64/adaptive shin        | ######## 19.15 s
tiny-many cold-create 1024//adaptive aws         | ############################## 76.28 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 44.43 s
tiny-many changed-update 1024//adaptive aws      | ################### 47.13 s
tiny-many pruned-update 1024//adaptive aws       | ################## 44.82 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 57.23 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.91 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.04 s
tiny-many pruned-update 1024/32/adaptive shin    | ######## 19.13 s
tiny-many cold-create 2048//adaptive aws         | ########################### 68.08 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 33.96 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.14 s
tiny-many pruned-update 2048//adaptive aws       | ############ 30.71 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 55.63 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.93 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.98 s
tiny-many pruned-update 2048/64/adaptive shin    | ######## 19.2 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          450 |      450 |      451 |         1 |       450 |       451 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       451 |       451 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       451 |       453 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          421 |      421 |      421 |         0 |       421 |       422 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          119 |      117 |      121 |         4 |       115 |       125 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           42 |       42 |       43 |         1 |        41 |        45 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           42 |       42 |       42 |         0 |        42 |        43 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      451 |         0 |       451 |       451 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      453 |         2 |       451 |       453 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          451 |      451 |      452 |         1 |       450 |       452 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          421 |      421 |      421 |         0 |       418 |       421 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          187 |      183 |      203 |        20 |       162 |       207 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        37 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           43 |       42 |       43 |         1 |        41 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           41 |       41 |       42 |         1 |        40 |        42 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          288 |      288 |      288 |         0 |       288 |       289 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          287 |      287 |      287 |         0 |       286 |       289 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          287 |      286 |      287 |         1 |       286 |       289 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          280 |      279 |      280 |         1 |       279 |       281 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          105 |      101 |      106 |         5 |       101 |       111 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       36 |         1 |        35 |        37 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        41 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           41 |       39 |       41 |         2 |        39 |        43 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          288 |      288 |      289 |         1 |       288 |       289 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          289 |      289 |      293 |         4 |       287 |       293 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          288 |      287 |      289 |         2 |       287 |       291 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          280 |      279 |      281 |         2 |       279 |       281 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          118 |      118 |      120 |         2 |       103 |       130 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           36 |       35 |       37 |         2 |        35 |        37 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        41 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        39 |        40 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          228 |      226 |      230 |         4 |       226 |       231 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          226 |      224 |      226 |         2 |       224 |       226 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          227 |      225 |      228 |         3 |       224 |       231 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          222 |      222 |      224 |         2 |       221 |       229 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           59 |       59 |       60 |         1 |        51 |        60 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        40 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        38 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        38 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          232 |      230 |      232 |         2 |       229 |       234 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          229 |      228 |      229 |         1 |       228 |       230 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          229 |      229 |      230 |         1 |       228 |       230 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          227 |      225 |      227 |         2 |       225 |       228 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           73 |       72 |       74 |         2 |        71 |        76 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        38 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        40 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        38 |        38 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 450 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 451 MiB
large-few changed-update 1024//adaptive aws      | ############################## 451 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 421 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 119 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 35 MiB
large-few changed-update 1024/32/adaptive shin   | ### 42 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 42 MiB
large-few cold-create 2048//adaptive aws         | ############################## 451 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 451 MiB
large-few changed-update 2048//adaptive aws      | ############################## 451 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 421 MiB
large-few cold-create 2048/64/adaptive shin      | ############ 187 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 35 MiB
large-few changed-update 2048/64/adaptive shin   | ### 43 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 41 MiB
mixed cold-create 1024//adaptive aws             | ################### 288 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 287 MiB
mixed changed-update 1024//adaptive aws          | ################### 287 MiB
mixed pruned-update 1024//adaptive aws           | ################### 280 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 105 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 35 MiB
mixed changed-update 1024/32/adaptive shin       | ### 39 MiB
mixed pruned-update 1024/32/adaptive shin        | ### 41 MiB
mixed cold-create 2048//adaptive aws             | ################### 288 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 289 MiB
mixed changed-update 2048//adaptive aws          | ################### 288 MiB
mixed pruned-update 2048//adaptive aws           | ################### 280 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 118 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 36 MiB
mixed changed-update 2048/64/adaptive shin       | ### 39 MiB
mixed pruned-update 2048/64/adaptive shin        | ### 39 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 228 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############### 226 MiB
tiny-many changed-update 1024//adaptive aws      | ############### 227 MiB
tiny-many pruned-update 1024//adaptive aws       | ############### 222 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 59 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ### 38 MiB
tiny-many changed-update 1024/32/adaptive shin   | ### 38 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ### 38 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 232 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 229 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 229 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 227 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 73 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ### 38 MiB
tiny-many changed-update 2048/64/adaptive shin   | ### 38 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ### 38 MiB
```
