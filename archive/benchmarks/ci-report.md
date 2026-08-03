# Benchmark Report: benchmark results

## Scope

- Snapshot date: 2026-07-18
- Methodology: v2
- Run ID: 035f539d-6995-4d10-98a0-b4e9a7c5749e
- Sample completeness: complete (n=5 per provider-duration cell)
- Implementations: shin, aws
- Asset profiles: tiny-many, large-few
- Memory MiB: 1024
- Max concurrency: 32
- Source window bytes: adaptive
- Phases: cold-create, unchanged-update, changed-update, pruned-update

## ShinBucketDeployment vs AWS BucketDeployment

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Provider duration | Local wall time | CDK deploy time | Max memory |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 | 32 | adaptive | 2.484 s vs 9.169 s (3.691x faster) | 73.637 s vs 78.814 s (1.07x faster) | 57.69 s vs 63.03 s (1.093x faster) | 121 MiB vs 435 MiB (72.184% lower) |
| large-few | unchanged-update | 1024 | 32 | adaptive | 0.32 s vs 9.231 s (28.847x faster) | 35.53 s vs 46.286 s (1.303x faster) | 19.31 s vs 30.32 s (1.57x faster) | 34 MiB vs 435 MiB (92.184% lower) |
| large-few | changed-update | 1024 | 32 | adaptive | 0.523 s vs 9.085 s (17.371x faster) | 37.006 s vs 47.137 s (1.274x faster) | 19.32 s vs 30.28 s (1.567x faster) | 38 MiB vs 434 MiB (91.244% lower) |
| large-few | pruned-update | 1024 | 32 | adaptive | 0.762 s vs 8.86 s (11.627x faster) | 36.402 s vs 52.421 s (1.44x faster) | 19.46 s vs 30.58 s (1.571x faster) | 54 MiB vs 407 MiB (86.732% lower) |
| tiny-many | cold-create | 1024 | 32 | adaptive | 2.629 s vs 25.648 s (9.756x faster) | 73.078 s vs 100.336 s (1.373x faster) | 57.55 s vs 84.98 s (1.477x faster) | 47 MiB vs 218 MiB (78.44% lower) |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | 0.512 s vs 26.881 s (52.502x faster) | 35.425 s vs 62.866 s (1.775x faster) | 19.32 s vs 46.88 s (2.427x faster) | 36 MiB vs 209 MiB (82.775% lower) |
| tiny-many | changed-update | 1024 | 32 | adaptive | 0.657 s vs 26.665 s (40.586x faster) | 36.015 s vs 68.314 s (1.897x faster) | 19.24 s vs 46.79 s (2.432x faster) | 36 MiB vs 212 MiB (83.019% lower) |
| tiny-many | pruned-update | 1024 | 32 | adaptive | 2.978 s vs 26.204 s (8.799x faster) | 41.753 s vs 64.044 s (1.534x faster) | 25.12 s vs 47.17 s (1.878x faster) | 36 MiB vs 207 MiB (82.609% lower) |

### large-few cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 2.484 s | 9.169 s | +6.685 s | 3.691x | +269.122% |
| Billed duration | 2.6 s | 9.702 s | +7.102 s | 3.732x | +273.154% |
| Init duration | 0.127 s | 0.533 s | +0.406 s | 4.197x | +319.685% |
| Local wall time | 73.637 s | 78.814 s | +5.177 s | 1.07x | +7.03% |
| CDK deploy time | 57.69 s | 63.03 s | +5.34 s | 1.093x | +9.256% |
| Max memory | 121 MiB | 435 MiB | +314 MiB | 3.595x | +259.504% |

### large-few unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.32 s | 9.231 s | +8.911 s | 28.847x | +2784.687% |
| Billed duration | 0.472 s | 9.757 s | +9.285 s | 20.672x | +1967.161% |
| Init duration | 0.145 s | 0.529 s | +0.384 s | 3.648x | +264.828% |
| Local wall time | 35.53 s | 46.286 s | +10.756 s | 1.303x | +30.273% |
| CDK deploy time | 19.31 s | 30.32 s | +11.01 s | 1.57x | +57.017% |
| Max memory | 34 MiB | 435 MiB | +401 MiB | 12.794x | +1179.412% |

