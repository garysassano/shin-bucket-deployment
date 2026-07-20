import { CfnOutput, RemovalPolicy, type Stack } from "aws-cdk-lib";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { ShinBucketDeployment, Source } from "../../../src";

type MoveShape = "child-parent" | "parent-child" | "sibling" | "cross-bucket";

const MOVE_SHAPES: readonly MoveShape[] = [
  "child-parent",
  "parent-child",
  "sibling",
  "cross-bucket",
];

export function addDestinationMoveMatrix(stack: Stack, updated: boolean): void {
  const sharedBucket = bucket(stack, "MoveMatrixSharedBucket");
  const previousBucket = bucket(stack, "MoveMatrixPreviousBucket");
  const currentBucket = bucket(stack, "MoveMatrixCurrentBucket");

  for (const shape of MOVE_SHAPES) {
    for (const cleanup of [false, true]) {
      const mode = cleanup ? "cleanup" : "retain";
      const base = `matrix/${shape}/${mode}`;
      const oldPrefix = previousPrefix(shape, base);
      const newPrefix = currentPrefix(shape, base);
      const oldBucket = shape === "cross-bucket" ? previousBucket : sharedBucket;
      const newBucket = shape === "cross-bucket" ? currentBucket : sharedBucket;

      new ShinBucketDeployment(stack, deploymentId(shape, cleanup), {
        sources: updated
          ? [Source.data("current.txt", currentBody(shape, cleanup))]
          : [
              Source.data("current.txt", initialCurrentBody(shape, cleanup)),
              Source.data("obsolete.txt", previousBody(shape, cleanup)),
            ],
        destination: {
          bucket: updated ? newBucket : oldBucket,
          keyPrefix: updated ? newPrefix : oldPrefix,
        },
        destinationLifecycle: {
          onDeploy: { deleteStaleObjects: false },
          ...(updated
            ? {
                onChange: {
                  deletePreviousObjects: cleanup,
                  ...(cleanup && shape === "cross-bucket" ? { previousBucket } : {}),
                },
              }
            : {}),
          onDelete: { deleteCurrentObjects: true },
        },
        providerLambda: { memorySize: 1536 },
      });
    }
  }

  new CfnOutput(stack, "MoveMatrixSharedBucketName", { value: sharedBucket.bucketName });
  new CfnOutput(stack, "MoveMatrixPreviousBucketName", { value: previousBucket.bucketName });
  new CfnOutput(stack, "MoveMatrixCurrentBucketName", { value: currentBucket.bucketName });
}

function bucket(stack: Stack, id: string): Bucket {
  return new Bucket(stack, id, {
    autoDeleteObjects: true,
    removalPolicy: RemovalPolicy.DESTROY,
  });
}

export function previousPrefix(shape: MoveShape, base: string): string {
  switch (shape) {
    case "child-parent":
      return `${base}/child`;
    case "parent-child":
      return base;
    case "sibling":
      return `${base}/left`;
    case "cross-bucket":
      return `${base}/previous`;
  }
}

export function currentPrefix(shape: MoveShape, base: string): string {
  switch (shape) {
    case "child-parent":
      return base;
    case "parent-child":
      return `${base}/child`;
    case "sibling":
      return `${base}/right`;
    case "cross-bucket":
      return `${base}/current`;
  }
}

function deploymentId(shape: MoveShape, cleanup: boolean): string {
  const name = shape
    .split("-")
    .map((part) => `${part[0]?.toUpperCase()}${part.slice(1)}`)
    .join("");
  return `Deploy${name}${cleanup ? "Cleanup" : "Retain"}`;
}

export function currentBody(shape: MoveShape, cleanup: boolean): string {
  return `move=${shape}\ncleanup=${cleanup ? "cleanup" : "retain"}\nphase=updated\n`;
}

export function initialCurrentBody(shape: MoveShape, cleanup: boolean): string {
  return `move=${shape}\ncleanup=${cleanup ? "cleanup" : "retain"}\nphase=initial\n`;
}

export function previousBody(shape: MoveShape, cleanup: boolean): string {
  return `move=${shape}\ncleanup=${cleanup ? "cleanup" : "retain"}\nstate=obsolete\n`;
}

export { MOVE_SHAPES, type MoveShape };
