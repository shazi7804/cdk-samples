import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import lf = require('@aws-cdk/aws-lakeformation');
import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');

export interface DataLakeCoreProps extends cdk.StackProps {
    readonly datalake_lakeformation_admin_arn: string;
    readonly datalake_starter_bucket_name: string;
}

export class DataLakeCore extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: DataLakeCoreProps) {
        super(scope, id, props);

        const datalake = new s3.Bucket(this, 'datalake', {
            bucketName: 'datalake-' + this.region + '-' + this.account
        });

        // TBD ...
    }
}