import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');

export class VpcProvider extends cdk.Stack {
    public static createSimple(scope: cdk.Construct) {
        const stack = cdk.Stack.of(scope)

        const vpc = stack.node.tryGetContext('use_default_vpc') === '1' ?
            ec2.Vpc.fromLookup(stack, 'Vpc', { isDefault: true }) :
            stack.node.tryGetContext('use_vpc_id') ?
                ec2.Vpc.fromLookup(stack, 'Vpc', { vpcId: stack.node.tryGetContext('use_vpc_id') }) :
                new ec2.Vpc(stack, 'Vpc', { maxAzs: 3, natGateways: 1 });

        // cdk.Tag.add(vpc.stack, 'cdk-stack', 'VpcProvider');

    return vpc
    }
}

// 
export class VpcSimpleCreate extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StageProps) {
        super(scope, id, props);
        const vpc = new ec2.Vpc(this, 'Vpc', {
            maxAzs: 3,
            natGateways: 1,
        });
    }
}