#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ImportResources, ImportCloudFormationStack } from '../lib/import';
import { EnableAwsGuarddutyStackSetStack } from '../lib/cloudformation'
import { CloudTrailStack } from '../lib/cloudtrail';
import { ApiGatewayCognitoStack } from '../lib/apiGateway';
import { MicrosoftAdStack } from '../lib/directoryService';
import { MultiSourceWithApprovalPipelineStack } from '../lib/codepipeline';
import { CloudFrontOrginS3WithLambdaEdgeStack } from '../lib/cloudfront';
import { DataLakeCore,
         TransferFamilyServerStack,
         S3ObjectLambdaUppercaseStack } from '../lib/s3';
import { KinesisFirehoseDestinationOpenSearchStack } from '../lib/kinesis';
import { Ec2StressHttpAutoscalingGroupStack,
         Ec2WindowsWebJoinDomainAutoscalingGroupStack,
         GithubEnterpriseServerStack } from '../lib/ec2';
import { EksWithWorkerNodeStack,
         EksWithFargateStack,
         EksEmrContainerStack,
         EksIntegCodePipelineDeployStack } from '../lib/eks';
import { EcsFargateCore,
         EcsScalingBySqsStack } from '../lib/ecs';
import { VpcSimpleCreate,
         VpcClienVpnStack,
         TransitGatewayStack } from '../lib/vpc';
import { BlockchainCore } from '../lib/blockchain'
import { TerraformBackendStack } from '../lib/terraform';

const app = new cdk.App();

const organization = { 
    region: 'us-east-1',
    account: '026625820024' // scottlwk-organization
}

const env = {
    region: 'us-east-1',
    account: '381354187112' // scottlwk-linked
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

new MicrosoftAdStack(app, 'MicrosoftAdStack', { env });

// AWS CloudFront
new CloudFrontOrginS3WithLambdaEdgeStack(app, 'CloudFrontOrginS3Core', { env })

// S3, Transfer Family
new TransferFamilyServerStack(app, 'TransferFamilyServerCore', { env });
new S3ObjectLambdaUppercaseStack(app, 'S3ObjectLambdaUppercaseStack', { env });

// new DataLakeCore(app, 'DataLakeCore', {
//     env,
//     datalake_lakeformation_admin_arn: app.node.tryGetContext('datalake_lakeformation_admin_arn'),
//     datalake_starter_bucket_name: app.node.tryGetContext('datalake_starter_bucket_name')
// })

// Kinesis
new KinesisFirehoseDestinationOpenSearchStack(app, 'KinesisFirehoseDestinationOpenSearchStack', { env })

new GithubEnterpriseServerStack(app, 'GithubEnterpriseServerStack', { env,
    myip: app.node.tryGetContext('myip'),
    keypair_name: app.node.tryGetContext('keypair_name'),
})

// CodePipeline
new MultiSourceWithApprovalPipelineStack(app, 'MultiSourceWithApprovalPipelineStack', { env });

// Instances
new Ec2StressHttpAutoscalingGroupStack(app, 'Ec2StressHttpAutoscalingGroupStack', { env })
new Ec2WindowsWebJoinDomainAutoscalingGroupStack(app, 'Ec2WindowsWebJoinDomainAutoscalingGroupStack', { env })

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

// Blockchain
// new BlockchainCore(app, 'BlockchainCore', { env })

// Terraform Backend
new TerraformBackendStack(app, 'TerraformBackendStack', { env })

// Import Examples
new ImportResources(app, 'ImportExistResource', { env });
new ImportCloudFormationStack(app, 'ImportExistCloudFormationStack', { env });

app.synth();