//! Opt-in access to actual preparation and body code; no provider API is widened.

use super::*;
use crate::deployment::TrustedEntryIntegrity;
use crate::s3::archive::bench::resident_store;

/// Parsed fixture metadata. ZIP writing/parsing is performed by the dev target.
#[derive(Clone)]
pub struct TransferFixture {
    pub archive: Bytes,
    pub size: u64,
    pub compressed_size: u64,
    pub compression_code: u16,
    pub crc32: u32,
    pub source_offset: u64,
    pub source_span_end_exclusive: u64,
    pub input_md5: String,
    pub output_md5: String,
    pub output_size: u64,
    pub marker: Option<(String, String)>,
}

#[derive(Clone, Copy, Debug, serde::Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum TransferOperation {
    DecodeValidate,
    ColdCreate,
    Unchanged,
    Changed,
}

#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TransferOutcome {
    pub skipped: bool,
    pub spooled: bool,
    pub decoded_bytes: u64,
    pub emitted_bytes: u64,
    pub prepare_nanos: u64,
    pub body_nanos: u64,
}

/// Build a fresh handle outside every sample. Resident source bytes and compiled
/// marker matching are fixture setup; decoding, hashing, validation and spooling
/// remain inside `run`, including work performed lazily by the upload body.
pub struct TransferBench {
    store: Arc<SourceBlockStore>,
    plan: ZipEntryPlan,
    replacements: Option<Arc<MarkerReplacements>>,
    destination: Option<DestinationObject>,
    operation: TransferOperation,
}

impl TransferBench {
    pub fn spool_limit_bytes() -> u64 {
        comparison_spool_limit_bytes(64)
    }

    pub fn new(
        client: &S3Client,
        fixture: &TransferFixture,
        cataloged: bool,
        operation: TransferOperation,
    ) -> Result<Self> {
        let plan = ZipEntryPlan {
            source_index: 0,
            relative_key: "fixture.bin".into(),
            destination_key: "site/fixture.bin".into(),
            size: fixture.size,
            compressed_size: fixture.compressed_size,
            compression_code: fixture.compression_code,
            crc32: fixture.crc32,
            trusted_integrity: cataloged.then(|| TrustedEntryIntegrity {
                size: fixture.size,
                md5: fixture.input_md5.clone(),
            }),
            source_offset: fixture.source_offset,
            source_span_end_exclusive: fixture.source_span_end_exclusive,
        };
        let destination = match operation {
            TransferOperation::Unchanged => Some(DestinationObject {
                etag: Some(fixture.output_md5.clone()),
                size: Some(fixture.output_size),
            }),
            TransferOperation::Changed => Some(DestinationObject {
                etag: Some("0".repeat(32)),
                size: Some(fixture.output_size),
            }),
            _ => None,
        };
        let markers = fixture.marker.iter().cloned().collect();
        Ok(Self {
            store: resident_store(client, fixture.archive.clone(), &plan)?,
            plan,
            replacements: compile_marker_replacements(&markers, &Default::default())?,
            destination,
            operation,
        })
    }

    /// `expected_output` enables exact-body fixture checks, outside timing runs.
    pub async fn run(&self, expected_output: Option<&[u8]>) -> Result<TransferOutcome> {
        let stats = Arc::new(DeploymentStats::new(true));
        let started = std::time::Instant::now();
        let mut outcome = TransferOutcome {
            skipped: false,
            spooled: false,
            decoded_bytes: 0,
            emitted_bytes: 0,
            prepare_nanos: 0,
            body_nanos: 0,
        };
        if matches!(self.operation, TransferOperation::DecodeValidate) {
            // Includes the real ZipEntryAsyncReader/codec, CRC, declared-size and
            // trusted MD5 validation, without upload framing or a retained spool.
            hash_zip_entry_reader(self.store.clone(), self.plan.clone(), 0, &stats).await?;
            outcome.decoded_bytes = self.plan.size;
            outcome.prepare_nanos = started.elapsed().as_nanos() as u64;
            return Ok(outcome);
        }
        if catalog_skips_zip_entry(
            &self.plan,
            self.replacements.is_some(),
            self.destination.as_ref(),
            &stats,
        ) {
            outcome.skipped = true;
            outcome.prepare_nanos = started.elapsed().as_nanos() as u64;
            return Ok(outcome);
        }
        let compared = self.replacements.is_some()
            || should_compare_marker_free_entry(&self.plan, self.destination.as_ref());
        let payload = prepare_zip_entry_upload(
            &self.store,
            &self.plan,
            self.replacements.clone(),
            self.destination.as_ref(),
            &stats,
            Self::spool_limit_bytes(),
        )
        .await?;
        outcome.prepare_nanos = started.elapsed().as_nanos() as u64;
        if compared {
            outcome.decoded_bytes += self.plan.size;
        }
        let Some(payload) = payload else {
            outcome.skipped = true;
            return Ok(outcome);
        };
        outcome.spooled = matches!(payload, UploadPayload::Bytes { .. });
        if !outcome.spooled {
            outcome.decoded_bytes += self.plan.size;
        }
        let body_started = std::time::Instant::now();
        let result = async {
            let mut body = payload_body(&payload);
            while let Some(chunk) = body.next().await {
                let chunk = chunk?;
                if let Some(expected) = expected_output {
                    let offset = outcome.emitted_bytes as usize;
                    anyhow::ensure!(
                        expected.get(offset..offset + chunk.len()) == Some(chunk.as_ref()),
                        "fixture upload body differs from expected bytes"
                    );
                }
                outcome.emitted_bytes += chunk.len() as u64;
                std::hint::black_box(chunk);
            }
            anyhow::ensure!(
                outcome.emitted_bytes == payload.content_length(),
                "fixture body length mismatch"
            );
            anyhow::ensure!(
                payload.body_state().validation_error().is_none(),
                "fixture body failed validation"
            );
            Ok(())
        }
        .await;
        self.store
            .abort_and_drain_body_tasks(Instant::now() + Duration::from_secs(5))
            .await?;
        result?;
        outcome.body_nanos = body_started.elapsed().as_nanos() as u64;
        Ok(outcome)
    }
}
