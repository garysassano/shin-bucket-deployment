//! Small helpers shared across modules.

use std::fmt::Write as _;
use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use md5::Digest;
use serde::Deserializer;

pub(crate) const MAX_DIAGNOSTIC_VALUE_BYTES: usize = 256;
const DIAGNOSTIC_TRUNCATION_SUFFIX: &str = " ... [truncated]";

/// Escapes log-forging characters and bounds the escaped UTF-8 representation.
///
/// The result is stable when sanitized again. Callers can therefore sanitize an
/// attacker-controlled value at an error boundary and safely sanitize the complete
/// error chain again before logging or returning it to CloudFormation.
pub(crate) fn sanitize_diagnostic(value: &str, max_bytes: usize) -> String {
    if max_bytes == 0 {
        return String::new();
    }

    let mut escaped = String::with_capacity(value.len().min(max_bytes));
    for character in value.chars() {
        push_diagnostic_character(&mut escaped, character);
        if escaped.len() > max_bytes {
            return truncated_diagnostic(value, max_bytes);
        }
    }
    escaped
}

fn truncated_diagnostic(value: &str, max_bytes: usize) -> String {
    if max_bytes <= DIAGNOSTIC_TRUNCATION_SUFFIX.len() {
        return DIAGNOSTIC_TRUNCATION_SUFFIX[..max_bytes].to_string();
    }

    let prefix_limit = max_bytes - DIAGNOSTIC_TRUNCATION_SUFFIX.len();
    let mut truncated = String::with_capacity(max_bytes);
    for character in value.chars() {
        let previous_len = truncated.len();
        push_diagnostic_character(&mut truncated, character);
        if truncated.len() > prefix_limit {
            truncated.truncate(previous_len);
            break;
        }
    }
    truncated.push_str(DIAGNOSTIC_TRUNCATION_SUFFIX);
    truncated
}

fn push_diagnostic_character(output: &mut String, character: char) {
    match character {
        '\0' => output.push_str("\\0"),
        '\u{0008}' => output.push_str("\\b"),
        '\t' => output.push_str("\\t"),
        '\n' => output.push_str("\\n"),
        '\u{000c}' => output.push_str("\\f"),
        '\r' => output.push_str("\\r"),
        '\u{2028}' | '\u{2029}' => {
            write!(output, "\\u{{{:04x}}}", character as u32)
                .expect("writing to a String cannot fail");
        }
        _ if character.is_control() => {
            write!(output, "\\u{{{:04x}}}", character as u32)
                .expect("writing to a String cannot fail");
        }
        _ => output.push(character),
    }
}

/// Lowercase hex encoding.
///
/// Used for MD5 digests that reach S3 comparisons, physical resource IDs, and
/// diagnostics, so the alphabet must stay lowercase and unpadded.
pub(crate) fn lower_hex(bytes: &[u8]) -> String {
    const HEX: &[u8; 16] = b"0123456789abcdef";

    let mut output = String::with_capacity(bytes.len() * 2);
    for byte in bytes {
        output.push(HEX[(byte >> 4) as usize] as char);
        output.push(HEX[(byte & 0x0f) as usize] as char);
    }
    output
}

/// Finishes any digest and returns the lowercase hex digest.
///
/// One generic helper covers every hasher the provider finishes (MD5 for S3
/// comparisons and resource IDs, SHA-256 for physical resource IDs and copy
/// reconciliation), so the per-type `finalize` + hex-encode tail is not written
/// out again for each hasher.
pub(crate) fn finalize_digest<D: Digest>(hasher: D) -> String {
    lower_hex(hasher.finalize().as_ref())
}

/// S3 and general AWS throttle response codes.
///
/// Source range reads and destination writes classify throttling identically, so
/// they share one list; divergence here would silently change retry behaviour on
/// only one of the two paths.
pub(crate) fn is_throttle_error_code(code: &str) -> bool {
    matches!(
        code,
        "SlowDown"
            | "Throttling"
            | "ThrottlingException"
            | "TooManyRequestsException"
            | "RequestLimitExceeded"
            | "RequestThrottled"
            | "RequestThrottledException"
            | "ProvisionedThroughputExceededException"
            | "BandwidthLimitExceeded"
    )
}

