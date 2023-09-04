import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import ec2 = require('aws-cdk-lib/aws-ec2');

export class VpcProvider extends cdk.Stack {
    public static createSimple(scope: Construct) {
        const stack = cdk.Stack.of(scope)

        const vpc = stack.node.tryGetContext('use_default_vpc') === '1' ?
            ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true }) :
            stack.node.tryGetContext('use_vpc_id') ?
                ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: stack.node.tryGetContext('use_vpc_id') }) :
                new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 });

        // cdk.Tag.add(vpc.stack, 'cdk-stack', 'VpcProvider');

    return vpc
    }
}

// 
export interface VpcSimpleCreateProps extends cdk.StackProps {
    readonly cidr?: string;
}

export class VpcSimpleCreate extends cdk.Stack {
    constructor(scope: Construct, id: string, props: VpcSimpleCreateProps) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'Vpc', {
            ipAddresses: ec2.IpAddresses.cidr(props.cidr || "10.0.0.0/16"),
            maxAzs: 2,
            natGateways: 1,
            subnetConfiguration: [
                {
                    name: "PublicSubnet",
                    cidrMask: 20,
                    subnetType: ec2.SubnetType.PUBLIC
                },
                {
                    name: "PrivateSubnet",
                    cidrMask: 20,
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
                },
                {
                    name: "IsolatedSubnet",
                    cidrMask: 20,
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED
                }
            ]
        });

        // VPC Endpoints
        /// Gateways
        const s3Vpce = new ec2.GatewayVpcEndpoint(this, 'S3-Vpce', {
            vpc, service: ec2.GatewayVpcEndpointAwsService.S3
        })
        const ddbVpce = new ec2.GatewayVpcEndpoint(this, 'DynamoDB-Vpce', {
            vpc, service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
        })

        /// Interfaces
        // const ec2Vpce = new ec2.InterfaceVpcEndpoint(this, 'EC2-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.EC2,
        // })
        // const ecrVpce = new ec2.InterfaceVpcEndpoint(this, 'ECR-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.ECR,
        // })
        // const ecrDkr2Vpce = new ec2.InterfaceVpcEndpoint(this, 'ECR-Dkr-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER,
        // })
        // const ecsVpce = new ec2.InterfaceVpcEndpoint(this, 'ECS-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.ECS,
        // })
        // const ecsAgentVpce = new ec2.InterfaceVpcEndpoint(this, 'ECS-Agent-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.ECS_AGENT,
        // })
        // const ssmVpce = new ec2.InterfaceVpcEndpoint(this, 'SSM-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.SSM,
        // })
        // const ssmMsgVpce = new ec2.InterfaceVpcEndpoint(this, 'SSM-MESSAGES-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.SSM_MESSAGES,
        // })
        // const stsVpce = new ec2.InterfaceVpcEndpoint(this, 'STS-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.STS,
        // })
        // const cloudwatchVpce = new ec2.InterfaceVpcEndpoint(this, 'Cloudwatch-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH,
        // })
        // const cloudwatchLogsVpce = new ec2.InterfaceVpcEndpoint(this, 'Cloudwatch-Logs-Vpce', {
        //     vpc, service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
        // })
    }
}
