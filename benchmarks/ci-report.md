# Benchmark Report: benchmark results

> [!WARNING]
> Preliminary preview from an incomplete methodology-v2 run. Do not treat these values as accepted benchmark evidence.

## Scope

- Snapshot date: 2026-08-03
- Run ID: 9af64d64-4991-4a02-8132-883b3686e6aa
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: shin, aws
- Asset profiles: mixed
- Memory MiB: 1024, 2048, 4096
- Max concurrency: 32, 64, 128
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Provider duration | Local wall time | CDK deploy time | Max memory |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 | 32 | adaptive | 1.267 s vs 9.734 s (7.683x faster) | 62.227 s vs 72.482 s (1.165x faster) | 52.66 s vs 62.86 s (1.194x faster) | 93 MiB vs 274 MiB (66.058% lower) |
| mixed | unchanged-update | 1024 | 32 | adaptive | 0.324 s vs 10.066 s (31.068x faster) | 34 s vs 44.204 s (1.3x faster) | 19.1 s vs 29.45 s (1.542x faster) | 42 MiB vs 274 MiB (84.672% lower) |
| mixed | changed-update | 1024 | 32 | adaptive | 0.552 s vs 10.175 s (18.433x faster) | 34.109 s vs 44.263 s (1.298x faster) | 19.1 s vs 29.43 s (1.541x faster) | 41 MiB vs 273 MiB (84.982% lower) |
| mixed | pruned-update | 1024 | 32 | adaptive | 1.187 s vs 10.035 s (8.454x faster) | 34.167 s vs 44.183 s (1.293x faster) | 19.14 s vs 29.44 s (1.538x faster) | 37 MiB vs 266 MiB (86.09% lower) |
| mixed | cold-create | 2048 | 64 | adaptive | 0.802 s vs 5.738 s (7.155x faster) | 62.452 s vs 67.425 s (1.08x faster) | 52.66 s vs 57.8 s (1.098x faster) | 105 MiB vs 275 MiB (61.818% lower) |
| mixed | unchanged-update | 2048 | 64 | adaptive | 0.262 s vs 5.671 s (21.645x faster) | 29.049 s vs 38.536 s (1.327x faster) | 14.03 s vs 24.27 s (1.73x faster) | 41 MiB vs 275 MiB (85.091% lower) |
| mixed | changed-update | 2048 | 64 | adaptive | 0.411 s vs 5.529 s (13.453x faster) | 29.274 s vs 36.861 s (1.259x faster) | 16.32 s vs 24.18 s (1.482x faster) | 41 MiB vs 275 MiB (85.091% lower) |
| mixed | pruned-update | 2048 | 64 | adaptive | 1.138 s vs 5.622 s (4.94x faster) | 34.203 s vs 34.46 s (1.008x faster) | 21.47 s vs 21.56 s (1.004x faster) | 38 MiB vs 268 MiB (85.821% lower) |
| mixed | cold-create | 4096 | 128 | adaptive | 0.782 s vs 5.512 s (7.049x faster) | 62.362 s vs 67.148 s (1.077x faster) | 52.66 s vs 57.61 s (1.094x faster) | 126 MiB vs 275 MiB (54.182% lower) |
| mixed | unchanged-update | 4096 | 128 | adaptive | 0.284 s vs 5.627 s (19.813x faster) | 29.259 s vs 39.053 s (1.335x faster) | 16.32 s vs 26.64 s (1.632x faster) | 42 MiB vs 275 MiB (84.727% lower) |
| mixed | changed-update | 4096 | 128 | adaptive | 0.464 s vs 5.651 s (12.179x faster) | 29.192 s vs 39.183 s (1.342x faster) | 16.45 s vs 24.27 s (1.475x faster) | 41 MiB vs 275 MiB (85.091% lower) |
| mixed | pruned-update | 4096 | 128 | adaptive | 1.162 s vs 5.479 s (4.715x faster) | 34.316 s vs 39.192 s (1.142x faster) | 19.24 s vs 24.29 s (1.262x faster) | 39 MiB vs 269 MiB (85.502% lower) |

### mixed cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 1.267 s | 9.734 s | +8.467 s | 7.683x | +668.272% |
| Billed duration | 1.395 s | 10.343 s | +8.948 s | 7.414x | +641.434% |
| Init duration | 0.128 s | 0.587 s | +0.459 s | 4.586x | +358.594% |
| Local wall time | 62.227 s | 72.482 s | +10.255 s | 1.165x | +16.48% |
| CDK deploy time | 52.66 s | 62.86 s | +10.2 s | 1.194x | +19.37% |
| Max memory | 93 MiB | 274 MiB | +181 MiB | 2.946x | +194.624% |

