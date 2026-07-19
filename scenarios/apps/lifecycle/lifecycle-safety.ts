import { App, CfnOutput, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

export type LifecycleSafetyPhase =
  | "co-tenant-initial"
  | "co-tenant-updated"
  | "child-parent-retention-initial"
  | "child-parent-retention-updated"
  | "child-parent-cleanup-initial"
  | "child-parent-cleanup-updated";

const STACK_NAMES: Record<LifecycleSafetyPhase, string> = {
  "co-tenant-initial": "ShinBucketDeploymentCoTenantSafetyDemo",
  "co-tenant-updated": "ShinBucketDeploymentCoTenantSafetyDemo",
  "child-parent-retention-initial": "ShinBucketDeploymentChildParentRetentionDemo",
  "child-parent-retention-updated": "ShinBucketDeploymentChildParentRetentionDemo",
  "child-parent-cleanup-initial": "ShinBucketDeploymentChildParentCleanupDemo",
  "child-parent-cleanup-updated": "ShinBucketDeploymentChildParentCleanupDemo",
};

export function createLifecycleSafetyApp(phase: LifecycleSafetyPhase): void {
  const app = new App();
  const env =
    process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
      ? {
          account: process.env.CDK_DEFAULT_ACCOUNT,
          region: process.env.CDK_DEFAULT_REGION,
        }
      : undefined;

  new LifecycleSafetyStack(app, STACK_NAMES[phase], phase, { env });
}

class LifecycleSafetyStack extends Stack {
  constructor(scope: App, id: string, phase: LifecycleSafetyPhase, props?: StackProps) {
    super(scope, id, props);

    const destinationBucket = new Bucket(this, "DestinationBucket", {
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    switch (phase) {
      case "co-tenant-initial":
      case "co-tenant-updated":
        this.addCoTenantDeployments(destinationBucket, phase === "co-tenant-updated");
        break;
      case "child-parent-retention-initial":
      case "child-parent-retention-updated":
        this.addChildParentDeployment(
          destinationBucket,
          phase === "child-parent-retention-updated",
          false,
        );
        break;
      case "child-parent-cleanup-initial":
      case "child-parent-cleanup-updated":
        this.addChildParentDeployment(
          destinationBucket,
          phase === "child-parent-cleanup-updated",
          true,
        );
        break;
    }

    new CfnOutput(this, "BucketName", {
      value: destinationBucket.bucketName,
    });
  }

  private addCoTenantDeployments(destinationBucket: Bucket, updated: boolean): void {
    const tenantDeployment = new ShinBucketDeployment(this, "DeployTenant", {
      sources: [Source.data("protected.txt", "tenant=protected\n")],
      destination: {
        bucket: destinationBucket,
        keyPrefix: "tenant",
      },
    });
    const rootDeployment = new ShinBucketDeployment(this, "DeployRoot", {
      sources: [Source.data("root.txt", `phase=${updated ? "updated" : "initial"}\n`)],
      destination: {
        bucket: destinationBucket,
      },
    });
    rootDeployment.node.addDependency(tenantDeployment);

    new CfnOutput(this, "FetchTenantObjectCommand", {
      value: `aws s3 cp s3://${destinationBucket.bucketName}/tenant/protected.txt -`,
    });
    new CfnOutput(this, "FetchRootObjectCommand", {
      value: `aws s3 cp s3://${destinationBucket.bucketName}/root.txt -`,
    });
  }

  private addChildParentDeployment(
    destinationBucket: Bucket,
    updated: boolean,
    cleanupAuthorized: boolean,
  ): void {
    const destinationKeyPrefix = updated ? "site" : "site/initial";
    const sources = updated
      ? [
          Source.data("initial/current.txt", "state=current\nphase=updated\n"),
          Source.data("parent.txt", "state=parent\n"),
        ]
      : [
          Source.data("current.txt", "state=current\nphase=initial\n"),
          Source.data("obsolete.txt", "state=obsolete\n"),
        ];

    new ShinBucketDeployment(this, "DeployWebsite", {
      sources,
      destination: {
        bucket: destinationBucket,
        keyPrefix: destinationKeyPrefix,
      },
      ...(updated && cleanupAuthorized
        ? {
            destinationLifecycle: {
              onDeploy: { deleteStaleObjects: false },
              onChange: { deletePreviousObjects: true },
            },
          }
        : {}),
    });

    new CfnOutput(this, "FetchCurrentObjectCommand", {
      value: `aws s3 cp s3://${destinationBucket.bucketName}/site/initial/current.txt -`,
    });
    new CfnOutput(this, "InspectObsoleteObjectCommand", {
      value: `aws s3api head-object --bucket ${destinationBucket.bucketName} --key site/initial/obsolete.txt`,
    });
  }
}
