#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { ImportResources, ImportCloudFormationStack } from '../lib/import';
import { EnableAwsGuarddutyStackSetStack } from '../lib/cloudformation'
import { VpcSimpleCreate } from '../lib/vpc';
import { CloudTrailStack } from '../lib/cloudtrail';
import { TransitGatewayStack } from '../lib/transit-gateway';
import { ApiGatewayCognitoStack } from '../lib/api-gateway';
import { DirectoryMicrosoftAdCore } from '../lib/directory_service';
import { CodePipelineDeployEcrImageStack,
         CodePipelineStepfunctionStack,
         MultiPipelineOfApprovalStack } from '../lib/codepipeline';
import { CloudFrontOrginS3Core } from '../lib/cloudfront';
import { DataLakeCore } from '../lib/datalake';
import { EmrEksContainerStack } from '../lib/emr_eks_container';
import { TransferFamilyServerCore } from '../lib/transfer_family';
import { S3ObjectLambdaUppercaseCore } from '../lib/s3_object_lambda';
import { EksCore } from '../lib/eks';
import { EcsFargateCore } from '../lib/ecs-fargate';
import { VpcClienVpnStack } from '../lib/client_vpn';
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

new GithubEnterPriseServerIntegrationCodeFamily(app, 'GithubEnterPriseServerIntegrationCodeFamily', { env,
    myip: app.node.tryGetContext('myip'),
    keypair_name: app.node.tryGetContext('keypair_name'),
})

// CodePipeline
new CodePipelineDeployEcrImageStack(app, 'CodePipelineDeployEcrImageStack', { env });
new CodePipelineStepfunctionStack(app, 'CodePipelineStepfunctionStack', { env });
new MultiPipelineOfApprovalStack(app, 'MultiPipelineOfApprovalStack', { env });


// Containers
new EksCore(app, 'EksCore', {
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

new EcsFargateCore(app, 'EcsFargateCore', { env,
    cluster_name: app.node.tryGetContext('ecs_cluster_name'),
});

new EmrEksContainerStack(app, 'EmrEksContainerStack', {
    env,
    addon_vpc_cni_version: app.node.tryGetContext('eks_addon_vpc_cni_version'),
    addon_kube_proxy_version: app.node.tryGetContext('eks_addon_kube_proxy_version'),
    addon_core_dns_version: app.node.tryGetContext('eks_addon_core_dns_version'),
    namespace: app.node.tryGetContext('emr_containers_namespace'),
    virtual_cluster_name: app.node.tryGetContext('emr_virtual_cluster_name'),
});

// CloudFront
new CloudFrontOrginS3Core(app, 'CloudFrontOrginS3Core', { env })

// Blockchain
// new BlockchainCore(app, 'BlockchainCore', { env })

// Terraform Backend
new TerraformBackendStack(app, 'TerraformBackendStack', { env })

// Import Examples
new ImportResources(app, 'ImportExistResource', { env });
new ImportCloudFormationStack(app, 'ImportExistCloudFormationStack', { env });

app.synth();