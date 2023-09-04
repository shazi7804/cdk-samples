import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import { VpcProvider } from '../vpc';
import ec2 = require('aws-cdk-lib/aws-ec2');
import rds = require('aws-cdk-lib/aws-rds');

export class SimpleAuroraMySQLClusterStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StackProps ) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        // new AuroraMySQL(this, 'MyDatabase', vpc)

        const cluster = new rds.DatabaseCluster(this, 'Database', {
            engine: rds.DatabaseClusterEngine.auroraMysql({
                version: rds.AuroraMysqlEngineVersion.VER_3_03_1
            }),
            writer: rds.ClusterInstance.provisioned('writer', {
                publiclyAccessible: false,
            }),
            readers: [
                rds.ClusterInstance.provisioned('reader1', { promotionTier: 1 }),
                rds.ClusterInstance.serverlessV2('reader2'),
            ],
            vpcSubnets: {
                subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            },
            vpc,
        });
    }
}

// class AuroraMySQL extends Construct {
//     constructor(scope: Construct, id: string, vpc: any) {
//         super(scope, id);

//         const cluster = new rds.DatabaseCluster(this, 'Database', {
//             engine: rds.DatabaseClusterEngine.auroraMysql({
//                 version: rds.AuroraMysqlEngineVersion.VER_3_03_1
//             }),
//             writer: rds.ClusterInstance.provisioned('writer', {
//                 publiclyAccessible: false,
//             }),
//             readers: [
//                 rds.ClusterInstance.provisioned('reader1', { promotionTier: 1 }),
//                 rds.ClusterInstance.serverlessV2('reader2'),
//             ],
//             vpcSubnets: {
//                 subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
//             },
//             vpc,
//         });
//     }
// }
