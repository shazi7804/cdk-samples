import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import ec2 = require('aws-cdk-lib/aws-ec2');
import asg = require('aws-cdk-lib/aws-autoscaling');
import iam = require('aws-cdk-lib/aws-iam');
import { VpcProvider } from '../vpc';


export interface GithubEnterpriseServerStackProps extends cdk.StackProps {
    readonly myip: string;
    readonly keypair_name?: string;
}

export class GithubEnterpriseServerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: GithubEnterpriseServerStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        // Launch an Github EnterPrise Server
        // GitHub's AWS owner ID (025577942450 for GovCloud, and 895557238572 for other regions)
        const ami = new ec2.LookupMachineImage({
            name:'GitHub Enterprise Server*',
            owners:['895557238572']
        });

        // The IAM Role for Github instances
        const gitRole = new iam.Role(this, 'GithubEntServersRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonEC2RoleforSSM')
            ]
        });

        const gitInstanceAsg = new asg.AutoScalingGroup(this, 'GithubEntServersAsg', {
            autoScalingGroupName: 'GithubEntServers',
            vpc,
            // 14GB of memory required.
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.M4, ec2.InstanceSize.XLARGE2),
            machineImage: ami,
            minCapacity: 1,
            maxCapacity: 1,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_NAT },
            keyName: props.keypair_name,
            blockDevices: [
                {
                    deviceName: '/dev/xvdb',
                    // require second block device with at least 10GB storage to this instance
                    volume: asg.BlockDeviceVolume.ebs(10, {
                        deleteOnTermination: true,
                        encrypted: true,
                    })
                }
            ],
            role: gitRole
        });

        const gitSg = new ec2.SecurityGroup(this, "GithubEntServersSg", {
            vpc,
            securityGroupName: "GithubEntServers"
        });

        gitInstanceAsg.addSecurityGroup(gitSg);

        // For User Access Port, e.g. git command
        [22, 80, 443, 25, 122, 8080, 8443, 9418].forEach(v => {
            gitSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(v), "Github Enterprise Server use tcp/port of intranet.");
        });
        [161, 1194].forEach(v => {
            gitSg.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(v), "Github Enterprise Server use udp/port of intranet.");
        });

        // For Manager Port
        gitSg.addIngressRule(ec2.Peer.ipv4(props.myip), ec2.Port.tcp(22), "Github Enterprise Server use tcp/port of myself.");
        
    }
}