import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import ecs = require('@aws-cdk/aws-ecs');
import elb = require('@aws-cdk/aws-elasticloadbalancingv2');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from './vpc';

export interface EcsFargateProps extends cdk.StackProps {
    readonly cluster_name: string;
    // readonly cluster_version: string;
}

export class EcsFargateCore extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EcsFargateProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        // ecs
        const cluster = new ecs.Cluster(this, 'EcsCluster', { vpc });

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