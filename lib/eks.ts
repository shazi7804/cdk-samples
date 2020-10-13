import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from './vpc';
import { Stack } from '@aws-cdk/core';

export interface EksCoreProps extends cdk.StackProps {
    readonly cluster_version: string;
}

export class EksCore extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EksCoreProps) {
        super(scope, id, props);

        const vpc = VpcProvider.createSimple(this);

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });
        
        const eksCluster = new eks.Cluster(this, 'Cluster', {
            vpc,
            defaultCapacity: 2,
            mastersRole,
            version: eks.KubernetesVersion.of(props.cluster_version),
        });

        new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
        new cdk.CfnOutput(this, 'ClusterVersion', { value: props.cluster_version })

    }
}

//
// Spot instance of EKS
//

export interface EksSpotCoreProps extends cdk.StackProps {
    readonly cluster_version: string;
    readonly cluster_spot_price: string;
}

export class EksSpotCore extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EksSpotCoreProps) {
        super(scope, id, props);

        const vpc = VpcProvider.createSimple(this);

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });
        
        const eksCluster = new eks.Cluster(this, 'Cluster', {
            vpc,
            defaultCapacity: 0,
            mastersRole,
            version: eks.KubernetesVersion.of(props.cluster_version),
        });

        eksCluster.addCapacity('Spot', {
            instanceType: new ec2.InstanceType('m5.large'),
            maxInstanceLifetime: cdk.Duration.days(7),
            spotPrice: props.cluster_spot_price,
          })

        new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
        new cdk.CfnOutput(this, 'ClusterVersion', { value: props.cluster_version })
    }
}