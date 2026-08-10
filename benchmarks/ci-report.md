# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-08-10
- Run ID: 62f8ad5d-81d9-47a4-ab7e-a5ee35ad16ce
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |     2.084 s vs 9.587 s (4.6x faster) | 69.766 s vs 74.608 s (1.069x faster) |  55.8 s vs 61.13 s (1.096x faster) | 116 MiB vs 447 MiB (74.049% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |   0.266 s vs 9.33 s (35.075x faster) | 36.774 s vs 42.996 s (1.169x faster) | 18.25 s vs 28.97 s (1.587x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.536 s vs 9.347 s (17.438x faster) |   36.835 s vs 47.876 s (1.3x faster) | 18.34 s vs 29.01 s (1.582x faster) |  39 MiB vs 447 MiB (91.275% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |   0.562 s vs 8.964 s (15.95x faster) | 37.083 s vs 48.855 s (1.317x faster) | 18.42 s vs 29.06 s (1.578x faster) |  40 MiB vs 416 MiB (90.385% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.338 s vs 5.102 s (3.813x faster) | 69.448 s vs 69.374 s (1.001x slower) | 55.75 s vs 55.91 s (1.003x faster) | 182 MiB vs 447 MiB (59.284% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |   0.238 s vs 5.12 s (21.513x faster) | 32.398 s vs 37.757 s (1.165x faster) | 18.31 s vs 23.68 s (1.293x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.539 s vs 5.227 s (9.698x faster) | 37.972 s vs 43.247 s (1.139x faster) | 18.27 s vs 23.71 s (1.298x faster) |  39 MiB vs 447 MiB (91.275% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.634 s vs 5.024 s (7.924x faster) | 38.405 s vs 43.253 s (1.126x faster) | 18.43 s vs 23.84 s (1.294x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.347 s vs 9.798 s (7.274x faster) | 68.408 s vs 74.911 s (1.095x faster) | 55.78 s vs 61.14 s (1.096x faster) | 106 MiB vs 281 MiB (62.278% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |  0.288 s vs 9.909 s (34.406x faster) | 32.679 s vs 43.156 s (1.321x faster) |     18.35 s vs 29 s (1.58x faster) |  34 MiB vs 280 MiB (87.857% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive | 0.452 s vs 10.033 s (22.197x faster) | 36.744 s vs 48.418 s (1.318x faster) |  18.3 s vs 28.99 s (1.584x faster) |  37 MiB vs 280 MiB (86.786% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |    1.134 s vs 9.877 s (8.71x faster) |  36.75 s vs 47.474 s (1.292x faster) | 18.42 s vs 29.09 s (1.579x faster) |  37 MiB vs 272 MiB (86.397% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.925 s vs 5.794 s (6.264x faster) | 70.002 s vs 74.709 s (1.067x faster) |  55.7 s vs 61.17 s (1.098x faster) | 117 MiB vs 282 MiB (58.511% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |   0.284 s vs 5.81 s (20.458x faster) | 32.497 s vs 37.764 s (1.162x faster) |  18.29 s vs 23.7 s (1.296x faster) |  33 MiB vs 282 MiB (88.298% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.503 s vs 5.907 s (11.744x faster) | 36.732 s vs 42.147 s (1.147x faster) | 18.35 s vs 23.79 s (1.296x faster) |  37 MiB vs 282 MiB (86.879% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.113 s vs 5.677 s (5.101x faster) |  37.77 s vs 42.196 s (1.117x faster) |    18.39 s vs 23.9 s (1.3x faster) |  39 MiB vs 274 MiB (85.766% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.705 s vs 25.446 s (9.407x faster) | 70.054 s vs 96.453 s (1.377x faster) |  55.76 s vs 82.54 s (1.48x faster) |  57 MiB vs 218 MiB (73.853% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.481 s vs 26.074 s (54.208x faster) | 32.562 s vs 59.682 s (1.833x faster) | 18.34 s vs 45.64 s (2.489x faster) |  35 MiB vs 211 MiB (83.412% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive |  0.595 s vs 27.52 s (46.252x faster) | 37.856 s vs 70.442 s (1.861x faster) | 18.32 s vs 45.24 s (2.469x faster) |  36 MiB vs 210 MiB (82.857% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.33 s vs 25.947 s (19.509x faster) | 37.563 s vs 65.085 s (1.733x faster) | 18.43 s vs 45.22 s (2.454x faster) |  36 MiB vs 210 MiB (82.857% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.528 s vs 14.831 s (9.706x faster) | 69.864 s vs 80.432 s (1.151x faster) | 55.77 s vs 66.65 s (1.195x faster) |  65 MiB vs 222 MiB (70.721% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.474 s vs 15.146 s (31.954x faster) | 32.614 s vs 48.675 s (1.492x faster) |  18.31 s vs 34.5 s (1.884x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.597 s vs 15.186 s (25.437x faster) | 38.445 s vs 54.101 s (1.407x faster) | 18.32 s vs 34.49 s (1.883x faster) |   36 MiB vs 221 MiB (83.71% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.399 s vs 14.448 s (10.327x faster) |  38.491 s vs 49.22 s (1.279x faster) |  18.45 s vs 34.51 s (1.87x faster) |  36 MiB vs 218 MiB (83.486% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.084 s |              9.587 s |   +7.503 s |     4.6x |   +360.029% |
| Billed duration   |              2.203 s |             10.143 s |    +7.94 s |   4.604x |   +360.418% |
| Init duration     |              0.118 s |              0.529 s |   +0.411 s |   4.483x |   +348.305% |
| Local wall time   |             69.766 s |             74.608 s |   +4.842 s |   1.069x |      +6.94% |
| CDK deploy time   |               55.8 s |              61.13 s |    +5.33 s |   1.096x |     +9.552% |
| Max memory        |              116 MiB |              447 MiB |   +331 MiB |   3.853x |   +285.345% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.266 s |               9.33 s |   +9.064 s |  35.075x |  +3407.519% |
| Billed duration   |              0.382 s |               9.85 s |   +9.468 s |  25.785x |  +2478.534% |
| Init duration     |              0.118 s |              0.519 s |   +0.401 s |   4.398x |   +339.831% |
| Local wall time   |             36.774 s |             42.996 s |   +6.222 s |   1.169x |     +16.92% |
| CDK deploy time   |              18.25 s |              28.97 s |   +10.72 s |   1.587x |     +58.74% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.536 s |              9.347 s |   +8.811 s |  17.438x |  +1643.843% |
| Billed duration   |              0.657 s |              9.865 s |   +9.208 s |  15.015x |  +1401.522% |
| Init duration     |              0.117 s |              0.523 s |   +0.406 s |    4.47x |   +347.009% |
| Local wall time   |             36.835 s |             47.876 s |  +11.041 s |     1.3x |    +29.974% |
| CDK deploy time   |              18.34 s |              29.01 s |   +10.67 s |   1.582x |    +58.179% |
| Max memory        |               39 MiB |              447 MiB |   +408 MiB |  11.462x |  +1046.154% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.562 s |              8.964 s |   +8.402 s |   15.95x |  +1495.018% |
| Billed duration   |              0.696 s |              9.493 s |   +8.797 s |  13.639x |  +1263.937% |
| Init duration     |              0.119 s |              0.528 s |   +0.409 s |   4.437x |   +343.697% |
| Local wall time   |             37.083 s |             48.855 s |  +11.772 s |   1.317x |    +31.745% |
| CDK deploy time   |              18.42 s |              29.06 s |   +10.64 s |   1.578x |    +57.763% |
| Max memory        |               40 MiB |              416 MiB |   +376 MiB |    10.4x |       +940% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.338 s |              5.102 s |   +3.764 s |   3.813x |   +281.315% |
| Billed duration   |              1.464 s |              5.616 s |   +4.152 s |   3.836x |   +283.607% |
| Init duration     |              0.125 s |              0.524 s |   +0.399 s |   4.192x |     +319.2% |
| Local wall time   |             69.448 s |             69.374 s |   -0.074 s |   0.999x |     -0.107% |
| CDK deploy time   |              55.75 s |              55.91 s |    +0.16 s |   1.003x |     +0.287% |
| Max memory        |              182 MiB |              447 MiB |   +265 MiB |   2.456x |   +145.604% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.238 s |               5.12 s |   +4.882 s |  21.513x |  +2051.261% |
| Billed duration   |              0.388 s |              5.642 s |   +5.254 s |  14.541x |  +1354.124% |
| Init duration     |              0.121 s |              0.521 s |     +0.4 s |   4.306x |   +330.579% |
| Local wall time   |             32.398 s |             37.757 s |   +5.359 s |   1.165x |    +16.541% |
| CDK deploy time   |              18.31 s |              23.68 s |    +5.37 s |   1.293x |    +29.328% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.539 s |              5.227 s |   +4.688 s |   9.698x |   +869.759% |
| Billed duration   |               0.66 s |              5.728 s |   +5.068 s |   8.679x |   +767.879% |
| Init duration     |              0.123 s |               0.51 s |   +0.387 s |   4.146x |   +314.634% |
| Local wall time   |             37.972 s |             43.247 s |   +5.275 s |   1.139x |    +13.892% |
| CDK deploy time   |              18.27 s |              23.71 s |    +5.44 s |   1.298x |    +29.776% |
| Max memory        |               39 MiB |              447 MiB |   +408 MiB |  11.462x |  +1046.154% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.634 s |              5.024 s |    +4.39 s |   7.924x |   +692.429% |
| Billed duration   |              0.757 s |              5.556 s |   +4.799 s |   7.339x |    +633.95% |
| Init duration     |              0.121 s |               0.52 s |   +0.399 s |   4.298x |   +329.752% |
| Local wall time   |             38.405 s |             43.253 s |   +4.848 s |   1.126x |    +12.623% |
| CDK deploy time   |              18.43 s |              23.84 s |    +5.41 s |   1.294x |    +29.354% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.347 s |              9.798 s |   +8.451 s |   7.274x |   +627.394% |
| Billed duration   |              1.472 s |             10.305 s |   +8.833 s |   7.001x |   +600.068% |
| Init duration     |              0.119 s |              0.531 s |   +0.412 s |   4.462x |   +346.218% |
| Local wall time   |             68.408 s |             74.911 s |   +6.503 s |   1.095x |     +9.506% |
| CDK deploy time   |              55.78 s |              61.14 s |    +5.36 s |   1.096x |     +9.609% |
| Max memory        |              106 MiB |              281 MiB |   +175 MiB |   2.651x |   +165.094% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.288 s |              9.909 s |   +9.621 s |  34.406x |  +3340.625% |
| Billed duration   |              0.409 s |              10.43 s |  +10.021 s |  25.501x |  +2450.122% |
| Init duration     |              0.117 s |              0.524 s |   +0.407 s |   4.479x |   +347.863% |
| Local wall time   |             32.679 s |             43.156 s |  +10.477 s |   1.321x |     +32.06% |
| CDK deploy time   |              18.35 s |                 29 s |   +10.65 s |    1.58x |    +58.038% |
| Max memory        |               34 MiB |              280 MiB |   +246 MiB |   8.235x |   +723.529% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.452 s |             10.033 s |   +9.581 s |  22.197x |   +2119.69% |
| Billed duration   |              0.584 s |             10.552 s |   +9.968 s |  18.068x |  +1706.849% |
| Init duration     |              0.118 s |              0.519 s |   +0.401 s |   4.398x |   +339.831% |
| Local wall time   |             36.744 s |             48.418 s |  +11.674 s |   1.318x |    +31.771% |
| CDK deploy time   |               18.3 s |              28.99 s |   +10.69 s |   1.584x |    +58.415% |
| Max memory        |               37 MiB |              280 MiB |   +243 MiB |   7.568x |   +656.757% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.134 s |              9.877 s |   +8.743 s |    8.71x |   +770.988% |
| Billed duration   |              1.247 s |             10.649 s |   +9.402 s |    8.54x |    +753.97% |
| Init duration     |              0.118 s |               0.53 s |   +0.412 s |   4.492x |   +349.153% |
| Local wall time   |              36.75 s |             47.474 s |  +10.724 s |   1.292x |    +29.181% |
| CDK deploy time   |              18.42 s |              29.09 s |   +10.67 s |   1.579x |    +57.926% |
| Max memory        |               37 MiB |              272 MiB |   +235 MiB |   7.351x |   +635.135% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.925 s |              5.794 s |   +4.869 s |   6.264x |   +526.378% |
| Billed duration   |              1.072 s |              6.362 s |    +5.29 s |   5.935x |    +493.47% |
| Init duration     |              0.147 s |              0.566 s |   +0.419 s |    3.85x |   +285.034% |
| Local wall time   |             70.002 s |             74.709 s |   +4.707 s |   1.067x |     +6.724% |
| CDK deploy time   |               55.7 s |              61.17 s |    +5.47 s |   1.098x |      +9.82% |
| Max memory        |              117 MiB |              282 MiB |   +165 MiB |    2.41x |   +141.026% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.284 s |               5.81 s |   +5.526 s |  20.458x |  +1945.775% |
| Billed duration   |              0.406 s |              6.377 s |   +5.971 s |  15.707x |   +1470.69% |
| Init duration     |               0.12 s |              0.549 s |   +0.429 s |   4.575x |     +357.5% |
| Local wall time   |             32.497 s |             37.764 s |   +5.267 s |   1.162x |    +16.208% |
| CDK deploy time   |              18.29 s |               23.7 s |    +5.41 s |   1.296x |    +29.579% |
| Max memory        |               33 MiB |              282 MiB |   +249 MiB |   8.545x |   +754.545% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.503 s |              5.907 s |   +5.404 s |  11.744x |  +1074.354% |
| Billed duration   |              0.623 s |              6.456 s |   +5.833 s |  10.363x |   +936.276% |
| Init duration     |               0.12 s |              0.525 s |   +0.405 s |   4.375x |     +337.5% |
| Local wall time   |             36.732 s |             42.147 s |   +5.415 s |   1.147x |    +14.742% |
| CDK deploy time   |              18.35 s |              23.79 s |    +5.44 s |   1.296x |    +29.646% |
| Max memory        |               37 MiB |              282 MiB |   +245 MiB |   7.622x |   +662.162% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.113 s |              5.677 s |   +4.564 s |   5.101x |   +410.063% |
| Billed duration   |              1.234 s |              6.416 s |   +5.182 s |   5.199x |   +419.935% |
| Init duration     |              0.118 s |              0.584 s |   +0.466 s |   4.949x |   +394.915% |
| Local wall time   |              37.77 s |             42.196 s |   +4.426 s |   1.117x |    +11.718% |
| CDK deploy time   |              18.39 s |               23.9 s |    +5.51 s |     1.3x |    +29.962% |
| Max memory        |               39 MiB |              274 MiB |   +235 MiB |   7.026x |   +602.564% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.705 s |             25.446 s |  +22.741 s |   9.407x |   +840.702% |
| Billed duration   |              2.822 s |             25.961 s |  +23.139 s |     9.2x |    +819.95% |
| Init duration     |              0.116 s |              0.515 s |   +0.399 s |    4.44x |   +343.966% |
| Local wall time   |             70.054 s |             96.453 s |  +26.399 s |   1.377x |    +37.684% |
| CDK deploy time   |              55.76 s |              82.54 s |   +26.78 s |    1.48x |    +48.027% |
| Max memory        |               57 MiB |              218 MiB |   +161 MiB |   3.825x |   +282.456% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.481 s |             26.074 s |  +25.593 s |  54.208x |   +5320.79% |
| Billed duration   |              0.598 s |             26.608 s |   +26.01 s |  44.495x |  +4349.498% |
| Init duration     |              0.118 s |              0.531 s |   +0.413 s |     4.5x |       +350% |
| Local wall time   |             32.562 s |             59.682 s |   +27.12 s |   1.833x |    +83.287% |
| CDK deploy time   |              18.34 s |              45.64 s |    +27.3 s |   2.489x |   +148.855% |
| Max memory        |               35 MiB |              211 MiB |   +176 MiB |   6.029x |   +502.857% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.595 s |              27.52 s |  +26.925 s |  46.252x |   +4525.21% |
| Billed duration   |              0.716 s |             28.058 s |  +27.342 s |  39.187x |  +3818.715% |
| Init duration     |              0.124 s |              0.534 s |    +0.41 s |   4.306x |   +330.645% |
| Local wall time   |             37.856 s |             70.442 s |  +32.586 s |   1.861x |    +86.079% |
| CDK deploy time   |              18.32 s |              45.24 s |   +26.92 s |   2.469x |   +146.943% |
| Max memory        |               36 MiB |              210 MiB |   +174 MiB |   5.833x |   +483.333% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               1.33 s |             25.947 s |  +24.617 s |  19.509x |  +1850.902% |
| Billed duration   |              1.489 s |             26.462 s |  +24.973 s |  17.772x |  +1677.166% |
| Init duration     |              0.118 s |              0.525 s |   +0.407 s |   4.449x |   +344.915% |
| Local wall time   |             37.563 s |             65.085 s |  +27.522 s |   1.733x |    +73.269% |
| CDK deploy time   |              18.43 s |              45.22 s |   +26.79 s |   2.454x |   +145.361% |
| Max memory        |               36 MiB |              210 MiB |   +174 MiB |   5.833x |   +483.333% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.528 s |             14.831 s |  +13.303 s |   9.706x |   +870.615% |
| Billed duration   |              1.653 s |             15.362 s |  +13.709 s |   9.293x |   +829.341% |
| Init duration     |              0.124 s |              0.532 s |   +0.408 s |    4.29x |   +329.032% |
| Local wall time   |             69.864 s |             80.432 s |  +10.568 s |   1.151x |    +15.127% |
| CDK deploy time   |              55.77 s |              66.65 s |   +10.88 s |   1.195x |    +19.509% |
| Max memory        |               65 MiB |              222 MiB |   +157 MiB |   3.415x |   +241.538% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.474 s |             15.146 s |  +14.672 s |  31.954x |  +3095.359% |
| Billed duration   |              0.589 s |               15.7 s |  +15.111 s |  26.655x |  +2565.535% |
| Init duration     |              0.118 s |              0.533 s |   +0.415 s |   4.517x |   +351.695% |
| Local wall time   |             32.614 s |             48.675 s |  +16.061 s |   1.492x |    +49.246% |
| CDK deploy time   |              18.31 s |               34.5 s |   +16.19 s |   1.884x |    +88.422% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.597 s |             15.186 s |  +14.589 s |  25.437x |  +2443.719% |
| Billed duration   |              0.715 s |             15.686 s |  +14.971 s |  21.938x |  +2093.846% |
| Init duration     |              0.118 s |              0.515 s |   +0.397 s |   4.364x |   +336.441% |
| Local wall time   |             38.445 s |             54.101 s |  +15.656 s |   1.407x |    +40.723% |
| CDK deploy time   |              18.32 s |              34.49 s |   +16.17 s |   1.883x |    +88.264% |
| Max memory        |               36 MiB |              221 MiB |   +185 MiB |   6.139x |   +513.889% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.399 s |             14.448 s |  +13.049 s |  10.327x |   +932.738% |
| Billed duration   |              1.552 s |             14.989 s |  +13.437 s |   9.658x |   +865.786% |
| Init duration     |               0.15 s |               0.54 s |    +0.39 s |     3.6x |       +260% |
| Local wall time   |             38.491 s |              49.22 s |  +10.729 s |   1.279x |    +27.874% |
| CDK deploy time   |              18.45 s |              34.51 s |   +16.06 s |    1.87x |    +87.046% |
| Max memory        |               36 MiB |              218 MiB |   +182 MiB |   6.056x |   +505.556% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.587 |  8.964 |  9.674 |    0.71 |   8.393 |    9.71 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       9.33 |  9.201 |  9.418 |   0.217 |   8.667 |  10.565 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.347 |  9.215 |   9.55 |   0.335 |   9.155 |   9.828 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.964 |  8.806 |  9.094 |   0.288 |    8.76 |   9.555 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.084 |   2.01 |  2.264 |   0.254 |   1.903 |   2.279 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.266 |   0.26 |  0.266 |   0.006 |   0.254 |   0.301 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.536 |  0.466 |  0.539 |   0.073 |   0.435 |   0.583 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.562 |  0.549 |  0.581 |   0.032 |   0.541 |    0.59 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.102 |   5.09 |   5.27 |    0.18 |   5.067 |   5.357 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       5.12 |  5.021 |  5.341 |    0.32 |   4.773 |   5.371 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.227 |  5.184 |  5.245 |   0.061 |   5.166 |   5.355 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.024 |  4.985 |  5.145 |    0.16 |   4.929 |   5.231 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.338 |  1.301 |  1.354 |   0.053 |   1.294 |   1.387 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.238 |  0.238 |  0.267 |   0.029 |   0.226 |   0.333 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.539 |  0.533 |  0.547 |   0.014 |   0.529 |   0.553 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.634 |  0.604 |  0.647 |   0.043 |   0.599 |   0.667 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.798 |  9.552 |  9.941 |   0.389 |   9.496 |  10.023 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.909 |  9.881 | 10.269 |   0.388 |   9.706 |  10.512 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.033 |  9.854 | 10.246 |   0.392 |    9.73 |  10.437 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.877 |  9.703 | 10.119 |   0.416 |   8.685 |  10.189 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.347 |  1.313 |  1.364 |   0.051 |   1.294 |   1.442 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.288 |  0.278 |  0.293 |   0.015 |   0.262 |   0.348 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.452 |  0.432 |  0.474 |   0.042 |   0.429 |   0.491 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.134 |  1.127 |  1.149 |   0.022 |   1.053 |   1.274 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.794 |  5.622 |  5.805 |   0.183 |   4.987 |   5.965 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       5.81 |   5.78 |  5.843 |   0.063 |   5.637 |   5.897 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.907 |  5.696 |  5.982 |   0.286 |   5.605 |   5.999 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.677 |  5.668 |  5.831 |   0.163 |   5.582 |   6.151 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.925 |  0.908 |  0.951 |   0.043 |   0.858 |   1.064 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.284 |  0.267 |  0.285 |   0.018 |   0.253 |   0.346 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.503 |  0.483 |   0.54 |   0.057 |   0.379 |   0.556 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.113 |  1.111 |  1.183 |   0.072 |   1.101 |    1.53 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.446 | 24.765 | 25.986 |   1.221 |  24.333 |  26.216 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.074 | 26.046 | 27.168 |   1.122 |  25.389 |  27.944 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      27.52 | 26.172 | 27.622 |    1.45 |  25.521 |  27.677 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     25.947 | 24.574 | 26.831 |   2.257 |  23.907 |  26.929 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.705 |  2.618 |  2.747 |   0.129 |   2.573 |   2.762 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.481 |  0.478 |  0.515 |   0.037 |   0.439 |   0.561 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.595 |  0.569 |  0.696 |   0.127 |   0.518 |   0.748 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |       1.33 |  1.257 |    1.4 |   0.143 |   1.251 |   1.409 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.831 | 14.501 | 15.243 |   0.742 |  14.476 |  15.308 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.146 | 14.735 | 15.398 |   0.663 |  14.598 |  15.616 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.186 | 14.969 | 15.362 |   0.393 |  14.917 |  16.097 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.448 | 14.437 | 14.905 |   0.468 |  14.046 |  15.211 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.528 |  1.493 |  1.588 |   0.095 |   1.443 |   1.589 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.474 |  0.466 |  0.475 |   0.009 |   0.417 |   0.491 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.597 |  0.557 |  0.655 |   0.098 |   0.534 |   0.656 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.399 |  1.398 |  1.436 |   0.038 |   1.334 |   1.478 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.587 s
large-few unchanged-update 1024//adaptive aws    | ########## 9.33 s
large-few changed-update 1024//adaptive aws      | ########## 9.347 s
large-few pruned-update 1024//adaptive aws       | ########## 8.964 s
large-few cold-create 1024/32/adaptive shin      | ## 2.084 s
large-few unchanged-update 1024/32/adaptive shin | # 0.266 s
large-few changed-update 1024/32/adaptive shin   | # 0.536 s
large-few pruned-update 1024/32/adaptive shin    | # 0.562 s
large-few cold-create 2048//adaptive aws         | ###### 5.102 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.12 s
large-few changed-update 2048//adaptive aws      | ###### 5.227 s
large-few pruned-update 2048//adaptive aws       | ##### 5.024 s
large-few cold-create 2048/64/adaptive shin      | # 1.338 s
large-few unchanged-update 2048/64/adaptive shin | # 0.238 s
large-few changed-update 2048/64/adaptive shin   | # 0.539 s
large-few pruned-update 2048/64/adaptive shin    | # 0.634 s
mixed cold-create 1024//adaptive aws             | ########### 9.798 s
mixed unchanged-update 1024//adaptive aws        | ########### 9.909 s
mixed changed-update 1024//adaptive aws          | ########### 10.033 s
mixed pruned-update 1024//adaptive aws           | ########### 9.877 s
mixed cold-create 1024/32/adaptive shin          | # 1.347 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.288 s
mixed changed-update 1024/32/adaptive shin       | # 0.452 s
mixed pruned-update 1024/32/adaptive shin        | # 1.134 s
mixed cold-create 2048//adaptive aws             | ###### 5.794 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.81 s
mixed changed-update 2048//adaptive aws          | ###### 5.907 s
mixed pruned-update 2048//adaptive aws           | ###### 5.677 s
mixed cold-create 2048/64/adaptive shin          | # 0.925 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.284 s
mixed changed-update 2048/64/adaptive shin       | # 0.503 s
mixed pruned-update 2048/64/adaptive shin        | # 1.113 s
tiny-many cold-create 1024//adaptive aws         | ############################ 25.446 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 26.074 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.52 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 25.947 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.705 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.481 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.595 s
tiny-many pruned-update 1024/32/adaptive shin    | # 1.33 s
tiny-many cold-create 2048//adaptive aws         | ################ 14.831 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.146 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.186 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.448 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.528 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.474 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.597 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.399 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.143 |  9.457 | 10.239 |   0.782 |   8.879 |  10.749 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       9.85 |   9.71 |  9.938 |   0.228 |   9.161 |  11.315 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.865 |  9.739 | 10.088 |   0.349 |   9.656 |  10.401 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.493 |  9.363 |  9.616 |   0.253 |   9.275 |  10.111 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.203 |  2.125 |  2.379 |   0.254 |   2.022 |   2.402 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.382 |  0.376 |  0.427 |   0.051 |   0.372 |   0.432 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.657 |  0.581 |  0.663 |   0.082 |   0.553 |   0.697 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.696 |  0.673 |  0.697 |   0.024 |   0.661 |   0.713 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.616 |  5.591 |  5.798 |   0.207 |   5.586 |   5.909 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.642 |  5.534 |   5.87 |   0.336 |   5.281 |   5.907 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.728 |  5.695 |   5.75 |   0.055 |   5.682 |   5.904 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.556 |  5.496 |  5.666 |    0.17 |   5.428 |   6.033 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.464 |  1.416 |   1.48 |   0.064 |    1.41 |   1.537 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.388 |  0.357 |  0.396 |   0.039 |   0.344 |   0.457 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.66 |  0.657 |  0.703 |   0.046 |   0.648 |   0.706 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.757 |  0.729 |  0.765 |   0.036 |   0.716 |   0.788 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.305 | 10.099 | 10.555 |   0.456 |  10.006 |  10.775 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      10.43 | 10.405 | 10.857 |   0.452 |  10.209 |   11.04 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.552 | 10.341 | 10.762 |   0.421 |   10.25 |  10.999 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.649 | 10.219 | 10.722 |   0.503 |   9.161 |  10.726 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.472 |   1.43 |  1.482 |   0.052 |   1.413 |   1.602 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.409 |  0.394 |  0.409 |   0.015 |    0.38 |   0.466 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.584 |  0.571 |  0.589 |   0.018 |   0.547 |   0.609 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.247 |  1.245 |   1.27 |   0.025 |    1.17 |   1.399 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.362 |  6.129 |  6.371 |   0.242 |   5.464 |   6.571 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.377 |  6.345 |  6.393 |   0.048 |   6.146 |   6.447 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.456 |  6.216 |  6.508 |   0.292 |   6.101 |   6.532 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.416 |  6.248 |  6.491 |   0.243 |   6.219 |   6.582 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.072 |  1.022 |  1.107 |   0.085 |   0.987 |   1.216 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.406 |    0.4 |  0.409 |   0.009 |   0.389 |   0.464 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.623 |  0.597 |  0.669 |   0.072 |   0.499 |    0.69 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.234 |  1.223 |  1.302 |   0.079 |   1.205 |   1.647 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.961 | 25.271 | 26.526 |   1.255 |  24.836 |  26.738 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.608 | 26.577 |  27.69 |   1.113 |  25.897 |  28.536 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     28.058 | 26.676 | 28.157 |   1.481 |  26.044 |  28.228 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.462 | 25.099 | 27.367 |   2.268 |  24.393 |  27.502 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.822 |  2.733 |  2.872 |   0.139 |   2.686 |    2.88 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.598 |  0.594 |  0.634 |    0.04 |   0.564 |   0.716 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.716 |  0.693 |  0.822 |   0.129 |   0.637 |   0.896 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.489 |  1.374 |  1.518 |   0.144 |   1.373 |   1.528 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.362 | 15.034 | 15.776 |   0.742 |  14.994 |  15.864 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       15.7 | 15.242 | 15.932 |    0.69 |  15.086 |  16.167 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.686 |  15.48 | 15.925 |   0.445 |  15.433 |  16.648 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.989 | 14.955 | 15.451 |   0.496 |  14.576 |  15.855 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.653 |  1.618 |  1.707 |   0.089 |   1.562 |   1.738 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.589 |  0.585 |  0.592 |   0.007 |   0.534 |   0.611 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.715 |  0.669 |  0.776 |   0.107 |   0.649 |    0.78 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.552 |  1.549 |  1.585 |   0.036 |   1.484 |   1.593 |

```text
large-few cold-create 1024//adaptive aws         | ########### 10.143 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.85 s
large-few changed-update 1024//adaptive aws      | ########### 9.865 s
large-few pruned-update 1024//adaptive aws       | ########## 9.493 s
large-few cold-create 1024/32/adaptive shin      | ## 2.203 s
large-few unchanged-update 1024/32/adaptive shin | # 0.382 s
large-few changed-update 1024/32/adaptive shin   | # 0.657 s
large-few pruned-update 1024/32/adaptive shin    | # 0.696 s
large-few cold-create 2048//adaptive aws         | ###### 5.616 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.642 s
large-few changed-update 2048//adaptive aws      | ###### 5.728 s
large-few pruned-update 2048//adaptive aws       | ###### 5.556 s
large-few cold-create 2048/64/adaptive shin      | ## 1.464 s
large-few unchanged-update 2048/64/adaptive shin | # 0.388 s
large-few changed-update 2048/64/adaptive shin   | # 0.66 s
large-few pruned-update 2048/64/adaptive shin    | # 0.757 s
mixed cold-create 1024//adaptive aws             | ########### 10.305 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.43 s
mixed changed-update 1024//adaptive aws          | ########### 10.552 s
mixed pruned-update 1024//adaptive aws           | ########### 10.649 s
mixed cold-create 1024/32/adaptive shin          | ## 1.472 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.409 s
mixed changed-update 1024/32/adaptive shin       | # 0.584 s
mixed pruned-update 1024/32/adaptive shin        | # 1.247 s
mixed cold-create 2048//adaptive aws             | ####### 6.362 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.377 s
mixed changed-update 2048//adaptive aws          | ####### 6.456 s
mixed pruned-update 2048//adaptive aws           | ####### 6.416 s
mixed cold-create 2048/64/adaptive shin          | # 1.072 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.406 s
mixed changed-update 2048/64/adaptive shin       | # 0.623 s
mixed pruned-update 2048/64/adaptive shin        | # 1.234 s
tiny-many cold-create 1024//adaptive aws         | ############################ 25.961 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 26.608 s
tiny-many changed-update 1024//adaptive aws      | ############################## 28.058 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 26.462 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.822 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.598 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.716 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.489 s
tiny-many cold-create 2048//adaptive aws         | ################ 15.362 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.7 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.686 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.989 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.653 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.589 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.715 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.552 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.529 |  0.492 |  0.556 |   0.064 |   0.485 |   1.074 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.519 |  0.509 |   0.52 |   0.011 |   0.493 |   0.749 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.523 |  0.517 |  0.537 |    0.02 |   0.501 |   0.573 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.528 |  0.521 |  0.556 |   0.035 |   0.514 |   0.557 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.115 |  0.118 |   0.003 |   0.114 |   0.122 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.115 |   0.13 |   0.015 |   0.115 |   0.161 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.118 |   0.003 |   0.114 |   0.127 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.116 |  0.122 |   0.006 |    0.11 |   0.146 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.524 |  0.513 |  0.528 |   0.015 |   0.495 |   0.551 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.512 |  0.528 |   0.016 |   0.507 |   0.535 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       0.51 |  0.505 |  0.515 |    0.01 |     0.5 |   0.549 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       0.52 |   0.51 |  0.532 |   0.022 |   0.498 |   0.801 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.125 |  0.116 |  0.126 |    0.01 |   0.114 |   0.149 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.123 |   0.004 |   0.118 |   0.158 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.123 |   0.12 |   0.15 |    0.03 |   0.118 |   0.158 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.118 |  0.123 |   0.005 |   0.117 |   0.124 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.531 |  0.509 |  0.547 |   0.038 |   0.507 |   0.834 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.524 |  0.521 |  0.527 |   0.006 |   0.502 |   0.587 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.519 |  0.515 |   0.52 |   0.005 |   0.487 |   0.562 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       0.53 |  0.516 |  0.536 |    0.02 |   0.475 |   0.844 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.125 |   0.007 |   0.116 |   0.159 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.118 |   0.002 |   0.116 |    0.12 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.119 |   0.002 |   0.114 |   0.152 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |   0.12 |   0.003 |   0.113 |   0.124 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.566 |  0.506 |  0.568 |   0.062 |   0.477 |   0.606 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.549 |  0.535 |  0.549 |   0.014 |   0.509 |   0.596 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.525 |  0.519 |  0.532 |   0.013 |   0.496 |   0.549 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.584 |  0.579 |  0.637 |   0.058 |    0.43 |   0.814 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.147 |  0.128 |  0.152 |   0.024 |   0.113 |   0.155 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.117 |  0.122 |   0.005 |   0.116 |   0.156 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.114 |   0.12 |   0.006 |   0.113 |   0.149 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.122 |   0.005 |   0.092 |   0.122 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.505 |  0.521 |   0.016 |   0.502 |    0.54 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.531 |  0.521 |  0.533 |   0.012 |   0.507 |   0.591 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.534 |  0.522 |  0.538 |   0.016 |   0.504 |    0.55 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.525 |  0.515 |  0.536 |   0.021 |   0.486 |   0.572 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |  0.118 |   0.004 |   0.113 |   0.124 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.124 |   0.008 |   0.115 |   0.154 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.124 |   0.12 |  0.125 |   0.005 |   0.119 |   0.147 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.122 |   0.004 |   0.116 |   0.159 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.532 |  0.531 |  0.533 |   0.002 |   0.517 |   0.555 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.533 |  0.507 |  0.551 |   0.044 |   0.487 |   0.553 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.515 |   0.51 |   0.55 |    0.04 |     0.5 |   0.563 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       0.54 |   0.53 |  0.545 |   0.015 |   0.517 |   0.644 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.124 |  0.118 |  0.125 |   0.007 |   0.118 |   0.149 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.119 |   0.003 |   0.113 |    0.12 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.114 |   0.12 |   0.006 |   0.112 |   0.124 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       0.15 |  0.148 |   0.15 |   0.002 |   0.115 |   0.154 |

```text
large-few cold-create 1024//adaptive aws         | ########################### 0.529 s
large-few unchanged-update 1024//adaptive aws    | ########################### 0.519 s
large-few changed-update 1024//adaptive aws      | ########################### 0.523 s
large-few pruned-update 1024//adaptive aws       | ########################### 0.528 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.118 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.118 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.117 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.119 s
large-few cold-create 2048//adaptive aws         | ########################### 0.524 s
large-few unchanged-update 2048//adaptive aws    | ########################### 0.521 s
large-few changed-update 2048//adaptive aws      | ########################## 0.51 s
large-few pruned-update 2048//adaptive aws       | ########################### 0.52 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.125 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.121 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.123 s
large-few pruned-update 2048/64/adaptive shin    | ###### 0.121 s
mixed cold-create 1024//adaptive aws             | ########################### 0.531 s
mixed unchanged-update 1024//adaptive aws        | ########################### 0.524 s
mixed changed-update 1024//adaptive aws          | ########################### 0.519 s
mixed pruned-update 1024//adaptive aws           | ########################### 0.53 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.119 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.117 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.118 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.118 s
mixed cold-create 2048//adaptive aws             | ############################# 0.566 s
mixed unchanged-update 2048//adaptive aws        | ############################ 0.549 s
mixed changed-update 2048//adaptive aws          | ########################### 0.525 s
mixed pruned-update 2048//adaptive aws           | ############################## 0.584 s
mixed cold-create 2048/64/adaptive shin          | ######## 0.147 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.12 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.12 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.118 s
tiny-many cold-create 1024//adaptive aws         | ########################## 0.515 s
tiny-many unchanged-update 1024//adaptive aws    | ########################### 0.531 s
tiny-many changed-update 1024//adaptive aws      | ########################### 0.534 s
tiny-many pruned-update 1024//adaptive aws       | ########################### 0.525 s
tiny-many cold-create 1024/32/adaptive shin      | ###### 0.116 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.118 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.124 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.118 s
tiny-many cold-create 2048//adaptive aws         | ########################### 0.532 s
tiny-many unchanged-update 2048//adaptive aws    | ########################### 0.533 s
tiny-many changed-update 2048//adaptive aws      | ########################## 0.515 s
tiny-many pruned-update 2048//adaptive aws       | ############################ 0.54 s
tiny-many cold-create 2048/64/adaptive shin      | ###### 0.124 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.118 s
tiny-many changed-update 2048/64/adaptive shin   | ###### 0.118 s
tiny-many pruned-update 2048/64/adaptive shin    | ######## 0.15 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     74.608 |  74.54 |  74.68 |    0.14 |  73.731 |  75.854 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     42.996 | 42.829 | 43.678 |   0.849 |  41.946 |  54.012 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     47.876 | 46.106 | 48.802 |   2.696 |  43.241 |  49.199 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     48.855 | 47.434 | 49.051 |   1.617 |  46.675 |  62.117 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     69.766 | 69.253 | 71.263 |    2.01 |  68.981 |  73.099 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.774 | 33.986 | 37.493 |   3.507 |  29.095 |  39.063 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     36.835 | 32.873 | 38.219 |   5.346 |  32.585 |  38.507 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.083 | 35.853 |  38.26 |   2.407 |  32.791 |  39.484 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     69.374 | 69.265 | 69.439 |   0.174 |   69.25 |  73.945 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     37.757 | 37.633 | 37.889 |   0.256 |  37.611 |  41.805 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     43.247 | 43.131 | 43.338 |   0.207 |  41.889 |  43.428 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     43.253 | 42.204 | 43.553 |   1.349 |  38.173 |  43.624 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.448 | 69.043 | 70.497 |   1.454 |  68.215 |  81.455 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.398 | 32.337 | 32.691 |   0.354 |   31.26 |  41.275 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.972 | 37.226 | 38.176 |    0.95 |  32.906 |  51.017 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.405 | 35.966 | 38.524 |   2.558 |  34.933 |   41.43 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     74.911 | 74.843 |  79.64 |   4.797 |  72.826 |  95.021 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.156 | 43.118 | 43.577 |   0.459 |  40.777 |  47.323 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     48.418 |  47.35 | 48.687 |   1.337 |   46.27 |   48.77 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.474 | 46.187 | 48.711 |   2.524 |    43.7 |  60.468 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     68.408 | 68.344 | 69.394 |    1.05 |  67.599 |  89.807 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     32.679 |  32.65 | 33.819 |   1.169 |  30.308 |  36.631 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     36.744 | 35.696 |  38.03 |   2.334 |  33.103 |   56.92 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      36.75 | 36.551 | 38.188 |   1.637 |  35.698 |  38.312 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     74.709 | 74.615 | 74.716 |   0.101 |  73.848 |  74.799 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     37.764 | 37.458 | 37.847 |   0.389 |  36.488 |  44.788 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.147 | 38.167 | 43.406 |   5.239 |  38.092 |  43.661 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.196 | 38.328 | 43.261 |   4.933 |  37.853 |  43.306 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.002 | 67.452 | 70.887 |   3.435 |  66.869 |  72.752 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.497 | 31.436 | 32.589 |   1.153 |  30.103 |  32.643 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     36.732 |  32.84 | 36.745 |   3.905 |  30.511 |  38.901 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      37.77 |  35.99 | 38.764 |   2.774 |   35.74 |  39.981 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     96.453 | 89.384 | 96.903 |   7.519 |  88.475 | 101.708 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     59.682 | 59.561 | 62.517 |   2.956 |  59.104 |  63.566 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     70.442 | 65.516 | 79.624 |  14.108 |  64.798 |  89.129 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     65.085 | 65.021 | 68.174 |   3.153 |  58.486 |    68.3 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.054 | 68.982 | 70.374 |   1.392 |  68.216 |  86.338 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     32.562 | 31.698 | 32.772 |   1.074 |  30.518 |  32.935 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.856 | 33.168 | 50.819 |  17.651 |  30.668 |  56.962 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.563 | 36.276 | 38.526 |    2.25 |  33.196 |  38.527 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     80.432 | 80.353 | 84.551 |   4.198 |  80.279 |  85.797 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     48.675 | 48.414 | 48.828 |   0.414 |  47.644 |  48.859 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     54.101 | 52.955 | 54.593 |   1.638 |  48.961 |  54.748 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      49.22 | 49.025 | 51.253 |   2.228 |  49.024 |  53.301 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.864 | 67.959 | 69.872 |   1.913 |  65.711 |   70.34 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.614 | 31.766 | 33.151 |   1.385 |  30.313 |  40.265 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.445 | 37.316 |  38.52 |   1.204 |  30.925 |   38.91 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.491 | 37.566 | 38.877 |   1.311 |  30.979 |  39.348 |

```text
large-few cold-create 1024//adaptive aws         | ####################### 74.608 s
large-few unchanged-update 1024//adaptive aws    | ############# 42.996 s
large-few changed-update 1024//adaptive aws      | ############### 47.876 s
large-few pruned-update 1024//adaptive aws       | ############### 48.855 s
large-few cold-create 1024/32/adaptive shin      | ###################### 69.766 s
large-few unchanged-update 1024/32/adaptive shin | ########### 36.774 s
large-few changed-update 1024/32/adaptive shin   | ########### 36.835 s
large-few pruned-update 1024/32/adaptive shin    | ############ 37.083 s
large-few cold-create 2048//adaptive aws         | ###################### 69.374 s
large-few unchanged-update 2048//adaptive aws    | ############ 37.757 s
large-few changed-update 2048//adaptive aws      | ############# 43.247 s
large-few pruned-update 2048//adaptive aws       | ############# 43.253 s
large-few cold-create 2048/64/adaptive shin      | ###################### 69.448 s
large-few unchanged-update 2048/64/adaptive shin | ########## 32.398 s
large-few changed-update 2048/64/adaptive shin   | ############ 37.972 s
large-few pruned-update 2048/64/adaptive shin    | ############ 38.405 s
mixed cold-create 1024//adaptive aws             | ####################### 74.911 s
mixed unchanged-update 1024//adaptive aws        | ############# 43.156 s
mixed changed-update 1024//adaptive aws          | ############### 48.418 s
mixed pruned-update 1024//adaptive aws           | ############### 47.474 s
mixed cold-create 1024/32/adaptive shin          | ##################### 68.408 s
mixed unchanged-update 1024/32/adaptive shin     | ########## 32.679 s
mixed changed-update 1024/32/adaptive shin       | ########### 36.744 s
mixed pruned-update 1024/32/adaptive shin        | ########### 36.75 s
mixed cold-create 2048//adaptive aws             | ####################### 74.709 s
mixed unchanged-update 2048//adaptive aws        | ############ 37.764 s
mixed changed-update 2048//adaptive aws          | ############# 42.147 s
mixed pruned-update 2048//adaptive aws           | ############# 42.196 s
mixed cold-create 2048/64/adaptive shin          | ###################### 70.002 s
mixed unchanged-update 2048/64/adaptive shin     | ########## 32.497 s
mixed changed-update 2048/64/adaptive shin       | ########### 36.732 s
mixed pruned-update 2048/64/adaptive shin        | ############ 37.77 s
tiny-many cold-create 1024//adaptive aws         | ############################## 96.453 s
tiny-many unchanged-update 1024//adaptive aws    | ################### 59.682 s
tiny-many changed-update 1024//adaptive aws      | ###################### 70.442 s
tiny-many pruned-update 1024//adaptive aws       | #################### 65.085 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 70.054 s
tiny-many unchanged-update 1024/32/adaptive shin | ########## 32.562 s
tiny-many changed-update 1024/32/adaptive shin   | ############ 37.856 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 37.563 s
tiny-many cold-create 2048//adaptive aws         | ######################### 80.432 s
tiny-many unchanged-update 2048//adaptive aws    | ############### 48.675 s
tiny-many changed-update 2048//adaptive aws      | ################# 54.101 s
tiny-many pruned-update 2048//adaptive aws       | ############### 49.22 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 69.864 s
tiny-many unchanged-update 2048/64/adaptive shin | ########## 32.614 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 38.445 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 38.491 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.13 |   61.1 |  61.22 |    0.12 |    60.8 |   61.42 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.97 |  28.96 |  29.02 |    0.06 |   28.59 |   29.07 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.01 |  28.99 |  29.05 |    0.06 |   28.68 |   29.09 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.06 |  28.63 |  29.14 |    0.51 |    25.4 |   29.16 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       55.8 |  55.62 |   55.8 |    0.18 |   55.41 |   55.83 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.25 |  17.94 |  18.31 |    0.37 |   17.12 |   18.43 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.34 |  18.23 |  18.38 |    0.15 |   17.92 |   18.39 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.42 |  18.42 |  18.49 |    0.07 |   18.12 |   18.59 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      55.91 |  55.82 |  55.96 |    0.14 |   55.76 |   61.18 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.68 |  23.64 |  23.75 |    0.11 |   23.26 |   23.78 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.71 |  23.69 |  23.77 |    0.08 |   23.34 |    23.8 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.84 |  23.74 |   23.9 |    0.16 |    23.5 |   23.98 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.75 |  55.64 |  55.77 |    0.13 |   55.17 |   56.01 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.31 |  18.26 |  18.32 |    0.06 |   18.09 |   18.34 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.27 |  18.27 |  18.38 |    0.11 |   18.02 |   18.43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.43 |   18.4 |  18.49 |    0.09 |   18.13 |    18.7 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.14 |   61.1 |  61.28 |    0.18 |   60.97 |   66.02 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |         29 |     29 |  29.03 |    0.03 |   28.66 |   29.17 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.99 |  28.97 |  29.05 |    0.08 |   28.62 |   29.22 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.09 |  29.05 |  29.14 |    0.09 |   28.72 |   29.18 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.78 |  55.72 |   55.8 |    0.08 |   55.43 |   55.87 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.35 |  18.21 |  18.36 |    0.15 |   17.91 |   18.37 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       18.3 |  18.24 |  18.34 |     0.1 |   17.89 |   18.45 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.42 |  18.42 |  18.48 |    0.06 |   18.03 |   18.51 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      61.17 |  61.14 |  61.24 |     0.1 |   60.85 |   61.34 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       23.7 |  23.67 |  23.72 |    0.05 |   23.26 |   23.77 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.79 |  23.77 |  23.82 |    0.05 |   23.23 |   23.91 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       23.9 |  23.76 |  23.93 |    0.17 |   23.48 |      24 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       55.7 |  55.69 |  55.83 |    0.14 |   55.25 |   55.92 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.29 |  18.26 |   18.3 |    0.04 |   17.93 |   18.37 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.35 |   18.3 |  18.41 |    0.11 |      18 |   18.45 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.39 |  18.39 |  18.45 |    0.06 |   18.11 |   18.49 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      82.54 |  77.11 |  82.58 |    5.47 |   76.26 |   83.24 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      45.64 |  45.52 |  49.92 |     4.4 |   45.18 |   50.87 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      45.24 |   45.1 |  50.11 |    5.01 |   44.97 |   50.37 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      45.22 |  45.17 |  45.23 |    0.06 |   44.57 |   50.47 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.76 |  55.74 |  55.84 |     0.1 |   55.48 |   55.85 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.34 |   18.3 |  18.35 |    0.05 |   17.89 |   18.42 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.32 |  18.25 |  18.34 |    0.09 |   17.87 |   18.35 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.43 |   18.4 |  18.48 |    0.08 |   18.07 |   18.49 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      66.65 |  66.61 |   71.2 |    4.59 |   66.47 |   71.95 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       34.5 |  34.43 |  34.56 |    0.13 |   34.25 |   34.58 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.49 |  34.35 |  34.51 |    0.16 |   34.01 |   34.53 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      34.51 |   34.5 |  34.55 |    0.05 |   34.08 |   34.65 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.77 |  55.53 |  55.82 |    0.29 |   50.58 |   55.87 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.31 |   18.3 |  18.37 |    0.07 |   17.93 |   18.41 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.32 |  18.31 |  18.34 |    0.03 |   17.99 |   18.38 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.45 |  18.33 |  18.49 |    0.16 |   18.03 |   18.52 |

```text
large-few cold-create 1024//adaptive aws         | ###################### 61.13 s
large-few unchanged-update 1024//adaptive aws    | ########### 28.97 s
large-few changed-update 1024//adaptive aws      | ########### 29.01 s
large-few pruned-update 1024//adaptive aws       | ########### 29.06 s
large-few cold-create 1024/32/adaptive shin      | #################### 55.8 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.25 s
large-few changed-update 1024/32/adaptive shin   | ####### 18.34 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.42 s
large-few cold-create 2048//adaptive aws         | #################### 55.91 s
large-few unchanged-update 2048//adaptive aws    | ######### 23.68 s
large-few changed-update 2048//adaptive aws      | ######### 23.71 s
large-few pruned-update 2048//adaptive aws       | ######### 23.84 s
large-few cold-create 2048/64/adaptive shin      | #################### 55.75 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.31 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.27 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.43 s
mixed cold-create 1024//adaptive aws             | ###################### 61.14 s
mixed unchanged-update 1024//adaptive aws        | ########### 29 s
mixed changed-update 1024//adaptive aws          | ########### 28.99 s
mixed pruned-update 1024//adaptive aws           | ########### 29.09 s
mixed cold-create 1024/32/adaptive shin          | #################### 55.78 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.35 s
mixed changed-update 1024/32/adaptive shin       | ####### 18.3 s
mixed pruned-update 1024/32/adaptive shin        | ####### 18.42 s
mixed cold-create 2048//adaptive aws             | ###################### 61.17 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.7 s
mixed changed-update 2048//adaptive aws          | ######### 23.79 s
mixed pruned-update 2048//adaptive aws           | ######### 23.9 s
mixed cold-create 2048/64/adaptive shin          | #################### 55.7 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.29 s
mixed changed-update 2048/64/adaptive shin       | ####### 18.35 s
mixed pruned-update 2048/64/adaptive shin        | ####### 18.39 s
tiny-many cold-create 1024//adaptive aws         | ############################## 82.54 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 45.64 s
tiny-many changed-update 1024//adaptive aws      | ################ 45.24 s
tiny-many pruned-update 1024//adaptive aws       | ################ 45.22 s
tiny-many cold-create 1024/32/adaptive shin      | #################### 55.76 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.34 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 18.32 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.43 s
tiny-many cold-create 2048//adaptive aws         | ######################## 66.65 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 34.5 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.49 s
tiny-many pruned-update 2048//adaptive aws       | ############# 34.51 s
tiny-many cold-create 2048/64/adaptive shin      | #################### 55.77 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.31 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.32 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.45 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       448 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          416 |      416 |      417 |         1 |       416 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          116 |      112 |      123 |        11 |       111 |       127 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        38 |        40 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           40 |       39 |       41 |         2 |        39 |        42 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       417 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          182 |      165 |      191 |        26 |       163 |       199 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       32 |       33 |         1 |        32 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        38 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        39 |        42 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       280 |       281 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       279 |       281 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       280 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          272 |      272 |      272 |         0 |       272 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          106 |      105 |      107 |         2 |       104 |       108 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           34 |       34 |       34 |         0 |        34 |        35 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        36 |        39 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        37 |        39 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       281 |       282 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       281 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          274 |      274 |      275 |         1 |       274 |       275 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          117 |      111 |      117 |         6 |       107 |       125 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       34 |         1 |        33 |        37 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        37 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       37 |       39 |         2 |        37 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          218 |      218 |      219 |         1 |       218 |       219 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          211 |      210 |      213 |         3 |       209 |       220 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          210 |      210 |      210 |         0 |       209 |       219 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          210 |      210 |      212 |         2 |       209 |       214 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           57 |       54 |       57 |         3 |        53 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       222 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       220 |       221 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       221 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          218 |      217 |      218 |         1 |       217 |       218 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           65 |       64 |       69 |         5 |        58 |        74 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 416 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 116 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 39 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 40 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############ 182 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 39 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 40 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 280 MiB
mixed changed-update 1024//adaptive aws          | ################### 280 MiB
mixed pruned-update 1024//adaptive aws           | ################## 272 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 106 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 34 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 282 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 282 MiB
mixed pruned-update 2048//adaptive aws           | ################## 274 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 117 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ### 39 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 218 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 211 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 210 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 210 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 57 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 222 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 221 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 221 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 218 MiB
tiny-many cold-create 2048/64/adaptive shin      | #### 65 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