### mixed unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.324 s | 10.066 s | +9.742 s | 31.068x | +3006.79% |
| Billed duration | 0.448 s | 10.763 s | +10.315 s | 24.025x | +2302.455% |
| Init duration | 0.124 s | 0.568 s | +0.444 s | 4.581x | +358.065% |
| Local wall time | 34 s | 44.204 s | +10.204 s | 1.3x | +30.012% |
| CDK deploy time | 19.1 s | 29.45 s | +10.35 s | 1.542x | +54.188% |
| Max memory | 42 MiB | 274 MiB | +232 MiB | 6.524x | +552.381% |

### mixed changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.552 s | 10.175 s | +9.623 s | 18.433x | +1743.297% |
| Billed duration | 0.709 s | 10.722 s | +10.013 s | 15.123x | +1412.271% |
| Init duration | 0.135 s | 0.538 s | +0.403 s | 3.985x | +298.519% |
| Local wall time | 34.109 s | 44.263 s | +10.154 s | 1.298x | +29.769% |
| CDK deploy time | 19.1 s | 29.43 s | +10.33 s | 1.541x | +54.084% |
| Max memory | 41 MiB | 273 MiB | +232 MiB | 6.659x | +565.854% |

### mixed pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 1.187 s | 10.035 s | +8.848 s | 8.454x | +745.409% |
| Billed duration | 1.304 s | 10.561 s | +9.257 s | 8.099x | +709.893% |
| Init duration | 0.117 s | 0.553 s | +0.436 s | 4.726x | +372.65% |
| Local wall time | 34.167 s | 44.183 s | +10.016 s | 1.293x | +29.315% |
| CDK deploy time | 19.14 s | 29.44 s | +10.3 s | 1.538x | +53.814% |
| Max memory | 37 MiB | 266 MiB | +229 MiB | 7.189x | +618.919% |

### mixed cold-create at 2048 MiB / max concurrency 64 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.802 s | 5.738 s | +4.936 s | 7.155x | +615.461% |
| Billed duration | 0.919 s | 6.339 s | +5.42 s | 6.898x | +589.771% |
| Init duration | 0.121 s | 0.574 s | +0.453 s | 4.744x | +374.38% |
| Local wall time | 62.452 s | 67.425 s | +4.973 s | 1.08x | +7.963% |
| CDK deploy time | 52.66 s | 57.8 s | +5.14 s | 1.098x | +9.761% |
| Max memory | 105 MiB | 275 MiB | +170 MiB | 2.619x | +161.905% |

### mixed unchanged-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.262 s | 5.671 s | +5.409 s | 21.645x | +2064.504% |
| Billed duration | 0.384 s | 6.21 s | +5.826 s | 16.172x | +1517.187% |
| Init duration | 0.121 s | 0.527 s | +0.406 s | 4.355x | +335.537% |
| Local wall time | 29.049 s | 38.536 s | +9.487 s | 1.327x | +32.659% |
| CDK deploy time | 14.03 s | 24.27 s | +10.24 s | 1.73x | +72.986% |
| Max memory | 41 MiB | 275 MiB | +234 MiB | 6.707x | +570.732% |

### mixed changed-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.411 s | 5.529 s | +5.118 s | 13.453x | +1245.255% |
| Billed duration | 0.53 s | 6.151 s | +5.621 s | 11.606x | +1060.566% |
| Init duration | 0.118 s | 0.52 s | +0.402 s | 4.407x | +340.678% |
| Local wall time | 29.274 s | 36.861 s | +7.587 s | 1.259x | +25.917% |
| CDK deploy time | 16.32 s | 24.18 s | +7.86 s | 1.482x | +48.162% |
| Max memory | 41 MiB | 275 MiB | +234 MiB | 6.707x | +570.732% |

### mixed pruned-update at 2048 MiB / max concurrency 64 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 1.138 s | 5.622 s | +4.484 s | 4.94x | +394.025% |
| Billed duration | 1.292 s | 6.171 s | +4.879 s | 4.776x | +377.632% |
| Init duration | 0.151 s | 0.548 s | +0.397 s | 3.629x | +262.914% |
| Local wall time | 34.203 s | 34.46 s | +0.257 s | 1.008x | +0.751% |
| CDK deploy time | 21.47 s | 21.56 s | +0.09 s | 1.004x | +0.419% |
| Max memory | 38 MiB | 268 MiB | +230 MiB | 7.053x | +605.263% |

