import cdk = require('@aws-cdk/core');
import s3 = require('@aws-cdk/aws-s3');
import lf = require('@aws-cdk/aws-lakeformation');
import glue = require('@aws-cdk/aws-glue');
import iam = require('@aws-cdk/aws-iam');
import ec2 = require('@aws-cdk/aws-ec2');

export interface DataLakeCoreProps extends cdk.StackProps {
    readonly datalake_lakeformation_admin_arn: string;
    readonly datalake_starter_bucket_name: string;
}

export class DataLakeCore extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: DataLakeCoreProps) {
        super(scope, id, props);

        // Vpc get
        const vpc = ec2.Vpc.fromLookup(this, 'Vpc', {
            tags: { 'aws:cloudformation:stack-name': 'DirectoryIdentityCore' }
        });

        // Vpc enable S3 endpoint
        const vpcEndpointBucket = new ec2.GatewayVpcEndpoint(this, 'EndpointBucket', {
            service: ec2.GatewayVpcEndpointAwsService.S3,
            vpc,
            subnets: [{
                subnetType: ec2.SubnetType.PRIVATE
            }]
        });

        // Data lake `starter` bucket
        const dataLakeBucket = new s3.Bucket(this, 'DataLakeStarter', {
            bucketName: props.datalake_starter_bucket_name
        });

        //////////// Lake formation //////////////
        // The IAM Role for Lake Formation
        const lakeformationRole = new iam.Role(this, 'LakeformationRole', {
            assumedBy: new iam.CompositePrincipal(
                new iam.ServicePrincipal('lakeformation.amazonaws.com'),
                new iam.ServicePrincipal('glue.amazonaws.com'),
                /////// Unsupport multiple assumeActions, ref: https://github.com/aws/aws-cdk/issues/2041
                // new iam.FederatedPrincipal(
                //     'arn:aws:iam::026625820024:saml-provider/AWSSSO_1650d8304557a31b_DO_NOT_DELETE',
                //     {},
                //     'sts:AssumeRoleWithSAML'
                // )
            ),
            inlinePolicies: {
              LakeFormationPermissionPolicy: new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                      "lakeformation:GetDataAccess",
                      "lakeformation:GetMetadataAccess",
                      "glue:GetUnfiltered*",
                      "glue:GetTable",
                      "glue:GetTables",
                      "glue:GetDatabase",
                      "glue:GetDatabases",
                      "glue:CreateDatabase",
                      "glue:GetUserDefinedFunction",
                      "glue:GetUserDefinedFunctions"
                    ],
                    resources: [
                      "*"
                    ]
                  })
                ]
              })
            }
        });

        // Lakeformation admin permission
        new lf.CfnDataLakeSettings(this, 'starterAdminPermission', {
            admins: [{
              dataLakePrincipalIdentifier: props.datalake_lakeformation_admin_arn        
            }]
        });

        //////////// EMR //////////////

        const emrRole = new iam.Role(this, 'EmrRole', {
            assumedBy: new iam.ServicePrincipal('elasticmapreduce.amazonaws.com'),
            managedPolicies: [
              iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonElasticMapReduceRole')
            ],
            inlinePolicies: {
              LakeFormationPermissionPolicy: new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:PassRole'],
                    resources: [lakeformationRole.roleArn]
                  }),
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['sts:AssumeRole'],
                    resources: [lakeformationRole.roleArn]
                  }),
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['lakeformation:GetTemporaryUserCredentialsWithSAML'],
                    resources: ['*']
                  }),
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: ['iam:GetRole'],
                    resources: ['arn:aws:iam::*:role/*']
                  })
                ]
              })
            }
        });

        //////////// Glue ////////////
        const glueDB = new glue.Database(this, 'RawEventsDatabase', {
            databaseName: 'raw_events'
        });
        const glueRole = new iam.Role(this, 'GlueRole', {
            assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
            managedPolicies: [
              iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole')
            ],
            inlinePolicies: {
              LakeFormationPermissionPolicy: new iam.PolicyDocument({
                statements: [
                  new iam.PolicyStatement({
                    effect: iam.Effect.ALLOW,
                    actions: [
                      "lakeformation:GetDataAccess",
                      "lakeformation:GrantPermissions"
                    ],
                    resources: [
                      "*"
                    ]
                  })
                ]
              })
            }
        });
        const passGlueRolePolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              'iam:PassRole'
            ],
            resources: [
                glueRole.roleArn
            ]
        });
        const datalakeStarterBucketPolicy = new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: [
              's3:*'
            ],
            resources: [
                dataLakeBucket.arnForObjects('*')
            ]
        });
        const datalakeGetCloudTrailBucketPolicy = new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            's3:*'
          ],
          resources: [
            'arn:aws:s3:::cloudtrail-awslogs-gatedgardenaudit-026625820024/*'
          ]
      });


        glueRole.addToPolicy(passGlueRolePolicy);
        glueRole.addToPolicy(datalakeStarterBucketPolicy);
    }
}