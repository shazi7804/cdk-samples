# cdk-samples

AWS CDK sample list

## Samples

| Stack name  | Description   | Noted |
| ----------- | ------------- | ----- |
| **VpcSimpleCreate** | Amazon VPC simple network with public, private and isolated subnets. ||
| **VpcClienVpnStack** | AWS Client VPN create with Cloudwatch logs. | [readmore](https://reurl.cc/Yjxm0D) |
| **TransitGatewayStack** | Transit Gateway simple network ||
| **CloudTrailStack** | CloudTrail enable with data events ||
| **Ec2StressHttpAutoscalingGroupStack** | Stress HTTP service with autoscaling group. ||
| **Ec2WindowsWebJoinDomainAutoscalingGroupStack** | Windows Server IIS web with autoscaling group and join AD domain ||
| **EcsFargateCore** | Amazon ECS simple cluster with AWS Fargate. ||
| **EcsScalingBySqsStack**| Amazon ECS scaling based on SQS items. | [readmore](https://reurl.cc/YjxmDn)|
| **EksWithWorkerNodeStack** | Amazon EKS with managed node groups ||
| **EksWithFargateStack** | Amazon EKS with AWS Fargate. ||
| **EksIntegCodePipelineDeployStack** | Amazon EKS integrate AWS code series deployment pipeline ||
| **EksEmrContainerStack** | Amazon EMR on EKS with AWS Fargate | [readme](https://reurl.cc/RbNREG) |
| **MultiSourceWithApprovalPipelineStack** | CodePipeline trigger sources from Amazon S3 and Codecommit ||
| **CloudFrontOrginS3WithLambdaEdgeStack** | CloudFront serve static website with Lambda@Edge. ||
| **S3ObjectLambdaUppercaseStack** | Amazon S3 transforming data with object lambda ||
| **EnableAwsGuarddutyStackSetStack** | CloudFormation stackset enable AWS Guardduty. ||
| **ApiGatewayCognitoStack** | API Gateway authrizer with Cognito ||
| **ImportCloudFormationStack** | Import exist cloudformation stack ||
| **TerraformBackendStack** | Terraform state backend locking resources with Amazon S3 and DynamoDB ||

## How to deploy

First bootstrap your cdk environment

`cdk bootstrap`

Deploy `Stack name` to your account:

`cdk deploy ${stack_name}`

## Author & Contact

The best way to interact with me is through GitHub. You can open an issue for help anything about AWS CDK.

[shazi7804@](https://shazi.info/)

