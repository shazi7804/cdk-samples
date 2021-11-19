import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import { VpcProvider } from '../vpc';


// 
export interface TransitGatewayStackProps extends cdk.StackProps {
    // readonly cidr?: string;
}

export class TransitGatewayStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: TransitGatewayStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const tgw = new ec2.CfnTransitGateway(this,"TransitGateway", {
            amazonSideAsn: 65432,
            autoAcceptSharedAttachments: "enable",
            dnsSupport: "enable",
            vpnEcmpSupport: "enable",
        });

        var tgwAttachment = new ec2.CfnTransitGatewayAttachment(this, "TransitGatewayAttachment", { 
            subnetIds: vpc.selectSubnets().subnetIds,
            transitGatewayId: tgw.ref, 
            vpcId: vpc.vpcId
        });

        new cdk.CfnOutput(this, 'transitGatewayId', { value: tgw.ref })
        new cdk.CfnOutput(this, 'transitGatewayArn', {
            value: cdk.Stack.of(this).formatArn({
                service: 'ec2',
                resource: 'transit-gateway',
                resourceName: tgw.ref
            }) 
        })

    }
}
