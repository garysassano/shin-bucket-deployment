use std::collections::HashMap;
use std::io;

use aho_corasick::{AhoCorasick, AhoCorasickBuilder, MatchKind};
use anyhow::Result;
use md5::{Digest as Md5Digest, Md5};
use serde_json::Value;
use tokio::io::{AsyncRead, AsyncReadExt, AsyncWrite, AsyncWriteExt};

use crate::deployment::MarkerConfig;
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
    pub(crate) fn new(markers: &HashMap<String, String>, config: &MarkerConfig) -> Result<Self> {
        let mut pairs = replacement_pairs(markers, config)?;
        pairs.retain(|(pattern, _)| !pattern.is_empty());
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

fn replacement_pairs(
    markers: &HashMap<String, String>,
    config: &MarkerConfig,
) -> Result<Vec<(Vec<u8>, Vec<u8>)>> {
    markers
        .iter()
        .map(|(key, value)| {
            let replacement = if config.json_escape {
                json_escape_marker_value(value)?
            } else {
                value.clone()
            };
            Ok((key.as_bytes().to_vec(), replacement.into_bytes()))
        })
        .collect()
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

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;
    use std::pin::Pin;
    use std::task::{Context, Poll};

    use proptest::prelude::*;
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
        config: &MarkerConfig,
        chunk_bytes: usize,
        max_output_bytes: u64,
    ) -> io::Result<(Vec<u8>, ReplacementResult)> {
        let replacements =
            MarkerReplacements::new(markers, config).expect("marker replacements should compile");
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

        let (output, _) = render(b"abax", &markers, &MarkerConfig::default(), 1, u64::MAX)
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

        let (output, result) = render(
            "before-TOKEN-世界-after".as_bytes(),
            &markers,
            &MarkerConfig::default(),
            2,
            u64::MAX,
        )
        .await
        .expect("streaming replacement should succeed");

        assert_eq!(
            output,
            [b"before--".as_slice(), large.as_bytes(), b"-after"].concat()
        );
        assert_eq!(result.output_bytes, output.len() as u64);
        assert!(!result.md5.is_empty());
    }

    #[tokio::test]
    async fn json_escape_values_keep_existing_semantics() {
        let markers = HashMap::from([(
            "TOKEN".to_string(),
            r#"value with "quotes" and \backslash"#.to_string(),
        )]);

        let (output, _) = render(
            br#"{"value":"TOKEN"}"#,
            &markers,
            &MarkerConfig { json_escape: true },
            3,
            u64::MAX,
        )
        .await
        .expect("JSON-escaped replacement should succeed");

        assert_eq!(
            output,
            br#"{"value":"value with \"quotes\" and \\backslash"}"#
        );
    }

    #[tokio::test]
    async fn output_limit_is_enforced_before_the_excess_is_written() {
        let markers = HashMap::from([("x".to_string(), "expanded".to_string())]);
        let (output, _) = render(b"xx", &markers, &MarkerConfig::default(), 1, 16)
            .await
            .expect("an output exactly at the limit should succeed");
        assert_eq!(output.len(), 16);

        let error = render(b"xx", &markers, &MarkerConfig::default(), 1, 15)
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
                &MarkerConfig::default(),
                chunk_bytes,
                u64::MAX,
            )).expect("streaming replacement should succeed");

            prop_assert_eq!(actual, expected);
        }
    }
}
