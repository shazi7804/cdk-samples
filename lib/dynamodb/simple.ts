import cdk = require("aws-cdk-lib");
import { Construct } from 'constructs';
import * as ddb from 'aws-cdk-lib/aws-dynamodb';

export class SimpleDynamoDBTableStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new ddb.Table(this, 'tab;e', {
        tableName: 'simple-table',
        partitionKey: { name: 'name', type: ddb.AttributeType.STRING },
        readCapacity: 5,
        writeCapacity: 5
    });

    }
}
