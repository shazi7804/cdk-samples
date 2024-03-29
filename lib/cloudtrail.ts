import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import s3 = require('aws-cdk-lib/aws-s3');
import cloudtrail = require('aws-cdk-lib/aws-cloudtrail');
import logs = require('aws-cdk-lib/aws-logs');

export interface CloudTrailStackProps extends cdk.StackProps {

}

export class CloudTrailStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: CloudTrailStackProps) {
        super(scope, id, props);

        const bucket = new s3.Bucket(this, 'cloudtrail-bucket', {
            bucketName: 'cloudtrail-logs-' + this.region + '-' + this.account,
        })

        const targetBucket = s3.Bucket.fromBucketName(this, 'existing-bucket',
            'aws-emr-on-eks-' + this.region + '-' + this.account
        );

        const trail = new cloudtrail.Trail(this, 'cloudtrail', {
            trailName: 'CdkTrailStack',
            bucket,
            sendToCloudWatchLogs: true,
            cloudWatchLogsRetention: logs.RetentionDays.ONE_MONTH
        })


        trail.addS3EventSelector([{ bucket: targetBucket }], {
            readWriteType: cloudtrail.ReadWriteType.ALL,
        })

        // const log = new logs.LogGroup(this, "cloudtrail-s3-logs");

    }
}