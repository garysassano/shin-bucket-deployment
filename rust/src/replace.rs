use std::collections::HashMap;

use anyhow::Result;
use serde_json::Value;

use crate::types::MarkerConfig;

pub(crate) fn replace_markers(
    bytes: Vec<u8>,
    markers: &HashMap<String, String>,
    config: &MarkerConfig,
) -> Result<Vec<u8>> {
    if markers.is_empty() {
        return Ok(bytes);
    }

    let replacements = replacement_pairs(markers, config)?;
    let mut output = bytes;

    for (needle, replacement) in replacements {
        output = replace_all(output, &needle, &replacement);
    }

    Ok(output)
}

fn replacement_pairs(
    markers: &HashMap<String, String>,
    config: &MarkerConfig,
) -> Result<Vec<(Vec<u8>, Vec<u8>)>> {
    let mut pairs = Vec::with_capacity(markers.len());

    for (key, value) in markers {
        let replacement = if config.json_escape {
            json_escape_marker_value(value)?
        } else {
            value.clone()
        };

        pairs.push((key.as_bytes().to_vec(), replacement.into_bytes()));
    }

    Ok(pairs)
}

fn json_escape_marker_value(value: &str) -> Result<String> {
    if let Some(inner) = value.strip_prefix('"').and_then(|v| v.strip_suffix('"')) {
        return serde_json::to_string(inner).map_err(Into::into);
    }

    if serde_json::from_str::<Value>(value).is_ok() {
        return Ok(value.to_string());
    }

    let escaped = serde_json::to_string(value)?;
    Ok(escaped[1..escaped.len() - 1].to_string())
}

fn replace_all(input: Vec<u8>, needle: &[u8], replacement: &[u8]) -> Vec<u8> {
    if needle.is_empty() {
        return input;
    }

    let mut result = Vec::with_capacity(input.len());
    let mut cursor = 0usize;

    while let Some(index) = find_subslice(&input[cursor..], needle) {
        let absolute = cursor + index;
        result.extend_from_slice(&input[cursor..absolute]);
        result.extend_from_slice(replacement);
        cursor = absolute + needle.len();
    }

    result.extend_from_slice(&input[cursor..]);
    result
}

fn find_subslice(haystack: &[u8], needle: &[u8]) -> Option<usize> {
    haystack
        .windows(needle.len())
        .position(|window| window == needle)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn plain_markers_replace_multiple_tokens_and_repeated_occurrences() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            "eu-central-1".to_string(),
        );
        markers.insert(
            "<<marker:0xbaba:1>>".to_string(),
            "CargoBucketDeploymentTokenDemo".to_string(),
        );

        let rendered = replace_markers(
            b"region=<<marker:0xbaba:0>>\nstack=<<marker:0xbaba:1>>\nregion-again=<<marker:0xbaba:0>>"
                .to_vec(),
            &markers,
            &MarkerConfig::default(),
        )
        .expect("plain replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            "region=eu-central-1\nstack=CargoBucketDeploymentTokenDemo\nregion-again=eu-central-1",
        );
    }

    #[test]
    fn plain_markers_insert_verbatim_json_fragments() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#""CargoBucketDeploymentTokenDemo""#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"stackName":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig::default(),
        )
        .expect("plain replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"stackName":"CargoBucketDeploymentTokenDemo"}"#,
        );
    }

    #[test]
    fn json_escape_quoted_fragments_escape_inner_special_characters() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#""value with "quotes" and \backslash""#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"specialValue":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"specialValue":"value with \"quotes\" and \\backslash"}"#,
        );
    }

    #[test]
    fn json_escape_raw_values_are_safe_inside_quoted_json_strings() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            r#"value with "quotes" and \backslash"#.to_string(),
        );

        let rendered = replace_markers(
            br#"{"specialValue":"<<marker:0xbaba:0>>"}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"specialValue":"value with \"quotes\" and \\backslash"}"#,
        );
    }

    #[test]
    fn json_escape_markers_are_not_double_escaped() {
        let mut markers = HashMap::new();
        markers.insert(
            "<<marker:0xbaba:0>>".to_string(),
            "\"CargoBucketDeploymentTokenDemo\"".to_string(),
        );

        let rendered = replace_markers(
            br#"{"stackName":<<marker:0xbaba:0>>}"#.to_vec(),
            &markers,
            &MarkerConfig { json_escape: true },
        )
        .expect("json replacement should succeed");

        assert_eq!(
            String::from_utf8(rendered).expect("output should be valid utf-8"),
            r#"{"stackName":"CargoBucketDeploymentTokenDemo"}"#,
        );
    }
}
