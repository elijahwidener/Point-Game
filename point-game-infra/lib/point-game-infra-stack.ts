import * as cdk from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import {WebSocketLambdaIntegration} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';

export class PointGameInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // DynamoDB Tables
    // ========================================

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

    const gameTables = new dynamodb.Table(this, 'GameTables', {
      tableName: 'GameTables',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const gameStateTable = new dynamodb.Table(this, 'GameState', {
      tableName: 'GameState',
      partitionKey: {
        name: 'tableID',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const interRoundActionQueue =
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

    const ledgerTable = new dynamodb.Table(this, 'Ledger', {
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

    const connectionStore = new dynamodb.Table(this, 'ConnectionStore', {
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

    connectionStore.addGlobalSecondaryIndex({
      indexName: 'ConnectionIDIndex',
      partitionKey: {name: 'connectionID', type: dynamodb.AttributeType.STRING},
      projectionType: dynamodb.ProjectionType.ALL
    });

    const handSnapshotsTable = new dynamodb.Table(this, 'HandSnapshots', {
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

    const actionLogTable = new dynamodb.Table(this, 'ActionLog', {
      tableName: 'ActionLog',
      partitionKey: {
        name: 'handID',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'actionSeq',
        type: dynamodb.AttributeType.NUMBER,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const timersTable = new dynamodb.Table(this, 'Timers', {
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

    // ========================================
    // Lambda Functions
    // ========================================

    const authLambda = new lambda.Function(this, 'AuthLambda', {
      functionName: 'AuthLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/auth/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
    });

    const tableLambda = new lambda.Function(this, 'TableLambda', {
      functionName: 'TableLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/table/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
    });

    const gameLambda = new lambda.Function(this, 'GameLambda', {
      functionName: 'GameLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/game/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
    });

    const connectLambda = new lambda.Function(this, 'ConnectLambda', {
      functionName: 'ConnectLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/websocket/connect/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
    });

    const disconnectLambda = new lambda.Function(this, 'DisconnectLambda', {
      functionName: 'DisconnectLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/websocket/disconnect/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
    });

    // ========================================
    // Grant DynamoDB Permissions
    // ========================================

    usersTable.grantReadWriteData(authLambda);

    usersTable.grantReadWriteData(tableLambda);
    gameTables.grantReadWriteData(tableLambda);
    gameStateTable.grantReadWriteData(tableLambda);
    interRoundActionQueue.grantReadWriteData(tableLambda);
    connectionStore.grantReadWriteData(tableLambda);

    gameStateTable.grantReadWriteData(gameLambda);
    gameTables.grantReadWriteData(gameLambda);
    actionLogTable.grantReadWriteData(gameLambda);
    connectionStore.grantReadWriteData(gameLambda);
    interRoundActionQueue.grantReadWriteData(gameLambda);
    handSnapshotsTable.grantReadWriteData(gameLambda);
    usersTable.grantReadWriteData(gameLambda);

    connectionStore.grantReadWriteData(connectLambda);
    gameTables.grantReadWriteData(connectLambda);
    connectionStore.grantReadWriteData(disconnectLambda);

    // ========================================
    // REST API Gateway
    // ========================================

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

    // Auth routes
    const auth = api.root.addResource('auth');
    auth.addResource('signup').addMethod(
        'POST', new apigateway.LambdaIntegration(authLambda));
    auth.addResource('login').addMethod(
        'POST', new apigateway.LambdaIntegration(authLambda));
    api.root.addResource('me').addMethod(
        'GET', new apigateway.LambdaIntegration(authLambda));

    // Table routes
    const tables = api.root.addResource('tables');
    tables.addMethod('GET', new apigateway.LambdaIntegration(tableLambda));
    tables.addMethod('POST', new apigateway.LambdaIntegration(tableLambda));

    const tableByID = tables.addResource('{tableID}');
    tableByID.addMethod('GET', new apigateway.LambdaIntegration(tableLambda));


    tableByID.addResource('leave').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda));
    tableByID.addResource('sit').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda));
    tableByID.addResource('pause_unpause')
        .addMethod('POST', new apigateway.LambdaIntegration(tableLambda));
    tableByID.addResource('end').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda));
    tableByID.addResource('config').addMethod(
        'PATCH', new apigateway.LambdaIntegration(tableLambda));
    tableByID.addResource('start').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda));

    // ========================================
    // WebSocket API Gateway
    // ========================================

    const webSocketApi = new apigatewayv2.WebSocketApi(this, 'GameWebSocket', {
      connectRouteOptions: {
        integration:
            new WebSocketLambdaIntegration('ConnectIntegration', connectLambda)
      },
      disconnectRouteOptions: {
        integration: new WebSocketLambdaIntegration(
            'DisconnectIntegration', disconnectLambda)
      }
    });

    // Add default route for game actions
    webSocketApi.addRoute('$default', {
      integration:
          new WebSocketLambdaIntegration('DefaultIntegration', gameLambda)
    });

    const stage = new apigatewayv2.WebSocketStage(
        this, 'GameStage', {webSocketApi, stageName: 'prod', autoDeploy: true});

    gameLambda.addEnvironment(
        'WEBSOCKET_API_ENDPOINT',
        `https://${webSocketApi.apiId}.execute-api.${
            this.region}.amazonaws.com/${stage.stageName}`);

    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: `wss://${webSocketApi.apiId}.execute-api.${
          this.region}.amazonaws.com/${stage.stageName}`,
      description: 'WebSocket API Gateway URL',
    });
  }
}