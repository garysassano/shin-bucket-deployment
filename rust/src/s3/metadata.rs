use std::collections::HashMap;

use anyhow::{Result, anyhow, ensure};
use aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder;
use aws_sdk_s3::operation::get_object_acl::GetObjectAclOutput;
use aws_sdk_s3::operation::head_object::HeadObjectOutput;
use aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder;
use aws_sdk_s3::types::{
    Grant, ObjectCannedAcl, Permission, ServerSideEncryption, StorageClass, Type,
};
use http::HeaderValue;

use crate::types::{DeploymentRequest, ObjectMetadata};

const S3_METADATA_LIMIT_BYTES: usize = 2 * 1024;
const S3_PUT_HEADER_LIMIT_BYTES: usize = 8 * 1024;
const PUT_HEADER_FIXED_RESERVE_BYTES: usize = 2 * 1024;
const USER_METADATA_HEADER_PREFIX: &str = "x-amz-meta-";
const ALL_USERS_GROUP: &str = "http://acs.amazonaws.com/groups/global/AllUsers";
const AUTHENTICATED_USERS_GROUP: &str = "http://acs.amazonaws.com/groups/global/AuthenticatedUsers";
const AWS_EXEC_READ_GROUP: &str = "http://acs.amazonaws.com/groups/s3/aws-exec-read";

const SUPPORTED_SYSTEM_METADATA: &[&str] = &[
    "acl",
    "cache-control",
    "content-disposition",
    "content-encoding",
    "content-language",
    "content-type",
    "sse",
    "sse-kms-key-id",
    "storage-class",
    "website-redirect",
];

impl ObjectMetadata {
    pub(crate) fn from_request(request: &DeploymentRequest) -> Result<Self> {
        let user_metadata = normalize_user_metadata(&request.user_metadata)?;
        let system_metadata = normalize_system_metadata(&request.system_metadata)?;
        let metadata = Self {
            user_metadata,
            cache_control: system_metadata.get("cache-control").cloned(),
            content_disposition: system_metadata.get("content-disposition").cloned(),
            content_encoding: system_metadata.get("content-encoding").cloned(),
            content_language: system_metadata.get("content-language").cloned(),
            content_type: system_metadata.get("content-type").cloned(),
            server_side_encryption: system_metadata.get("sse").cloned(),
            storage_class: system_metadata.get("storage-class").cloned(),
            website_redirect_location: system_metadata.get("website-redirect").cloned(),
            sse_kms_key_id: system_metadata.get("sse-kms-key-id").cloned(),
            acl: system_metadata.get("acl").cloned(),
        };
        metadata.validate_user_metadata()?;
        metadata.validate_system_metadata()?;
        metadata.validate_encryption_configuration()?;
        metadata.validate_request_headers("", None)?;
        Ok(metadata)
    }

    pub(crate) fn resolved_content_type(&self, key: &str) -> Option<String> {
        self.content_type.clone().or_else(|| {
            mime_guess::from_path(key)
                .first_raw()
                .map(|mime| mime.to_string())
        })
    }

    pub(crate) fn semantically_matches(&self, other: &Self, key: &str) -> bool {
        self.user_metadata == other.user_metadata
            && self.cache_control == other.cache_control
            && self.content_disposition == other.content_disposition
            && self.content_encoding == other.content_encoding
            && self.content_language == other.content_language
            && self.resolved_content_type(key) == other.resolved_content_type(key)
            && self.server_side_encryption == other.server_side_encryption
            && self.storage_class.as_deref().unwrap_or("STANDARD")
                == other.storage_class.as_deref().unwrap_or("STANDARD")
            && self.website_redirect_location == other.website_redirect_location
            && self.sse_kms_key_id == other.sse_kms_key_id
            && self.acl.as_deref().unwrap_or("private") == other.acl.as_deref().unwrap_or("private")
    }

    pub(crate) fn validate_for_key(&self, key: &str) -> Result<()> {
        self.validate_request_headers(key, None)
    }

    pub(crate) fn validate_copy_for_key(
        &self,
        key: &str,
        source_bucket: &str,
        source_key: &str,
    ) -> Result<()> {
        let copy_source = format!(
            "{}/{}",
            source_bucket,
            urlencoding::encode(source_key).replace('+', "%20")
        );
        self.validate_request_headers(key, Some(("x-amz-copy-source", &copy_source)))
    }

