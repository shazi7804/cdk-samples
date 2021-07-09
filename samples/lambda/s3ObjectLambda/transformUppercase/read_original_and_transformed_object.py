import boto3

s3 = boto3.client('s3')

print('Original object from the S3 bucket:')
original = s3.get_object(
  Bucket='object-lambda-us-east-1-381354187112',
  Key='demo.txt')
print(original['Body'].read().decode('utf-8'))

print('Object processed by S3 Object Lambda:')
transformed = s3.get_object(
  Bucket='arn:aws:s3-object-lambda:us-east-1:381354187112:accesspoint/object-lambda-transform-uppercase-accesspoint',
  Key='demo.txt')
print(transformed['Body'].read().decode('utf-8'))