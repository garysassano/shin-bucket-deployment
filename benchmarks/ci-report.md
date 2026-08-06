# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-08-06
- Run ID: e654d1fe-261d-4700-95af-0a7518520e5a
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: shin, aws
- Asset profiles: mixed, tiny-many, large-few
- Memory MiB: 1024, 2048
- Max concurrency: 32, 64
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes |                    Provider duration |                      Local wall time |                    CDK deploy time |                         Max memory |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -----------------------------------: | -----------------------------------: | ---------------------------------: | ---------------------------------: |
| large-few     | cold-create      |       1024 |              32 |            adaptive |    2.562 s vs 8.99 s (3.509x faster) | 68.923 s vs 78.966 s (1.146x faster) | 55.37 s vs 60.67 s (1.096x faster) | 109 MiB vs 447 MiB (75.615% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.312 s vs 9.238 s (29.609x faster) | 32.827 s vs 41.771 s (1.272x faster) | 17.88 s vs 28.62 s (1.601x faster) |  32 MiB vs 447 MiB (92.841% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.616 s vs 9.244 s (15.006x faster) | 37.082 s vs 47.249 s (1.274x faster) | 17.92 s vs 28.58 s (1.595x faster) |  39 MiB vs 447 MiB (91.275% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.694 s vs 8.468 s (12.202x faster) | 37.683 s vs 47.362 s (1.257x faster) |  18.12 s vs 28.7 s (1.584x faster) |  39 MiB vs 417 MiB (90.647% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.217 s vs 5.058 s (4.156x faster) | 68.861 s vs 68.019 s (1.012x slower) | 55.41 s vs 55.24 s (1.003x slower) | 187 MiB vs 447 MiB (58.166% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |   0.251 s vs 4.98 s (19.841x faster) | 36.361 s vs 36.436 s (1.002x faster) |  17.9 s vs 23.29 s (1.301x faster) |  32 MiB vs 447 MiB (92.841% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.537 s vs 5.075 s (9.451x faster) |  36.89 s vs 41.948 s (1.137x faster) | 18.01 s vs 23.33 s (1.295x faster) |  39 MiB vs 447 MiB (91.275% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.578 s vs 4.796 s (8.298x faster) |  37.44 s vs 42.087 s (1.124x faster) | 18.01 s vs 23.47 s (1.303x faster) |  39 MiB vs 417 MiB (90.647% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.382 s vs 9.584 s (6.935x faster) |  69.06 s vs 74.189 s (1.074x faster) | 55.48 s vs 60.78 s (1.096x faster) | 103 MiB vs 281 MiB (63.345% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | 0.312 s vs 10.041 s (32.183x faster) | 31.425 s vs 42.156 s (1.341x faster) | 17.95 s vs 28.53 s (1.589x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |    0.628 s vs 9.7 s (15.446x faster) | 37.242 s vs 48.532 s (1.303x faster) | 17.99 s vs 28.56 s (1.588x faster) |  37 MiB vs 280 MiB (86.786% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |   1.286 s vs 9.473 s (7.366x faster) | 36.653 s vs 47.306 s (1.291x faster) |  17.99 s vs 28.61 s (1.59x faster) |  37 MiB vs 273 MiB (86.447% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.828 s vs 5.629 s (6.798x faster) | 74.197 s vs 73.773 s (1.006x slower) | 55.39 s vs 60.84 s (1.098x faster) | 116 MiB vs 282 MiB (58.865% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.286 s vs 5.702 s (19.937x faster) |  31.349 s vs 36.679 s (1.17x faster) | 17.94 s vs 23.28 s (1.298x faster) |  34 MiB vs 282 MiB (87.943% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.414 s vs 5.623 s (13.582x faster) | 37.521 s vs 41.992 s (1.119x faster) | 17.95 s vs 23.37 s (1.302x faster) |  37 MiB vs 281 MiB (86.833% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.192 s vs 5.552 s (4.658x faster) | 36.883 s vs 42.337 s (1.148x faster) | 18.05 s vs 23.37 s (1.295x faster) |  37 MiB vs 274 MiB (86.496% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.632 s vs 24.333 s (9.245x faster) | 70.911 s vs 94.642 s (1.335x faster) |  55.36 s vs 76.39 s (1.38x faster) |  55 MiB vs 219 MiB (74.886% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.515 s vs 25.116 s (48.769x faster) | 31.758 s vs 62.939 s (1.982x faster) |  17.88 s vs 44.53 s (2.49x faster) |  35 MiB vs 212 MiB (83.491% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.664 s vs 25.264 s (38.048x faster) | 37.186 s vs 63.873 s (1.718x faster) | 17.95 s vs 44.46 s (2.477x faster) |  36 MiB vs 214 MiB (83.178% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | 1.516 s vs 23.925 s (15.782x faster) |  38.02 s vs 63.798 s (1.678x faster) |  18.02 s vs 44.69 s (2.48x faster) |  36 MiB vs 211 MiB (82.938% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |    1.524 s vs 14.325 s (9.4x faster) |  69.346 s vs 80.52 s (1.161x faster) |   55.47 s vs 66.56 s (1.2x faster) |  64 MiB vs 222 MiB (71.171% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.527 s vs 14.419 s (27.361x faster) |  32.94 s vs 47.532 s (1.443x faster) |  17.94 s vs 34.26 s (1.91x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.648 s vs 14.385 s (22.199x faster) |   37.171 s vs 53.15 s (1.43x faster) | 17.88 s vs 34.21 s (1.913x faster) |   36 MiB vs 221 MiB (83.71% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.361 s vs 13.743 s (10.098x faster) | 37.263 s vs 53.201 s (1.428x faster) | 18.04 s vs 34.05 s (1.887x faster) |  35 MiB vs 218 MiB (83.945% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.562 s |               8.99 s |   +6.428 s |   3.509x |   +250.898% |
| Billed duration   |              2.721 s |              9.494 s |   +6.773 s |   3.489x |   +248.916% |
| Init duration     |              0.123 s |              0.502 s |   +0.379 s |   4.081x |    +308.13% |
| Local wall time   |             68.923 s |             78.966 s |  +10.043 s |   1.146x |    +14.571% |
| CDK deploy time   |              55.37 s |              60.67 s |     +5.3 s |   1.096x |     +9.572% |
| Max memory        |              109 MiB |              447 MiB |   +338 MiB |   4.101x |   +310.092% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.312 s |              9.238 s |   +8.926 s |  29.609x |  +2860.897% |
| Billed duration   |              0.438 s |              9.745 s |   +9.307 s |  22.249x |  +2124.886% |
| Init duration     |              0.122 s |              0.507 s |   +0.385 s |   4.156x |   +315.574% |
| Local wall time   |             32.827 s |             41.771 s |   +8.944 s |   1.272x |    +27.246% |
| CDK deploy time   |              17.88 s |              28.62 s |   +10.74 s |   1.601x |    +60.067% |
| Max memory        |               32 MiB |              447 MiB |   +415 MiB |  13.969x |  +1296.875% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.616 s |              9.244 s |   +8.628 s |  15.006x |  +1400.649% |
| Billed duration   |              0.746 s |              9.752 s |   +9.006 s |  13.072x |  +1207.239% |
| Init duration     |              0.116 s |              0.508 s |   +0.392 s |   4.379x |   +337.931% |
| Local wall time   |             37.082 s |             47.249 s |  +10.167 s |   1.274x |    +27.418% |
| CDK deploy time   |              17.92 s |              28.58 s |   +10.66 s |   1.595x |    +59.487% |
| Max memory        |               39 MiB |              447 MiB |   +408 MiB |  11.462x |  +1046.154% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.694 s |              8.468 s |   +7.774 s |  12.202x |  +1120.173% |
| Billed duration   |              0.823 s |              8.957 s |   +8.134 s |  10.883x |   +988.335% |
| Init duration     |              0.127 s |              0.489 s |   +0.362 s |    3.85x |   +285.039% |
| Local wall time   |             37.683 s |             47.362 s |   +9.679 s |   1.257x |    +25.685% |
| CDK deploy time   |              18.12 s |               28.7 s |   +10.58 s |   1.584x |    +58.389% |
| Max memory        |               39 MiB |              417 MiB |   +378 MiB |  10.692x |   +969.231% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.217 s |              5.058 s |   +3.841 s |   4.156x |   +315.612% |
| Billed duration   |              1.333 s |              5.554 s |   +4.221 s |   4.167x |   +316.654% |
| Init duration     |              0.119 s |              0.491 s |   +0.372 s |   4.126x |   +312.605% |
| Local wall time   |             68.861 s |             68.019 s |   -0.842 s |   0.988x |     -1.223% |
| CDK deploy time   |              55.41 s |              55.24 s |    -0.17 s |   0.997x |     -0.307% |
| Max memory        |              187 MiB |              447 MiB |   +260 MiB |    2.39x |   +139.037% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.251 s |               4.98 s |   +4.729 s |  19.841x |  +1884.064% |
| Billed duration   |               0.37 s |              5.463 s |   +5.093 s |  14.765x |  +1376.486% |
| Init duration     |              0.119 s |              0.489 s |    +0.37 s |   4.109x |   +310.924% |
| Local wall time   |             36.361 s |             36.436 s |   +0.075 s |   1.002x |     +0.206% |
| CDK deploy time   |               17.9 s |              23.29 s |    +5.39 s |   1.301x |    +30.112% |
| Max memory        |               32 MiB |              447 MiB |   +415 MiB |  13.969x |  +1296.875% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.537 s |              5.075 s |   +4.538 s |   9.451x |   +845.065% |
| Billed duration   |              0.659 s |              5.567 s |   +4.908 s |   8.448x |   +744.765% |
| Init duration     |              0.121 s |              0.492 s |   +0.371 s |   4.066x |   +306.612% |
| Local wall time   |              36.89 s |             41.948 s |   +5.058 s |   1.137x |    +13.711% |
| CDK deploy time   |              18.01 s |              23.33 s |    +5.32 s |   1.295x |    +29.539% |
| Max memory        |               39 MiB |              447 MiB |   +408 MiB |  11.462x |  +1046.154% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.578 s |              4.796 s |   +4.218 s |   8.298x |   +729.758% |
| Billed duration   |              0.699 s |              5.309 s |    +4.61 s |   7.595x |   +659.514% |
| Init duration     |               0.12 s |              0.504 s |   +0.384 s |     4.2x |       +320% |
| Local wall time   |              37.44 s |             42.087 s |   +4.647 s |   1.124x |    +12.412% |
| CDK deploy time   |              18.01 s |              23.47 s |    +5.46 s |   1.303x |    +30.316% |
| Max memory        |               39 MiB |              417 MiB |   +378 MiB |  10.692x |   +969.231% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.382 s |              9.584 s |   +8.202 s |   6.935x |   +593.488% |
| Billed duration   |              1.511 s |             10.094 s |   +8.583 s |    6.68x |   +568.034% |
| Init duration     |              0.135 s |              0.506 s |   +0.371 s |   3.748x |   +274.815% |
| Local wall time   |              69.06 s |             74.189 s |   +5.129 s |   1.074x |     +7.427% |
| CDK deploy time   |              55.48 s |              60.78 s |     +5.3 s |   1.096x |     +9.553% |
| Max memory        |              103 MiB |              281 MiB |   +178 MiB |   2.728x |   +172.816% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.312 s |             10.041 s |   +9.729 s |  32.183x |  +3118.269% |
| Billed duration   |              0.433 s |              10.56 s |  +10.127 s |  24.388x |  +2338.799% |
| Init duration     |              0.116 s |              0.509 s |   +0.393 s |   4.388x |   +338.793% |
| Local wall time   |             31.425 s |             42.156 s |  +10.731 s |   1.341x |    +34.148% |
| CDK deploy time   |              17.95 s |              28.53 s |   +10.58 s |   1.589x |    +58.942% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.628 s |                9.7 s |   +9.072 s |  15.446x |  +1444.586% |
| Billed duration   |               0.75 s |             10.193 s |   +9.443 s |  13.591x |  +1259.067% |
| Init duration     |              0.149 s |              0.493 s |   +0.344 s |   3.309x |   +230.872% |
| Local wall time   |             37.242 s |             48.532 s |   +11.29 s |   1.303x |    +30.315% |
| CDK deploy time   |              17.99 s |              28.56 s |   +10.57 s |   1.588x |    +58.755% |
| Max memory        |               37 MiB |              280 MiB |   +243 MiB |   7.568x |   +656.757% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.286 s |              9.473 s |   +8.187 s |   7.366x |   +636.625% |
| Billed duration   |              1.406 s |              9.978 s |   +8.572 s |   7.097x |   +609.673% |
| Init duration     |              0.119 s |              0.505 s |   +0.386 s |   4.244x |    +324.37% |
| Local wall time   |             36.653 s |             47.306 s |  +10.653 s |   1.291x |    +29.064% |
| CDK deploy time   |              17.99 s |              28.61 s |   +10.62 s |    1.59x |    +59.033% |
| Max memory        |               37 MiB |              273 MiB |   +236 MiB |   7.378x |   +637.838% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.828 s |              5.629 s |   +4.801 s |   6.798x |   +579.831% |
| Billed duration   |              0.948 s |              6.146 s |   +5.198 s |   6.483x |   +548.312% |
| Init duration     |              0.123 s |              0.497 s |   +0.374 s |   4.041x |   +304.065% |
| Local wall time   |             74.197 s |             73.773 s |   -0.424 s |   0.994x |     -0.571% |
| CDK deploy time   |              55.39 s |              60.84 s |    +5.45 s |   1.098x |     +9.839% |
| Max memory        |              116 MiB |              282 MiB |   +166 MiB |   2.431x |   +143.103% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.286 s |              5.702 s |   +5.416 s |  19.937x |  +1893.706% |
| Billed duration   |              0.405 s |              6.188 s |   +5.783 s |  15.279x |  +1427.901% |
| Init duration     |              0.129 s |                0.5 s |   +0.371 s |   3.876x |   +287.597% |
| Local wall time   |             31.349 s |             36.679 s |    +5.33 s |    1.17x |    +17.002% |
| CDK deploy time   |              17.94 s |              23.28 s |    +5.34 s |   1.298x |    +29.766% |
| Max memory        |               34 MiB |              282 MiB |   +248 MiB |   8.294x |   +729.412% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.414 s |              5.623 s |   +5.209 s |  13.582x |  +1258.213% |
| Billed duration   |              0.564 s |              6.108 s |   +5.544 s |   10.83x |   +982.979% |
| Init duration     |              0.118 s |              0.491 s |   +0.373 s |   4.161x |   +316.102% |
| Local wall time   |             37.521 s |             41.992 s |   +4.471 s |   1.119x |    +11.916% |
| CDK deploy time   |              17.95 s |              23.37 s |    +5.42 s |   1.302x |    +30.195% |
| Max memory        |               37 MiB |              281 MiB |   +244 MiB |   7.595x |   +659.459% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.192 s |              5.552 s |    +4.36 s |   4.658x |   +365.772% |
| Billed duration   |               1.31 s |              6.056 s |   +4.746 s |   4.623x |    +362.29% |
| Init duration     |              0.118 s |              0.496 s |   +0.378 s |   4.203x |   +320.339% |
| Local wall time   |             36.883 s |             42.337 s |   +5.454 s |   1.148x |    +14.787% |
| CDK deploy time   |              18.05 s |              23.37 s |    +5.32 s |   1.295x |    +29.474% |
| Max memory        |               37 MiB |              274 MiB |   +237 MiB |   7.405x |   +640.541% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.632 s |             24.333 s |  +21.701 s |   9.245x |   +824.506% |
| Billed duration   |              2.752 s |             24.838 s |  +22.086 s |   9.025x |   +802.544% |
| Init duration     |              0.115 s |                0.5 s |   +0.385 s |   4.348x |   +334.783% |
| Local wall time   |             70.911 s |             94.642 s |  +23.731 s |   1.335x |    +33.466% |
| CDK deploy time   |              55.36 s |              76.39 s |   +21.03 s |    1.38x |    +37.988% |
| Max memory        |               55 MiB |              219 MiB |   +164 MiB |   3.982x |   +298.182% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.515 s |             25.116 s |  +24.601 s |  48.769x |  +4776.893% |
| Billed duration   |              0.642 s |             25.608 s |  +24.966 s |  39.888x |  +3888.785% |
| Init duration     |              0.115 s |                0.5 s |   +0.385 s |   4.348x |   +334.783% |
| Local wall time   |             31.758 s |             62.939 s |  +31.181 s |   1.982x |    +98.183% |
| CDK deploy time   |              17.88 s |              44.53 s |   +26.65 s |    2.49x |   +149.049% |
| Max memory        |               35 MiB |              212 MiB |   +177 MiB |   6.057x |   +505.714% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.664 s |             25.264 s |    +24.6 s |  38.048x |  +3704.819% |
| Billed duration   |              0.788 s |             25.761 s |  +24.973 s |  32.692x |  +3169.162% |
| Init duration     |               0.12 s |                0.5 s |    +0.38 s |   4.167x |   +316.667% |
| Local wall time   |             37.186 s |             63.873 s |  +26.687 s |   1.718x |    +71.766% |
| CDK deploy time   |              17.95 s |              44.46 s |   +26.51 s |   2.477x |   +147.688% |
| Max memory        |               36 MiB |              214 MiB |   +178 MiB |   5.944x |   +494.444% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.516 s |             23.925 s |  +22.409 s |  15.782x |  +1478.166% |
| Billed duration   |              1.672 s |             24.693 s |  +23.021 s |  14.769x |  +1376.854% |
| Init duration     |              0.118 s |              0.511 s |   +0.393 s |   4.331x |   +333.051% |
| Local wall time   |              38.02 s |             63.798 s |  +25.778 s |   1.678x |    +67.801% |
| CDK deploy time   |              18.02 s |              44.69 s |   +26.67 s |    2.48x |   +148.002% |
| Max memory        |               36 MiB |              211 MiB |   +175 MiB |   5.861x |   +486.111% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.524 s |             14.325 s |  +12.801 s |     9.4x |   +839.961% |
| Billed duration   |              1.644 s |             14.865 s |  +13.221 s |   9.042x |   +804.197% |
| Init duration     |              0.124 s |              0.495 s |   +0.371 s |   3.992x |   +299.194% |
| Local wall time   |             69.346 s |              80.52 s |  +11.174 s |   1.161x |    +16.113% |
| CDK deploy time   |              55.47 s |              66.56 s |   +11.09 s |     1.2x |    +19.993% |
| Max memory        |               64 MiB |              222 MiB |   +158 MiB |   3.469x |   +246.875% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.527 s |             14.419 s |  +13.892 s |  27.361x |  +2636.053% |
| Billed duration   |              0.646 s |             14.905 s |  +14.259 s |  23.073x |  +2207.276% |
| Init duration     |              0.118 s |              0.489 s |   +0.371 s |   4.144x |   +314.407% |
| Local wall time   |              32.94 s |             47.532 s |  +14.592 s |   1.443x |    +44.299% |
| CDK deploy time   |              17.94 s |              34.26 s |   +16.32 s |    1.91x |     +90.97% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.648 s |             14.385 s |  +13.737 s |  22.199x |  +2119.907% |
| Billed duration   |              0.763 s |             14.883 s |   +14.12 s |  19.506x |   +1850.59% |
| Init duration     |              0.117 s |              0.498 s |   +0.381 s |   4.256x |   +325.641% |
| Local wall time   |             37.171 s |              53.15 s |  +15.979 s |    1.43x |    +42.988% |
| CDK deploy time   |              17.88 s |              34.21 s |   +16.33 s |   1.913x |    +91.331% |
| Max memory        |               36 MiB |              221 MiB |   +185 MiB |   6.139x |   +513.889% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.361 s |             13.743 s |  +12.382 s |  10.098x |   +909.772% |
| Billed duration   |              1.476 s |             14.284 s |  +12.808 s |   9.678x |   +867.751% |
| Init duration     |              0.121 s |              0.511 s |    +0.39 s |   4.223x |   +322.314% |
| Local wall time   |             37.263 s |             53.201 s |  +15.938 s |   1.428x |    +42.772% |
| CDK deploy time   |              18.04 s |              34.05 s |   +16.01 s |   1.887x |    +88.747% |
| Max memory        |               35 MiB |              218 MiB |   +183 MiB |   6.229x |   +522.857% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |       8.99 |  8.971 |  9.046 |   0.075 |   8.591 |   9.364 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.238 |  9.033 |  9.308 |   0.275 |   8.576 |   9.724 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.244 |  9.232 |  9.269 |   0.037 |   8.911 |   9.653 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.468 |   8.43 |  8.745 |   0.315 |   8.237 |   8.964 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.562 |  2.395 |  2.606 |   0.211 |   2.152 |   2.782 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.312 |  0.267 |  0.321 |   0.054 |   0.261 |   0.373 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.616 |  0.612 |  0.655 |   0.043 |   0.612 |    0.66 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.694 |  0.684 |  0.711 |   0.027 |   0.666 |   0.736 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.058 |  5.041 |  5.059 |   0.018 |   4.926 |   5.109 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       4.98 |   4.92 |  5.054 |   0.134 |   4.572 |   5.103 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.075 |  5.061 |  5.131 |    0.07 |   4.909 |   5.193 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.796 |  4.737 |  4.822 |   0.085 |   4.695 |   5.075 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.217 |   1.18 |  1.232 |   0.052 |    1.11 |   1.362 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.251 |   0.25 |   0.26 |    0.01 |   0.231 |   0.262 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.537 |  0.519 |  0.546 |   0.027 |   0.476 |   0.549 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.578 |  0.521 |   0.64 |   0.119 |   0.496 |   0.664 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.584 |  9.446 |  9.744 |   0.298 |   9.361 |   9.808 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.041 |  9.786 | 10.263 |   0.477 |   9.512 |   10.87 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |        9.7 |  9.653 |   9.72 |   0.067 |   9.143 |   9.938 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.473 |  9.385 |  9.966 |   0.581 |   8.887 |    9.99 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.382 |  1.317 |  1.452 |   0.135 |   1.307 |   1.513 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.312 |  0.312 |  0.316 |   0.004 |   0.283 |   0.324 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.628 |  0.601 |   0.64 |   0.039 |   0.595 |   0.688 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.286 |  1.257 |  1.296 |   0.039 |   1.251 |    1.38 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.629 |  5.599 |  5.656 |   0.057 |   5.535 |   6.157 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.702 |  5.565 |  5.798 |   0.233 |   5.351 |    5.88 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.623 |  5.471 |  5.659 |   0.188 |   5.462 |   5.678 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.552 |  5.431 |  5.559 |   0.128 |   5.376 |   5.642 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.828 |  0.799 |  0.963 |   0.164 |   0.724 |   0.981 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.286 |  0.259 |  0.295 |   0.036 |    0.25 |    0.31 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.414 |  0.399 |  0.475 |   0.076 |   0.382 |   0.498 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.192 |  1.126 |  1.239 |   0.113 |   1.085 |   1.327 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     24.333 | 24.199 | 24.963 |   0.764 |  23.711 |  27.397 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     25.116 | 24.933 | 25.335 |   0.402 |  24.257 |  25.861 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     25.264 | 25.219 | 25.875 |   0.656 |  23.216 |  26.718 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     23.925 | 23.897 | 24.273 |   0.376 |  23.039 |  24.325 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.632 |  2.614 |  2.637 |   0.023 |   2.594 |   2.682 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.515 |  0.514 |  0.538 |   0.024 |   0.496 |   0.554 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.664 |  0.659 |  0.665 |   0.006 |   0.636 |     0.7 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.516 |  1.509 |  1.628 |   0.119 |    1.47 |   1.645 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.325 |  14.31 | 15.638 |   1.328 |  14.295 |  15.907 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     14.419 |   14.4 | 14.828 |   0.428 |  14.314 |   16.94 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     14.385 | 14.314 | 14.637 |   0.323 |  13.147 |  14.652 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     13.743 | 13.595 | 14.006 |   0.411 |   13.56 |  14.387 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.524 |  1.471 |  1.593 |   0.122 |   1.451 |   1.596 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.527 |  0.522 |  0.529 |   0.007 |   0.506 |   0.554 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.648 |   0.63 |  0.662 |   0.032 |   0.569 |   0.704 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.361 |  1.345 |  1.382 |   0.037 |   1.321 |   1.524 |

```text
large-few cold-create 1024//adaptive aws         | ########### 8.99 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.238 s
large-few changed-update 1024//adaptive aws      | ########### 9.244 s
large-few pruned-update 1024//adaptive aws       | ########## 8.468 s
large-few cold-create 1024/32/adaptive shin      | ### 2.562 s
large-few unchanged-update 1024/32/adaptive shin | # 0.312 s
large-few changed-update 1024/32/adaptive shin   | # 0.616 s
large-few pruned-update 1024/32/adaptive shin    | # 0.694 s
large-few cold-create 2048//adaptive aws         | ###### 5.058 s
large-few unchanged-update 2048//adaptive aws    | ###### 4.98 s
large-few changed-update 2048//adaptive aws      | ###### 5.075 s
large-few pruned-update 2048//adaptive aws       | ###### 4.796 s
large-few cold-create 2048/64/adaptive shin      | # 1.217 s
large-few unchanged-update 2048/64/adaptive shin | # 0.251 s
large-few changed-update 2048/64/adaptive shin   | # 0.537 s
large-few pruned-update 2048/64/adaptive shin    | # 0.578 s
mixed cold-create 1024//adaptive aws             | ########### 9.584 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.041 s
mixed changed-update 1024//adaptive aws          | ############ 9.7 s
mixed pruned-update 1024//adaptive aws           | ########### 9.473 s
mixed cold-create 1024/32/adaptive shin          | ## 1.382 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.312 s
mixed changed-update 1024/32/adaptive shin       | # 0.628 s
mixed pruned-update 1024/32/adaptive shin        | ## 1.286 s
mixed cold-create 2048//adaptive aws             | ####### 5.629 s
mixed unchanged-update 2048//adaptive aws        | ####### 5.702 s
mixed changed-update 2048//adaptive aws          | ####### 5.623 s
mixed pruned-update 2048//adaptive aws           | ####### 5.552 s
mixed cold-create 2048/64/adaptive shin          | # 0.828 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.286 s
mixed changed-update 2048/64/adaptive shin       | # 0.414 s
mixed pruned-update 2048/64/adaptive shin        | # 1.192 s
tiny-many cold-create 1024//adaptive aws         | ############################# 24.333 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 25.116 s
tiny-many changed-update 1024//adaptive aws      | ############################## 25.264 s
tiny-many pruned-update 1024//adaptive aws       | ############################ 23.925 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.632 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.515 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.664 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.516 s
tiny-many cold-create 2048//adaptive aws         | ################# 14.325 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 14.419 s
tiny-many changed-update 2048//adaptive aws      | ################# 14.385 s
tiny-many pruned-update 2048//adaptive aws       | ################ 13.743 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.524 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.527 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.648 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.361 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.494 |  9.464 |  9.548 |   0.084 |   9.031 |   9.885 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.745 |  9.551 |  9.843 |   0.292 |   9.016 |  10.141 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.752 |  9.748 |   9.78 |   0.032 |   9.418 |   10.07 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.957 |  8.908 |  9.133 |   0.225 |   8.766 |   9.482 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.721 |  2.511 |  2.721 |    0.21 |   2.276 |   2.947 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.438 |  0.423 |  0.467 |   0.044 |   0.384 |    0.49 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.746 |  0.731 |  0.772 |   0.041 |   0.726 |   0.774 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.823 |  0.805 |  0.823 |   0.018 |   0.803 |   0.864 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.554 |   5.55 |  5.571 |   0.021 |   5.416 |   5.595 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.463 |   5.43 |  5.543 |   0.113 |   4.996 |   5.611 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.567 |  5.553 |  5.637 |   0.084 |   5.395 |   5.703 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.309 |  5.239 |  5.321 |   0.082 |     5.2 |   5.588 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.333 |    1.3 |  1.357 |   0.057 |   1.226 |   1.515 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.37 |  0.368 |   0.41 |   0.042 |   0.347 |    0.42 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.659 |  0.633 |  0.674 |   0.041 |   0.593 |   0.695 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.699 |   0.64 |  0.763 |   0.123 |   0.615 |   0.813 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.094 |  9.945 | 10.244 |   0.299 |   9.868 |  10.325 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      10.56 | 10.296 | 10.776 |    0.48 |  10.006 |  11.284 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.193 | 10.144 | 10.245 |   0.101 |   9.637 |  10.448 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.978 |   9.88 | 10.503 |   0.623 |   9.371 |  11.091 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.511 |  1.452 |  1.604 |   0.152 |   1.422 |   1.665 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.433 |  0.428 |  0.436 |   0.008 |   0.397 |    0.44 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.75 |  0.746 |  0.789 |   0.043 |    0.72 |   0.839 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.406 |  1.405 |  1.409 |   0.004 |    1.38 |   1.499 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.146 |  6.097 |  6.153 |   0.056 |   6.027 |   6.575 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.188 |  6.066 |  6.301 |   0.235 |   5.813 |     6.4 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.108 |  5.953 |  6.177 |   0.224 |   5.952 |   6.423 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.056 |  5.922 |  6.063 |   0.141 |   5.861 |   6.144 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.948 |  0.931 |  1.104 |   0.173 |   0.837 |   1.114 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.405 |  0.389 |  0.446 |   0.057 |   0.365 |   0.468 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.564 |  0.518 |  0.593 |   0.075 |     0.5 |   0.616 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       1.31 |  1.242 |  1.355 |   0.113 |   1.238 |   1.476 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     24.838 | 24.691 | 25.508 |   0.817 |  24.212 |  27.814 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     25.608 | 25.444 |  25.84 |   0.396 |  24.746 |  26.361 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     25.761 | 25.719 | 26.378 |   0.659 |  23.644 |  27.236 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     24.693 | 24.421 | 24.775 |   0.354 |   23.52 |  24.837 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.752 |   2.73 |  2.784 |   0.054 |    2.71 |   2.809 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.642 |  0.629 |  0.653 |   0.024 |   0.612 |   0.669 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.788 |  0.779 |  0.795 |   0.016 |   0.756 |   0.817 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.672 |  1.625 |  1.746 |   0.121 |   1.587 |   1.765 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.865 | 14.814 | 16.047 |   1.233 |   14.79 |  16.324 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     14.905 |  14.89 | 15.322 |   0.432 |  14.806 |  17.359 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     14.883 | 14.812 | 15.141 |   0.329 |  13.578 |  15.157 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.284 | 14.081 |  14.52 |   0.439 |  14.045 |  14.899 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.644 |  1.596 |  1.717 |   0.121 |   1.577 |   1.749 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.646 |  0.641 |  0.684 |   0.043 |   0.621 |   0.711 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.763 |  0.747 |  0.779 |   0.032 |   0.685 |   0.853 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.476 |  1.467 |  1.531 |   0.064 |   1.441 |    1.65 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.494 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.745 s
large-few changed-update 1024//adaptive aws      | ########### 9.752 s
large-few pruned-update 1024//adaptive aws       | ########## 8.957 s
large-few cold-create 1024/32/adaptive shin      | ### 2.721 s
large-few unchanged-update 1024/32/adaptive shin | # 0.438 s
large-few changed-update 1024/32/adaptive shin   | # 0.746 s
large-few pruned-update 1024/32/adaptive shin    | # 0.823 s
large-few cold-create 2048//adaptive aws         | ###### 5.554 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.463 s
large-few changed-update 2048//adaptive aws      | ###### 5.567 s
large-few pruned-update 2048//adaptive aws       | ###### 5.309 s
large-few cold-create 2048/64/adaptive shin      | ## 1.333 s
large-few unchanged-update 2048/64/adaptive shin | # 0.37 s
large-few changed-update 2048/64/adaptive shin   | # 0.659 s
large-few pruned-update 2048/64/adaptive shin    | # 0.699 s
mixed cold-create 1024//adaptive aws             | ############ 10.094 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.56 s
mixed changed-update 1024//adaptive aws          | ############ 10.193 s
mixed pruned-update 1024//adaptive aws           | ############ 9.978 s
mixed cold-create 1024/32/adaptive shin          | ## 1.511 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.433 s
mixed changed-update 1024/32/adaptive shin       | # 0.75 s
mixed pruned-update 1024/32/adaptive shin        | ## 1.406 s
mixed cold-create 2048//adaptive aws             | ####### 6.146 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.188 s
mixed changed-update 2048//adaptive aws          | ####### 6.108 s
mixed pruned-update 2048//adaptive aws           | ####### 6.056 s
mixed cold-create 2048/64/adaptive shin          | # 0.948 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.405 s
mixed changed-update 2048/64/adaptive shin       | # 0.564 s
mixed pruned-update 2048/64/adaptive shin        | ## 1.31 s
tiny-many cold-create 1024//adaptive aws         | ############################# 24.838 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 25.608 s
tiny-many changed-update 1024//adaptive aws      | ############################## 25.761 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 24.693 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.752 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.642 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.788 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.672 s
tiny-many cold-create 2048//adaptive aws         | ################# 14.865 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 14.905 s
tiny-many changed-update 2048//adaptive aws      | ################# 14.883 s
tiny-many pruned-update 2048//adaptive aws       | ################# 14.284 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.644 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.646 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.763 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.476 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.502 |  0.493 |  0.504 |   0.011 |   0.439 |   0.521 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.507 |  0.439 |  0.517 |   0.078 |   0.417 |   0.535 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.508 |  0.507 |  0.511 |   0.004 |   0.417 |   0.515 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.489 |  0.478 |  0.517 |   0.039 |   0.387 |   0.528 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.123 |  0.115 |  0.158 |   0.043 |   0.115 |   0.164 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.116 |  0.155 |   0.039 |   0.116 |   0.155 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |  0.118 |   0.004 |   0.113 |   0.129 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.127 |  0.119 |  0.129 |    0.01 |   0.093 |   0.157 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.491 |   0.49 |  0.495 |   0.005 |   0.485 |   0.529 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.489 |  0.483 |  0.508 |   0.025 |   0.424 |   0.509 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.492 |  0.491 |  0.506 |   0.015 |   0.485 |    0.51 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.504 |  0.501 |  0.512 |   0.011 |   0.499 |   0.513 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.116 |  0.124 |   0.008 |   0.115 |   0.153 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.117 |   0.15 |   0.033 |   0.115 |   0.157 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.116 |  0.125 |   0.009 |   0.114 |   0.148 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       0.12 |  0.118 |  0.123 |   0.005 |   0.118 |   0.148 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.506 |    0.5 |   0.51 |    0.01 |   0.498 |   0.517 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.509 |  0.493 |  0.513 |    0.02 |   0.414 |   0.518 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.493 |  0.492 |  0.509 |   0.017 |   0.491 |   0.524 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.505 |  0.495 |  0.512 |   0.017 |   0.483 |   1.124 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.135 |  0.128 |  0.151 |   0.023 |   0.114 |   0.152 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.116 |       0 |   0.113 |   0.124 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.149 |  0.122 |   0.15 |   0.028 |   0.118 |   0.151 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.123 |   0.005 |   0.113 |   0.155 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.497 |  0.491 |  0.498 |   0.007 |   0.417 |   0.516 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |        0.5 |  0.486 |  0.503 |   0.017 |   0.462 |   0.519 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.491 |  0.485 |  0.499 |   0.014 |   0.481 |   0.764 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.496 |   0.49 |  0.502 |   0.012 |   0.484 |   0.511 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.123 |   0.12 |  0.131 |   0.011 |   0.113 |    0.15 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.129 |  0.118 |  0.151 |   0.033 |   0.114 |   0.158 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.119 |   0.002 |   0.117 |   0.149 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.148 |   0.032 |   0.115 |   0.152 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |        0.5 |  0.491 |  0.504 |   0.013 |   0.416 |   0.544 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |        0.5 |  0.492 |  0.505 |   0.013 |   0.489 |    0.51 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |        0.5 |  0.496 |  0.502 |   0.006 |   0.428 |   0.517 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.511 |  0.502 |  0.523 |   0.021 |    0.48 |   0.768 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.115 |  0.126 |   0.011 |   0.115 |   0.151 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.115 |  0.116 |   0.001 |   0.114 |   0.127 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |   0.12 |  0.123 |   0.003 |   0.117 |    0.13 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.119 |   0.003 |   0.115 |   0.156 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.495 |  0.417 |  0.503 |   0.086 |   0.409 |    0.54 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.489 |  0.485 |  0.491 |   0.006 |   0.419 |   0.493 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.498 |  0.497 |  0.503 |   0.006 |    0.43 |   0.504 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.511 |  0.486 |  0.513 |   0.027 |   0.485 |    0.54 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.124 |   0.12 |  0.126 |   0.006 |   0.119 |   0.155 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.154 |   0.036 |   0.115 |   0.156 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.117 |   0.002 |   0.115 |   0.149 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.119 |  0.125 |   0.006 |   0.114 |   0.149 |

```text
large-few cold-create 1024//adaptive aws         | ############################# 0.502 s
large-few unchanged-update 1024//adaptive aws    | ############################## 0.507 s
large-few changed-update 1024//adaptive aws      | ############################## 0.508 s
large-few pruned-update 1024//adaptive aws       | ############################# 0.489 s
large-few cold-create 1024/32/adaptive shin      | ####### 0.123 s
large-few unchanged-update 1024/32/adaptive shin | ####### 0.122 s
large-few changed-update 1024/32/adaptive shin   | ####### 0.116 s
large-few pruned-update 1024/32/adaptive shin    | ####### 0.127 s
large-few cold-create 2048//adaptive aws         | ############################# 0.491 s
large-few unchanged-update 2048//adaptive aws    | ############################# 0.489 s
large-few changed-update 2048//adaptive aws      | ############################# 0.492 s
large-few pruned-update 2048//adaptive aws       | ############################## 0.504 s
large-few cold-create 2048/64/adaptive shin      | ####### 0.119 s
large-few unchanged-update 2048/64/adaptive shin | ####### 0.119 s
large-few changed-update 2048/64/adaptive shin   | ####### 0.121 s
large-few pruned-update 2048/64/adaptive shin    | ####### 0.12 s
mixed cold-create 1024//adaptive aws             | ############################## 0.506 s
mixed unchanged-update 1024//adaptive aws        | ############################## 0.509 s
mixed changed-update 1024//adaptive aws          | ############################# 0.493 s
mixed pruned-update 1024//adaptive aws           | ############################## 0.505 s
mixed cold-create 1024/32/adaptive shin          | ######## 0.135 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 0.116 s
mixed changed-update 1024/32/adaptive shin       | ######### 0.149 s
mixed pruned-update 1024/32/adaptive shin        | ####### 0.119 s
mixed cold-create 2048//adaptive aws             | ############################# 0.497 s
mixed unchanged-update 2048//adaptive aws        | ############################# 0.5 s
mixed changed-update 2048//adaptive aws          | ############################# 0.491 s
mixed pruned-update 2048//adaptive aws           | ############################# 0.496 s
mixed cold-create 2048/64/adaptive shin          | ####### 0.123 s
mixed unchanged-update 2048/64/adaptive shin     | ######## 0.129 s
mixed changed-update 2048/64/adaptive shin       | ####### 0.118 s
mixed pruned-update 2048/64/adaptive shin        | ####### 0.118 s
tiny-many cold-create 1024//adaptive aws         | ############################# 0.5 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 0.5 s
tiny-many changed-update 1024//adaptive aws      | ############################# 0.5 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 0.511 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.115 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 0.115 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 0.12 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 0.118 s
tiny-many cold-create 2048//adaptive aws         | ############################# 0.495 s
tiny-many unchanged-update 2048//adaptive aws    | ############################# 0.489 s
tiny-many changed-update 2048//adaptive aws      | ############################# 0.498 s
tiny-many pruned-update 2048//adaptive aws       | ############################## 0.511 s
tiny-many cold-create 2048/64/adaptive shin      | ####### 0.124 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 0.118 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 0.117 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 0.121 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     78.966 | 74.125 | 81.442 |   7.317 |  73.388 |  89.828 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     41.771 | 41.739 | 42.701 |   0.962 |  41.496 |  48.528 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     47.249 | 47.117 | 47.971 |   0.854 |  47.116 |  68.224 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.362 | 47.335 | 48.142 |   0.807 |  47.313 |  48.897 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     68.923 | 68.807 | 70.645 |   1.838 |  68.734 |   73.57 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     32.827 | 31.413 | 35.237 |   3.824 |  31.339 |  35.399 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.082 |  36.76 | 37.329 |   0.569 |  36.634 |  38.395 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.683 | 37.661 | 42.655 |   4.994 |  36.714 |   43.57 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     68.019 | 67.803 |  69.43 |   1.627 |  67.508 |  73.423 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     36.436 | 36.379 | 36.519 |    0.14 |  36.304 |  38.079 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     41.948 | 41.662 | 41.979 |   0.317 |  41.628 |  43.155 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.087 | 41.963 | 42.216 |   0.253 |  41.795 |  43.598 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     68.861 | 68.674 | 71.846 |   3.172 |  68.306 |  87.331 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.361 | 31.595 | 36.954 |   5.359 |  31.439 |  46.237 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      36.89 | 36.847 | 37.542 |   0.695 |  36.734 |  38.405 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      37.44 | 36.828 | 37.468 |    0.64 |  36.756 |  38.455 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     74.189 | 73.914 |  76.59 |   2.676 |  73.771 |  89.449 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     42.156 | 41.783 | 43.293 |    1.51 |   41.37 |  46.879 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     48.532 |  46.98 | 52.498 |   5.518 |  46.944 |  58.316 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.306 | 47.185 | 47.519 |   0.334 |  47.009 |  48.822 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      69.06 | 68.485 | 69.617 |   1.132 |  68.304 |  71.416 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     31.425 | 31.171 | 32.081 |    0.91 |  31.118 |  33.006 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.242 | 36.665 | 38.051 |   1.386 |   31.71 |  40.863 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     36.653 |  36.57 | 36.662 |   0.092 |   31.77 |  38.197 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     73.773 | 73.699 | 75.042 |   1.343 |  73.384 |  75.479 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     36.679 | 36.506 | 36.753 |   0.247 |  36.468 |  46.074 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     41.992 | 41.887 | 42.286 |   0.399 |  41.744 |   43.45 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.337 | 41.965 | 42.344 |   0.379 |  41.849 |  43.592 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     74.197 | 70.967 | 83.371 |  12.404 |  68.102 |  88.179 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     31.349 |  31.17 | 31.492 |   0.322 |  31.164 |  32.643 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.521 | 36.878 | 39.284 |   2.406 |   36.61 |  41.239 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     36.883 | 36.743 | 38.085 |   1.342 |  36.675 |  43.825 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     94.642 | 91.036 | 94.758 |   3.722 |  89.376 |  95.487 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     62.939 | 57.833 | 64.599 |   6.766 |  57.725 |  72.917 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     63.873 | 63.428 | 66.327 |   2.899 |  63.248 |  70.304 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     63.798 | 63.443 | 65.269 |   1.826 |  58.703 |  67.109 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.911 | 69.833 | 71.004 |   1.171 |  68.625 |  76.173 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     31.758 | 31.478 | 32.436 |   0.958 |   31.44 |  32.738 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.186 | 36.925 | 37.472 |   0.547 |  31.891 |   38.94 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      38.02 | 37.074 | 38.699 |   1.625 |  37.034 |  53.077 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      80.52 | 79.021 | 84.124 |   5.103 |  78.873 |  84.346 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     47.532 |  47.53 | 47.681 |   0.151 |  47.513 |  53.865 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      53.15 | 53.075 | 53.293 |   0.218 |  52.939 |  54.409 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     53.201 | 53.123 | 53.334 |   0.211 |  53.051 |   54.46 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.346 | 69.043 |  69.37 |   0.327 |  68.702 |  70.588 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      32.94 | 31.994 | 34.688 |   2.694 |   31.42 |  38.337 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.171 | 36.941 | 37.299 |   0.358 |  36.912 |  38.593 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.263 | 37.122 |  38.79 |   1.668 |  36.971 |   39.42 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 78.966 s
large-few unchanged-update 1024//adaptive aws    | ############# 41.771 s
large-few changed-update 1024//adaptive aws      | ############### 47.249 s
large-few pruned-update 1024//adaptive aws       | ############### 47.362 s
large-few cold-create 1024/32/adaptive shin      | ###################### 68.923 s
large-few unchanged-update 1024/32/adaptive shin | ########## 32.827 s
large-few changed-update 1024/32/adaptive shin   | ############ 37.082 s
large-few pruned-update 1024/32/adaptive shin    | ############ 37.683 s
large-few cold-create 2048//adaptive aws         | ###################### 68.019 s
large-few unchanged-update 2048//adaptive aws    | ############ 36.436 s
large-few changed-update 2048//adaptive aws      | ############# 41.948 s
large-few pruned-update 2048//adaptive aws       | ############# 42.087 s
large-few cold-create 2048/64/adaptive shin      | ###################### 68.861 s
large-few unchanged-update 2048/64/adaptive shin | ############ 36.361 s
large-few changed-update 2048/64/adaptive shin   | ############ 36.89 s
large-few pruned-update 2048/64/adaptive shin    | ############ 37.44 s
mixed cold-create 1024//adaptive aws             | ######################## 74.189 s
mixed unchanged-update 1024//adaptive aws        | ############# 42.156 s
mixed changed-update 1024//adaptive aws          | ############### 48.532 s
mixed pruned-update 1024//adaptive aws           | ############### 47.306 s
mixed cold-create 1024/32/adaptive shin          | ###################### 69.06 s
mixed unchanged-update 1024/32/adaptive shin     | ########## 31.425 s
mixed changed-update 1024/32/adaptive shin       | ############ 37.242 s
mixed pruned-update 1024/32/adaptive shin        | ############ 36.653 s
mixed cold-create 2048//adaptive aws             | ####################### 73.773 s
mixed unchanged-update 2048//adaptive aws        | ############ 36.679 s
mixed changed-update 2048//adaptive aws          | ############# 41.992 s
mixed pruned-update 2048//adaptive aws           | ############# 42.337 s
mixed cold-create 2048/64/adaptive shin          | ######################## 74.197 s
mixed unchanged-update 2048/64/adaptive shin     | ########## 31.349 s
mixed changed-update 2048/64/adaptive shin       | ############ 37.521 s
mixed pruned-update 2048/64/adaptive shin        | ############ 36.883 s
tiny-many cold-create 1024//adaptive aws         | ############################## 94.642 s
tiny-many unchanged-update 1024//adaptive aws    | #################### 62.939 s
tiny-many changed-update 1024//adaptive aws      | #################### 63.873 s
tiny-many pruned-update 1024//adaptive aws       | #################### 63.798 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 70.911 s
tiny-many unchanged-update 1024/32/adaptive shin | ########## 31.758 s
tiny-many changed-update 1024/32/adaptive shin   | ############ 37.186 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 38.02 s
tiny-many cold-create 2048//adaptive aws         | ########################## 80.52 s
tiny-many unchanged-update 2048//adaptive aws    | ############### 47.532 s
tiny-many changed-update 2048//adaptive aws      | ################# 53.15 s
tiny-many pruned-update 2048//adaptive aws       | ################# 53.201 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 69.346 s
tiny-many unchanged-update 2048/64/adaptive shin | ########## 32.94 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 37.171 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 37.263 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      60.67 |  60.65 |  61.21 |    0.56 |   60.54 |   65.63 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.62 |  28.56 |   28.7 |    0.14 |   28.47 |   29.13 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.58 |  28.58 |  28.61 |    0.03 |   28.58 |   29.14 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       28.7 |   28.6 |  28.75 |    0.15 |    28.6 |   29.11 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.37 |  55.24 |   55.8 |    0.56 |   55.21 |   60.44 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      17.88 |  17.86 |  17.97 |    0.11 |   17.84 |   18.38 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      17.92 |   17.9 |  18.01 |    0.11 |   17.87 |   18.31 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.12 |  18.05 |  18.23 |    0.18 |   17.97 |   18.55 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      55.24 |  55.13 |  55.85 |    0.72 |   55.04 |   60.81 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.29 |  23.26 |  23.36 |     0.1 |   23.22 |   23.85 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.33 |   23.2 |  23.35 |    0.15 |    23.2 |   23.72 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.47 |  23.42 |  23.51 |    0.09 |   23.27 |   23.95 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.41 |  55.38 |  55.53 |    0.15 |   55.28 |    55.8 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       17.9 |   17.9 |  17.95 |    0.05 |   17.86 |   18.44 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.01 |  17.98 |  18.17 |    0.19 |   17.84 |   18.43 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.01 |  17.99 |  18.09 |     0.1 |   17.89 |   18.52 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      60.78 |   60.7 |   60.9 |     0.2 |   60.67 |   61.11 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.53 |  28.46 |  28.63 |    0.17 |   28.43 |   29.12 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.56 |  28.51 |  28.57 |    0.06 |    28.5 |   29.02 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      28.61 |  28.58 |   28.7 |    0.12 |   28.54 |   29.36 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.48 |  55.41 |  55.49 |    0.08 |    55.4 |   55.81 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      17.95 |  17.89 |  17.97 |    0.08 |   17.84 |   18.36 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      17.99 |  17.91 |  18.02 |    0.11 |   17.87 |   18.31 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      17.99 |  17.98 |  18.05 |    0.07 |   17.96 |   23.79 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      60.84 |  60.79 |  61.03 |    0.24 |   55.51 |   61.26 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.28 |  23.22 |  23.41 |    0.19 |   23.19 |   23.76 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.37 |  23.31 |  23.46 |    0.15 |   23.28 |   23.73 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.37 |  23.31 |  23.37 |    0.06 |   23.31 |   23.86 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.39 |  55.05 |  55.41 |    0.36 |   55.04 |   57.35 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      17.94 |  17.91 |  17.95 |    0.04 |   17.89 |   18.36 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      17.95 |  17.85 |  17.97 |    0.12 |   17.84 |   18.41 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.05 |  18.02 |  18.11 |    0.09 |   17.98 |   18.49 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      76.39 |  76.36 |  77.29 |    0.93 |   76.13 |   81.72 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      44.53 |  44.52 |  49.82 |     5.3 |   44.43 |   50.47 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      44.46 |  44.44 |  44.54 |     0.1 |    44.4 |   50.55 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      44.69 |  44.63 |  44.75 |    0.12 |   44.59 |   45.33 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.36 |  55.35 |  55.68 |    0.33 |   55.21 |   55.94 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      17.88 |  17.88 |  17.89 |    0.01 |   17.87 |   18.29 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      17.95 |  17.87 |  18.04 |    0.17 |   17.81 |   18.38 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.02 |  18.02 |  18.08 |    0.06 |      18 |   18.41 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      66.56 |  65.75 |  71.13 |    5.38 |    65.7 |    71.2 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      34.26 |     34 |  34.46 |    0.46 |   33.94 |   39.76 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.21 |  34.18 |  34.23 |    0.05 |   33.84 |   34.48 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      34.05 |  34.05 |  34.55 |     0.5 |   33.95 |   34.64 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.47 |   55.3 |  55.54 |    0.24 |   54.98 |   55.93 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      17.94 |  17.93 |  17.95 |    0.02 |   17.86 |   18.39 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      17.88 |  17.86 |  17.88 |    0.02 |   17.86 |   18.41 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.04 |  18.02 |  18.07 |    0.05 |   17.98 |   18.48 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 60.67 s
large-few unchanged-update 1024//adaptive aws    | ########### 28.62 s
large-few changed-update 1024//adaptive aws      | ########### 28.58 s
large-few pruned-update 1024//adaptive aws       | ########### 28.7 s
large-few cold-create 1024/32/adaptive shin      | ###################### 55.37 s
large-few unchanged-update 1024/32/adaptive shin | ####### 17.88 s
large-few changed-update 1024/32/adaptive shin   | ####### 17.92 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.12 s
large-few cold-create 2048//adaptive aws         | ###################### 55.24 s
large-few unchanged-update 2048//adaptive aws    | ######### 23.29 s
large-few changed-update 2048//adaptive aws      | ######### 23.33 s
large-few pruned-update 2048//adaptive aws       | ######### 23.47 s
large-few cold-create 2048/64/adaptive shin      | ###################### 55.41 s
large-few unchanged-update 2048/64/adaptive shin | ####### 17.9 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.01 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.01 s
mixed cold-create 1024//adaptive aws             | ######################## 60.78 s
mixed unchanged-update 1024//adaptive aws        | ########### 28.53 s
mixed changed-update 1024//adaptive aws          | ########### 28.56 s
mixed pruned-update 1024//adaptive aws           | ########### 28.61 s
mixed cold-create 1024/32/adaptive shin          | ###################### 55.48 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 17.95 s
mixed changed-update 1024/32/adaptive shin       | ####### 17.99 s
mixed pruned-update 1024/32/adaptive shin        | ####### 17.99 s
mixed cold-create 2048//adaptive aws             | ######################## 60.84 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.28 s
mixed changed-update 2048//adaptive aws          | ######### 23.37 s
mixed pruned-update 2048//adaptive aws           | ######### 23.37 s
mixed cold-create 2048/64/adaptive shin          | ###################### 55.39 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 17.94 s
mixed changed-update 2048/64/adaptive shin       | ####### 17.95 s
mixed pruned-update 2048/64/adaptive shin        | ####### 18.05 s
tiny-many cold-create 1024//adaptive aws         | ############################## 76.39 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 44.53 s
tiny-many changed-update 1024//adaptive aws      | ################# 44.46 s
tiny-many pruned-update 1024//adaptive aws       | ################## 44.69 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 55.36 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 17.88 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 17.95 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.02 s
tiny-many cold-create 2048//adaptive aws         | ########################## 66.56 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 34.26 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.21 s
tiny-many pruned-update 2048//adaptive aws       | ############# 34.05 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 55.47 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 17.94 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 17.88 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.04 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       416 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          109 |      103 |      120 |        17 |       102 |       121 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        33 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        38 |        40 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        42 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      448 |         1 |       446 |       448 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      416 |      417 |         1 |       414 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          187 |      179 |      188 |         9 |       173 |       196 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           32 |       32 |       32 |         0 |        32 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        39 |        39 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       40 |         1 |        39 |        40 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       281 |       282 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      281 |         1 |       279 |       281 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       279 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       273 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          103 |      103 |      107 |         4 |       101 |       107 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        34 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        38 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        36 |        39 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       281 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          281 |      281 |      282 |         1 |       281 |       282 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          274 |      274 |      274 |         0 |       274 |       275 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          116 |      109 |      117 |         8 |        92 |       128 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           34 |       33 |       34 |         1 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        37 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       36 |       37 |         1 |        36 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      220 |         1 |       219 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          212 |      211 |      213 |         2 |       211 |       217 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          214 |      212 |      215 |         3 |       210 |       217 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          211 |      210 |      214 |         4 |       210 |       214 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           55 |       49 |       55 |         6 |        49 |        56 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        35 |        36 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      223 |         1 |       222 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       219 |       221 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       221 |       221 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          218 |      218 |      218 |         0 |       218 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           64 |       55 |       68 |        13 |        54 |        70 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        36 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        35 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ####### 109 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 32 MiB
large-few changed-update 1024/32/adaptive shin   | ### 39 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 39 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 187 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 32 MiB
large-few changed-update 2048/64/adaptive shin   | ### 39 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 39 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 280 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 103 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 282 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 281 MiB
mixed pruned-update 2048//adaptive aws           | ################## 274 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 116 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 34 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 212 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 214 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 211 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 55 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 222 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 221 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 221 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 218 MiB
tiny-many cold-create 2048/64/adaptive shin      | #### 64 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 35 MiB
```
