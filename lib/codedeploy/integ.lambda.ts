import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import apigw = require('aws-cdk-lib/aws-apigateway');
import codecommit = require("aws-cdk-lib/aws-codecommit");
import codebuild = require("aws-cdk-lib/aws-codebuild");
import codepipeline = require("aws-cdk-lib/aws-codepipeline");
import codepipeline_actions = require("aws-cdk-lib/aws-codepipeline-actions");
import codedeploy = require('aws-cdk-lib/aws-codedeploy');
import iam = require('aws-cdk-lib/aws-iam');
import s3 = require('aws-cdk-lib/aws-s3');
import lambda = require('aws-cdk-lib/aws-lambda');


export class LambdaCanaryDeployStack extends cdk.Stack {
    constructor(scope: Construct, id: string) {
        super(scope, id);

        const artifact = new s3.Bucket(this, 'artifact', {
            bucketName: 'aws-lambda-canary-deployment-artifact-' + this.region + '-' + this.account
        });

        const handler = new lambda.Function(this, "handler", {
            functionName: 'LambdaCanaryDeploy',
            code: new lambda.AssetCode("./samples/lambda/helloWorld"),
            handler: "index.lambda_handler",
            runtime: lambda.Runtime.PYTHON_3_9,
            timeout: cdk.Duration.seconds(10)
        });

        const alias = new lambda.Alias(this, 'initial-alias', {
            aliasName: 'prod',
            version: handler.currentVersion,
        });

        const api = new apigw.RestApi(this, 'apigw-canary-lambda',{
            deployOptions: {
                tracingEnabled: true,
                loggingLevel: apigw.MethodLoggingLevel.INFO
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigw.Cors.ALL_ORIGINS,
                allowMethods: apigw.Cors.ALL_METHODS,
            },
        });

        const getWidgetsIntegration = new apigw.LambdaIntegration(handler, {
            requestTemplates: { "application/json": '{ "statusCode": "200" }' }
        });

        api.root.addMethod("GET", getWidgetsIntegration);

        // Deployment     
        const app = new codedeploy.LambdaApplication(this, 'app', {
            applicationName: 'lambda-canary-deployment'
        });

        const deploy = new codedeploy.LambdaDeploymentGroup(this, 'canary-deployment', {
            application: app,
            deploymentGroupName: 'prod',
            alias,
            deploymentConfig: codedeploy.LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
        });

        const codecommitRepository = new codecommit.Repository(this, "repo", {
            repositoryName: 'lambda-canary-deploy'
        });

        const codebuildProject = new codebuild.PipelineProject(this, "build", {
            projectName: 'lambda-canary-deploy',
            environment: {
                computeType: codebuild.ComputeType.SMALL,
                buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
                privileged: true,
                environmentVariables: {
                    AWS_ACCOUNT_ID: {
                        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                        value: cdk.Aws.ACCOUNT_ID
                    },
                    AWS_DEFAULT_REGION: {
                        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                        value: cdk.Aws.REGION
                    },
                    ARTIFACT_BUCKET_NAME: {
                        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                        value: artifact.bucketName
                    },
                    FUNCTION_NAME: {
                        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                        value: handler.functionName
                    },
                    APP_NAME: {
                        type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
                        value: app.applicationName
                    }
                }
            }
        });

        const codeBuildPolicyOfcodeCommit = new iam.PolicyStatement();
        codeBuildPolicyOfcodeCommit.addResources(codecommitRepository.repositoryArn)
        codeBuildPolicyOfcodeCommit.addActions(
            "codecommit:ListBranches",
            "codecommit:ListRepositories",
            "codecommit:BatchGetRepositories",
            "codecommit:GitPull"
        );
        codebuildProject.addToRolePolicy(codeBuildPolicyOfcodeCommit);

        const codeBuildPolicyOfBucket = new iam.PolicyStatement();
        codeBuildPolicyOfBucket.addResources(artifact.bucketArn)
        codeBuildPolicyOfBucket.addResources(`${artifact.bucketArn}/*`)
        codeBuildPolicyOfBucket.addActions("s3:*");
        codebuildProject.addToRolePolicy(codeBuildPolicyOfBucket);

        const codeBuildPolicyOfLambda = new iam.PolicyStatement();
        codeBuildPolicyOfLambda.addResources('*')
        codeBuildPolicyOfLambda.addActions("lambda:*");
        codebuildProject.addToRolePolicy(codeBuildPolicyOfLambda);

        const codeBuildPolicyOfCodeDeploy = new iam.PolicyStatement();
        codeBuildPolicyOfCodeDeploy.addResources('*')
        codeBuildPolicyOfCodeDeploy.addActions("codedeploy:*");
        codebuildProject.addToRolePolicy(codeBuildPolicyOfCodeDeploy);


        // == Artifact ==
        const sourceOutput = new codepipeline.Artifact();
        const buildOutput = new codepipeline.Artifact();

        // == CodePipeline Actions == 
        const sourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: "CodeCommit",
            branch: 'main',
            trigger: codepipeline_actions.CodeCommitTrigger.POLL,
            repository: codecommitRepository,
            output: sourceOutput
        });
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: "Build",
            input: sourceOutput,
            outputs: [
                buildOutput
            ],
            project: codebuildProject
        });

        const pipeline = new codepipeline.Pipeline(this, "pipeline", {
            pipelineName: "lambda-canary"
        });
        pipeline.addStage({
            stageName: "Source",
            actions: [sourceAction]
        });
        pipeline.addStage({
            stageName: "Build",
            actions: [buildAction]
        });
    

    }
}