### mixed cold-create at 4096 MiB / max concurrency 128 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.782 s | 5.512 s | +4.73 s | 7.049x | +604.859% |
| Billed duration | 0.931 s | 6.038 s | +5.107 s | 6.485x | +548.55% |
| Init duration | 0.13 s | 0.541 s | +0.411 s | 4.162x | +316.154% |
| Local wall time | 62.362 s | 67.148 s | +4.786 s | 1.077x | +7.675% |
| CDK deploy time | 52.66 s | 57.61 s | +4.95 s | 1.094x | +9.4% |
| Max memory | 126 MiB | 275 MiB | +149 MiB | 2.183x | +118.254% |

### mixed unchanged-update at 4096 MiB / max concurrency 128 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.284 s | 5.627 s | +5.343 s | 19.813x | +1881.338% |
| Billed duration | 0.4 s | 6.221 s | +5.821 s | 15.553x | +1455.25% |
| Init duration | 0.116 s | 0.603 s | +0.487 s | 5.198x | +419.828% |
| Local wall time | 29.259 s | 39.053 s | +9.794 s | 1.335x | +33.473% |
| CDK deploy time | 16.32 s | 26.64 s | +10.32 s | 1.632x | +63.235% |
| Max memory | 42 MiB | 275 MiB | +233 MiB | 6.548x | +554.762% |

### mixed changed-update at 4096 MiB / max concurrency 128 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.464 s | 5.651 s | +5.187 s | 12.179x | +1117.888% |
| Billed duration | 0.583 s | 6.44 s | +5.857 s | 11.046x | +1004.631% |
| Init duration | 0.118 s | 0.795 s | +0.677 s | 6.737x | +573.729% |
| Local wall time | 29.192 s | 39.183 s | +9.991 s | 1.342x | +34.225% |
| CDK deploy time | 16.45 s | 24.27 s | +7.82 s | 1.475x | +47.538% |
| Max memory | 41 MiB | 275 MiB | +234 MiB | 6.707x | +570.732% |

### mixed pruned-update at 4096 MiB / max concurrency 128 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 1.162 s | 5.479 s | +4.317 s | 4.715x | +371.515% |
| Billed duration | 1.28 s | 6.004 s | +4.724 s | 4.691x | +369.062% |
| Init duration | 0.117 s | 0.54 s | +0.423 s | 4.615x | +361.538% |
| Local wall time | 34.316 s | 39.192 s | +4.876 s | 1.142x | +14.209% |
| CDK deploy time | 19.24 s | 24.29 s | +5.05 s | 1.262x | +26.247% |
| Max memory | 39 MiB | 269 MiB | +230 MiB | 6.897x | +589.744% |

## Metric Tables

### Provider duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 9.734 | 9.636 | 9.768 | 0.132 | 9.338 | 10.116 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 10.066 | 9.928 | 10.265 | 0.337 | 9.916 | 10.34 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 10.175 | 9.85 | 10.231 | 0.381 | 9.659 | 10.312 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 10.035 | 9.754 | 10.155 | 0.401 | 9.601 | 10.225 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 1.267 | 1.249 | 1.291 | 0.042 | 1.106 | 1.298 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.324 | 0.316 | 0.336 | 0.02 | 0.303 | 0.338 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.552 | 0.456 | 0.573 | 0.117 | 0.442 | 0.584 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 1.187 | 1.092 | 1.236 | 0.144 | 1.051 | 1.259 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 5.738 | 5.687 | 5.819 | 0.132 | 5.599 | 5.915 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 5.671 | 5.643 | 5.715 | 0.072 | 5.62 | 5.771 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 5.529 | 5.325 | 5.63 | 0.305 | 5.303 | 5.838 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 5.622 | 5.606 | 5.738 | 0.132 | 5.535 | 5.739 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 0.802 | 0.792 | 0.806 | 0.014 | 0.785 | 0.884 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 0.262 | 0.261 | 0.27 | 0.009 | 0.249 | 0.277 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 0.411 | 0.385 | 0.474 | 0.089 | 0.383 | 0.495 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 1.138 | 1.069 | 1.168 | 0.099 | 1.037 | 1.183 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 5.512 | 5.426 | 5.526 | 0.1 | 5.359 | 5.598 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 5.627 | 5.51 | 5.661 | 0.151 | 5.463 | 5.878 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 5.651 | 5.61 | 5.655 | 0.045 | 5.593 | 5.938 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 5.479 | 5.447 | 5.678 | 0.231 | 5.265 | 5.681 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 0.782 | 0.757 | 0.801 | 0.044 | 0.728 | 0.887 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 0.284 | 0.28 | 0.294 | 0.014 | 0.253 | 0.296 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 0.464 | 0.44 | 0.474 | 0.034 | 0.435 | 0.495 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 1.162 | 1.118 | 1.262 | 0.144 | 1.106 | 1.425 |

