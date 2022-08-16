import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';


export class LakeFormationCore extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // consnt bucket = new s3.Bucket(this, "lakeformation_")
    }
}