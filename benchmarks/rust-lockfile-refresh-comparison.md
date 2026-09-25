# Rust lockfile refresh comparison

Before/after provider evidence for [#243](https://github.com/garysassano/shin-bucket-deployment/pull/243), which refreshed `rust/Cargo.lock` within the existing `Cargo.toml` ranges. Performance measurements do not establish deployed correctness.

Before: `0409b76e2d276154cad87d4f7306662132711339`, run `98c176b7-469f-48f0-84c6-5a4b8dc2a259`, workflow 36076274562.

After: `61df471e922d659c37b42aa6a2638f9e119bd70b`, run `082cd0d2-8b83-42a0-9a98-62e4a6d7f1e9`, workflow 36084592016.

Both runs use the canonical matrix: Shin and upstream AWS CDK `BucketDeployment` on arm64 with `aws-cdk-lib` 2.270.0, three profiles, two Lambda configurations, four phases, and five parallel repetitions per cell (240 samples each) in `eu-central-1`. Both record cleanup `destroyed` from clean checkouts. No Shin provider input other than `rust/Cargo.lock` changed between the measured commits. Values are medians of five; IQR uses inclusive quartiles and is descriptive, not a significance test. No samples were dropped.

| Profile   | MiB/transfers | Phase            | Shin before s | Shin after s |   Δ % | IQR              | AWS before s | AWS after s | AWS Δ % | Peak MiB before→after |
| --------- | ------------- | ---------------- | ------------: | -----------: | ----: | ---------------- | -----------: | ----------: | ------: | --------------------- |
| large-few | 1024/32       | cold-create      |         2.008 |        1.904 |  -5.2 | disjoint, faster |        8.378 |       8.427 |    +0.6 | 119→109               |
| large-few | 1024/32       | unchanged-update |         0.282 |        0.253 | -10.3 | overlap          |        8.224 |       8.193 |    -0.4 | 35→35                 |
| large-few | 1024/32       | changed-update   |         0.449 |        0.461 |  +2.7 | disjoint, slower |        8.294 |       8.387 |    +1.1 | 42→42                 |
| large-few | 1024/32       | pruned-update    |         0.527 |        0.543 |  +3.0 | overlap          |        7.989 |       7.985 |    -0.1 | 42→42                 |
| large-few | 2048/64       | cold-create      |         1.217 |        1.207 |  -0.8 | overlap          |        4.656 |       4.639 |    -0.4 | 187→167               |
| large-few | 2048/64       | unchanged-update |         0.219 |        0.224 |  +2.3 | overlap          |        4.688 |       4.691 |    +0.1 | 35→35                 |
| large-few | 2048/64       | changed-update   |         0.404 |        0.429 |  +6.2 | overlap          |        4.621 |       4.620 |    -0.0 | 43→41                 |
| large-few | 2048/64       | pruned-update    |         0.484 |        0.499 |  +3.1 | overlap          |        4.503 |       4.434 |    -1.5 | 41→42                 |
| mixed     | 1024/32       | cold-create      |         1.429 |        1.224 | -14.3 | disjoint, faster |        8.775 |       8.952 |    +2.0 | 105→89                |
| mixed     | 1024/32       | unchanged-update |         0.285 |        0.289 |  +1.4 | overlap          |        9.059 |       9.264 |    +2.3 | 35→35                 |
| mixed     | 1024/32       | changed-update   |         0.465 |        0.429 |  -7.7 | overlap          |        8.859 |       9.389 |    +6.0 | 39→39                 |
| mixed     | 1024/32       | pruned-update    |         1.058 |        1.098 |  +3.8 | overlap          |        8.919 |       9.050 |    +1.5 | 41→39                 |
| mixed     | 2048/64       | cold-create      |         0.802 |        0.807 |  +0.6 | overlap          |        5.006 |       5.069 |    +1.3 | 118→98                |
| mixed     | 2048/64       | unchanged-update |         0.265 |        0.239 |  -9.8 | disjoint, faster |        5.002 |       5.028 |    +0.5 | 36→37                 |
| mixed     | 2048/64       | changed-update   |         0.354 |        0.387 |  +9.3 | overlap          |        5.110 |       5.220 |    +2.2 | 39→39                 |
| mixed     | 2048/64       | pruned-update    |         1.064 |        1.055 |  -0.8 | overlap          |        5.463 |       5.116 |    -6.4 | 39→39                 |
| tiny-many | 1024/32       | cold-create      |         2.617 |        2.498 |  -4.5 | disjoint, faster |       23.202 |      23.442 |    +1.0 | 59→55                 |
| tiny-many | 1024/32       | unchanged-update |         0.506 |        0.510 |  +0.8 | overlap          |       24.023 |      25.455 |    +6.0 | 38→37                 |
| tiny-many | 1024/32       | changed-update   |         0.619 |        0.632 |  +2.1 | overlap          |       26.017 |      24.639 |    -5.3 | 38→38                 |
| tiny-many | 1024/32       | pruned-update    |         1.402 |        1.425 |  +1.6 | overlap          |       23.063 |      25.126 |    +8.9 | 38→38                 |
| tiny-many | 2048/64       | cold-create      |         1.499 |        1.471 |  -1.9 | overlap          |       12.919 |      13.355 |    +3.4 | 73→69                 |
| tiny-many | 2048/64       | unchanged-update |         0.490 |        0.470 |  -4.1 | overlap          |       13.303 |      13.839 |    +4.0 | 38→37                 |
| tiny-many | 2048/64       | changed-update   |         0.576 |        0.560 |  -2.8 | overlap          |       13.591 |      13.616 |    +0.2 | 38→38                 |
| tiny-many | 2048/64       | pruned-update    |         1.357 |        1.292 |  -4.8 | overlap          |       12.785 |      13.132 |    +2.7 | 38→38                 |
