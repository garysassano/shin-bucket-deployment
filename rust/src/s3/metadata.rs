use aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder;
use aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder;
use aws_sdk_s3::types::{ObjectCannedAcl, ServerSideEncryption, StorageClass};

use crate::types::{DeploymentRequest, ObjectMetadata};

impl ObjectMetadata {
    pub(crate) fn from_request(request: &DeploymentRequest) -> Self {
        Self {
            user_metadata: request.user_metadata.clone(),
            cache_control: request.system_metadata.get("cache-control").cloned(),
            content_disposition: request.system_metadata.get("content-disposition").cloned(),
            content_encoding: request.system_metadata.get("content-encoding").cloned(),
            content_language: request.system_metadata.get("content-language").cloned(),
            content_type: request.system_metadata.get("content-type").cloned(),
            server_side_encryption: request.system_metadata.get("sse").cloned(),
            storage_class: request.system_metadata.get("storage-class").cloned(),
            website_redirect_location: request.system_metadata.get("website-redirect").cloned(),
            sse_kms_key_id: request.system_metadata.get("sse-kms-key-id").cloned(),
            acl: request.system_metadata.get("acl").cloned(),
        }
    }

    pub(crate) fn resolved_content_type(&self, key: &str) -> Option<String> {
        self.content_type.clone().or_else(|| {
            mime_guess::from_path(key)
                .first_raw()
                .map(|mime| mime.to_string())
        })
    }
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
