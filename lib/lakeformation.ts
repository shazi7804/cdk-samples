import cdk = require('@aws-cdk/core');
import lf = require('@aws-cdk/aws-lakeformation');
import s3 = require('@aws-cdk/aws-s3');
import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');


export class LakeFormationCore extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // consnt bucket = new s3.Bucket(this, "lakeformation_")
    }
}