### large-few changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.523 s | 9.085 s | +8.562 s | 17.371x | +1637.094% |
| Billed duration | 0.647 s | 9.66 s | +9.013 s | 14.93x | +1393.045% |
| Init duration | 0.123 s | 0.536 s | +0.413 s | 4.358x | +335.772% |
| Local wall time | 37.006 s | 47.137 s | +10.131 s | 1.274x | +27.377% |
| CDK deploy time | 19.32 s | 30.28 s | +10.96 s | 1.567x | +56.729% |
| Max memory | 38 MiB | 434 MiB | +396 MiB | 11.421x | +1042.105% |

### large-few pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.762 s | 8.86 s | +8.098 s | 11.627x | +1062.73% |
| Billed duration | 0.891 s | 9.397 s | +8.506 s | 10.547x | +954.658% |
| Init duration | 0.131 s | 0.553 s | +0.422 s | 4.221x | +322.137% |
| Local wall time | 36.402 s | 52.421 s | +16.019 s | 1.44x | +44.006% |
| CDK deploy time | 19.46 s | 30.58 s | +11.12 s | 1.571x | +57.143% |
| Max memory | 54 MiB | 407 MiB | +353 MiB | 7.537x | +653.704% |

### tiny-many cold-create at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 2.629 s | 25.648 s | +23.019 s | 9.756x | +875.58% |
| Billed duration | 2.778 s | 26.174 s | +23.396 s | 9.422x | +842.189% |
| Init duration | 0.151 s | 0.53 s | +0.379 s | 3.51x | +250.993% |
| Local wall time | 73.078 s | 100.336 s | +27.258 s | 1.373x | +37.3% |
| CDK deploy time | 57.55 s | 84.98 s | +27.43 s | 1.477x | +47.663% |
| Max memory | 47 MiB | 218 MiB | +171 MiB | 4.638x | +363.83% |

### tiny-many unchanged-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.512 s | 26.881 s | +26.369 s | 52.502x | +5150.195% |
| Billed duration | 0.66 s | 27.435 s | +26.775 s | 41.568x | +4056.818% |
| Init duration | 0.148 s | 0.534 s | +0.386 s | 3.608x | +260.811% |
| Local wall time | 35.425 s | 62.866 s | +27.441 s | 1.775x | +77.462% |
| CDK deploy time | 19.32 s | 46.88 s | +27.56 s | 2.427x | +142.65% |
| Max memory | 36 MiB | 209 MiB | +173 MiB | 5.806x | +480.556% |

### tiny-many changed-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 0.657 s | 26.665 s | +26.008 s | 40.586x | +3958.6% |
| Billed duration | 0.773 s | 27.251 s | +26.478 s | 35.254x | +3425.356% |
| Init duration | 0.122 s | 0.586 s | +0.464 s | 4.803x | +380.328% |
| Local wall time | 36.015 s | 68.314 s | +32.299 s | 1.897x | +89.682% |
| CDK deploy time | 19.24 s | 46.79 s | +27.55 s | 2.432x | +143.191% |
| Max memory | 36 MiB | 212 MiB | +176 MiB | 5.889x | +488.889% |

### tiny-many pruned-update at 1024 MiB / max concurrency 32 / source window adaptive

| Metric | ShinBucketDeployment | AWS BucketDeployment | Difference | AWS/Shin | AWS delta % |
| --- | ---: | ---: | ---: | ---: | ---: |
| Provider duration | 2.978 s | 26.204 s | +23.226 s | 8.799x | +779.919% |
| Billed duration | 3.129 s | 26.964 s | +23.835 s | 8.617x | +761.745% |
| Init duration | 0.127 s | 0.638 s | +0.511 s | 5.024x | +402.362% |
| Local wall time | 41.753 s | 64.044 s | +22.291 s | 1.534x | +53.388% |
| CDK deploy time | 25.12 s | 47.17 s | +22.05 s | 1.878x | +87.779% |
| Max memory | 36 MiB | 207 MiB | +171 MiB | 5.75x | +475% |

## Metric Tables

