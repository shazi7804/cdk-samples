import cdk = require("@aws-cdk/core");
import codecommit = require("@aws-cdk/aws-codecommit");
import codebuild = require("@aws-cdk/aws-codebuild");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
import iam = require("@aws-cdk/aws-iam");
import s3 = require('@aws-cdk/aws-s3');

export interface MultiPipelineOfApprovalStackProps extends cdk.StackProps {
}

export class MultiPipelineOfApprovalStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: MultiPipelineOfApprovalStackProps) {
        super(scope, id, props);

        // define multi-source
        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: 'cdk-sample-integ-multi-pipeline-' + this.region + '-' + this.account,
            versioned: true
        });

        const codecommitRepository = new codecommit.Repository(this, "Codecommit", {
            repositoryName: "cdk-sameple-integ-multi-pipeline"
        });


        /**
         * CodeBuild: 
        **/ 
        const codebuildProject = new codebuild.PipelineProject(this, "Build", {
            projectName: "cdk-sameple-integ-multi-pipeline-build",
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
                    }
                }
            }
        });

        // codebuild policy of codecommit and s3.
        const codeBuildPolicyOfcodeCommit = new iam.PolicyStatement();
        codeBuildPolicyOfcodeCommit.addResources(codecommitRepository.repositoryArn)
        codeBuildPolicyOfcodeCommit.addActions(
            "codecommit:ListBranches",
            "codecommit:ListRepositories",
            "codecommit:BatchGetRepositories",
            "codecommit:GitPull"
        );
        codebuildProject.addToRolePolicy(
            codeBuildPolicyOfcodeCommit,
        );

        const codeBuildPolicyOfBucket = new iam.PolicyStatement();
        codeBuildPolicyOfBucket.addResources(bucket.bucketArn)
        codeBuildPolicyOfBucket.addActions(
            "s3:*"
        );
        codebuildProject.addToRolePolicy(
            codeBuildPolicyOfBucket,
        );

        /**
         * CodePipeline actions:
        **/

        // action: trigger of `CodeCommitTrigger.POLL`
        const gitSourceOutput = new codepipeline.Artifact();
        const gitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: "SourceOfCodeCommit",
            branch: "master",
            trigger: codepipeline_actions.CodeCommitTrigger.POLL,
            repository: codecommitRepository,
            output: gitSourceOutput
        });

        // action: trigger of S3 data change
        const bucketSourceOutput = new codepipeline.Artifact();
        const bucketSourceAction = new codepipeline_actions.S3SourceAction({
            actionName: "SourceOfBucket",
            bucket: bucket,
            bucketKey: 'sample.csv',
            output: bucketSourceOutput
        });

        // when codecommit and s3 data input then action of codebuild
        const buildOutput = new codepipeline.Artifact();
        const buildAction = new codepipeline_actions.CodeBuildAction({
            actionName: "Build",
            input: gitSourceOutput,
            outputs: [buildOutput],
            project: codebuildProject
        });

        // Manual approval action
        const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
            actionName: 'Approval'
        });

        // pipeline of source, need approval
        const sourcePipeline = new codepipeline.Pipeline(this, "SourcePipelineOfApproval", {
            pipelineName: "cdk-sample-source-pipeline"
        });
        sourcePipeline.addStage({
            stageName: "Source",
            actions: [gitSourceAction]
        });
        sourcePipeline.addStage({
            stageName: "Approve",
            actions: [manualApprovalAction]
        });
        sourcePipeline.addStage({
            stageName: "Build",
            actions: [buildAction]
        });

        // pipeline of data
        const dataPipeline = new codepipeline.Pipeline(this, "DataPipelineOfApproval", {
            pipelineName: "cdk-sample-data-pipeline"
        });
        dataPipeline.addStage({
            stageName: "Data",
            actions: [bucketSourceAction]
        });
        // dataPipeline.addStage({
        //     stageName: "Build",
        //     actions: [buildAction]
        // });
        dataPipeline.addStage({
            stageName: "Approve",
            actions: [manualApprovalAction]
        });

        /**
         * Output: 
         * - CodeCommit clone path of HTTP and SSH
         * - ECR Repository URI
        **/
        new cdk.CfnOutput(this, 'MlopsTrainCodeCommitCloneUrlHttp', {
            description: 'MLOps: Train CodeCommit Repo CloneUrl HTTP',
            value: codecommitRepository.repositoryCloneUrlHttp
        });

        new cdk.CfnOutput(this, 'MlopsTrainCodeCommitCloneUrlSsh', {
            description: 'MLOps: Train CodeCommit Repo CloneUrl SSH',
            value: codecommitRepository.repositoryCloneUrlSsh
        });

  }
}
