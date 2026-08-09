use crate::deployment::{DeploymentRequest, PreviousDestination};
use crate::namespace::{
    NamespaceRelation, canonical_namespace, namespace_relation, namespaces_overlap,
};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum RetainReason {
    MissingAuthorization,
    AuthorizationMismatch,
    OwnerMismatch,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(crate) enum NoCleanupReason {
    SameDestination,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum PreviousCleanupStrategy {
    DeleteNamespace { excluded_prefix: Option<String> },
    DeleteStaleWithinCurrent,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) struct DeletePreviousDestination {
    pub(crate) previous: PreviousDestination,
    pub(crate) strategy: PreviousCleanupStrategy,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(crate) enum DestinationChangeCleanupDecision {
    NotNeeded(NoCleanupReason),
    Retain(RetainReason),
    Delete(DeletePreviousDestination),
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

    let strategy = match relation {
        NamespaceRelation::Same => {
            return DestinationChangeCleanupDecision::NotNeeded(NoCleanupReason::SameDestination);
        }
        NamespaceRelation::PreviousContainsCurrent => PreviousCleanupStrategy::DeleteNamespace {
            excluded_prefix: Some(current.dest_bucket_prefix.clone()),
        },
        NamespaceRelation::CurrentContainsPrevious => {
            PreviousCleanupStrategy::DeleteStaleWithinCurrent
        }
        NamespaceRelation::Disjoint => PreviousCleanupStrategy::DeleteNamespace {
            excluded_prefix: None,
        },
    };

    if current.delete_previous_objects_on_change.is_none() {
        return DestinationChangeCleanupDecision::Retain(RetainReason::MissingAuthorization);
    }

    if !previous_namespace_authorized(current, previous) {
        return DestinationChangeCleanupDecision::Retain(RetainReason::AuthorizationMismatch);
    }

    if current.destination_owner_id != previous.owner_id {
        return DestinationChangeCleanupDecision::Retain(RetainReason::OwnerMismatch);
    }

    DestinationChangeCleanupDecision::Delete(DeletePreviousDestination {
        previous: previous.clone(),
        strategy,
    })
}

pub(crate) fn previous_namespace_is_within_current(
    current: &DeploymentRequest,
    previous: &PreviousDestination,
) -> bool {
    current.dest_bucket_name == previous.bucket_name
        && namespace_relation(&previous.bucket_prefix, &current.dest_bucket_prefix)
            == NamespaceRelation::CurrentContainsPrevious
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

#[cfg(test)]
mod tests {
    use crate::deployment::{DeletePreviousObjectsOnChange, DeploymentRequest};

    use super::*;

    fn current(bucket: &str, prefix: &str) -> DeploymentRequest {
        DeploymentRequest {
            dest_bucket_name: bucket.to_string(),
            dest_bucket_prefix: prefix.to_string(),
            extract: true,
            delete_current_objects_on_delete: true,
            ..DeploymentRequest::for_test()
        }
    }

    fn previous(bucket: &str, prefix: &str) -> PreviousDestination {
        PreviousDestination {
            bucket_name: bucket.to_string(),
            bucket_prefix: prefix.to_string(),
            distribution_id: None,
            distribution_paths: vec!["/*".to_string()],
            owner_id: "owner".to_string(),
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
                strategy: PreviousCleanupStrategy::DeleteNamespace {
                    excluded_prefix: Some("site/updated".to_string()),
                },
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
        assert_eq!(
            plan.strategy,
            PreviousCleanupStrategy::DeleteNamespace {
                excluded_prefix: Some("site".to_string()),
            }
        );
    }

    #[test]
    fn child_to_parent_cleanup_requires_authorization_and_preserves_current_manifest() {
        let mut request = current("bucket", "site");
        let previous = previous("bucket", "site/initial");
        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Retain(RetainReason::MissingAuthorization)
        );
        assert!(previous_namespace_is_within_current(&request, &previous));

        authorize(&mut request, &previous);
        assert_eq!(
            plan_destination_change_cleanup(&request, &previous),
            DestinationChangeCleanupDecision::Delete(DeletePreviousDestination {
                previous,
                strategy: PreviousCleanupStrategy::DeleteStaleWithinCurrent,
            })
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
        assert_eq!(
            plan.strategy,
            PreviousCleanupStrategy::DeleteNamespace {
                excluded_prefix: None,
            }
        );
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
        assert_eq!(
            plan.strategy,
            PreviousCleanupStrategy::DeleteNamespace {
                excluded_prefix: Some("site//".to_string()),
            }
        );
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
        assert_eq!(
            plan.strategy,
            PreviousCleanupStrategy::DeleteNamespace {
                excluded_prefix: None,
            }
        );
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

        previous.owner_id = "different-owner".to_string();
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