### Provider duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 9.169 | 9.034 | 9.25 | 0.216 | 8.236 | 9.373 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 9.231 | 9.11 | 9.283 | 0.173 | 8.991 | 9.321 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 9.085 | 9.013 | 9.398 | 0.385 | 8.964 | 9.495 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 8.86 | 8.76 | 8.914 | 0.154 | 8.695 | 9.446 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 2.484 | 2.395 | 56.04 | 53.645 | 2.147 | 56.297 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.32 | 0.319 | 0.336 | 0.017 | 0.316 | 0.339 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.523 | 0.521 | 0.558 | 0.037 | 0.502 | 0.571 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 0.762 | 0.703 | 0.857 | 0.154 | 0.662 | 0.885 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 25.648 | 25.488 | 25.802 | 0.314 | 25.133 | 26.026 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 26.881 | 26.532 | 27.471 | 0.939 | 24.776 | 27.687 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 26.665 | 26.008 | 27.161 | 1.153 | 25.91 | 27.219 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 26.204 | 25.967 | 26.225 | 0.258 | 24.927 | 27.374 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 2.629 | 2.564 | 2.631 | 0.067 | 2.461 | 2.641 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.512 | 0.481 | 0.529 | 0.048 | 0.473 | 0.547 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.657 | 0.647 | 0.682 | 0.035 | 0.637 | 0.691 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 2.978 | 2.952 | 2.991 | 0.039 | 2.919 | 3.097 |

```text
large-few cold-create 1024//adaptive aws         | ########## 9.169 s
large-few unchanged-update 1024//adaptive aws    | ########## 9.231 s
large-few changed-update 1024//adaptive aws      | ########## 9.085 s
large-few pruned-update 1024//adaptive aws       | ########## 8.86 s
large-few cold-create 1024/32/adaptive shin      | ### 2.484 s
large-few unchanged-update 1024/32/adaptive shin | # 0.32 s
large-few changed-update 1024/32/adaptive shin   | # 0.523 s
large-few pruned-update 1024/32/adaptive shin    | # 0.762 s
tiny-many cold-create 1024//adaptive aws         | ############################# 25.648 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 26.881 s
tiny-many changed-update 1024//adaptive aws      | ############################## 26.665 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.204 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.629 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.512 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.657 s
tiny-many pruned-update 1024/32/adaptive shin    | ### 2.978 s
```

### Billed duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 9.702 | 9.567 | 9.778 | 0.211 | 8.719 | 9.918 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 9.757 | 9.662 | 9.85 | 0.188 | 9.515 | 10.071 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 9.66 | 9.55 | 9.932 | 0.382 | 9.478 | 10.061 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 9.397 | 9.314 | 9.482 | 0.168 | 9.21 | 10.48 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 2.6 | 2.527 | 56.152 | 53.625 | 2.276 | 56.425 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.472 | 0.459 | 0.484 | 0.025 | 0.434 | 0.498 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.647 | 0.637 | 0.706 | 0.069 | 0.625 | 0.727 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 0.891 | 0.834 | 1.009 | 0.175 | 0.779 | 1.04 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 26.174 | 26.019 | 26.544 | 0.525 | 25.7 | 27.004 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 27.435 | 27.108 | 28.006 | 0.898 | 25.263 | 28.211 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 27.251 | 27.187 | 27.682 | 0.495 | 26.43 | 27.865 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 26.964 | 26.754 | 27.002 | 0.248 | 25.439 | 28.013 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 2.778 | 2.716 | 2.79 | 0.074 | 2.616 | 2.814 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.66 | 0.605 | 0.688 | 0.083 | 0.602 | 0.703 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.773 | 0.769 | 0.843 | 0.074 | 0.75 | 0.844 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 3.129 | 3.079 | 3.144 | 0.065 | 3.033 | 3.215 |

```text
large-few cold-create 1024//adaptive aws         | ########### 9.702 s
large-few unchanged-update 1024//adaptive aws    | ########### 9.757 s
large-few changed-update 1024//adaptive aws      | ########### 9.66 s
large-few pruned-update 1024//adaptive aws       | ########## 9.397 s
large-few cold-create 1024/32/adaptive shin      | ### 2.6 s
large-few unchanged-update 1024/32/adaptive shin | # 0.472 s
large-few changed-update 1024/32/adaptive shin   | # 0.647 s
large-few pruned-update 1024/32/adaptive shin    | # 0.891 s
tiny-many cold-create 1024//adaptive aws         | ############################# 26.174 s
tiny-many unchanged-update 1024//adaptive aws    | ############################## 27.435 s
tiny-many changed-update 1024//adaptive aws      | ############################## 27.251 s
tiny-many pruned-update 1024//adaptive aws       | ############################# 26.964 s
tiny-many cold-create 1024/32/adaptive shin      | ### 2.778 s
tiny-many unchanged-update 1024/32/adaptive shin | # 0.66 s
tiny-many changed-update 1024/32/adaptive shin   | # 0.773 s
tiny-many pruned-update 1024/32/adaptive shin    | ### 3.129 s
```

