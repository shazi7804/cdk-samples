import cdk = require('@aws-cdk/core');
import cf = require('@aws-cdk/aws-cloudfront');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import s3d = require('@aws-cdk/aws-s3-deployment');
import lambda = require('@aws-cdk/aws-lambda');
import { Stack } from '@aws-cdk/core';
import * as path from 'path';
import * as hasha from 'hasha';

export interface CloudFrontOrginS3WithLambdaEdgeStackProps extends cdk.StackProps {

}

export class CloudFrontOrginS3WithLambdaEdgeStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: CloudFrontOrginS3WithLambdaEdgeStackProps) {
        super(scope, id, props);

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
        const urlRewriteLambda = new lambda.Function(this, "UrlRewriteHandler", {
            code: new lambda.AssetCode("./samples/lambda/cloudfrontUrlRewrite"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_12_X,
            role: edgeLambdaExecutionRole
        });
        
        const urlRewriteLambdaVersion = urlRewriteLambda.addVersion(
            `:sha256:${hasha.fromFileSync(
                './samples/lambda/cloudfrontUrlRewrite/index.js'
            )}`
        )

        /// Modify header of CloudFront Origin response  
        const responseHeaderLambda = new lambda.Function(this, "ReponseHeaderHandler", {
            code: new lambda.AssetCode("./samples/lambda/cloudfrontUrlRewrite"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_12_X,
            role: edgeLambdaExecutionRole
        });
        
        // const responseHeaderLambdaVersion = responseHeaderLambda.addVersion(
        //     `:sha256:${hasha.fromFileSync(
        //         './samples/lambda/cloudfrontModifyResponseHeader/index.js'
        //     )}`
        // )

        const responseHeaderLambdaVersion = new lambda.Version(this, "responseHeaderLambdaVersion", {
            lambda: responseHeaderLambda,
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
                                lambdaFunction: urlRewriteLambdaVersion
                            },
                            {
                                eventType: cf.LambdaEdgeEventType.ORIGIN_RESPONSE,
                                lambdaFunction: responseHeaderLambdaVersion
                            }
                        ]
                    }]
                }
            ],
        });



        // Outputs
        new cdk.CfnOutput(this, 'BucketName', { value:bucket.bucketName });
        new cdk.CfnOutput(this, 'CloudFrontWebsiteUrlExport', { value:cloudfront.distributionDomainName });
        new cdk.CfnOutput(this, 'LambdaFunctionName_UrlRewrite', { value: urlRewriteLambda.functionName });
        new cdk.CfnOutput(this, 'LambdaFunctionVersion_UrlRewrite', { value: urlRewriteLambdaVersion.version });
        new cdk.CfnOutput(this, 'LambdaFunctionName_ModifyReponseHeader', { value: responseHeaderLambda.functionName });
        // new cdk.CfnOutput(this, 'LambdaFunctionVersion_ModifyReponseHeader', { value: responseHeaderLambdaVersion.version });
    }
}
