# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-05
- Run ID: 61e8b1e5-0ad9-437d-b75f-9c9e640f64c4
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |   1.859 s vs 9.456 s (5.087x faster) | 70.797 s vs 79.457 s (1.122x faster) | 55.69 s vs 61.03 s (1.096x faster) | 127 MiB vs 447 MiB (71.588% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.248 s vs 9.312 s (37.548x faster) | 33.401 s vs 43.677 s (1.308x faster) | 18.21 s vs 28.85 s (1.584x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |   0.444 s vs 9.33 s (21.014x faster) | 40.925 s vs 49.441 s (1.208x faster) |  18.31 s vs 28.9 s (1.578x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |   0.523 s vs 8.912 s (17.04x faster) | 39.334 s vs 48.179 s (1.225x faster) | 18.45 s vs 28.98 s (1.571x faster) |  40 MiB vs 416 MiB (90.385% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |    1.176 s vs 5.02 s (4.269x faster) |  73.38 s vs 71.041 s (1.033x slower) |  55.37 s vs 56.46 s (1.02x faster) | 190 MiB vs 447 MiB (57.494% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.206 s vs 5.188 s (25.184x faster) |  38.73 s vs 41.903 s (1.082x faster) | 18.21 s vs 23.63 s (1.298x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |  0.423 s vs 5.173 s (12.229x faster) | 37.651 s vs 42.738 s (1.135x faster) | 18.35 s vs 23.57 s (1.284x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |  0.466 s vs 5.041 s (10.818x faster) | 38.518 s vs 42.866 s (1.113x faster) | 18.45 s vs 23.69 s (1.284x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.305 s vs 9.819 s (7.524x faster) |  71.106 s vs 78.11 s (1.099x faster) | 55.85 s vs 61.69 s (1.105x faster) | 105 MiB vs 282 MiB (62.766% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | 0.274 s vs 10.016 s (36.555x faster) |  33.697 s vs 43.454 s (1.29x faster) | 18.29 s vs 28.94 s (1.582x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive | 0.421 s vs 10.013 s (23.784x faster) | 37.737 s vs 47.882 s (1.269x faster) | 18.35 s vs 28.94 s (1.577x faster) |  37 MiB vs 282 MiB (86.879% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |   1.052 s vs 9.823 s (9.337x faster) | 37.687 s vs 47.803 s (1.268x faster) |  18.37 s vs 29.02 s (1.58x faster) |  37 MiB vs 274 MiB (86.496% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.832 s vs 5.678 s (6.825x faster) | 69.303 s vs 75.166 s (1.085x faster) |  55.6 s vs 60.49 s (1.088x faster) | 109 MiB vs 282 MiB (61.348% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.246 s vs 5.692 s (23.138x faster) | 33.964 s vs 38.888 s (1.145x faster) |  18.22 s vs 23.6 s (1.295x faster) |  33 MiB vs 282 MiB (88.298% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |   0.364 s vs 5.602 s (15.39x faster) | 38.831 s vs 43.845 s (1.129x faster) |  18.3 s vs 23.59 s (1.289x faster) |  38 MiB vs 282 MiB (86.525% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.035 s vs 5.515 s (5.329x faster) | 38.593 s vs 42.678 s (1.106x faster) |  18.48 s vs 23.66 s (1.28x faster) |  37 MiB vs 275 MiB (86.545% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.568 s vs 24.926 s (9.706x faster) |  71.03 s vs 92.874 s (1.308x faster) | 55.69 s vs 77.79 s (1.397x faster) |  57 MiB vs 220 MiB (74.091% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.529 s vs 26.383 s (49.873x faster) | 33.324 s vs 64.567 s (1.938x faster) | 18.21 s vs 47.18 s (2.591x faster) |  35 MiB vs 213 MiB (83.568% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive |  0.57 s vs 26.949 s (47.279x faster) | 38.791 s vs 71.736 s (1.849x faster) | 18.43 s vs 47.05 s (2.553x faster) |  36 MiB vs 213 MiB (83.099% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.374 s vs 25.611 s (18.64x faster) | 37.991 s vs 65.864 s (1.734x faster) |  18.41 s vs 45.65 s (2.48x faster) |  36 MiB vs 211 MiB (82.938% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.535 s vs 14.365 s (9.358x faster) |   70.25 s vs 84.52 s (1.203x faster) | 55.57 s vs 68.97 s (1.241x faster) |  69 MiB vs 223 MiB (69.058% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.488 s vs 14.914 s (30.561x faster) | 32.983 s vs 49.881 s (1.512x faster) | 18.23 s vs 34.24 s (1.878x faster) |  37 MiB vs 222 MiB (83.333% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | 0.563 s vs 14.997 s (26.638x faster) | 37.274 s vs 53.755 s (1.442x faster) | 18.41 s vs 34.35 s (1.866x faster) |   36 MiB vs 221 MiB (83.71% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.373 s vs 14.434 s (10.513x faster) | 38.808 s vs 53.798 s (1.386x faster) | 18.42 s vs 34.38 s (1.866x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.859 s |              9.456 s |   +7.597 s |   5.087x |   +408.661% |
| Billed duration   |              1.974 s |              9.964 s |    +7.99 s |   5.048x |   +404.762% |
| Init duration     |              0.114 s |              0.507 s |   +0.393 s |   4.447x |   +344.737% |
| Local wall time   |             70.797 s |             79.457 s |    +8.66 s |   1.122x |    +12.232% |
| CDK deploy time   |              55.69 s |              61.03 s |    +5.34 s |   1.096x |     +9.589% |
| Max memory        |              127 MiB |              447 MiB |   +320 MiB |    3.52x |   +251.969% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.248 s |              9.312 s |   +9.064 s |  37.548x |  +3654.839% |
| Billed duration   |              0.366 s |               9.96 s |   +9.594 s |  27.213x |  +2621.311% |
| Init duration     |              0.117 s |               0.53 s |   +0.413 s |    4.53x |   +352.991% |
| Local wall time   |             33.401 s |             43.677 s |  +10.276 s |   1.308x |    +30.766% |
| CDK deploy time   |              18.21 s |              28.85 s |   +10.64 s |   1.584x |    +58.429% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.444 s |               9.33 s |   +8.886 s |  21.014x |  +2001.351% |
| Billed duration   |              0.569 s |              9.853 s |   +9.284 s |  17.316x |  +1631.634% |
| Init duration     |              0.118 s |              0.526 s |   +0.408 s |   4.458x |   +345.763% |
| Local wall time   |             40.925 s |             49.441 s |   +8.516 s |   1.208x |    +20.809% |
| CDK deploy time   |              18.31 s |               28.9 s |   +10.59 s |   1.578x |    +57.837% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.523 s |              8.912 s |   +8.389 s |   17.04x |  +1604.015% |
| Billed duration   |              0.642 s |              9.425 s |   +8.783 s |  14.681x |  +1368.069% |
| Init duration     |              0.119 s |               0.53 s |   +0.411 s |   4.454x |   +345.378% |
| Local wall time   |             39.334 s |             48.179 s |   +8.845 s |   1.225x |    +22.487% |
| CDK deploy time   |              18.45 s |              28.98 s |   +10.53 s |   1.571x |    +57.073% |
| Max memory        |               40 MiB |              416 MiB |   +376 MiB |    10.4x |       +940% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.176 s |               5.02 s |   +3.844 s |   4.269x |   +326.871% |
| Billed duration   |              1.301 s |              5.536 s |   +4.235 s |   4.255x |   +325.519% |
| Init duration     |              0.116 s |              0.514 s |   +0.398 s |   4.431x |   +343.103% |
| Local wall time   |              73.38 s |             71.041 s |   -2.339 s |   0.968x |     -3.188% |
| CDK deploy time   |              55.37 s |              56.46 s |    +1.09 s |    1.02x |     +1.969% |
| Max memory        |              190 MiB |              447 MiB |   +257 MiB |   2.353x |   +135.263% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.206 s |              5.188 s |   +4.982 s |  25.184x |  +2418.447% |
| Billed duration   |              0.326 s |              5.714 s |   +5.388 s |  17.528x |  +1652.761% |
| Init duration     |              0.119 s |              0.525 s |   +0.406 s |   4.412x |   +341.176% |
| Local wall time   |              38.73 s |             41.903 s |   +3.173 s |   1.082x |     +8.193% |
| CDK deploy time   |              18.21 s |              23.63 s |    +5.42 s |   1.298x |    +29.764% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.423 s |              5.173 s |    +4.75 s |  12.229x |  +1122.931% |
| Billed duration   |              0.549 s |              5.744 s |   +5.195 s |  10.463x |   +946.266% |
| Init duration     |              0.115 s |              0.518 s |   +0.403 s |   4.504x |   +350.435% |
| Local wall time   |             37.651 s |             42.738 s |   +5.087 s |   1.135x |    +13.511% |
| CDK deploy time   |              18.35 s |              23.57 s |    +5.22 s |   1.284x |    +28.447% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.466 s |              5.041 s |   +4.575 s |  10.818x |    +981.76% |
| Billed duration   |              0.583 s |              5.575 s |   +4.992 s |   9.563x |   +856.261% |
| Init duration     |              0.117 s |              0.531 s |   +0.414 s |   4.538x |   +353.846% |
| Local wall time   |             38.518 s |             42.866 s |   +4.348 s |   1.113x |    +11.288% |
| CDK deploy time   |              18.45 s |              23.69 s |    +5.24 s |   1.284x |    +28.401% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.305 s |              9.819 s |   +8.514 s |   7.524x |   +652.414% |
| Billed duration   |              1.421 s |             10.338 s |   +8.917 s |   7.275x |   +627.516% |
| Init duration     |              0.116 s |              0.527 s |   +0.411 s |   4.543x |    +354.31% |
| Local wall time   |             71.106 s |              78.11 s |   +7.004 s |   1.099x |      +9.85% |
| CDK deploy time   |              55.85 s |              61.69 s |    +5.84 s |   1.105x |    +10.457% |
| Max memory        |              105 MiB |              282 MiB |   +177 MiB |   2.686x |   +168.571% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.274 s |             10.016 s |   +9.742 s |  36.555x |  +3555.474% |
| Billed duration   |              0.388 s |             10.563 s |  +10.175 s |  27.224x |  +2622.423% |
| Init duration     |              0.116 s |              0.521 s |   +0.405 s |   4.491x |   +349.138% |
| Local wall time   |             33.697 s |             43.454 s |   +9.757 s |    1.29x |    +28.955% |
| CDK deploy time   |              18.29 s |              28.94 s |   +10.65 s |   1.582x |    +58.229% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.421 s |             10.013 s |   +9.592 s |  23.784x |  +2278.385% |
| Billed duration   |               0.52 s |             10.543 s |  +10.023 s |  20.275x |    +1927.5% |
| Init duration     |              0.115 s |              0.525 s |    +0.41 s |   4.565x |   +356.522% |
| Local wall time   |             37.737 s |             47.882 s |  +10.145 s |   1.269x |    +26.883% |
| CDK deploy time   |              18.35 s |              28.94 s |   +10.59 s |   1.577x |    +57.711% |
| Max memory        |               37 MiB |              282 MiB |   +245 MiB |   7.622x |   +662.162% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.052 s |              9.823 s |   +8.771 s |   9.337x |   +833.745% |
| Billed duration   |              1.175 s |             10.348 s |   +9.173 s |   8.807x |   +780.681% |
| Init duration     |              0.117 s |              0.525 s |   +0.408 s |   4.487x |   +348.718% |
| Local wall time   |             37.687 s |             47.803 s |  +10.116 s |   1.268x |    +26.842% |
| CDK deploy time   |              18.37 s |              29.02 s |   +10.65 s |    1.58x |    +57.975% |
| Max memory        |               37 MiB |              274 MiB |   +237 MiB |   7.405x |   +640.541% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.832 s |              5.678 s |   +4.846 s |   6.825x |   +582.452% |
| Billed duration   |              0.952 s |              6.195 s |   +5.243 s |   6.507x |   +550.735% |
| Init duration     |              0.116 s |              0.508 s |   +0.392 s |   4.379x |   +337.931% |
| Local wall time   |             69.303 s |             75.166 s |   +5.863 s |   1.085x |      +8.46% |
| CDK deploy time   |               55.6 s |              60.49 s |    +4.89 s |   1.088x |     +8.795% |
| Max memory        |              109 MiB |              282 MiB |   +173 MiB |   2.587x |   +158.716% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.246 s |              5.692 s |   +5.446 s |  23.138x |  +2213.821% |
| Billed duration   |              0.362 s |              6.173 s |   +5.811 s |  17.052x |  +1605.249% |
| Init duration     |              0.117 s |              0.514 s |   +0.397 s |   4.393x |   +339.316% |
| Local wall time   |             33.964 s |             38.888 s |   +4.924 s |   1.145x |    +14.498% |
| CDK deploy time   |              18.22 s |               23.6 s |    +5.38 s |   1.295x |    +29.528% |
| Max memory        |               33 MiB |              282 MiB |   +249 MiB |   8.545x |   +754.545% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.364 s |              5.602 s |   +5.238 s |   15.39x |  +1439.011% |
| Billed duration   |              0.472 s |              6.117 s |   +5.645 s |   12.96x |  +1195.975% |
| Init duration     |              0.116 s |              0.489 s |   +0.373 s |   4.216x |   +321.552% |
| Local wall time   |             38.831 s |             43.845 s |   +5.014 s |   1.129x |    +12.912% |
| CDK deploy time   |               18.3 s |              23.59 s |    +5.29 s |   1.289x |    +28.907% |
| Max memory        |               38 MiB |              282 MiB |   +244 MiB |   7.421x |   +642.105% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.035 s |              5.515 s |    +4.48 s |   5.329x |    +432.85% |
| Billed duration   |              1.151 s |              6.111 s |    +4.96 s |   5.309x |    +430.93% |
| Init duration     |              0.116 s |              0.527 s |   +0.411 s |   4.543x |    +354.31% |
| Local wall time   |             38.593 s |             42.678 s |   +4.085 s |   1.106x |    +10.585% |
| CDK deploy time   |              18.48 s |              23.66 s |    +5.18 s |    1.28x |     +28.03% |
| Max memory        |               37 MiB |              275 MiB |   +238 MiB |   7.432x |   +643.243% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.568 s |             24.926 s |  +22.358 s |   9.706x |   +870.639% |
| Billed duration   |              2.683 s |             25.458 s |  +22.775 s |   9.489x |   +848.863% |
| Init duration     |              0.118 s |              0.516 s |   +0.398 s |   4.373x |   +337.288% |
| Local wall time   |              71.03 s |             92.874 s |  +21.844 s |   1.308x |    +30.753% |
| CDK deploy time   |              55.69 s |              77.79 s |    +22.1 s |   1.397x |    +39.684% |
| Max memory        |               57 MiB |              220 MiB |   +163 MiB |    3.86x |   +285.965% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.529 s |             26.383 s |  +25.854 s |  49.873x |  +4887.335% |
| Billed duration   |              0.636 s |             26.883 s |  +26.247 s |  42.269x |  +4126.887% |
| Init duration     |              0.115 s |              0.533 s |   +0.418 s |   4.635x |   +363.478% |
| Local wall time   |             33.324 s |             64.567 s |  +31.243 s |   1.938x |    +93.755% |
| CDK deploy time   |              18.21 s |              47.18 s |   +28.97 s |   2.591x |   +159.088% |
| Max memory        |               35 MiB |              213 MiB |   +178 MiB |   6.086x |   +508.571% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.57 s |             26.949 s |  +26.379 s |  47.279x |  +4627.895% |
| Billed duration   |              0.692 s |             27.481 s |  +26.789 s |  39.712x |  +3871.243% |
| Init duration     |              0.117 s |              0.532 s |   +0.415 s |   4.547x |   +354.701% |
| Local wall time   |             38.791 s |             71.736 s |  +32.945 s |   1.849x |    +84.929% |
| CDK deploy time   |              18.43 s |              47.05 s |   +28.62 s |   2.553x |    +155.29% |
| Max memory        |               36 MiB |              213 MiB |   +177 MiB |   5.917x |   +491.667% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.374 s |             25.611 s |  +24.237 s |   18.64x |  +1763.974% |
| Billed duration   |              1.492 s |             26.158 s |  +24.666 s |  17.532x |  +1653.217% |
| Init duration     |              0.116 s |              0.521 s |   +0.405 s |   4.491x |   +349.138% |
| Local wall time   |             37.991 s |             65.864 s |  +27.873 s |   1.734x |    +73.367% |
| CDK deploy time   |              18.41 s |              45.65 s |   +27.24 s |    2.48x |   +147.963% |
| Max memory        |               36 MiB |              211 MiB |   +175 MiB |   5.861x |   +486.111% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.535 s |             14.365 s |   +12.83 s |   9.358x |   +835.831% |
| Billed duration   |              1.653 s |             14.882 s |  +13.229 s |   9.003x |   +800.302% |
| Init duration     |              0.118 s |              0.517 s |   +0.399 s |   4.381x |   +338.136% |
| Local wall time   |              70.25 s |              84.52 s |   +14.27 s |   1.203x |    +20.313% |
| CDK deploy time   |              55.57 s |              68.97 s |    +13.4 s |   1.241x |    +24.114% |
| Max memory        |               69 MiB |              223 MiB |   +154 MiB |   3.232x |   +223.188% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.488 s |             14.914 s |  +14.426 s |  30.561x |  +2956.148% |
| Billed duration   |              0.609 s |             15.441 s |  +14.832 s |  25.355x |  +2435.468% |
| Init duration     |              0.119 s |              0.513 s |   +0.394 s |   4.311x |   +331.092% |
| Local wall time   |             32.983 s |             49.881 s |  +16.898 s |   1.512x |    +51.232% |
| CDK deploy time   |              18.23 s |              34.24 s |   +16.01 s |   1.878x |    +87.822% |
| Max memory        |               37 MiB |              222 MiB |   +185 MiB |       6x |       +500% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.563 s |             14.997 s |  +14.434 s |  26.638x |  +2563.766% |
| Billed duration   |               0.66 s |             15.573 s |  +14.913 s |  23.595x |  +2259.545% |
| Init duration     |              0.117 s |              0.544 s |   +0.427 s |    4.65x |   +364.957% |
| Local wall time   |             37.274 s |             53.755 s |  +16.481 s |   1.442x |    +44.216% |
| CDK deploy time   |              18.41 s |              34.35 s |   +15.94 s |   1.866x |    +86.583% |
| Max memory        |               36 MiB |              221 MiB |   +185 MiB |   6.139x |   +513.889% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.373 s |             14.434 s |  +13.061 s |  10.513x |   +951.275% |
| Billed duration   |              1.524 s |             14.952 s |  +13.428 s |   9.811x |   +881.102% |
| Init duration     |              0.121 s |              0.518 s |   +0.397 s |   4.281x |   +328.099% |
| Local wall time   |             38.808 s |             53.798 s |   +14.99 s |   1.386x |    +38.626% |
| CDK deploy time   |              18.42 s |              34.38 s |   +15.96 s |   1.866x |    +86.645% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.456 |  9.025 |  9.487 |   0.462 |   8.818 |   9.613 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.312 |  9.195 |  9.493 |   0.298 |   9.045 |   9.945 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |       9.33 |  9.156 |  9.358 |   0.202 |   9.112 |   9.574 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.912 |  8.902 |  8.928 |   0.026 |     8.8 |    9.18 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.859 |  1.758 |  1.901 |   0.143 |   1.738 |   2.101 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.248 |  0.241 |  0.261 |    0.02 |   0.221 |    0.34 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.444 |  0.442 |  0.445 |   0.003 |   0.433 |   0.624 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.523 |   0.52 |  0.577 |   0.057 |   0.512 |   0.637 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       5.02 |   5.01 |  5.022 |   0.012 |   4.999 |   5.194 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.188 |   4.99 |  5.283 |   0.293 |   4.881 |   5.384 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.173 |  5.133 |  5.243 |    0.11 |   4.932 |   5.387 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.041 |  4.995 |  5.241 |   0.246 |    4.91 |   5.311 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.176 |  1.155 |  1.203 |   0.048 |   0.998 |   2.111 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.206 |  0.201 |  0.207 |   0.006 |   0.196 |   0.212 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.423 |  0.384 |  0.451 |   0.067 |   0.374 |   0.481 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.466 |  0.465 |  0.474 |   0.009 |   0.447 |   0.506 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.819 |  9.795 |  9.827 |   0.032 |   9.702 |   9.966 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.016 |  9.988 | 10.177 |   0.189 |   9.891 |  10.225 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.013 |  9.925 | 10.084 |   0.159 |   9.913 |    10.1 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.823 |  9.812 |  9.906 |   0.094 |   9.624 |  10.147 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.305 |  1.291 |  1.334 |   0.043 |   1.281 |   1.411 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.274 |  0.269 |  0.281 |   0.012 |   0.253 |   0.283 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.421 |  0.404 |  0.428 |   0.024 |   0.397 |   0.461 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.052 |  1.044 |  1.066 |   0.022 |   1.031 |    1.24 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.678 |  5.601 |  5.705 |   0.104 |   5.515 |   5.826 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.692 |  5.651 |  5.728 |   0.077 |   5.571 |   5.764 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.602 |  5.439 |  5.799 |    0.36 |   5.433 |   6.461 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.515 |  5.433 |  5.591 |   0.158 |    5.21 |   5.626 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.832 |  0.814 |   0.85 |   0.036 |   0.788 |   0.864 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.246 |  0.232 |  0.251 |   0.019 |   0.231 |   0.276 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.364 |  0.354 |  0.392 |   0.038 |   0.352 |   0.393 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.035 |  1.032 |  1.066 |   0.034 |       1 |   1.088 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     24.926 | 24.784 | 25.374 |    0.59 |  21.845 |  29.468 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.383 | 26.337 | 27.706 |   1.369 |  25.799 |  27.901 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.949 | 25.768 | 27.027 |   1.259 |  25.602 |  27.425 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     25.611 |  25.38 | 26.051 |   0.671 |  25.346 |  26.723 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.568 |  2.566 |  2.611 |   0.045 |   2.538 |   2.632 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.529 |  0.521 |  0.529 |   0.008 |   0.482 |   0.554 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.57 |  0.567 |  0.624 |   0.057 |   0.533 |    0.77 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.374 |  1.365 |  1.394 |   0.029 |   1.279 |   1.404 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.365 | 14.345 | 14.855 |    0.51 |  13.973 |  15.086 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     14.914 | 14.834 | 15.081 |   0.247 |  14.517 |  15.133 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     14.997 | 14.853 | 15.432 |   0.579 |  14.496 |  15.526 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.434 | 14.305 | 14.459 |   0.154 |  14.295 |   14.71 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.535 |  1.515 |  1.535 |    0.02 |   1.426 |   1.591 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.488 |   0.47 |   0.49 |    0.02 |   0.456 |   0.534 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.563 |  0.532 |  0.585 |   0.053 |   0.509 |   0.609 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.373 |  1.285 |  1.405 |    0.12 |   1.284 |   1.425 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.456 s
large-few unchanged-update 1024//adaptive aws    | ########## 9.312 s
large-few changed-update 1024//adaptive aws      | ########## 9.33 s
large-few pruned-update 1024//adaptive aws       | ########## 8.912 s
large-few cold-create 1024/32/adaptive shin      | ## 1.859 s
large-few unchanged-update 1024/32/adaptive shin | # 0.248 s
large-few changed-update 1024/32/adaptive shin   | # 0.444 s
large-few pruned-update 1024/32/adaptive shin    | # 0.523 s
large-few cold-create 2048//adaptive aws         | ###### 5.02 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.188 s
large-few changed-update 2048//adaptive aws      | ###### 5.173 s
large-few pruned-update 2048//adaptive aws       | ###### 5.041 s
large-few cold-create 2048/64/adaptive shin      | # 1.176 s
large-few unchanged-update 2048/64/adaptive shin | # 0.206 s
large-few changed-update 2048/64/adaptive shin   | # 0.423 s
large-few pruned-update 2048/64/adaptive shin    | # 0.466 s
mixed cold-create 1024//adaptive aws             | ########### 9.819 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.016 s
mixed changed-update 1024//adaptive aws          | ########### 10.013 s
mixed pruned-update 1024//adaptive aws           | ########### 9.823 s
mixed cold-create 1024/32/adaptive shin          | # 1.305 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.274 s
mixed changed-update 1024/32/adaptive shin       | # 0.421 s
mixed pruned-update 1024/32/adaptive shin        | # 1.052 s
mixed cold-create 2048//adaptive aws             | ###### 5.678 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.692 s
mixed changed-update 2048//adaptive aws          | ###### 5.602 s
mixed pruned-update 2048//adaptive aws           | ###### 5.515 s
mixed cold-create 2048/64/adaptive shin          | # 0.832 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.246 s
mixed changed-update 2048/64/adaptive shin       | # 0.364 s
mixed pruned-update 2048/64/adaptive shin        | # 1.035 s
tiny-many cold-create 1024//adaptive aws         | ############################ 24.926 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 26.383 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.949 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 25.611 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.568 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.529 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.57 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.374 s
tiny-many cold-create 2048//adaptive aws         | ################ 14.365 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 14.914 s
tiny-many changed-update 2048//adaptive aws      | ################# 14.997 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.434 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.535 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.488 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.563 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.373 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.964 |  9.532 | 10.022 |    0.49 |   9.323 |  10.139 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       9.96 |  9.841 |  9.997 |   0.156 |   9.576 |  10.486 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.853 |  9.682 |  9.884 |   0.202 |   9.642 |  10.104 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.425 |  9.424 |  9.458 |   0.034 |    9.33 |   9.718 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.974 |  1.856 |  2.015 |   0.159 |   1.834 |   2.219 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.366 |  0.365 |  0.378 |   0.013 |   0.322 |   0.453 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.569 |  0.561 |  0.571 |    0.01 |   0.551 |   0.741 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.642 |  0.639 |  0.698 |   0.059 |    0.63 |    0.76 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.536 |  5.516 |  5.561 |   0.045 |   5.509 |   5.752 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.714 |  5.498 |  5.846 |   0.348 |   5.394 |   5.914 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.744 |  5.646 |  5.761 |   0.115 |   5.441 |   5.909 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.575 |  5.527 |  5.744 |   0.217 |   5.426 |   5.882 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.301 |  1.272 |   1.32 |   0.048 |   1.093 |   2.228 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.326 |  0.319 |  0.331 |   0.012 |     0.3 |   0.334 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.549 |    0.5 |  0.565 |   0.065 |   0.473 |   0.608 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.583 |  0.583 |  0.593 |    0.01 |   0.543 |   0.623 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.338 | 10.293 | 10.355 |   0.062 |  10.241 |  10.494 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.563 | 10.533 | 10.705 |   0.172 |  10.412 |  10.745 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.543 | 10.443 | 10.615 |   0.172 |   10.43 |  10.626 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.348 | 10.322 | 10.442 |    0.12 |  10.135 |  10.693 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.421 |  1.419 |   1.45 |   0.031 |   1.397 |   1.569 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.388 |  0.369 |    0.4 |   0.031 |   0.368 |   0.405 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.52 |  0.516 |  0.544 |   0.028 |   0.515 |   0.559 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.175 |  1.161 |  1.183 |   0.022 |   1.145 |   1.392 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.195 |  6.109 |   6.21 |   0.101 |   6.016 |   6.381 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.173 |  6.166 |  6.261 |   0.095 |   6.062 |    6.29 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.117 |  5.922 |  6.687 |   0.765 |   5.912 |   6.889 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.111 |  6.043 |  6.159 |   0.116 |   5.692 |   6.173 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.952 |  0.932 |  0.967 |   0.035 |   0.903 |    0.98 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.362 |  0.349 |  0.371 |   0.022 |   0.332 |   0.396 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.472 |  0.471 |  0.509 |   0.038 |   0.461 |   0.511 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.151 |  1.146 |  1.183 |   0.037 |   1.115 |   1.242 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.458 |   25.3 | 25.945 |   0.645 |  22.309 |  29.896 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.883 | 26.879 | 28.239 |    1.36 |  26.311 |  28.482 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.481 | 26.245 | 27.569 |   1.324 |  26.129 |  27.976 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.158 | 25.884 | 26.598 |   0.714 |  25.868 |  27.244 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.683 |  2.682 |  2.731 |   0.049 |   2.657 |   2.751 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.636 |  0.627 |  0.645 |   0.018 |   0.596 |    0.67 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.692 |  0.688 |  0.741 |   0.053 |   0.626 |   0.897 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.492 |   1.48 |   1.51 |    0.03 |   1.392 |   1.526 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.882 | 14.856 | 15.383 |   0.527 |  14.464 |  15.615 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.441 | 15.335 | 15.598 |   0.263 |  15.011 |  15.647 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.573 | 15.477 | 15.976 |   0.499 |  15.015 |  16.052 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.952 | 14.842 | 14.965 |   0.123 |  14.815 |  15.228 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.653 |  1.633 |  1.655 |   0.022 |   1.542 |   1.709 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.609 |   0.59 |  0.611 |   0.021 |    0.57 |   0.652 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.66 |   0.66 |  0.698 |   0.038 |   0.626 |   0.729 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.524 |  1.406 |  1.527 |   0.121 |   1.403 |   1.574 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.964 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.96 s
large-few changed-update 1024//adaptive aws      | ########### 9.853 s
large-few pruned-update 1024//adaptive aws       | ########## 9.425 s
large-few cold-create 1024/32/adaptive shin      | ## 1.974 s
large-few unchanged-update 1024/32/adaptive shin | # 0.366 s
large-few changed-update 1024/32/adaptive shin   | # 0.569 s
large-few pruned-update 1024/32/adaptive shin    | # 0.642 s
large-few cold-create 2048//adaptive aws         | ###### 5.536 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.714 s
large-few changed-update 2048//adaptive aws      | ###### 5.744 s
large-few pruned-update 2048//adaptive aws       | ###### 5.575 s
large-few cold-create 2048/64/adaptive shin      | # 1.301 s
large-few unchanged-update 2048/64/adaptive shin | # 0.326 s
large-few changed-update 2048/64/adaptive shin   | # 0.549 s
large-few pruned-update 2048/64/adaptive shin    | # 0.583 s
mixed cold-create 1024//adaptive aws             | ########### 10.338 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.563 s
mixed changed-update 1024//adaptive aws          | ############ 10.543 s
mixed pruned-update 1024//adaptive aws           | ########### 10.348 s
mixed cold-create 1024/32/adaptive shin          | ## 1.421 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.388 s
mixed changed-update 1024/32/adaptive shin       | # 0.52 s
mixed pruned-update 1024/32/adaptive shin        | # 1.175 s
mixed cold-create 2048//adaptive aws             | ####### 6.195 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.173 s
mixed changed-update 2048//adaptive aws          | ####### 6.117 s
mixed pruned-update 2048//adaptive aws           | ####### 6.111 s
mixed cold-create 2048/64/adaptive shin          | # 0.952 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.362 s
mixed changed-update 2048/64/adaptive shin       | # 0.472 s
mixed pruned-update 2048/64/adaptive shin        | # 1.151 s
tiny-many cold-create 1024//adaptive aws         | ############################ 25.458 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 26.883 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.481 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.158 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.683 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.636 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.692 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.492 s
tiny-many cold-create 2048//adaptive aws         | ################ 14.882 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.441 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.573 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.952 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.653 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.609 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.66 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.524 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.507 |  0.506 |  0.526 |    0.02 |   0.504 |   0.534 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       0.53 |  0.529 |  0.541 |   0.012 |   0.504 |   0.765 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.526 |  0.526 |  0.529 |   0.003 |   0.522 |    0.53 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       0.53 |  0.522 |   0.53 |   0.008 |   0.512 |   0.537 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.114 |  0.098 |  0.114 |   0.016 |   0.096 |   0.117 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.113 |  0.117 |   0.004 |     0.1 |   0.124 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.124 |   0.007 |   0.115 |   0.128 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |   0.12 |   0.002 |   0.118 |   0.122 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.514 |  0.509 |  0.551 |   0.042 |   0.495 |   0.557 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.525 |  0.513 |   0.53 |   0.017 |   0.508 |   0.562 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.518 |  0.513 |  0.521 |   0.008 |   0.509 |    0.57 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.531 |  0.515 |  0.534 |   0.019 |   0.502 |    0.57 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.116 |       0 |   0.095 |   0.125 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.123 |   0.005 |   0.099 |   0.128 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.115 |  0.113 |  0.125 |   0.012 |   0.099 |   0.127 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.117 |  0.118 |   0.001 |   0.096 |   0.119 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.527 |  0.519 |  0.528 |   0.009 |   0.497 |   0.538 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.521 |   0.52 |  0.528 |   0.008 |   0.517 |   0.575 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.525 |  0.517 |   0.53 |   0.013 |   0.517 |    0.53 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.525 |  0.511 |  0.536 |   0.025 |    0.51 |   0.546 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.127 |   0.011 |   0.115 |   0.158 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.113 |  0.117 |   0.004 |   0.099 |   0.124 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.098 |  0.116 |   0.018 |   0.095 |   0.117 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.117 |  0.122 |   0.005 |   0.113 |   0.151 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.508 |  0.505 |  0.517 |   0.012 |   0.501 |   0.554 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.514 |  0.491 |  0.526 |   0.035 |   0.481 |   0.533 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.489 |  0.472 |  0.514 |   0.042 |   0.427 |   0.888 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.527 |   0.52 |  0.532 |   0.012 |   0.481 |    0.74 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.117 |   0.001 |   0.115 |   0.119 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.119 |   0.003 |   0.099 |    0.12 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.115 |  0.118 |   0.003 |   0.096 |   0.119 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.115 |  0.116 |   0.001 |   0.114 |   0.153 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.516 |  0.463 |  0.532 |   0.069 |   0.428 |    0.57 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.533 |  0.511 |  0.541 |    0.03 |   0.499 |    0.58 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.532 |  0.526 |  0.542 |   0.016 |   0.477 |    0.55 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.521 |  0.521 |  0.547 |   0.026 |   0.504 |   0.547 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.118 |   0.002 |   0.113 |   0.119 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.113 |  0.115 |   0.002 |   0.098 |   0.116 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.124 |   0.008 |   0.092 |   0.126 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |  0.118 |   0.004 |   0.113 |   0.122 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.517 |  0.511 |  0.528 |   0.017 |   0.491 |   0.528 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.513 |    0.5 |  0.517 |   0.017 |   0.494 |   0.526 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.544 |  0.526 |  0.575 |   0.049 |   0.519 |   0.623 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.518 |  0.517 |   0.52 |   0.003 |   0.505 |   0.537 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.118 |   0.001 |   0.116 |   0.119 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.117 |   0.12 |   0.003 |   0.113 |   0.122 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.112 |  0.119 |   0.007 |   0.097 |   0.127 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.121 |  0.121 |  0.148 |   0.027 |   0.117 |    0.15 |

```text
large-few cold-create 1024//adaptive aws         | ############################ 0.507 s
large-few unchanged-update 1024//adaptive aws    | ############################# 0.53 s
large-few changed-update 1024//adaptive aws      | ############################# 0.526 s
large-few pruned-update 1024//adaptive aws       | ############################# 0.53 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.114 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.117 s
large-few changed-update 1024/32/adaptive shin   | ####### 0.118 s
large-few pruned-update 1024/32/adaptive shin    | ####### 0.119 s
large-few cold-create 2048//adaptive aws         | ############################ 0.514 s
large-few unchanged-update 2048//adaptive aws    | ############################# 0.525 s
large-few changed-update 2048//adaptive aws      | ############################# 0.518 s
large-few pruned-update 2048//adaptive aws       | ############################# 0.531 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.116 s
large-few unchanged-update 2048/64/adaptive shin | ####### 0.119 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.115 s
large-few pruned-update 2048/64/adaptive shin    | ###### 0.117 s
mixed cold-create 1024//adaptive aws             | ############################# 0.527 s
mixed unchanged-update 1024//adaptive aws        | ############################# 0.521 s
mixed changed-update 1024//adaptive aws          | ############################# 0.525 s
mixed pruned-update 1024//adaptive aws           | ############################# 0.525 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.116 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.116 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.115 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.117 s
mixed cold-create 2048//adaptive aws             | ############################ 0.508 s
mixed unchanged-update 2048//adaptive aws        | ############################ 0.514 s
mixed changed-update 2048//adaptive aws          | ########################### 0.489 s
mixed pruned-update 2048//adaptive aws           | ############################# 0.527 s
mixed cold-create 2048/64/adaptive shin          | ###### 0.116 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.117 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.116 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.116 s
tiny-many cold-create 1024//adaptive aws         | ############################ 0.516 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 0.533 s
tiny-many changed-update 1024//adaptive aws      | ############################# 0.532 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 0.521 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.118 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.115 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.117 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.116 s
tiny-many cold-create 2048//adaptive aws         | ############################# 0.517 s
tiny-many unchanged-update 2048//adaptive aws    | ############################ 0.513 s
tiny-many changed-update 2048//adaptive aws      | ############################## 0.544 s
tiny-many pruned-update 2048//adaptive aws       | ############################# 0.518 s
tiny-many cold-create 2048/64/adaptive shin      | ####### 0.118 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 0.119 s
tiny-many changed-update 2048/64/adaptive shin   | ###### 0.117 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 0.121 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     79.457 | 78.863 | 80.277 |   1.414 |  77.057 |  80.496 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.677 |  43.15 | 47.357 |   4.207 |   42.87 |  57.249 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     49.441 | 48.373 | 49.775 |   1.402 |  48.323 |  53.135 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     48.179 | 48.159 | 48.336 |   0.177 |  45.161 |  49.199 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     70.797 | 70.214 | 71.729 |   1.515 |  69.328 |  75.763 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.401 | 32.048 | 34.469 |   2.421 |  31.643 |  37.214 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     40.925 | 39.117 | 41.472 |   2.355 |  38.874 |  47.485 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     39.334 | 37.367 | 41.432 |   4.065 |  34.178 |  42.907 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     71.041 | 70.177 | 74.158 |   3.981 |  68.564 |  74.216 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     41.903 | 39.219 | 42.234 |   3.015 |  37.279 |  43.478 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     42.738 | 41.892 | 42.751 |   0.859 |  39.344 |  43.538 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.866 | 42.617 | 43.784 |   1.167 |  42.287 |  44.965 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      73.38 | 72.898 | 74.187 |   1.289 |  69.481 |  75.769 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      38.73 |  34.58 | 40.695 |   6.115 |  34.043 |   50.59 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.651 | 37.496 | 38.513 |   1.017 |  37.147 |  39.875 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.518 | 37.792 | 40.383 |   2.591 |  37.444 |  42.884 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      78.11 | 76.877 | 80.439 |   3.562 |  76.635 |  82.229 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     43.454 | 43.112 | 44.206 |   1.094 |  41.759 |  47.658 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     47.882 | 47.873 |  49.02 |   1.147 |  47.345 |  49.914 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.803 | 47.631 | 48.081 |    0.45 |  44.374 |  69.886 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     71.106 | 70.955 | 72.132 |   1.177 |  70.733 |  76.105 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.697 | 32.921 | 34.361 |    1.44 |  31.851 |  38.053 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     37.737 | 37.145 | 38.685 |    1.54 |  37.057 |  39.694 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.687 | 37.476 | 38.777 |   1.301 |  37.444 |  40.048 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     75.166 | 74.981 | 76.473 |   1.492 |  74.301 |  76.762 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     38.888 | 38.448 | 41.725 |   3.277 |  36.412 |  54.402 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     43.845 |  42.64 | 56.037 |  13.397 |  42.234 |  59.194 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     42.678 | 42.579 | 43.604 |   1.025 |  42.178 |  44.806 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     69.303 | 68.965 | 69.897 |   0.932 |  62.694 |  71.115 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     33.964 | 33.517 | 34.437 |    0.92 |  31.687 |   37.38 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     38.831 | 38.127 |  38.94 |   0.813 |  37.717 |  39.791 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.593 | 37.317 | 38.617 |     1.3 |  36.952 |    39.8 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     92.874 |  90.44 | 96.877 |   6.437 |  89.813 |  102.03 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     64.567 | 59.477 | 66.619 |   7.142 |  58.096 |  69.298 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     71.736 | 70.637 | 71.831 |   1.194 |  64.605 |  73.135 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     65.864 | 64.404 | 66.402 |   1.998 |  59.276 |  72.267 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      71.03 | 70.467 | 72.214 |   1.747 |  69.296 |   75.63 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     33.324 | 32.142 | 36.584 |   4.442 |  31.445 |  39.372 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     38.791 | 37.163 | 39.147 |   1.984 |  35.826 |  43.065 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.991 | 37.641 | 39.141 |     1.5 |   37.42 |  40.258 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      84.52 | 82.144 | 85.233 |   3.089 |  80.669 |  85.845 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     49.881 |  48.71 | 52.829 |   4.119 |  47.982 |  53.146 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     53.755 | 53.609 | 54.394 |   0.785 |  52.818 |    55.6 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     53.798 |  49.24 | 55.815 |   6.575 |  47.658 |  60.095 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      70.25 | 69.842 | 70.602 |    0.76 |  68.798 |  71.163 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     32.983 | 32.631 |  33.76 |   1.129 |  31.612 |  36.717 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.274 | 37.239 | 38.507 |   1.268 |  34.928 |  38.728 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.808 | 37.134 | 40.417 |   3.283 |  33.339 |  43.142 |

```text
large-few cold-create 1024//adaptive aws         | ########################## 79.457 s
large-few unchanged-update 1024//adaptive aws    | ############## 43.677 s
large-few changed-update 1024//adaptive aws      | ################ 49.441 s
large-few pruned-update 1024//adaptive aws       | ################ 48.179 s
large-few cold-create 1024/32/adaptive shin      | ####################### 70.797 s
large-few unchanged-update 1024/32/adaptive shin | ########### 33.401 s
large-few changed-update 1024/32/adaptive shin   | ############# 40.925 s
large-few pruned-update 1024/32/adaptive shin    | ############# 39.334 s
large-few cold-create 2048//adaptive aws         | ####################### 71.041 s
large-few unchanged-update 2048//adaptive aws    | ############## 41.903 s
large-few changed-update 2048//adaptive aws      | ############## 42.738 s
large-few pruned-update 2048//adaptive aws       | ############## 42.866 s
large-few cold-create 2048/64/adaptive shin      | ######################## 73.38 s
large-few unchanged-update 2048/64/adaptive shin | ############# 38.73 s
large-few changed-update 2048/64/adaptive shin   | ############ 37.651 s
large-few pruned-update 2048/64/adaptive shin    | ############ 38.518 s
mixed cold-create 1024//adaptive aws             | ######################### 78.11 s
mixed unchanged-update 1024//adaptive aws        | ############## 43.454 s
mixed changed-update 1024//adaptive aws          | ############### 47.882 s
mixed pruned-update 1024//adaptive aws           | ############### 47.803 s
mixed cold-create 1024/32/adaptive shin          | ####################### 71.106 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 33.697 s
mixed changed-update 1024/32/adaptive shin       | ############ 37.737 s
mixed pruned-update 1024/32/adaptive shin        | ############ 37.687 s
mixed cold-create 2048//adaptive aws             | ######################## 75.166 s
mixed unchanged-update 2048//adaptive aws        | ############# 38.888 s
mixed changed-update 2048//adaptive aws          | ############## 43.845 s
mixed pruned-update 2048//adaptive aws           | ############## 42.678 s
mixed cold-create 2048/64/adaptive shin          | ###################### 69.303 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 33.964 s
mixed changed-update 2048/64/adaptive shin       | ############# 38.831 s
mixed pruned-update 2048/64/adaptive shin        | ############ 38.593 s
tiny-many cold-create 1024//adaptive aws         | ############################## 92.874 s
tiny-many unchanged-update 1024//adaptive aws    | ##################### 64.567 s
tiny-many changed-update 1024//adaptive aws      | ####################### 71.736 s
tiny-many pruned-update 1024//adaptive aws       | ##################### 65.864 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 71.03 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 33.324 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 38.791 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 37.991 s
tiny-many cold-create 2048//adaptive aws         | ########################### 84.52 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 49.881 s
tiny-many changed-update 2048//adaptive aws      | ################# 53.755 s
tiny-many pruned-update 2048//adaptive aws       | ################# 53.798 s
tiny-many cold-create 2048/64/adaptive shin      | ####################### 70.25 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 32.983 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 37.274 s
tiny-many pruned-update 2048/64/adaptive shin    | ############# 38.808 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.03 |   60.9 |   61.9 |       1 |   60.68 |   63.48 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.85 |  28.61 |  29.23 |    0.62 |   28.48 |   30.39 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |       28.9 |  28.62 |  29.12 |     0.5 |   28.55 |   30.36 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      28.98 |  28.57 |  29.37 |     0.8 |   28.52 |   31.05 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.69 |  55.44 |  56.21 |    0.77 |   55.43 |   57.83 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.21 |  18.02 |   18.5 |    0.48 |    17.9 |   19.43 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.31 |  18.15 |   18.7 |    0.55 |   18.14 |   19.65 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.45 |  18.18 |  18.69 |    0.51 |      18 |   19.91 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      56.46 |  55.72 |  57.94 |    2.22 |   55.24 |   60.83 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.63 |  23.23 |  23.95 |    0.72 |    23.2 |   25.15 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.57 |  23.27 |  24.14 |    0.87 |   23.19 |   24.91 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.69 |  23.46 |  24.19 |    0.73 |   23.33 |   25.31 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.37 |  55.02 |  55.61 |    0.59 |   52.33 |   56.22 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.21 |     18 |  18.54 |    0.54 |   17.97 |   19.42 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.35 |  17.98 |  18.69 |    0.71 |   17.94 |    19.5 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.45 |   18.1 |  18.81 |    0.71 |   18.07 |   20.13 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.69 |   61.1 |  63.64 |    2.54 |   60.83 |   65.78 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      28.94 |  28.52 |  29.15 |    0.63 |   28.52 |    30.5 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      28.94 |  28.48 |  29.29 |    0.81 |   28.45 |   30.57 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.02 |  28.76 |   29.3 |    0.54 |   28.59 |   30.94 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.85 |  55.76 |  56.19 |    0.43 |   55.01 |   58.11 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.29 |  17.85 |  18.46 |    0.61 |   17.83 |   19.48 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.35 |  18.17 |  18.56 |    0.39 |   17.97 |   19.48 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.37 |  18.12 |  18.74 |    0.62 |   18.01 |   20.02 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      60.49 |  58.06 |  60.71 |    2.65 |   56.28 |   61.01 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       23.6 |  23.21 |  23.95 |    0.74 |   23.19 |   24.79 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.59 |  23.44 |  24.02 |    0.58 |   23.18 |   24.91 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      23.66 |  23.36 |  24.11 |    0.75 |   23.33 |   25.47 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       55.6 |  52.45 |  55.77 |    3.32 |   49.71 |   56.15 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.22 |  17.92 |  18.52 |     0.6 |   17.87 |   19.41 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       18.3 |  18.06 |  18.61 |    0.55 |   18.01 |   19.56 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.48 |  18.02 |  18.67 |    0.65 |   18.01 |   20.12 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      77.79 |  76.47 |  82.48 |    6.01 |   76.24 |    85.3 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      47.18 |  45.02 |  49.76 |    4.74 |   44.38 |    50.8 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      47.05 |  44.96 |   49.9 |    4.94 |   44.46 |   50.68 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      45.65 |  44.68 |  47.68 |       3 |    44.4 |   50.75 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      55.69 |  55.69 |  56.14 |    0.45 |   55.59 |   58.02 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.21 |  17.87 |  18.64 |    0.77 |   17.86 |   19.37 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.43 |  18.05 |  18.51 |    0.46 |   17.97 |    19.5 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.41 |  18.11 |  18.72 |    0.61 |   18.09 |   19.89 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      68.97 |  67.29 |  71.21 |    3.92 |   66.42 |   71.31 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      34.24 |  34.22 |  34.61 |    0.39 |   33.89 |      36 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.35 |  33.96 |  34.59 |    0.63 |    33.8 |   36.08 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      34.38 |  34.16 |  34.74 |    0.58 |   33.92 |   36.92 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      55.57 |  55.38 |  55.72 |    0.34 |   52.41 |   56.05 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.23 |   17.9 |  18.48 |    0.58 |   17.89 |   19.46 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.41 |  17.97 |  18.62 |    0.65 |   17.93 |   19.54 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.42 |  18.05 |  18.65 |     0.6 |   18.01 |   20.01 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 61.03 s
large-few unchanged-update 1024//adaptive aws    | ########### 28.85 s
large-few changed-update 1024//adaptive aws      | ########### 28.9 s
large-few pruned-update 1024//adaptive aws       | ########### 28.98 s
large-few cold-create 1024/32/adaptive shin      | ##################### 55.69 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.21 s
large-few changed-update 1024/32/adaptive shin   | ####### 18.31 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.45 s
large-few cold-create 2048//adaptive aws         | ###################### 56.46 s
large-few unchanged-update 2048//adaptive aws    | ######### 23.63 s
large-few changed-update 2048//adaptive aws      | ######### 23.57 s
large-few pruned-update 2048//adaptive aws       | ######### 23.69 s
large-few cold-create 2048/64/adaptive shin      | ##################### 55.37 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.21 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.35 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.45 s
mixed cold-create 1024//adaptive aws             | ######################## 61.69 s
mixed unchanged-update 1024//adaptive aws        | ########### 28.94 s
mixed changed-update 1024//adaptive aws          | ########### 28.94 s
mixed pruned-update 1024//adaptive aws           | ########### 29.02 s
mixed cold-create 1024/32/adaptive shin          | ###################### 55.85 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.29 s
mixed changed-update 1024/32/adaptive shin       | ####### 18.35 s
mixed pruned-update 1024/32/adaptive shin        | ####### 18.37 s
mixed cold-create 2048//adaptive aws             | ####################### 60.49 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.6 s
mixed changed-update 2048//adaptive aws          | ######### 23.59 s
mixed pruned-update 2048//adaptive aws           | ######### 23.66 s
mixed cold-create 2048/64/adaptive shin          | ##################### 55.6 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.22 s
mixed changed-update 2048/64/adaptive shin       | ####### 18.3 s
mixed pruned-update 2048/64/adaptive shin        | ####### 18.48 s
tiny-many cold-create 1024//adaptive aws         | ############################## 77.79 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 47.18 s
tiny-many changed-update 1024//adaptive aws      | ################## 47.05 s
tiny-many pruned-update 1024//adaptive aws       | ################## 45.65 s
tiny-many cold-create 1024/32/adaptive shin      | ##################### 55.69 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.21 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 18.43 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.41 s
tiny-many cold-create 2048//adaptive aws         | ########################### 68.97 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 34.24 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.35 s
tiny-many pruned-update 2048//adaptive aws       | ############# 34.38 s
tiny-many cold-create 2048/64/adaptive shin      | ##################### 55.57 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.23 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.41 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.42 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          416 |      416 |      416 |         0 |       416 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          127 |      121 |      127 |         6 |       119 |       134 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        39 |        41 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           40 |       39 |       41 |         2 |        38 |        41 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       416 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          190 |      184 |      192 |         8 |       172 |       199 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        40 |        41 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           40 |       39 |       42 |         3 |        39 |        43 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       281 |       282 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      282 |         2 |       280 |       282 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          282 |      281 |      282 |         1 |       280 |       282 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          274 |      274 |      274 |         0 |       273 |       274 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          105 |      104 |      107 |         3 |        99 |       113 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        37 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        36 |        39 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        41 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       282 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       282 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       281 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      274 |      275 |         1 |       274 |       276 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          109 |      105 |      109 |         4 |       101 |       118 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       35 |         2 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           38 |       37 |       39 |         2 |        37 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       38 |         1 |        36 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          220 |      220 |      220 |         0 |       220 |       221 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          213 |      213 |      214 |         1 |       212 |       215 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          213 |      212 |      213 |         1 |       211 |       218 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          211 |      210 |      211 |         1 |       210 |       214 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           57 |       55 |       58 |         3 |        54 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       36 |         1 |        35 |        36 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      223 |         0 |       223 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          222 |      221 |      222 |         1 |       221 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       221 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       219 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           69 |       64 |       69 |         5 |        52 |        71 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           37 |       36 |       38 |         2 |        36 |        38 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        35 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 416 MiB
large-few cold-create 1024/32/adaptive shin      | ######### 127 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 40 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 40 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 190 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 40 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 40 MiB
mixed cold-create 1024//adaptive aws             | ################### 282 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 282 MiB
mixed pruned-update 1024//adaptive aws           | ################## 274 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 105 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 282 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 282 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ####### 109 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ### 38 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 220 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 213 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 213 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 211 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 57 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 222 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 221 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 69 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 37 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