### Init duration

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 0.533 | 0.527 | 0.533 | 0.006 | 0.483 | 0.545 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 0.529 | 0.525 | 0.551 | 0.026 | 0.524 | 0.787 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 0.536 | 0.534 | 0.565 | 0.031 | 0.514 | 0.575 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 0.553 | 0.536 | 0.568 | 0.032 | 0.514 | 1.034 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 0.127 | 0.115 | 0.129 | 0.014 | 0.111 | 0.132 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.145 | 0.139 | 0.152 | 0.013 | 0.117 | 0.161 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.123 | 0.123 | 0.148 | 0.025 | 0.115 | 0.156 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 0.131 | 0.128 | 0.151 | 0.023 | 0.116 | 0.155 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 0.53 | 0.525 | 0.566 | 0.041 | 0.517 | 1.202 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 0.534 | 0.524 | 0.553 | 0.029 | 0.487 | 0.575 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 0.586 | 0.52 | 0.645 | 0.125 | 0.52 | 1.178 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 0.638 | 0.528 | 0.797 | 0.269 | 0.511 | 0.997 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 0.151 | 0.149 | 0.155 | 0.006 | 0.148 | 0.182 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 0.148 | 0.128 | 0.156 | 0.028 | 0.124 | 0.158 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 0.122 | 0.115 | 0.151 | 0.036 | 0.113 | 0.162 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 0.127 | 0.118 | 0.15 | 0.032 | 0.113 | 0.153 |

```text
large-few cold-create 1024//adaptive aws         | ######################### 0.533 s
large-few unchanged-update 1024//adaptive aws    | ######################### 0.529 s
large-few changed-update 1024//adaptive aws      | ######################### 0.536 s
large-few pruned-update 1024//adaptive aws       | ########################## 0.553 s
large-few cold-create 1024/32/adaptive shin      | ###### 0.127 s
large-few unchanged-update 1024/32/adaptive shin | ####### 0.145 s
large-few changed-update 1024/32/adaptive shin   | ###### 0.123 s
large-few pruned-update 1024/32/adaptive shin    | ###### 0.131 s
tiny-many cold-create 1024//adaptive aws         | ######################### 0.53 s
tiny-many unchanged-update 1024//adaptive aws    | ######################### 0.534 s
tiny-many changed-update 1024//adaptive aws      | ############################ 0.586 s
tiny-many pruned-update 1024//adaptive aws       | ############################## 0.638 s
tiny-many cold-create 1024/32/adaptive shin      | ####### 0.151 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 0.148 s
tiny-many changed-update 1024/32/adaptive shin   | ###### 0.122 s
tiny-many pruned-update 1024/32/adaptive shin    | ###### 0.127 s
```

### Local wall time

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 78.814 | 78.727 | 78.862 | 0.135 | 73.737 | 78.937 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 46.286 | 46.082 | 46.305 | 0.223 | 41.937 | 46.319 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 47.137 | 47 | 48.3 | 1.3 | 46.87 | 52.522 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 52.421 | 52.417 | 52.573 | 0.156 | 46.994 | 58.842 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 73.637 | 73.298 | 123.426 | 50.128 | 69.126 | 133.921 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 35.53 | 35.316 | 35.582 | 0.266 | 31.617 | 35.583 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 37.006 | 36.285 | 41.458 | 5.173 | 36.249 | 41.839 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 36.402 | 36.261 | 37.02 | 0.759 | 35.985 | 41.535 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 100.336 | 100.203 | 100.571 | 0.368 | 95.353 | 101.404 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 62.866 | 62.675 | 63.206 | 0.531 | 62.337 | 63.367 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 68.314 | 63.272 | 68.515 | 5.243 | 62.727 | 69.209 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 64.044 | 63.398 | 69.137 | 5.739 | 63.154 | 69.165 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 73.078 | 73.043 | 73.253 | 0.21 | 70.234 | 73.506 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 35.425 | 35.406 | 35.553 | 0.147 | 32.03 | 35.558 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 36.015 | 35.915 | 37.507 | 1.592 | 35.436 | 41.022 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 41.753 | 41.402 | 42.682 | 1.28 | 41.281 | 47.559 |

