import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import s3 = require('aws-cdk-lib/aws-s3');
import cfn_inc = require('aws-cdk-lib/cloudformation-include');

export class ImportResources extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        const existBucket = new s3.Bucket(this, 'ExistBucket', {
            bucketName: 'exist-bucket-id'
        })
    }
}

export class ImportCloudFormationStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        const cfnTemplate = new cfn_inc.CfnInclude(this, 'ExistCFN', { 
            templateFile: 'samples/cloudformation/bucket.yaml',
        });

        const cfnBucket = cfnTemplate.getResource('ExistBucket') as s3.CfnBucket;

        new cdk.CfnOutput(this, 'ExistCfnBucketArn', { value: cfnBucket.attrArn })
    }
}