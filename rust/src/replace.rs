use std::collections::HashMap;
use std::io;

use std::fmt::Write as _;

use aho_corasick::{AhoCorasick, AhoCorasickBuilder, MatchKind};
use anyhow::{Result, anyhow};
use md5::{Digest as Md5Digest, Md5};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

use crate::util::finalize_digest;

const INPUT_CHUNK_BYTES: usize = 64 * 1024;

pub(crate) struct MarkerReplacements {
    matcher: AhoCorasick,
    replacements: Vec<Vec<u8>>,
    max_pattern_bytes: usize,
}

#[derive(Clone, Copy)]
pub(crate) struct ReplacementOptions {
    pub(crate) max_output_bytes: u64,
}

#[derive(Debug)]
pub(crate) struct ReplacementResult {
    pub(crate) output_bytes: u64,
    pub(crate) md5: String,
}

struct OutputAccounting {
    max_output_bytes: u64,
    output_bytes: u64,
    md5: Md5,
    staging: Vec<u8>,
}

/// Physical-write coalescing threshold: adjacent small segments (prefixes and
/// replacements in a marker-heavy stream) accumulate here before one pipe write.
const OUTPUT_COALESCE_BYTES: usize = 8 * 1024;

impl MarkerReplacements {
    /// Compiles `markers`, each mapped to its already-encoded replacement text.
    pub(crate) fn new(markers: &HashMap<String, String>) -> Result<Self> {
        let mut pairs = markers
            .iter()
            .filter(|(pattern, _)| !pattern.is_empty())
            .map(|(pattern, replacement)| {
                (pattern.as_bytes().to_vec(), replacement.as_bytes().to_vec())
            })
            .collect::<Vec<_>>();
        pairs.sort_unstable_by(|(left, _), (right, _)| left.cmp(right));

        let max_pattern_bytes = pairs
            .iter()
            .map(|(pattern, _)| pattern.len())
            .max()
            .unwrap_or(0);
        let patterns = pairs
            .iter()
            .map(|(pattern, _)| pattern.as_slice())
            .collect::<Vec<_>>();
        let matcher = AhoCorasickBuilder::new()
            .match_kind(MatchKind::LeftmostLongest)
            .build(patterns)?;
        let replacements = pairs
            .into_iter()
            .map(|(_, replacement)| replacement)
            .collect();

        Ok(Self {
            matcher,
            replacements,
            max_pattern_bytes,
        })
    }

    pub(crate) async fn replace_stream<R, W, F>(
        &self,
        input: &mut R,
        output: &mut W,
        options: ReplacementOptions,
        mut observe_input: F,
    ) -> io::Result<ReplacementResult>
    where
        R: AsyncRead + Unpin,
        W: AsyncWrite + Unpin,
        F: FnMut(&[u8]) -> io::Result<()>,
    {
        let mut accounting = OutputAccounting::new(options);
        let mut input_buffer = vec![0_u8; INPUT_CHUNK_BYTES];
        let mut pending = Vec::with_capacity(
            INPUT_CHUNK_BYTES.saturating_add(self.max_pattern_bytes.saturating_sub(1)),
        );

        loop {
            let read = input.read(&mut input_buffer).await?;
            if read == 0 {
                self.emit_stable(&mut pending, true, output, &mut accounting)
                    .await?;
                accounting.flush_staging(output).await?;
                output.flush().await?;
                return Ok(accounting.finish());
            }

            observe_input(&input_buffer[..read])?;
            pending.extend_from_slice(&input_buffer[..read]);
            self.emit_stable(&mut pending, false, output, &mut accounting)
                .await?;
        }
    }

