#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ImportResources, ImportCloudFormationStack } from '../lib/import';
import { VpcSimpleCreate } from '../lib/vpc';
import { DirectoryIdentityCore } from '../lib/directory_service';
import { CodePipelineDeployEcrImageStack } from '../lib/codepipeline';
import { DataLakeCore } from '../lib/datalake';
import { EksCore, EksSpotCore } from '../lib/eks';
import { EcsFargateCore } from '../lib/ecs-fargate';
import { VpcClienVpnStack } from '../lib/client-vpn';
import { GithubEnterPriseServerIntegrationCodeFamily } from '../lib/github_ enterprise_codebuild_eks'

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

new VpcSimpleCreate(app, 'vpcSample');
new DirectoryIdentityCore(app, 'DirectoryIdentityCore', { env })

// new DataLakeCore(app, 'DataLakeCore', {
//     env,
//     datalake_lakeformation_admin_arn: app.node.tryGetContext('datalake_lakeformation_admin_arn'),
//     datalake_starter_bucket_name: app.node.tryGetContext('datalake_starter_bucket_name')
// })

new GithubEnterPriseServerIntegrationCodeFamily(app, 'GithubEnterPriseServerIntegrationCodeFamily', {
    env,
    myip: app.node.tryGetContext('myip'),
    keypair_name: app.node.tryGetContext('keypair_name'),
})


new VpcClienVpnStack(app, 'VpcClienVpnStack', {
    env,
    client_cidr: app.node.tryGetContext('vpc_vpn_client_cidr'),
    client_root_arn: app.node.tryGetContext('vpc_vpn_client_root_arn'),
    server_root_arn: app.node.tryGetContext('vpc_vpn_server_root_arn'),
})


// CodePipeline
new CodePipelineDeployEcrImageStack(app, 'CodePipelineDeployEcrImageStack', { env });

new EcsFargateCore(app, 'EcsFargateCore', {
    env,
    cluster_name: app.node.tryGetContext('ecs_cluster_name'),
})

// EKS
new EksCore(app, 'EksCore', {
    env,
    cluster_version: app.node.tryGetContext('eks_cluster_version'),
})

new EksSpotCore(app, 'EksSpotCore-20201129', {
    env,
    cluster_version: app.node.tryGetContext('eks_cluster_version'),
    cluster_spot_price: app.node.tryGetContext('eks_cluster_spot_price'),
    cluster_spot_instance_type: app.node.tryGetContext('eks_cluster_spot_instance_type'),
    cluster_spot_instance_min_capacity: app.node.tryGetContext('cluster_spot_instance_min_capacity'),
})

// Import Examples
new ImportResources(app, 'ImportExistResource', { env });
new ImportCloudFormationStack(app, 'ImportExistCloudFormationStack', { env });

app.synth();