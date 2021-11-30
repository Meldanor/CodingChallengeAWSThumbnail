import * as s3n from '@aws-cdk/aws-s3-notifications';
import * as lambda from '@aws-cdk/aws-lambda';
import * as s3 from '@aws-cdk/aws-s3';
import * as cdk from '@aws-cdk/core';
import * as path from 'path';
import * as sqs from '@aws-cdk/aws-sqs';
import * as dynamodb from '@aws-cdk/aws-dynamodb';
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

    const deadLetterQueue = new Queue(this, "eventSequencingDLQueue", {
      queueName: "dlq.fifo",
      deliveryDelay: Duration.millis(0),
      contentBasedDeduplication: true,
      retentionPeriod: Duration.days(14),
      fifo: true
    });

    const queue = new sqs.Queue(this, 'MyQueue', {
      visibilityTimeout: Duration.seconds(30),      // default,
      receiveMessageWaitTime: Duration.seconds(20), // default,
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
      batchSize: 10, // default
      maxBatchingWindow: Duration.minutes(5),
    }));
  }
}
