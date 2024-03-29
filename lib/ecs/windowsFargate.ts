import cdk = require('aws-cdk-lib');
import { Construct } from 'constructs';
import ec2 = require('aws-cdk-lib/aws-ec2');
import ecs = require('aws-cdk-lib/aws-ecs');
import elb = require('aws-cdk-lib/aws-elasticloadbalancingv2');
import iam = require('aws-cdk-lib/aws-iam');
import { VpcProvider } from '../vpc';

export interface EcsFargateProps extends cdk.StackProps {
    readonly cluster_name: string;
    // readonly cluster_version: string;
}

export class EcsWindowsFargateCore extends cdk.Stack {
    constructor(scope: Construct, id: string, props: EcsFargateProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        // ecs
        const cluster = new ecs.Cluster(this, 'ecs-windows-fargate', {
            vpc,
            clusterName: 'ecs-windows-fargate'
        });

        const loadBalancer = new elb.ApplicationLoadBalancer(this, 'ApplicationLoadBalancer', {
            vpc,
            internetFacing: true,
            securityGroup: new ec2.SecurityGroup(this, 'AlbSecurityGroup', {
              vpc,
              allowAllOutbound: true
            })
        });

          // Redirect to HTTP
        // const listenerHttp = loadBalancer.addListener('http-listener', {
        //     port: 80,
        //     protocol: elb.ApplicationProtocol.HTTP,
        // })

    }
}