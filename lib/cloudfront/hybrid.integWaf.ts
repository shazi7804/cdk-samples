import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import cf = require('aws-cdk-lib/aws-cloudfront');
import iam = require('aws-cdk-lib/aws-iam');
import s3 = require('aws-cdk-lib/aws-s3');
import s3d = require('aws-cdk-lib/aws-s3-deployment');
import lambda = require('aws-cdk-lib/aws-lambda');
import * as path from 'path';


export class HybridCloudIntegWafStack extends cdk.Stack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const bucket = new s3.Bucket(this, "WebsiteBucket", {
            bucketName: "cdk-sample-cloudfront-lambda-edge-s3-" + this.region + '-' + this.account,
            // publicReadAccess: true,
            websiteIndexDocument: "index.html",
        });

        new s3d.BucketDeployment(this, 'SimpleIndex', {
            destinationBucket: bucket,
            // ../../samples/website/
            sources:[s3d.Source.asset(path.join(__dirname, '..', '..', 'samples', 'website'))],
        });

        const edgeLambdaExecutionRole = new iam.Role(this, 'EdgeLambdaExecutionRole', {
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('lambda.amazonaws.com'),
                new iam.ServicePrincipal('edgelambda.amazonaws.com')
            ),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName(
                    'service-role/AWSLambdaBasicExecutionRole'
                ),
            ]
        });

        /// URL Rewrite of CloudFront Origin request
        // const rewriteLambda = new lambda.Function(this, "UrlRewriteHandler", {
        //     code: new lambda.AssetCode("./samples/lambda/cloudfrontUrlRewrite"),
        //     handler: "index.handler",
        //     runtime: lambda.Runtime.NODEJS_12_X,
        //     role: edgeLambdaExecutionRole
        // });
        const rewriteLambda = new cf.experimental.EdgeFunction(this, "rewriteHandler", {
            code: new lambda.AssetCode("./samples/lambda/cloudfrontUrlRewrite"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_12_X,
            role: edgeLambdaExecutionRole
        });

        /// Modify header of CloudFront Origin response  
        const responseHeaderLambda = new cf.experimental.EdgeFunction(this, "ReponseHeaderHandler", {
            code: new lambda.AssetCode("./samples/lambda/cloudfrontUrlRewrite"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_12_X,
            role: edgeLambdaExecutionRole
        });

        const cloudfront = new cf.CloudFrontWebDistribution(this, 'MyAppCloudFront', {
            originConfigs: [
                {
                    s3OriginSource:{
                        s3BucketSource: bucket
                    },
                    behaviors: [{
                        isDefaultBehavior: true,
                        lambdaFunctionAssociations: [
                            {
                                eventType: cf.LambdaEdgeEventType.ORIGIN_REQUEST,
                                lambdaFunction: rewriteLambda
                            },
                            {
                                eventType: cf.LambdaEdgeEventType.ORIGIN_RESPONSE,
                                lambdaFunction: responseHeaderLambda
                            }
                        ]
                    }]
                }
            ],
        });


    }
}
