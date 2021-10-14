import cdk = require('@aws-cdk/core');
import eks = require('@aws-cdk/aws-eks');
import ec2 = require('@aws-cdk/aws-ec2');
import emrc = require('@aws-cdk/aws-emrcontainers');
import iam = require('@aws-cdk/aws-iam');
import yaml = require('js-yaml');
import { readFileSync } from 'fs';
import { VpcProvider } from './vpc';
import { Stack } from '@aws-cdk/core';
import { readYamlFromDir } from './utils';

export interface EmrEksContainerCoreProps extends cdk.StackProps {

}

export class EmrEksContainerCore extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: EmrEksContainerCoreProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this);

        const mastersRole = new iam.Role(this, 'AdminRole', {
            assumedBy: new iam.AccountRootPrincipal()
        });

        const cluster = new eks.FargateCluster(this, 'EksCluster', {
            clusterName: 'emr-containers',
            vpc,
            vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_NAT }],
            mastersRole,
            version: eks.KubernetesVersion.V1_21,
            endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE
        });

        const podExecutionRole = iam.Role.fromRoleArn(this, 'pod-execution-role', "arn:aws:iam::" + this.account + ":role/AWSFargatePodExecutionRole")

        const fargateProfile = cluster.addFargateProfile('fargate-profile', {
            selectors: [
                { namespace: "kube-system" },
                { namespace: "emr-containers"}
            ],
            subnetSelection: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            vpc,
            podExecutionRole
        });

        const emrContainersYaml = yaml.load(readFileSync("./kubernetes/manifests/emr-containers.yaml", "utf8").toString());

        // const emrContainersManifests = new eks.KubernetesManifest(this, "emr-containers-manifests",{
        //     cluster,
        //     manifest: [emrContainersYaml],
        // });

        // const virtualCluster = new emrc.CfnVirtualCluster(this, 'EmrContainerCluster', {
        //     name: 'emr-containers',
        //     containerProvider: {
        //         id: "emr-containers",
        //         type: "EKS",
        //         info: {
        //             eksInfo: { namespace: "emr-containers" }
        //         }
        //     }
        // });

        // virtualCluster.node.addDependency(cluster);

    }
}
