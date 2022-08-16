import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import s3 = require('aws-cdk-lib/aws-s3');
import iam = require('aws-cdk-lib/aws-iam');
import lambda = require("aws-cdk-lib/aws-lambda");
import s3object = require("aws-cdk-lib/aws-s3objectlambda");


export class S3ObjectLambdaUppercaseStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // S3 Bucket: object-lambda-${region}-${accountId}
        const bucket = new s3.Bucket(this, 'ObjectLambdaBucket', {
            bucketName: 'object-lambda-' + this.region + '-' + this.account,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true
        });

        // Role: AWSLambdaObjectTransformUppercase
        const role = new iam.Role(this, 'AWSLambdaObjectTransformUppercaseRole', {
            roleName: 'AWSLambdaObjectTransformUppercase',
            assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')
            ]
        })

        role.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: ['s3-object-lambda:WriteGetObjectResponse'],
                resources: ["arn:aws:s3-object-lambda:" + this.region + ":" + this.account + ":accesspoint/*"],
            })
        );

        // Lambda for Object transform uppercase
        const handler = new lambda.Function(this, "ObjectLambdaTransformUppercase", {
            code: new lambda.AssetCode("./samples/lambda/s3ObjectLambda/transformUppercase"),
            handler: "index.handler",
            runtime: lambda.Runtime.PYTHON_3_7,
            timeout: cdk.Duration.seconds(10),
            role
        });

        // S3 Access point
        const accesspoint = new s3.CfnAccessPoint(this, "AccessPoint", {
            bucket: bucket.bucketName,
            name: 'object-lambda-transform-uppercase-accesspoint',
        })

        // format supporting access point for object-lambda access point
        const supportingAccessPoint = this.formatArn({
            service: 's3',
            resource: `accesspoint/${accesspoint.name}`
        });

        // S3 Object lambda access point
        new s3object.CfnAccessPoint(this, 'ObjectLambdaAccessPoint', {
            name: 'object-lambda-transform-uppercase-accesspoint',
            objectLambdaConfiguration: {
              allowedFeatures: [],
              cloudWatchMetricsEnabled: false,
              supportingAccessPoint: supportingAccessPoint,
              transformationConfigurations: [{
                actions:["GetObject"],
                contentTransformation: {AwsLambda: {FunctionArn: handler.functionArn }}
              }]
            }
        });
          
    }
}
