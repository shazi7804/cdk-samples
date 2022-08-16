import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import s3 = require('aws-cdk-lib/aws-s3');
import iam = require('aws-cdk-lib/aws-iam');
import tf = require('aws-cdk-lib/aws-transfer');

export class TransferFamilyServerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StageProps) {
        super(scope, id, props);

        // S3 Bucket: transfer-family-sftp-${region}-${accountId}
        const bucket = new s3.Bucket(this, 'BucketOfHome', {
            bucketName: 'transfer-family-sftp-' + this.region + '-' + this.account,
            encryption: s3.BucketEncryption.S3_MANAGED,
            versioned: true
        });

        // Role: AWSTransferFamilyServiceRole
        const role = new iam.Role(this, 'AWSTransferFamilyServiceRole', {
            roleName: 'AWSTransferLoggingAccess',
            assumedBy: new iam.ServicePrincipal('transfer.amazonaws.com'),
        })
        role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSTransferLoggingAccess'))

        // Role: AWSTransferUsersAccessRole
        const userRole = new iam.Role(this, 'AWSTransferUsersAccessRole', {
            roleName: 'AWSTransferUsersAccess',
            assumedBy: new iam.ServicePrincipal("transfer.amazonaws.com"),
        });

        userRole.addToPolicy(
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ['s3:ListBucket'],
              resources: [bucket.bucketArn],
            })
        );

        userRole.addToPolicy(
            new iam.PolicyStatement({
                effect: iam.Effect.ALLOW,
                actions: [
                    's3:GetObject',
                    's3:GetObjectAcl',
                    's3:GetObjectVersion',
                    's3:PutObject',
                    's3:PutObjectACL',
                    's3:DeleteObject',
                    's3:DeleteObjectVersion'
                ],
                resources: [`${bucket.bucketArn}/*`],
            })
        );

        // SFTP transfer server
        const server = new tf.CfnServer(this, 'TransferFamilyServer', {
            protocols: ['SFTP'],
            identityProviderType: 'SERVICE_MANAGED',
            loggingRole: role.roleArn,
            
        });
    }
}
