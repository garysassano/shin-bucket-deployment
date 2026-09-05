//! Resident source fixture for the transfer CPU benchmark. No network is involved.

use super::block_store::{SourceBlockOptions, SourceBlockStatus, SourceBlockStore};
use super::budget::SourceByteBudget;
use super::*;
use crate::diagnostics::DeploymentStats;
use crate::s3::planner::ZipEntryPlan;

pub(crate) fn resident_store(
    client: &Client,
    bytes: Bytes,
    plan: &ZipEntryPlan,
) -> Result<Arc<SourceBlockStore>> {
    let source = Arc::new(SourceClient {
        client: client.clone(),
        bucket: "fixture".into(),
        key: "fixture.zip".into(),
        len: bytes.len() as u64,
        etag: "fixture".into(),
        diagnostics: Arc::new(SourceDiagnostics::new(bytes.len() as u64)),
    });
    let store = SourceBlockStore::new(
        source,
        std::slice::from_ref(plan),
        SourceBlockOptions {
            block_bytes: 8 * 1024 * 1024,
            merge_gap_bytes: 256 * 1024,
            get_concurrency: 1,
            window_bytes: bytes.len(),
        },
        SourceByteBudget::new(
            256 * 1024 * 1024,
            Arc::new(DeploymentStats::new(true)),
            true,
        )?,
    )?;
    {
        let mut state = store.state.lock().expect("fixture store lock");
        let mut resident = 0;
        for (slot, block) in state.slots.iter_mut().zip(&store.blocks) {
            let data = bytes.slice(block.start as usize..block.end_exclusive as usize);
            resident += data.len() as u64;
            slot.status = SourceBlockStatus::Ready(data);
            // Keep one fixture-owned claim until the store is dropped. A comparison
            // followed by streaming replay then reuses resident bytes without an S3
            // fetch. Runtime claim handling and reader/decoder code stay unchanged.
            slot.remaining_claims += 1;
        }
        state.resident_bytes = resident;
        state.window_committed_bytes = resident;
    }
    Ok(store)
}
