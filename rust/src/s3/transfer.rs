use std::sync::Arc;

use crate::deadline::InvocationDeadlines;
use crate::diagnostics::DeploymentStats;

mod copy;
mod diagnostics;
mod scheduler;
mod upload;

#[cfg(feature = "bench-internals")]
pub(crate) use upload::bench;

pub(super) use copy::execute_copy_plans;
pub(super) use upload::upload_zip_entries;

pub(super) struct TransferExecution {
    pub(super) stats: Arc<DeploymentStats>,
    pub(super) deadlines: InvocationDeadlines,
}

#[cfg(test)]
mod tests;