```text
large-few cold-create 1024//adaptive aws         | ######################## 78.814 s
large-few unchanged-update 1024//adaptive aws    | ############## 46.286 s
large-few changed-update 1024//adaptive aws      | ############## 47.137 s
large-few pruned-update 1024//adaptive aws       | ################ 52.421 s
large-few cold-create 1024/32/adaptive shin      | ###################### 73.637 s
large-few unchanged-update 1024/32/adaptive shin | ########### 35.53 s
large-few changed-update 1024/32/adaptive shin   | ########### 37.006 s
large-few pruned-update 1024/32/adaptive shin    | ########### 36.402 s
tiny-many cold-create 1024//adaptive aws         | ############################## 100.336 s
tiny-many unchanged-update 1024//adaptive aws    | ################### 62.866 s
tiny-many changed-update 1024//adaptive aws      | #################### 68.314 s
tiny-many pruned-update 1024//adaptive aws       | ################### 64.044 s
tiny-many cold-create 1024/32/adaptive shin      | ###################### 73.078 s
tiny-many unchanged-update 1024/32/adaptive shin | ########### 35.425 s
tiny-many changed-update 1024/32/adaptive shin   | ########### 36.015 s
tiny-many pruned-update 1024/32/adaptive shin    | ############ 41.753 s
```

### CDK deploy time

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (s) | Q1 (s) | Q3 (s) | IQR (s) | min (s) | max (s) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 63.03 | 63.02 | 63.05 | 0.03 | 60.84 | 63.05 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 30.32 | 30.31 | 30.33 | 0.02 | 28.71 | 30.39 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 30.28 | 30.18 | 30.28 | 0.1 | 29.4 | 30.29 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 30.58 | 30.54 | 30.63 | 0.09 | 30.53 | 39.73 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 57.69 | 57.5 | 106.82 | 49.32 | 55.83 | 117.85 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 19.31 | 19.2 | 19.32 | 0.12 | 17.96 | 19.36 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 19.32 | 19.24 | 19.33 | 0.09 | 18.08 | 19.34 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 19.46 | 19.43 | 19.47 | 0.04 | 18.11 | 19.52 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 84.98 | 84.88 | 85 | 0.12 | 82.08 | 85.06 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 46.88 | 46.71 | 47.15 | 0.44 | 46.66 | 49.84 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 46.79 | 46.74 | 46.89 | 0.15 | 46.6 | 49.88 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 47.17 | 47.14 | 47.29 | 0.15 | 46.93 | 49.94 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 57.55 | 57.53 | 57.61 | 0.08 | 55.28 | 57.64 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 19.32 | 19.3 | 19.36 | 0.06 | 17.94 | 19.39 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 19.24 | 19.2 | 19.3 | 0.1 | 17.97 | 19.41 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 25.12 | 24.96 | 25.17 | 0.21 | 23.37 | 25.25 |

```text
large-few cold-create 1024//adaptive aws         | ###################### 63.03 s
large-few unchanged-update 1024//adaptive aws    | ########### 30.32 s
large-few changed-update 1024//adaptive aws      | ########### 30.28 s
large-few pruned-update 1024//adaptive aws       | ########### 30.58 s
large-few cold-create 1024/32/adaptive shin      | #################### 57.69 s
large-few unchanged-update 1024/32/adaptive shin | ####### 19.31 s
large-few changed-update 1024/32/adaptive shin   | ####### 19.32 s
large-few pruned-update 1024/32/adaptive shin    | ####### 19.46 s
tiny-many cold-create 1024//adaptive aws         | ############################## 84.98 s
tiny-many unchanged-update 1024//adaptive aws    | ################# 46.88 s
tiny-many changed-update 1024//adaptive aws      | ################# 46.79 s
tiny-many pruned-update 1024//adaptive aws       | ################# 47.17 s
tiny-many cold-create 1024/32/adaptive shin      | #################### 57.55 s
tiny-many unchanged-update 1024/32/adaptive shin | ####### 19.32 s
tiny-many changed-update 1024/32/adaptive shin   | ####### 19.24 s
tiny-many pruned-update 1024/32/adaptive shin    | ######### 25.12 s
```

