import { CloudFormationClient, waitUntilStackDeleteComplete } from "@aws-sdk/client-cloudformation";
import { CloudFrontClient, GetDistributionCommand } from "@aws-sdk/client-cloudfront";
import {
  ChecksumMode,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

export type ObjectMetadata = {
  readonly contentLength?: number;
  readonly contentType?: string;
  readonly checksumSha256?: string;
  readonly checksumType?: string;
  readonly serverSideEncryption?: string;
};

export interface VerificationApi {
  getObject(bucket: string, key: string): Promise<Uint8Array>;
  headObject(bucket: string, key: string): Promise<ObjectMetadata>;
  listObjects(bucket: string, prefix?: string): Promise<readonly string[]>;
  fetchText(url: string): Promise<string>;
  sleep(milliseconds: number): Promise<void>;
  assertStackAbsent(stackName: string): Promise<void>;
  assertBucketAbsent(bucket: string): Promise<void>;
  assertDistributionAbsent(distributionId: string): Promise<void>;
}

export class AwsVerificationApi implements VerificationApi {
  private readonly s3 = new S3Client({});
  private readonly cloudFront = new CloudFrontClient({});
  private readonly cloudFormation = new CloudFormationClient({});

  public async getObject(bucket: string, key: string): Promise<Uint8Array> {
    const response = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) {
      throw new Error("Reading an expected destination object returned no body.");
    }
    return response.Body.transformToByteArray();
  }

  public async headObject(bucket: string, key: string): Promise<ObjectMetadata> {
    const response = await this.s3.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key, ChecksumMode: ChecksumMode.ENABLED }),
    );
    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
      checksumSha256: response.ChecksumSHA256,
      checksumType: response.ChecksumType,
      serverSideEncryption: response.ServerSideEncryption,
    };
  }

  public async listObjects(bucket: string, prefix?: string): Promise<readonly string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;
    do {
      const response = await this.s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          ...(prefix ? { Prefix: prefix } : {}),
          ...(continuationToken ? { ContinuationToken: continuationToken } : {}),
        }),
      );
      for (const object of response.Contents ?? []) {
        if (!object.Key) {
          throw new Error("Listing destination objects returned an object without a key.");
        }
        keys.push(object.Key);
      }
      if (response.IsTruncated && !response.NextContinuationToken) {
        throw new Error("Listing destination objects returned a truncated page without a token.");
      }
      continuationToken = response.NextContinuationToken;
    } while (continuationToken);
    return keys;
  }

  public async fetchText(url: string): Promise<string> {
    const response = await fetch(url, { redirect: "error" });
    if (!response.ok) {
      throw new Error("Reading the CloudFront verification object failed.");
    }
    return response.text();
  }

  public async sleep(milliseconds: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
  }

  public async assertStackAbsent(stackName: string): Promise<void> {
    await waitUntilStackDeleteComplete(
      { client: this.cloudFormation, maxWaitTime: 120, minDelay: 2, maxDelay: 5 },
      { StackName: stackName },
    );
  }

  public async assertBucketAbsent(bucket: string): Promise<void> {
    try {
      await this.s3.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch (error) {
      if (httpStatus(error) === 404) return;
      throw error;
    }
    throw new Error("A verification bucket still exists after stack cleanup.");
  }

  public async assertDistributionAbsent(distributionId: string): Promise<void> {
    try {
      await this.cloudFront.send(new GetDistributionCommand({ Id: distributionId }));
    } catch (error) {
      if (httpStatus(error) === 404) return;
      throw error;
    }
    throw new Error("A verification distribution still exists after stack cleanup.");
  }
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null || !("$metadata" in error)) return undefined;
  const metadata = error.$metadata;
  if (typeof metadata !== "object" || metadata === null || !("httpStatusCode" in metadata)) {
    return undefined;
  }
  return typeof metadata.httpStatusCode === "number" ? metadata.httpStatusCode : undefined;
}
