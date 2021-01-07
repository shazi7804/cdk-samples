import cdk = require("@aws-cdk/core");
import sf = require("@aws-cdk/aws-stepfunctions");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import codepipeline_actions = require("@aws-cdk/aws-codepipeline-actions");
import s3 = require("@aws-cdk/aws-s3");
import codecommit = require("@aws-cdk/aws-codecommit");

export interface CodePipelineStepfunctionStackProps extends cdk.StackProps {

}

export class CodePipelineStepfunctionStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: CodePipelineStepfunctionStackProps) {
        super(scope, id, props);

        // define Step function
        const startState = new sf.Pass(this, 'StartState');

        const stateMachine = new sf.StateMachine(this, 'StateMachine', {
            definition: startState,
        });

        // define multi-source
        const bucket = new s3.Bucket(this, 'Bucket', {
            bucketName: 'cdk-sample-integ-pipeline-stepfunctions' + this.region + '-' + this.account,
            versioned: true
        });

        const codecommitRepository = new codecommit.Repository(this, "Codecommit", {
            repositoryName: "cdk-sameple-integ-pipeline-stepfunctions"
        });


        // trigger of `CodeCommitTrigger.POLL`
        const gitSourceOutput = new codepipeline.Artifact();
        const gitSourceAction = new codepipeline_actions.CodeCommitSourceAction({
            actionName: "SourceOfCodeCommit",
            branch: "master",
            trigger: codepipeline_actions.CodeCommitTrigger.POLL,
            repository: codecommitRepository,
            output: gitSourceOutput
        });

        // trigger of S3 data change
        const bucketSourceOutput = new codepipeline.Artifact();
        const bucketSourceAction = new codepipeline_actions.S3SourceAction({
            actionName: "SourceOfBucket",
            bucket: bucket,
            bucketKey: 'sample.csv',
            output: bucketSourceOutput
        });

        // trigger of Step function
        const stepfunctionAction = new codepipeline_actions.StepFunctionInvokeAction({
            actionName: "CheckOfStepfunction",
            stateMachine: stateMachine
        });

        const pipeline = new codepipeline.Pipeline(this, 'MyPipeline');

        pipeline.addStage({
            stageName: "Source",
            actions: [gitSourceAction, bucketSourceAction]
        });
        pipeline.addStage({
            stageName: "CheckApprovel",
            actions: [stepfunctionAction]
        });


    }
}