import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { RequiredResourcesStack } from '../lib/assume-role-credential-resources';


const organizations = {
    DeployAccount: { account: '026625820024,', region: 'us-east-1' },
    TargetAccount: { account: '381354187112,', region: 'us-east-1' }
};

const app = new cdk.App();

new RequiredResourcesStack(app, 'assume-role-credential-resources', {
    env: organizations.TargetAccount,
    trustedAccount: organizations.DeployAccount.account
});