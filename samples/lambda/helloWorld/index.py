import json

def lambda_handler(event, context):
    return {
        "statusCode": 200,
        "body": json.dumps('Hello World from version 1.0')
    }