```text
mixed cold-create 1024//adaptive aws             | ############################# 9.734 s
mixed unchanged-update 1024//adaptive aws        | ############################## 10.066 s
mixed changed-update 1024//adaptive aws          | ############################## 10.175 s
mixed pruned-update 1024//adaptive aws           | ############################## 10.035 s
mixed cold-create 1024/32/adaptive shin          | #### 1.267 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.324 s
mixed changed-update 1024/32/adaptive shin       | ## 0.552 s
mixed pruned-update 1024/32/adaptive shin        | ### 1.187 s
mixed cold-create 2048//adaptive aws             | ################# 5.738 s
mixed unchanged-update 2048//adaptive aws        | ################# 5.671 s
mixed changed-update 2048//adaptive aws          | ################ 5.529 s
mixed pruned-update 2048//adaptive aws           | ################# 5.622 s
mixed cold-create 2048/64/adaptive shin          | ## 0.802 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.262 s
mixed changed-update 2048/64/adaptive shin       | # 0.411 s
mixed pruned-update 2048/64/adaptive shin        | ### 1.138 s
mixed cold-create 4096//adaptive aws             | ################ 5.512 s
mixed unchanged-update 4096//adaptive aws        | ################# 5.627 s
mixed changed-update 4096//adaptive aws          | ################# 5.651 s
mixed pruned-update 4096//adaptive aws           | ################ 5.479 s
mixed cold-create 4096/128/adaptive shin         | ## 0.782 s
mixed unchanged-update 4096/128/adaptive shin    | # 0.284 s
mixed changed-update 4096/128/adaptive shin      | # 0.464 s
mixed pruned-update 4096/128/adaptive shin       | ### 1.162 s
```

### Billed duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 10.343 | 10.199 | 10.356 | 0.157 | 9.931 | 10.704 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 10.763 | 10.604 | 10.906 | 0.302 | 10.497 | 11.214 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 10.722 | 10.388 | 10.755 | 0.367 | 10.186 | 10.88 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 10.561 | 10.308 | 10.785 | 0.477 | 10.097 | 10.786 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 1.395 | 1.372 | 1.439 | 0.067 | 1.222 | 1.447 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.448 | 0.44 | 0.488 | 0.048 | 0.426 | 0.495 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.709 | 0.571 | 0.718 | 0.147 | 0.57 | 0.738 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 1.304 | 1.207 | 1.363 | 0.156 | 1.169 | 1.379 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 6.339 | 6.238 | 6.434 | 0.196 | 6.214 | 6.49 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 6.21 | 6.175 | 6.242 | 0.067 | 6.138 | 6.297 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 6.151 | 5.797 | 6.187 | 0.39 | 5.77 | 6.435 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 6.171 | 6.134 | 6.266 | 0.132 | 6.127 | 6.627 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 0.919 | 0.919 | 0.928 | 0.009 | 0.911 | 0.997 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 0.384 | 0.382 | 0.386 | 0.004 | 0.365 | 0.402 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 0.53 | 0.503 | 0.614 | 0.111 | 0.499 | 0.628 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 1.292 | 1.22 | 1.297 | 0.077 | 1.191 | 1.308 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 6.038 | 6.002 | 6.1 | 0.098 | 5.877 | 6.14 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 6.221 | 6.066 | 6.465 | 0.399 | 6.014 | 6.809 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 6.44 | 6.407 | 6.446 | 0.039 | 6.186 | 6.546 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 6.004 | 5.988 | 6.227 | 0.239 | 5.78 | 6.313 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 0.931 | 0.874 | 0.936 | 0.062 | 0.847 | 1.041 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 0.4 | 0.4 | 0.412 | 0.012 | 0.369 | 0.422 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 0.583 | 0.559 | 0.59 | 0.031 | 0.552 | 0.613 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 1.28 | 1.233 | 1.378 | 0.145 | 1.224 | 1.546 |

