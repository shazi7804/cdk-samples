#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ImportResources, ImportCloudFormationStack } from '../lib/import';
import { EnableAwsGuarddutyStackSetStack } from '../lib/cloudformation'
import { CloudTrailStack } from '../lib/cloudtrail';
import { ApiGatewayCognitoStack } from '../lib/api-gateway';
import { DirectoryMicrosoftAdCore } from '../lib/directory_service';
import { CodePipelineStepfunctionStack,
         MultiPipelineOfApprovalStack } from '../lib/codepipeline';
import { CloudFrontOrginS3Core } from '../lib/cloudfront';
import { DataLakeCore } from '../lib/datalake';
import { TransferFamilyServerCore } from '../lib/transfer_family';
import { KinesisFirehoseDestinationOpenSearchStack } from '../lib/kinesis';
import { S3ObjectLambdaUppercaseCore } from '../lib/s3_object_lambda';
import { EksWithWorkerNodeStack,
         EksWithFargateStack,
         EksEmrContainerStack,
         EksIntegCodePipelineDeployStack } from '../lib/eks';
import { EcsFargateCore,
         EcsScalingBySqsStack } from '../lib/ecs';
import { VpcSimpleCreate,
         VpcClienVpnStack,
         TransitGatewayStack } from '../lib/vpc';
import { GithubEnterPriseServerIntegrationCodeFamily } from '../lib/github_ enterprise_codebuild_eks'
import { BlockchainCore } from '../lib/blockchain'
import { TerraformBackendStack } from '../lib/terraform';

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region'),
    account: app.node.tryGetContext('account')
};

new EnableAwsGuarddutyStackSetStack(app, 'EnableAwsGuarddutyStackSetStack', { env })

new CloudTrailStack(app, 'CloudTrailStack', { env })

// Network stack
new VpcSimpleCreate(app, 'vpcSample', { env });
new VpcClienVpnStack(app, 'VpcClienVpnStack', {
    env,
    client_cidr: app.node.tryGetContext('vpc_vpn_client_cidr'),
    client_root_arn: app.node.tryGetContext('vpc_vpn_client_root_arn'),
    server_root_arn: app.node.tryGetContext('vpc_vpn_server_root_arn'),
})
new TransitGatewayStack(app, 'TransitGatewayStack', { env });

// Applications
new ApiGatewayCognitoStack(app, 'ApiGatewayCognitoStack', { env });

new DirectoryMicrosoftAdCore(app, 'DirectoryMicrosoftAdCore', { env });

// S3, Transfer Family
new TransferFamilyServerCore(app, 'TransferFamilyServerCore', { env });

new S3ObjectLambdaUppercaseCore(app, 'S3ObjectLambdaUppercaseCore', { env });

// new DataLakeCore(app, 'DataLakeCore', {
//     env,
//     datalake_lakeformation_admin_arn: app.node.tryGetContext('datalake_lakeformation_admin_arn'),
//     datalake_starter_bucket_name: app.node.tryGetContext('datalake_starter_bucket_name')
// })

// Kinesis
new KinesisFirehoseDestinationOpenSearchStack(app, 'KinesisFirehoseDestinationOpenSearchStack', { env })

new GithubEnterPriseServerIntegrationCodeFamily(app, 'GithubEnterPriseServerIntegrationCodeFamily', { env,
    myip: app.node.tryGetContext('myip'),
    keypair_name: app.node.tryGetContext('keypair_name'),
})

// CodePipeline
new CodePipelineStepfunctionStack(app, 'CodePipelineStepfunctionStack', { env });
new MultiPipelineOfApprovalStack(app, 'MultiPipelineOfApprovalStack', { env });

// Containers
new EksWithWorkerNodeStack(app, 'EksWithWorkerNodeStack', {
    env,
    cluster_version: app.node.tryGetContext('eks_cluster_version'),
    cluster_instance_type: app.node.tryGetContext('eks_cluster_instance_type'),
    cluster_spot_instance_type: app.node.tryGetContext('eks_cluster_spot_instance_type'),
    cluster_spot_price: app.node.tryGetContext('eks_cluster_spot_price'),
    cluster_spot_instance_min_capacity: app.node.tryGetContext('eks_cluster_spot_instance_min_capacity'),
    addon_vpc_cni_version: app.node.tryGetContext('eks_addon_vpc_cni_version'),
    addon_kube_proxy_version: app.node.tryGetContext('eks_addon_kube_proxy_version'),
    addon_core_dns_version: app.node.tryGetContext('eks_addon_core_dns_version'),
});

new EksWithFargateStack(app, 'EksWithFargateStack', {
    env,
    addon_vpc_cni_version: app.node.tryGetContext('eks_addon_vpc_cni_version'),
    addon_kube_proxy_version: app.node.tryGetContext('eks_addon_kube_proxy_version'),
    addon_core_dns_version: app.node.tryGetContext('eks_addon_core_dns_version'),
});

new EksEmrContainerStack(app, 'EksEmrContainerStack', {
    env,
    addon_vpc_cni_version: app.node.tryGetContext('eks_addon_vpc_cni_version'),
    addon_kube_proxy_version: app.node.tryGetContext('eks_addon_kube_proxy_version'),
    addon_core_dns_version: app.node.tryGetContext('eks_addon_core_dns_version'),
    namespace: app.node.tryGetContext('emr_containers_namespace'),
    virtual_cluster_name: app.node.tryGetContext('emr_virtual_cluster_name'),
});

new EksIntegCodePipelineDeployStack(app, 'EksIntegCodePipelineDeployStack', { env });

// Amazon ECS
new EcsFargateCore(app, 'EcsFargateCore', { env,
    cluster_name: app.node.tryGetContext('ecs_cluster_name'),
});

new EcsScalingBySqsStack(app, 'EcsScalingBySqsStack', { env });


// AWS CloudFront
new CloudFrontOrginS3Core(app, 'CloudFrontOrginS3Core', { env })

// Blockchain
// new BlockchainCore(app, 'BlockchainCore', { env })

// Terraform Backend
new TerraformBackendStack(app, 'TerraformBackendStack', { env })

// Import Examples
new ImportResources(app, 'ImportExistResource', { env });
new ImportCloudFormationStack(app, 'ImportExistCloudFormationStack', { env });

app.synth();