# Security policy

## Supported versions

Security fixes are provided for the latest published version only. Versions
`0.1.1` through `0.1.4` must not be deployed because their packaged Lambda
entrypoint is not executable. Upgrade to `0.1.5` or later.

## Report a vulnerability

Use GitHub's **Report a vulnerability** form on the repository Security page.
This creates a private report that can be discussed and fixed before public
disclosure. Do not open a public issue for a suspected vulnerability.

Include the affected version, impact, reproduction steps or a minimal proof of
concept, and any suggested mitigation. Do not include credentials, presigned
URLs, AWS identifiers, private bucket names, or user data.

The maintainer will acknowledge a complete report within seven days and will
coordinate remediation and disclosure based on severity. Please allow a
reasonable remediation window before publishing details.

## Scope

Security reports may cover the TypeScript construct, generated IAM and
CloudFormation, the Rust Lambda provider, package/release integrity, or the
repository's supported build and deployment workflows.
