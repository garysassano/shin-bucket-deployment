import * as path from 'node:path';
import {
	App,
	CfnOutput,
	Fn,
	RemovalPolicy,
	Stack,
	type StackProps,
} from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { CargoBucketDeployment, Source } from '../src';

class SimpleCargoBucketDeploymentStack extends Stack {
	constructor(scope: App, id: string, props?: StackProps) {
		super(scope, id, props);

		const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
			autoDeleteObjects: true,
			removalPolicy: RemovalPolicy.DESTROY,
		});

		const deployment = new CargoBucketDeployment(this, 'DeployWebsite', {
			sources: [
				Source.asset(
					path.join(__dirname, '..', '..', 'test', 'fixtures', 'my-website'),
				),
			],
			destinationBucket: websiteBucket,
			destinationKeyPrefix: 'site',
		});

		new CfnOutput(this, 'BucketName', {
			value: websiteBucket.bucketName,
		});

		new CfnOutput(this, 'ObjectKeys', {
			value: Fn.join(',', deployment.objectKeys),
		});
	}
}

const app = new App();
const env =
	process.env.CDK_DEFAULT_ACCOUNT && process.env.CDK_DEFAULT_REGION
		? {
				account: process.env.CDK_DEFAULT_ACCOUNT,
				region: process.env.CDK_DEFAULT_REGION,
			}
		: undefined;

new SimpleCargoBucketDeploymentStack(app, 'CargoBucketDeploymentDemo', { env });
