import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import ds = require('aws-cdk-lib/aws-directoryservice');
import ec2 = require('aws-cdk-lib/aws-ec2');

export class MicrosoftAdStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }); 

        const ad = new ds.CfnMicrosoftAD(this, 'microft-ad', {
            name: 'directory.aws',
            edition: 'Enterprise',
            password: '1qaz@WSX3edc$RFV',
            vpcSettings : {
                subnetIds : vpc.selectSubnets({
                    subnetType: ec2.SubnetType.PRIVATE_WITH_NAT,
                    onePerAz: true,
                }).subnetIds,
                vpcId : vpc.vpcId
            },
            // if you enable with SSO 
            createAlias: true,
            enableSso: true
        });
    }
}