### Max memory

| Asset profile | Phase | Memory MiB | Max concurrency | Source window bytes | Implementation | n | median (MiB) | Q1 (MiB) | Q3 (MiB) | IQR (MiB) | min (MiB) | max (MiB) |
| --- | --- | ---: | ---: | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| large-few | cold-create | 1024 |  | adaptive | aws | 5 | 435 | 435 | 435 | 0 | 435 | 435 |
| large-few | unchanged-update | 1024 |  | adaptive | aws | 5 | 435 | 435 | 435 | 0 | 435 | 435 |
| large-few | changed-update | 1024 |  | adaptive | aws | 5 | 434 | 434 | 435 | 1 | 433 | 436 |
| large-few | pruned-update | 1024 |  | adaptive | aws | 5 | 407 | 407 | 407 | 0 | 406 | 407 |
| large-few | cold-create | 1024 | 32 | adaptive | shin | 5 | 121 | 116 | 125 | 9 | 113 | 133 |
| large-few | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 34 | 34 | 34 | 0 | 34 | 34 |
| large-few | changed-update | 1024 | 32 | adaptive | shin | 5 | 38 | 37 | 39 | 2 | 36 | 39 |
| large-few | pruned-update | 1024 | 32 | adaptive | shin | 5 | 54 | 53 | 55 | 2 | 52 | 56 |
| tiny-many | cold-create | 1024 |  | adaptive | aws | 5 | 218 | 217 | 218 | 1 | 217 | 218 |
| tiny-many | unchanged-update | 1024 |  | adaptive | aws | 5 | 209 | 208 | 210 | 2 | 208 | 212 |
| tiny-many | changed-update | 1024 |  | adaptive | aws | 5 | 212 | 210 | 213 | 3 | 210 | 217 |
| tiny-many | pruned-update | 1024 |  | adaptive | aws | 5 | 207 | 206 | 208 | 2 | 206 | 212 |
| tiny-many | cold-create | 1024 | 32 | adaptive | shin | 5 | 47 | 47 | 47 | 0 | 45 | 47 |
| tiny-many | unchanged-update | 1024 | 32 | adaptive | shin | 5 | 36 | 36 | 36 | 0 | 35 | 38 |
| tiny-many | changed-update | 1024 | 32 | adaptive | shin | 5 | 36 | 36 | 36 | 0 | 36 | 36 |
| tiny-many | pruned-update | 1024 | 32 | adaptive | shin | 5 | 36 | 36 | 37 | 1 | 35 | 37 |

```text
large-few cold-create 1024//adaptive aws         | ############################## 435 MiB
large-few unchanged-update 1024//adaptive aws    | ############################## 435 MiB
large-few changed-update 1024//adaptive aws      | ############################## 434 MiB
large-few pruned-update 1024//adaptive aws       | ############################ 407 MiB
large-few cold-create 1024/32/adaptive shin      | ######## 121 MiB
large-few unchanged-update 1024/32/adaptive shin | ## 34 MiB
large-few changed-update 1024/32/adaptive shin   | ### 38 MiB
large-few pruned-update 1024/32/adaptive shin    | #### 54 MiB
tiny-many cold-create 1024//adaptive aws         | ############### 218 MiB
tiny-many unchanged-update 1024//adaptive aws    | ############## 209 MiB
tiny-many changed-update 1024//adaptive aws      | ############### 212 MiB
tiny-many pruned-update 1024//adaptive aws       | ############## 207 MiB
tiny-many cold-create 1024/32/adaptive shin      | ### 47 MiB
tiny-many unchanged-update 1024/32/adaptive shin | ## 36 MiB
tiny-many changed-update 1024/32/adaptive shin   | ## 36 MiB
tiny-many pruned-update 1024/32/adaptive shin    | ## 36 MiB
```