```text
mixed cold-create 1024//adaptive aws             | ############################# 10.343 s
mixed unchanged-update 1024//adaptive aws        | ############################## 10.763 s
mixed changed-update 1024//adaptive aws          | ############################## 10.722 s
mixed pruned-update 1024//adaptive aws           | ############################# 10.561 s
mixed cold-create 1024/32/adaptive shin          | #### 1.395 s
mixed unchanged-update 1024/32/adaptive shin     | # 0.448 s
mixed changed-update 1024/32/adaptive shin       | ## 0.709 s
mixed pruned-update 1024/32/adaptive shin        | #### 1.304 s
mixed cold-create 2048//adaptive aws             | ################## 6.339 s
mixed unchanged-update 2048//adaptive aws        | ################# 6.21 s
mixed changed-update 2048//adaptive aws          | ################# 6.151 s
mixed pruned-update 2048//adaptive aws           | ################# 6.171 s
mixed cold-create 2048/64/adaptive shin          | ### 0.919 s
mixed unchanged-update 2048/64/adaptive shin     | # 0.384 s
mixed changed-update 2048/64/adaptive shin       | # 0.53 s
mixed pruned-update 2048/64/adaptive shin        | #### 1.292 s
mixed cold-create 4096//adaptive aws             | ################# 6.038 s
mixed unchanged-update 4096//adaptive aws        | ################# 6.221 s
mixed changed-update 4096//adaptive aws          | ################## 6.44 s
mixed pruned-update 4096//adaptive aws           | ################# 6.004 s
mixed cold-create 4096/128/adaptive shin         | ### 0.931 s
mixed unchanged-update 4096/128/adaptive shin    | # 0.4 s
mixed changed-update 4096/128/adaptive shin      | ## 0.583 s
mixed pruned-update 4096/128/adaptive shin       | #### 1.28 s
```

### Init duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 0.587 | 0.587 | 0.592 | 0.005 | 0.563 | 0.608 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 0.568 | 0.566 | 0.847 | 0.281 | 0.537 | 0.948 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 0.538 | 0.527 | 0.546 | 0.019 | 0.524 | 0.568 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 0.553 | 0.525 | 0.561 | 0.036 | 0.495 | 0.63 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 0.128 | 0.123 | 0.14 | 0.017 | 0.115 | 0.155 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.124 | 0.123 | 0.15 | 0.027 | 0.122 | 0.158 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.135 | 0.128 | 0.153 | 0.025 | 0.114 | 0.166 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 0.117 | 0.116 | 0.12 | 0.004 | 0.115 | 0.126 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 0.574 | 0.551 | 0.601 | 0.05 | 0.394 | 0.835 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 0.527 | 0.525 | 0.532 | 0.007 | 0.517 | 0.538 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 0.52 | 0.472 | 0.596 | 0.124 | 0.467 | 0.658 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 0.548 | 0.528 | 0.591 | 0.063 | 0.526 | 0.888 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 0.121 | 0.117 | 0.125 | 0.008 | 0.113 | 0.126 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 0.121 | 0.115 | 0.122 | 0.007 | 0.115 | 0.125 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 0.118 | 0.118 | 0.118 | 0 | 0.116 | 0.154 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 0.151 | 0.125 | 0.153 | 0.028 | 0.124 | 0.159 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 0.541 | 0.525 | 0.573 | 0.048 | 0.518 | 0.576 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 0.603 | 0.56 | 0.837 | 0.277 | 0.504 | 0.931 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 0.795 | 0.607 | 0.814 | 0.207 | 0.531 | 0.83 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 0.54 | 0.524 | 0.549 | 0.025 | 0.515 | 0.632 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 0.13 | 0.119 | 0.153 | 0.034 | 0.117 | 0.154 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 0.116 | 0.116 | 0.119 | 0.003 | 0.116 | 0.128 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 0.118 | 0.116 | 0.119 | 0.003 | 0.116 | 0.119 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 0.117 | 0.116 | 0.118 | 0.002 | 0.115 | 0.12 |

```text
mixed cold-create 1024//adaptive aws             | ###################### 0.587 s
mixed unchanged-update 1024//adaptive aws        | ##################### 0.568 s
mixed changed-update 1024//adaptive aws          | #################### 0.538 s
mixed pruned-update 1024//adaptive aws           | ##################### 0.553 s
mixed cold-create 1024/32/adaptive shin          | ##### 0.128 s
mixed unchanged-update 1024/32/adaptive shin     | ##### 0.124 s
mixed changed-update 1024/32/adaptive shin       | ##### 0.135 s
mixed pruned-update 1024/32/adaptive shin        | #### 0.117 s
mixed cold-create 2048//adaptive aws             | ###################### 0.574 s
mixed unchanged-update 2048//adaptive aws        | #################### 0.527 s
mixed changed-update 2048//adaptive aws          | #################### 0.52 s
mixed pruned-update 2048//adaptive aws           | ##################### 0.548 s
mixed cold-create 2048/64/adaptive shin          | ##### 0.121 s
mixed unchanged-update 2048/64/adaptive shin     | ##### 0.121 s
mixed changed-update 2048/64/adaptive shin       | #### 0.118 s
mixed pruned-update 2048/64/adaptive shin        | ###### 0.151 s
mixed cold-create 4096//adaptive aws             | #################### 0.541 s
mixed unchanged-update 4096//adaptive aws        | ####################### 0.603 s
mixed changed-update 4096//adaptive aws          | ############################## 0.795 s
mixed pruned-update 4096//adaptive aws           | #################### 0.54 s
mixed cold-create 4096/128/adaptive shin         | ##### 0.13 s
mixed unchanged-update 4096/128/adaptive shin    | #### 0.116 s
mixed changed-update 4096/128/adaptive shin      | #### 0.118 s
mixed pruned-update 4096/128/adaptive shin       | #### 0.117 s
```

