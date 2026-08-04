//! Small helpers shared across modules.

use std::sync::{Mutex, MutexGuard, PoisonError};
use std::time::Duration;

use md5::{Digest, Md5};
use serde::Deserializer;

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

/// Finishes an MD5 hasher and returns the lowercase hex digest.
pub(crate) fn finalize_md5(hasher: Md5) -> String {
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

    use super::{finalize_md5, lock_telemetry, lower_hex};

    #[test]
    fn lower_hex_pads_each_byte_to_two_lowercase_digits() {
        assert_eq!(lower_hex(&[]), "");
        assert_eq!(lower_hex(&[0x00]), "00");
        assert_eq!(lower_hex(&[0x0f]), "0f");
        assert_eq!(lower_hex(&[0xff, 0xa0, 0x01]), "ffa001");
    }

    #[test]
    fn finalize_md5_matches_the_known_empty_and_abc_digests() {
        assert_eq!(finalize_md5(Md5::new()), "d41d8cd98f00b204e9800998ecf8427e");

        let mut hasher = Md5::new();
        hasher.update(b"abc");
        assert_eq!(finalize_md5(hasher), "900150983cd24fb0d6963f7d28e17f72");
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