/// Accepts a JSON boolean or the strings `true`/`false` in any case.
///
/// CloudFormation stringifies resource properties, so the same field can arrive
/// as either form depending on how the template was authored.
pub(crate) fn deserialize_boolish<'de, D>(deserializer: D) -> std::result::Result<bool, D::Error>
where
    D: Deserializer<'de>,
{
    struct BoolishVisitor;

    impl serde::de::Visitor<'_> for BoolishVisitor {
        type Value = bool;

        fn expecting(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
            formatter.write_str("a boolean or a string containing true or false")
        }

        fn visit_bool<E>(self, value: bool) -> std::result::Result<Self::Value, E> {
            Ok(value)
        }

        fn visit_str<E>(self, value: &str) -> std::result::Result<Self::Value, E>
        where
            E: serde::de::Error,
        {
            match value.to_ascii_lowercase().as_str() {
                "true" => Ok(true),
                "false" => Ok(false),
                _ => Err(E::invalid_value(serde::de::Unexpected::Str(value), &self)),
            }
        }
    }

    deserializer.deserialize_any(BoolishVisitor)
}

/// Milliseconds elapsed, saturating rather than wrapping on absurd durations.
pub(crate) fn duration_ms(duration: Duration) -> u64 {
    u64::try_from(duration.as_millis()).unwrap_or(u64::MAX)
}

/// Microseconds elapsed, saturating rather than wrapping on absurd durations.
///
/// The `phaseMs.plan` sub-timings accumulate at this resolution and convert to
/// whole milliseconds once, at snapshot time. Per-call millisecond truncation
/// erased every sub-millisecond planning stage (a per-archive `planValidation`
/// of ~0.5 ms reported a constant 0), which made the instrument coarser than
/// the cost it exists to attribute.
pub(crate) fn duration_micros(duration: Duration) -> u64 {
    u64::try_from(duration.as_micros()).unwrap_or(u64::MAX)
}

/// Locks observational telemetry without turning an earlier worker panic into a
/// second panic while reporting the original failure.
///
/// Only use this for diagnostics whose partially updated value remains safe to
/// inspect or overwrite. Control and resource-state mutexes must continue to
/// fail closed because a panic may have interrupted an invariant-preserving
/// mutation.
pub(crate) fn lock_telemetry<T>(telemetry: &Mutex<T>) -> MutexGuard<'_, T> {
    telemetry.lock().unwrap_or_else(PoisonError::into_inner)
}

#[cfg(test)]
mod tests {
    use std::panic::{AssertUnwindSafe, catch_unwind};
    use std::sync::Mutex;

    use md5::{Digest, Md5};

    use super::{finalize_digest, lock_telemetry, lower_hex, sanitize_diagnostic};

    #[test]
    fn diagnostic_sanitization_escapes_control_and_line_separator_characters() {
        let input = "plain\0\u{0008}\t\n\u{000c}\r\u{001b}\u{007f}\u{0085}\u{2028}\u{2029}é";

        assert_eq!(
            sanitize_diagnostic(input, 256),
            "plain\\0\\b\\t\\n\\f\\r\\u{001b}\\u{007f}\\u{0085}\\u{2028}\\u{2029}é"
        );
    }

    #[test]
    fn diagnostic_sanitization_caps_escaped_bytes_on_complete_chunks() {
        let sanitized = sanitize_diagnostic("é\n".repeat(100).as_str(), 32);

        assert_eq!(sanitized.len(), 32);
        assert_eq!(sanitized, "é\\né\\né\\né\\n ... [truncated]");
        assert!(!sanitized.contains('\n'));
        assert!(sanitized.is_char_boundary(sanitized.len()));
    }

    #[test]
    fn diagnostic_sanitization_is_stable_when_applied_again() {
        let sanitized = sanitize_diagnostic("first\nsecond\u{2028}third", 24);

        assert_eq!(sanitize_diagnostic(&sanitized, 24), sanitized);
    }

    #[test]
    fn lower_hex_pads_each_byte_to_two_lowercase_digits() {
        assert_eq!(lower_hex(&[]), "");
        assert_eq!(lower_hex(&[0x00]), "00");
        assert_eq!(lower_hex(&[0x0f]), "0f");
        assert_eq!(lower_hex(&[0xff, 0xa0, 0x01]), "ffa001");
    }

    #[test]
    fn finalize_digest_matches_the_known_empty_and_abc_digests() {
        assert_eq!(
            finalize_digest(Md5::new()),
            "d41d8cd98f00b204e9800998ecf8427e"
        );

        let mut hasher = Md5::new();
        hasher.update(b"abc");
        assert_eq!(finalize_digest(hasher), "900150983cd24fb0d6963f7d28e17f72");
    }

    #[test]
    fn telemetry_lock_preserves_best_effort_data_after_poisoning() {
        let telemetry = Mutex::new(vec!["before"]);
        let panic = catch_unwind(AssertUnwindSafe(|| {
            let mut values = telemetry.lock().expect("initial telemetry lock");
            values.push("during");
            panic!("injected telemetry writer panic");
        }));
        assert!(panic.is_err());

        let mut values = lock_telemetry(&telemetry);
        values.push("after");
        assert_eq!(*values, ["before", "during", "after"]);
    }
}