    fn validate_request_headers(&self, key: &str, extra: Option<(&str, &str)>) -> Result<()> {
        let mut system_bytes = 0_usize;
        let mut controlled_header_bytes = PUT_HEADER_FIXED_RESERVE_BYTES;

        for (name, value) in self.system_headers(key) {
            validate_system_header_value(name, &value)?;
            system_bytes = checked_metadata_size(system_bytes, system_header_name(name), &value)?;
            controlled_header_bytes = checked_wire_header_size(
                controlled_header_bytes,
                system_header_name(name),
                &value,
            )?;
        }

        ensure!(
            system_bytes <= S3_METADATA_LIMIT_BYTES,
            "S3 system metadata for `{key}` is {system_bytes} bytes, larger than the 2048-byte limit"
        );

        for (name, value) in &self.user_metadata {
            controlled_header_bytes = checked_wire_header_size(
                controlled_header_bytes,
                &format!("{USER_METADATA_HEADER_PREFIX}{name}"),
                value,
            )?;
        }
        if let Some((name, value)) = extra {
            controlled_header_bytes =
                checked_wire_header_size(controlled_header_bytes, name, value)?;
        }
        ensure!(
            controlled_header_bytes <= S3_PUT_HEADER_LIMIT_BYTES,
            "S3 request headers for `{key}` exceed the 8192-byte PUT header limit"
        );

        Ok(())
    }

    pub(crate) fn matches_head_object(&self, head: &HeadObjectOutput, key: &str) -> bool {
        if head.missing_meta().unwrap_or_default() != 0 {
            return false;
        }

        let actual_user_metadata = head
            .metadata()
            .map(normalize_head_metadata)
            .unwrap_or_default();
        if actual_user_metadata != self.user_metadata {
            return false;
        }

        exact_optional(self.cache_control.as_deref(), head.cache_control())
            && exact_optional(
                self.content_disposition.as_deref(),
                head.content_disposition(),
            )
            && exact_optional(self.content_encoding.as_deref(), head.content_encoding())
            && exact_optional(self.content_language.as_deref(), head.content_language())
            && exact_optional(
                self.resolved_content_type(key).as_deref(),
                head.content_type(),
            )
            && requested_optional_matches(
                self.server_side_encryption.as_deref(),
                head.server_side_encryption().map(|value| value.as_str()),
            )
            && storage_class_matches(
                self.storage_class.as_deref(),
                head.storage_class().map(|value| value.as_str()),
            )
            && exact_optional(
                self.website_redirect_location.as_deref(),
                head.website_redirect_location(),
            )
            && requested_optional_matches(self.sse_kms_key_id.as_deref(), head.ssekms_key_id())
    }

    pub(crate) fn requires_bucket_owner_acl_identity(&self) -> bool {
        matches!(
            self.acl.as_deref(),
            Some("bucket-owner-read" | "bucket-owner-full-control")
        )
    }

    pub(crate) fn matches_object_acl(
        &self,
        acl: &GetObjectAclOutput,
        bucket_owner_id: Option<&str>,
    ) -> bool {
        let Some(owner_id) = acl.owner().and_then(|owner| owner.id()) else {
            return false;
        };
        let mut owner_full_control = 0_usize;
        let mut remaining = Vec::new();
        for grant in acl.grants() {
            if is_canonical_grant(grant, owner_id, Permission::FullControl) {
                owner_full_control += 1;
            } else {
                remaining.push(grant);
            }
        }
        if owner_full_control != 1 {
            return false;
        }

        match self.acl.as_deref().unwrap_or("private") {
            "private" => remaining.is_empty(),
            "public-read" => {
                matches_group_grants(&remaining, &[(ALL_USERS_GROUP, Permission::Read)])
            }
            "public-read-write" => matches_group_grants(
                &remaining,
                &[
                    (ALL_USERS_GROUP, Permission::Read),
                    (ALL_USERS_GROUP, Permission::Write),
                ],
            ),
            "authenticated-read" => {
                matches_group_grants(&remaining, &[(AUTHENTICATED_USERS_GROUP, Permission::Read)])
            }
            "aws-exec-read" => {
                matches_group_grants(&remaining, &[(AWS_EXEC_READ_GROUP, Permission::Read)])
            }
            "bucket-owner-read" => {
                bucket_owner_grants_match(&remaining, owner_id, bucket_owner_id, Permission::Read)
            }
            "bucket-owner-full-control" => bucket_owner_grants_match(
                &remaining,
                owner_id,
                bucket_owner_id,
                Permission::FullControl,
            ),
            _ => false,
        }
    }

