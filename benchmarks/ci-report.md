# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-09-05
- Run ID: 39c2a602-57cb-4370-88d9-9413cb45bf53
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
| large-few     | cold-create      |       1024 |              32 |            adaptive |   1.962 s vs 9.284 s (4.732x faster) | 72.172 s vs 78.384 s (1.086x faster) | 56.57 s vs 61.73 s (1.091x faster) | 123 MiB vs 447 MiB (72.483% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.246 s vs 9.256 s (37.626x faster) | 37.209 s vs 49.069 s (1.319x faster) | 18.62 s vs 29.44 s (1.581x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.468 s vs 9.308 s (19.889x faster) | 40.038 s vs 51.511 s (1.287x faster) | 18.67 s vs 29.44 s (1.577x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.511 s vs 8.925 s (17.466x faster) |  37.91 s vs 49.981 s (1.318x faster) |  18.87 s vs 29.4 s (1.558x faster) |  40 MiB vs 417 MiB (90.408% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |    1.145 s vs 5.084 s (4.44x faster) |  70.59 s vs 72.668 s (1.029x faster) | 52.41 s vs 57.24 s (1.092x faster) | 188 MiB vs 447 MiB (57.942% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |   0.22 s vs 5.182 s (23.555x faster) |  38.04 s vs 42.419 s (1.115x faster) | 18.55 s vs 24.52 s (1.322x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |    0.4 s vs 5.142 s (12.855x faster) |  40.03 s vs 44.869 s (1.121x faster) | 18.62 s vs 24.05 s (1.292x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.483 s vs 4.87 s (10.083x faster) | 39.568 s vs 44.868 s (1.134x faster) |  18.9 s vs 24.18 s (1.279x faster) |  41 MiB vs 416 MiB (90.144% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.292 s vs 9.676 s (7.489x faster) | 71.962 s vs 80.321 s (1.116x faster) | 56.25 s vs 63.34 s (1.126x faster) | 106 MiB vs 281 MiB (62.278% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive |   0.271 s vs 9.989 s (36.86x faster) | 34.924 s vs 44.042 s (1.261x faster) | 18.52 s vs 29.31 s (1.583x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive | 0.415 s vs 10.086 s (24.304x faster) |  39.497 s vs 49.56 s (1.255x faster) | 18.83 s vs 29.26 s (1.554x faster) |  39 MiB vs 281 MiB (86.121% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |   1.099 s vs 9.766 s (8.886x faster) | 37.674 s vs 62.458 s (1.658x faster) | 18.84 s vs 29.37 s (1.559x faster) |  39 MiB vs 274 MiB (85.766% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.809 s vs 5.581 s (6.899x faster) | 66.312 s vs 73.307 s (1.105x faster) | 50.94 s vs 57.14 s (1.122x faster) | 117 MiB vs 283 MiB (58.657% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.254 s vs 5.657 s (22.272x faster) |   34.33 s vs 38.89 s (1.133x faster) | 18.62 s vs 23.85 s (1.281x faster) |  35 MiB vs 282 MiB (87.589% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |  0.364 s vs 5.729 s (15.739x faster) | 37.135 s vs 51.638 s (1.391x faster) | 18.61 s vs 23.94 s (1.286x faster) |  37 MiB vs 282 MiB (86.879% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |    1.024 s vs 5.48 s (5.352x faster) | 37.386 s vs 44.421 s (1.188x faster) | 19.31 s vs 24.18 s (1.252x faster) |  37 MiB vs 275 MiB (86.545% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.747 s vs 25.077 s (9.129x faster) | 72.455 s vs 94.751 s (1.308x faster) | 56.46 s vs 78.92 s (1.398x faster) |  58 MiB vs 219 MiB (73.516% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.512 s vs 26.866 s (52.473x faster) | 34.084 s vs 62.256 s (1.827x faster) |  18.54 s vs 46.16 s (2.49x faster) |  35 MiB vs 212 MiB (83.491% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive |  0.629 s vs 26.19 s (41.638x faster) | 39.754 s vs 72.445 s (1.822x faster) | 18.67 s vs 46.24 s (2.477x faster) |  36 MiB vs 214 MiB (83.178% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive |  1.413 s vs 26.932 s (19.06x faster) |  36.07 s vs 69.298 s (1.921x faster) |  18.76 s vs 46.3 s (2.468x faster) |  36 MiB vs 210 MiB (82.857% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.513 s vs 14.971 s (9.895x faster) |  72.36 s vs 84.188 s (1.163x faster) | 56.28 s vs 68.03 s (1.209x faster) |  62 MiB vs 223 MiB (72.197% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.443 s vs 14.881 s (33.591x faster) | 34.049 s vs 51.347 s (1.508x faster) | 18.61 s vs 34.71 s (1.865x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive |  0.599 s vs 15.02 s (25.075x faster) | 37.643 s vs 55.522 s (1.475x faster) | 18.71 s vs 34.69 s (1.854x faster) |  36 MiB vs 222 MiB (83.784% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.381 s vs 14.496 s (10.497x faster) | 38.037 s vs 55.759 s (1.466x faster) | 18.84 s vs 34.95 s (1.855x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.962 s |              9.284 s |   +7.322 s |   4.732x |   +373.191% |
| Billed duration   |              2.077 s |              9.818 s |   +7.741 s |   4.727x |   +372.701% |
| Init duration     |              0.122 s |              0.529 s |   +0.407 s |   4.336x |   +333.607% |
| Local wall time   |             72.172 s |             78.384 s |   +6.212 s |   1.086x |     +8.607% |
| CDK deploy time   |              56.57 s |              61.73 s |    +5.16 s |   1.091x |     +9.121% |
| Max memory        |              123 MiB |              447 MiB |   +324 MiB |   3.634x |   +263.415% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.246 s |              9.256 s |    +9.01 s |  37.626x |  +3662.602% |
| Billed duration   |              0.366 s |              9.776 s |    +9.41 s |   26.71x |  +2571.038% |
| Init duration     |              0.119 s |               0.52 s |   +0.401 s |    4.37x |   +336.975% |
| Local wall time   |             37.209 s |             49.069 s |   +11.86 s |   1.319x |    +31.874% |
| CDK deploy time   |              18.62 s |              29.44 s |   +10.82 s |   1.581x |     +58.11% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.468 s |              9.308 s |    +8.84 s |  19.889x |  +1888.889% |
| Billed duration   |              0.592 s |              9.825 s |   +9.233 s |  16.596x |  +1559.628% |
| Init duration     |              0.118 s |              0.517 s |   +0.399 s |   4.381x |   +338.136% |
| Local wall time   |             40.038 s |             51.511 s |  +11.473 s |   1.287x |    +28.655% |
| CDK deploy time   |              18.67 s |              29.44 s |   +10.77 s |   1.577x |    +57.686% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.511 s |              8.925 s |   +8.414 s |  17.466x |  +1646.575% |
| Billed duration   |              0.626 s |              9.455 s |   +8.829 s |  15.104x |  +1410.383% |
| Init duration     |              0.115 s |               0.53 s |   +0.415 s |   4.609x |    +360.87% |
| Local wall time   |              37.91 s |             49.981 s |  +12.071 s |   1.318x |    +31.841% |
| CDK deploy time   |              18.87 s |               29.4 s |   +10.53 s |   1.558x |    +55.803% |
| Max memory        |               40 MiB |              417 MiB |   +377 MiB |  10.425x |     +942.5% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.145 s |              5.084 s |   +3.939 s |    4.44x |   +344.017% |
| Billed duration   |              1.265 s |              5.606 s |   +4.341 s |   4.432x |   +343.162% |
| Init duration     |              0.117 s |              0.525 s |   +0.408 s |   4.487x |   +348.718% |
| Local wall time   |              70.59 s |             72.668 s |   +2.078 s |   1.029x |     +2.944% |
| CDK deploy time   |              52.41 s |              57.24 s |    +4.83 s |   1.092x |     +9.216% |
| Max memory        |              188 MiB |              447 MiB |   +259 MiB |   2.378x |   +137.766% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.22 s |              5.182 s |   +4.962 s |  23.555x |  +2255.455% |
| Billed duration   |              0.339 s |              5.688 s |   +5.349 s |  16.779x |  +1577.876% |
| Init duration     |              0.118 s |              0.511 s |   +0.393 s |   4.331x |   +333.051% |
| Local wall time   |              38.04 s |             42.419 s |   +4.379 s |   1.115x |    +11.512% |
| CDK deploy time   |              18.55 s |              24.52 s |    +5.97 s |   1.322x |    +32.183% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |                0.4 s |              5.142 s |   +4.742 s |  12.855x |    +1185.5% |
| Billed duration   |              0.552 s |              5.653 s |   +5.101 s |  10.241x |   +924.094% |
| Init duration     |              0.117 s |               0.51 s |   +0.393 s |   4.359x |   +335.897% |
| Local wall time   |              40.03 s |             44.869 s |   +4.839 s |   1.121x |    +12.088% |
| CDK deploy time   |              18.62 s |              24.05 s |    +5.43 s |   1.292x |    +29.162% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.483 s |               4.87 s |   +4.387 s |  10.083x |   +908.282% |
| Billed duration   |              0.609 s |              5.383 s |   +4.774 s |   8.839x |   +783.908% |
| Init duration     |              0.126 s |              0.512 s |   +0.386 s |   4.063x |   +306.349% |
| Local wall time   |             39.568 s |             44.868 s |     +5.3 s |   1.134x |    +13.395% |
| CDK deploy time   |               18.9 s |              24.18 s |    +5.28 s |   1.279x |    +27.937% |
| Max memory        |               41 MiB |              416 MiB |   +375 MiB |  10.146x |   +914.634% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.292 s |              9.676 s |   +8.384 s |   7.489x |   +648.916% |
| Billed duration   |               1.41 s |             10.208 s |   +8.798 s |    7.24x |   +623.972% |
| Init duration     |              0.117 s |              0.523 s |   +0.406 s |    4.47x |   +347.009% |
| Local wall time   |             71.962 s |             80.321 s |   +8.359 s |   1.116x |    +11.616% |
| CDK deploy time   |              56.25 s |              63.34 s |    +7.09 s |   1.126x |    +12.604% |
| Max memory        |              106 MiB |              281 MiB |   +175 MiB |   2.651x |   +165.094% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.271 s |              9.989 s |   +9.718 s |   36.86x |  +3585.978% |
| Billed duration   |              0.381 s |             10.602 s |  +10.221 s |  27.827x |  +2682.677% |
| Init duration     |              0.115 s |              0.558 s |   +0.443 s |   4.852x |   +385.217% |
| Local wall time   |             34.924 s |             44.042 s |   +9.118 s |   1.261x |    +26.108% |
| CDK deploy time   |              18.52 s |              29.31 s |   +10.79 s |   1.583x |    +58.261% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.415 s |             10.086 s |   +9.671 s |  24.304x |  +2330.361% |
| Billed duration   |              0.536 s |             10.614 s |  +10.078 s |  19.802x |  +1880.224% |
| Init duration     |              0.116 s |              0.532 s |   +0.416 s |   4.586x |   +358.621% |
| Local wall time   |             39.497 s |              49.56 s |  +10.063 s |   1.255x |    +25.478% |
| CDK deploy time   |              18.83 s |              29.26 s |   +10.43 s |   1.554x |     +55.39% |
| Max memory        |               39 MiB |              281 MiB |   +242 MiB |   7.205x |   +620.513% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.099 s |              9.766 s |   +8.667 s |   8.886x |   +788.626% |
| Billed duration   |               1.25 s |             10.275 s |   +9.025 s |    8.22x |       +722% |
| Init duration     |              0.116 s |              0.508 s |   +0.392 s |   4.379x |   +337.931% |
| Local wall time   |             37.674 s |             62.458 s |  +24.784 s |   1.658x |    +65.785% |
| CDK deploy time   |              18.84 s |              29.37 s |   +10.53 s |   1.559x |    +55.892% |
| Max memory        |               39 MiB |              274 MiB |   +235 MiB |   7.026x |   +602.564% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.809 s |              5.581 s |   +4.772 s |   6.899x |   +589.864% |
| Billed duration   |              0.929 s |              6.102 s |   +5.173 s |   6.568x |   +556.835% |
| Init duration     |              0.118 s |              0.514 s |   +0.396 s |   4.356x |   +335.593% |
| Local wall time   |             66.312 s |             73.307 s |   +6.995 s |   1.105x |    +10.549% |
| CDK deploy time   |              50.94 s |              57.14 s |     +6.2 s |   1.122x |    +12.171% |
| Max memory        |              117 MiB |              283 MiB |   +166 MiB |   2.419x |    +141.88% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.254 s |              5.657 s |   +5.403 s |  22.272x |  +2127.165% |
| Billed duration   |              0.373 s |              6.173 s |     +5.8 s |   16.55x |   +1554.96% |
| Init duration     |              0.119 s |              0.515 s |   +0.396 s |   4.328x |   +332.773% |
| Local wall time   |              34.33 s |              38.89 s |    +4.56 s |   1.133x |    +13.283% |
| CDK deploy time   |              18.62 s |              23.85 s |    +5.23 s |   1.281x |    +28.088% |
| Max memory        |               35 MiB |              282 MiB |   +247 MiB |   8.057x |   +705.714% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.364 s |              5.729 s |   +5.365 s |  15.739x |  +1473.901% |
| Billed duration   |              0.485 s |              6.525 s |    +6.04 s |  13.454x |  +1245.361% |
| Init duration     |              0.118 s |              0.528 s |    +0.41 s |   4.475x |   +347.458% |
| Local wall time   |             37.135 s |             51.638 s |  +14.503 s |   1.391x |    +39.055% |
| CDK deploy time   |              18.61 s |              23.94 s |    +5.33 s |   1.286x |    +28.641% |
| Max memory        |               37 MiB |              282 MiB |   +245 MiB |   7.622x |   +662.162% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.024 s |               5.48 s |   +4.456 s |   5.352x |   +435.156% |
| Billed duration   |               1.14 s |              5.992 s |   +4.852 s |   5.256x |   +425.614% |
| Init duration     |              0.118 s |              0.512 s |   +0.394 s |   4.339x |   +333.898% |
| Local wall time   |             37.386 s |             44.421 s |   +7.035 s |   1.188x |    +18.817% |
| CDK deploy time   |              19.31 s |              24.18 s |    +4.87 s |   1.252x |     +25.22% |
| Max memory        |               37 MiB |              275 MiB |   +238 MiB |   7.432x |   +643.243% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.747 s |             25.077 s |   +22.33 s |   9.129x |   +812.887% |
| Billed duration   |              2.878 s |             25.617 s |  +22.739 s |   8.901x |   +790.097% |
| Init duration     |              0.117 s |              0.509 s |   +0.392 s |    4.35x |   +335.043% |
| Local wall time   |             72.455 s |             94.751 s |  +22.296 s |   1.308x |    +30.772% |
| CDK deploy time   |              56.46 s |              78.92 s |   +22.46 s |   1.398x |     +39.78% |
| Max memory        |               58 MiB |              219 MiB |   +161 MiB |   3.776x |   +277.586% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.512 s |             26.866 s |  +26.354 s |  52.473x |  +5147.266% |
| Billed duration   |              0.626 s |             27.391 s |  +26.765 s |  43.756x |  +4275.559% |
| Init duration     |              0.114 s |              0.525 s |   +0.411 s |   4.605x |   +360.526% |
| Local wall time   |             34.084 s |             62.256 s |  +28.172 s |   1.827x |    +82.655% |
| CDK deploy time   |              18.54 s |              46.16 s |   +27.62 s |    2.49x |   +148.975% |
| Max memory        |               35 MiB |              212 MiB |   +177 MiB |   6.057x |   +505.714% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.629 s |              26.19 s |  +25.561 s |  41.638x |  +4063.752% |
| Billed duration   |              0.746 s |             26.707 s |  +25.961 s |    35.8x |  +3480.027% |
| Init duration     |              0.117 s |              0.516 s |   +0.399 s |    4.41x |   +341.026% |
| Local wall time   |             39.754 s |             72.445 s |  +32.691 s |   1.822x |    +82.233% |
| CDK deploy time   |              18.67 s |              46.24 s |   +27.57 s |   2.477x |    +147.67% |
| Max memory        |               36 MiB |              214 MiB |   +178 MiB |   5.944x |   +494.444% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.413 s |             26.932 s |  +25.519 s |   19.06x |  +1806.016% |
| Billed duration   |              1.527 s |             27.474 s |  +25.947 s |  17.992x |  +1699.214% |
| Init duration     |              0.116 s |              0.537 s |   +0.421 s |   4.629x |   +362.931% |
| Local wall time   |              36.07 s |             69.298 s |  +33.228 s |   1.921x |    +92.121% |
| CDK deploy time   |              18.76 s |               46.3 s |   +27.54 s |   2.468x |   +146.802% |
| Max memory        |               36 MiB |              210 MiB |   +174 MiB |   5.833x |   +483.333% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.513 s |             14.971 s |  +13.458 s |   9.895x |   +889.491% |
| Billed duration   |               1.63 s |             15.543 s |  +13.913 s |   9.536x |   +853.558% |
| Init duration     |              0.116 s |              0.529 s |   +0.413 s |    4.56x |   +356.034% |
| Local wall time   |              72.36 s |             84.188 s |  +11.828 s |   1.163x |    +16.346% |
| CDK deploy time   |              56.28 s |              68.03 s |   +11.75 s |   1.209x |    +20.878% |
| Max memory        |               62 MiB |              223 MiB |   +161 MiB |   3.597x |   +259.677% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.443 s |             14.881 s |  +14.438 s |  33.591x |  +3259.142% |
| Billed duration   |              0.568 s |             15.394 s |  +14.826 s |  27.102x |  +2610.211% |
| Init duration     |              0.117 s |              0.512 s |   +0.395 s |   4.376x |   +337.607% |
| Local wall time   |             34.049 s |             51.347 s |  +17.298 s |   1.508x |    +50.803% |
| CDK deploy time   |              18.61 s |              34.71 s |    +16.1 s |   1.865x |    +86.513% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.599 s |              15.02 s |  +14.421 s |  25.075x |  +2407.513% |
| Billed duration   |              0.717 s |             15.534 s |  +14.817 s |  21.665x |  +2066.527% |
| Init duration     |              0.116 s |              0.514 s |   +0.398 s |   4.431x |   +343.103% |
| Local wall time   |             37.643 s |             55.522 s |  +17.879 s |   1.475x |    +47.496% |
| CDK deploy time   |              18.71 s |              34.69 s |   +15.98 s |   1.854x |    +85.409% |
| Max memory        |               36 MiB |              222 MiB |   +186 MiB |   6.167x |   +516.667% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.381 s |             14.496 s |  +13.115 s |  10.497x |   +949.674% |
| Billed duration   |              1.498 s |             15.056 s |  +13.558 s |  10.051x |   +905.073% |
| Init duration     |              0.118 s |              0.516 s |   +0.398 s |   4.373x |   +337.288% |
| Local wall time   |             38.037 s |             55.759 s |  +17.722 s |   1.466x |    +46.591% |
| CDK deploy time   |              18.84 s |              34.95 s |   +16.11 s |   1.855x |     +85.51% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.284 |  9.277 |  9.302 |   0.025 |   9.058 |   9.327 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.256 |  8.991 |  9.258 |   0.267 |   8.638 |   9.462 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.308 |   9.21 |  9.379 |   0.169 |   9.145 |    9.61 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.925 |  8.863 |  9.115 |   0.252 |   7.958 |   9.173 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.962 |  1.959 |  2.011 |   0.052 |    1.89 |   2.058 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.246 |  0.243 |   0.25 |   0.007 |   0.237 |   0.288 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.468 |   0.45 |  0.474 |   0.024 |   0.432 |    0.59 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.511 |  0.494 |  0.545 |   0.051 |   0.491 |   0.655 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.084 |  5.056 |  5.185 |   0.129 |   5.055 |   5.885 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.182 |  5.058 |  5.273 |   0.215 |   4.735 |   5.292 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.142 |  5.076 |  5.198 |   0.122 |   5.071 |   5.198 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       4.87 |  4.867 |   5.02 |   0.153 |   4.742 |   5.614 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.145 |   1.09 |  1.166 |   0.076 |   1.018 |   1.199 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       0.22 |  0.215 |  0.221 |   0.006 |   0.203 |   0.223 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |        0.4 |  0.396 |  0.403 |   0.007 |    0.39 |   0.467 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.483 |  0.475 |  0.498 |   0.023 |   0.452 |   0.503 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.676 |  9.651 |  9.807 |   0.156 |    9.62 |   9.859 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.989 |  9.754 | 10.068 |   0.314 |   9.568 |  10.088 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.086 |  9.987 | 10.194 |   0.207 |   9.765 |  10.306 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.766 |  9.448 |  9.777 |   0.329 |   9.127 |  10.092 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.292 |  1.283 |  1.315 |   0.032 |   1.245 |   1.344 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.271 |   0.27 |  0.271 |   0.001 |   0.256 |   0.277 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.415 |  0.402 |  0.424 |   0.022 |   0.388 |   0.433 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.099 |  1.083 |  1.176 |   0.093 |   1.078 |   1.176 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.581 |   5.55 |  5.689 |   0.139 |   5.532 |   5.731 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.657 |  5.641 |  5.776 |   0.135 |   5.045 |   5.868 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.729 |  5.721 |  5.745 |   0.024 |   5.688 |   6.471 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |       5.48 |  5.441 |  5.616 |   0.175 |   5.337 |   5.682 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.809 |  0.796 |  0.845 |   0.049 |   0.784 |   0.845 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.254 |  0.253 |  0.256 |   0.003 |   0.247 |   0.266 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.364 |  0.362 |  0.375 |   0.013 |   0.361 |   0.491 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.024 |  1.016 |  1.027 |   0.011 |   1.009 |   1.068 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.077 | 24.837 | 25.803 |   0.966 |  24.652 |  26.984 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.866 | 26.613 | 27.436 |   0.823 |  26.352 |  30.032 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      26.19 | 25.923 | 26.872 |   0.949 |   25.28 |  28.824 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.932 | 25.674 | 27.177 |   1.503 |  25.613 |  29.575 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.747 |   2.68 |  2.825 |   0.145 |   2.617 |   2.848 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.512 |  0.485 |  0.519 |   0.034 |   0.439 |   0.564 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.629 |  0.591 |   0.65 |   0.059 |   0.579 |   0.664 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.413 |  1.395 |  1.453 |   0.058 |   1.377 |   1.493 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     14.971 | 14.719 | 15.065 |   0.346 |  14.646 |  15.391 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     14.881 | 14.552 | 15.163 |   0.611 |   14.48 |  15.792 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      15.02 | 14.894 | 15.337 |   0.443 |  14.794 |  15.602 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.496 |  14.48 | 14.619 |   0.139 |  14.186 |  14.786 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.513 |  1.501 |  1.544 |   0.043 |     1.5 |    1.64 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.443 |  0.439 |  0.519 |    0.08 |   0.436 |   0.558 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.599 |  0.584 |  0.605 |   0.021 |   0.521 |   0.643 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.381 |  1.346 |  1.382 |   0.036 |   1.318 |   1.433 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.284 s
large-few unchanged-update 1024//adaptive aws    | ########## 9.256 s
large-few changed-update 1024//adaptive aws      | ########## 9.308 s
large-few pruned-update 1024//adaptive aws       | ########## 8.925 s
large-few cold-create 1024/32/adaptive shin      | ## 1.962 s
large-few unchanged-update 1024/32/adaptive shin | # 0.246 s
large-few changed-update 1024/32/adaptive shin   | # 0.468 s
large-few pruned-update 1024/32/adaptive shin    | # 0.511 s
large-few cold-create 2048//adaptive aws         | ###### 5.084 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.182 s
large-few changed-update 2048//adaptive aws      | ###### 5.142 s
large-few pruned-update 2048//adaptive aws       | ##### 4.87 s
large-few cold-create 2048/64/adaptive shin      | # 1.145 s
large-few unchanged-update 2048/64/adaptive shin | # 0.22 s
large-few changed-update 2048/64/adaptive shin   | # 0.4 s
large-few pruned-update 2048/64/adaptive shin    | # 0.483 s
mixed cold-create 1024//adaptive aws             | ########### 9.676 s
mixed unchanged-update 1024//adaptive aws        | ########### 9.989 s
mixed changed-update 1024//adaptive aws          | ########### 10.086 s
mixed pruned-update 1024//adaptive aws           | ########### 9.766 s
mixed cold-create 1024/32/adaptive shin          | # 1.292 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.271 s
mixed changed-update 1024/32/adaptive shin       | # 0.415 s
mixed pruned-update 1024/32/adaptive shin        | # 1.099 s
mixed cold-create 2048//adaptive aws             | ###### 5.581 s
mixed unchanged-update 2048//adaptive aws        | ###### 5.657 s
mixed changed-update 2048//adaptive aws          | ###### 5.729 s
mixed pruned-update 2048//adaptive aws           | ###### 5.48 s
mixed cold-create 2048/64/adaptive shin          | # 0.809 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.254 s
mixed changed-update 2048/64/adaptive shin       | # 0.364 s
mixed pruned-update 2048/64/adaptive shin        | # 1.024 s
tiny-many cold-create 1024//adaptive aws         | ############################ 25.077 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 26.866 s
tiny-many changed-update 1024//adaptive aws      | ############################# 26.19 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 26.932 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.747 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.512 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.629 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.413 s
tiny-many cold-create 2048//adaptive aws         | ################# 14.971 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 14.881 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.02 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.496 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.513 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.443 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.599 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.381 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.818 |  9.806 |  9.831 |   0.025 |   9.602 |   9.845 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.776 |  9.498 |   9.79 |   0.292 |   9.133 |  10.007 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.825 |  9.745 |  9.914 |   0.169 |   9.656 |  10.127 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.455 |  9.383 |  9.621 |   0.238 |   8.498 |   9.731 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.077 |  2.059 |  2.133 |   0.074 |    2.02 |   2.216 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.366 |  0.365 |  0.368 |   0.003 |   0.355 |   0.411 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.592 |  0.568 |   0.63 |   0.062 |   0.547 |   0.705 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.626 |  0.609 |  0.666 |   0.057 |   0.605 |   0.778 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.606 |  5.591 |   5.71 |   0.119 |   5.588 |   6.321 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.688 |  5.595 |  5.803 |   0.208 |   5.198 |   5.811 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.653 |  5.591 |  5.707 |   0.116 |   5.574 |   5.735 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.383 |  5.383 |   5.54 |   0.157 |   5.244 |   6.039 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.265 |  1.206 |  1.287 |   0.081 |   1.112 |   1.317 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.339 |  0.333 |  0.339 |   0.006 |   0.326 |    0.34 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.552 |  0.519 |  0.553 |   0.034 |   0.486 |   0.585 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.609 |  0.594 |  0.648 |   0.054 |   0.573 |    0.66 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.208 | 10.167 | 10.331 |   0.164 |  10.141 |  10.653 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.602 | 10.312 | 10.651 |   0.339 |  10.067 |  10.815 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.614 | 10.535 | 10.728 |   0.193 |  10.272 |  10.839 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.275 |  9.953 | 10.316 |   0.363 |   9.615 |  10.622 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       1.41 |    1.4 |  1.432 |   0.032 |   1.359 |   1.469 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.381 |  0.368 |  0.388 |    0.02 |   0.367 |   0.392 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.536 |  0.518 |  0.539 |   0.021 |   0.505 |   0.549 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |       1.25 |  1.242 |  1.272 |    0.03 |   1.194 |   1.293 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.102 |  6.046 |  6.209 |   0.163 |   6.037 |   6.245 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      6.173 |  6.153 |  6.293 |    0.14 |   5.491 |    6.42 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.525 |  6.264 |   6.53 |   0.266 |   6.216 |   6.907 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.992 |  5.953 |  6.141 |   0.188 |   5.847 |   6.214 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.929 |  0.914 |  0.961 |   0.047 |   0.904 |   0.961 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.373 |  0.372 |  0.375 |   0.003 |   0.371 |   0.381 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.485 |  0.481 |  0.493 |   0.012 |   0.457 |    0.61 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       1.14 |  1.135 |  1.145 |    0.01 |   1.127 |   1.194 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     25.617 | 25.339 | 26.313 |   0.974 |  25.161 |  27.525 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     27.391 | 27.146 | 27.978 |   0.832 |  26.855 |  30.462 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     26.707 | 26.422 |  27.41 |   0.988 |   25.78 |  29.453 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     27.474 | 26.211 | 27.747 |   1.536 |  26.131 |  29.998 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.878 |  2.797 |  2.942 |   0.145 |   2.732 |   2.982 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.626 |  0.604 |  0.634 |    0.03 |   0.533 |   0.692 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.746 |  0.705 |   0.77 |   0.065 |   0.672 |   0.782 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.527 |  1.519 |   1.57 |   0.051 |   1.492 |    1.61 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.543 | 15.249 | 15.587 |   0.338 |  15.154 |  15.938 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.394 | 15.041 | 15.681 |    0.64 |  14.975 |  16.349 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.534 | 15.377 | 15.871 |   0.494 |  15.301 |  16.182 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.056 | 15.036 | 15.135 |   0.099 |  15.009 |  15.295 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |       1.63 |  1.626 |  1.658 |   0.032 |   1.616 |   1.789 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.568 |  0.559 |  0.636 |   0.077 |   0.533 |    0.71 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.717 |    0.7 |  0.724 |   0.024 |   0.635 |   0.759 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.498 |  1.469 |    1.5 |   0.031 |   1.435 |    1.57 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.818 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.776 s
large-few changed-update 1024//adaptive aws      | ########### 9.825 s
large-few pruned-update 1024//adaptive aws       | ########## 9.455 s
large-few cold-create 1024/32/adaptive shin      | ## 2.077 s
large-few unchanged-update 1024/32/adaptive shin | # 0.366 s
large-few changed-update 1024/32/adaptive shin   | # 0.592 s
large-few pruned-update 1024/32/adaptive shin    | # 0.626 s
large-few cold-create 2048//adaptive aws         | ###### 5.606 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.688 s
large-few changed-update 2048//adaptive aws      | ###### 5.653 s
large-few pruned-update 2048//adaptive aws       | ###### 5.383 s
large-few cold-create 2048/64/adaptive shin      | # 1.265 s
large-few unchanged-update 2048/64/adaptive shin | # 0.339 s
large-few changed-update 2048/64/adaptive shin   | # 0.552 s
large-few pruned-update 2048/64/adaptive shin    | # 0.609 s
mixed cold-create 1024//adaptive aws             | ########### 10.208 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.602 s
mixed changed-update 1024//adaptive aws          | ############ 10.614 s
mixed pruned-update 1024//adaptive aws           | ########### 10.275 s
mixed cold-create 1024/32/adaptive shin          | ## 1.41 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.381 s
mixed changed-update 1024/32/adaptive shin       | # 0.536 s
mixed pruned-update 1024/32/adaptive shin        | # 1.25 s
mixed cold-create 2048//adaptive aws             | ####### 6.102 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.173 s
mixed changed-update 2048//adaptive aws          | ####### 6.525 s
mixed pruned-update 2048//adaptive aws           | ####### 5.992 s
mixed cold-create 2048/64/adaptive shin          | # 0.929 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.373 s
mixed changed-update 2048/64/adaptive shin       | # 0.485 s
mixed pruned-update 2048/64/adaptive shin        | # 1.14 s
tiny-many cold-create 1024//adaptive aws         | ############################ 25.617 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 27.391 s
tiny-many changed-update 1024//adaptive aws      | ############################# 26.707 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 27.474 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.878 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.626 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.746 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.527 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.543 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.394 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.534 s
tiny-many pruned-update 2048//adaptive aws       | ################ 15.056 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.63 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.568 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.717 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.498 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.529 |  0.528 |  0.533 |   0.005 |   0.517 |   0.543 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       0.52 |  0.506 |  0.532 |   0.026 |   0.494 |   0.545 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.517 |  0.516 |  0.534 |   0.018 |    0.51 |   0.534 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       0.53 |   0.52 |   0.54 |    0.02 |   0.506 |   0.558 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |  0.117 |   0.13 |   0.013 |   0.096 |   0.158 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.117 |  0.123 |   0.006 |   0.117 |   0.123 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.115 |  0.124 |   0.009 |   0.115 |   0.155 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.114 |  0.121 |   0.007 |   0.113 |   0.123 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.525 |  0.521 |  0.533 |   0.012 |   0.435 |   0.534 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.511 |  0.505 |  0.537 |   0.032 |   0.463 |   0.537 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       0.51 |  0.508 |  0.514 |   0.006 |   0.503 |   0.536 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.512 |  0.502 |  0.515 |   0.013 |   0.424 |   0.519 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |   0.12 |   0.005 |   0.094 |   0.121 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.119 |   0.001 |   0.116 |   0.122 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.151 |   0.035 |   0.095 |   0.156 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.126 |   0.12 |  0.149 |   0.029 |   0.119 |   0.156 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.523 |  0.521 |  0.531 |    0.01 |   0.516 |   0.794 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.558 |  0.533 |  0.562 |   0.029 |   0.498 |   0.825 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.532 |  0.528 |  0.534 |   0.006 |   0.507 |   0.548 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.508 |  0.505 |  0.529 |   0.024 |   0.487 |   0.538 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.118 |   0.002 |   0.114 |   0.124 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.115 |  0.097 |  0.117 |    0.02 |   0.096 |   0.125 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.115 |  0.117 |   0.002 |   0.115 |   0.121 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.151 |   0.035 |   0.095 |   0.158 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.514 |  0.505 |   0.52 |   0.015 |   0.495 |   0.521 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.515 |  0.511 |  0.517 |   0.006 |   0.445 |   0.551 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.528 |  0.518 |  0.801 |   0.283 |   0.436 |   0.803 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.512 |  0.511 |  0.525 |   0.014 |    0.51 |   0.531 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.116 |  0.119 |   0.003 |   0.115 |    0.12 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.115 |  0.119 |   0.004 |   0.114 |   0.127 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.118 |  0.119 |   0.001 |   0.096 |    0.12 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.119 |   0.002 |   0.116 |   0.125 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.509 |  0.509 |  0.539 |    0.03 |   0.502 |    0.54 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.525 |  0.502 |  0.532 |    0.03 |   0.429 |   0.541 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.516 |    0.5 |  0.538 |   0.038 |   0.499 |   0.629 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.537 |  0.518 |  0.542 |   0.024 |   0.422 |    0.57 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.131 |   0.015 |   0.115 |   0.133 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.114 |  0.114 |  0.119 |   0.005 |   0.093 |   0.128 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.117 |  0.114 |  0.118 |   0.004 |   0.092 |    0.12 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.116 |  0.114 |  0.117 |   0.003 |   0.114 |   0.124 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.529 |  0.521 |  0.546 |   0.025 |   0.508 |   0.571 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.512 |  0.494 |  0.518 |   0.024 |   0.489 |   0.557 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.514 |  0.506 |  0.534 |   0.028 |   0.482 |    0.58 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.516 |  0.512 |  0.556 |   0.044 |   0.509 |   0.869 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.125 |   0.009 |   0.114 |   0.148 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.115 |  0.128 |   0.013 |   0.096 |   0.151 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.116 |  0.116 |  0.117 |   0.001 |   0.114 |   0.118 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.122 |   0.005 |   0.116 |   0.136 |

```text
large-few cold-create 1024//adaptive aws         | ############################ 0.529 s
large-few unchanged-update 1024//adaptive aws    | ############################ 0.52 s
large-few changed-update 1024//adaptive aws      | ############################ 0.517 s
large-few pruned-update 1024//adaptive aws       | ############################ 0.53 s
large-few cold-create 1024/32/adaptive shin      | ####### 0.122 s
large-few unchanged-update 1024/32/adaptive shin | ###### 0.119 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.118 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.115 s
large-few cold-create 2048//adaptive aws         | ############################ 0.525 s
large-few unchanged-update 2048//adaptive aws    | ########################### 0.511 s
large-few changed-update 2048//adaptive aws      | ########################### 0.51 s
large-few pruned-update 2048//adaptive aws       | ############################ 0.512 s
large-few cold-create 2048/64/adaptive shin      | ###### 0.117 s
large-few unchanged-update 2048/64/adaptive shin | ###### 0.118 s
large-few changed-update 2048/64/adaptive shin   | ###### 0.117 s
large-few pruned-update 2048/64/adaptive shin    | ####### 0.126 s
mixed cold-create 1024//adaptive aws             | ############################ 0.523 s
mixed unchanged-update 1024//adaptive aws        | ############################## 0.558 s
mixed changed-update 1024//adaptive aws          | ############################# 0.532 s
mixed pruned-update 1024//adaptive aws           | ########################### 0.508 s
mixed cold-create 1024/32/adaptive shin          | ###### 0.117 s
mixed unchanged-update 1024/32/adaptive shin     | ###### 0.115 s
mixed changed-update 1024/32/adaptive shin       | ###### 0.116 s
mixed pruned-update 1024/32/adaptive shin        | ###### 0.116 s
mixed cold-create 2048//adaptive aws             | ############################ 0.514 s
mixed unchanged-update 2048//adaptive aws        | ############################ 0.515 s
mixed changed-update 2048//adaptive aws          | ############################ 0.528 s
mixed pruned-update 2048//adaptive aws           | ############################ 0.512 s
mixed cold-create 2048/64/adaptive shin          | ###### 0.118 s
mixed unchanged-update 2048/64/adaptive shin     | ###### 0.119 s
mixed changed-update 2048/64/adaptive shin       | ###### 0.118 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.118 s
tiny-many cold-create 1024//adaptive aws         | ########################### 0.509 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 0.525 s
tiny-many changed-update 1024//adaptive aws      | ############################ 0.516 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 0.537 s
tiny-many cold-create 1024/32/adaptive shin      | ###### 0.117 s
tiny-many unchanged-update 1024/32/adaptive shin | ###### 0.114 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.117 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.116 s
tiny-many cold-create 2048//adaptive aws         | ############################ 0.529 s
tiny-many unchanged-update 2048//adaptive aws    | ############################ 0.512 s
tiny-many changed-update 2048//adaptive aws      | ############################ 0.514 s
tiny-many pruned-update 2048//adaptive aws       | ############################ 0.516 s
tiny-many cold-create 2048/64/adaptive shin      | ###### 0.116 s
tiny-many unchanged-update 2048/64/adaptive shin | ###### 0.117 s
tiny-many changed-update 2048/64/adaptive shin   | ###### 0.116 s
tiny-many pruned-update 2048/64/adaptive shin    | ###### 0.118 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     78.384 | 77.913 | 80.004 |   2.091 |  76.628 |  81.204 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     49.069 | 48.554 | 49.229 |   0.675 |   44.51 |  67.371 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     51.511 | 49.749 | 52.988 |   3.239 |  47.847 |  64.894 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     49.981 | 48.189 | 50.099 |    1.91 |  48.073 |    51.9 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     72.172 | 71.653 | 73.254 |   1.601 |  69.437 |  75.287 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     37.209 |   33.6 | 38.439 |   4.839 |  32.561 |  41.109 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     40.038 | 39.957 | 40.374 |   0.417 |  35.621 |  41.132 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      37.91 | 37.253 | 39.582 |   2.329 |  35.877 |  44.942 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     72.668 | 71.179 | 73.888 |   2.709 |  71.113 |  74.659 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     42.419 | 40.744 | 44.448 |   3.704 |  38.373 |   52.74 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     44.869 | 44.594 |  46.31 |   1.716 |  42.674 |  47.213 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     44.868 | 44.525 | 46.136 |   1.611 |  42.181 |  47.676 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      70.59 |  69.27 | 74.666 |   5.396 |  65.997 |  92.244 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      38.04 | 37.532 |  38.64 |   1.108 |  33.826 |  41.721 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      40.03 |  39.79 | 40.579 |   0.789 |   36.76 |  42.767 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     39.568 | 37.764 | 42.892 |   5.128 |  34.357 |  45.561 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     80.321 |  78.61 | 80.357 |   1.747 |  77.902 |  81.982 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     44.042 | 43.819 | 46.094 |   2.275 |  42.356 |  47.271 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      49.56 | 47.585 | 49.876 |   2.291 |  47.195 |  52.975 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     62.458 | 47.882 | 68.252 |   20.37 |  44.496 |  69.433 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     71.962 | 71.067 | 73.797 |    2.73 |  66.509 |  75.452 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     34.924 | 33.562 | 35.117 |   1.555 |  32.502 |  37.144 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     39.497 | 37.232 | 39.988 |   2.756 |  37.215 |  41.334 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.674 | 37.245 | 39.919 |   2.674 |  33.995 |   41.33 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     73.307 | 71.339 | 78.623 |   7.284 |  70.644 |  79.154 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      38.89 | 38.337 | 40.497 |    2.16 |  36.965 |  41.881 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     51.638 | 44.739 |  63.48 |  18.741 |  38.509 |  65.163 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     44.421 | 42.977 |  44.71 |   1.733 |  42.643 |  46.281 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     66.312 | 65.547 | 67.745 |   2.198 |  63.323 |  68.641 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      34.33 | 33.227 | 35.932 |   2.705 |  32.397 |  36.698 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.135 | 35.661 | 37.666 |   2.005 |  33.305 |  41.216 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     37.386 | 35.679 | 42.543 |   6.864 |  34.167 |  45.497 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     94.751 | 93.499 | 95.452 |   1.953 |  92.061 | 101.956 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     62.256 | 60.517 | 64.149 |   3.632 |  60.209 |  65.121 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     72.445 | 72.384 | 74.452 |   2.068 |  71.756 |  87.918 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     69.298 | 66.903 | 70.949 |   4.046 |  63.886 |  71.768 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     72.455 | 71.851 | 73.789 |   1.938 |  70.165 |  75.907 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     34.084 | 32.791 | 35.464 |   2.673 |  32.649 |  37.031 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     39.754 | 37.901 |  39.83 |   1.929 |  37.729 |  41.806 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      36.07 | 35.505 | 37.815 |    2.31 |  33.667 |  38.276 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     84.188 | 81.973 | 84.872 |   2.899 |  81.859 |  85.371 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     51.347 | 49.931 | 53.066 |   3.135 |  49.387 |  53.695 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     55.522 | 55.214 |  57.45 |   2.236 |  54.337 |  58.984 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     55.759 | 53.489 | 57.683 |   4.194 |  50.919 |  59.345 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      72.36 | 70.718 | 74.249 |   3.531 |  69.132 |  75.419 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     34.049 | 32.989 | 35.436 |   2.447 |  32.512 |  36.754 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.643 | 36.035 | 37.978 |   1.943 |  33.607 |  39.919 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.037 | 37.861 | 39.912 |   2.051 |  35.905 |  40.222 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 78.384 s
large-few unchanged-update 1024//adaptive aws    | ################ 49.069 s
large-few changed-update 1024//adaptive aws      | ################ 51.511 s
large-few pruned-update 1024//adaptive aws       | ################ 49.981 s
large-few cold-create 1024/32/adaptive shin      | ####################### 72.172 s
large-few unchanged-update 1024/32/adaptive shin | ############ 37.209 s
large-few changed-update 1024/32/adaptive shin   | ############# 40.038 s
large-few pruned-update 1024/32/adaptive shin    | ############ 37.91 s
large-few cold-create 2048//adaptive aws         | ####################### 72.668 s
large-few unchanged-update 2048//adaptive aws    | ############# 42.419 s
large-few changed-update 2048//adaptive aws      | ############## 44.869 s
large-few pruned-update 2048//adaptive aws       | ############## 44.868 s
large-few cold-create 2048/64/adaptive shin      | ###################### 70.59 s
large-few unchanged-update 2048/64/adaptive shin | ############ 38.04 s
large-few changed-update 2048/64/adaptive shin   | ############# 40.03 s
large-few pruned-update 2048/64/adaptive shin    | ############# 39.568 s
mixed cold-create 1024//adaptive aws             | ######################### 80.321 s
mixed unchanged-update 1024//adaptive aws        | ############## 44.042 s
mixed changed-update 1024//adaptive aws          | ################ 49.56 s
mixed pruned-update 1024//adaptive aws           | #################### 62.458 s
mixed cold-create 1024/32/adaptive shin          | ####################### 71.962 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 34.924 s
mixed changed-update 1024/32/adaptive shin       | ############# 39.497 s
mixed pruned-update 1024/32/adaptive shin        | ############ 37.674 s
mixed cold-create 2048//adaptive aws             | ####################### 73.307 s
mixed unchanged-update 2048//adaptive aws        | ############ 38.89 s
mixed changed-update 2048//adaptive aws          | ################ 51.638 s
mixed pruned-update 2048//adaptive aws           | ############## 44.421 s
mixed cold-create 2048/64/adaptive shin          | ##################### 66.312 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 34.33 s
mixed changed-update 2048/64/adaptive shin       | ############ 37.135 s
mixed pruned-update 2048/64/adaptive shin        | ############ 37.386 s
tiny-many cold-create 1024//adaptive aws         | ############################## 94.751 s
tiny-many unchanged-update 1024//adaptive aws    | #################### 62.256 s
tiny-many changed-update 1024//adaptive aws      | ####################### 72.445 s
tiny-many pruned-update 1024//adaptive aws       | ###################### 69.298 s
tiny-many cold-create 1024/32/adaptive shin      | ####################### 72.455 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 34.084 s
tiny-many changed-update 1024/32/adaptive shin   | ############# 39.754 s
tiny-many pruned-update 1024/32/adaptive shin    | ########### 36.07 s
tiny-many cold-create 2048//adaptive aws         | ########################### 84.188 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 51.347 s
tiny-many changed-update 2048//adaptive aws      | ################## 55.522 s
tiny-many pruned-update 2048//adaptive aws       | ################## 55.759 s
tiny-many cold-create 2048/64/adaptive shin      | ####################### 72.36 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 34.049 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 37.643 s
tiny-many pruned-update 2048/64/adaptive shin    | ############ 38.037 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      61.73 |  61.68 |  62.56 |    0.88 |   60.83 |   63.26 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.44 |  29.35 |  29.83 |    0.48 |   28.67 |    30.4 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.44 |  29.28 |  29.85 |    0.57 |   28.48 |   30.38 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       29.4 |  29.34 |     30 |    0.66 |   28.64 |   30.83 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      56.57 |  56.43 |  57.74 |    1.31 |   55.61 |   57.89 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.62 |  18.54 |     19 |    0.46 |   17.84 |    19.4 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.67 |  18.58 |  19.14 |    0.56 |    18.1 |    19.5 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.87 |  18.76 |  19.22 |    0.46 |   18.02 |   19.98 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.24 |  56.41 |  57.89 |    1.48 |   56.36 |   61.31 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.52 |  24.03 |  24.85 |    0.82 |   23.37 |   29.29 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.05 |  23.87 |  24.45 |    0.58 |   23.27 |   24.83 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.18 |  24.12 |  24.53 |    0.41 |   23.25 |   25.24 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      52.41 |   52.3 |  55.48 |    3.18 |   51.13 |   56.42 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.55 |  18.55 |     19 |    0.45 |   17.94 |   19.45 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.62 |  18.58 |  19.19 |    0.61 |   18.01 |   19.56 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       18.9 |  18.68 |  19.33 |    0.65 |   18.08 |   19.84 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      63.34 |  62.61 |  65.88 |    3.27 |   61.61 |   67.13 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      29.31 |  29.11 |  29.89 |    0.78 |   28.55 |   30.38 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      29.26 |  29.23 |  29.83 |     0.6 |   28.46 |   30.48 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      29.37 |  29.22 |  29.99 |    0.77 |   28.74 |   30.84 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      56.25 |   55.5 |  57.17 |    1.67 |   51.06 |    57.9 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.52 |  18.42 |  18.97 |    0.55 |   17.88 |   19.43 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.83 |  18.68 |  19.12 |    0.44 |    17.9 |   19.51 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.84 |  18.75 |  19.28 |    0.53 |   18.03 |   19.86 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.14 |  56.34 |  57.83 |    1.49 |   56.33 |   60.88 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      23.85 |  23.81 |  24.49 |    0.68 |   23.34 |   24.88 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      23.94 |  23.85 |  24.49 |    0.64 |   23.15 |   24.84 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      24.18 |  24.15 |  24.61 |    0.46 |   23.53 |   25.23 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      50.94 |  50.75 |  52.22 |    1.47 |   49.82 |    52.4 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.62 |  18.48 |  19.04 |    0.56 |   17.94 |   19.42 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.61 |  18.58 |  19.17 |    0.59 |   17.96 |   19.52 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.31 |  18.86 |  19.86 |       1 |   18.03 |   24.09 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      78.92 |  77.86 |  81.64 |    3.78 |   77.81 |   85.31 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      46.16 |  45.51 |  47.17 |    1.66 |   45.32 |   50.09 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      46.24 |  45.59 |  47.21 |    1.62 |   44.46 |   50.77 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |       46.3 |  45.62 |  49.75 |    4.13 |    45.6 |   53.27 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      56.46 |  56.27 |   57.7 |    1.43 |   55.58 |   57.85 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      18.54 |   18.5 |  19.07 |    0.57 |   17.86 |   19.35 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      18.67 |   18.6 |  19.15 |    0.55 |   17.91 |   19.55 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      18.76 |  18.74 |  19.26 |    0.52 |   18.03 |   20.02 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      68.03 |  67.17 |  68.83 |    1.66 |   66.98 |   71.16 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      34.71 |  34.68 |  35.28 |     0.6 |    34.3 |   36.03 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      34.69 |  34.54 |  35.28 |    0.74 |   34.38 |   36.12 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      34.95 |  34.74 |  35.46 |    0.72 |   34.05 |   36.57 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      56.28 |  56.22 |  57.63 |    1.41 |    55.1 |   57.91 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      18.61 |  18.54 |  19.04 |     0.5 |   17.97 |   19.41 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      18.71 |  18.56 |  19.17 |    0.61 |   17.97 |   19.51 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      18.84 |  18.74 |  19.23 |    0.49 |   18.11 |   19.98 |

```text
large-few cold-create 1024//adaptive aws         | ####################### 61.73 s
large-few unchanged-update 1024//adaptive aws    | ########### 29.44 s
large-few changed-update 1024//adaptive aws      | ########### 29.44 s
large-few pruned-update 1024//adaptive aws       | ########### 29.4 s
large-few cold-create 1024/32/adaptive shin      | ###################### 56.57 s
large-few unchanged-update 1024/32/adaptive shin | ####### 18.62 s
large-few changed-update 1024/32/adaptive shin   | ####### 18.67 s
large-few pruned-update 1024/32/adaptive shin    | ####### 18.87 s
large-few cold-create 2048//adaptive aws         | ###################### 57.24 s
large-few unchanged-update 2048//adaptive aws    | ######### 24.52 s
large-few changed-update 2048//adaptive aws      | ######### 24.05 s
large-few pruned-update 2048//adaptive aws       | ######### 24.18 s
large-few cold-create 2048/64/adaptive shin      | #################### 52.41 s
large-few unchanged-update 2048/64/adaptive shin | ####### 18.55 s
large-few changed-update 2048/64/adaptive shin   | ####### 18.62 s
large-few pruned-update 2048/64/adaptive shin    | ####### 18.9 s
mixed cold-create 1024//adaptive aws             | ######################## 63.34 s
mixed unchanged-update 1024//adaptive aws        | ########### 29.31 s
mixed changed-update 1024//adaptive aws          | ########### 29.26 s
mixed pruned-update 1024//adaptive aws           | ########### 29.37 s
mixed cold-create 1024/32/adaptive shin          | ##################### 56.25 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 18.52 s
mixed changed-update 1024/32/adaptive shin       | ####### 18.83 s
mixed pruned-update 1024/32/adaptive shin        | ####### 18.84 s
mixed cold-create 2048//adaptive aws             | ###################### 57.14 s
mixed unchanged-update 2048//adaptive aws        | ######### 23.85 s
mixed changed-update 2048//adaptive aws          | ######### 23.94 s
mixed pruned-update 2048//adaptive aws           | ######### 24.18 s
mixed cold-create 2048/64/adaptive shin          | ################### 50.94 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 18.62 s
mixed changed-update 2048/64/adaptive shin       | ####### 18.61 s
mixed pruned-update 2048/64/adaptive shin        | ####### 19.31 s
tiny-many cold-create 1024//adaptive aws         | ############################## 78.92 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 46.16 s
tiny-many changed-update 1024//adaptive aws      | ################## 46.24 s
tiny-many pruned-update 1024//adaptive aws       | ################## 46.3 s
tiny-many cold-create 1024/32/adaptive shin      | ##################### 56.46 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 18.54 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 18.67 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 18.76 s
tiny-many cold-create 2048//adaptive aws         | ########################## 68.03 s
tiny-many unchanged-update 2048//adaptive aws    | ############# 34.71 s
tiny-many changed-update 2048//adaptive aws      | ############# 34.69 s
tiny-many pruned-update 2048//adaptive aws       | ############# 34.95 s
tiny-many cold-create 2048/64/adaptive shin      | ##################### 56.28 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 18.61 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 18.71 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 18.84 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       417 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          123 |      122 |      126 |         4 |       106 |       129 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           40 |       39 |       41 |         2 |        39 |        41 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           40 |       40 |       41 |         1 |        40 |        43 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       448 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          416 |      416 |      417 |         1 |       416 |       417 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          188 |      186 |      192 |         6 |       161 |       193 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           40 |       39 |       40 |         1 |        39 |        41 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           41 |       40 |       42 |         2 |        39 |        42 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      282 |         1 |       281 |       282 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      281 |         1 |       279 |       282 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          281 |      280 |      281 |         1 |       279 |       282 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          274 |      273 |      274 |         1 |       273 |       275 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          106 |      103 |      107 |         4 |       100 |       107 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        35 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           39 |       37 |       39 |         2 |        37 |        39 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       37 |       39 |         2 |        37 |        41 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          283 |      282 |      283 |         1 |       282 |       283 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       282 |       283 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       282 |       283 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          275 |      275 |      275 |         0 |       274 |       276 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          117 |      114 |      121 |         7 |       109 |       136 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        37 |        39 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       218 |       220 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          212 |      212 |      216 |         4 |       211 |       218 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          214 |      211 |      215 |         4 |       211 |       215 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          210 |      209 |      210 |         1 |       208 |       212 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           58 |       57 |       58 |         1 |        55 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       36 |         1 |        35 |        39 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          223 |      223 |      223 |         0 |       223 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      222 |         0 |       221 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          222 |      221 |      222 |         1 |       221 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       219 |       220 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           62 |       59 |       70 |        11 |        49 |        71 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           36 |       35 |       36 |         1 |        35 |        36 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 123 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 40 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 40 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 416 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 188 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 40 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 41 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 281 MiB
mixed changed-update 1024//adaptive aws          | ################### 281 MiB
mixed pruned-update 1024//adaptive aws           | ################## 274 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 106 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 33 MiB
mixed changed-update 1024/32/adaptive shin       | ### 39 MiB
mixed pruned-update 1024/32/adaptive shin        | ### 39 MiB
mixed cold-create 2048//adaptive aws             | ################### 283 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 282 MiB
mixed changed-update 2048//adaptive aws          | ################### 282 MiB
mixed pruned-update 2048//adaptive aws           | ################## 275 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 117 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 35 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 212 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 214 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 210 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 58 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 223 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 222 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 222 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | #### 62 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 36 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
