import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import s3 = require('@aws-cdk/aws-s3');
import autoscaling = require('@aws-cdk/aws-autoscaling');
import iam = require('@aws-cdk/aws-iam');
import codebuild = require("@aws-cdk/aws-codebuild");
import eks = require("@aws-cdk/aws-eks");
import ecr = require("@aws-cdk/aws-ecr");
import codepipeline = require("@aws-cdk/aws-codepipeline");
import { VpcProvider } from './vpc';

const DEFAULT_CLUSTER_VERSION = '1.17'
const DEFAULT_CLUSTER_NAME = 'default-cluster-name'

export interface GithubEnterPriseServerIntegrationCodeFamilyProps extends cdk.StackProps {
    readonly myip: string;
    readonly keypair_name?: string;
}

export class GithubEnterPriseServerIntegrationCodeFamily extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: GithubEnterPriseServerIntegrationCodeFamilyProps) {
        super(scope, id, props);

        const clusterVersion = this.node.tryGetContext('cluster_version') ?? DEFAULT_CLUSTER_VERSION

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        // Launch an Github EnterPrise Server
        // GitHub's AWS owner ID (025577942450 for GovCloud, and 895557238572 for other regions)

        const ami = new ec2.LookupMachineImage({
            name:'GitHub Enterprise Server*',
            owners:['895557238572']
        });

        // The IAM Role for Github instances
        const gitRole = new iam.Role(this, 'GithubEntServersRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM')
            ]
        });

        const gitInstanceAsg = new autoscaling.AutoScalingGroup(this, 'GithubEntServersAsg', {
            autoScalingGroupName: 'GithubEntServers',
            vpc,
            // 14GB of memory required.
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.M4, ec2.InstanceSize.XLARGE2),
            machineImage: ami,
            minCapacity: 1,
            maxCapacity: 1,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
            keyName: props.keypair_name,
            blockDevices: [
                {
                    deviceName: '/dev/xvdb',
                    mappingEnabled: true,
                    // require second block device with at least 10GB storage to this instance
                    volume: autoscaling.BlockDeviceVolume.ebs(10, {
                        deleteOnTermination: true,
                        encrypted: true,
                    })
                }
            ],
            role: gitRole
        });

        const gitSg = new ec2.SecurityGroup(this, "GithubEntServersSg", {
            vpc,
            securityGroupName: "GithubEntServers"
        });

        gitInstanceAsg.addSecurityGroup(gitSg);

        // For User Access Port, e.g. git command
        [22, 80, 443, 25, 122, 8080, 8443, 9418].forEach(v => {
            gitSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(v), "Github Enterprise Server use tcp/port of intranet.");
        });
        [161, 1194].forEach(v => {
            gitSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(v), "Github Enterprise Server use udp/port of intranet.");
        });

        // For Manager Port
        gitSg.addIngressRule(ec2.Peer.ipv4(props.myip), ec2.Port.tcp(22), "Github Enterprise Server use tcp/port of myself.");




        /**
         * CodeBuild: 
         * 1. create codebuild project
         * 2. create policy of ECR and Codecommit
        **/ 
        // const webhooks: codebuild.FilterGroup[] = [
        //     codebuild.FilterGroup.inEventOf(
        //         codebuild.EventAction.PUSH,
        //         codebuild.EventAction.PULL_REQUEST_MERGED
        //     ).andBranchIs('master'),
        // ];

        // const codebuildProject = new codebuild.Project(this, "GithubBuild", {
        //     source: codebuild.Source.gitHubEnterprise({
        //         httpsCloneUrl: 'https://ec2-54-161-116-237.compute-1.amazonaws.com/scottlwk/github-codebuild-integrate',
        //         branchOrRef: 'master',
        //         // If your Github Enterprise non-self SSL connection when need enable `ignoreSslErrors`
        //         ignoreSslErrors: true
        //     }),
        //     environment: {
        //         buildImage: codebuild.LinuxBuildImage.AMAZON_LINUX_2_3,
        //         privileged: true,
        //         environmentVariables: {
        //             AWS_ACCOUNT_ID: {
        //               type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        //               value: cdk.Aws.ACCOUNT_ID
        //             },
        //             AWS_DEFAULT_REGION: {
        //               type: codebuild.BuildEnvironmentVariableType.PLAINTEXT,
        //               value: cdk.Aws.REGION
        //             }
        //         }
        //     }
        // });

        // codebuild policy of ecr build
        // const codeBuildPolicyEcr = new iam.PolicyStatement();
        // codeBuildPolicyEcr.addAllResources()
        // codeBuildPolicyEcr.addActions(
        //     "ecr:GetAuthorizationToken",
        //     "ecr:InitiateLayerUpload",
        //     "ecr:UploadLayerPart",
        //     "ecr:CompleteLayerUpload",
        //     "ecr:BatchCheckLayerAvailability",
        //     "ecr:PutImage",
        //     "eks:DescribeCluster"
        // )
        // codebuildProject.addToRolePolicy(codeBuildPolicyEcr);

        /** 
        * ECR: create repository
        * EKS: create cluster and iam role
        **/
        // const ecrRepository = new ecr.Repository(this, "EcrImageRepo", {
        //     repositoryName: 'github-ent-source'
        // });

        // const mastersRole = new iam.Role(this, 'EksClusterRole', {
        //     assumedBy: new iam.AccountRootPrincipal()
        // });

        // const eksCluster = new eks.Cluster(this, 'EksCluster', {
        //     vpc,
        //     mastersRole,
        //     version: eks.KubernetesVersion.of(clusterVersion),
        //     defaultCapacity: 2,
        //     outputClusterName: true
        // });

        
    }
}