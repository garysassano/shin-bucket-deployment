use crate::types::{DeploymentRequest, PreviousDestination};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RetainReason {
    MissingAuthorization,
    AuthorizationMismatch,
    OwnerMismatch,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum NoCleanupReason {
    SameDestination,
    CurrentContainsPrevious,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DeletePreviousDestination {
    pub(crate) previous: PreviousDestination,
    pub(crate) excluded_prefix: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum DestinationChangeCleanupDecision {
    NotNeeded(NoCleanupReason),
    Retain(RetainReason),
    Delete(DeletePreviousDestination),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum NamespaceRelation {
    Same,
    PreviousContainsCurrent,
    CurrentContainsPrevious,
    Disjoint,
}

pub(crate) fn plan_destination_change_cleanup(
    current: &DeploymentRequest,
    previous: &PreviousDestination,
) -> DestinationChangeCleanupDecision {
    let same_bucket = current.dest_bucket_name == previous.bucket_name;
    let relation = if same_bucket {
        namespace_relation(&previous.bucket_prefix, &current.dest_bucket_prefix)
    } else {
        NamespaceRelation::Disjoint
    };

    match relation {
        NamespaceRelation::Same => {
            return DestinationChangeCleanupDecision::NotNeeded(NoCleanupReason::SameDestination);
        }
        NamespaceRelation::CurrentContainsPrevious => {
            return DestinationChangeCleanupDecision::NotNeeded(
                NoCleanupReason::CurrentContainsPrevious,
            );
        }
        NamespaceRelation::PreviousContainsCurrent | NamespaceRelation::Disjoint => {}
    }

    if current.delete_previous_objects_on_change.is_none() {
        return DestinationChangeCleanupDecision::Retain(RetainReason::MissingAuthorization);
    }

    if !previous_namespace_authorized(current, previous) {
        return DestinationChangeCleanupDecision::Retain(RetainReason::AuthorizationMismatch);
    }

    if let (Some(current_owner), Some(previous_owner)) = (
        current.destination_owner_id.as_deref(),
        previous.owner_id.as_deref(),
    ) && current_owner != previous_owner
    {
        return DestinationChangeCleanupDecision::Retain(RetainReason::OwnerMismatch);
    }

    let excluded_prefix = (relation == NamespaceRelation::PreviousContainsCurrent)
        .then(|| current.dest_bucket_prefix.clone());

    DestinationChangeCleanupDecision::Delete(DeletePreviousDestination {
        previous: previous.clone(),
        excluded_prefix,
    })
}

pub(crate) fn destination_namespaces_overlap(
    current: &DeploymentRequest,
    previous: &PreviousDestination,
) -> bool {
    current.dest_bucket_name == previous.bucket_name
        && namespaces_overlap(
            &canonical_namespace(&current.dest_bucket_prefix),
            &canonical_namespace(&previous.bucket_prefix),
        )
}

pub(crate) fn previous_distribution_authorized(
    current: &DeploymentRequest,
    previous: &PreviousDestination,
) -> bool {
    current.invalidate_previous_distribution_on_change.is_some()
        && current.invalidate_previous_distribution_on_change == previous.distribution_id
}

fn previous_namespace_authorized(
    current: &DeploymentRequest,
    previous: &PreviousDestination,
) -> bool {
    current
        .delete_previous_objects_on_change
        .as_ref()
        .is_some_and(|authorization| authorization.bucket_name == previous.bucket_name)
}

pub(crate) fn canonical_namespace(prefix: &str) -> String {
    if prefix.is_empty() || prefix == "/" {
        return String::new();
    }
    if prefix.ends_with('/') {
        prefix.to_string()
    } else {
        format!("{prefix}/")
    }
}

fn namespace_relation(previous: &str, current: &str) -> NamespaceRelation {
    let previous = canonical_namespace(previous);
    let current = canonical_namespace(current);

    if previous == current {
        NamespaceRelation::Same
    } else if previous.is_empty() || current.starts_with(&previous) {
        NamespaceRelation::PreviousContainsCurrent
    } else if current.is_empty() || previous.starts_with(&current) {
        NamespaceRelation::CurrentContainsPrevious
    } else {
        NamespaceRelation::Disjoint
    }
}

fn namespaces_overlap(left: &str, right: &str) -> bool {
    left.is_empty() || right.is_empty() || left.starts_with(right) || right.starts_with(left)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::types::{
        DeletePreviousObjectsOnChange, DeploymentRequest, PutObjectRetryJitter,
        PutObjectRetryOptions, RuntimeOptions,
    };

    use super::*;

    fn current(bucket: &str, prefix: &str) -> DeploymentRequest {
        DeploymentRequest {
            source_bucket_names: vec!["source".to_string()],
            source_object_keys: vec!["source.zip".to_string()],
            source_catalogs: vec![None],
            source_markers: vec![HashMap::new()],
            source_markers_config: vec![Default::default()],
            dest_bucket_name: bucket.to_string(),
            dest_bucket_prefix: prefix.to_string(),
            extract: true,
            delete_current_objects_on_delete: true,
            distribution_id: None,
            distribution_paths: vec!["/*".to_string()],
            wait_for_distribution_invalidation: true,
            user_metadata: HashMap::new(),
            system_metadata: HashMap::new(),
            delete_stale_objects_on_deployment: true,
            exclude: Vec::new(),
            include: Vec::new(),
            output_object_keys: true,
            destination_bucket_arn: None,
            destination_owner_id: Some("owner".to_string()),
            delete_previous_objects_on_change: None,
            invalidate_previous_distribution_on_change: None,
            runtime: RuntimeOptions {
                available_memory_mb: 1024,
                max_parallel_transfers: 1,
                source_block_bytes: 1024,
                source_block_merge_gap_bytes: 0,
                source_get_concurrency: 1,
                source_window_bytes: None,
                source_window_memory_budget_mb: 256,
                put_object_retry: PutObjectRetryOptions {
                    max_attempts: 1,
                    retry_base_delay_ms: 0,
                    retry_max_delay_ms: 0,
                    slowdown_retry_base_delay_ms: 0,
                    slowdown_retry_max_delay_ms: 0,
                    jitter: PutObjectRetryJitter::None,
                },
            },
        }
    }

    fn previous(bucket: &str, prefix: &str) -> PreviousDestination {
        PreviousDestination {
            bucket_name: bucket.to_string(),
            bucket_prefix: prefix.to_string(),
            distribution_id: None,
            distribution_paths: vec!["/*".to_string()],
            owner_id: Some("owner".to_string()),
        }
    }

    fn authorize(request: &mut DeploymentRequest, previous: &PreviousDestination) {
        request.delete_previous_objects_on_change = Some(DeletePreviousObjectsOnChange {
            bucket_name: previous.bucket_name.clone(),
        });
    }

    #[test]
    fn equivalent_prefixes_need_no_cleanup() {
        let request = current("bucket", "site/");
        assert_eq!(
            plan_destination_change_cleanup(&request, &previous("bucket", "site")),
            DestinationChangeCleanupDecision::NotNeeded(NoCleanupReason::SameDestination)
        );
    }

    #[test]
    fn old_parent_cleanup_excludes_the_complete_current_namespace() {
        let mut request = current("bucket", "site/updated");
        let previous = previous("bucket", "site");
        authorize(&mut request, &previous);

        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Delete(DeletePreviousDestination {
                previous,
                excluded_prefix: Some("site/updated".to_string()),
            })
        );
    }

    #[test]
    fn old_root_cleanup_excludes_the_current_namespace() {
        let mut request = current("bucket", "site");
        let previous = previous("bucket", "");
        authorize(&mut request, &previous);

        let DestinationChangeCleanupDecision::Delete(plan) =
            plan_destination_change_cleanup(&request, &previous)
        else {
            panic!("expected cleanup");
        };
        assert_eq!(plan.excluded_prefix.as_deref(), Some("site"));
    }

    #[test]
    fn current_parent_subsumes_the_previous_namespace() {
        let request = current("bucket", "site");
        assert_eq!(
            plan_destination_change_cleanup(&request, &previous("bucket", "site/initial")),
            DestinationChangeCleanupDecision::NotNeeded(NoCleanupReason::CurrentContainsPrevious)
        );
    }

    #[test]
    fn segment_neighbors_are_disjoint() {
        let mut request = current("bucket", "site2");
        let previous = previous("bucket", "site");
        authorize(&mut request, &previous);

        let DestinationChangeCleanupDecision::Delete(plan) =
            plan_destination_change_cleanup(&request, &previous)
        else {
            panic!("expected cleanup");
        };
        assert!(plan.excluded_prefix.is_none());
    }

    #[test]
    fn namespace_overlap_is_bucket_and_segment_aware() {
        let request = current("bucket", "site");
        assert!(destination_namespaces_overlap(
            &request,
            &previous("bucket", "site/initial")
        ));
        assert!(!destination_namespaces_overlap(
            &request,
            &previous("bucket", "site2")
        ));
        assert!(!destination_namespaces_overlap(
            &request,
            &previous("other", "site")
        ));
    }

    #[test]
    fn intentional_double_slash_is_a_child_namespace() {
        let mut request = current("bucket", "site//");
        let previous = previous("bucket", "site/");
        authorize(&mut request, &previous);

        let DestinationChangeCleanupDecision::Delete(plan) =
            plan_destination_change_cleanup(&request, &previous)
        else {
            panic!("expected cleanup");
        };
        assert_eq!(plan.excluded_prefix.as_deref(), Some("site//"));
    }

    #[test]
    fn cross_bucket_cleanup_requires_exact_authorization() {
        let mut request = current("new", "site");
        let previous = previous("old", "site");

        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Retain(RetainReason::MissingAuthorization)
        );

        authorize(&mut request, &previous);
        let DestinationChangeCleanupDecision::Delete(plan) =
            plan_destination_change_cleanup(&request, &previous)
        else {
            panic!("expected cleanup");
        };
        assert_eq!(plan.previous.bucket_name, "old");
        assert!(plan.excluded_prefix.is_none());
    }

    #[test]
    fn mismatched_bucket_is_retained() {
        let mut request = current("new", "site");
        let previous = previous("old", "site");
        request.delete_previous_objects_on_change = Some(DeletePreviousObjectsOnChange {
            bucket_name: "other".to_string(),
        });

        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Retain(RetainReason::AuthorizationMismatch)
        );
    }

    #[test]
    fn previous_object_cleanup_is_independent_of_distribution_authorization() {
        let mut request = current("bucket", "updated");
        request.distribution_id = Some("new-distribution".to_string());
        let mut previous = previous("bucket", "initial");
        previous.distribution_id = Some("old-distribution".to_string());
        authorize(&mut request, &previous);

        assert!(matches!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Delete(_)
        ));
        assert!(!previous_distribution_authorized(&request, &previous));
    }

    #[test]
    fn previous_distribution_requires_exact_independent_authorization() {
        let mut request = current("bucket", "site");
        request.distribution_id = Some("new-distribution".to_string());
        let mut previous = previous("bucket", "site");
        previous.distribution_id = Some("old-distribution".to_string());

        assert!(!previous_distribution_authorized(&request, &previous));
        request.invalidate_previous_distribution_on_change = Some("wrong".to_string());
        assert!(!previous_distribution_authorized(&request, &previous));
        request.invalidate_previous_distribution_on_change = Some("old-distribution".to_string());
        assert!(previous_distribution_authorized(&request, &previous));
    }

    #[test]
    fn unchanged_distribution_does_not_block_previous_object_cleanup() {
        let mut request = current("bucket", "updated");
        request.distribution_id = Some("distribution".to_string());
        let mut previous = previous("bucket", "initial");
        previous.distribution_id = Some("distribution".to_string());
        request.delete_previous_objects_on_change = Some(DeletePreviousObjectsOnChange {
            bucket_name: previous.bucket_name.clone(),
        });

        assert!(matches!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Delete(_)
        ));
    }

    #[test]
    fn owner_mismatch_retains_previous_data() {
        let mut request = current("new", "site");
        let mut previous = previous("old", "site");
        authorize(&mut request, &previous);

        previous.owner_id = Some("different-owner".to_string());
        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Retain(RetainReason::OwnerMismatch)
        );
    }

    #[test]
    fn previous_object_deletion_is_independent_of_delete_event_setting() {
        let mut request = current("new", "site");
        let previous = previous("old", "site");
        authorize(&mut request, &previous);
        request.delete_current_objects_on_delete = false;

        assert!(matches!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Delete(_)
        ));
    }
}
