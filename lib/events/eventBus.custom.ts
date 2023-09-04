import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import event = require('aws-cdk-lib/aws-events');
import target = require('aws-cdk-lib/aws-events-targets');
import lambda = require('aws-cdk-lib/aws-lambda');
import iam = require('aws-cdk-lib/aws-iam');

export class CustomEventBusStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps ) {
        super(scope, id, props);

        const bus = new event.EventBus(this, "custom-event-bus", {
            eventBusName: "custom-subscription-bus"
        });

        new event.CfnEventBusPolicy(this, 'policy', {
            statementId: 'custom-subscription',
            eventBusName: bus.eventBusName,
            statement: 
                {
                    "Effect": "Allow",
                    "Action": [
                        "events:PutEvents"
                    ],
                    "Principal": {
                        "AWS": this.account
                    },
                    "Resource": bus.eventBusArn,
                    "Condition": {
                        "StringEquals": {
                            "events:detail-type": "change-subscription",
                            "events:source": "github-action"
                        }
                    }
                }
        });

        const producerLambda = new lambda.Function(this, "producer",{
            code: new lambda.AssetCode("./samples/lambda/changeCalendarIntegrateEvent/producer"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_14_X,
            environment: {
                EVENT_BUS_ARN: bus.eventBusArn
            }
        });

        const consumerLambda = new lambda.Function(this, "consumer",{
            code: new lambda.AssetCode("./samples/lambda/changeCalendarIntegrateEvent/consumer"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_14_X,
        })

        const statement = new iam.PolicyStatement({
            actions: ["events:Put*"],
            resources: [bus.eventBusArn]
        })

        producerLambda.role?.attachInlinePolicy(
            new iam.Policy(this, "producer-policy", {
                statements: [statement]
            })
        )

        const rule = new event.Rule(this, "rule", {
            eventBus: bus,
            eventPattern: {
                source: ["github-action"]
                // detail:{
                //     action: ["subscribe"],
                //     type: ["Gold", "Silver", "Platinum"],
                // }
            }
        });

        rule.addTarget(new target.LambdaFunction(consumerLambda))

    }
}