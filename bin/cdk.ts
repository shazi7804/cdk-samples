#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { VpcSimpleCreate } from '../lib/vpc';
import { DirectoryIdentityCore } from '../lib/directory_service';
import { DataLakeCore } from '../lib/datalake';
import { GithubEnterPriseServerIntegrationCodeFamily } from '../lib/github_ enterprise_codebuild_eks'

const app = new cdk.App();

const env = {
    region: app.node.tryGetContext('region') || process.env.CDK_INTEG_REGION || process.env.CDK_DEFAULT_REGION,
    account: app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT
};

new VpcSimpleCreate(app, 'vpcSample');
new DirectoryIdentityCore(app, 'DirectoryIdentityCore', { env })

new DataLakeCore(app, 'DataLakeCore', {
    env,
    datalake_lakeformation_admin_arn: app.node.tryGetContext('datalake_lakeformation_admin_arn'),
    datalake_starter_bucket_name: app.node.tryGetContext('datalake_starter_bucket_name')
})

new GithubEnterPriseServerIntegrationCodeFamily(app, 'GithubEnterPriseServerIntegrationCodeFamily', {
    env,
    myip_lists: app.node.tryGetContext('myip_lists'),
    keypair_name: app.node.tryGetContext('keypair_name'),
    githubes_acm_arn: app.node.tryGetContext('githubes_acm_arn'),
    githubes_domain: app.node.tryGetContext('githubes_domain'),
})

app.synth();