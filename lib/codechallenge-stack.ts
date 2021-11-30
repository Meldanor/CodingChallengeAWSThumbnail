import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as sqs from '@aws-cdk/aws-sqs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
import * as apiGateway from '@aws-cdk/aws-apigateway';
import {Duration} from "@aws-cdk/core";
import { SqsEventSource } from '@aws-cdk/aws-lambda-event-sources';
import {Queue} from "@aws-cdk/aws-sqs";

export class CodechallengeStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'Table', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new cdk.CfnOutput(this, 'TableName', {value: table.tableName});

    const thumbnailGeneratorLambda = new lambda.Function(this, 'thumbnail-generator', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'index.main',
      code: lambda.Code.fromAsset(path.join(__dirname, '/../src/thumbnail-generator')),
    });

    table.grantReadWriteData(thumbnailGeneratorLambda);

    const deadLetterQueue = new sqs.Queue(this, "eventSequencingDLQueue", {
      retentionPeriod: Duration.days(14)
    });

    const queue = new sqs.Queue(this, 'MyQueue', {
      deadLetterQueue: {
        queue: deadLetterQueue,
        maxReceiveCount: 1
      }
    });

    new cdk.CfnOutput(this, 'queueName', {
      value: queue.queueName,
    });

    const s3Bucket = new s3.Bucket(this, 's3-bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true
    });

    // invoke lambda every time an object is created in the bucket
    s3Bucket.addEventNotification(
        s3.EventType.OBJECT_CREATED,
        new s3n.SqsDestination(queue)
    );

    thumbnailGeneratorLambda.addEventSource(new SqsEventSource(queue, {
      batchSize: 10,
    }));

    const graphqlLambda = new lambda.Function(this, 'graphqlLambda', {
      // Where our function is located - in that case, in `lambda` directory at the root of our project
      code: lambda.Code.fromAsset(path.join(__dirname, '/../src/graphql')),
      handler: 'index.main',
      runtime: lambda.Runtime.NODEJS_14_X,
    });

    new apiGateway.LambdaRestApi(this, 'graphqlEndpoint', {
      handler: graphqlLambda,
    });
  }
}
