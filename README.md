# cdk-samples

AWS CDK sample list

## Samples

| Stack name  | Description   | Noted |
| ----------- | ------------- | ----- |
| [**VpcSimpleCreate**](./lib/vpc/vpc.ts) | Amazon VPC simple network with public, private and isolated subnets. ||
| [**VpcClienVpnStack**](./lib/vpc/integ.clientVpn.ts) | AWS Client VPN create with Cloudwatch logs. | [readmore](https://reurl.cc/Yjxm0D) |
| [**TransitGatewayStack**](./lib/vpc/integ.transitGateway.ts) | Transit Gateway simple network ||
| [**CloudTrailStack**](./lib/cloudtrail.ts) | CloudTrail enable with data events ||
| [**Ec2StressHttpAutoscalingGroupStack**](./lib/ec2/stressHttp.autoscaling.ts) | Stress HTTP service with autoscaling group. ||
| [**Ec2WindowsWebJoinDomainAutoscalingGroupStack**](./lib/ec2/windowsWeb.joinDomain.autoscaling.ts) | Windows Server IIS web with autoscaling group and join AD domain ||
| [**GithubEnterpriseServerStack**](./lib/ec2/github.enterprise.autoscaling.ts) | Github Enterprise with autoscaling group ||
| [**EcsFargateCore**](./lib/ecs/integ.fargate.ts) | Amazon ECS simple cluster with AWS Fargate. ||
| [**EcsScalingBySqsStack**](./lib/ecs/integ.sqs.ts) | Amazon ECS scaling based on SQS items. | [readmore](https://reurl.cc/YjxmDn)|
| [**EksWithWorkerNodeStack**](./lib/eks/clusterEC2.ts) | Amazon EKS with managed node groups ||
| [**EksWithFargateStack**](./lib/eks/clusterFargate.ts) | Amazon EKS with AWS Fargate. ||
| [**EksIntegCodePipelineDeployStack**](./lib/eks/integ.codepipeline.ts) | Amazon EKS integrate AWS code series deployment pipeline ||
| [**EksEmrContainerStack**](./lib/eks/integ.emr.ts) | Amazon EMR on EKS with AWS Fargate | [readmore](https://reurl.cc/RbNREG) |
| [**MultiSourceWithApprovalPipelineStack**](./lib/codepipeline/integ.multiSource.withApproval.ts) | CodePipeline trigger sources from Amazon S3 and Codecommit ||
| [**CloudFrontOrginS3WithLambdaEdgeStack**](./lib/cloudfront/integ.s3.ts) | CloudFront serve static website with Lambda@Edge. ||
| [**S3ObjectLambdaUppercaseStack**](./lib/s3/integ.objectLambda.ts) | Amazon S3 transforming data with object lambda ||
| [**EnableAwsGuarddutyStackSetStack**](./lib/cloudformation/stackset.ts) | CloudFormation stackset enable AWS Guardduty. ||
| [**ApiGatewayCognitoStack**](./lib/apiGateway/integ.cognito.ts) | API Gateway authrizer with Cognito ||
| [**ImportCloudFormationStack**](./lib/import.ts) | Import exist cloudformation stack ||
| [**TerraformBackendStack**](./lib/terraform.ts) | Terraform state backend locking resources with Amazon S3 and DynamoDB ||

## How to deploy

First bootstrap your cdk environment

```
$ cdk bootstrap
```

Deploy `Stack name` to your account:

```
$ cdk deploy ${stack_name}
```

## Author & Contact

The best way to interact with me is through GitHub. You can open an issue for help anything about AWS CDK.

[shazi7804@](https://shazi.info/)