    async fn emit_stable<W: AsyncWrite + Unpin>(
        &self,
        pending: &mut Vec<u8>,
        end_of_input: bool,
        output: &mut W,
        accounting: &mut OutputAccounting,
    ) -> io::Result<()> {
        let stable_end = if end_of_input || self.max_pattern_bytes == 0 {
            pending.len()
        } else {
            pending
                .len()
                .saturating_sub(self.max_pattern_bytes.saturating_sub(1))
        };
        let mut cursor = 0_usize;

        while cursor < stable_end {
            let Some(found) = self.matcher.find(&pending[cursor..]) else {
                accounting
                    .write(output, &pending[cursor..stable_end])
                    .await?;
                cursor = stable_end;
                break;
            };
            let start = cursor.saturating_add(found.start());
            if start >= stable_end {
                accounting
                    .write(output, &pending[cursor..stable_end])
                    .await?;
                cursor = stable_end;
                break;
            }

            accounting.write(output, &pending[cursor..start]).await?;
            accounting
                .write(output, &self.replacements[found.pattern().as_usize()])
                .await?;
            cursor = cursor.saturating_add(found.end());
        }

        if cursor > 0 {
            pending.drain(..cursor);
        }
        Ok(())
    }
}

impl OutputAccounting {
    fn new(options: ReplacementOptions) -> Self {
        Self {
            max_output_bytes: options.max_output_bytes,
            output_bytes: 0,
            md5: Md5::new(),
            staging: Vec::with_capacity(OUTPUT_COALESCE_BYTES),
        }
    }

    async fn write<W: AsyncWrite + Unpin>(
        &mut self,
        output: &mut W,
        bytes: &[u8],
    ) -> io::Result<()> {
        let added = u64::try_from(bytes.len()).map_err(|_| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                "marker replacement size cannot be represented safely",
            )
        })?;
        let next = self.output_bytes.checked_add(added).ok_or_else(|| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                "marker replacement size arithmetic overflowed",
            )
        })?;
        if next > self.max_output_bytes {
            return Err(io::Error::new(
                io::ErrorKind::InvalidData,
                format!(
                    "marker-expanded object is {next} bytes, larger than the configured output limit"
                ),
            ));
        }

        self.md5.update(bytes);
        self.output_bytes = next;
        // Coalesce adjacent writes (a marker-heavy stream emits many tiny segments)
        // into fewer pipe writes; flush only once the staging buffer is full or the
        // stream ends.
        self.staging.extend_from_slice(bytes);
        if self.staging.len() >= OUTPUT_COALESCE_BYTES {
            output.write_all(&self.staging).await?;
            self.staging.clear();
        }
        Ok(())
    }

    async fn flush_staging<W: AsyncWrite + Unpin>(&mut self, output: &mut W) -> io::Result<()> {
        if !self.staging.is_empty() {
            output.write_all(&self.staging).await?;
            self.staging.clear();
        }
        Ok(())
    }

    fn finish(self) -> ReplacementResult {
        ReplacementResult {
            output_bytes: self.output_bytes,
            md5: finalize_digest(self.md5),
        }
    }
}

/// How a marker's deploy-time value is rendered before substitution. The
/// variants and wire names match upstream AWS CDK `MarkerEncoding`; the
/// construct resolves each marker's effective encoding at synthesis.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub(crate) enum MarkerEncoding {
    /// The string value as-is.
    Literal,
    /// A string's JSON escaping without the surrounding quotes, for a slot
    /// the content already quotes; any other value as complete JSON.
    UnquotedJsonValue,
    /// Any value as complete JSON, strings with their quotes.
    JsonValue,
    /// A plain YAML scalar for a simple identifier, otherwise a double-quoted
    /// YAML scalar.
    YamlString,
}

impl MarkerEncoding {
    fn wire_name(self) -> &'static str {
        match self {
            Self::Literal => "LITERAL",
            Self::UnquotedJsonValue => "UNQUOTED_JSON_VALUE",
            Self::JsonValue => "JSON_VALUE",
            Self::YamlString => "YAML_STRING",
        }
    }
}

/// Renders a marker's deploy-time value in `encoding`.
///
/// Error messages name only the encoding and the value's JSON kind: marker
/// values are deployment inputs that can carry secrets.
///
/// Unlike upstream's handler, which uses Python's ASCII-only `json.dumps`,
/// JSON output keeps non-ASCII text as UTF-8, which is equally valid JSON and
/// does not split astral characters into surrogate escapes that some YAML
/// parsers cannot read back.
pub(crate) fn encode_marker_value(encoding: MarkerEncoding, value: &Value) -> Result<String> {
    match (encoding, value) {
        (MarkerEncoding::Literal, Value::String(text)) => Ok(text.clone()),
        (MarkerEncoding::UnquotedJsonValue, Value::String(text)) => {
            let quoted = serde_json::to_string(text)?;
            Ok(quoted[1..quoted.len() - 1].to_string())
        }
        (MarkerEncoding::UnquotedJsonValue | MarkerEncoding::JsonValue, value) => {
            Ok(serde_json::to_string(value)?)
        }
        (MarkerEncoding::YamlString, Value::String(text)) => Ok(yaml_string(text)),
        (MarkerEncoding::Literal | MarkerEncoding::YamlString, value) => Err(anyhow!(
            "{} encoding requires a string value, but the deploy-time value is a JSON {}",
            encoding.wire_name(),
            json_kind(value)
        )),
    }
}