    fn validate_user_metadata(&self) -> Result<()> {
        let mut bytes = 0_usize;
        for (key, value) in &self.user_metadata {
            ensure!(
                valid_user_metadata_key(key),
                "S3 user metadata contains an invalid key"
            );
            ensure!(
                HeaderValue::from_str(value).is_ok(),
                "S3 user metadata contains a value that cannot be represented as an HTTP header"
            );
            bytes = checked_metadata_size(bytes, key, value)?;
        }
        ensure!(
            bytes <= S3_METADATA_LIMIT_BYTES,
            "S3 user metadata is {bytes} bytes, larger than the 2048-byte limit"
        );
        Ok(())
    }

    fn validate_system_metadata(&self) -> Result<()> {
        if let Some(value) = self.server_side_encryption.as_deref() {
            ensure!(
                ServerSideEncryption::values().contains(&value),
                "unsupported S3 server-side encryption value `{value}`"
            );
        }
        if let Some(value) = self.storage_class.as_deref() {
            ensure!(
                StorageClass::values().contains(&value),
                "unsupported S3 storage class `{value}`"
            );
        }
        if let Some(value) = self.acl.as_deref() {
            ensure!(
                ObjectCannedAcl::values().contains(&value),
                "unsupported S3 canned object ACL `{value}`"
            );
        }
        Ok(())
    }

    fn validate_encryption_configuration(&self) -> Result<()> {
        if self.sse_kms_key_id.is_some() {
            ensure!(
                matches!(
                    self.server_side_encryption.as_deref(),
                    Some("aws:kms" | "aws:kms:dsse")
                ),
                "sse-kms-key-id requires sse to use AWS KMS encryption"
            );
        }
        Ok(())
    }

    fn system_headers(&self, key: &str) -> Vec<(&'static str, String)> {
        let mut headers = Vec::with_capacity(10);
        push_optional(&mut headers, "cache-control", self.cache_control.as_deref());
        push_optional(
            &mut headers,
            "content-disposition",
            self.content_disposition.as_deref(),
        );
        push_optional(
            &mut headers,
            "content-encoding",
            self.content_encoding.as_deref(),
        );
        push_optional(
            &mut headers,
            "content-language",
            self.content_language.as_deref(),
        );
        push_optional(
            &mut headers,
            "content-type",
            self.resolved_content_type(key).as_deref(),
        );
        push_optional(&mut headers, "sse", self.server_side_encryption.as_deref());
        push_optional(&mut headers, "storage-class", self.storage_class.as_deref());
        push_optional(
            &mut headers,
            "website-redirect",
            self.website_redirect_location.as_deref(),
        );
        push_optional(
            &mut headers,
            "sse-kms-key-id",
            self.sse_kms_key_id.as_deref(),
        );
        push_optional(&mut headers, "acl", self.acl.as_deref());
        headers
    }
}

fn normalize_user_metadata(metadata: &HashMap<String, String>) -> Result<HashMap<String, String>> {
    let mut normalized = HashMap::with_capacity(metadata.len());
    for (key, value) in metadata {
        let key = key.to_ascii_lowercase();
        if normalized.insert(key, value.clone()).is_some() {
            return Err(anyhow!(
                "S3 user metadata contains keys that collide case-insensitively"
            ));
        }
    }
    Ok(normalized)
}

fn normalize_system_metadata(
    metadata: &HashMap<String, String>,
) -> Result<HashMap<String, String>> {
    let mut normalized = HashMap::with_capacity(metadata.len());
    for (key, value) in metadata {
        let key = key.to_ascii_lowercase();
        ensure!(
            SUPPORTED_SYSTEM_METADATA.contains(&key.as_str()),
            "unsupported S3 system metadata field `{key}`"
        );
        let value = value.trim().to_string();
        ensure!(
            !value.is_empty(),
            "S3 system metadata `{key}` cannot be empty"
        );
        if normalized.insert(key, value).is_some() {
            return Err(anyhow!(
                "S3 system metadata contains keys that collide case-insensitively"
            ));
        }
    }
    Ok(normalized)
}

fn normalize_head_metadata(metadata: &HashMap<String, String>) -> HashMap<String, String> {
    metadata
        .iter()
        .map(|(key, value)| (key.to_ascii_lowercase(), value.clone()))
        .collect()
}

