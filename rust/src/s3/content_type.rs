use aws_sdk_s3::operation::copy_object::builders::CopyObjectFluentBuilder;
use aws_sdk_s3::operation::put_object::builders::PutObjectFluentBuilder;

pub(crate) fn resolved_content_type(key: &str) -> &'static str {
    mime_guess::from_path(key)
        .first_raw()
        .unwrap_or("application/octet-stream")
}

pub(crate) fn apply_put_content_type(
    builder: PutObjectFluentBuilder,
    key: &str,
) -> PutObjectFluentBuilder {
    builder.content_type(resolved_content_type(key))
}

pub(crate) fn apply_copy_content_type(
    builder: CopyObjectFluentBuilder,
    key: &str,
) -> CopyObjectFluentBuilder {
    builder.content_type(resolved_content_type(key))
}

#[cfg(test)]
mod tests {
    use super::resolved_content_type;

    #[test]
    fn infers_mime_type_with_a_deterministic_binary_fallback() {
        assert_eq!(resolved_content_type("site/index.html"), "text/html");
        assert_eq!(
            resolved_content_type("site/no-extension"),
            "application/octet-stream"
        );
    }
}