fn json_kind(value: &Value) -> &'static str {
    match value {
        Value::Null => "null",
        Value::Bool(_) => "boolean",
        Value::Number(_) => "number",
        Value::String(_) => "string",
        Value::Array(_) => "list",
        Value::Object(_) => "map",
    }
}

/// Words YAML 1.1 parsers read as booleans or null when unquoted.
const YAML_RESERVED_WORDS: [&str; 9] =
    ["y", "n", "yes", "no", "true", "false", "on", "off", "null"];

/// Upstream's `YAML_STRING` rule: a plain scalar only for an identifier that
/// starts with a letter and continues with letters, digits, `.`, `_` or `-`,
/// and is not a reserved word; a double-quoted scalar otherwise.
fn yaml_string(text: &str) -> String {
    let mut chars = text.chars();
    let plain = chars
        .next()
        .is_some_and(|first| first.is_ascii_alphabetic())
        && chars.all(|ch| ch.is_ascii_alphanumeric() || matches!(ch, '.' | '_' | '-'))
        && !YAML_RESERVED_WORDS
            .iter()
            .any(|word| text.eq_ignore_ascii_case(word));
    if plain {
        text.to_string()
    } else {
        yaml_double_quoted(text)
    }
}

/// A YAML double-quoted scalar. JSON string escaping is a subset of YAML's,
/// so this starts from the JSON form and additionally escapes what YAML treats
/// differently: characters outside YAML's printable set, and the Unicode line
/// separators (U+0085, U+2028, U+2029) and byte-order mark, which YAML 1.1
/// parsers would fold or strip inside a quoted scalar.
fn yaml_double_quoted(text: &str) -> String {
    let quoted = serde_json::to_string(text).expect("a string always serializes to JSON");
    let mut out = String::with_capacity(quoted.len());
    for ch in quoted.chars() {
        if yaml_escape_required(ch) {
            let _ = write!(out, "\\u{:04X}", u32::from(ch));
        } else {
            out.push(ch);
        }
    }
    out
}

