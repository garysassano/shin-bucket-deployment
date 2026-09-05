# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-05
- Run ID: ab9ac956-af55-40a0-9139-23bace5acb4c
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |       2 s vs 9.429 s (4.715x faster) |  71.923 s vs 77.685 s (1.08x faster) |  55.8 s vs 61.87 s (1.109x faster) | 126 MiB vs 447 MiB (71.812% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.239 s vs 9.447 s (39.527x faster) | 35.099 s vs 43.903 s (1.251x faster) | 18.28 s vs 28.96 s (1.584x faster) |  32 MiB vs 447 MiB (92.841% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.493 s vs 9.472 s (19.213x faster) | 38.442 s vs 50.504 s (1.314x faster) | 18.51 s vs 28.98 s (1.566x faster) |  41 MiB vs 447 MiB (90.828% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |   0.511 s vs 8.96 s (17.534x faster) | 40.944 s vs 49.825 s (1.217x faster) | 18.47 s vs 29.02 s (1.571x faster) |  39 MiB vs 416 MiB (90.625% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.162 s vs 5.163 s (4.443x faster) | 77.189 s vs 71.583 s (1.078x slower) |  55.8 s vs 56.65 s (1.015x faster) | 193 MiB vs 447 MiB (56.823% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.222 s vs 5.171 s (23.293x faster) | 33.359 s vs 38.646 s (1.158x faster) |   18.14 s vs 23.59 s (1.3x faster) |  32 MiB vs 447 MiB (92.841% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.419 s vs 5.24 s (12.506x faster) | 40.057 s vs 43.148 s (1.077x faster) | 18.46 s vs 23.77 s (1.288x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |  0.454 s vs 4.948 s (10.899x faster) |  39.76 s vs 44.456 s (1.118x faster) | 18.47 s vs 23.77 s (1.287x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.262 s vs 9.866 s (7.818x faster) | 70.977 s vs 79.957 s (1.127x faster) |  55.5 s vs 61.74 s (1.112x faster) | 107 MiB vs 281 MiB (61.922% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |  0.28 s vs 10.283 s (36.725x faster) | 33.557 s vs 44.943 s (1.339x faster) | 18.32 s vs 28.91 s (1.578x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |  0.402 s vs 10.35 s (25.746x faster) | 38.957 s vs 49.331 s (1.266x faster) | 18.39 s vs 28.95 s (1.574x faster) |  37 MiB vs 281 MiB (86.833% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |  1.071 s vs 10.179 s (9.504x faster) | 38.451 s vs 62.992 s (1.638x faster) | 18.54 s vs 29.12 s (1.571x faster) |  38 MiB vs 273 MiB (86.081% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.827 s vs 5.747 s (6.949x faster) | 70.185 s vs 74.439 s (1.061x faster) | 55.75 s vs 60.81 s (1.091x faster) | 117 MiB vs 283 MiB (58.657% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.261 s vs 5.887 s (22.556x faster) | 33.054 s vs 38.515 s (1.165x faster) | 18.18 s vs 23.62 s (1.299x faster) |  33 MiB vs 282 MiB (88.298% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.359 s vs 5.758 s (16.039x faster) | 39.151 s vs 43.873 s (1.121x faster) | 18.37 s vs 23.63 s (1.286x faster) |  37 MiB vs 282 MiB (86.879% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.024 s vs 5.643 s (5.511x faster) | 34.409 s vs 44.295 s (1.287x faster) | 18.47 s vs 23.79 s (1.288x faster) |  37 MiB vs 275 MiB (86.545% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | 2.607 s vs 26.425 s (10.136x faster) | 72.051 s vs 97.331 s (1.351x faster) |  55.9 s vs 82.57 s (1.477x faster) |  57 MiB vs 219 MiB (73.973% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.468 s vs 26.875 s (57.425x faster) | 33.749 s vs 62.479 s (1.851x faster) | 18.26 s vs 45.44 s (2.488x faster) |  35 MiB vs 212 MiB (83.491% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.583 s vs 26.869 s (46.087x faster) | 39.926 s vs 69.843 s (1.749x faster) | 18.35 s vs 49.69 s (2.708x faster) |  36 MiB vs 214 MiB (83.178% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.35 s vs 26.667 s (19.753x faster) | 38.567 s vs 70.315 s (1.823x faster) |  18.49 s vs 45.7 s (2.472x faster) |  35 MiB vs 213 MiB (83.568% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | 1.515 s vs 15.324 s (10.115x faster) | 70.928 s vs 82.337 s (1.161x faster) | 55.87 s vs 67.25 s (1.204x faster) |  69 MiB vs 223 MiB (69.058% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.483 s vs 15.216 s (31.503x faster) | 33.326 s vs 49.231 s (1.477x faster) |  18.3 s vs 34.29 s (1.874x faster) |  35 MiB vs 222 MiB (84.234% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.564 s vs 15.344 s (27.206x faster) | 38.792 s vs 54.421 s (1.403x faster) | 18.37 s vs 34.28 s (1.866x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.306 s vs 14.844 s (11.366x faster) |  39.79 s vs 54.325 s (1.365x faster) | 18.43 s vs 34.37 s (1.865x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |                  2 s |              9.429 s |   +7.429 s |   4.715x |    +371.45% |
| Billed duration   |              2.105 s |              9.952 s |   +7.847 s |   4.728x |   +372.779% |
| Init duration     |              0.122 s |              0.522 s |     +0.4 s |   4.279x |   +327.869% |
| Local wall time   |             71.923 s |             77.685 s |   +5.762 s |    1.08x |     +8.011% |
| CDK deploy time   |               55.8 s |              61.87 s |    +6.07 s |   1.109x |    +10.878% |
| Max memory        |              126 MiB |              447 MiB |   +321 MiB |   3.548x |   +254.762% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.239 s |              9.447 s |   +9.208 s |  39.527x |   +3852.72% |
| Billed duration   |              0.366 s |              9.972 s |   +9.606 s |  27.246x |   +2624.59% |
| Init duration     |              0.124 s |              0.574 s |    +0.45 s |   4.629x |   +362.903% |
| Local wall time   |             35.099 s |             43.903 s |   +8.804 s |   1.251x |    +25.083% |
| CDK deploy time   |              18.28 s |              28.96 s |   +10.68 s |   1.584x |    +58.425% |
| Max memory        |               32 MiB |              447 MiB |   +415 MiB |  13.969x |  +1296.875% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.493 s |              9.472 s |   +8.979 s |  19.213x |  +1821.298% |
| Billed duration   |              0.611 s |              10.06 s |   +9.449 s |  16.465x |  +1546.481% |
| Init duration     |              0.122 s |              0.552 s |    +0.43 s |   4.525x |   +352.459% |
| Local wall time   |             38.442 s |             50.504 s |  +12.062 s |   1.314x |    +31.377% |
| CDK deploy time   |              18.51 s |              28.98 s |   +10.47 s |   1.566x |    +56.564% |
| Max memory        |               41 MiB |              447 MiB |   +406 MiB |  10.902x |   +990.244% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.511 s |               8.96 s |   +8.449 s |  17.534x |  +1653.425% |
| Billed duration   |              0.638 s |              9.498 s |    +8.86 s |  14.887x |  +1388.715% |
| Init duration     |              0.119 s |              0.537 s |   +0.418 s |   4.513x |   +351.261% |
| Local wall time   |             40.944 s |             49.825 s |   +8.881 s |   1.217x |    +21.691% |
| CDK deploy time   |              18.47 s |              29.02 s |   +10.55 s |   1.571x |     +57.12% |
| Max memory        |               39 MiB |              416 MiB |   +377 MiB |  10.667x |   +966.667% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.162 s |              5.163 s |   +4.001 s |   4.443x |    +344.32% |
| Billed duration   |              1.289 s |              5.682 s |   +4.393 s |   4.408x |   +340.807% |
| Init duration     |              0.128 s |              0.504 s |   +0.376 s |   3.938x |    +293.75% |
| Local wall time   |             77.189 s |             71.583 s |   -5.606 s |   0.927x |     -7.263% |
| CDK deploy time   |               55.8 s |              56.65 s |    +0.85 s |   1.015x |     +1.523% |
| Max memory        |              193 MiB |              447 MiB |   +254 MiB |   2.316x |   +131.606% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.222 s |              5.171 s |   +4.949 s |  23.293x |  +2229.279% |
| Billed duration   |               0.34 s |              5.683 s |   +5.343 s |  16.715x |  +1571.471% |
| Init duration     |              0.122 s |              0.511 s |   +0.389 s |   4.189x |   +318.852% |
| Local wall time   |             33.359 s |             38.646 s |   +5.287 s |   1.158x |    +15.849% |
| CDK deploy time   |              18.14 s |              23.59 s |    +5.45 s |     1.3x |    +30.044% |
| Max memory        |               32 MiB |              447 MiB |   +415 MiB |  13.969x |  +1296.875% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.419 s |               5.24 s |   +4.821 s |  12.506x |  +1150.597% |
| Billed duration   |               0.53 s |              5.771 s |   +5.241 s |  10.889x |   +988.868% |
| Init duration     |              0.122 s |              0.518 s |   +0.396 s |   4.246x |    +324.59% |
| Local wall time   |             40.057 s |             43.148 s |   +3.091 s |   1.077x |     +7.717% |
| CDK deploy time   |              18.46 s |              23.77 s |    +5.31 s |   1.288x |    +28.765% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.454 s |              4.948 s |   +4.494 s |  10.899x |   +989.868% |
| Billed duration   |              0.577 s |              5.483 s |   +4.906 s |   9.503x |    +850.26% |
| Init duration     |              0.125 s |              0.535 s |    +0.41 s |    4.28x |       +328% |
| Local wall time   |              39.76 s |             44.456 s |   +4.696 s |   1.118x |    +11.811% |
| CDK deploy time   |              18.47 s |              23.77 s |     +5.3 s |   1.287x |    +28.695% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.262 s |              9.866 s |   +8.604 s |   7.818x |   +681.775% |
| Billed duration   |              1.388 s |             10.404 s |   +9.016 s |   7.496x |   +649.568% |
| Init duration     |              0.129 s |               0.56 s |   +0.431 s |   4.341x |   +334.109% |
| Local wall time   |             70.977 s |             79.957 s |    +8.98 s |   1.127x |    +12.652% |
| CDK deploy time   |               55.5 s |              61.74 s |    +6.24 s |   1.112x |    +11.243% |
| Max memory        |              107 MiB |              281 MiB |   +174 MiB |   2.626x |   +162.617% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.28 s |             10.283 s |  +10.003 s |  36.725x |    +3572.5% |
| Billed duration   |              0.398 s |              10.83 s |  +10.432 s |  27.211x |  +2621.106% |
| Init duration     |              0.121 s |               0.54 s |   +0.419 s |   4.463x |   +346.281% |
| Local wall time   |             33.557 s |             44.943 s |  +11.386 s |   1.339x |     +33.93% |
| CDK deploy time   |              18.32 s |              28.91 s |   +10.59 s |   1.578x |    +57.806% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.402 s |              10.35 s |   +9.948 s |  25.746x |  +2474.627% |
| Billed duration   |              0.515 s |             10.867 s |  +10.352 s |  21.101x |  +2010.097% |
| Init duration     |              0.121 s |              0.525 s |   +0.404 s |   4.339x |   +333.884% |
| Local wall time   |             38.957 s |             49.331 s |  +10.374 s |   1.266x |    +26.629% |
| CDK deploy time   |              18.39 s |              28.95 s |   +10.56 s |   1.574x |    +57.423% |
| Max memory        |               37 MiB |              281 MiB |   +244 MiB |   7.595x |   +659.459% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.071 s |             10.179 s |   +9.108 s |   9.504x |    +850.42% |
| Billed duration   |              1.189 s |             10.731 s |   +9.542 s |   9.025x |   +802.523% |
| Init duration     |              0.121 s |              0.547 s |   +0.426 s |   4.521x |   +352.066% |
| Local wall time   |             38.451 s |             62.992 s |  +24.541 s |   1.638x |    +63.824% |
| CDK deploy time   |              18.54 s |              29.12 s |   +10.58 s |   1.571x |    +57.066% |
| Max memory        |               38 MiB |              273 MiB |   +235 MiB |   7.184x |   +618.421% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.827 s |              5.747 s |    +4.92 s |   6.949x |   +594.921% |
| Billed duration   |              0.951 s |               6.27 s |   +5.319 s |   6.593x |   +559.306% |
| Init duration     |              0.126 s |              0.535 s |   +0.409 s |   4.246x |   +324.603% |
| Local wall time   |             70.185 s |             74.439 s |   +4.254 s |   1.061x |     +6.061% |
| CDK deploy time   |              55.75 s |              60.81 s |    +5.06 s |   1.091x |     +9.076% |
| Max memory        |              117 MiB |              283 MiB |   +166 MiB |   2.419x |    +141.88% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.261 s |              5.887 s |   +5.626 s |  22.556x |  +2155.556% |
| Billed duration   |              0.384 s |              6.435 s |   +6.051 s |  16.758x |  +1575.781% |
| Init duration     |              0.122 s |              0.531 s |   +0.409 s |   4.352x |   +335.246% |
| Local wall time   |             33.054 s |             38.515 s |   +5.461 s |   1.165x |    +16.521% |
| CDK deploy time   |              18.18 s |              23.62 s |    +5.44 s |   1.299x |    +29.923% |
| Max memory        |               33 MiB |              282 MiB |   +249 MiB |   8.545x |   +754.545% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.359 s |              5.758 s |   +5.399 s |  16.039x |    +1503.9% |
| Billed duration   |               0.48 s |               6.27 s |    +5.79 s |  13.063x |   +1206.25% |
| Init duration     |              0.121 s |              0.521 s |     +0.4 s |   4.306x |   +330.579% |
| Local wall time   |             39.151 s |             43.873 s |   +4.722 s |   1.121x |    +12.061% |
| CDK deploy time   |              18.37 s |              23.63 s |    +5.26 s |   1.286x |    +28.634% |
| Max memory        |               37 MiB |              282 MiB |   +245 MiB |   7.622x |   +662.162% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.024 s |              5.643 s |   +4.619 s |   5.511x |   +451.074% |
| Billed duration   |              1.144 s |              6.162 s |   +5.018 s |   5.386x |   +438.636% |
| Init duration     |              0.119 s |              0.518 s |   +0.399 s |   4.353x |   +335.294% |
| Local wall time   |             34.409 s |             44.295 s |   +9.886 s |   1.287x |    +28.731% |
| CDK deploy time   |              18.47 s |              23.79 s |    +5.32 s |   1.288x |    +28.803% |
| Max memory        |               37 MiB |              275 MiB |   +238 MiB |   7.432x |   +643.243% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.607 s |             26.425 s |  +23.818 s |  10.136x |   +913.617% |
| Billed duration   |              2.725 s |             26.981 s |  +24.256 s |   9.901x |   +890.128% |
| Init duration     |              0.118 s |              0.515 s |   +0.397 s |   4.364x |   +336.441% |
| Local wall time   |             72.051 s |             97.331 s |   +25.28 s |   1.351x |    +35.086% |
| CDK deploy time   |               55.9 s |              82.57 s |   +26.67 s |   1.477x |     +47.71% |
| Max memory        |               57 MiB |              219 MiB |   +162 MiB |   3.842x |   +284.211% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.468 s |             26.875 s |  +26.407 s |  57.425x |  +5642.521% |
| Billed duration   |              0.593 s |             27.398 s |  +26.805 s |  46.202x |  +4520.236% |
| Init duration     |              0.122 s |              0.522 s |     +0.4 s |   4.279x |   +327.869% |
| Local wall time   |             33.749 s |             62.479 s |   +28.73 s |   1.851x |    +85.128% |
| CDK deploy time   |              18.26 s |              45.44 s |   +27.18 s |   2.488x |    +148.85% |
| Max memory        |               35 MiB |              212 MiB |   +177 MiB |   6.057x |   +505.714% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.583 s |             26.869 s |  +26.286 s |  46.087x |  +4508.748% |
| Billed duration   |              0.701 s |             27.399 s |  +26.698 s |  39.086x |  +3808.559% |
| Init duration     |              0.117 s |              0.515 s |   +0.398 s |   4.402x |   +340.171% |
| Local wall time   |             39.926 s |             69.843 s |  +29.917 s |   1.749x |    +74.931% |
| CDK deploy time   |              18.35 s |              49.69 s |   +31.34 s |   2.708x |    +170.79% |
| Max memory        |               36 MiB |              214 MiB |   +178 MiB |   5.944x |   +494.444% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               1.35 s |             26.667 s |  +25.317 s |  19.753x |  +1875.333% |
| Billed duration   |              1.469 s |             27.239 s |   +25.77 s |  18.543x |  +1754.255% |
| Init duration     |              0.119 s |              0.529 s |    +0.41 s |   4.445x |   +344.538% |
| Local wall time   |             38.567 s |             70.315 s |  +31.748 s |   1.823x |    +82.319% |
| CDK deploy time   |              18.49 s |               45.7 s |   +27.21 s |   2.472x |   +147.161% |
| Max memory        |               35 MiB |              213 MiB |   +178 MiB |   6.086x |   +508.571% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.515 s |             15.324 s |  +13.809 s |  10.115x |   +911.485% |
| Billed duration   |              1.647 s |             15.853 s |  +14.206 s |   9.625x |   +862.538% |
| Init duration     |              0.123 s |              0.517 s |   +0.394 s |   4.203x |   +320.325% |
| Local wall time   |             70.928 s |             82.337 s |  +11.409 s |   1.161x |    +16.085% |
| CDK deploy time   |              55.87 s |              67.25 s |   +11.38 s |   1.204x |    +20.369% |
| Max memory        |               69 MiB |              223 MiB |   +154 MiB |   3.232x |   +223.188% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.483 s |             15.216 s |  +14.733 s |  31.503x |  +3050.311% |
| Billed duration   |              0.604 s |             15.742 s |  +15.138 s |  26.063x |  +2506.291% |
| Init duration     |              0.122 s |              0.526 s |   +0.404 s |   4.311x |   +331.148% |
| Local wall time   |             33.326 s |             49.231 s |  +15.905 s |   1.477x |    +47.725% |
| CDK deploy time   |               18.3 s |              34.29 s |   +15.99 s |   1.874x |    +87.377% |
| Max memory        |               35 MiB |              222 MiB |   +187 MiB |   6.343x |   +534.286% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.564 s |             15.344 s |   +14.78 s |  27.206x |  +2620.567% |
| Billed duration   |              0.692 s |             15.881 s |  +15.189 s |  22.949x |  +2194.942% |
| Init duration     |              0.125 s |              0.524 s |   +0.399 s |   4.192x |     +319.2% |
| Local wall time   |             38.792 s |             54.421 s |  +15.629 s |   1.403x |    +40.289% |
| CDK deploy time   |              18.37 s |              34.28 s |   +15.91 s |   1.866x |    +86.609% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.306 s |             14.844 s |  +13.538 s |  11.366x |    +1036.6% |
| Billed duration   |              1.402 s |             15.366 s |  +13.964 s |   10.96x |   +996.006% |
| Init duration     |              0.118 s |              0.522 s |   +0.404 s |   4.424x |   +342.373% |
| Local wall time   |              39.79 s |             54.325 s |  +14.535 s |   1.365x |    +36.529% |
| CDK deploy time   |              18.43 s |              34.37 s |   +15.94 s |   1.865x |    +86.489% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.429 |  9.228 |   9.57 |   0.342 |   9.153 |   9.598 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.447 |  9.394 |  9.491 |   0.097 |   9.135 |   9.767 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.472 |  9.394 |  9.612 |   0.218 |   9.211 |   9.779 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       8.96 |  8.909 |  9.351 |   0.442 |   8.907 |   9.832 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          2 |  1.967 |  2.011 |   0.044 |   1.892 |   2.126 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.239 |  0.237 |  0.241 |   0.004 |   0.236 |   0.298 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.493 |  0.452 |  0.525 |   0.073 |   0.427 |   0.528 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.511 |  0.501 |  0.522 |   0.021 |   0.479 |   0.638 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.163 |  5.152 |  5.182 |    0.03 |   4.988 |   6.238 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.171 |  5.099 |   5.21 |   0.111 |   5.076 |   5.287 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.24 |  5.133 |  5.247 |   0.114 |    5.12 |   5.253 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.948 |  4.834 |  5.015 |   0.181 |   4.453 |   5.125 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.162 |  1.133 |  1.185 |   0.052 |   1.121 |    1.22 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.222 |  0.215 |  0.227 |   0.012 |   0.203 |   0.253 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.419 |  0.412 |  0.454 |   0.042 |   0.381 |   0.496 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.454 |  0.447 |  0.459 |   0.012 |   0.431 |   0.477 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.866 |  9.805 | 10.109 |   0.304 |   9.742 |  10.144 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.283 | 10.123 | 10.604 |   0.481 |   9.994 |  10.637 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      10.35 |   9.97 | 10.355 |   0.385 |   9.833 |   10.52 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.179 | 10.144 | 10.209 |   0.065 |   9.938 |  10.237 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.262 |  1.261 |  1.373 |   0.112 |   1.244 |   1.436 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.28 |  0.276 |  0.281 |   0.005 |   0.274 |   0.296 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.402 |  0.388 |  0.405 |   0.017 |   0.386 |   0.526 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.071 |  1.064 |  1.108 |   0.044 |   1.051 |    1.16 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.747 |  5.691 |  5.763 |   0.072 |   5.634 |   5.876 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.887 |  5.806 |  5.903 |   0.097 |   5.751 |   5.984 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.758 |    5.7 |  5.947 |   0.247 |   5.685 |   6.018 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.643 |  5.474 |  5.649 |   0.175 |   5.419 |   5.704 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.827 |  0.802 |  0.875 |   0.073 |   0.634 |   0.973 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.261 |  0.247 |  0.274 |   0.027 |   0.234 |   0.328 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.359 |  0.353 |  0.362 |   0.009 |   0.331 |   0.368 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.024 |  1.022 |  1.078 |   0.056 |   0.993 |   1.135 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     26.425 | 25.222 | 27.403 |   2.181 |   24.44 |  31.254 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.875 | 26.632 | 27.124 |   0.492 |  26.348 |  27.706 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.869 | 26.675 | 27.506 |   0.831 |  26.275 |  32.274 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.667 |  26.18 | 27.301 |   1.121 |  22.213 |  27.509 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.607 |  2.534 |  2.615 |   0.081 |   2.492 |   2.641 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.468 |  0.463 |  0.505 |   0.042 |    0.46 |   0.531 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.583 |  0.578 |  0.606 |   0.028 |   0.568 |    0.71 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |       1.35 |  1.323 |  1.381 |   0.058 |   1.295 |   1.407 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.324 | 14.787 | 15.354 |   0.567 |    14.7 |  16.348 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.216 | 15.172 | 15.436 |   0.264 |  15.153 |  15.798 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.344 | 15.338 | 15.488 |    0.15 |  15.191 |  15.568 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.844 | 14.571 | 15.055 |   0.484 |  14.289 |  15.103 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.515 |  1.507 |  1.539 |   0.032 |   1.461 |    1.55 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.483 |   0.48 |  0.488 |   0.008 |   0.472 |   0.508 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.564 |  0.563 |  0.579 |   0.016 |   0.555 |   0.606 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.306 |  1.229 |  1.368 |   0.139 |   1.215 |   1.382 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.429 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.447 s
large-few changed-update 1024//adaptive aws      | ########### 9.472 s
large-few pruned-update 1024//adaptive aws       | ########## 8.96 s
large-few cold-create 1024/32/adaptive shin      | ## 2 s
large-few unchanged-update 1024/32/adaptive shin | # 0.239 s
large-few changed-update 1024/32/adaptive shin   | # 0.493 s
large-few pruned-update 1024/32/adaptive shin    | # 0.511 s
large-few cold-create 2048//adaptive aws         | ###### 5.163 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.171 s
large-few changed-update 2048//adaptive aws      | ###### 5.24 s
large-few pruned-update 2048//adaptive aws       | ###### 4.948 s
large-few cold-create 2048/64/adaptive shin      | # 1.162 s
large-few unchanged-update 2048/64/adaptive shin | # 0.222 s
large-few changed-update 2048/64/adaptive shin   | # 0.419 s
large-few pruned-update 2048/64/adaptive shin    | # 0.454 s
mixed cold-create 1024//adaptive aws             | ########### 9.866 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.283 s
mixed changed-update 1024//adaptive aws          | ############ 10.35 s
mixed pruned-update 1024//adaptive aws           | ########### 10.179 s
mixed cold-create 1024/32/adaptive shin          | # 1.262 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.28 s
mixed changed-update 1024/32/adaptive shin       | # 0.402 s
mixed pruned-update 1024/32/adaptive shin        | # 1.071 s
mixed cold-create 2048//adaptive aws             | ###### 5.747 s
mixed unchanged-update 2048//adaptive aws        | ####### 5.887 s
mixed changed-update 2048//adaptive aws          | ###### 5.758 s
mixed pruned-update 2048//adaptive aws           | ###### 5.643 s
mixed cold-create 2048/64/adaptive shin          | # 0.827 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.261 s
mixed changed-update 2048/64/adaptive shin       | # 0.359 s
mixed pruned-update 2048/64/adaptive shin        | # 1.024 s
tiny-many cold-create 1024//adaptive aws         | ############################# 26.425 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 26.875 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.869 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 26.667 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.607 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.468 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.583 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.35 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.324 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.216 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.344 s
tiny-many pruned-update 2048//adaptive aws       | ################# 14.844 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.515 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.483 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.564 s
tiny-many pruned-update 2048/64/adaptive shin    | # 1.306 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.952 |  9.743 | 10.136 |   0.393 |   9.666 |  10.143 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.972 |  9.968 | 10.065 |   0.097 |   9.624 |  10.356 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      10.06 |  9.926 | 10.171 |   0.245 |   9.729 |  10.332 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.498 |  9.478 |  9.912 |   0.434 |   9.416 |  10.297 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.105 |  2.089 |  2.134 |   0.045 |   2.014 |   2.249 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.366 |  0.362 |  0.373 |   0.011 |   0.332 |   0.419 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.611 |  0.579 |  0.647 |   0.068 |    0.55 |    0.66 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.638 |  0.598 |  0.654 |   0.056 |   0.597 |   0.756 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.682 |  5.671 |  5.904 |   0.233 |   5.493 |    6.69 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.683 |  5.607 |   5.73 |   0.123 |   5.582 |   5.815 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.771 |   5.65 |  5.791 |   0.141 |    5.62 |   5.797 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.483 |  5.342 |  5.567 |   0.225 |   4.982 |   5.672 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.289 |  1.253 |  1.317 |   0.064 |    1.25 |   1.348 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.34 |  0.338 |   0.35 |   0.012 |   0.325 |   0.378 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.53 |  0.516 |  0.576 |    0.06 |   0.513 |   0.622 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.577 |  0.576 |  0.588 |   0.012 |   0.554 |   0.603 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.404 | 10.366 | 10.722 |   0.356 |  10.274 |  10.737 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      10.83 | 10.664 | 11.162 |   0.498 |  10.531 |  11.164 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.867 | 10.499 | 10.875 |   0.376 |  10.308 |  11.083 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.731 |  10.73 | 10.758 |   0.028 |  10.686 |  10.784 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.388 |  1.385 |  1.524 |   0.139 |   1.374 |   1.566 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.398 |  0.392 |  0.406 |   0.014 |   0.373 |   0.424 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.515 |   0.51 |  0.526 |   0.016 |   0.498 |   0.645 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.189 |  1.189 |  1.229 |    0.04 |   1.171 |   1.291 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       6.27 |  6.233 |  6.299 |   0.066 |   6.166 |   6.411 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.435 |  6.321 |  6.456 |   0.135 |   6.266 |   6.545 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       6.27 |  6.207 |  6.502 |   0.295 |   6.199 |   6.549 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.162 |  5.981 |  6.168 |   0.187 |   5.919 |   6.249 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.951 |  0.931 |  1.001 |    0.07 |   0.735 |   1.127 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.384 |  0.368 |  0.397 |   0.029 |   0.355 |   0.476 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.48 |  0.475 |  0.483 |   0.008 |   0.429 |   0.489 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.144 |  1.141 |  1.217 |   0.076 |   1.092 |   1.256 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     26.981 | 25.731 | 27.951 |    2.22 |  24.956 |   31.71 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     27.398 | 27.145 | 27.735 |    0.59 |  26.876 |  28.223 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.399 | 27.191 | 28.051 |    0.86 |   26.78 |  32.705 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     27.239 |   26.7 |  27.83 |    1.13 |  22.684 |  28.051 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.725 |   2.66 |  2.733 |   0.073 |   2.589 |   2.807 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.593 |  0.587 |  0.604 |   0.017 |   0.567 |   0.653 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.701 |    0.7 |  0.703 |   0.003 |   0.694 |   0.808 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.469 |  1.446 |  1.475 |   0.029 |   1.417 |   1.526 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.853 | 15.304 |   15.9 |   0.596 |  15.214 |  16.778 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.742 | 15.686 |  15.98 |   0.294 |  15.674 |  16.367 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.881 | 15.863 | 16.003 |    0.14 |  15.714 |  16.145 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.366 | 15.088 | 15.598 |    0.51 |  14.799 |  15.652 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.647 |  1.631 |  1.658 |   0.027 |   1.583 |   1.674 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.604 |  0.594 |  0.631 |   0.037 |    0.58 |   0.636 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.692 |  0.685 |  0.704 |   0.019 |   0.683 |    0.73 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.402 |  1.356 |  1.489 |   0.133 |   1.314 |   1.501 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.952 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.972 s
large-few changed-update 1024//adaptive aws      | ########### 10.06 s
large-few pruned-update 1024//adaptive aws       | ########## 9.498 s
large-few cold-create 1024/32/adaptive shin      | ## 2.105 s
large-few unchanged-update 1024/32/adaptive shin | # 0.366 s
large-few changed-update 1024/32/adaptive shin   | # 0.611 s
large-few pruned-update 1024/32/adaptive shin    | # 0.638 s
large-few cold-create 2048//adaptive aws         | ###### 5.682 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.683 s
large-few changed-update 2048//adaptive aws      | ###### 5.771 s
large-few pruned-update 2048//adaptive aws       | ###### 5.483 s
large-few cold-create 2048/64/adaptive shin      | # 1.289 s
large-few unchanged-update 2048/64/adaptive shin | # 0.34 s
large-few changed-update 2048/64/adaptive shin   | # 0.53 s
large-few pruned-update 2048/64/adaptive shin    | # 0.577 s
mixed cold-create 1024//adaptive aws             | ########### 10.404 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.83 s
mixed changed-update 1024//adaptive aws          | ############ 10.867 s
mixed pruned-update 1024//adaptive aws           | ############ 10.731 s
mixed cold-create 1024/32/adaptive shin          | ## 1.388 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.398 s
mixed changed-update 1024/32/adaptive shin       | # 0.515 s
mixed pruned-update 1024/32/adaptive shin        | # 1.189 s
mixed cold-create 2048//adaptive aws             | ####### 6.27 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.435 s
mixed changed-update 2048//adaptive aws          | ####### 6.27 s
mixed pruned-update 2048//adaptive aws           | ####### 6.162 s
mixed cold-create 2048/64/adaptive shin          | # 0.951 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.384 s
mixed changed-update 2048/64/adaptive shin       | # 0.48 s
mixed pruned-update 2048/64/adaptive shin        | # 1.144 s
tiny-many cold-create 1024//adaptive aws         | ############################## 26.981 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 27.398 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.399 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 27.239 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.725 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.593 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.701 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.469 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.853 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.742 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.881 s
tiny-many pruned-update 2048//adaptive aws       | ################# 15.366 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.647 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.604 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.692 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.402 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.522 |  0.515 |  0.544 |   0.029 |   0.512 |   0.565 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.574 |   0.52 |  0.578 |   0.058 |   0.489 |   0.588 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.552 |  0.531 |  0.559 |   0.028 |   0.518 |   0.587 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.537 |  0.508 |  0.561 |   0.053 |   0.465 |   0.569 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.121 |  0.123 |   0.002 |   0.094 |   0.134 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.124 |  0.121 |  0.126 |   0.005 |   0.096 |   0.132 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.122 |  0.127 |   0.005 |   0.118 |   0.132 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.117 |  0.126 |   0.009 |   0.095 |   0.132 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.504 |    0.5 |  0.518 |   0.018 |   0.452 |   0.741 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.511 |  0.507 |   0.52 |   0.013 |   0.506 |   0.527 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.518 |  0.516 |  0.543 |   0.027 |     0.5 |   0.556 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.535 |  0.528 |  0.547 |   0.019 |   0.507 |   0.552 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.128 |  0.126 |  0.128 |   0.002 |    0.12 |   0.131 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.122 |  0.123 |   0.001 |   0.118 |   0.125 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.118 |  0.125 |   0.007 |   0.096 |   0.132 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.125 |  0.122 |  0.128 |   0.006 |   0.121 |   0.129 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |       0.56 |  0.537 |  0.577 |    0.04 |   0.531 |   0.627 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       0.54 |  0.537 |  0.546 |   0.009 |   0.525 |    0.56 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.525 |  0.512 |  0.529 |   0.017 |   0.475 |   0.563 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.547 |  0.541 |  0.551 |    0.01 |   0.521 |   0.819 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.129 |  0.126 |  0.129 |   0.003 |   0.123 |   0.151 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.117 |  0.124 |   0.007 |   0.093 |   0.128 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.122 |   0.003 |   0.095 |   0.129 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.124 |   0.005 |   0.118 |    0.13 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.535 |  0.531 |  0.536 |   0.005 |   0.523 |   0.542 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.531 |  0.514 |  0.561 |   0.047 |   0.514 |   0.568 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.512 |  0.531 |   0.019 |   0.498 |   0.554 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.518 |  0.506 |  0.519 |   0.013 |     0.5 |   0.544 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.126 |  0.124 |  0.129 |   0.005 |   0.101 |   0.154 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.121 |  0.123 |   0.002 |    0.12 |   0.148 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.121 |  0.121 |       0 |   0.097 |   0.121 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |   0.12 |   0.002 |   0.099 |   0.138 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.509 |  0.547 |   0.038 |   0.456 |   0.556 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.522 |  0.516 |  0.527 |   0.011 |   0.513 |   0.611 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.515 |  0.505 |  0.529 |   0.024 |   0.431 |   0.544 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.529 |  0.519 |  0.541 |   0.022 |    0.47 |   0.572 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.125 |   0.008 |   0.096 |   0.165 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.099 |  0.126 |   0.027 |   0.098 |   0.129 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.097 |  0.122 |   0.025 |   0.097 |   0.125 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.121 |   0.003 |   0.093 |   0.122 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.517 |  0.514 |  0.528 |   0.014 |   0.429 |   0.546 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.526 |  0.521 |  0.544 |   0.023 |   0.514 |   0.569 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.524 |  0.523 |  0.537 |   0.014 |   0.514 |   0.576 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.522 |  0.516 |  0.543 |   0.027 |   0.509 |   0.548 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.123 |  0.121 |  0.124 |   0.003 |   0.119 |   0.131 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |  0.121 |  0.122 |   0.001 |     0.1 |   0.148 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.125 |  0.123 |  0.127 |   0.004 |    0.12 |   0.129 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.098 |  0.121 |   0.023 |   0.095 |   0.126 |

```text
large-few cold-create 1024//adaptive aws         | ########################### 0.522 s
large-few unchanged-update 1024//adaptive aws    | ############################## 0.574 s
large-few changed-update 1024//adaptive aws      | ############################# 0.552 s
large-few pruned-update 1024//adaptive aws       | ############################ 0.537 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.122 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.124 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.122 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.119 s
large-few cold-create 2048//adaptive aws         | ########################## 0.504 s
large-few unchanged-update 2048//adaptive aws    | ########################### 0.511 s
large-few changed-update 2048//adaptive aws      | ########################### 0.518 s
large-few pruned-update 2048//adaptive aws       | ############################ 0.535 s
large-few cold-create 2048/64/adaptive shin      | ####### 0.128 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.122 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.122 s
large-few pruned-update 2048/64/adaptive shin    | ####### 0.125 s
mixed cold-create 1024//adaptive aws             | ############################# 0.56 s
mixed unchanged-update 1024//adaptive aws        | ############################ 0.54 s
mixed changed-update 1024//adaptive aws          | ########################### 0.525 s
mixed pruned-update 1024//adaptive aws           | ############################# 0.547 s
mixed cold-create 1024/32/adaptive shin          | ####### 0.129 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.121 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.121 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.121 s
mixed cold-create 2048//adaptive aws             | ############################ 0.535 s
mixed unchanged-update 2048//adaptive aws        | ############################ 0.531 s
mixed changed-update 2048//adaptive aws          | ########################### 0.521 s
mixed pruned-update 2048//adaptive aws           | ########################### 0.518 s
mixed cold-create 2048/64/adaptive shin          | ####### 0.126 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.122 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.121 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.119 s
tiny-many cold-create 1024//adaptive aws         | ########################### 0.515 s
tiny-many unchanged-update 1024//adaptive aws    | ########################### 0.522 s
tiny-many changed-update 1024//adaptive aws      | ########################### 0.515 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 0.529 s
tiny-many cold-create 1024/32/adaptive shin      | ###### 0.118 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.122 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.117 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.119 s
tiny-many cold-create 2048//adaptive aws         | ########################### 0.517 s
tiny-many unchanged-update 2048//adaptive aws    | ########################### 0.526 s
tiny-many changed-update 2048//adaptive aws      | ########################### 0.524 s
tiny-many pruned-update 2048//adaptive aws       | ########################### 0.522 s
tiny-many cold-create 2048/64/adaptive shin      | ###### 0.123 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.122 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 0.125 s
tiny-many pruned-update 2048/64/adaptive shin    | ###### 0.118 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     77.685 | 76.998 |   83.6 |   6.602 |  75.067 |  83.745 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.903 | 43.074 | 48.648 |   5.574 |  42.878 |  58.918 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     50.504 | 49.707 | 60.252 |  10.545 |   48.61 |  68.174 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     49.825 | 49.079 | 50.518 |   1.439 |  43.457 |  50.887 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     71.923 | 71.352 | 72.445 |   1.093 |  69.677 |  72.604 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     35.099 | 34.274 | 35.172 |   0.898 |  34.157 |  37.709 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.442 | 34.899 | 40.835 |   5.936 |  33.089 |  42.507 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     40.944 | 39.079 | 41.174 |   2.095 |  33.753 |  41.332 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     71.583 |  71.33 | 73.943 |   2.613 |  69.474 |  75.477 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     38.646 |  37.74 | 39.054 |   1.314 |  37.619 |   39.93 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     43.148 | 42.951 | 44.313 |   1.362 |  39.809 |  45.332 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     44.456 | 43.641 | 45.236 |   1.595 |  43.181 |  45.397 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     77.189 | 70.865 | 84.576 |  13.711 |   69.59 |  87.596 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     33.359 | 32.914 | 35.863 |   2.949 |  32.912 |  36.512 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     40.057 | 39.626 | 42.666 |    3.04 |  33.333 |  43.518 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      39.76 | 38.203 | 40.348 |   2.145 |  38.143 |  40.464 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     79.957 | 78.103 | 81.392 |   3.289 |  75.629 |  81.442 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     44.943 | 44.545 | 44.966 |   0.421 |  42.635 |  48.206 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     49.331 | 48.602 | 50.234 |   1.632 |  48.189 |  50.868 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     62.992 | 50.005 | 68.392 |  18.387 |  43.029 |  69.506 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.977 | 70.257 | 71.632 |   1.375 |  66.903 |  72.471 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.557 | 33.007 | 35.081 |   2.074 |  32.277 |  39.078 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.957 | 38.034 | 39.146 |   1.112 |  38.026 |  39.773 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.451 | 38.287 | 39.259 |   0.972 |  34.488 |  40.018 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     74.439 | 71.881 | 75.431 |    3.55 |  71.554 |  76.474 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     38.515 | 37.501 | 38.932 |   1.431 |  37.146 |  41.197 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     43.873 | 43.846 | 44.422 |   0.576 |  43.126 |  44.898 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     44.295 | 43.208 | 45.113 |   1.905 |  43.018 |  45.424 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.185 |  69.14 |  71.21 |    2.07 |  69.039 |  77.526 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     33.054 | 33.003 | 33.311 |   0.308 |  32.854 |   33.94 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     39.151 | 38.342 | 39.273 |   0.931 |  38.093 |  39.814 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     34.409 | 34.018 |  37.84 |   3.822 |  33.582 |  38.444 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     97.331 | 95.778 | 97.861 |   2.083 |  90.527 |  103.64 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     62.479 | 60.356 | 64.321 |   3.965 |  58.456 |  72.761 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     69.843 | 66.161 | 71.939 |   5.778 |  65.818 |  82.975 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     70.315 |  69.08 | 76.309 |   7.229 |   66.88 |  78.123 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     72.051 | 70.928 | 72.569 |   1.641 |  70.849 |  73.199 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.749 | 33.308 | 34.222 |   0.914 |  32.463 |  38.258 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     39.926 | 38.289 | 40.445 |   2.156 |  38.226 |  40.509 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     38.567 | 38.424 |  39.76 |   1.336 |  35.765 |  41.811 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     82.337 | 81.922 | 85.407 |   3.485 |   80.35 |  86.584 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     49.231 | 48.995 | 53.889 |   4.894 |  48.365 |  56.164 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     54.421 | 54.356 | 55.702 |   1.346 |  49.833 |  56.126 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     54.325 | 50.261 | 55.569 |   5.308 |   48.71 |  56.145 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     70.928 | 70.909 |  71.53 |   0.621 |  70.076 |  71.935 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     33.326 | 32.707 | 33.494 |   0.787 |  32.251 |  34.732 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.792 | 38.746 | 39.457 |   0.711 |  34.192 |  40.601 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      39.79 | 39.058 | 40.332 |   1.274 |  38.743 |    41.4 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 77.685 s
large-few unchanged-update 1024//adaptive aws    | ############## 43.903 s
large-few changed-update 1024//adaptive aws      | ################ 50.504 s
large-few pruned-update 1024//adaptive aws       | ############### 49.825 s
large-few cold-create 1024/32/adaptive shin      | ###################### 71.923 s
large-few unchanged-update 1024/32/adaptive shin | ########### 35.099 s
large-few changed-update 1024/32/adaptive shin   | ############ 38.442 s
large-few pruned-update 1024/32/adaptive shin    | ############# 40.944 s
large-few cold-create 2048//adaptive aws         | ###################### 71.583 s
large-few unchanged-update 2048//adaptive aws    | ############ 38.646 s
large-few changed-update 2048//adaptive aws      | ############# 43.148 s
large-few pruned-update 2048//adaptive aws       | ############## 44.456 s
large-few cold-create 2048/64/adaptive shin      | ######################## 77.189 s
large-few unchanged-update 2048/64/adaptive shin | ########## 33.359 s
large-few changed-update 2048/64/adaptive shin   | ############ 40.057 s
large-few pruned-update 2048/64/adaptive shin    | ############ 39.76 s
mixed cold-create 1024//adaptive aws             | ######################### 79.957 s
mixed unchanged-update 1024//adaptive aws        | ############## 44.943 s
mixed changed-update 1024//adaptive aws          | ############### 49.331 s
mixed pruned-update 1024//adaptive aws           | ################### 62.992 s
mixed cold-create 1024/32/adaptive shin          | ###################### 70.977 s
mixed unchanged-update 1024/32/adaptive shin     | ########## 33.557 s
mixed changed-update 1024/32/adaptive shin       | ############ 38.957 s
mixed pruned-update 1024/32/adaptive shin        | ############ 38.451 s
mixed cold-create 2048//adaptive aws             | ####################### 74.439 s
mixed unchanged-update 2048//adaptive aws        | ############ 38.515 s
mixed changed-update 2048//adaptive aws          | ############## 43.873 s
mixed pruned-update 2048//adaptive aws           | ############## 44.295 s
mixed cold-create 2048/64/adaptive shin          | ###################### 70.185 s
mixed unchanged-update 2048/64/adaptive shin     | ########## 33.054 s
mixed changed-update 2048/64/adaptive shin       | ############ 39.151 s
mixed pruned-update 2048/64/adaptive shin        | ########### 34.409 s
tiny-many cold-create 1024//adaptive aws         | ############################## 97.331 s
tiny-many unchanged-update 1024//adaptive aws    | ################### 62.479 s
tiny-many changed-update 1024//adaptive aws      | ###################### 69.843 s
tiny-many pruned-update 1024//adaptive aws       | ###################### 70.315 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 72.051 s
tiny-many unchanged-update 1024/32/adaptive shin | ########## 33.749 s
tiny-many changed-update 1024/32/adaptive shin   | ############ 39.926 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 38.567 s
tiny-many cold-create 2048//adaptive aws         | ######################### 82.337 s
tiny-many unchanged-update 2048//adaptive aws    | ############### 49.231 s
tiny-many changed-update 2048//adaptive aws      | ################# 54.421 s
tiny-many pruned-update 2048//adaptive aws       | ################# 54.325 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 70.928 s
tiny-many unchanged-update 2048/64/adaptive shin | ########## 33.326 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 38.792 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 39.79 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.87 |  61.68 |  65.97 |    4.29 |   60.58 |   66.46 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.96 |  28.67 |  29.18 |    0.51 |   28.58 |   29.22 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.98 |   28.5 |  29.23 |    0.73 |   28.49 |   29.57 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.02 |  28.71 |  29.32 |    0.61 |   28.61 |   29.42 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       55.8 |  55.65 |  56.36 |    0.71 |    55.1 |    56.4 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.28 |  17.89 |  18.51 |    0.62 |   17.84 |   18.61 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.51 |  17.96 |  18.66 |     0.7 |   17.88 |   18.75 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.47 |  18.07 |   18.8 |    0.73 |      18 |   18.81 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      56.65 |  56.38 |  60.36 |    3.98 |   55.28 |   61.16 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.59 |  23.34 |  23.98 |    0.64 |   23.27 |   24.07 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.77 |  23.29 |  23.94 |    0.65 |   23.27 |   24.05 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.77 |  23.31 |  23.96 |    0.65 |   23.29 |   24.11 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       55.8 |  55.16 |  56.22 |    1.06 |   55.08 |    56.4 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.14 |  17.94 |  18.48 |    0.54 |   17.92 |   18.59 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.46 |  18.19 |  18.62 |    0.43 |   17.94 |   18.68 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.47 |  18.03 |  18.71 |    0.68 |   18.02 |   18.84 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.74 |   61.6 |  65.77 |    4.17 |   60.92 |   66.42 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.91 |  28.53 |  29.18 |    0.65 |   28.52 |   29.34 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.95 |   28.6 |  29.38 |    0.78 |   28.44 |   29.39 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.12 |  28.73 |  29.42 |    0.69 |   28.55 |   29.44 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       55.5 |  55.14 |  55.76 |    0.62 |   50.99 |   56.36 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.32 |   17.9 |  18.52 |    0.62 |    17.9 |   18.64 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.39 |  17.93 |  18.66 |    0.73 |   17.92 |   18.67 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.54 |  18.08 |   18.7 |    0.62 |   18.03 |    18.8 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      60.81 |  56.46 |  60.94 |    4.48 |   56.29 |   61.21 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.62 |  23.24 |   23.8 |    0.56 |   23.15 |   23.97 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.63 |  23.24 |  23.81 |    0.57 |   23.18 |   23.98 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.79 |  23.39 |  24.01 |    0.62 |   23.26 |   24.31 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.75 |  55.11 |  56.38 |    1.27 |   55.09 |   56.41 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.18 |  18.06 |  18.47 |    0.41 |   17.92 |   18.52 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.37 |  18.04 |  18.66 |    0.62 |   17.94 |    18.7 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.47 |  18.09 |  18.73 |    0.64 |   18.05 |   18.78 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      82.57 |  81.63 |  83.22 |    1.59 |   76.41 |   88.39 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      45.44 |  44.41 |  45.48 |    1.07 |   44.39 |   50.77 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      49.69 |  45.39 |  50.27 |    4.88 |   44.52 |   50.94 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       45.7 |  44.42 |  50.46 |    6.04 |   39.82 |   50.75 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       55.9 |  55.79 |  56.18 |    0.39 |    55.7 |   56.73 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.26 |  17.93 |   18.4 |    0.47 |   17.85 |   18.55 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.35 |     18 |   18.6 |     0.6 |   17.97 |   18.61 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.49 |  18.18 |   18.7 |    0.52 |   18.05 |   18.92 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      67.25 |  67.06 |  71.17 |    4.11 |   66.26 |    71.8 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      34.29 |  34.25 |  34.51 |    0.26 |   34.17 |   34.62 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.28 |  34.24 |  34.64 |     0.4 |   34.18 |      35 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      34.37 |  34.02 |  34.66 |    0.64 |   33.92 |   34.87 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.87 |  55.69 |  56.21 |    0.52 |   55.07 |    56.4 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       18.3 |  17.94 |  18.44 |     0.5 |   17.94 |   18.66 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.37 |     18 |  18.65 |    0.65 |   17.99 |   18.66 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.43 |  18.12 |  18.86 |    0.74 |   18.02 |   18.93 |

```text
large-few cold-create 1024//adaptive aws         | ###################### 61.87 s
large-few unchanged-update 1024//adaptive aws    | ########### 28.96 s
large-few changed-update 1024//adaptive aws      | ########### 28.98 s
large-few pruned-update 1024//adaptive aws       | ########### 29.02 s
large-few cold-create 1024/32/adaptive shin      | #################### 55.8 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.28 s
large-few changed-update 1024/32/adaptive shin   | ####### 18.51 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.47 s
large-few cold-create 2048//adaptive aws         | ##################### 56.65 s
large-few unchanged-update 2048//adaptive aws    | ######### 23.59 s
large-few changed-update 2048//adaptive aws      | ######### 23.77 s
large-few pruned-update 2048//adaptive aws       | ######### 23.77 s
large-few cold-create 2048/64/adaptive shin      | #################### 55.8 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.14 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.46 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.47 s
mixed cold-create 1024//adaptive aws             | ###################### 61.74 s
mixed unchanged-update 1024//adaptive aws        | ########### 28.91 s
mixed changed-update 1024//adaptive aws          | ########### 28.95 s
mixed pruned-update 1024//adaptive aws           | ########### 29.12 s
mixed cold-create 1024/32/adaptive shin          | #################### 55.5 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.32 s
mixed changed-update 1024/32/adaptive shin       | ####### 18.39 s
mixed pruned-update 1024/32/adaptive shin        | ####### 18.54 s
mixed cold-create 2048//adaptive aws             | ###################### 60.81 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.62 s
mixed changed-update 2048//adaptive aws          | ######### 23.63 s
mixed pruned-update 2048//adaptive aws           | ######### 23.79 s
mixed cold-create 2048/64/adaptive shin          | #################### 55.75 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.18 s
mixed changed-update 2048/64/adaptive shin       | ####### 18.37 s
mixed pruned-update 2048/64/adaptive shin        | ####### 18.47 s
tiny-many cold-create 1024//adaptive aws         | ############################## 82.57 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 45.44 s
tiny-many changed-update 1024//adaptive aws      | ################## 49.69 s
tiny-many pruned-update 1024//adaptive aws       | ################# 45.7 s
tiny-many cold-create 1024/32/adaptive shin      | #################### 55.9 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.26 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 18.35 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.49 s
tiny-many cold-create 2048//adaptive aws         | ######################## 67.25 s
tiny-many unchanged-update 2048//adaptive aws    | ############ 34.29 s
tiny-many changed-update 2048//adaptive aws      | ############ 34.28 s
tiny-many pruned-update 2048//adaptive aws       | ############ 34.37 s
tiny-many cold-create 2048/64/adaptive shin      | #################### 55.87 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.3 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.37 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.43 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          416 |      416 |      416 |         0 |       415 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          126 |      116 |      128 |        12 |       101 |       142 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        32 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           41 |       41 |       43 |         2 |        40 |        43 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        42 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       413 |       418 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          193 |      180 |      202 |        22 |       173 |       207 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        32 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        40 |        40 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        39 |        43 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      282 |         1 |       280 |       282 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       280 |       281 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       280 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       272 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          107 |      102 |      111 |         9 |       101 |       111 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        34 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       36 |       38 |         2 |        36 |        39 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           38 |       38 |       38 |         0 |        37 |        39 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       281 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       281 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       282 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      275 |      275 |         0 |       274 |       276 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          117 |      111 |      123 |        12 |       105 |       133 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       36 |       38 |         2 |        36 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       36 |       37 |         1 |        36 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       219 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          212 |      211 |      214 |         3 |       210 |       215 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          214 |      213 |      217 |         4 |       212 |       223 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          213 |      211 |      216 |         5 |       207 |       220 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           57 |       57 |       57 |         0 |        54 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        35 |        37 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       36 |         1 |        35 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      223 |         0 |       222 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       222 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       221 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       219 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           69 |       67 |       71 |         4 |        65 |        73 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        38 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        37 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 416 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 126 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 32 MiB
large-few changed-update 1024/32/adaptive shin   | ### 41 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 39 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 193 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 32 MiB
large-few changed-update 2048/64/adaptive shin   | ### 40 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 40 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 281 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 107 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ### 38 MiB
mixed cold-create 2048//adaptive aws             | ################### 283 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 282 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 117 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 212 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 214 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 213 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 57 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 35 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 222 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 222 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 69 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
