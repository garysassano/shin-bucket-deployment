# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-08-08
- Run ID: 3a1fe594-bc8b-4cf5-af4b-7baca96cb8d5
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: shin, aws
- Asset profiles: mixed, tiny-many, large-few
- Memory MiB: 1024, 2048
- Max concurrency: 32, 64
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes |                    Provider duration |                       Local wall time |                    CDK deploy time |                         Max memory |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -----------------------------------: | ------------------------------------: | ---------------------------------: | ---------------------------------: |
| large-few     | cold-create      |       1024 |              32 |            adaptive |   2.197 s vs 9.025 s (4.108x faster) |  73.571 s vs 78.953 s (1.073x faster) | 57.72 s vs 63.22 s (1.095x faster) |  113 MiB vs 447 MiB (74.72% lower) |
| large-few     | unchanged-update |       1024 |              32 |            adaptive |  0.253 s vs 9.639 s (38.099x faster) |  36.068 s vs 46.793 s (1.297x faster) |  19.39 s vs 30.4 s (1.568x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       1024 |              32 |            adaptive |  0.517 s vs 9.477 s (18.331x faster) |  36.186 s vs 56.998 s (1.575x faster) |  19.37 s vs 30.42 s (1.57x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       1024 |              32 |            adaptive |  0.608 s vs 8.835 s (14.531x faster) |  41.136 s vs 47.751 s (1.161x faster) | 19.87 s vs 30.85 s (1.553x faster) |  39 MiB vs 417 MiB (90.647% lower) |
| large-few     | cold-create      |       2048 |              64 |            adaptive |   1.407 s vs 5.273 s (3.748x faster) |   68.686 s vs 73.25 s (1.066x faster) | 52.31 s vs 57.75 s (1.104x faster) | 189 MiB vs 447 MiB (57.718% lower) |
| large-few     | unchanged-update |       2048 |              64 |            adaptive |  0.227 s vs 5.274 s (23.233x faster) |  36.145 s vs 41.264 s (1.142x faster) |  19.4 s vs 24.94 s (1.286x faster) |  33 MiB vs 447 MiB (92.617% lower) |
| large-few     | changed-update   |       2048 |              64 |            adaptive |   0.515 s vs 5.25 s (10.194x faster) |  37.699 s vs 46.789 s (1.241x faster) | 19.41 s vs 24.88 s (1.282x faster) |  40 MiB vs 447 MiB (91.051% lower) |
| large-few     | pruned-update    |       2048 |              64 |            adaptive |   0.616 s vs 4.989 s (8.099x faster) |   36.56 s vs 41.789 s (1.143x faster) | 19.78 s vs 25.35 s (1.282x faster) |  39 MiB vs 417 MiB (90.647% lower) |
| mixed         | cold-create      |       1024 |              32 |            adaptive |   1.306 s vs 9.959 s (7.626x faster) |  73.401 s vs 79.448 s (1.082x faster) | 57.54 s vs 63.23 s (1.099x faster) | 102 MiB vs 281 MiB (63.701% lower) |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | 0.289 s vs 10.098 s (34.941x faster) |  37.088 s vs 46.831 s (1.263x faster) | 19.43 s vs 30.44 s (1.567x faster) |  34 MiB vs 280 MiB (87.857% lower) |
| mixed         | changed-update   |       1024 |              32 |            adaptive |   0.481 s vs 10.25 s (21.31x faster) |  40.487 s vs 47.414 s (1.171x faster) |  19.38 s vs 30.43 s (1.57x faster) |  37 MiB vs 280 MiB (86.786% lower) |
| mixed         | pruned-update    |       1024 |              32 |            adaptive |   1.206 s vs 10.35 s (8.582x faster) |  46.107 s vs 48.499 s (1.052x faster) |  19.74 s vs 30.79 s (1.56x faster) |  37 MiB vs 273 MiB (86.447% lower) |
| mixed         | cold-create      |       2048 |              64 |            adaptive |   0.897 s vs 5.801 s (6.467x faster) |  73.616 s vs 73.386 s (1.003x slower) | 57.76 s vs 57.87 s (1.002x faster) | 114 MiB vs 282 MiB (59.574% lower) |
| mixed         | unchanged-update |       2048 |              64 |            adaptive |  0.284 s vs 5.935 s (20.898x faster) |   36.729 s vs 41.491 s (1.13x faster) | 19.39 s vs 24.99 s (1.289x faster) |  33 MiB vs 281 MiB (88.256% lower) |
| mixed         | changed-update   |       2048 |              64 |            adaptive |   0.523 s vs 5.889 s (11.26x faster) |  36.177 s vs 41.426 s (1.145x faster) |  19.42 s vs 24.9 s (1.282x faster) |  37 MiB vs 282 MiB (86.879% lower) |
| mixed         | pruned-update    |       2048 |              64 |            adaptive |   1.211 s vs 5.568 s (4.598x faster) |  40.332 s vs 41.846 s (1.038x faster) | 19.67 s vs 25.23 s (1.283x faster) |  37 MiB vs 274 MiB (86.496% lower) |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive |  2.675 s vs 26.184 s (9.788x faster) | 74.425 s vs 101.137 s (1.359x faster) | 57.68 s vs 79.65 s (1.381x faster) |  56 MiB vs 219 MiB (74.429% lower) |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | 0.556 s vs 26.201 s (47.124x faster) |  36.148 s vs 63.907 s (1.768x faster) |  19.39 s vs 47.1 s (2.429x faster) |  35 MiB vs 213 MiB (83.568% lower) |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | 0.645 s vs 27.127 s (42.057x faster) |  36.815 s vs 63.797 s (1.733x faster) | 19.39 s vs 46.91 s (2.419x faster) |  36 MiB vs 213 MiB (83.099% lower) |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | 1.473 s vs 26.598 s (18.057x faster) |  37.068 s vs 69.948 s (1.887x faster) | 19.82 s vs 47.49 s (2.396x faster) |  36 MiB vs 208 MiB (82.692% lower) |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive |  1.635 s vs 15.228 s (9.314x faster) |  73.208 s vs 84.824 s (1.159x faster) |   57.32 s vs 68.78 s (1.2x faster) |  70 MiB vs 222 MiB (68.468% lower) |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | 0.487 s vs 15.403 s (31.628x faster) |  36.203 s vs 52.557 s (1.452x faster) | 19.36 s vs 36.03 s (1.861x faster) |  35 MiB vs 221 MiB (84.163% lower) |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive |  0.68 s vs 15.305 s (22.507x faster) |  40.742 s vs 53.097 s (1.303x faster) |    19.39 s vs 36 s (1.857x faster) |   36 MiB vs 221 MiB (83.71% lower) |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | 1.459 s vs 14.689 s (10.068x faster) |  38.032 s vs 53.536 s (1.408x faster) | 19.73 s vs 36.56 s (1.853x faster) |  36 MiB vs 219 MiB (83.562% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.197 s |              9.025 s |   +6.828 s |   4.108x |   +310.787% |
| Billed duration   |              2.356 s |              9.539 s |   +7.183 s |   4.049x |   +304.881% |
| Init duration     |              0.154 s |              0.513 s |   +0.359 s |   3.331x |   +233.117% |
| Local wall time   |             73.571 s |             78.953 s |   +5.382 s |   1.073x |     +7.315% |
| CDK deploy time   |              57.72 s |              63.22 s |     +5.5 s |   1.095x |     +9.529% |
| Max memory        |              113 MiB |              447 MiB |   +334 MiB |   3.956x |   +295.575% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.253 s |              9.639 s |   +9.386 s |  38.099x |  +3709.881% |
| Billed duration   |              0.373 s |             10.154 s |   +9.781 s |  27.223x |  +2622.252% |
| Init duration     |              0.125 s |              0.522 s |   +0.397 s |   4.176x |     +317.6% |
| Local wall time   |             36.068 s |             46.793 s |  +10.725 s |   1.297x |    +29.735% |
| CDK deploy time   |              19.39 s |               30.4 s |   +11.01 s |   1.568x |    +56.782% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.517 s |              9.477 s |    +8.96 s |  18.331x |  +1733.075% |
| Billed duration   |              0.643 s |             10.017 s |   +9.374 s |  15.579x |  +1457.854% |
| Init duration     |              0.125 s |              0.539 s |   +0.414 s |   4.312x |     +331.2% |
| Local wall time   |             36.186 s |             56.998 s |  +20.812 s |   1.575x |    +57.514% |
| CDK deploy time   |              19.37 s |              30.42 s |   +11.05 s |    1.57x |    +57.047% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.608 s |              8.835 s |   +8.227 s |  14.531x |  +1353.125% |
| Billed duration   |              0.768 s |              9.346 s |   +8.578 s |  12.169x |  +1116.927% |
| Init duration     |              0.151 s |              0.528 s |   +0.377 s |   3.497x |   +249.669% |
| Local wall time   |             41.136 s |             47.751 s |   +6.615 s |   1.161x |    +16.081% |
| CDK deploy time   |              19.87 s |              30.85 s |   +10.98 s |   1.553x |    +55.259% |
| Max memory        |               39 MiB |              417 MiB |   +378 MiB |  10.692x |   +969.231% |

### large-few cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.407 s |              5.273 s |   +3.866 s |   3.748x |   +274.769% |
| Billed duration   |              1.562 s |              5.857 s |   +4.295 s |    3.75x |   +274.968% |
| Init duration     |              0.151 s |              0.529 s |   +0.378 s |   3.503x |   +250.331% |
| Local wall time   |             68.686 s |              73.25 s |   +4.564 s |   1.066x |     +6.645% |
| CDK deploy time   |              52.31 s |              57.75 s |    +5.44 s |   1.104x |      +10.4% |
| Max memory        |              189 MiB |              447 MiB |   +258 MiB |   2.365x |   +136.508% |

### large-few unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.227 s |              5.274 s |   +5.047 s |  23.233x |  +2223.348% |
| Billed duration   |              0.352 s |              5.796 s |   +5.444 s |  16.466x |  +1546.591% |
| Init duration     |              0.126 s |              0.521 s |   +0.395 s |   4.135x |   +313.492% |
| Local wall time   |             36.145 s |             41.264 s |   +5.119 s |   1.142x |    +14.162% |
| CDK deploy time   |               19.4 s |              24.94 s |    +5.54 s |   1.286x |    +28.557% |
| Max memory        |               33 MiB |              447 MiB |   +414 MiB |  13.545x |  +1254.545% |

### large-few changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.515 s |               5.25 s |   +4.735 s |  10.194x |   +919.417% |
| Billed duration   |              0.644 s |              5.786 s |   +5.142 s |   8.984x |   +798.447% |
| Init duration     |              0.131 s |              0.519 s |   +0.388 s |   3.962x |   +296.183% |
| Local wall time   |             37.699 s |             46.789 s |    +9.09 s |   1.241x |    +24.112% |
| CDK deploy time   |              19.41 s |              24.88 s |    +5.47 s |   1.282x |    +28.181% |
| Max memory        |               40 MiB |              447 MiB |   +407 MiB |  11.175x |    +1017.5% |

### large-few pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.616 s |              4.989 s |   +4.373 s |   8.099x |   +709.903% |
| Billed duration   |              0.734 s |              5.501 s |   +4.767 s |   7.495x |   +649.455% |
| Init duration     |               0.15 s |              0.516 s |   +0.366 s |    3.44x |       +244% |
| Local wall time   |              36.56 s |             41.789 s |   +5.229 s |   1.143x |    +14.303% |
| CDK deploy time   |              19.78 s |              25.35 s |    +5.57 s |   1.282x |     +28.16% |
| Max memory        |               39 MiB |              417 MiB |   +378 MiB |  10.692x |   +969.231% |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.306 s |              9.959 s |   +8.653 s |   7.626x |   +662.557% |
| Billed duration   |              1.426 s |             10.493 s |   +9.067 s |   7.358x |   +635.835% |
| Init duration     |              0.126 s |              0.527 s |   +0.401 s |   4.183x |   +318.254% |
| Local wall time   |             73.401 s |             79.448 s |   +6.047 s |   1.082x |     +8.238% |
| CDK deploy time   |              57.54 s |              63.23 s |    +5.69 s |   1.099x |     +9.889% |
| Max memory        |              102 MiB |              281 MiB |   +179 MiB |   2.755x |    +175.49% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.289 s |             10.098 s |   +9.809 s |  34.941x |  +3394.118% |
| Billed duration   |              0.405 s |             10.621 s |  +10.216 s |  26.225x |  +2522.469% |
| Init duration     |              0.119 s |              0.506 s |   +0.387 s |   4.252x |    +325.21% |
| Local wall time   |             37.088 s |             46.831 s |   +9.743 s |   1.263x |     +26.27% |
| CDK deploy time   |              19.43 s |              30.44 s |   +11.01 s |   1.567x |    +56.665% |
| Max memory        |               34 MiB |              280 MiB |   +246 MiB |   8.235x |   +723.529% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.481 s |              10.25 s |   +9.769 s |   21.31x |  +2030.977% |
| Billed duration   |                0.6 s |             10.777 s |  +10.177 s |  17.962x |  +1696.167% |
| Init duration     |              0.118 s |              0.527 s |   +0.409 s |   4.466x |    +346.61% |
| Local wall time   |             40.487 s |             47.414 s |   +6.927 s |   1.171x |    +17.109% |
| CDK deploy time   |              19.38 s |              30.43 s |   +11.05 s |    1.57x |    +57.018% |
| Max memory        |               37 MiB |              280 MiB |   +243 MiB |   7.568x |   +656.757% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.206 s |              10.35 s |   +9.144 s |   8.582x |   +758.209% |
| Billed duration   |              1.328 s |             10.888 s |    +9.56 s |   8.199x |    +719.88% |
| Init duration     |              0.121 s |              0.534 s |   +0.413 s |   4.413x |   +341.322% |
| Local wall time   |             46.107 s |             48.499 s |   +2.392 s |   1.052x |     +5.188% |
| CDK deploy time   |              19.74 s |              30.79 s |   +11.05 s |    1.56x |    +55.978% |
| Max memory        |               37 MiB |              273 MiB |   +236 MiB |   7.378x |   +637.838% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.897 s |              5.801 s |   +4.904 s |   6.467x |   +546.711% |
| Billed duration   |              1.014 s |              6.321 s |   +5.307 s |   6.234x |   +523.373% |
| Init duration     |              0.118 s |              0.525 s |   +0.407 s |   4.449x |   +344.915% |
| Local wall time   |             73.616 s |             73.386 s |    -0.23 s |   0.997x |     -0.312% |
| CDK deploy time   |              57.76 s |              57.87 s |    +0.11 s |   1.002x |      +0.19% |
| Max memory        |              114 MiB |              282 MiB |   +168 MiB |   2.474x |   +147.368% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.284 s |              5.935 s |   +5.651 s |  20.898x |  +1989.789% |
| Billed duration   |              0.412 s |               6.46 s |   +6.048 s |   15.68x |  +1467.961% |
| Init duration     |              0.122 s |              0.524 s |   +0.402 s |   4.295x |   +329.508% |
| Local wall time   |             36.729 s |             41.491 s |   +4.762 s |    1.13x |    +12.965% |
| CDK deploy time   |              19.39 s |              24.99 s |     +5.6 s |   1.289x |    +28.881% |
| Max memory        |               33 MiB |              281 MiB |   +248 MiB |   8.515x |   +751.515% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.523 s |              5.889 s |   +5.366 s |   11.26x |  +1026.004% |
| Billed duration   |              0.675 s |              6.425 s |    +5.75 s |   9.519x |   +851.852% |
| Init duration     |              0.153 s |              0.507 s |   +0.354 s |   3.314x |   +231.373% |
| Local wall time   |             36.177 s |             41.426 s |   +5.249 s |   1.145x |    +14.509% |
| CDK deploy time   |              19.42 s |               24.9 s |    +5.48 s |   1.282x |    +28.218% |
| Max memory        |               37 MiB |              282 MiB |   +245 MiB |   7.622x |   +662.162% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.211 s |              5.568 s |   +4.357 s |   4.598x |   +359.785% |
| Billed duration   |              1.361 s |              6.076 s |   +4.715 s |   4.464x |   +346.436% |
| Init duration     |              0.119 s |              0.507 s |   +0.388 s |   4.261x |    +326.05% |
| Local wall time   |             40.332 s |             41.846 s |   +1.514 s |   1.038x |     +3.754% |
| CDK deploy time   |              19.67 s |              25.23 s |    +5.56 s |   1.283x |    +28.266% |
| Max memory        |               37 MiB |              274 MiB |   +237 MiB |   7.405x |   +640.541% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              2.675 s |             26.184 s |  +23.509 s |   9.788x |   +878.841% |
| Billed duration   |              2.804 s |              26.72 s |  +23.916 s |   9.529x |   +852.924% |
| Init duration     |               0.12 s |              0.535 s |   +0.415 s |   4.458x |   +345.833% |
| Local wall time   |             74.425 s |            101.137 s |  +26.712 s |   1.359x |    +35.891% |
| CDK deploy time   |              57.68 s |              79.65 s |   +21.97 s |   1.381x |    +38.089% |
| Max memory        |               56 MiB |              219 MiB |   +163 MiB |   3.911x |   +291.071% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.556 s |             26.201 s |  +25.645 s |  47.124x |   +4612.41% |
| Billed duration   |               0.68 s |             26.713 s |  +26.033 s |  39.284x |  +3828.382% |
| Init duration     |              0.124 s |              0.512 s |   +0.388 s |   4.129x |   +312.903% |
| Local wall time   |             36.148 s |             63.907 s |  +27.759 s |   1.768x |    +76.793% |
| CDK deploy time   |              19.39 s |               47.1 s |   +27.71 s |   2.429x |   +142.909% |
| Max memory        |               35 MiB |              213 MiB |   +178 MiB |   6.086x |   +508.571% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.645 s |             27.127 s |  +26.482 s |  42.057x |  +4105.736% |
| Billed duration   |              0.763 s |             27.667 s |  +26.904 s |  36.261x |  +3526.081% |
| Init duration     |               0.12 s |              0.529 s |   +0.409 s |   4.408x |   +340.833% |
| Local wall time   |             36.815 s |             63.797 s |  +26.982 s |   1.733x |    +73.291% |
| CDK deploy time   |              19.39 s |              46.91 s |   +27.52 s |   2.419x |   +141.929% |
| Max memory        |               36 MiB |              213 MiB |   +177 MiB |   5.917x |   +491.667% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.473 s |             26.598 s |  +25.125 s |  18.057x |  +1705.703% |
| Billed duration   |              1.596 s |             27.151 s |  +25.555 s |  17.012x |   +1601.19% |
| Init duration     |              0.122 s |              0.518 s |   +0.396 s |   4.246x |    +324.59% |
| Local wall time   |             37.068 s |             69.948 s |   +32.88 s |   1.887x |    +88.702% |
| CDK deploy time   |              19.82 s |              47.49 s |   +27.67 s |   2.396x |   +139.606% |
| Max memory        |               36 MiB |              208 MiB |   +172 MiB |   5.778x |   +477.778% |

### tiny-many cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.635 s |             15.228 s |  +13.593 s |   9.314x |   +831.376% |
| Billed duration   |              1.761 s |             15.905 s |  +14.144 s |   9.032x |    +803.18% |
| Init duration     |              0.124 s |               0.52 s |   +0.396 s |   4.194x |   +319.355% |
| Local wall time   |             73.208 s |             84.824 s |  +11.616 s |   1.159x |    +15.867% |
| CDK deploy time   |              57.32 s |              68.78 s |   +11.46 s |     1.2x |    +19.993% |
| Max memory        |               70 MiB |              222 MiB |   +152 MiB |   3.171x |   +217.143% |

### tiny-many unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              0.487 s |             15.403 s |  +14.916 s |  31.628x |  +3062.834% |
| Billed duration   |              0.603 s |             15.928 s |  +15.325 s |  26.415x |  +2541.459% |
| Init duration     |              0.117 s |              0.524 s |   +0.407 s |   4.479x |   +347.863% |
| Local wall time   |             36.203 s |             52.557 s |  +16.354 s |   1.452x |    +45.173% |
| CDK deploy time   |              19.36 s |              36.03 s |   +16.67 s |   1.861x |    +86.105% |
| Max memory        |               35 MiB |              221 MiB |   +186 MiB |   6.314x |   +531.429% |

### tiny-many changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |               0.68 s |             15.305 s |  +14.625 s |  22.507x |  +2150.735% |
| Billed duration   |              0.799 s |             15.823 s |  +15.024 s |  19.804x |   +1880.35% |
| Init duration     |              0.124 s |              0.521 s |   +0.397 s |   4.202x |   +320.161% |
| Local wall time   |             40.742 s |             53.097 s |  +12.355 s |   1.303x |    +30.325% |
| CDK deploy time   |              19.39 s |                 36 s |   +16.61 s |   1.857x |    +85.663% |
| Max memory        |               36 MiB |              221 MiB |   +185 MiB |   6.139x |   +513.889% |

### tiny-many pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric            | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| ----------------- | -------------------: | -------------------: | ---------: | -------: | ----------: |
| Provider duration |              1.459 s |             14.689 s |   +13.23 s |  10.068x |   +906.785% |
| Billed duration   |              1.603 s |             15.211 s |  +13.608 s |   9.489x |   +848.908% |
| Init duration     |              0.119 s |              0.522 s |   +0.403 s |   4.387x |   +338.655% |
| Local wall time   |             38.032 s |             53.536 s |  +15.504 s |   1.408x |    +40.766% |
| CDK deploy time   |              19.73 s |              36.56 s |   +16.83 s |   1.853x |    +85.302% |
| Max memory        |               36 MiB |              219 MiB |   +183 MiB |   6.083x |   +508.333% |

## Metric Tables

### Provider duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.025 |  8.813 |  9.288 |   0.475 |   8.777 |   9.443 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      9.639 |  9.454 |  9.653 |   0.199 |   9.333 |  10.238 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      9.477 |  9.316 |  9.629 |   0.313 |   8.612 |   9.844 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      8.835 |  8.753 |  9.179 |   0.426 |   8.672 |   9.226 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.197 |  2.012 |  2.198 |   0.186 |   1.992 |   2.554 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.253 |  0.249 |  0.272 |   0.023 |   0.247 |   0.283 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.517 |  0.508 |   0.53 |   0.022 |   0.425 |   0.658 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.608 |   0.58 |  0.618 |   0.038 |    0.51 |   0.789 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.273 |  5.169 |  5.331 |   0.162 |   5.129 |   5.349 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.274 |  5.158 |  5.277 |   0.119 |   5.089 |   5.315 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       5.25 |  5.162 |  5.258 |   0.096 |   5.081 |   5.329 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      4.989 |  4.942 |  5.131 |   0.189 |    4.93 |   5.133 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.407 |  1.326 |   1.41 |   0.084 |   1.241 |   1.515 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.227 |  0.226 |  0.228 |   0.002 |   0.223 |   0.269 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.515 |  0.511 |  0.536 |   0.025 |   0.456 |   0.537 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.616 |  0.595 |  0.643 |   0.048 |   0.522 |    0.66 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.959 |   9.84 | 10.013 |   0.173 |   9.615 |  10.031 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.098 |    9.8 | 10.221 |   0.421 |   9.433 |  10.261 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      10.25 |  9.953 | 10.516 |   0.563 |    9.55 |   10.62 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      10.35 |  9.968 | 10.489 |   0.521 |   9.916 |  10.648 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.306 |  1.294 |  1.376 |   0.082 |   1.265 |   1.529 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.289 |  0.284 |  0.289 |   0.005 |   0.268 |   0.298 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.481 |  0.474 |  0.528 |   0.054 |   0.433 |   0.542 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.206 |   1.16 |  1.241 |   0.081 |   1.121 |   1.259 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.801 |  5.781 |  5.822 |   0.041 |   5.591 |   5.838 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.935 |  5.897 |  5.985 |   0.088 |   5.748 |   6.486 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.889 |  5.862 |  5.927 |   0.065 |   5.744 |   6.493 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.568 |  5.329 |  5.713 |   0.384 |   5.316 |     5.8 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.897 |  0.866 |  0.961 |   0.095 |   0.796 |   1.028 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.284 |  0.274 |  0.286 |   0.012 |   0.263 |   0.292 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.523 |  0.492 |  0.524 |   0.032 |   0.414 |   0.543 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.211 |  1.158 |  1.257 |   0.099 |     1.1 |   1.268 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     26.184 |  25.61 | 26.493 |   0.883 |  25.511 |  26.536 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.201 |  25.64 | 26.873 |   1.233 |  25.545 |  27.522 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.127 | 26.173 | 28.135 |   1.962 |  24.848 |  32.597 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     26.598 | 26.584 | 26.658 |   0.074 |  26.477 |  26.842 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.675 |  2.653 |  2.693 |    0.04 |   2.648 |   2.763 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.556 |  0.536 |  0.567 |   0.031 |   0.504 |   0.581 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.645 |   0.63 |   0.65 |    0.02 |   0.612 |   0.683 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.473 |  1.355 |  1.489 |   0.134 |   1.334 |   1.552 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.228 | 15.006 | 15.365 |   0.359 |  14.729 |  15.392 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.403 | 15.255 | 15.453 |   0.198 |  14.986 |  15.792 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.305 | 15.038 | 15.528 |    0.49 |  14.926 |  15.632 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     14.689 | 14.666 | 14.711 |   0.045 |  14.116 |   14.97 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.635 |  1.607 |  1.675 |   0.068 |   1.586 |   1.706 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.487 |   0.46 |  0.492 |   0.032 |   0.453 |   0.509 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |       0.68 |  0.677 |  0.681 |   0.004 |   0.611 |   0.701 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.459 |  1.454 |  1.483 |   0.029 |   1.383 |   1.497 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.025 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.639 s
large-few changed-update 1024//adaptive aws      | ########## 9.477 s
large-few pruned-update 1024//adaptive aws       | ########## 8.835 s
large-few cold-create 1024/32/adaptive shin      | ## 2.197 s
large-few unchanged-update 1024/32/adaptive shin | # 0.253 s
large-few changed-update 1024/32/adaptive shin   | # 0.517 s
large-few pruned-update 1024/32/adaptive shin    | # 0.608 s
large-few cold-create 2048//adaptive aws         | ###### 5.273 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.274 s
large-few changed-update 2048//adaptive aws      | ###### 5.25 s
large-few pruned-update 2048//adaptive aws       | ###### 4.989 s
large-few cold-create 2048/64/adaptive shin      | ## 1.407 s
large-few unchanged-update 2048/64/adaptive shin | # 0.227 s
large-few changed-update 2048/64/adaptive shin   | # 0.515 s
large-few pruned-update 2048/64/adaptive shin    | # 0.616 s
mixed cold-create 1024//adaptive aws             | ########### 9.959 s
mixed unchanged-update 1024//adaptive aws        | ########### 10.098 s
mixed changed-update 1024//adaptive aws          | ########### 10.25 s
mixed pruned-update 1024//adaptive aws           | ########### 10.35 s
mixed cold-create 1024/32/adaptive shin          | # 1.306 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.289 s
mixed changed-update 1024/32/adaptive shin       | # 0.481 s
mixed pruned-update 1024/32/adaptive shin        | # 1.206 s
mixed cold-create 2048//adaptive aws             | ###### 5.801 s
mixed unchanged-update 2048//adaptive aws        | ####### 5.935 s
mixed changed-update 2048//adaptive aws          | ####### 5.889 s
mixed pruned-update 2048//adaptive aws           | ###### 5.568 s
mixed cold-create 2048/64/adaptive shin          | # 0.897 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.284 s
mixed changed-update 2048/64/adaptive shin       | # 0.523 s
mixed pruned-update 2048/64/adaptive shin        | # 1.211 s
tiny-many cold-create 1024//adaptive aws         | ############################# 26.184 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 26.201 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.127 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.598 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.675 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.556 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.645 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.473 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.228 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.403 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.305 s
tiny-many pruned-update 2048//adaptive aws       | ################ 14.689 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.635 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.487 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.68 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.459 s
```

### Billed duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      9.539 |  9.392 |  9.801 |   0.409 |   9.224 |   9.967 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.154 |  9.977 | 10.196 |   0.219 |   9.858 |  10.683 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.017 |   9.84 | 10.169 |   0.329 |   9.102 |  10.425 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      9.346 |  9.281 |  9.723 |   0.442 |   9.195 |   9.768 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.356 |  2.129 |  2.361 |   0.232 |   2.109 |   2.709 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.373 |   0.37 |  0.398 |   0.028 |   0.368 |   0.411 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.643 |  0.631 |  0.658 |   0.027 |   0.544 |   0.816 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.768 |  0.701 |  0.776 |   0.075 |   0.632 |    0.94 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      5.857 |  5.685 |  5.894 |   0.209 |   5.659 |   6.056 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      5.796 |  5.687 |  5.823 |   0.136 |   5.593 |   5.831 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      5.786 |  5.774 |  5.848 |   0.074 |   5.587 |   5.947 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      5.501 |  5.458 |  5.662 |   0.204 |   5.445 |    5.98 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.562 |  1.446 |  1.572 |   0.126 |   1.359 |    1.67 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.352 |  0.349 |  0.358 |   0.009 |   0.343 |   0.397 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.644 |  0.643 |  0.657 |   0.014 |   0.608 |   0.692 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.734 |  0.715 |  0.793 |   0.078 |   0.677 |   0.815 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     10.493 |  10.39 | 10.537 |   0.147 |  10.123 |  10.558 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     10.621 | 10.306 | 10.717 |   0.411 |    9.88 |  10.809 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     10.777 | 10.461 | 11.058 |   0.597 |  10.054 |  11.161 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     10.888 | 10.503 | 11.027 |   0.524 |  10.446 |   11.07 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      1.426 |  1.421 |  1.525 |   0.104 |   1.379 |   1.682 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.405 |  0.402 |  0.412 |    0.01 |   0.388 |   0.418 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |        0.6 |  0.591 |   0.66 |   0.069 |   0.553 |   0.685 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.328 |  1.287 |   1.38 |   0.093 |   1.233 |   1.406 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      6.321 |  6.307 |  6.357 |    0.05 |   6.081 |   6.369 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |       6.46 |  6.436 |  6.524 |   0.088 |   6.255 |   6.928 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      6.425 |  6.369 |  6.467 |   0.098 |   6.251 |    6.94 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      6.076 |  5.811 |  6.268 |   0.457 |   5.795 |   6.361 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.014 |  0.987 |   1.08 |   0.093 |   0.911 |    1.18 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.412 |  0.403 |  0.425 |   0.022 |   0.385 |   0.434 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.675 |  0.611 |  0.681 |    0.07 |   0.578 |   0.697 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.361 |  1.278 |  1.379 |   0.101 |   1.218 |   1.387 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      26.72 | 26.146 | 27.022 |   0.876 |  26.036 |  27.121 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     26.713 | 26.146 | 27.365 |   1.219 |  26.069 |  28.048 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     27.667 | 26.702 | 28.684 |   1.982 |  25.293 |  33.017 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     27.151 | 27.102 | 27.163 |   0.061 |  27.004 |   27.36 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      2.804 |  2.798 |   2.81 |   0.012 |   2.771 |   2.883 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |       0.68 |  0.653 |  0.712 |   0.059 |   0.623 |   0.738 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.763 |  0.748 |  0.771 |   0.023 |   0.735 |   0.812 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      1.596 |  1.474 |  1.655 |   0.181 |   1.454 |   1.685 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     15.905 | 15.516 | 15.911 |   0.395 |  15.249 |  16.027 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     15.928 |  15.77 | 15.979 |   0.209 |  15.491 |  16.333 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     15.823 | 15.566 | 16.057 |   0.491 |  15.447 |  16.135 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     15.211 | 15.203 | 15.245 |   0.042 |  14.623 |  15.489 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      1.761 |  1.756 |  1.795 |   0.039 |    1.71 |   1.858 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.603 |  0.586 |   0.61 |   0.024 |    0.57 |   0.626 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.799 |  0.795 |  0.805 |    0.01 |    0.74 |   0.853 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      1.603 |  1.575 |  1.604 |   0.029 |   1.502 |   1.649 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.539 s
large-few unchanged-update 1024//adaptive aws    | ########### 10.154 s
large-few changed-update 1024//adaptive aws      | ########### 10.017 s
large-few pruned-update 1024//adaptive aws       | ########## 9.346 s
large-few cold-create 1024/32/adaptive shin      | ### 2.356 s
large-few unchanged-update 1024/32/adaptive shin | # 0.373 s
large-few changed-update 1024/32/adaptive shin   | # 0.643 s
large-few pruned-update 1024/32/adaptive shin    | # 0.768 s
large-few cold-create 2048//adaptive aws         | ###### 5.857 s
large-few unchanged-update 2048//adaptive aws    | ###### 5.796 s
large-few changed-update 2048//adaptive aws      | ###### 5.786 s
large-few pruned-update 2048//adaptive aws       | ###### 5.501 s
large-few cold-create 2048/64/adaptive shin      | ## 1.562 s
large-few unchanged-update 2048/64/adaptive shin | # 0.352 s
large-few changed-update 2048/64/adaptive shin   | # 0.644 s
large-few pruned-update 2048/64/adaptive shin    | # 0.734 s
mixed cold-create 1024//adaptive aws             | ########### 10.493 s
mixed unchanged-update 1024//adaptive aws        | ############ 10.621 s
mixed changed-update 1024//adaptive aws          | ############ 10.777 s
mixed pruned-update 1024//adaptive aws           | ############ 10.888 s
mixed cold-create 1024/32/adaptive shin          | ## 1.426 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.405 s
mixed changed-update 1024/32/adaptive shin       | # 0.6 s
mixed pruned-update 1024/32/adaptive shin        | # 1.328 s
mixed cold-create 2048//adaptive aws             | ####### 6.321 s
mixed unchanged-update 2048//adaptive aws        | ####### 6.46 s
mixed changed-update 2048//adaptive aws          | ####### 6.425 s
mixed pruned-update 2048//adaptive aws           | ####### 6.076 s
mixed cold-create 2048/64/adaptive shin          | # 1.014 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.412 s
mixed changed-update 2048/64/adaptive shin       | # 0.675 s
mixed pruned-update 2048/64/adaptive shin        | # 1.361 s
tiny-many cold-create 1024//adaptive aws         | ############################# 26.72 s
tiny-many unchanged-update 1024//adaptive aws    | ############################# 26.713 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.667 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 27.151 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.804 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.68 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.763 s
tiny-many pruned-update 1024/32/adaptive shin    | ## 1.596 s
tiny-many cold-create 2048//adaptive aws         | ################# 15.905 s
tiny-many unchanged-update 2048//adaptive aws    | ################# 15.928 s
tiny-many changed-update 2048//adaptive aws      | ################# 15.823 s
tiny-many pruned-update 2048//adaptive aws       | ################ 15.211 s
tiny-many cold-create 2048/64/adaptive shin      | ## 1.761 s
tiny-many unchanged-update 2048/64/adaptive shin | # 0.603 s
tiny-many changed-update 2048/64/adaptive shin   | # 0.799 s
tiny-many pruned-update 2048/64/adaptive shin    | ## 1.603 s
```

### Init duration

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.513 |  0.513 |  0.523 |    0.01 |   0.446 |   0.578 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.522 |  0.515 |  0.525 |    0.01 |   0.445 |   0.542 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.539 |  0.524 |  0.539 |   0.015 |   0.489 |   0.581 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.528 |  0.522 |  0.541 |   0.019 |    0.51 |   0.543 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.154 |  0.116 |  0.158 |   0.042 |   0.116 |   0.164 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.125 |   0.12 |  0.125 |   0.005 |   0.115 |   0.127 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.125 |  0.123 |  0.128 |   0.005 |   0.119 |   0.158 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.151 |  0.122 |  0.157 |   0.035 |    0.12 |    0.16 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.529 |  0.526 |  0.545 |   0.019 |   0.515 |   0.782 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.516 |  0.529 |   0.013 |   0.504 |   0.546 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.519 |  0.516 |  0.536 |    0.02 |   0.506 |   0.785 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.516 |  0.515 |  0.529 |   0.014 |   0.512 |   0.849 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.151 |  0.119 |  0.155 |   0.036 |   0.118 |   0.165 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.126 |  0.121 |  0.128 |   0.007 |    0.12 |    0.13 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.131 |  0.129 |  0.151 |   0.022 |    0.12 |   0.155 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |       0.15 |   0.12 |  0.154 |   0.034 |   0.118 |   0.154 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.527 |  0.523 |  0.534 |   0.011 |   0.508 |    0.55 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.506 |  0.496 |  0.522 |   0.026 |   0.447 |   0.547 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.527 |  0.508 |   0.54 |   0.032 |   0.503 |   0.542 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.534 |   0.53 |  0.537 |   0.007 |   0.421 |   0.537 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      0.126 |  0.119 |  0.149 |    0.03 |   0.114 |   0.152 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.119 |   0.001 |   0.115 |   0.123 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      0.118 |  0.118 |   0.12 |   0.002 |   0.116 |   0.156 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.121 |  0.121 |  0.126 |   0.005 |   0.112 |   0.165 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      0.525 |   0.52 |  0.531 |   0.011 |   0.489 |   0.534 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.524 |  0.506 |  0.538 |   0.032 |   0.442 |   0.539 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.507 |  0.506 |  0.536 |    0.03 |   0.446 |    0.54 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.507 |  0.482 |  0.554 |   0.072 |   0.479 |   0.561 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.118 |  0.117 |  0.121 |   0.004 |   0.114 |   0.152 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.122 |   0.12 |  0.149 |   0.029 |   0.117 |   0.151 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.153 |  0.151 |  0.157 |   0.006 |   0.118 |   0.164 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.118 |  0.122 |   0.004 |   0.118 |    0.15 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      0.535 |  0.528 |  0.536 |   0.008 |   0.525 |   0.584 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      0.512 |  0.506 |  0.523 |   0.017 |   0.491 |   0.525 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      0.529 |  0.444 |  0.539 |   0.095 |   0.419 |   0.548 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      0.518 |  0.518 |  0.526 |   0.008 |   0.505 |   0.552 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.118 |  0.128 |    0.01 |   0.116 |    0.15 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      0.124 |  0.118 |  0.145 |   0.027 |   0.117 |   0.156 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |       0.12 |  0.118 |  0.123 |   0.005 |   0.117 |   0.128 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      0.122 |   0.12 |  0.132 |   0.012 |   0.119 |   0.165 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |       0.52 |  0.512 |  0.546 |   0.034 |   0.509 |   0.799 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      0.524 |  0.514 |  0.525 |   0.011 |   0.504 |    0.54 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      0.521 |  0.517 |  0.528 |   0.011 |   0.503 |   0.529 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      0.522 |  0.519 |  0.533 |   0.014 |   0.507 |   0.537 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      0.124 |   0.12 |  0.151 |   0.031 |    0.12 |   0.154 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      0.117 |  0.116 |  0.118 |   0.002 |   0.116 |   0.126 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      0.124 |  0.119 |  0.128 |   0.009 |   0.118 |   0.152 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      0.119 |  0.119 |  0.149 |    0.03 |   0.115 |   0.151 |

```text
large-few cold-create 1024//adaptive aws         | ############################# 0.513 s
large-few unchanged-update 1024//adaptive aws    | ############################# 0.522 s
large-few changed-update 1024//adaptive aws      | ############################## 0.539 s
large-few pruned-update 1024//adaptive aws       | ############################# 0.528 s
large-few cold-create 1024/32/adaptive shin      | ######### 0.154 s
large-few unchanged-update 1024/32/adaptive shin | ####### 0.125 s
large-few changed-update 1024/32/adaptive shin   | ####### 0.125 s
large-few pruned-update 1024/32/adaptive shin    | ######## 0.151 s
large-few cold-create 2048//adaptive aws         | ############################# 0.529 s
large-few unchanged-update 2048//adaptive aws    | ############################# 0.521 s
large-few changed-update 2048//adaptive aws      | ############################# 0.519 s
large-few pruned-update 2048//adaptive aws       | ############################# 0.516 s
large-few cold-create 2048/64/adaptive shin      | ######## 0.151 s
large-few unchanged-update 2048/64/adaptive shin | ####### 0.126 s
large-few changed-update 2048/64/adaptive shin   | ####### 0.131 s
large-few pruned-update 2048/64/adaptive shin    | ######## 0.15 s
mixed cold-create 1024//adaptive aws             | ############################# 0.527 s
mixed unchanged-update 1024//adaptive aws        | ############################ 0.506 s
mixed changed-update 1024//adaptive aws          | ############################# 0.527 s
mixed pruned-update 1024//adaptive aws           | ############################## 0.534 s
mixed cold-create 1024/32/adaptive shin          | ####### 0.126 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 0.119 s
mixed changed-update 1024/32/adaptive shin       | ####### 0.118 s
mixed pruned-update 1024/32/adaptive shin        | ####### 0.121 s
mixed cold-create 2048//adaptive aws             | ############################# 0.525 s
mixed unchanged-update 2048//adaptive aws        | ############################# 0.524 s
mixed changed-update 2048//adaptive aws          | ############################ 0.507 s
mixed pruned-update 2048//adaptive aws           | ############################ 0.507 s
mixed cold-create 2048/64/adaptive shin          | ####### 0.118 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 0.122 s
mixed changed-update 2048/64/adaptive shin       | ######### 0.153 s
mixed pruned-update 2048/64/adaptive shin        | ####### 0.119 s
tiny-many cold-create 1024//adaptive aws         | ############################## 0.535 s
tiny-many unchanged-update 1024//adaptive aws    | ############################ 0.512 s
tiny-many changed-update 1024//adaptive aws      | ############################# 0.529 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 0.518 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.12 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 0.124 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 0.12 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 0.122 s
tiny-many cold-create 2048//adaptive aws         | ############################# 0.52 s
tiny-many unchanged-update 2048//adaptive aws    | ############################# 0.524 s
tiny-many changed-update 2048//adaptive aws      | ############################# 0.521 s
tiny-many pruned-update 2048//adaptive aws       | ############################# 0.522 s
tiny-many cold-create 2048/64/adaptive shin      | ####### 0.124 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 0.117 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 0.124 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 0.119 s
```

### Local wall time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) |  Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | ------: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     78.953 | 78.791 |  79.001 |    0.21 |   77.82 |  79.566 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     46.793 | 46.677 |  49.164 |   2.487 |  46.669 |  64.946 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     56.998 | 52.414 |  63.186 |  10.772 |   46.97 |  69.229 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     47.751 | 47.737 |  48.657 |    0.92 |  45.491 |  63.765 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     73.571 | 73.509 |  73.789 |    0.28 |  73.468 |  92.757 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.068 | 35.871 |  36.407 |   0.536 |  35.083 |  42.386 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     36.186 | 36.143 |  40.222 |   4.079 |  36.093 |  41.856 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     41.136 | 38.596 |  44.166 |    5.57 |  36.692 |  59.902 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      73.25 | 73.172 |  73.388 |   0.216 |  72.563 |  73.535 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     41.264 | 41.231 |  41.397 |   0.166 |  40.045 |  41.606 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     46.789 | 46.773 |  46.907 |   0.134 |  45.615 |  47.003 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     41.789 | 41.688 |  41.926 |   0.238 |  41.566 |  45.679 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     68.686 | 68.587 |  73.887 |     5.3 |  68.532 |  74.796 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.145 | 35.952 |  36.197 |   0.245 |  35.865 |  40.345 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     37.699 | 37.482 |  40.612 |    3.13 |  36.125 |  41.239 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      36.56 | 36.462 |  41.815 |   5.353 |  35.141 |  41.996 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |     79.448 | 78.951 |  79.516 |   0.565 |  78.824 |   83.89 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     46.831 | 46.782 |  46.944 |   0.162 |  45.419 |  52.446 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     47.414 | 47.165 |  51.143 |   3.978 |  46.996 |  52.443 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     48.499 | 47.145 |  52.629 |   5.484 |  45.607 |  52.902 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     73.401 | 69.051 |  73.916 |   4.865 |  67.916 |  74.079 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     37.088 | 36.982 |  38.113 |   1.131 |   35.19 |  46.958 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     40.487 | 37.539 |  41.486 |   3.947 |  35.941 |  41.806 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     46.107 | 36.361 |  47.682 |  11.321 |  34.815 |  47.817 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     73.386 | 73.373 |  73.443 |    0.07 |  71.966 |  78.732 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     41.491 | 41.484 |   41.52 |   0.036 |  41.437 |  42.227 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     41.426 | 41.331 |  41.579 |   0.248 |  40.075 |  46.747 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     41.846 | 41.632 |  47.251 |   5.619 |  40.091 |  47.632 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     73.616 | 73.548 |  73.704 |   0.156 |  72.344 |  74.188 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.729 | 36.071 |  44.139 |   8.068 |   34.81 |  48.766 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     36.177 | 36.121 |  40.189 |   4.068 |  36.099 |  41.568 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     40.332 | 39.179 |  41.796 |   2.617 |  36.426 |  43.789 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |    101.137 | 99.742 | 101.617 |   1.875 |  96.304 | 105.783 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |     63.907 | 63.395 |  64.891 |   1.496 |  61.661 |  70.511 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |     63.797 | 62.337 |  69.484 |   7.147 |    59.2 |  80.422 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |     69.948 | 67.665 |  70.114 |   2.449 |  64.519 |  74.697 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |     74.425 | 73.868 |  74.466 |   0.598 |  73.274 |  74.501 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |     36.148 | 36.043 |  36.304 |   0.261 |  34.842 |  41.691 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |     36.815 | 36.763 |  40.896 |   4.133 |   36.74 |  42.744 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |     37.068 | 36.974 |   37.11 |   0.136 |  35.325 |  42.348 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |     84.824 | 84.725 |  84.838 |   0.113 |  83.122 |  84.883 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |     52.557 | 52.461 |  52.571 |    0.11 |  51.102 |  52.942 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |     53.097 |  52.96 |   56.71 |    3.75 |  52.785 |  58.386 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |     53.536 | 53.405 |  56.976 |   3.571 |  53.307 |  58.648 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |     73.208 | 71.362 |  75.098 |   3.736 |  68.879 |  88.511 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |     36.203 | 36.173 |  36.336 |   0.163 |  34.907 |  36.694 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |     40.742 | 39.601 |  42.085 |   2.484 |  36.608 |  42.147 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |     38.032 | 37.257 |  41.712 |   4.455 |  37.249 |  42.268 |

```text
large-few cold-create 1024//adaptive aws         | ####################### 78.953 s
large-few unchanged-update 1024//adaptive aws    | ############## 46.793 s
large-few changed-update 1024//adaptive aws      | ################# 56.998 s
large-few pruned-update 1024//adaptive aws       | ############## 47.751 s
large-few cold-create 1024/32/adaptive shin      | ###################### 73.571 s
large-few unchanged-update 1024/32/adaptive shin | ########### 36.068 s
large-few changed-update 1024/32/adaptive shin   | ########### 36.186 s
large-few pruned-update 1024/32/adaptive shin    | ############ 41.136 s
large-few cold-create 2048//adaptive aws         | ###################### 73.25 s
large-few unchanged-update 2048//adaptive aws    | ############ 41.264 s
large-few changed-update 2048//adaptive aws      | ############## 46.789 s
large-few pruned-update 2048//adaptive aws       | ############ 41.789 s
large-few cold-create 2048/64/adaptive shin      | #################### 68.686 s
large-few unchanged-update 2048/64/adaptive shin | ########### 36.145 s
large-few changed-update 2048/64/adaptive shin   | ########### 37.699 s
large-few pruned-update 2048/64/adaptive shin    | ########### 36.56 s
mixed cold-create 1024//adaptive aws             | ######################## 79.448 s
mixed unchanged-update 1024//adaptive aws        | ############## 46.831 s
mixed changed-update 1024//adaptive aws          | ############## 47.414 s
mixed pruned-update 1024//adaptive aws           | ############## 48.499 s
mixed cold-create 1024/32/adaptive shin          | ###################### 73.401 s
mixed unchanged-update 1024/32/adaptive shin     | ########### 37.088 s
mixed changed-update 1024/32/adaptive shin       | ############ 40.487 s
mixed pruned-update 1024/32/adaptive shin        | ############## 46.107 s
mixed cold-create 2048//adaptive aws             | ###################### 73.386 s
mixed unchanged-update 2048//adaptive aws        | ############ 41.491 s
mixed changed-update 2048//adaptive aws          | ############ 41.426 s
mixed pruned-update 2048//adaptive aws           | ############ 41.846 s
mixed cold-create 2048/64/adaptive shin          | ###################### 73.616 s
mixed unchanged-update 2048/64/adaptive shin     | ########### 36.729 s
mixed changed-update 2048/64/adaptive shin       | ########### 36.177 s
mixed pruned-update 2048/64/adaptive shin        | ############ 40.332 s
tiny-many cold-create 1024//adaptive aws         | ############################## 101.137 s
tiny-many unchanged-update 1024//adaptive aws    | ################### 63.907 s
tiny-many changed-update 1024//adaptive aws      | ################### 63.797 s
tiny-many pruned-update 1024//adaptive aws       | ##################### 69.948 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 74.425 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 36.148 s
tiny-many changed-update 1024/32/adaptive shin   | ########### 36.815 s
tiny-many pruned-update 1024/32/adaptive shin    | ########### 37.068 s
tiny-many cold-create 2048//adaptive aws         | ######################### 84.824 s
tiny-many unchanged-update 2048//adaptive aws    | ################ 52.557 s
tiny-many changed-update 2048//adaptive aws      | ################ 53.097 s
tiny-many pruned-update 2048//adaptive aws       | ################ 53.536 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 73.208 s
tiny-many unchanged-update 2048/64/adaptive shin | ########### 36.203 s
tiny-many changed-update 2048/64/adaptive shin   | ############ 40.742 s
tiny-many pruned-update 2048/64/adaptive shin    | ########### 38.032 s
```

### CDK deploy time

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | ---------: | -----: | -----: | ------: | ------: | ------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      63.22 |  63.21 |  63.22 |    0.01 |    62.4 |   63.24 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       30.4 |  30.37 |   30.4 |    0.03 |   29.79 |   31.06 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      30.42 |   30.4 |  30.44 |    0.04 |   29.96 |   30.47 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.85 |  30.83 |  30.88 |    0.05 |   29.94 |   30.94 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.72 |  57.66 |  57.75 |    0.09 |   57.41 |   57.76 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.39 |  19.34 |  19.41 |    0.07 |      19 |   19.42 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.37 |  19.37 |  19.37 |       0 |   19.05 |   19.38 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.87 |  19.86 |  19.88 |    0.02 |    19.2 |   19.92 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.75 |  57.74 |  57.81 |    0.07 |   57.72 |   57.91 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.94 |  24.93 |     25 |    0.07 |   24.41 |   25.07 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |      24.88 |  24.88 |  24.89 |    0.01 |   24.53 |   24.99 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      25.35 |  25.19 |  25.41 |    0.22 |   24.66 |   25.42 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      52.31 |  52.28 |  57.23 |    4.95 |   52.24 |   57.69 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |       19.4 |  19.39 |   19.4 |    0.01 |   18.99 |   19.42 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.41 |  19.38 |  19.41 |    0.03 |   19.08 |   19.47 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.78 |  19.75 |  19.87 |    0.12 |   19.16 |   19.92 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      63.23 |  63.21 |  63.27 |    0.06 |    63.2 |   68.03 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |      30.44 |   30.4 |  30.45 |    0.05 |   29.94 |    30.5 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      30.43 |  30.38 |  30.48 |     0.1 |   29.88 |   30.52 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      30.79 |  30.75 |  30.92 |    0.17 |   30.01 |   31.05 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.54 |  52.28 |  57.72 |    5.44 |   52.25 |   57.73 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.43 |  19.39 |   19.5 |    0.11 |   18.91 |    30.5 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.38 |  19.35 |  19.42 |    0.07 |   19.09 |   19.47 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.74 |  19.73 |  19.84 |    0.11 |   19.07 |   31.12 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      57.87 |  57.73 |  57.96 |    0.23 |   56.93 |   63.27 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      24.99 |  24.85 |     25 |    0.15 |   24.47 |   25.04 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |       24.9 |  24.88 |  24.91 |    0.03 |   24.48 |   25.04 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      25.23 |   25.2 |  25.33 |    0.13 |   24.57 |   25.46 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      57.76 |  57.74 |  57.77 |    0.03 |   57.38 |    57.8 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.39 |  19.33 |   19.4 |    0.07 |   19.04 |   19.41 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.42 |   19.4 |  19.45 |    0.05 |   18.96 |   19.46 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.67 |  19.67 |  19.74 |    0.07 |   19.13 |    19.9 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |      79.65 |  79.64 |   84.6 |    4.96 |    79.6 |   85.09 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |       47.1 |  47.09 |  47.14 |    0.05 |   46.15 |   47.21 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |      46.91 |  46.25 |  47.09 |    0.84 |   41.62 |   52.66 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |      47.49 |   47.4 |  47.51 |    0.11 |   46.45 |   47.67 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |      57.68 |  57.67 |  57.74 |    0.07 |   57.56 |   57.77 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |      19.39 |  19.36 |   19.4 |    0.04 |   18.96 |   19.41 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |      19.39 |  19.35 |  19.41 |    0.06 |   19.03 |   19.45 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |      19.82 |   19.7 |  19.85 |    0.15 |   19.09 |   19.89 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |      68.78 |  68.75 |   68.8 |    0.05 |   67.83 |   68.81 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |      36.03 |  35.94 |  36.05 |    0.11 |   35.41 |   36.18 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |         36 |     36 |  36.03 |    0.03 |   35.27 |    36.1 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |      36.56 |  36.48 |  36.56 |    0.08 |   35.44 |   36.59 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |      57.32 |  52.24 |  57.75 |    5.51 |   52.22 |   57.77 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |      19.36 |  19.36 |  19.39 |    0.03 |   19.01 |   19.41 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |      19.39 |  19.38 |   19.4 |    0.02 |   18.97 |   19.41 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |      19.73 |   19.7 |  19.78 |    0.08 |   19.03 |   19.86 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 63.22 s
large-few unchanged-update 1024//adaptive aws    | ########### 30.4 s
large-few changed-update 1024//adaptive aws      | ########### 30.42 s
large-few pruned-update 1024//adaptive aws       | ############ 30.85 s
large-few cold-create 1024/32/adaptive shin      | ###################### 57.72 s
large-few unchanged-update 1024/32/adaptive shin | ####### 19.39 s
large-few changed-update 1024/32/adaptive shin   | ####### 19.37 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.87 s
large-few cold-create 2048//adaptive aws         | ###################### 57.75 s
large-few unchanged-update 2048//adaptive aws    | ######### 24.94 s
large-few changed-update 2048//adaptive aws      | ######### 24.88 s
large-few pruned-update 2048//adaptive aws       | ########## 25.35 s
large-few cold-create 2048/64/adaptive shin      | #################### 52.31 s
large-few unchanged-update 2048/64/adaptive shin | ####### 19.4 s
large-few changed-update 2048/64/adaptive shin   | ####### 19.41 s
large-few pruned-update 2048/64/adaptive shin    | ####### 19.78 s
mixed cold-create 1024//adaptive aws             | ######################## 63.23 s
mixed unchanged-update 1024//adaptive aws        | ########### 30.44 s
mixed changed-update 1024//adaptive aws          | ########### 30.43 s
mixed pruned-update 1024//adaptive aws           | ############ 30.79 s
mixed cold-create 1024/32/adaptive shin          | ###################### 57.54 s
mixed unchanged-update 1024/32/adaptive shin     | ####### 19.43 s
mixed changed-update 1024/32/adaptive shin       | ####### 19.38 s
mixed pruned-update 1024/32/adaptive shin        | ####### 19.74 s
mixed cold-create 2048//adaptive aws             | ###################### 57.87 s
mixed unchanged-update 2048//adaptive aws        | ######### 24.99 s
mixed changed-update 2048//adaptive aws          | ######### 24.9 s
mixed pruned-update 2048//adaptive aws           | ########## 25.23 s
mixed cold-create 2048/64/adaptive shin          | ###################### 57.76 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 19.39 s
mixed changed-update 2048/64/adaptive shin       | ####### 19.42 s
mixed pruned-update 2048/64/adaptive shin        | ####### 19.67 s
tiny-many cold-create 1024//adaptive aws         | ############################## 79.65 s
tiny-many unchanged-update 1024//adaptive aws    | ################## 47.1 s
tiny-many changed-update 1024//adaptive aws      | ################## 46.91 s
tiny-many pruned-update 1024//adaptive aws       | ################## 47.49 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 57.68 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 19.39 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.39 s
tiny-many pruned-update 1024/32/adaptive shin    | ####### 19.82 s
tiny-many cold-create 2048//adaptive aws         | ########################## 68.78 s
tiny-many unchanged-update 2048//adaptive aws    | ############## 36.03 s
tiny-many changed-update 2048//adaptive aws      | ############## 36 s
tiny-many pruned-update 2048//adaptive aws       | ############## 36.56 s
tiny-many cold-create 2048/64/adaptive shin      | ###################### 57.32 s
tiny-many unchanged-update 2048/64/adaptive shin | ####### 19.36 s
tiny-many changed-update 2048/64/adaptive shin   | ####### 19.39 s
tiny-many pruned-update 2048/64/adaptive shin    | ####### 19.73 s
```

### Max memory

| Asset profile | Phase            | Memory MiB | Max concurrency | Source window bytes | Implementation |   n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| ------------- | ---------------- | ---------: | --------------: | ------------------: | -------------- | --: | -----------: | -------: | -------: | --------: | --------: | --------: |
| large-few     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       448 |
| large-few     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       447 |       447 |
| large-few     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          417 |      416 |      417 |         1 |       416 |       417 |
| large-few     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          113 |      112 |      114 |         2 |       110 |       127 |
| large-few     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        33 |
| large-few     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        38 |        42 |
| large-few     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           39 |       39 |       39 |         0 |        38 |        40 |
| large-few     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          447 |      447 |      447 |         0 |       446 |       447 |
| large-few     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          447 |      446 |      447 |         1 |       446 |       447 |
| large-few     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          417 |      417 |      417 |         0 |       416 |       418 |
| large-few     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          189 |      173 |      192 |        19 |       162 |       199 |
| large-few     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       33 |         0 |        33 |        35 |
| large-few     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           40 |       40 |       40 |         0 |        39 |        41 |
| large-few     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           39 |       39 |       41 |         2 |        39 |        42 |
| mixed         | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          281 |      281 |      281 |         0 |       280 |       281 |
| mixed         | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       280 |       281 |
| mixed         | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          280 |      280 |      280 |         0 |       280 |       281 |
| mixed         | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          273 |      273 |      274 |         1 |       273 |       276 |
| mixed         | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |          102 |      101 |      107 |         6 |        99 |       109 |
| mixed         | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           34 |       33 |       34 |         1 |        33 |        35 |
| mixed         | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       37 |         0 |        37 |        38 |
| mixed         | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        37 |        41 |
| mixed         | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      283 |         1 |       282 |       284 |
| mixed         | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          281 |      281 |      282 |         1 |       281 |       282 |
| mixed         | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          282 |      282 |      282 |         0 |       281 |       285 |
| mixed         | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          274 |      274 |      275 |         1 |       273 |       275 |
| mixed         | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |          114 |      110 |      114 |         4 |       110 |       117 |
| mixed         | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           33 |       33 |       35 |         2 |        33 |        35 |
| mixed         | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        36 |        39 |
| mixed         | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           37 |       37 |       39 |         2 |        36 |        41 |
| tiny-many     | cold-create      |       1024 |                 |            adaptive | aws            |   5 |          219 |      219 |      219 |         0 |       218 |       219 |
| tiny-many     | unchanged-update |       1024 |                 |            adaptive | aws            |   5 |          213 |      211 |      214 |         3 |       211 |       216 |
| tiny-many     | changed-update   |       1024 |                 |            adaptive | aws            |   5 |          213 |      211 |      215 |         4 |       210 |       217 |
| tiny-many     | pruned-update    |       1024 |                 |            adaptive | aws            |   5 |          208 |      208 |      210 |         2 |       207 |       212 |
| tiny-many     | cold-create      |       1024 |              32 |            adaptive | shin           |   5 |           56 |       55 |       56 |         1 |        53 |        58 |
| tiny-many     | unchanged-update |       1024 |              32 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        38 |
| tiny-many     | changed-update   |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | pruned-update    |       1024 |              32 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |
| tiny-many     | cold-create      |       2048 |                 |            adaptive | aws            |   5 |          222 |      222 |      223 |         1 |       222 |       223 |
| tiny-many     | unchanged-update |       2048 |                 |            adaptive | aws            |   5 |          221 |      220 |      221 |         1 |       220 |       222 |
| tiny-many     | changed-update   |       2048 |                 |            adaptive | aws            |   5 |          221 |      221 |      221 |         0 |       221 |       222 |
| tiny-many     | pruned-update    |       2048 |                 |            adaptive | aws            |   5 |          219 |      218 |      219 |         1 |       218 |       219 |
| tiny-many     | cold-create      |       2048 |              64 |            adaptive | shin           |   5 |           70 |       70 |       71 |         1 |        64 |        72 |
| tiny-many     | unchanged-update |       2048 |              64 |            adaptive | shin           |   5 |           35 |       35 |       35 |         0 |        35 |        36 |
| tiny-many     | changed-update   |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        38 |
| tiny-many     | pruned-update    |       2048 |              64 |            adaptive | shin           |   5 |           36 |       36 |       36 |         0 |        36 |        36 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 447 MiB
large-few changed-update 1024//adaptive aws      | ############################## 447 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 417 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 113 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 33 MiB
large-few changed-update 1024/32/adaptive shin   | ### 40 MiB
large-few pruned-update 1024/32/adaptive shin    | ### 39 MiB
large-few cold-create 2048//adaptive aws         | ############################## 447 MiB
large-few unchanged-update 2048//adaptive aws    | ############################## 447 MiB
large-few changed-update 2048//adaptive aws      | ############################## 447 MiB
large-few pruned-update 2048//adaptive aws       | ############################ 417 MiB
large-few cold-create 2048/64/adaptive shin      | ############# 189 MiB
large-few unchanged-update 2048/64/adaptive shin | ## 33 MiB
large-few changed-update 2048/64/adaptive shin   | ### 40 MiB
large-few pruned-update 2048/64/adaptive shin    | ### 39 MiB
mixed cold-create 1024//adaptive aws             | ################### 281 MiB
mixed unchanged-update 1024//adaptive aws        | ################### 280 MiB
mixed changed-update 1024//adaptive aws          | ################### 280 MiB
mixed pruned-update 1024//adaptive aws           | ################## 273 MiB
mixed cold-create 1024/32/adaptive shin          | ####### 102 MiB
mixed unchanged-update 1024/32/adaptive shin     | ## 34 MiB
mixed changed-update 1024/32/adaptive shin       | ## 37 MiB
mixed pruned-update 1024/32/adaptive shin        | ## 37 MiB
mixed cold-create 2048//adaptive aws             | ################### 282 MiB
mixed unchanged-update 2048//adaptive aws        | ################### 281 MiB
mixed changed-update 2048//adaptive aws          | ################### 282 MiB
mixed pruned-update 2048//adaptive aws           | ################## 274 MiB
mixed cold-create 2048/64/adaptive shin          | ######## 114 MiB
mixed unchanged-update 2048/64/adaptive shin     | ## 33 MiB
mixed changed-update 2048/64/adaptive shin       | ## 37 MiB
mixed pruned-update 2048/64/adaptive shin        | ## 37 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 219 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 213 MiB
tiny-many changed-update 1024//adaptive aws      | ############## 213 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 208 MiB
tiny-many cold-create 1024/32/adaptive shin      | #### 56 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 35 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
tiny-many cold-create 2048//adaptive aws         | ############### 222 MiB
tiny-many unchanged-update 2048//adaptive aws    | ############### 221 MiB
tiny-many changed-update 2048//adaptive aws      | ############### 221 MiB
tiny-many pruned-update 2048//adaptive aws       | ############### 219 MiB
tiny-many cold-create 2048/64/adaptive shin      | ##### 70 MiB
tiny-many unchanged-update 2048/64/adaptive shin | ## 35 MiB
tiny-many changed-update 2048/64/adaptive shin   | ## 36 MiB
tiny-many pruned-update 2048/64/adaptive shin    | ## 36 MiB
```
