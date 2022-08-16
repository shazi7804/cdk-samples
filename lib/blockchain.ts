import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import ec2 = require('aws-cdk-lib/aws-ec2');
import logs = require('aws-cdk-lib/aws-logs');
import { VpcProvider } from './vpc';


export interface BlockchainCoreProps extends cdk.StackProps {
    readonly client_root_arn: string;
}

export class BlockchainCore extends cdk.Stack {
    constructor(scope: Construct, id: string, props: BlockchainCoreProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 


    }
}