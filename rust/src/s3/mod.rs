use anyhow::Result;

use crate::request::compile_filters;
use crate::types::{AppState, DeploymentRequest, ObjectMetadata};

pub(crate) mod archive;
mod destination;
mod metadata;
mod planner;
mod transfer;

pub(crate) use destination::{bucket_owned, delete_prefix};

const MAX_PARALLEL_TRANSFERS: usize = 8;
const SOURCE_BLOCK_BYTES: usize = 8 * 1024 * 1024;
const SOURCE_BLOCK_MERGE_GAP_BYTES: usize = 256 * 1024;
const SOURCE_WINDOW_BYTES: usize = 64 * 1024 * 1024;
const ZIP_ENTRY_READ_CHUNK_BYTES: usize = 8 * 1024 * 1024;

pub(crate) async fn deploy(state: &AppState, request: &DeploymentRequest) -> Result<()> {
    planner::validate_request_lengths(request)?;

    let filters = compile_filters(&request.exclude, &request.include)?;
    let metadata = ObjectMetadata::from_request(request);
    let (archives, deployment_manifest) =
        planner::plan_deployment(state, request, &filters).await?;
    let destination_plan =
        destination::plan_destination(state, request, &filters, &deployment_manifest).await?;

    if request.extract {
        let zip_plans =
            planner::collect_zip_entry_plans(&deployment_manifest, &request.dest_bucket_prefix);
        transfer::upload_zip_entries(
            state,
            &archives,
            request,
            &metadata,
            zip_plans,
            &destination_plan.objects,
        )
        .await?;
    } else {
        let copy_plans =
            planner::collect_copy_plans(&deployment_manifest, request, &destination_plan.objects);
        transfer::execute_copy_plans(state, &request.dest_bucket_name, &metadata, copy_plans)
            .await?;
    }

    if request.prune {
        destination::delete_keys(
            state,
            &request.dest_bucket_name,
            &destination_plan.keys_to_delete,
        )
        .await?;
    }

    Ok(())
}
