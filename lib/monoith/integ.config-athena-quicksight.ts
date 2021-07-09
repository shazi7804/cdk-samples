import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import s3 = require('@aws-cdk/aws-s3');
import config = require('@aws-cdk/aws-config');
import lambda = require('@aws-cdk/aws-lambda');
import targets = require('@aws-cdk/aws-events-targets');
import sns = require('@aws-cdk/aws-sns');
import athena = require('@aws-cdk/aws-athena');

// Overview
//
// By default, AWS Config stores data in an Amazon Simple Storage Service (Amazon S3) bucket.
// You can centralize all AWS account and Region data in this one location and visualize it by
// using configuration snapshots and history data.  For reference and for setting up Config, 
// please see a previously published blog on AWS Config best practices.
//
// Amazon Athena is an interactive query service that makes it easy to analyze data in Amazon S3 
// using standard SQL. When configuration snapshots and configuration history data are aggregated 
// in Amazon S3, you can use Athena to query the JSON data directly using SQL statements. You can
// then visualize your Athena SQL views and queries in Amazon QuickSight, which lets you easily
// create and publish interactive BI dashboards by creating data sets.

const ruleListProps: {
    identifier: string
    inputParameters?: { [key: string]: any }
  }[] = [
    { identifier: "EC2_VOLUME_INUSE_CHECK" },
]

export interface ConfigWithQuicksightStackProps extends cdk.StackProps {

}

export class ConfigWithQuicksightStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props: ConfigWithQuicksightStackProps ) {
        super(scope, id, props);

        // const bucket = new s3.Bucket(this, "DataBucket", {
        //     bucketName: "cdk-sample-config-data-" + this.region + '-' + this.account,
        //     encryption: s3.BucketEncryption.S3_MANAGED,
        // });

        ruleListProps.forEach((rule) => {
            const configRule = new config.ManagedRule(this, `ManagedRule-${rule.identifier}`,
                rule,
            )
        });

        // // Notification
        // const topic = new sns.Topic(this, 'ConfigAlertsTopic', {
        //     topicName: 'AWSConfigAlerts'
        // });
    
        // configRule.onComplianceChange('ComplianceChange', {
        //     target: new targets.SnsTopic(topic)
        // });

        // Config Recorder

        // const role = new iam.Role(this, "ConfigRole", {
        //     assumedBy: new iam.ServicePrincipal("config.amazonaws.com"),
        //     managedPolicies: [
        //         iam.ManagedPolicy.fromAwsManagedPolicyName(
        //             "service-role/AWSConfigRole",
        //         ),
        //     ],
        //     inlinePolicies: {
        //         ExternalSecretsPolicy: new iam.PolicyDocument({
        //             statements: [
        //             new iam.PolicyStatement({
        //                 effect: iam.Effect.ALLOW,
        //                 actions: ["config:Put*"],
        //                 resources: ["*"],
        //             }),
        //             new iam.PolicyStatement({
        //                 effect: iam.Effect.ALLOW,
        //                 actions: ["s3:*"],
        //                 resources: [bucket.bucketArn],
        //             }),
        //             ],
        //         }),
        //     }
        // });

        // const configurationRecorder = new config.CfnConfigurationRecorder(this, "ConfigurationRecorder", {
        //     roleArn: role.roleArn,
        //     recordingGroup: {
        //         allSupported: true,
        //         includeGlobalResourceTypes: true,
        //         resourceTypes: [],
        //     },
        // });
        
        // new config.CfnDeliveryChannel(this, "DeliveryChannel", {
        //     configSnapshotDeliveryProperties: {
        //       deliveryFrequency: "Six_Hours",
        //     },
        //     s3BucketName: bucket.bucketName,
        //     snsTopicArn: topic.topicArn,
        // })


    }
}

/////////////////////////////////////
// Athena SQL commands
/////////////////////////////////////

// Create Table of S3
// 
// CREATE EXTERNAL TABLE aws_config_configuration_snapshot (
//     fileversion STRING,
//     configSnapshotId STRING,
//     configurationitems ARRAY < STRUCT <
//         configurationItemVersion : STRING,
//         configurationItemCaptureTime : STRING,
//         configurationStateId : BIGINT,
//         awsAccountId : STRING,
//         configurationItemStatus : STRING,
//         resourceType : STRING,
//         resourceId : STRING,
//         resourceName : STRING,
//         ARN : STRING,
//         awsRegion : STRING,
//         availabilityZone : STRING,
//         configurationStateMd5Hash : STRING,
//         configuration : STRING,
//         supplementaryConfiguration : MAP < STRING, STRING >,
//         tags: MAP < STRING, STRING >,
//         resourceCreationTime : STRING
//     > >
// ) PARTITIONED BY (dt STRING, region STRING) 
// ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
// LOCATION 's3://<S3_BUCKET_NAME>/AWSLogs/';
//