fn push_optional(
    headers: &mut Vec<(&'static str, String)>,
    name: &'static str,
    value: Option<&str>,
) {
    if let Some(value) = value {
        headers.push((name, value.to_string()));
    }
}

fn system_header_name(name: &str) -> &str {
    match name {
        "sse" => "x-amz-server-side-encryption",
        "storage-class" => "x-amz-storage-class",
        "website-redirect" => "x-amz-website-redirect-location",
        "sse-kms-key-id" => "x-amz-server-side-encryption-aws-kms-key-id",
        "acl" => "x-amz-acl",
        other => other,
    }
}

fn checked_metadata_size(current: usize, name: &str, value: &str) -> Result<usize> {
    current
        .checked_add(name.len())
        .and_then(|size| size.checked_add(value.len()))
        .ok_or_else(|| anyhow!("S3 metadata size arithmetic overflowed"))
}

fn checked_wire_header_size(current: usize, name: &str, value: &str) -> Result<usize> {
    current
        .checked_add(name.len())
        .and_then(|size| size.checked_add(value.len()))
        .and_then(|size| size.checked_add(4))
        .ok_or_else(|| anyhow!("S3 request header size arithmetic overflowed"))
}

fn valid_user_metadata_key(key: &str) -> bool {
    !key.is_empty()
        && key.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || matches!(
                    byte,
                    b'!' | b'#'
                        | b'$'
                        | b'%'
                        | b'&'
                        | b'\''
                        | b'*'
                        | b'+'
                        | b'-'
                        | b'.'
                        | b'^'
                        | b'_'
                        | b'`'
                        | b'|'
                        | b'~'
                )
        })
}

fn validate_system_header_value(name: &str, value: &str) -> Result<()> {
    ensure!(
        value.is_ascii() && HeaderValue::from_str(value).is_ok(),
        "S3 system metadata `{name}` cannot be represented as a US-ASCII HTTP header"
    );
    Ok(())
}

fn exact_optional(expected: Option<&str>, actual: Option<&str>) -> bool {
    expected == actual
}

fn requested_optional_matches(expected: Option<&str>, actual: Option<&str>) -> bool {
    expected.is_none_or(|expected| actual == Some(expected))
}

fn storage_class_matches(expected: Option<&str>, actual: Option<&str>) -> bool {
    expected.unwrap_or("STANDARD") == actual.unwrap_or("STANDARD")
}

fn is_canonical_grant(grant: &Grant, id: &str, permission: Permission) -> bool {
    grant.permission() == Some(&permission)
        && grant.grantee().is_some_and(|grantee| {
            grantee.r#type() == &Type::CanonicalUser && grantee.id() == Some(id)
        })
}

fn bucket_owner_grants_match(
    grants: &[&Grant],
    object_owner_id: &str,
    bucket_owner_id: Option<&str>,
    permission: Permission,
) -> bool {
    let Some(bucket_owner_id) = bucket_owner_id else {
        return false;
    };
    if object_owner_id == bucket_owner_id {
        grants.is_empty()
    } else {
        grants.len() == 1 && is_canonical_grant(grants[0], bucket_owner_id, permission)
    }
}

fn matches_group_grants(grants: &[&Grant], expected: &[(&str, Permission)]) -> bool {
    grants.len() == expected.len()
        && expected.iter().all(|(uri, permission)| {
            grants.iter().any(|grant| {
                grant.permission() == Some(permission)
                    && grant.grantee().is_some_and(|grantee| {
                        grantee.r#type() == &Type::Group && grantee.uri() == Some(*uri)
                    })
            })
        })
}

