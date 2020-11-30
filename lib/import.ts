import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import cfn_inc = require('@aws-cdk/cloudformation-include');

export class ImportResources extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        const existBucket = new s3.Bucket(this, 'ExistBucket')
    }
}

export class ImportCloudFormationStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        const cfnTemplate = new cfn_inc.CfnInclude(this, 'ExistCFN', { 
            templateFile: 'include/cloudformation.yaml',
        });

        const cfnBucket = cfnTemplate.getResource('ExistBucket') as s3.CfnBucket;

        new cdk.CfnOutput(this, 'ExistCfnBucketArn', { value: cfnBucket.attrArn })
    }
}