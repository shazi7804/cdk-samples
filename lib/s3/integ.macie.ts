import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import events = require('aws-cdk-lib/aws-events');
import targets = require('aws-cdk-lib/aws-events-targets');
import s3 = require('aws-cdk-lib/aws-s3');
import lambda = require('aws-cdk-lib/aws-lambda');
import iam = require('aws-cdk-lib/aws-iam');
import macie = require('aws-cdk-lib/aws-macie');
import sfn = require('aws-cdk-lib/aws-stepfunctions');

export class SensitiveDataPurgeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps ) {
        super(scope, id, props);

        // const macieSession = new macie.CfnSession(this, 'macie-session',{
        //     findingPublishingFrequency: 'SIX_HOURS',
        //     status: 'ENABLED',
        // });

        const bucket = new s3.Bucket(this, 'macie-sample-bucket', {
            bucketName: 'aws-macie-sample-data-' + this.region + '-' + this.account
        });

        const stateMachine = new sfn.StateMachine(this, 'state-machine', {
            definition: new sfn.Wait(this, 'Hello', { time: sfn.WaitTime.duration(cdk.Duration.seconds(10)) }),
        });

        const rule = new events.Rule(this, 'Rule', {
            schedule: events.Schedule.rate(cdk.Duration.minutes(5))
        });

        rule.addTarget(new targets.SfnStateMachine(stateMachine));



    }
}