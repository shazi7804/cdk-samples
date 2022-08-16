import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as asg from "aws-cdk-lib/aws-autoscaling";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { VpcProvider } from '../vpc';

export interface EcsScalingBySqsStackProps extends cdk.StackProps {

}

export class EcsScalingBySqsStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EcsScalingBySqsStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const messageQueue = new sqs.Queue(this, 'queue', {
            visibilityTimeout: cdk.Duration.seconds(300)
        });

        // iam
        const taskRole = new iam.Role(this, 'ecs-task-role', {
            roleName: 'AmazonECSTaskRoleForSqsScaling',
            assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com')
        });

        taskRole.attachInlinePolicy(
            new iam.Policy(this, "sqs-full-access", {
                statements: [
                    new iam.PolicyStatement({
                        actions: ["sqs:*"],
                        effect: iam.Effect.ALLOW,
                        resources: [ messageQueue.queueArn ],
                    })
                ],
            })
        );

        taskRole.attachInlinePolicy(
            new iam.Policy(this, "send-cw-logs", {
                statements: [
                    new iam.PolicyStatement({
                        actions: [
                            "logs:CreateLogGroup",
                            "logs:CreateLogStream",
                            "logs:PutLogEvents",
                            "logs:DescribeLogStreams"
                        ],
                        effect: iam.Effect.ALLOW,
                        resources: [ "arn:aws:logs:*:*:*" ],
                    })
                ],
            })
        );

        const credentialsRole = new iam.Role(this, "Role", {
            assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
        });

        credentialsRole.attachInlinePolicy(
            new iam.Policy(this, "send-queue-message", {
                statements: [
                    new iam.PolicyStatement({
                        actions: ["sqs:SendMessage"],
                        effect: iam.Effect.ALLOW,
                        resources: [messageQueue.queueArn],
                    }),
                ],
            })
        );

        // API Gateway
        // https://${APIGW_ID}.execute-api.us-east-1.amazonaws.com/run/queue?message=test
        const api = new apigw.RestApi(this, "api-gateway", {
            restApiName: 'send-message-queue-with-ecs-scaling',
            deployOptions: {
                stageName: "run",
                tracingEnabled: true,
            },
        });

        const resourceQueue = api.root.addResource("queue");

        resourceQueue.addMethod(
            "GET",
            new apigw.AwsIntegration({
                service: "sqs",
                path: `${cdk.Aws.ACCOUNT_ID}/${messageQueue.queueName}`,
                integrationHttpMethod: "POST",
                options: {
                    credentialsRole,
                    passthroughBehavior: apigw.PassthroughBehavior.NEVER,
                    requestParameters: {
                        "integration.request.header.Content-Type": `'application/x-www-form-urlencoded'`,
                    },
                    requestTemplates: {
                        "application/json": `Action=SendMessage&MessageBody=$util.urlEncode("$method.request.querystring.message")`,
                    },
                    integrationResponses: [
                        {
                            statusCode: "200",
                            responseTemplates: {
                            "application/json": `{"done": true}`,
                            },
                        },
                    ],
                },
            }),
            { methodResponses: [{ statusCode: "200" }] }
        );

        // ecs
        const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

        const taskDefinition = new ecs.FargateTaskDefinition(this, "task-definition", {
                memoryLimitMiB: 4096,
                cpu: 2048,
                taskRole
        });

        const logging = new ecs.AwsLogDriver({
            streamPrefix: "task",
            logGroup: new logs.LogGroup(this, "LogGroup", {
                logGroupName: "/aws/ecs/scalingBySqs",
                retention: logs.RetentionDays.ONE_MONTH
            })
        });

        // Container image from https://github.com/shazi7804/container-samples/
        const repository = ecr.Repository.fromRepositoryName(this, 'repo', 'python-message-queue-consumer');

        const container = taskDefinition.addContainer('python-message-queue-consumer', {
            image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
            memoryLimitMiB: 256,
            cpu: 256,
            logging
        });

        const service = new ecs.FargateService(this, "task-service", {
            cluster,
            taskDefinition: taskDefinition,
            desiredCount: 0,
        });

        const serviceScaling = service.autoScaleTaskCount({
            minCapacity: 0,
            maxCapacity: 50,
        });

        serviceScaling.scaleOnMetric("scaling-initial-by-queue-metric", {
            metric: messageQueue.metricApproximateNumberOfMessagesVisible(),
            adjustmentType: asg.AdjustmentType.CHANGE_IN_CAPACITY,
            evaluationPeriods: 1,
            cooldown: cdk.Duration.seconds(60),
            scalingSteps: [
                { upper: 0, change: -1 },
                { lower: 1, change: +1 },
                { lower: 5, change: +3 },
                { lower: 10, change: +5 },
            ],
        });

        serviceScaling.scaleOnMetric("scaling-high-by-queue-metric", {
            metric: messageQueue.metricApproximateNumberOfMessagesVisible(),
            adjustmentType: asg.AdjustmentType.PERCENT_CHANGE_IN_CAPACITY,
            cooldown: cdk.Duration.seconds(60),
            scalingSteps: [
                { upper: 10, change: -10 },
                { lower: 15, change: +67 },
            ],
        });


    }
}