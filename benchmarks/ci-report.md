# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-05
- Run ID: 57536204-0786-4c2f-8b51-1708dd98a59c
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |   1.925 s vs 9.152 s (4.754x faster) | 74.504 s vs 80.657 s (1.083x faster) | 57.28 s vs 62.63 s (1.093x faster) | 116 MiB vs 447 MiB (74.049% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |     0.24 s vs 9.552 s (39.8x faster) |   37.686 s vs 46.36 s (1.23x faster) | 19.11 s vs 29.95 s (1.567x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.469 s vs 9.556 s (20.375x faster) |  40.91 s vs 53.672 s (1.312x faster) |    19.17 s vs 30 s (1.565x faster) |  41 MiB vs 447 MiB (90.828% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.508 s vs 8.989 s (17.695x faster) | 41.816 s vs 51.394 s (1.229x faster) | 19.27 s vs 30.04 s (1.559x faster) |  41 MiB vs 417 MiB (90.168% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |    1.142 s vs 5.333 s (4.67x faster) | 71.895 s vs 73.125 s (1.017x faster) | 56.45 s vs 57.35 s (1.016x faster) | 186 MiB vs 447 MiB (58.389% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.209 s vs 5.226 s (25.005x faster) | 35.159 s vs 41.579 s (1.183x faster) | 19.02 s vs 24.56 s (1.291x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |  0.387 s vs 5.165 s (13.346x faster) | 41.867 s vs 46.313 s (1.106x faster) |  19.24 s vs 24.5 s (1.273x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |  0.483 s vs 4.988 s (10.327x faster) | 37.441 s vs 45.515 s (1.216x faster) | 19.28 s vs 24.65 s (1.279x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.299 s vs 9.946 s (7.657x faster) | 74.565 s vs 80.996 s (1.086x faster) | 57.82 s vs 62.72 s (1.085x faster) | 105 MiB vs 281 MiB (62.633% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | 0.282 s vs 10.366 s (36.759x faster) | 34.679 s vs 45.133 s (1.301x faster) |  19.07 s vs 29.9 s (1.568x faster) |  33 MiB vs 280 MiB (88.214% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |  0.41 s vs 10.429 s (25.437x faster) |  40.717 s vs 50.085 s (1.23x faster) |     19.23 s vs 30 s (1.56x faster) |  37 MiB vs 281 MiB (86.833% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |  1.125 s vs 10.127 s (9.002x faster) | 40.105 s vs 50.221 s (1.252x faster) |  19.33 s vs 29.96 s (1.55x faster) |  38 MiB vs 273 MiB (86.081% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.834 s vs 5.741 s (6.884x faster) | 71.371 s vs 76.604 s (1.073x faster) | 56.37 s vs 61.69 s (1.094x faster) | 119 MiB vs 283 MiB (57.951% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |   0.25 s vs 5.682 s (22.728x faster) | 35.483 s vs 39.933 s (1.125x faster) | 19.07 s vs 24.44 s (1.282x faster) |  33 MiB vs 282 MiB (88.298% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.382 s vs 5.826 s (15.251x faster) | 37.097 s vs 46.844 s (1.263x faster) |  19.23 s vs 24.5 s (1.274x faster) |  37 MiB vs 283 MiB (86.926% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |     1.112 s vs 5.6 s (5.036x faster) | 40.337 s vs 45.783 s (1.135x faster) | 19.28 s vs 24.54 s (1.273x faster) |  37 MiB vs 275 MiB (86.545% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |    2.71 s vs 24.823 s (9.16x faster) | 71.904 s vs 96.555 s (1.343x faster) | 56.42 s vs 79.47 s (1.409x faster) |  57 MiB vs 220 MiB (74.091% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.507 s vs 27.138 s (53.527x faster) | 34.514 s vs 63.351 s (1.836x faster) | 18.94 s vs 46.75 s (2.468x faster) |  35 MiB vs 213 MiB (83.568% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive |  0.604 s vs 27.138 s (44.93x faster) | 38.005 s vs 69.194 s (1.821x faster) |  19.2 s vs 46.37 s (2.415x faster) |  36 MiB vs 212 MiB (83.019% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.373 s vs 26.46 s (19.272x faster) | 38.112 s vs 67.986 s (1.784x faster) | 19.32 s vs 46.51 s (2.407x faster) |  36 MiB vs 209 MiB (82.775% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |   1.54 s vs 14.882 s (9.664x faster) | 71.578 s vs 84.885 s (1.186x faster) |  56.47 s vs 68.6 s (1.215x faster) |  68 MiB vs 223 MiB (69.507% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.454 s vs 15.627 s (34.421x faster) | 34.635 s vs 50.975 s (1.472x faster) |    19 s vs 35.35 s (1.861x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.597 s vs 15.561 s (26.065x faster) | 38.064 s vs 55.613 s (1.461x faster) | 19.23 s vs 35.32 s (1.837x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.358 s vs 14.973 s (11.026x faster) | 39.699 s vs 56.874 s (1.433x faster) | 19.36 s vs 35.52 s (1.835x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.925 s |              9.152 s |   +7.227 s |   4.754x |   +375.429% |
| Billed duration   |              2.043 s |              9.729 s |   +7.686 s |   4.762x |   +376.211% |
| Init duration     |               0.12 s |              0.545 s |   +0.425 s |   4.542x |   +354.167% |
| Local wall time   |             74.504 s |             80.657 s |   +6.153 s |   1.083x |     +8.259% |
| CDK deploy time   |              57.28 s |              62.63 s |    +5.35 s |   1.093x |      +9.34% |
| Max memory        |              116 MiB |              447 MiB |   +331 MiB |   3.853x |   +285.345% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.24 s |              9.552 s |   +9.312 s |    39.8x |      +3880% |
| Billed duration   |              0.357 s |             10.131 s |   +9.774 s |  28.378x |  +2737.815% |
| Init duration     |              0.117 s |              0.579 s |   +0.462 s |   4.949x |   +394.872% |
| Local wall time   |             37.686 s |              46.36 s |   +8.674 s |    1.23x |    +23.017% |
| CDK deploy time   |              19.11 s |              29.95 s |   +10.84 s |   1.567x |    +56.724% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.469 s |              9.556 s |   +9.087 s |  20.375x |  +1937.527% |
| Billed duration   |              0.594 s |             10.117 s |   +9.523 s |  17.032x |  +1603.199% |
| Init duration     |              0.124 s |              0.562 s |   +0.438 s |   4.532x |   +353.226% |
| Local wall time   |              40.91 s |             53.672 s |  +12.762 s |   1.312x |    +31.195% |
| CDK deploy time   |              19.17 s |                 30 s |   +10.83 s |   1.565x |    +56.495% |
| Max memory        |               41 MiB |              447 MiB |   +406 MiB |  10.902x |   +990.244% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.508 s |              8.989 s |   +8.481 s |  17.695x |  +1669.488% |
| Billed duration   |              0.625 s |              9.498 s |   +8.873 s |  15.197x |   +1419.68% |
| Init duration     |              0.118 s |              0.512 s |   +0.394 s |   4.339x |   +333.898% |
| Local wall time   |             41.816 s |             51.394 s |   +9.578 s |   1.229x |    +22.905% |
| CDK deploy time   |              19.27 s |              30.04 s |   +10.77 s |   1.559x |     +55.89% |
| Max memory        |               41 MiB |              417 MiB |   +376 MiB |  10.171x |   +917.073% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.142 s |              5.333 s |   +4.191 s |    4.67x |   +366.988% |
| Billed duration   |              1.262 s |              5.911 s |   +4.649 s |   4.684x |   +368.384% |
| Init duration     |               0.12 s |              0.592 s |   +0.472 s |   4.933x |   +393.333% |
| Local wall time   |             71.895 s |             73.125 s |    +1.23 s |   1.017x |     +1.711% |
| CDK deploy time   |              56.45 s |              57.35 s |     +0.9 s |   1.016x |     +1.594% |
| Max memory        |              186 MiB |              447 MiB |   +261 MiB |   2.403x |   +140.323% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.209 s |              5.226 s |   +5.017 s |  25.005x |  +2400.478% |
| Billed duration   |              0.324 s |              5.787 s |   +5.463 s |  17.861x |  +1686.111% |
| Init duration     |              0.117 s |              0.516 s |   +0.399 s |    4.41x |   +341.026% |
| Local wall time   |             35.159 s |             41.579 s |    +6.42 s |   1.183x |     +18.26% |
| CDK deploy time   |              19.02 s |              24.56 s |    +5.54 s |   1.291x |    +29.127% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.387 s |              5.165 s |   +4.778 s |  13.346x |  +1234.625% |
| Billed duration   |              0.498 s |              5.684 s |   +5.186 s |  11.414x |  +1041.365% |
| Init duration     |               0.12 s |              0.519 s |   +0.399 s |   4.325x |     +332.5% |
| Local wall time   |             41.867 s |             46.313 s |   +4.446 s |   1.106x |    +10.619% |
| CDK deploy time   |              19.24 s |               24.5 s |    +5.26 s |   1.273x |    +27.339% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.483 s |              4.988 s |   +4.505 s |  10.327x |   +932.712% |
| Billed duration   |              0.608 s |              5.506 s |   +4.898 s |   9.056x |   +805.592% |
| Init duration     |              0.121 s |              0.527 s |   +0.406 s |   4.355x |   +335.537% |
| Local wall time   |             37.441 s |             45.515 s |   +8.074 s |   1.216x |    +21.565% |
| CDK deploy time   |              19.28 s |              24.65 s |    +5.37 s |   1.279x |    +27.853% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.299 s |              9.946 s |   +8.647 s |   7.657x |   +665.666% |
| Billed duration   |              1.418 s |             10.514 s |   +9.096 s |   7.415x |   +641.467% |
| Init duration     |              0.118 s |              0.519 s |   +0.401 s |   4.398x |   +339.831% |
| Local wall time   |             74.565 s |             80.996 s |   +6.431 s |   1.086x |     +8.625% |
| CDK deploy time   |              57.82 s |              62.72 s |     +4.9 s |   1.085x |     +8.475% |
| Max memory        |              105 MiB |              281 MiB |   +176 MiB |   2.676x |   +167.619% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.282 s |             10.366 s |  +10.084 s |  36.759x |  +3575.887% |
| Billed duration   |              0.402 s |              10.92 s |  +10.518 s |  27.164x |  +2616.418% |
| Init duration     |               0.12 s |              0.523 s |   +0.403 s |   4.358x |   +335.833% |
| Local wall time   |             34.679 s |             45.133 s |  +10.454 s |   1.301x |    +30.145% |
| CDK deploy time   |              19.07 s |               29.9 s |   +10.83 s |   1.568x |    +56.791% |
| Max memory        |               33 MiB |              280 MiB |   +247 MiB |   8.485x |   +748.485% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.41 s |             10.429 s |  +10.019 s |  25.437x |  +2443.659% |
| Billed duration   |              0.531 s |             11.007 s |  +10.476 s |  20.729x |  +1972.881% |
| Init duration     |              0.124 s |              0.538 s |   +0.414 s |   4.339x |   +333.871% |
| Local wall time   |             40.717 s |             50.085 s |   +9.368 s |    1.23x |    +23.008% |
| CDK deploy time   |              19.23 s |                 30 s |   +10.77 s |    1.56x |    +56.006% |
| Max memory        |               37 MiB |              281 MiB |   +244 MiB |   7.595x |   +659.459% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.125 s |             10.127 s |   +9.002 s |   9.002x |   +800.178% |
| Billed duration   |              1.241 s |             10.644 s |   +9.403 s |   8.577x |   +757.695% |
| Init duration     |              0.121 s |              0.543 s |   +0.422 s |   4.488x |    +348.76% |
| Local wall time   |             40.105 s |             50.221 s |  +10.116 s |   1.252x |    +25.224% |
| CDK deploy time   |              19.33 s |              29.96 s |   +10.63 s |    1.55x |    +54.992% |
| Max memory        |               38 MiB |              273 MiB |   +235 MiB |   7.184x |   +618.421% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.834 s |              5.741 s |   +4.907 s |   6.884x |   +588.369% |
| Billed duration   |              0.961 s |              6.261 s |     +5.3 s |   6.515x |   +551.509% |
| Init duration     |              0.123 s |              0.519 s |   +0.396 s |    4.22x |   +321.951% |
| Local wall time   |             71.371 s |             76.604 s |   +5.233 s |   1.073x |     +7.332% |
| CDK deploy time   |              56.37 s |              61.69 s |    +5.32 s |   1.094x |     +9.438% |
| Max memory        |              119 MiB |              283 MiB |   +164 MiB |   2.378x |   +137.815% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.25 s |              5.682 s |   +5.432 s |  22.728x |    +2172.8% |
| Billed duration   |              0.368 s |              6.201 s |   +5.833 s |  16.851x |  +1585.054% |
| Init duration     |              0.121 s |              0.518 s |   +0.397 s |   4.281x |   +328.099% |
| Local wall time   |             35.483 s |             39.933 s |    +4.45 s |   1.125x |    +12.541% |
| CDK deploy time   |              19.07 s |              24.44 s |    +5.37 s |   1.282x |    +28.159% |
| Max memory        |               33 MiB |              282 MiB |   +249 MiB |   8.545x |   +754.545% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.382 s |              5.826 s |   +5.444 s |  15.251x |  +1425.131% |
| Billed duration   |              0.508 s |              6.347 s |   +5.839 s |  12.494x |  +1149.409% |
| Init duration     |              0.115 s |              0.526 s |   +0.411 s |   4.574x |   +357.391% |
| Local wall time   |             37.097 s |             46.844 s |   +9.747 s |   1.263x |    +26.274% |
| CDK deploy time   |              19.23 s |               24.5 s |    +5.27 s |   1.274x |    +27.405% |
| Max memory        |               37 MiB |              283 MiB |   +246 MiB |   7.649x |   +664.865% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.112 s |                5.6 s |   +4.488 s |   5.036x |   +403.597% |
| Billed duration   |              1.217 s |              6.107 s |    +4.89 s |   5.018x |   +401.808% |
| Init duration     |              0.118 s |              0.528 s |    +0.41 s |   4.475x |   +347.458% |
| Local wall time   |             40.337 s |             45.783 s |   +5.446 s |   1.135x |    +13.501% |
| CDK deploy time   |              19.28 s |              24.54 s |    +5.26 s |   1.273x |    +27.282% |
| Max memory        |               37 MiB |              275 MiB |   +238 MiB |   7.432x |   +643.243% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               2.71 s |             24.823 s |  +22.113 s |    9.16x |   +815.978% |
| Billed duration   |              2.827 s |             25.346 s |  +22.519 s |   8.966x |   +796.569% |
| Init duration     |              0.116 s |              0.528 s |   +0.412 s |   4.552x |   +355.172% |
| Local wall time   |             71.904 s |             96.555 s |  +24.651 s |   1.343x |    +34.283% |
| CDK deploy time   |              56.42 s |              79.47 s |   +23.05 s |   1.409x |    +40.854% |
| Max memory        |               57 MiB |              220 MiB |   +163 MiB |    3.86x |   +285.965% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.507 s |             27.138 s |  +26.631 s |  53.527x |  +5252.663% |
| Billed duration   |              0.606 s |             27.665 s |  +27.059 s |  45.652x |  +4465.182% |
| Init duration     |              0.117 s |              0.536 s |   +0.419 s |   4.581x |    +358.12% |
| Local wall time   |             34.514 s |             63.351 s |  +28.837 s |   1.836x |    +83.552% |
| CDK deploy time   |              18.94 s |              46.75 s |   +27.81 s |   2.468x |   +146.832% |
| Max memory        |               35 MiB |              213 MiB |   +178 MiB |   6.086x |   +508.571% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.604 s |             27.138 s |  +26.534 s |   44.93x |  +4393.046% |
| Billed duration   |              0.722 s |              27.67 s |  +26.948 s |  38.324x |   +3732.41% |
| Init duration     |              0.119 s |              0.526 s |   +0.407 s |    4.42x |   +342.017% |
| Local wall time   |             38.005 s |             69.194 s |  +31.189 s |   1.821x |    +82.066% |
| CDK deploy time   |               19.2 s |              46.37 s |   +27.17 s |   2.415x |    +141.51% |
| Max memory        |               36 MiB |              212 MiB |   +176 MiB |   5.889x |   +488.889% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.373 s |              26.46 s |  +25.087 s |  19.272x |  +1827.167% |
| Billed duration   |              1.499 s |             27.041 s |  +25.542 s |  18.039x |  +1703.936% |
| Init duration     |              0.119 s |              0.544 s |   +0.425 s |   4.571x |   +357.143% |
| Local wall time   |             38.112 s |             67.986 s |  +29.874 s |   1.784x |    +78.385% |
| CDK deploy time   |              19.32 s |              46.51 s |   +27.19 s |   2.407x |   +140.735% |
| Max memory        |               36 MiB |              209 MiB |   +173 MiB |   5.806x |   +480.556% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               1.54 s |             14.882 s |  +13.342 s |   9.664x |   +866.364% |
| Billed duration   |              1.663 s |              15.41 s |  +13.747 s |   9.266x |   +826.639% |
| Init duration     |              0.121 s |              0.516 s |   +0.395 s |   4.264x |   +326.446% |
| Local wall time   |             71.578 s |             84.885 s |  +13.307 s |   1.186x |    +18.591% |
| CDK deploy time   |              56.47 s |               68.6 s |   +12.13 s |   1.215x |     +21.48% |
| Max memory        |               68 MiB |              223 MiB |   +155 MiB |   3.279x |   +227.941% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.454 s |             15.627 s |  +15.173 s |  34.421x |   +3342.07% |
| Billed duration   |              0.579 s |             16.199 s |   +15.62 s |  27.978x |  +2697.755% |
| Init duration     |              0.121 s |              0.539 s |   +0.418 s |   4.455x |   +345.455% |
| Local wall time   |             34.635 s |             50.975 s |   +16.34 s |   1.472x |    +47.178% |
| CDK deploy time   |                 19 s |              35.35 s |   +16.35 s |   1.861x |    +86.053% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.597 s |             15.561 s |  +14.964 s |  26.065x |  +2506.533% |
| Billed duration   |              0.719 s |             16.067 s |  +15.348 s |  22.346x |  +2134.631% |
| Init duration     |              0.121 s |              0.505 s |   +0.384 s |   4.174x |   +317.355% |
| Local wall time   |             38.064 s |             55.613 s |  +17.549 s |   1.461x |    +46.104% |
| CDK deploy time   |              19.23 s |              35.32 s |   +16.09 s |   1.837x |    +83.671% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.358 s |             14.973 s |  +13.615 s |  11.026x |  +1002.577% |
| Billed duration   |              1.486 s |             15.613 s |  +14.127 s |  10.507x |   +950.673% |
| Init duration     |              0.122 s |              0.543 s |   +0.421 s |   4.451x |   +345.082% |
| Local wall time   |             39.699 s |             56.874 s |  +17.175 s |   1.433x |    +43.263% |
| CDK deploy time   |              19.36 s |              35.52 s |   +16.16 s |   1.835x |    +83.471% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.152 |  9.047 |  9.251 |   0.204 |   8.712 |     9.4 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.552 |  9.373 |   9.63 |   0.257 |   8.982 |   9.877 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.556 |  9.295 |  9.611 |   0.316 |   9.208 |   9.803 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.989 |  8.775 |  9.014 |   0.239 |   8.692 |   9.302 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.925 |  1.923 |  2.043 |    0.12 |   1.914 |   2.062 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.24 |  0.239 |  0.251 |   0.012 |   0.237 |    0.28 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.469 |  0.414 |   0.49 |   0.076 |    0.41 |   0.498 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.508 |  0.499 |  0.524 |   0.025 |   0.496 |    0.56 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.333 |  5.308 |  5.344 |   0.036 |   5.226 |   5.943 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.226 |  5.206 |  5.261 |   0.055 |   5.016 |   5.922 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.165 |  5.035 |   5.17 |   0.135 |   4.614 |   5.275 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.988 |  4.942 |  4.989 |   0.047 |   4.927 |   5.048 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.142 |  1.132 |  1.179 |   0.047 |   0.995 |   1.307 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.209 |  0.203 |   0.22 |   0.017 |   0.195 |   0.228 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.387 |  0.375 |  0.402 |   0.027 |   0.369 |   0.523 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.483 |  0.462 |  0.504 |   0.042 |   0.446 |   0.567 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.946 |  9.766 | 10.052 |   0.286 |   9.369 |  10.662 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.366 | 10.144 | 10.856 |   0.712 |   9.659 |  11.389 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.429 | 10.414 | 10.528 |   0.114 |  10.061 |  10.747 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.127 |  9.706 | 10.241 |   0.535 |   9.617 |  10.283 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.299 |  1.297 |  1.303 |   0.006 |   1.063 |   1.313 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.282 |  0.273 |  0.286 |   0.013 |    0.25 |   0.288 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.41 |  0.407 |  0.432 |   0.025 |   0.384 |    0.46 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.125 |   1.11 |  1.172 |   0.062 |   1.105 |   1.244 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.741 |  5.737 |  5.772 |   0.035 |   5.686 |   5.834 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.682 |   5.67 |  5.809 |   0.139 |   5.262 |    5.92 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.826 |  5.818 |  5.884 |   0.066 |   5.757 |   5.956 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |        5.6 |  5.574 |  5.716 |   0.142 |   5.479 |   5.885 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.834 |  0.815 |  0.876 |   0.061 |   0.785 |    0.97 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.25 |  0.245 |  0.256 |   0.011 |    0.24 |   0.267 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.382 |  0.373 |  0.414 |   0.041 |   0.348 |   0.439 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.112 |  1.028 |  1.122 |   0.094 |   1.003 |   1.184 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     24.823 | 24.728 | 25.249 |   0.521 |  24.303 |  25.602 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     27.138 | 26.862 | 27.277 |   0.415 |  25.382 |  27.634 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.138 | 26.882 | 27.209 |   0.327 |  26.046 |  27.693 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      26.46 | 25.961 | 26.942 |   0.981 |  24.314 |  27.305 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       2.71 |  2.502 |  2.734 |   0.232 |   2.488 |   2.807 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.507 |  0.475 |  0.523 |   0.048 |   0.446 |   0.529 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.604 |  0.601 |  0.608 |   0.007 |    0.56 |   0.621 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.373 |  1.371 |  1.447 |   0.076 |   1.348 |   1.451 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.882 | 14.825 | 14.969 |   0.144 |  14.768 |  16.513 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.627 | 15.442 |  15.66 |   0.218 |  15.263 |  15.844 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.561 | 15.327 | 15.707 |    0.38 |  14.955 |  15.802 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.973 | 14.828 | 15.096 |   0.268 |  14.685 |   15.25 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       1.54 |   1.54 |  1.565 |   0.025 |   1.506 |   1.637 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.454 |  0.445 |  0.477 |   0.032 |   0.425 |   0.485 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.597 |  0.588 |  0.617 |   0.029 |   0.559 |   0.621 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.358 |  1.342 |  1.415 |   0.073 |   1.294 |    1.48 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.152 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.552 s
large-few changed-update 1024//adaptive aws      | ########### 9.556 s
large-few pruned-update 1024//adaptive aws       | ########## 8.989 s
large-few cold-create 1024/32/adaptive shin      | ## 1.925 s
large-few unchanged-update 1024/32/adaptive shin | # 0.24 s
large-few changed-update 1024/32/adaptive shin   | # 0.469 s
large-few pruned-update 1024/32/adaptive shin    | # 0.508 s
large-few cold-create 2048//adaptive aws         | ###### 5.333 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.226 s
large-few changed-update 2048//adaptive aws      | ###### 5.165 s
large-few pruned-update 2048//adaptive aws       | ###### 4.988 s
large-few cold-create 2048/64/adaptive shin      | # 1.142 s
large-few unchanged-update 2048/64/adaptive shin | # 0.209 s
large-few changed-update 2048/64/adaptive shin   | # 0.387 s
large-few pruned-update 2048/64/adaptive shin    | # 0.483 s
mixed cold-create 1024//adaptive aws             | ########### 9.946 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.366 s
mixed changed-update 1024//adaptive aws          | ############ 10.429 s
mixed pruned-update 1024//adaptive aws           | ########### 10.127 s
mixed cold-create 1024/32/adaptive shin          | # 1.299 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.282 s
mixed changed-update 1024/32/adaptive shin       | # 0.41 s
mixed pruned-update 1024/32/adaptive shin        | # 1.125 s
mixed cold-create 2048//adaptive aws             | ###### 5.741 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.682 s
mixed changed-update 2048//adaptive aws          | ###### 5.826 s
mixed pruned-update 2048//adaptive aws           | ###### 5.6 s
mixed cold-create 2048/64/adaptive shin          | # 0.834 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.25 s
mixed changed-update 2048/64/adaptive shin       | # 0.382 s
mixed pruned-update 2048/64/adaptive shin        | # 1.112 s
tiny-many cold-create 1024//adaptive aws         | ########################### 24.823 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 27.138 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.138 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.46 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.71 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.507 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.604 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.373 s
tiny-many cold-create 2048//adaptive aws         | ################ 14.882 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.627 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.561 s
tiny-many pruned-update 2048//adaptive aws       | ################# 14.973 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.54 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.454 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.597 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.358 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.729 |  9.695 |  9.767 |   0.072 |   9.605 |   9.946 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.131 |  9.941 | 10.439 |   0.498 |   9.708 |  10.494 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.117 |  9.904 | 10.181 |   0.277 |   9.755 |  10.366 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.498 |  9.286 |  9.527 |   0.241 |   9.217 |   9.818 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.043 |   2.04 |  2.168 |   0.128 |    2.04 |    2.18 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.357 |  0.356 |  0.367 |   0.011 |   0.355 |   0.406 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.594 |  0.538 |  0.608 |    0.07 |   0.534 |   0.646 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.625 |   0.62 |  0.646 |   0.026 |    0.61 |   0.679 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.911 |  5.901 |  6.218 |   0.317 |   5.766 |   6.702 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.787 |  5.713 |  5.802 |   0.089 |   5.532 |    6.39 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.684 |  5.552 |  5.702 |    0.15 |   5.061 |   5.815 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.506 |   5.47 |  5.532 |   0.062 |   5.439 |   5.594 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.262 |  1.262 |  1.303 |   0.041 |   1.094 |   1.424 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.324 |  0.322 |   0.33 |   0.008 |   0.312 |   0.336 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.498 |  0.495 |   0.51 |   0.015 |   0.489 |   0.641 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.608 |  0.585 |  0.625 |    0.04 |   0.543 |   0.689 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.514 | 10.281 | 10.572 |   0.291 |   9.866 |  11.212 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      10.92 | 10.668 | 11.292 |   0.624 |   10.15 |   11.96 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     11.007 | 10.974 | 11.067 |   0.093 |   10.58 |  11.206 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.644 | 10.241 | 10.788 |   0.547 |  10.161 |  10.851 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.418 |  1.415 |  1.423 |   0.008 |   1.161 |   1.432 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.402 |  0.391 |  0.405 |   0.014 |   0.383 |   0.417 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.531 |  0.527 |  0.557 |    0.03 |    0.51 |   0.591 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.241 |  1.232 |  1.297 |   0.065 |   1.223 |   1.366 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.261 |  6.259 |  6.291 |   0.032 |   6.202 |    6.36 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.201 |   6.17 |  6.456 |   0.286 |   5.721 |   6.577 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.347 |  6.347 |  6.405 |   0.058 |   6.284 |   6.536 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.107 |  6.106 |  6.245 |   0.139 |   5.981 |   6.451 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.961 |  0.933 |      1 |   0.067 |   0.902 |   1.123 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.368 |  0.362 |   0.38 |   0.018 |    0.36 |   0.392 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.508 |  0.488 |  0.526 |   0.038 |   0.475 |   0.534 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.217 |  1.148 |  1.231 |   0.083 |   1.122 |   1.303 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.346 | 25.246 | 25.778 |   0.532 |  24.858 |  26.134 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     27.665 | 27.398 |  27.84 |   0.442 |   25.85 |  28.219 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      27.67 | 27.405 | 27.731 |   0.326 |  26.573 |  28.251 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     27.041 |  26.47 | 27.492 |   1.022 |  24.823 |  27.849 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.827 |  2.616 |  2.859 |   0.243 |   2.581 |   2.938 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.606 |  0.593 |  0.643 |    0.05 |   0.561 |   0.646 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.722 |   0.72 |  0.727 |   0.007 |   0.656 |    0.74 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.499 |  1.491 |  1.566 |   0.075 |   1.468 |   1.573 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      15.41 | 15.341 | 15.502 |   0.161 |  15.275 |  16.952 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     16.199 | 15.956 | 16.382 |   0.426 |  15.803 |  16.443 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     16.067 | 15.831 | 16.235 |   0.404 |  15.454 |  16.343 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.613 | 15.527 |  15.67 |   0.143 |  15.219 |  15.794 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.663 |  1.654 |  1.686 |   0.032 |   1.603 |   1.764 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.579 |  0.542 |  0.598 |   0.056 |    0.54 |   0.607 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.719 |  0.705 |  0.735 |    0.03 |   0.681 |   0.746 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.486 |  1.465 |  1.532 |   0.067 |   1.415 |   1.605 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.729 s
large-few unchanged-update 1024//adaptive aws    | ########### 10.131 s
large-few changed-update 1024//adaptive aws      | ########### 10.117 s
large-few pruned-update 1024//adaptive aws       | ########## 9.498 s
large-few cold-create 1024/32/adaptive shin      | ## 2.043 s
large-few unchanged-update 1024/32/adaptive shin | # 0.357 s
large-few changed-update 1024/32/adaptive shin   | # 0.594 s
large-few pruned-update 1024/32/adaptive shin    | # 0.625 s
large-few cold-create 2048//adaptive aws         | ###### 5.911 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.787 s
large-few changed-update 2048//adaptive aws      | ###### 5.684 s
large-few pruned-update 2048//adaptive aws       | ###### 5.506 s
large-few cold-create 2048/64/adaptive shin      | # 1.262 s
large-few unchanged-update 2048/64/adaptive shin | # 0.324 s
large-few changed-update 2048/64/adaptive shin   | # 0.498 s
large-few pruned-update 2048/64/adaptive shin    | # 0.608 s
mixed cold-create 1024//adaptive aws             | ########### 10.514 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.92 s
mixed changed-update 1024//adaptive aws          | ############ 11.007 s
mixed pruned-update 1024//adaptive aws           | ############ 10.644 s
mixed cold-create 1024/32/adaptive shin          | ## 1.418 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.402 s
mixed changed-update 1024/32/adaptive shin       | # 0.531 s
mixed pruned-update 1024/32/adaptive shin        | # 1.241 s
mixed cold-create 2048//adaptive aws             | ####### 6.261 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.201 s
mixed changed-update 2048//adaptive aws          | ####### 6.347 s
mixed pruned-update 2048//adaptive aws           | ####### 6.107 s
mixed cold-create 2048/64/adaptive shin          | # 0.961 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.368 s
mixed changed-update 2048/64/adaptive shin       | # 0.508 s
mixed pruned-update 2048/64/adaptive shin        | # 1.217 s
tiny-many cold-create 1024//adaptive aws         | ########################### 25.346 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 27.665 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.67 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 27.041 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.827 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.606 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.722 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.499 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.41 s
tiny-many unchanged-update 2048//adaptive aws    | ################## 16.199 s
tiny-many changed-update 2048//adaptive aws      | ################# 16.067 s
tiny-many pruned-update 2048//adaptive aws       | ################# 15.613 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.663 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.579 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.719 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.486 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.545 |  0.543 |  0.557 |   0.014 |   0.516 |   1.017 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.579 |  0.568 |  0.726 |   0.158 |   0.561 |   0.863 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.562 |  0.561 |   0.57 |   0.009 |   0.547 |   0.608 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.512 |   0.51 |  0.516 |   0.006 |   0.509 |   0.525 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.118 |  0.125 |   0.007 |   0.115 |   0.125 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.118 |   0.002 |   0.115 |   0.126 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.124 |  0.119 |  0.127 |   0.008 |   0.117 |   0.148 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.121 |   0.004 |   0.114 |   0.122 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.592 |  0.577 |  0.758 |   0.181 |    0.54 |   0.874 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.516 |  0.507 |  0.525 |   0.018 |   0.468 |   0.575 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.519 |  0.517 |  0.532 |   0.015 |   0.447 |   0.539 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.527 |  0.517 |  0.543 |   0.026 |   0.512 |   0.546 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.116 |  0.124 |   0.008 |   0.098 |   0.129 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.119 |   0.004 |   0.095 |   0.121 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.118 |   0.12 |   0.002 |   0.095 |   0.123 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |   0.12 |  0.123 |   0.003 |   0.096 |   0.124 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.519 |  0.514 |  0.549 |   0.035 |   0.497 |   0.567 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.523 |   0.49 |  0.554 |   0.064 |   0.435 |    0.57 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.538 |  0.519 |  0.545 |   0.026 |   0.458 |   0.593 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.543 |  0.534 |  0.546 |   0.012 |   0.517 |   0.568 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.119 |   0.002 |   0.098 |   0.119 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.118 |  0.129 |   0.011 |   0.117 |   0.133 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.124 |  0.121 |  0.125 |   0.004 |    0.12 |    0.13 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.118 |  0.122 |   0.004 |   0.116 |   0.124 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.519 |  0.518 |  0.524 |   0.006 |   0.516 |   0.525 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.518 |    0.5 |  0.536 |   0.036 |   0.459 |   0.767 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.526 |  0.521 |  0.529 |   0.008 |    0.52 |    0.58 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.528 |  0.506 |  0.532 |   0.026 |   0.502 |   0.565 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.123 |  0.118 |  0.126 |   0.008 |   0.116 |   0.153 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.117 |  0.124 |   0.007 |   0.114 |   0.124 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.115 |  0.112 |  0.126 |   0.014 |   0.095 |   0.127 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.118 |       0 |   0.094 |   0.119 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.528 |  0.522 |  0.531 |   0.009 |   0.517 |   0.555 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.536 |  0.527 |  0.563 |   0.036 |   0.467 |   0.584 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.526 |  0.523 |  0.532 |   0.009 |   0.521 |   0.557 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.544 |  0.508 |   0.55 |   0.042 |   0.508 |    0.58 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |  0.125 |   0.011 |   0.093 |    0.13 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.118 |   0.003 |   0.099 |   0.119 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.116 |  0.119 |   0.003 |   0.096 |    0.12 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.119 |  0.121 |   0.002 |   0.117 |   0.127 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.516 |  0.506 |  0.528 |   0.022 |   0.438 |   0.532 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.539 |  0.538 |  0.539 |   0.001 |   0.514 |   0.816 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.505 |  0.504 |  0.527 |   0.023 |   0.499 |   0.541 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.543 |  0.533 |  0.553 |    0.02 |   0.516 |   0.841 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.114 |  0.122 |   0.008 |   0.097 |   0.126 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.117 |  0.122 |   0.005 |   0.095 |   0.125 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.117 |  0.122 |   0.005 |   0.116 |   0.124 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |   0.12 |  0.125 |   0.005 |   0.116 |   0.127 |

```text
large-few cold-create 1024//adaptive aws         | ############################ 0.545 s
large-few unchanged-update 1024//adaptive aws    | ############################# 0.579 s
large-few changed-update 1024//adaptive aws      | ############################ 0.562 s
large-few pruned-update 1024//adaptive aws       | ########################## 0.512 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.12 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.117 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.124 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.118 s
large-few cold-create 2048//adaptive aws         | ############################## 0.592 s
large-few unchanged-update 2048//adaptive aws    | ########################## 0.516 s
large-few changed-update 2048//adaptive aws      | ########################## 0.519 s
large-few pruned-update 2048//adaptive aws       | ########################### 0.527 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.12 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.117 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.12 s
large-few pruned-update 2048/64/adaptive shin    | ###### 0.121 s
mixed cold-create 1024//adaptive aws             | ########################## 0.519 s
mixed unchanged-update 1024//adaptive aws        | ########################### 0.523 s
mixed changed-update 1024//adaptive aws          | ########################### 0.538 s
mixed pruned-update 1024//adaptive aws           | ############################ 0.543 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.118 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.12 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.124 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.121 s
mixed cold-create 2048//adaptive aws             | ########################## 0.519 s
mixed unchanged-update 2048//adaptive aws        | ########################## 0.518 s
mixed changed-update 2048//adaptive aws          | ########################### 0.526 s
mixed pruned-update 2048//adaptive aws           | ########################### 0.528 s
mixed cold-create 2048/64/adaptive shin          | ###### 0.123 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.121 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.115 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.118 s
tiny-many cold-create 1024//adaptive aws         | ########################### 0.528 s
tiny-many unchanged-update 1024//adaptive aws    | ########################### 0.536 s
tiny-many changed-update 1024//adaptive aws      | ########################### 0.526 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 0.544 s
tiny-many cold-create 1024/32/adaptive shin      | ###### 0.116 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.117 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.119 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.119 s
tiny-many cold-create 2048//adaptive aws         | ########################## 0.516 s
tiny-many unchanged-update 2048//adaptive aws    | ########################### 0.539 s
tiny-many changed-update 2048//adaptive aws      | ########################## 0.505 s
tiny-many pruned-update 2048//adaptive aws       | ############################ 0.543 s
tiny-many cold-create 2048/64/adaptive shin      | ###### 0.121 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.121 s
tiny-many changed-update 2048/64/adaptive shin   | ###### 0.121 s
tiny-many pruned-update 2048/64/adaptive shin    | ###### 0.122 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.657 |  80.33 | 81.419 |   1.089 |  77.227 |  84.443 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      46.36 | 45.484 | 47.671 |   2.187 |  45.058 |  49.387 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     53.672 | 51.854 | 53.714 |    1.86 |  50.787 |  57.998 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     51.394 | 46.528 | 53.629 |   7.101 |  45.633 |  54.129 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     74.504 | 74.315 |  75.82 |   1.505 |  74.164 |  80.361 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     37.686 | 36.168 | 37.715 |   1.547 |  34.869 |  44.596 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      40.91 | 40.022 | 41.467 |   1.445 |  37.424 |  41.879 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     41.816 | 40.792 | 42.708 |   1.916 |  35.173 |  44.454 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     73.125 | 73.045 |  74.37 |   1.325 |  71.704 |  76.892 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     41.579 | 39.885 | 41.851 |   1.966 |  38.814 | 495.667 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     46.313 | 45.547 | 47.324 |   1.777 |  45.035 |  47.766 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     45.515 | 45.472 | 46.589 |   1.117 |   42.73 |  47.316 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     71.895 | 71.884 |  74.28 |   2.396 |   68.12 |  87.074 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     35.159 | 34.209 | 36.311 |   2.102 |  33.752 |  37.752 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     41.867 | 40.827 | 42.091 |   1.264 |  39.822 |   43.44 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.441 | 35.513 | 43.546 |   8.033 |  35.285 |   45.34 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.996 | 79.727 |  82.07 |   2.343 |  78.177 |   83.04 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     45.133 | 43.995 | 47.571 |   3.576 |  43.638 |  48.161 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     50.085 | 48.233 | 50.113 |    1.88 |  46.898 |   51.08 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     50.221 | 48.922 | 50.543 |   1.621 |  46.686 |  64.318 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     74.565 |  73.28 | 74.738 |   1.458 |  72.627 |  75.511 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     34.679 |  34.07 | 36.468 |   2.398 |  33.316 |  37.366 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     40.717 | 39.823 | 41.954 |   2.131 |  39.244 |  42.638 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     40.105 | 39.899 | 42.301 |   2.402 |  35.801 |  43.058 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     76.604 | 74.296 | 78.069 |   3.773 |  72.499 |  78.392 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     39.933 | 39.137 | 41.142 |   2.005 |  38.721 |  62.579 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     46.844 | 45.065 | 47.584 |   2.519 |  38.968 |  59.698 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     45.783 | 44.762 | 47.247 |   2.485 |  39.845 |  48.156 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     71.371 |   70.7 | 73.586 |   2.886 |  67.639 |  74.489 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     35.483 | 34.971 | 35.781 |    0.81 |  33.714 |  36.629 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.097 | 35.417 | 39.617 |     4.2 |  33.907 |  42.513 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     40.337 | 39.499 | 41.001 |   1.502 |  37.421 |  41.905 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     96.555 | 92.763 | 97.238 |   4.475 |  92.698 |   99.44 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     63.351 | 61.955 | 64.439 |   2.484 |  59.775 |  65.724 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     69.194 | 65.196 | 71.812 |   6.616 |   60.79 |   74.59 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     67.986 |  67.81 | 69.839 |   2.029 |  67.292 |  72.842 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     71.904 | 71.157 | 72.824 |   1.667 |  70.432 |  75.359 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     34.514 | 34.151 |  35.62 |   1.469 |  33.421 |  36.737 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.005 | 37.042 | 39.332 |    2.29 |  34.697 |  40.863 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.112 | 36.783 | 40.619 |   3.836 |  34.089 |  41.228 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     84.885 | 83.353 | 85.712 |   2.359 |  82.095 |  87.326 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     50.975 | 50.049 | 53.088 |   3.039 |  49.635 |  53.215 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     55.613 |  55.16 | 57.367 |   2.207 |  51.341 |  59.335 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     56.874 | 56.022 |  58.23 |   2.208 |  50.313 |  59.715 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     71.578 | 71.426 | 73.774 |   2.348 |  69.417 |  75.776 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     34.635 | 33.707 | 35.468 |   1.761 |  33.249 |  36.748 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.064 | 36.427 |  39.62 |   3.193 |  34.199 |  40.601 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     39.699 | 38.231 | 40.025 |   1.794 |  37.427 |  41.474 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 80.657 s
large-few unchanged-update 1024//adaptive aws    | ############## 46.36 s
large-few changed-update 1024//adaptive aws      | ################# 53.672 s
large-few pruned-update 1024//adaptive aws       | ################ 51.394 s
large-few cold-create 1024/32/adaptive shin      | ####################### 74.504 s
large-few unchanged-update 1024/32/adaptive shin | ############ 37.686 s
large-few changed-update 1024/32/adaptive shin   | ############# 40.91 s
large-few pruned-update 1024/32/adaptive shin    | ############# 41.816 s
large-few cold-create 2048//adaptive aws         | ####################### 73.125 s
large-few unchanged-update 2048//adaptive aws    | ############# 41.579 s
large-few changed-update 2048//adaptive aws      | ############## 46.313 s
large-few pruned-update 2048//adaptive aws       | ############## 45.515 s
large-few cold-create 2048/64/adaptive shin      | ###################### 71.895 s
large-few unchanged-update 2048/64/adaptive shin | ########### 35.159 s
large-few changed-update 2048/64/adaptive shin   | ############# 41.867 s
large-few pruned-update 2048/64/adaptive shin    | ############ 37.441 s
mixed cold-create 1024//adaptive aws             | ######################### 80.996 s
mixed unchanged-update 1024//adaptive aws        | ############## 45.133 s
mixed changed-update 1024//adaptive aws          | ################ 50.085 s
mixed pruned-update 1024//adaptive aws           | ################ 50.221 s
mixed cold-create 1024/32/adaptive shin          | ####################### 74.565 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 34.679 s
mixed changed-update 1024/32/adaptive shin       | ############# 40.717 s
mixed pruned-update 1024/32/adaptive shin        | ############ 40.105 s
mixed cold-create 2048//adaptive aws             | ######################## 76.604 s
mixed unchanged-update 2048//adaptive aws        | ############ 39.933 s
mixed changed-update 2048//adaptive aws          | ############### 46.844 s
mixed pruned-update 2048//adaptive aws           | ############## 45.783 s
mixed cold-create 2048/64/adaptive shin          | ###################### 71.371 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 35.483 s
mixed changed-update 2048/64/adaptive shin       | ############ 37.097 s
mixed pruned-update 2048/64/adaptive shin        | ############# 40.337 s
tiny-many cold-create 1024//adaptive aws         | ############################## 96.555 s
tiny-many unchanged-update 1024//adaptive aws    | #################### 63.351 s
tiny-many changed-update 1024//adaptive aws      | ##################### 69.194 s
tiny-many pruned-update 1024//adaptive aws       | ##################### 67.986 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 71.904 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 34.514 s
tiny-many changed-update 1024/32/adaptive shin   | ############ 38.005 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 38.112 s
tiny-many cold-create 2048//adaptive aws         | ########################## 84.885 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 50.975 s
tiny-many changed-update 2048//adaptive aws      | ################# 55.613 s
tiny-many pruned-update 2048//adaptive aws       | ################## 56.874 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 71.578 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 34.635 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 38.064 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 39.699 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      62.63 |  61.84 |  62.82 |    0.98 |   61.74 |   63.41 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.95 |  29.36 |  29.98 |    0.62 |   29.31 |   30.47 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |         30 |  29.34 |  30.05 |    0.71 |    29.2 |   30.55 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.04 |  29.56 |  30.13 |    0.57 |   29.46 |   30.85 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.28 |  56.33 |  57.46 |    1.13 |   56.26 |   57.87 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.11 |  18.59 |  19.14 |    0.55 |   18.48 |   19.43 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.17 |  18.79 |  19.22 |    0.43 |   18.71 |   19.54 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.27 |  19.06 |  19.43 |    0.37 |   18.91 |   20.04 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.35 |  57.33 |  57.97 |    0.64 |   56.61 |   61.78 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.56 |  24.05 |  24.64 |    0.59 |   24.04 |   24.79 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       24.5 |  23.99 |  24.65 |    0.66 |    23.9 |   24.86 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.65 |  24.13 |  24.75 |    0.62 |   24.08 |   25.23 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      56.45 |  56.17 |  57.97 |     1.8 |   51.83 |      58 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.02 |  18.68 |  19.11 |    0.43 |   18.43 |   19.36 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.24 |  18.62 |  19.26 |    0.64 |   18.62 |   19.57 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.28 |  18.77 |  19.43 |    0.66 |   18.72 |   19.82 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      62.72 |  62.67 |  63.38 |    0.71 |    61.7 |   67.07 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       29.9 |  29.24 |  29.99 |    0.75 |   29.22 |   30.37 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |         30 |  29.26 |  30.05 |    0.79 |    29.2 |   30.33 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.96 |   29.5 |  30.06 |    0.56 |   29.36 |   30.87 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.82 |  56.47 |  57.89 |    1.42 |   56.28 |   57.97 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.07 |  18.49 |  19.19 |     0.7 |   18.44 |   19.37 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.23 |   18.7 |  19.52 |    0.82 |   18.66 |   19.53 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.33 |  18.83 |  19.34 |    0.51 |    18.7 |   19.89 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      61.69 |  57.89 |  61.69 |     3.8 |   57.23 |   62.67 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.44 |   24.2 |  24.53 |    0.33 |    23.9 |   24.94 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       24.5 |  24.03 |  24.64 |    0.61 |   23.97 |   24.91 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.54 |  24.32 |  24.67 |    0.35 |   24.16 |   25.28 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      56.37 |  56.26 |   57.8 |    1.54 |   52.45 |   57.83 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.07 |  18.59 |  19.09 |     0.5 |   18.45 |   19.39 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.23 |  18.77 |  19.26 |    0.49 |   18.61 |   19.51 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.28 |  18.81 |  19.36 |    0.55 |   18.78 |    19.8 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      79.47 |  77.87 |  79.74 |    1.87 |   77.68 |   84.39 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      46.75 |  46.23 |  47.18 |    0.95 |    45.4 |    50.9 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      46.37 |  46.37 |   47.1 |    0.73 |   45.46 |   50.91 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      46.51 |  46.34 |  47.69 |    1.35 |   45.73 |      51 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      56.42 |  56.36 |  57.79 |    1.43 |   52.45 |   57.81 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.94 |  18.61 |  19.04 |    0.43 |   18.58 |   19.33 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       19.2 |   18.7 |  19.51 |    0.81 |   18.69 |      20 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.32 |  18.92 |  19.35 |    0.43 |   18.83 |   19.97 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       68.6 |   68.2 |  68.78 |    0.58 |   67.18 |   72.53 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      35.35 |  34.73 |  35.87 |    1.14 |    34.7 |   36.11 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      35.32 |  34.92 |  35.42 |     0.5 |   34.68 |      36 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      35.52 |   35.1 |  35.89 |    0.79 |   35.01 |   36.42 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      56.47 |  56.34 |  57.78 |    1.44 |   52.06 |   57.99 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |         19 |  18.55 |  19.02 |    0.47 |   18.38 |   19.39 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.23 |  18.64 |  19.37 |    0.73 |   18.62 |   19.52 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.36 |  18.77 |  19.68 |    0.91 |   18.74 |   19.97 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 62.63 s
large-few unchanged-update 1024//adaptive aws    | ########### 29.95 s
large-few changed-update 1024//adaptive aws      | ########### 30 s
large-few pruned-update 1024//adaptive aws       | ########### 30.04 s
large-few cold-create 1024/32/adaptive shin      | ###################### 57.28 s
large-few unchanged-update 1024/32/adaptive shin | ####### 19.11 s
large-few changed-update 1024/32/adaptive shin   | ####### 19.17 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.27 s
large-few cold-create 2048//adaptive aws         | ###################### 57.35 s
large-few unchanged-update 2048//adaptive aws    | ######### 24.56 s
large-few changed-update 2048//adaptive aws      | ######### 24.5 s
large-few pruned-update 2048//adaptive aws       | ######### 24.65 s
large-few cold-create 2048/64/adaptive shin      | ##################### 56.45 s
large-few unchanged-update 2048/64/adaptive shin | ####### 19.02 s
large-few changed-update 2048/64/adaptive shin   | ####### 19.24 s
large-few pruned-update 2048/64/adaptive shin    | ####### 19.28 s
mixed cold-create 1024//adaptive aws             | ######################## 62.72 s
mixed unchanged-update 1024//adaptive aws        | ########### 29.9 s
mixed changed-update 1024//adaptive aws          | ########### 30 s
mixed pruned-update 1024//adaptive aws           | ########### 29.96 s
mixed cold-create 1024/32/adaptive shin          | ###################### 57.82 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 19.07 s
mixed changed-update 1024/32/adaptive shin       | ####### 19.23 s
mixed pruned-update 1024/32/adaptive shin        | ####### 19.33 s
mixed cold-create 2048//adaptive aws             | ####################### 61.69 s
mixed unchanged-update 2048//adaptive aws        | ######### 24.44 s
mixed changed-update 2048//adaptive aws          | ######### 24.5 s
mixed pruned-update 2048//adaptive aws           | ######### 24.54 s
mixed cold-create 2048/64/adaptive shin          | ##################### 56.37 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 19.07 s
mixed changed-update 2048/64/adaptive shin       | ####### 19.23 s
mixed pruned-update 2048/64/adaptive shin        | ####### 19.28 s
tiny-many cold-create 1024//adaptive aws         | ############################## 79.47 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 46.75 s
tiny-many changed-update 1024//adaptive aws      | ################## 46.37 s
tiny-many pruned-update 1024//adaptive aws       | ################## 46.51 s
tiny-many cold-create 1024/32/adaptive shin      | ##################### 56.42 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.94 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.2 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 19.32 s
tiny-many cold-create 2048//adaptive aws         | ########################## 68.6 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 35.35 s
tiny-many changed-update 2048//adaptive aws      | ############# 35.32 s
tiny-many pruned-update 2048//adaptive aws       | ############# 35.52 s
tiny-many cold-create 2048/64/adaptive shin      | ##################### 56.47 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 19 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 19.23 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 19.36 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       448 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      416 |      417 |         1 |       414 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          116 |      116 |      127 |        11 |       113 |       128 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        34 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           41 |       40 |       42 |         2 |        40 |        44 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           41 |       39 |       42 |         3 |        38 |        42 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       416 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          186 |      179 |      189 |        10 |       178 |       201 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        39 |        43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        39 |        40 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       281 |       281 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      281 |         1 |       280 |       281 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      281 |         1 |       280 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       273 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          105 |      105 |      106 |         1 |       100 |       108 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        37 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           38 |       37 |       39 |         2 |        37 |        41 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          283 |      283 |      283 |         0 |       283 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       282 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       282 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      275 |      276 |         1 |       274 |       276 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          119 |      117 |      124 |         7 |       109 |       130 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       35 |         2 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          220 |      220 |      220 |         0 |       219 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          213 |      212 |      217 |         5 |       212 |       221 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          212 |      211 |      215 |         4 |       211 |       215 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          209 |      208 |      211 |         3 |       207 |       212 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           57 |       57 |       57 |         0 |        57 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        36 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      223 |         0 |       221 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       221 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       222 |       223 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       218 |       220 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           68 |       65 |       73 |         8 |        58 |        74 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        35 |        36 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 116 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 41 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 41 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############ 186 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 40 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 40 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 280 MiB
mixed changed-update 1024//adaptive aws          | ################### 281 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 105 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ### 38 MiB
mixed cold-create 2048//adaptive aws             | ################### 283 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 283 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 119 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 220 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 213 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 212 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 209 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 57 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 222 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 222 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 68 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 36 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