### Local wall time

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 72.482 | 70.08 | 72.537 | 2.457 | 70.075 | 102.11 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 44.204 | 41.556 | 44.253 | 2.697 | 41.54 | 45.509 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 44.263 | 42.331 | 44.699 | 2.368 | 39.123 | 56.665 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 44.183 | 42.053 | 44.247 | 2.194 | 39.179 | 52.308 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 62.227 | 60.051 | 62.469 | 2.418 | 59.96 | 94.15 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 34 | 28.979 | 34.389 | 5.41 | 28.598 | 34.536 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 34.109 | 29.14 | 34.286 | 5.146 | 29.098 | 48.002 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 34.167 | 34.076 | 34.275 | 0.199 | 34.013 | 53.665 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 67.425 | 65.083 | 67.498 | 2.415 | 64.797 | 68.627 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 38.536 | 37.01 | 38.987 | 1.977 | 36.529 | 39.636 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 36.861 | 33.996 | 36.862 | 2.866 | 33.855 | 39.137 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 34.46 | 34.145 | 36.851 | 2.706 | 31.514 | 39.103 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 62.452 | 62.282 | 62.58 | 0.298 | 62.188 | 92.223 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 29.049 | 29.029 | 29.21 | 0.181 | 29.02 | 33.712 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 29.274 | 29.13 | 33.959 | 4.829 | 29.082 | 46.883 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 34.203 | 34.104 | 34.242 | 0.138 | 33.999 | 51.321 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 67.148 | 67.023 | 67.445 | 0.422 | 66.881 | 67.786 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 39.053 | 38.912 | 39.154 | 0.242 | 38.909 | 39.205 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 39.183 | 39.164 | 39.21 | 0.046 | 36.709 | 39.505 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 39.192 | 39.065 | 39.236 | 0.171 | 34.093 | 39.34 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 62.362 | 62.305 | 62.788 | 0.483 | 62.224 | 62.844 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 29.259 | 29.124 | 34.03 | 4.906 | 28.959 | 34.066 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 29.192 | 29.092 | 34.186 | 5.094 | 29.079 | 35.336 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 34.316 | 34.296 | 34.337 | 0.041 | 33.707 | 34.503 |

```text
mixed cold-create 1024//adaptive aws             | ############################## 72.482 s
mixed unchanged-update 1024//adaptive aws        | ################## 44.204 s
mixed changed-update 1024//adaptive aws          | ################## 44.263 s
mixed pruned-update 1024//adaptive aws           | ################## 44.183 s
mixed cold-create 1024/32/adaptive shin          | ########################## 62.227 s
mixed unchanged-update 1024/32/adaptive shin     | ############## 34 s
mixed changed-update 1024/32/adaptive shin       | ############## 34.109 s
mixed pruned-update 1024/32/adaptive shin        | ############## 34.167 s
mixed cold-create 2048//adaptive aws             | ############################ 67.425 s
mixed unchanged-update 2048//adaptive aws        | ################ 38.536 s
mixed changed-update 2048//adaptive aws          | ############### 36.861 s
mixed pruned-update 2048//adaptive aws           | ############## 34.46 s
mixed cold-create 2048/64/adaptive shin          | ########################## 62.452 s
mixed unchanged-update 2048/64/adaptive shin     | ############ 29.049 s
mixed changed-update 2048/64/adaptive shin       | ############ 29.274 s
mixed pruned-update 2048/64/adaptive shin        | ############## 34.203 s
mixed cold-create 4096//adaptive aws             | ############################ 67.148 s
mixed unchanged-update 4096//adaptive aws        | ################ 39.053 s
mixed changed-update 4096//adaptive aws          | ################ 39.183 s
mixed pruned-update 4096//adaptive aws           | ################ 39.192 s
mixed cold-create 4096/128/adaptive shin         | ########################## 62.362 s
mixed unchanged-update 4096/128/adaptive shin    | ############ 29.259 s
mixed changed-update 4096/128/adaptive shin      | ############ 29.192 s
mixed pruned-update 4096/128/adaptive shin       | ############## 34.316 s
```

