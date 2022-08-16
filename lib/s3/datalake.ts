import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import s3 = require('aws-cdk-lib/aws-s3');
import lf = require('aws-cdk-lib/aws-lakeformation');
import glue = require('aws-cdk-lib/aws-glue');
import iam = require('aws-cdk-lib/aws-iam');
import ec2 = require('aws-cdk-lib/aws-ec2');

export interface DataLakeCoreProps extends cdk.StackProps {
    readonly datalake_lakeformation_admin_arn: string;
    readonly datalake_starter_bucket_name: string;
}

export class DataLakeCore extends cdk.Stack {
    constructor(scope: Construct, id: string, props: DataLakeCoreProps) {
        super(scope, id, props);

        const datalake = new s3.Bucket(this, 'datalake', {
            bucketName: 'datalake-' + this.region + '-' + this.account
        });

        // TBD ...
    }
}