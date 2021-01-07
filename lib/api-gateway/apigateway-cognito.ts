import cdk = require('@aws-cdk/core');
import cognito = require("@aws-cdk/aws-cognito");
import lambda = require("@aws-cdk/aws-lambda");
import apigw = require("@aws-cdk/aws-apigatewayv2");

export interface ApiGatewayCognitoStackProps extends cdk.StackProps {
    readonly amazonIdpClientId?: string;
    readonly amazonIdpClientSecret?: string;
}

export class ApiGatewayCognitoStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props: ApiGatewayCognitoStackProps) {
        super(scope, id, props);

        const userPool = new cognito.UserPool(this, "UserPool", {
            signInAliases: {
                username: true,
                email: true
            },
            passwordPolicy: { minLength: 12 },
            autoVerify: { email: true },
            userVerification: { emailStyle: cognito.VerificationEmailStyle.CODE },
        });

        const userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
            userPool,
            authFlows: { userSrp: true },
        });

        new cognito.UserPoolDomain(this, "UserPoolDomain", {
            userPool,
            cognitoDomain: { domainPrefix: 'shazi7804-apigateway' },
        });

        const handler = new lambda.Function(this, "Lambda", {
            code: new lambda.AssetCode("./lambda"),
            handler: "index.handler",
            runtime: lambda.Runtime.NODEJS_12_X,
        });

        const api = new apigw.HttpApi(this, 'ApiGwHttp');

        const cognitoAuthrizer = new apigw.CfnAuthorizer(this, 'ApiAuth', {
            apiId: api.httpApiId,
            name: "cognitoAuthorizer",
            authorizerType: 'JWT',
            identitySource: ["$request.header.Authorization"],
            jwtConfiguration: {
                issuer: "https://martzcodes.us.auth0.com/",
                audience: ["https://martzcodes.us.auth0.com/api/v2/"],
            },
        })

        // const cognitoAuthrizer = new apigw.CfnAuthorizer(this, `${id}-AuthUserPool`, {
        //     name: "CognitoAuthorizer",
        //     type: apigw.AuthorizationType.COGNITO,
        //     identitySource: apigw.IdentitySource.header('Authorization'),
        //     restApiId: apigw.restApiId,
        //     providerArns: [userPool.userPoolArn]
        // });

        // apigw.root.addProxy({
        //     defaultIntegration: new apigw.LambdaIntegration(handler),
        //     defaultMethodOptions: {
        //         authorizer: {
        //             authorizationType: apigw.AuthorizationType.COGNITO,
        //             authorizerId: cognitoAuthrizer.ref,
        //         },
        //     }
        // });



        // add Third-party login
        // new cognito.UserPoolIdentityProviderAmazon(this, 'Amazon', {
        //     clientId: 'amzn-client-id',
        //     clientSecret: 'amzn-client-secret',
        //     userPool: userPool,
        //     attributeMapping: {
        //         email: cognito.ProviderAttribute.AMAZON_EMAIL,
        //         fullname: cognito.ProviderAttribute.AMAZON_NAME
        //     },
        // });

    }
}
