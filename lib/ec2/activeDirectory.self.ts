import cdk = require('@aws-cdk/core');
import ec2 = require('@aws-cdk/aws-ec2');
import iam = require('@aws-cdk/aws-iam');
import { VpcProvider } from '../vpc';


export interface ActiveDirectorySelfManagedStackProps extends cdk.StackProps {

}

export class ActiveDirectorySelfManagedStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: ActiveDirectorySelfManagedStackProps) {
        super(scope, id, props);

        const vpc = ec2.Vpc.fromLookup(this, 'ExistingVPC', { vpcName: 'vpcSample/Vpc' }) || VpcProvider.createSimple(this); 


        const machineImage = new ec2.WindowsImage(ec2.WindowsVersion.WINDOWS_SERVER_2019_ENGLISH_FULL_BASE);

        // User data script, this script will be run on each ec2 instance upon launch
        const userData = ec2.UserData.forWindows();

        /////////////////////////////////////////////////////
        // Directory domain information store in System Manager document
        const directoryDocumentName = "awsconfig_Domain_d-90676dc3e7_shazi.info"

        userData.addCommands(
            `Set-DefaultAWSRegion -Region ${this.region}`,
            // Install AD
            'Add-WindowsFeature AD-Domain-Services -IncludeManagementTools',
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
            securityGroupName: "ActiveDirectorySelfManaged",
        });
        securityGroup.addIngressRule(ec2.Peer.ipv4('10.0.0.0/16'), ec2.Port.tcp(3389), "Allow RDP access from private network");

        const ad = new ec2.Instance(this, 'ad-instance', {
            vpc,
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.C5, ec2.InstanceSize.XLARGE),
            machineImage,
            securityGroup,
            userData,
            vpcSubnets: vpc.selectSubnets({
                subnets: vpc.privateSubnets
            }),
            role
        });


    }
}