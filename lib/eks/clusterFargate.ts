import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from '../vpc';
import { Stack } from '@aws-cdk/core';

export interface EksWithFargateStackProps extends cdk.StackProps {
    readonly addon_vpc_cni_version: string;
    readonly addon_kube_proxy_version: string;
    readonly addon_core_dns_version: string;
}

export class EksWithFargateStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EksWithFargateStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });

        const podExecutionRole = iam.Role.fromRoleArn(this, 'pod-execution-role', "arn:aws:iam::" + this.account + ":role/AWSFargatePodExecutionRole")

        const cluster = new eks.Cluster(this, 'eks-fargate-cluster', {
            clusterName: 'eks-fargate',
            vpc,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }],
            mastersRole,
            defaultCapacity: 0,
            version: eks.KubernetesVersion.V1_21,
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
        });
        cluster.addFargateProfile('fargate-profile', {
            selectors: [
                { namespace: "kube-system"},
                { namespace: "default"}
            ],
            subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            vpc,
            podExecutionRole
        });


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

        const awsAuth = new eks.AwsAuth(this, 'aws-auth', {cluster})
        awsAuth.addRoleMapping(mastersRole, {
            username: 'masterRole',
            groups: ['system:masters']
        });
        awsAuth.addRoleMapping(podExecutionRole, {
            username: 'system:node:{{SessionName}}',
            groups: [
                'system:bootstrappers',
                'system:nodes',
                'system:node-proxier'
            ]
        });

    }
}