fn yaml_escape_required(ch: char) -> bool {
    let printable = matches!(
        ch,
        '\t' | '\n' | '\r'
            | '\u{20}'..='\u{7E}'
            | '\u{A0}'..='\u{D7FF}'
            | '\u{E000}'..='\u{FFFD}'
            | '\u{10000}'..='\u{10FFFF}'
    );
    !printable || matches!(ch, '\u{2028}' | '\u{2029}' | '\u{FEFF}')
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::pin::Pin;
    use std::task::{Context, Poll};

    use proptest::prelude::*;
    use serde_json::json;
    use tokio::io::{AsyncRead, ReadBuf};

    use super::*;

    struct ChunkedReader<R> {
        inner: R,
        chunk_bytes: usize,
    }

    impl<R: AsyncRead + Unpin> AsyncRead for ChunkedReader<R> {
        fn poll_read(
            mut self: Pin<&mut Self>,
            context: &mut Context<'_>,
            buffer: &mut ReadBuf<'_>,
        ) -> Poll<io::Result<()>> {
            let limit = buffer.remaining().min(self.chunk_bytes);
            let mut limited = ReadBuf::new(&mut buffer.initialize_unfilled()[..limit]);
            match Pin::new(&mut self.inner).poll_read(context, &mut limited) {
                Poll::Ready(Ok(())) => {
                    let filled = limited.filled().len();
                    buffer.advance(filled);
                    Poll::Ready(Ok(()))
                }
                other => other,
            }
        }
    }

    async fn render(
        input: &[u8],
        markers: &HashMap<String, String>,
        chunk_bytes: usize,
        max_output_bytes: u64,
    ) -> io::Result<(Vec<u8>, ReplacementResult)> {
        let replacements =
            MarkerReplacements::new(markers).expect("marker replacements should compile");
        let mut input = ChunkedReader {
            inner: std::io::Cursor::new(input.to_vec()),
            chunk_bytes,
        };
        let mut output = Vec::new();
        let result = replacements
            .replace_stream(
                &mut input,
                &mut output,
                ReplacementOptions { max_output_bytes },
                |_| Ok(()),
            )
            .await?;
        Ok((output, result))
    }

    fn reference_replace(input: &[u8], markers: &BTreeMap<String, String>) -> Vec<u8> {
        let mut output = Vec::new();
        let mut cursor = 0_usize;
        while cursor < input.len() {
            let selected = markers
                .iter()
                .filter(|(pattern, _)| {
                    !pattern.is_empty() && input[cursor..].starts_with(pattern.as_bytes())
                })
                .max_by(|(left, _), (right, _)| {
                    left.len()
                        .cmp(&right.len())
                        .then_with(|| right.as_bytes().cmp(left.as_bytes()))
                });
            if let Some((pattern, replacement)) = selected {
                output.extend_from_slice(replacement.as_bytes());
                cursor += pattern.len();
            } else {
                output.push(input[cursor]);
                cursor += 1;
            }
        }
        output
    }

    #[tokio::test]
    async fn simultaneous_replacement_is_leftmost_longest_and_non_recursive() {
        let markers = HashMap::from([
            ("a".to_string(), "should-not-win".to_string()),
            ("ab".to_string(), "x".to_string()),
            ("x".to_string(), "cascaded".to_string()),
        ]);

        let (output, _) = render(b"abax", &markers, 1, u64::MAX)
            .await
            .expect("streaming replacement should succeed");

        assert_eq!(output, b"xshould-not-wincascaded");
    }

    #[tokio::test]
    async fn replacements_cross_chunks_and_support_utf8_empty_and_large_values() {
        let large = "z".repeat(256 * 1024);
        let markers = HashMap::from([
            ("TOKEN".to_string(), "".to_string()),
            ("世界".to_string(), large.clone()),
        ]);

        let (output, result) = render("before-TOKEN-世界-after".as_bytes(), &markers, 2, u64::MAX)
            .await
            .expect("streaming replacement should succeed");

        assert_eq!(
            output,
            [b"before--".as_slice(), large.as_bytes(), b"-after"].concat()
        );
        assert_eq!(result.output_bytes, output.len() as u64);
        assert!(!result.md5.is_empty());
    }

    fn encode(encoding: MarkerEncoding, value: Value) -> String {
        encode_marker_value(encoding, &value).expect("value should encode")
    }

    #[test]
    fn literal_substitutes_strings_verbatim() {
        assert_eq!(
            encode(MarkerEncoding::Literal, json!(r#"a "b" \c"#)),
            r#"a "b" \c"#
        );
    }

    #[test]
    fn unquoted_json_escapes_every_string_as_contents() {
        // The pre-quoted skeleton supplies the quotes, so strings that look
        // like JSON or arrive already quoted are still escaped as contents.
        let cases = [
            (
                r#"value with "quotes" and \backslash"#,
                r#"value with \"quotes\" and \\backslash"#,
            ),
            (r#"{"a":1}"#, r#"{\"a\":1}"#),
            (r#""quoted""#, r#"\"quoted\""#),
            ("8080", "8080"),
            ("line\nbreak", r"line\nbreak"),
            ("caf\u{e9} \u{1F600}", "caf\u{e9} \u{1F600}"),
        ];
        for (value, expected) in cases {
            let encoded = encode(MarkerEncoding::UnquotedJsonValue, json!(value));
            assert_eq!(encoded, expected);
            let document = format!(r#"{{"v":"{encoded}"}}"#);
            let parsed: Value = serde_json::from_str(&document).expect("substituted JSON parses");
            assert_eq!(parsed["v"], json!(value));
        }
    }

    #[test]
    fn json_encodings_render_lists_and_maps_as_complete_values() {
        let list = json!(["80", "443"]);
        let map = json!({ "port": "443" });
        for encoding in [MarkerEncoding::UnquotedJsonValue, MarkerEncoding::JsonValue] {
            assert_eq!(encode(encoding, list.clone()), r#"["80","443"]"#);
            assert_eq!(encode(encoding, map.clone()), r#"{"port":"443"}"#);
        }
        assert_eq!(
            encode(MarkerEncoding::JsonValue, json!(r#"say "hi""#)),
            r#""say \"hi\"""#
        );
    }

    #[test]
    fn yaml_string_keeps_simple_identifiers_plain() {
        for plain in ["us-east-1", "my-bucket.v2", "Stack_Name", "a"] {
            assert_eq!(encode(MarkerEncoding::YamlString, json!(plain)), plain);
        }
    }

    #[test]
    fn yaml_string_quotes_reserved_words_and_complex_values() {
        let cases = [
            ("yes", r#""yes""#),
            ("NULL", r#""NULL""#),
            ("Off", r#""Off""#),
            ("8080", r#""8080""#),
            ("", r#""""#),
            ("a: b", r#""a: b""#),
            (r#"say "hi""#, r#""say \"hi\"""#),
            ("caf\u{e9}", "\"caf\u{e9}\""),
        ];
        for (value, expected) in cases {
            assert_eq!(encode(MarkerEncoding::YamlString, json!(value)), expected);
        }
    }

    #[test]
    fn yaml_string_escapes_characters_yaml_folds_or_forbids() {
        assert_eq!(
            encode(
                MarkerEncoding::YamlString,
                json!("a\u{2028}b\u{85}c\u{FEFF}d\u{9F}e")
            ),
            r#""a\u2028b\u0085c\uFEFFd\u009Fe""#
        );
        // Astral characters stay literal instead of becoming surrogate escapes.
        assert_eq!(
            encode(MarkerEncoding::YamlString, json!("emoji \u{1F600}")),
            "\"emoji \u{1F600}\""
        );
    }

    #[test]
    fn string_only_encodings_reject_structured_values_without_echoing_them() {
        for encoding in [MarkerEncoding::Literal, MarkerEncoding::YamlString] {
            let error = encode_marker_value(encoding, &json!(["secret-value"]))
                .expect_err("lists are not strings");
            let message = error.to_string();
            assert!(message.contains("requires a string value"), "{message}");
            assert!(message.contains("list"), "{message}");
            assert!(!message.contains("secret-value"), "{message}");
        }
    }

    #[test]
    fn encodings_use_the_upstream_wire_names() {
        let names = serde_json::to_value([
            MarkerEncoding::Literal,
            MarkerEncoding::UnquotedJsonValue,
            MarkerEncoding::JsonValue,
            MarkerEncoding::YamlString,
        ])
        .expect("encodings serialize");
        assert_eq!(
            names,
            json!([
                "LITERAL",
                "UNQUOTED_JSON_VALUE",
                "JSON_VALUE",
                "YAML_STRING"
            ])
        );
    }

    #[tokio::test]
    async fn output_limit_is_enforced_before_the_excess_is_written() {
        let markers = HashMap::from([("x".to_string(), "expanded".to_string())]);
        let (output, _) = render(b"xx", &markers, 1, 16)
            .await
            .expect("an output exactly at the limit should succeed");
        assert_eq!(output.len(), 16);

        let error = render(b"xx", &markers, 1, 15)
            .await
            .expect_err("16-byte expansion must be rejected");

        assert!(error.to_string().contains("16 bytes"));
    }

    proptest! {
        #[test]
        fn streaming_engine_matches_the_small_reference(
            input in "[abcxyz]{0,128}",
            markers in prop::collection::btree_map("[abc]{1,5}", "[xyz]{0,8}", 0..8),
            chunk_bytes in 1_usize..16,
        ) {
            let expected = reference_replace(input.as_bytes(), &markers);
            let marker_map = markers.clone().into_iter().collect::<HashMap<_, _>>();
            let runtime = tokio::runtime::Builder::new_current_thread()
                .enable_all()
                .build()
                .expect("test runtime");
            let (actual, _) = runtime.block_on(render(
                input.as_bytes(),
                &marker_map,
                chunk_bytes,
                u64::MAX,
            )).expect("streaming replacement should succeed");

            prop_assert_eq!(actual, expected);
        }
    }
}
