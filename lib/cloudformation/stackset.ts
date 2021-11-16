import cdk = require('@aws-cdk/core');
import cfn = require('@aws-cdk/aws-cloudformation');

export interface EnableAwsGuarddutyStackSetStackProps extends cdk.StackProps {

}

export class EnableAwsGuarddutyStackSetStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: EnableAwsGuarddutyStackSetStackProps) {
        super(scope, id, props);

        new cfn.CfnStackSet(this, 'EnableAWSGuardduty', {
            stackSetName : 'EnableAWSGuardduty',
            description: "Enable AWS Guardduty",
            permissionModel : 'SERVICE_MANAGED',
            autoDeployment: {
                enabled: true,
                retainStacksOnAccountRemoval: false,
            },
            stackInstancesGroup: [
                {
                    deploymentTargets: {
                        accounts: ['381354187112']
                    },
                    regions: ['us-east-1'],
                }
            ],
            operationPreferences: {
                failureToleranceCount: 0,
                maxConcurrentCount: 1
            },
            templateBody: `
              Resources:
                Detector:
                  Type: AWS::GuardDuty::Detector
                  Properties:
                    Enable: True
                    FindingPublishingFrequency: SIX_HOURS`
        });

    }
}