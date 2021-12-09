import * as cdk from'@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as asg from '@aws-cdk/aws-autoscaling';
import * as iam from '@aws-cdk/aws-iam';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { VpcProvider } from '../vpc';

export interface Ec2StressHttpAutoscalingGroupStackProps extends cdk.StackProps {

}

export class Ec2StressHttpAutoscalingGroupStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: Ec2StressHttpAutoscalingGroupStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 
        
        const machineImage = new ec2.AmazonLinuxImage({
            generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
            edition: ec2.AmazonLinuxEdition.STANDARD,
            virtualization: ec2.AmazonLinuxVirt.HVM,
            storage: ec2.AmazonLinuxStorage.GENERAL_PURPOSE,
            cpuType: ec2.AmazonLinuxCpuType.ARM_64
        });

        // User data script, this script will be run on each ec2 instance upon launch
        const userData = ec2.UserData.forLinux();
        userData.addCommands(...[
            'sudo yum update -y',
            'sudo yum install -y httpd php',
            'sudo systemctl enable httpd',
            'sudo systemctl start httpd',
            'export host_name=$(curl http://169.254.169.254/latest/meta-data/local-hostname)',
            'export instance_id=$(curl http://169.254.169.254/latest/meta-data/instance-id)',
            'export identity_document=$(curl http://169.254.169.254/latest/dynamic/instance-identity/document)',
            'export az=$(echo $identity_document | jq -r .availabilityZone)',
            'echo "<html><head><link rel=\\"stylesheet\\" href=\\"https://cdn.jsdelivr.net/gh/kognise/water.css@latest/dist/dark.min.css\\"></head><body><h3>Hello from $host_name ($instance_id) in AZ $az.</h3><p>Instance Details:</p><p><code style=\\"line-height: 1.8\\">$identity_document</code></body></html></p>" > /var/www/html/index.html',
            'echo \'<?php for($i = 0; $i < 1000000000; $i++) {$a += $i;}\' > /var/www/html/stress.php'
        ]);
        userData.render();

        const role = new iam.Role(this, 'role', {
            assumedBy: new iam.ServicePrincipal('ec2'),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
        })

        //////////////////
        // Autoscaling
        const web = new asg.AutoScalingGroup(this, 'asg', {
            autoScalingGroupName: 'HttpStress',
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
            machineImage,
            userData,
            minCapacity: 2,
            maxCapacity: 10,
            vpcSubnets: vpc.selectSubnets({
                subnets: vpc.privateSubnets
            }),
            role
        });
        web.scaleOnCpuUtilization('scale-on-cpu-metric', {
            targetUtilizationPercent: 80,
        });

        const warmPool = new asg.CfnWarmPool(this, 'warm-pool', {
            autoScalingGroupName: web.autoScalingGroupName,
            maxGroupPreparedCapacity: 10,
            minSize: 1,
            poolState: 'Stopped',
        });

        //////////////////
        // Load balancer
        const lb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
            loadBalancerName: 'HttpStress',
            vpc,
            internetFacing: true,
            vpcSubnets: vpc.selectSubnets({
                subnets: vpc.publicSubnets,
            }),
        });

        const listener = lb.addListener('listener', {
            port: 80,
        });

        listener.addTargets('targets', {
            port: 80,
            targets: [web],
        });
        listener.connections.allowDefaultPortFromAnyIpv4('Open to the world');

    }
}