macro_rules! apply_metadata_fields {
    ($builder:expr, $metadata:expr, $key:expr) => {{
        let mut builder = $builder;
        let metadata = $metadata;

        if !metadata.user_metadata.is_empty() {
            builder = builder.set_metadata(Some(metadata.user_metadata.clone()));
        }
        if let Some(cache_control) = metadata.cache_control.as_deref() {
            builder = builder.cache_control(cache_control);
        }
        if let Some(content_disposition) = metadata.content_disposition.as_deref() {
            builder = builder.content_disposition(content_disposition);
        }
        if let Some(content_encoding) = metadata.content_encoding.as_deref() {
            builder = builder.content_encoding(content_encoding);
        }
        if let Some(content_language) = metadata.content_language.as_deref() {
            builder = builder.content_language(content_language);
        }
        if let Some(content_type) = metadata.resolved_content_type($key) {
            builder = builder.content_type(content_type);
        }
        if let Some(server_side_encryption) = metadata.server_side_encryption.as_deref() {
            builder =
                builder.server_side_encryption(ServerSideEncryption::from(server_side_encryption));
        }
        if let Some(storage_class) = metadata.storage_class.as_deref() {
            builder = builder.storage_class(StorageClass::from(storage_class));
        }
        if let Some(website_redirect_location) = metadata.website_redirect_location.as_deref() {
            builder = builder.website_redirect_location(website_redirect_location);
        }
        if let Some(sse_kms_key_id) = metadata.sse_kms_key_id.as_deref() {
            builder = builder.ssekms_key_id(sse_kms_key_id);
        }
        if let Some(acl) = metadata.acl.as_deref() {
            builder = builder.acl(ObjectCannedAcl::from(acl));
        }

        builder
    }};
}

pub(crate) fn apply_put_metadata(
    builder: PutObjectFluentBuilder,
    metadata: &ObjectMetadata,
    key: &str,
) -> PutObjectFluentBuilder {
    apply_metadata_fields!(builder, metadata, key)
}