### CDK deploy time

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 62.86 | 62.85 | 62.87 | 0.02 | 62.83 | 62.98 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 29.45 | 29.44 | 29.52 | 0.08 | 29.36 | 29.76 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 29.43 | 29.39 | 29.43 | 0.04 | 24.17 | 32.34 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 29.44 | 29.3 | 29.54 | 0.24 | 26.75 | 29.58 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 52.66 | 52.65 | 52.76 | 0.11 | 52.42 | 52.81 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 19.1 | 16.34 | 19.37 | 3.03 | 13.97 | 21.49 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 19.1 | 14.04 | 19.14 | 5.1 | 13.93 | 21.56 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 19.14 | 19.14 | 21.5 | 2.36 | 19.07 | 22.58 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 57.8 | 57.77 | 57.86 | 0.09 | 57.69 | 57.98 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 24.27 | 24.19 | 24.34 | 0.15 | 24.13 | 24.48 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 24.18 | 19.1 | 24.19 | 5.09 | 19.08 | 24.27 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 21.56 | 19.22 | 24.18 | 4.96 | 19.02 | 24.24 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 52.66 | 52.62 | 52.76 | 0.14 | 52.57 | 55.04 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 14.03 | 13.95 | 14.05 | 0.1 | 13.87 | 19.11 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 16.32 | 14.19 | 16.33 | 2.14 | 14.16 | 19.1 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 21.47 | 19.14 | 21.52 | 2.38 | 19.04 | 21.55 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 57.61 | 57.58 | 57.76 | 0.18 | 57.42 | 57.79 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 26.64 | 24.29 | 26.64 | 2.35 | 24.27 | 26.68 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 24.27 | 24.2 | 24.38 | 0.18 | 24.06 | 24.5 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 24.29 | 24.22 | 26.57 | 2.35 | 21.52 | 26.68 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 52.66 | 52.61 | 52.98 | 0.37 | 52.52 | 55.05 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 16.32 | 16.29 | 19.13 | 2.84 | 14.03 | 21.42 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 16.45 | 16.36 | 19.02 | 2.66 | 14.03 | 21.48 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 19.24 | 19.18 | 19.34 | 0.16 | 19.02 | 21.54 |

```text
mixed cold-create 1024//adaptive aws             | ############################## 62.86 s
mixed unchanged-update 1024//adaptive aws        | ############## 29.45 s
mixed changed-update 1024//adaptive aws          | ############## 29.43 s
mixed pruned-update 1024//adaptive aws           | ############## 29.44 s
mixed cold-create 1024/32/adaptive shin          | ######################### 52.66 s
mixed unchanged-update 1024/32/adaptive shin     | ######### 19.1 s
mixed changed-update 1024/32/adaptive shin       | ######### 19.1 s
mixed pruned-update 1024/32/adaptive shin        | ######### 19.14 s
mixed cold-create 2048//adaptive aws             | ############################ 57.8 s
mixed unchanged-update 2048//adaptive aws        | ############ 24.27 s
mixed changed-update 2048//adaptive aws          | ############ 24.18 s
mixed pruned-update 2048//adaptive aws           | ########## 21.56 s
mixed cold-create 2048/64/adaptive shin          | ######################### 52.66 s
mixed unchanged-update 2048/64/adaptive shin     | ####### 14.03 s
mixed changed-update 2048/64/adaptive shin       | ######## 16.32 s
mixed pruned-update 2048/64/adaptive shin        | ########## 21.47 s
mixed cold-create 4096//adaptive aws             | ########################### 57.61 s
mixed unchanged-update 4096//adaptive aws        | ############# 26.64 s
mixed changed-update 4096//adaptive aws          | ############ 24.27 s
mixed pruned-update 4096//adaptive aws           | ############ 24.29 s
mixed cold-create 4096/128/adaptive shin         | ######################### 52.66 s
mixed unchanged-update 4096/128/adaptive shin    | ######## 16.32 s
mixed changed-update 4096/128/adaptive shin      | ######## 16.45 s
mixed pruned-update 4096/128/adaptive shin       | ######### 19.24 s
```

