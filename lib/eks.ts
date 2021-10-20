import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from './vpc';
import { Stack } from '@aws-cdk/core';

export interface EksCoreProps extends cdk.StackProps {
    readonly cluster_version: string;
    readonly cluster_instance_type: string;
    readonly cluster_spot_instance_type: string;
    readonly cluster_spot_price: string;
    readonly cluster_spot_instance_min_capacity: number;
    readonly addon_vpc_cni_version: string;
    readonly addon_kube_proxy_version: string;
    readonly addon_core_dns_version: string;
}

export class EksCore extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EksCoreProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });
        
        const cluster = new eks.Cluster(this, 'Cluster', {
            vpc,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE }],
            defaultCapacity: 1,
            mastersRole,
            version: eks.KubernetesVersion.of(props.cluster_version),
            endpointAccess: eks.EndpointAccess.PRIVATE // No access outside of your VPC.
        });

        cluster.addAutoScalingGroupCapacity('SpotWorker', {
            vpcSubnets: { subnets: vpc.isolatedSubnets },
            instanceType: new ec2.InstanceType(props.cluster_spot_instance_type),
            maxInstanceLifetime: cdk.Duration.days(7),
            spotPrice: props.cluster_spot_price,
            minCapacity: props.cluster_spot_instance_min_capacity,
        })
        cluster.addAutoScalingGroupCapacity('DemandWorker', {
            instanceType: new ec2.InstanceType(props.cluster_instance_type),
            maxInstanceLifetime: cdk.Duration.days(7),
            minCapacity: props.cluster_spot_instance_min_capacity,
        })

        // Patch aws-node daemonset to use IRSA via EKS Addons, do before nodes are created
        // https://aws.github.io/aws-eks-best-practices/security/docs/iam/#update-the-aws-node-daemonset-to-use-irsa
        const awsNodeTrustPolicy = new cdk.CfnJson(this, 'aws-node-trust-policy', {
            value: {
              [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]: 'sts.amazonaws.com',
              [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: 'system:serviceaccount:kube-system:aws-node',
            },
        });
        const awsNodePrincipal = new iam.OpenIdConnectPrincipal(cluster.openIdConnectProvider).withConditions({
            StringEquals: awsNodeTrustPolicy,
        });
        const awsNodeRole = new iam.Role(this, 'aws-node-role', {
            assumedBy: awsNodePrincipal
        })

        awsNodeRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'))

        // Addons
        new eks.CfnAddon(this, 'vpc-cni', {
            addonName: 'vpc-cni',
            resolveConflicts: 'OVERWRITE',
            clusterName: cluster.clusterName,
            addonVersion: props.addon_vpc_cni_version,
            serviceAccountRoleArn: awsNodeRole.roleArn
        });
        new eks.CfnAddon(this, 'kube-proxy', {
            addonName: 'kube-proxy',
            resolveConflicts: 'OVERWRITE',
            clusterName: cluster.clusterName,
            addonVersion: props.addon_kube_proxy_version,
        });
        new eks.CfnAddon(this, 'core-dns', {
            addonName: 'coredns',
            resolveConflicts: 'OVERWRITE',
            clusterName: cluster.clusterName,
            addonVersion: props.addon_core_dns_version,
        });


        new cdk.CfnOutput(this, 'Region', { value: Stack.of(this).region })
        new cdk.CfnOutput(this, 'ClusterVersion', { value: props.cluster_version })

    }
}
