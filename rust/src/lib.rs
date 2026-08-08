//! Library target for the provider crate.
//!
//! The provider itself ships as the `shin-bucket-deployment-handler` binary; this
//! library exists only so dev-only consumers that cargo compiles as separate crates
//! (the criterion bench in `benches/`) have something to link. Nothing in `src/main.rs`
//! uses it, and its own unit tests are disabled (`test = false` in `Cargo.toml`), so
//! `cargo test` still runs the bin's copy of the same modules exactly once.

// Every module below is compiled into this library only so the bench can link the
// planning surface; from the library's perspective the whole tree is intentionally
// unused (the real consumers live in the bin target, which keeps its own dead-code
// analysis). Without this allow, `cargo check --all-targets` would report hundreds of
// "never used" warnings for code that is very much used by the provider binary.
#![allow(dead_code)]

mod cloudformation;
mod cloudfront;
mod deadline;
mod lifecycle;
mod namespace;
mod replace;
mod request;
mod s3;
mod types;
mod util;
mod wire_contract;

// Dev-only bench surface, compiled only when the off-by-default `bench-internals`
// feature is enabled. See `s3/bench_internals.rs` for what is exposed and why.
#[cfg(feature = "bench-internals")]
pub use crate::s3::bench_internals;