pub(crate) fn apply_copy_metadata(
    builder: CopyObjectFluentBuilder,
    metadata: &ObjectMetadata,
    key: &str,
) -> CopyObjectFluentBuilder {
    apply_metadata_fields!(builder, metadata, key)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use aws_sdk_s3::operation::get_object_acl::GetObjectAclOutput;
    use aws_sdk_s3::operation::head_object::HeadObjectOutput;
    use aws_sdk_s3::types::{
        Grant, Grantee, Owner, Permission, ServerSideEncryption, StorageClass, Type,
    };

    use super::{S3_METADATA_LIMIT_BYTES, *};
    use crate::types::ObjectMetadata;

    fn metadata() -> ObjectMetadata {
        ObjectMetadata {
            user_metadata: HashMap::from([("release".to_string(), "stable".to_string())]),
            cache_control: Some("public, max-age=60".to_string()),
            content_disposition: Some("inline".to_string()),
            content_encoding: Some("gzip".to_string()),
            content_language: Some("en".to_string()),
            content_type: None,
            server_side_encryption: Some("AES256".to_string()),
            storage_class: Some("STANDARD".to_string()),
            website_redirect_location: Some("/index.html".to_string()),
            sse_kms_key_id: None,
            acl: None,
        }
    }

    #[test]
    fn inferred_and_equivalent_explicit_content_types_are_semantically_equal() {
        let inferred = metadata();
        let mut explicit = inferred.clone();
        explicit.content_type = Some("text/html".to_string());

        assert!(inferred.semantically_matches(&explicit, "site/index.html"));
        explicit.content_type = Some("application/octet-stream".to_string());
        assert!(!inferred.semantically_matches(&explicit, "site/index.html"));
    }

    #[test]
    fn implicit_and_explicit_s3_defaults_are_semantically_equal() {
        let implicit = empty_metadata();
        let explicit = ObjectMetadata {
            content_type: Some("text/html".to_string()),
            storage_class: Some("STANDARD".to_string()),
            acl: Some("private".to_string()),
            ..empty_metadata()
        };

        assert!(implicit.semantically_matches(&explicit, "site/index.html"));
    }

    #[test]
    fn every_supported_object_setting_participates_in_semantic_identity() {
        type MetadataMutation = Box<dyn Fn(&mut ObjectMetadata)>;

        let baseline = metadata();
        let mutations: Vec<MetadataMutation> = vec![
            Box::new(|value| {
                value
                    .user_metadata
                    .insert("release".to_string(), "canary".to_string());
            }),
            Box::new(|value| value.cache_control = None),
            Box::new(|value| value.content_disposition = None),
            Box::new(|value| value.content_encoding = None),
            Box::new(|value| value.content_language = None),
            Box::new(|value| value.content_type = Some("application/json".to_string())),
            Box::new(|value| value.server_side_encryption = None),
            Box::new(|value| value.storage_class = Some("INTELLIGENT_TIERING".to_string())),
            Box::new(|value| value.website_redirect_location = None),
            Box::new(|value| {
                value.server_side_encryption = Some("aws:kms".to_string());
                value.sse_kms_key_id = Some("key-id".to_string());
            }),
            Box::new(|value| value.acl = Some("public-read".to_string())),
        ];

        for mutate in mutations {
            let mut changed = baseline.clone();
            mutate(&mut changed);
            assert!(!baseline.semantically_matches(&changed, "site/index.html"));
        }
    }

    #[test]
    fn user_metadata_enforces_case_normalization_collisions_and_size() {
        let request = DeploymentRequest {
            user_metadata: HashMap::from([
                ("Release".to_string(), "stable".to_string()),
                ("release".to_string(), "stable".to_string()),
            ]),
            ..test_request()
        };
        assert!(ObjectMetadata::from_request(&request).is_err());

        let exact = ObjectMetadata {
            user_metadata: HashMap::from([(
                "key".to_string(),
                "v".repeat(S3_METADATA_LIMIT_BYTES - 3),
            )]),
            ..empty_metadata()
        };
        exact.validate_user_metadata().expect("exact limit");

        let too_large = ObjectMetadata {
            user_metadata: HashMap::from([(
                "key".to_string(),
                "v".repeat(S3_METADATA_LIMIT_BYTES - 2),
            )]),
            ..empty_metadata()
        };
        assert!(too_large.validate_user_metadata().is_err());
    }

    #[test]
    fn system_metadata_rejects_unknown_fields_invalid_headers_and_oversize_values() {
        for system_metadata in [
            HashMap::from([("unknown".to_string(), "value".to_string())]),
            HashMap::from([("cache-control".to_string(), "bad\nvalue".to_string())]),
            HashMap::from([("cache-control".to_string(), "bad\u{7}value".to_string())]),
            HashMap::from([(
                "cache-control".to_string(),
                "v".repeat(S3_METADATA_LIMIT_BYTES),
            )]),
        ] {
            let request = DeploymentRequest {
                system_metadata,
                ..test_request()
            };
            let result = ObjectMetadata::from_request(&request)
                .and_then(|metadata| metadata.validate_for_key("index.html"));
            assert!(result.is_err());
        }

        let request = DeploymentRequest {
            system_metadata: HashMap::from([
                ("sse".to_string(), "aws:kms".to_string()),
                ("sse-kms-key-id".to_string(), "k".repeat(2_000)),
            ]),
            ..test_request()
        };
        assert!(ObjectMetadata::from_request(&request).is_err());
    }

    #[test]
    fn copy_preflight_includes_the_encoded_source_and_complete_metadata_headers() {
        let metadata = ObjectMetadata {
            user_metadata: HashMap::from([("u".to_string(), "v".repeat(2_047))]),
            cache_control: Some("v".repeat(2_035)),
            ..empty_metadata()
        };

        metadata
            .validate_user_metadata()
            .expect("user metadata is exactly 2048 bytes");
        metadata
            .validate_for_key("destination")
            .expect("metadata headers fit without a copy source");
        assert!(
            metadata
                .validate_copy_for_key("destination", "source", &"é".repeat(512))
                .is_err()
        );
    }

    #[test]
    fn head_object_match_requires_checksum_visible_metadata_semantics() {
        let metadata = metadata();
        let head = HeadObjectOutput::builder()
            .content_length(5)
            .cache_control("public, max-age=60")
            .content_disposition("inline")
            .content_encoding("gzip")
            .content_language("en")
            .content_type("text/html")
            .server_side_encryption(ServerSideEncryption::Aes256)
            .storage_class(StorageClass::Standard)
            .website_redirect_location("/index.html")
            .metadata("release", "stable")
            .build();

        assert!(metadata.matches_head_object(&head, "site/index.html"));

        let wrong = HeadObjectOutput::builder()
            .content_length(5)
            .cache_control("no-cache")
            .content_disposition("inline")
            .content_encoding("gzip")
            .content_language("en")
            .content_type("text/html")
            .server_side_encryption(ServerSideEncryption::Aes256)
            .storage_class(StorageClass::Standard)
            .website_redirect_location("/index.html")
            .metadata("release", "stable")
            .build();
        assert!(!metadata.matches_head_object(&wrong, "site/index.html"));
    }

    #[test]
    fn canned_acl_matching_requires_the_exact_effective_grants() {
        let private = empty_metadata();
        let owner_grant = canonical_grant("owner", Permission::FullControl);
        let private_acl = GetObjectAclOutput::builder()
            .owner(Owner::builder().id("owner").build())
            .grants(owner_grant.clone())
            .build();
        assert!(private.matches_object_acl(&private_acl, None));

        let public = ObjectMetadata {
            acl: Some("public-read".to_string()),
            ..empty_metadata()
        };
        let public_acl = GetObjectAclOutput::builder()
            .owner(Owner::builder().id("owner").build())
            .grants(owner_grant)
            .grants(group_grant(ALL_USERS_GROUP, Permission::Read))
            .build();
        assert!(public.matches_object_acl(&public_acl, None));
        assert!(!private.matches_object_acl(&public_acl, None));

        let extra_grant = GetObjectAclOutput::builder()
            .owner(Owner::builder().id("owner").build())
            .grants(canonical_grant("owner", Permission::FullControl))
            .grants(group_grant(ALL_USERS_GROUP, Permission::Read))
            .grants(group_grant(AUTHENTICATED_USERS_GROUP, Permission::Read))
            .build();
        assert!(!public.matches_object_acl(&extra_grant, None));

        let bucket_owner = ObjectMetadata {
            acl: Some("bucket-owner-read".to_string()),
            ..empty_metadata()
        };
        let cross_account_acl = GetObjectAclOutput::builder()
            .owner(Owner::builder().id("object-owner").build())
            .grants(canonical_grant("object-owner", Permission::FullControl))
            .grants(canonical_grant("bucket-owner", Permission::Read))
            .build();
        assert!(bucket_owner.matches_object_acl(&cross_account_acl, Some("bucket-owner")));
        assert!(!bucket_owner.matches_object_acl(&cross_account_acl, Some("different-owner")));
    }

    fn empty_metadata() -> ObjectMetadata {
        ObjectMetadata {
            user_metadata: HashMap::new(),
            cache_control: None,
            content_disposition: None,
            content_encoding: None,
            content_language: None,
            content_type: None,
            server_side_encryption: None,
            storage_class: None,
            website_redirect_location: None,
            sse_kms_key_id: None,
            acl: None,
        }
    }

    fn test_request() -> DeploymentRequest {
        use crate::types::{
            MarkerConfig, PutObjectRetryJitter, PutObjectRetryOptions, RuntimeOptions,
        };

        DeploymentRequest {
            source_bucket_names: vec!["source".to_string()],
            source_object_keys: vec!["source.zip".to_string()],
            source_catalogs: vec![None],
            source_markers: vec![HashMap::new()],
            source_markers_config: vec![MarkerConfig::default()],
            dest_bucket_name: "destination".to_string(),
            dest_bucket_prefix: String::new(),
            extract: true,
            delete_current_objects_on_delete: false,
            distribution_id: None,
            distribution_paths: vec!["/*".to_string()],
            wait_for_distribution_invalidation: true,
            user_metadata: HashMap::new(),
            system_metadata: HashMap::new(),
            delete_stale_objects_on_deployment: true,
            exclude: Vec::new(),
            include: Vec::new(),
            output_object_keys: true,
            destination_bucket_arn: None,
            destination_owner_id: None,
            delete_previous_objects_on_change: None,
            invalidate_previous_distribution_on_change: None,
            runtime: RuntimeOptions {
                available_memory_mb: 1024,
                max_parallel_transfers: 1,
                source_block_bytes: 1024,
                source_block_merge_gap_bytes: 0,
                source_get_concurrency: 1,
                source_window_bytes: None,
                source_window_memory_budget_mb: 1024,
                put_object_retry: PutObjectRetryOptions {
                    max_attempts: 1,
                    retry_base_delay_ms: 0,
                    retry_max_delay_ms: 0,
                    slowdown_retry_base_delay_ms: 0,
                    slowdown_retry_max_delay_ms: 0,
                    jitter: PutObjectRetryJitter::None,
                },
            },
        }
    }

    fn canonical_grant(id: &str, permission: Permission) -> Grant {
        Grant::builder()
            .grantee(
                Grantee::builder()
                    .r#type(Type::CanonicalUser)
                    .id(id)
                    .build()
                    .unwrap(),
            )
            .permission(permission)
            .build()
    }

    fn group_grant(uri: &str, permission: Permission) -> Grant {
        Grant::builder()
            .grantee(
                Grantee::builder()
                    .r#type(Type::Group)
                    .uri(uri)
                    .build()
                    .unwrap(),
            )
            .permission(permission)
            .build()
    }
}
