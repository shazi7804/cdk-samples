import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import r53tg = require('@aws-cdk/aws-route53-targets');

export interface WebSimpleStackProps extends cdk.StackProps {}

export class WebSimpleStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: WebSimpleStackProps) {
        super(scope, id, props);
    }



}