import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import * as guardduty from 'aws-cdk-lib/aws-guardduty';

export class GuarddutyStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const detector = new guardduty.CfnDetector(this, 'detector', {
            enable: true,
            dataSources: {
                kubernetes: {
                    auditLogs: { enable: true },
                },
                s3Logs: { enable: true },
            },
            findingPublishingFrequency: 'SIX_HOURS',
        });

    }
}