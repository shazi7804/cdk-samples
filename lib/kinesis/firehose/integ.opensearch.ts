import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam'
import * as firehose from 'aws-cdk-lib/aws-kinesisfirehose'
import * as destinations from '@aws-cdk/aws-kinesisfirehose-destinations-alpha'
import * as opensearch from 'aws-cdk-lib/aws-opensearchservice'
import ec2 = require('aws-cdk-lib/aws-ec2');
import { VpcProvider } from '../../vpc';

export interface KinesisFirehoseDestinationOpenSearchStackProps extends cdk.StackProps {

}

export class KinesisFirehoseDestinationOpenSearchStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: KinesisFirehoseDestinationOpenSearchStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const securityGroup = new ec2.SecurityGroup(this, 'opensearch-security-group', {
            vpc,
            securityGroupName: 'OpenSearch',
            description: 'Allow access to opensearch domain',
            allowAllOutbound: true
        });
        securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.allTcp(), 'allow tcp');

        const domain = new opensearch.Domain(this, 'domain', {
            vpc,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
            securityGroups: [securityGroup],
            version: opensearch.EngineVersion.OPENSEARCH_1_0,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            ebs: { enabled: false },
            capacity: {
                masterNodes: 3,
                masterNodeInstanceType: 'r6gd.large.search',
                dataNodes: 4,
                dataNodeInstanceType: 'r6gd.large.search'
            },
            zoneAwareness: {
                enabled: true,
            },
        });

        // const ds = new firehose.DeliveryStream(this, 'firehose-ds-opensearch', {
        //     deliveryStreamName: 'CentralizedToOpenSearch',
        //     destinations: [
                
        //     ],
        // });
    }
}