import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PointGameInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const usersTable = new dynamodb.Table(this, 'Users', {
      tableName: 'Users',
      partitionKey: {
        name: 'userID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    usersTable.addGlobalSecondaryIndex({
      indexName: 'UsernameIndex',
      partitionKey: {
        name: 'username',
        type: dynamodb.AttributeType.STRING,
      },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    new dynamodb.Table(this, 'GameTables', {
      tableName: 'GameTables',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'GameState', {
      tableName: 'GameState',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'InterRoundActionQueue', {
      tableName: 'InterRoundActionQueue',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'actionSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'Ledger', {
      tableName: 'Ledger',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'ledgerSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'ConnectionStore', {
      tableName: 'ConnectionStore',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'connectionID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'HandSnapshots', {
      tableName: 'HandSnapshots',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'handSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'ActionLog', {
      tableName: 'ActionLog',
      partitionKey: {
        name: 'handID',  // ${tableID}#${handSeq}
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'actionSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    new dynamodb.Table(this, 'Timers', {
      tableName: 'Timers',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timerSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const authLambda = new lambda.Function(this, 'AuthLambda', {
      functionName: 'AuthLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/auth/index.handler',
      code: lambda.Code.fromAsset('../services/auth/dist'),
    });

    usersTable.grantReadWriteData(authLambda);

    const api = new apigateway.RestApi(this, 'PointGameApi', {
      restApiName: 'PointGameApi',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
        ],
      },
    });

    const auth = api.root.addResource('auth');

    auth.addResource('signup').addMethod(
        'POST', new apigateway.LambdaIntegration(authLambda));
    auth.addResource('login').addMethod(
        'POST', new apigateway.LambdaIntegration(authLambda));

    api.root.addResource('me').addMethod(
        'GET', new apigateway.LambdaIntegration(authLambda));
  }
}