import * as cdk from "@aws-cdk/core";
import * as ec2 from "@aws-cdk/aws-ec2";
import * as ecs from "@aws-cdk/aws-ecs";
import * as sqs from "@aws-cdk/aws-sqs";
import * as iam from "@aws-cdk/aws-iam";
import * as asg from "@aws-cdk/aws-autoscaling";
import * as apigw from "@aws-cdk/aws-apigateway";
import { VpcProvider } from '../vpc';

export interface EcsScalingBySqsStackProps extends cdk.StackProps {

}

export class EcsScalingBySqsStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EcsScalingBySqsStackProps) {
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
                    }),
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
        const api = new apigw.RestApi(this, "api-gateway", {
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

        const logging = new ecs.AwsLogDriver({
            streamPrefix: "/aws/ecs/scalingBySqs",
        });

        const taskDefinition = new ecs.FargateTaskDefinition(this, "task-definition", {
              memoryLimitMiB: 4096,
              cpu: 2048,
              taskRole
        });

        const container = taskDefinition.addContainer('python-read-message-queue', {
            image: ecs.ContainerImage.fromRegistry("python-read-message-queue:latest"),
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
            maxCapacity: 10,
        });

        serviceScaling.scaleOnMetric("scaling-by-queue-metric", {
            metric: messageQueue.metricApproximateNumberOfMessagesVisible(),
            adjustmentType: asg.AdjustmentType.CHANGE_IN_CAPACITY,
            cooldown: cdk.Duration.seconds(300),
            scalingSteps: [
              { upper: 0, change: -1 },
              { lower: 1, change: +1 },
            ],
        });


    }
}