### Max memory

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| mixed | cold-create | 1024 |  | adaptive | aws | 5 | 274 | 274 | 275 | 1 | 272 | 275 |
| mixed | unchanged-update | 1024 |  | adaptive | aws | 5 | 274 | 273 | 274 | 1 | 273 | 276 |
| mixed | changed-update | 1024 |  | adaptive | aws | 5 | 273 | 273 | 274 | 1 | 273 | 275 |
| mixed | pruned-update | 1024 |  | adaptive | aws | 5 | 266 | 266 | 267 | 1 | 266 | 268 |
| mixed | cold-create | 1024 | 32 | adaptive | shin | 5 | 93 | 92 | 96 | 4 | 90 | 97 |
| mixed | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 42 | 40 | 43 | 3 | 40 | 44 |
| mixed | changed-update | 1024 | 32 | adaptive | shin | 5 | 41 | 41 | 42 | 1 | 40 | 42 |
| mixed | pruned-update | 1024 | 32 | adaptive | shin | 5 | 37 | 37 | 37 | 0 | 37 | 40 |
| mixed | cold-create | 2048 |  | adaptive | aws | 5 | 275 | 275 | 276 | 1 | 274 | 276 |
| mixed | unchanged-update | 2048 |  | adaptive | aws | 5 | 275 | 275 | 275 | 0 | 274 | 275 |
| mixed | changed-update | 2048 |  | adaptive | aws | 5 | 275 | 275 | 276 | 1 | 275 | 279 |
| mixed | pruned-update | 2048 |  | adaptive | aws | 5 | 268 | 268 | 268 | 0 | 266 | 269 |
| mixed | cold-create | 2048 | 64 | adaptive | shin | 5 | 105 | 100 | 105 | 5 | 92 | 112 |
| mixed | unchanged-update | 2048 | 64 | adaptive | shin | 5 | 41 | 40 | 41 | 1 | 39 | 41 |
| mixed | changed-update | 2048 | 64 | adaptive | shin | 5 | 41 | 41 | 41 | 0 | 40 | 43 |
| mixed | pruned-update | 2048 | 64 | adaptive | shin | 5 | 38 | 38 | 38 | 0 | 38 | 40 |
| mixed | cold-create | 4096 |  | adaptive | aws | 5 | 275 | 275 | 275 | 0 | 275 | 277 |
| mixed | unchanged-update | 4096 |  | adaptive | aws | 5 | 275 | 275 | 275 | 0 | 274 | 278 |
| mixed | changed-update | 4096 |  | adaptive | aws | 5 | 275 | 275 | 275 | 0 | 275 | 278 |
| mixed | pruned-update | 4096 |  | adaptive | aws | 5 | 269 | 269 | 269 | 0 | 268 | 272 |
| mixed | cold-create | 4096 | 128 | adaptive | shin | 5 | 126 | 125 | 127 | 2 | 119 | 133 |
| mixed | unchanged-update | 4096 | 128 | adaptive | shin | 5 | 42 | 42 | 42 | 0 | 41 | 43 |
| mixed | changed-update | 4096 | 128 | adaptive | shin | 5 | 41 | 40 | 42 | 2 | 40 | 42 |
| mixed | pruned-update | 4096 | 128 | adaptive | shin | 5 | 39 | 39 | 40 | 1 | 39 | 41 |

```text
mixed cold-create 1024//adaptive aws             | ############################## 274 MiB
mixed unchanged-update 1024//adaptive aws        | ############################## 274 MiB
mixed changed-update 1024//adaptive aws          | ############################## 273 MiB
mixed pruned-update 1024//adaptive aws           | ############################# 266 MiB
mixed cold-create 1024/32/adaptive shin          | ########## 93 MiB
mixed unchanged-update 1024/32/adaptive shin     | ##### 42 MiB
mixed changed-update 1024/32/adaptive shin       | #### 41 MiB
mixed pruned-update 1024/32/adaptive shin        | #### 37 MiB
mixed cold-create 2048//adaptive aws             | ############################## 275 MiB
mixed unchanged-update 2048//adaptive aws        | ############################## 275 MiB
mixed changed-update 2048//adaptive aws          | ############################## 275 MiB
mixed pruned-update 2048//adaptive aws           | ############################# 268 MiB
mixed cold-create 2048/64/adaptive shin          | ########### 105 MiB
mixed unchanged-update 2048/64/adaptive shin     | #### 41 MiB
mixed changed-update 2048/64/adaptive shin       | #### 41 MiB
mixed pruned-update 2048/64/adaptive shin        | #### 38 MiB
mixed cold-create 4096//adaptive aws             | ############################## 275 MiB
mixed unchanged-update 4096//adaptive aws        | ############################## 275 MiB
mixed changed-update 4096//adaptive aws          | ############################## 275 MiB
mixed pruned-update 4096//adaptive aws           | ############################# 269 MiB
mixed cold-create 4096/128/adaptive shin         | ############## 126 MiB
mixed unchanged-update 4096/128/adaptive shin    | ##### 42 MiB
mixed changed-update 4096/128/adaptive shin      | #### 41 MiB
mixed pruned-update 4096/128/adaptive shin       | #### 39 MiB
```
