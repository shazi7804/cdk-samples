import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import emrc = require('@aws-cdk/aws-emrcontainers');
import iam = require('@aws-cdk/aws-iam');
import yaml = require('js-yaml');
import fs = require('fs');
import { VpcProvider } from './vpc';

export interface EmrEksContainerStackProps extends cdk.StackProps {
    readonly addon_vpc_cni_version: string;
    readonly addon_kube_proxy_version: string;
    readonly addon_core_dns_version: string;
    readonly virtual_cluster_name: string;
    readonly namespace: string;
}

export class EmrEksContainerStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EmrEksContainerStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this);

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });
        const podExecutionRole = iam.Role.fromRoleArn(this, 'pod-execution-role', "arn:aws:iam::" + this.account + ":role/AWSFargatePodExecutionRole")

        const cluster = new eks.Cluster(this, 'EksCluster', {
            clusterName: 'emr-spark-containers',
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
                { namespace: "default"},
                { namespace: props.namespace}
            ],
            subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            vpc,
            podExecutionRole
        });

        // Execution Role for containers

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

        // Patch EMR job exection containers to use IRSA via EKS Addons.
        const jobExecutionTrustPolicy = new cdk.CfnJson(this, 'job-execution-trust-policy', {
            value: {
              [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:aud`]: 'sts.amazonaws.com',
              [`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: 'system:serviceaccount:emr-containers:emr-on-eks-job-execution-role',
            },
        });
        const jobExecutionPrincipal = new iam.OpenIdConnectPrincipal(cluster.openIdConnectProvider).withConditions({
            StringEquals: jobExecutionTrustPolicy,
        });

        const jobExecutionPolicy = new iam.PolicyStatement();
        jobExecutionPolicy.addAllResources()
        jobExecutionPolicy.addActions(
            "logs:PutLogEvents",
            "logs:CreateLogStream",
            "logs:DescribeLogGroups",
            "logs:DescribeLogStreams",
            "s3:PutObject",
            "s3:GetObject",
            "s3:ListBucket"
        );

        const jobExecutionRole = new iam.Role(this, 'execution-role', {
            roleName: 'AmazonEMRContainersJobExecutionRole',
            assumedBy: jobExecutionPrincipal
        });

        jobExecutionRole.addToPolicy(jobExecutionPolicy);
        jobExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonElasticMapReduceRole'));

        // Patch EMR job driver and creator containers to use IRSA.
        const jobDriverTrustPolicy = new cdk.CfnJson(this, 'job-driver-trust-policy', {
            value: {[`${cluster.openIdConnectProvider.openIdConnectProviderIssuer}:sub`]: 'system:serviceaccount:emr-containers:emr-containers-sa-*-*-' + this.account + '-*'},
        });
        const jobDriverPrincipal = new iam.OpenIdConnectPrincipal(cluster.openIdConnectProvider).withConditions({
            StringLike: jobDriverTrustPolicy,
        });

        // Updated trust policy of job driver conntainer to use IRSA 
        jobExecutionRole.assumeRolePolicy?.addStatements(
            new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    principals: [jobDriverPrincipal],
                    actions: ['sts:AssumeRoleWithWebIdentity']
            }),
        )

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

        // Manifests
        const manifestEmrContainers = yaml.loadAll(fs.readFileSync('manifests/emrContainersDeploy.yaml', 'utf-8')) as Record<string, any>[];
        const manifestEmrContainersDeploy = new eks.KubernetesManifest(this, 'emr-containers-deploy', {
          cluster,
          manifest: manifestEmrContainers,
          prune: false
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

        // Amazon EMR service role
        const emrContainerServiceRole = iam.Role.fromRoleArn(this, 'ServiceRoleForAmazonEMRContainers',
            "arn:aws:iam::" + this.account + ":role/AWSServiceRoleForAmazonEMRContainers"
        );
        awsAuth.addRoleMapping(emrContainerServiceRole, {
            username: 'emr-containers',
            groups: []
        });

        // // Worker node role (Optional)
        // const workerNodeRole = iam.Role.fromRoleArn(this, 'AmazonEKSNodeGroupRole',
        //     "arn:aws:iam::" + this.account + ":role/AmazonEKSNodeGroupRole"
        // );
        // awsAuth.addRoleMapping(workerNodeRole, {
        //     username: 'system:node:{{EC2PrivateDNSName}}',
        //     groups: [
        //         'system:bootstrappers',
        //         'system:nodes'
        //     ]
        // });

        const virtualCluster = new emrc.CfnVirtualCluster(this, 'EmrContainerCluster', {
            name: props.virtual_cluster_name,
            containerProvider: {
                id: cluster.clusterName,
                type: "EKS",
                info: {
                    eksInfo: { namespace: props.namespace }
                }
            }
        });

        virtualCluster.node.addDependency(cluster);
        virtualCluster.node.addDependency(manifestEmrContainersDeploy);
        virtualCluster.node.addDependency(awsAuth);

    }
}
