import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import logs = require('@aws-cdk/aws-logs');
import { VpcProvider } from '../vpc';


export interface VpcClienVpnStackProps extends cdk.StackProps {
    readonly client_root_arn: string;
    readonly server_root_arn: string;
    readonly client_cidr: string;
}

export class VpcClienVpnStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: VpcClienVpnStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const logGroup = new logs.LogGroup(this, 'ClientVpnLogGroup', {
            retention: logs.RetentionDays.ONE_MONTH
        });

        const logStream = logGroup.addStream('ClientVpnLogStream');

        const vpnEndpoint = new ec2.CfnClientVpnEndpoint(this, 'VpnEndpoint', {
            authenticationOptions: [{
                type: 'certificate-authentication',
                mutualAuthentication: {
                    clientRootCertificateChainArn: props.client_root_arn,
                }
            }],
            clientCidrBlock: props.client_cidr,
            connectionLogOptions: {
                enabled: true,
                cloudwatchLogGroup: logGroup.logGroupName,
                cloudwatchLogStream: logStream.logStreamName
            },
            serverCertificateArn: props.server_root_arn,
            splitTunnel: true,
            dnsServers: ["8.8.8.8", "8.8.4.4"],
        })

        new ec2.CfnClientVpnTargetNetworkAssociation(this, 'ClientVpnNetworkAssociation1', {
            clientVpnEndpointId: vpnEndpoint.ref,
            subnetId: vpc.privateSubnets[0].subnetId
        })
        new ec2.CfnClientVpnTargetNetworkAssociation(this, 'ClientVpnNetworkAssociation2', {
            clientVpnEndpointId: vpnEndpoint.ref,
            subnetId: vpc.privateSubnets[1].subnetId
        })

        new ec2.CfnClientVpnAuthorizationRule(this, 'Authz', {
            clientVpnEndpointId: vpnEndpoint.ref,
            targetNetworkCidr: vpc.vpcCidrBlock,
            authorizeAllGroups: true,
        })

    }
}