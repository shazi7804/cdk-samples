import cdk = require("@aws-cdk/core");
import ddb = require("@aws-cdk/aws-dynamodb");
import s3 = require("@aws-cdk/aws-s3");

export interface TerraformBackendStackProps extends cdk.StackProps {
}

export class TerraformBackendStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: TerraformBackendStackProps) {
        super(scope, id, props);

        const stateRemote = new s3.Bucket(this, 'StateRemote', {
            bucketName: 'terraform-state-remote-' + this.region + '-' + this.account,
            versioned: true
        })

        const stateLock = new ddb.Table(this, 'StateLocking', {
            tableName: 'terraform-state-locking-' + this.region + '-' + this.account,
            partitionKey: { name: 'LockID', type: ddb.AttributeType.STRING },
            billingMode: ddb.BillingMode.PROVISIONED,
            writeCapacity: 1,
            readCapacity: 1,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        })

        new cdk.CfnOutput(this, 'stateRemoteBucketName', { value: stateRemote.bucketName })
        new cdk.CfnOutput(this, 'stateLockTableName', { value: stateLock.tableName })

    }
}
