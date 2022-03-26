import * as cdk from'@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as asg from '@aws-cdk/aws-autoscaling';
import * as iam from '@aws-cdk/aws-iam';
import * as elbv2 from '@aws-cdk/aws-elasticloadbalancingv2';
import { VpcProvider } from '../vpc';

export interface Ec2WindowsWebJoinDomainAutoscalingGroupStackProps extends cdk.StackProps {

}

export class Ec2WindowsWebJoinDomainAutoscalingGroupStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: Ec2WindowsWebJoinDomainAutoscalingGroupStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 

        const machineImage = new ec2.WindowsImage(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);

        // User data script, this script will be run on each ec2 instance upon launch
        const userData = ec2.UserData.forWindows();

        /////////////////////////////////////////////////////
        // Directory domain information store in System Manager document
        const directoryDocumentName = "awsconfig_Domain_d-90675613d8_directory.aws"

        userData.addCommands(
            `Set-DefaultAWSRegion -Region ${this.region}`,
            // Install IIS
            'Install-WindowsFeature -Name Web-Server,NET-Framework-45-ASPNET,NET-Framework-45-Core,NET-Framework-45-Features,NET-Framework-Core -IncludeManagementTools',
            // Download and install Chocolately and use it to obtain webdeploy
            `Set-ExecutionPolicy Bypass -Scope Process -Force; iex ((New-Object System.Net.WebClient).DownloadString('https://chocolatey.org/install.ps1'))`,
            `choco install webdeploy -y`,
            // Join domain
            `Set-Variable -name instance_id -value (Invoke-Restmethod -uri http://169.254.169.254/latest/meta-data/instance-id)`,
            `New-SSMAssociation -InstanceId $instance_id -Name "${directoryDocumentName}"`,
            `<persist>true</persist>`
        )

        userData.render();

        const role = new iam.Role(this, 'role', {
            assumedBy: new iam.ServicePrincipal('ec2'),
            managedPolicies: [
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'),
                iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMDirectoryServiceAccess')
            ],
            inlinePolicies: {
                AssociationJoinDomain: new iam.PolicyDocument({
                    statements: [
                        new iam.PolicyStatement({
                            effect: iam.Effect.ALLOW,
                            actions: [
                                "ssm:CreateAssociation",
                                "ec2:describeInstanceStatus"
                        ],
                            resources: ["*"]
                        })
                    ]
                })
            }
        })

        const securityGroup = new ec2.SecurityGroup(this, "security-group", {
            vpc,
            allowAllOutbound: true,
            securityGroupName: "WindowsRemote",
        });
        securityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(3389), "Allow RDP access from private network");

        //////////////////
        // Autoscaling
        const web = new asg.AutoScalingGroup(this, 'asg', {
            autoScalingGroupName: 'WindowsWeb',
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
            machineImage,
            securityGroup,
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

        //////////////////
        // Load balancer
        const lb = new elbv2.ApplicationLoadBalancer(this, 'alb', {
            loadBalancerName: 'WindowsWeb',
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
