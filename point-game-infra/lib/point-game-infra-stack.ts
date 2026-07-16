import * as cdk from 'aws-cdk-lib';
import {Annotations} from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import {WebSocketLambdaIntegration} from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import {Construct} from 'constructs';


export class PointGameInfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ========================================
    // Cognito User Pool
    // ========================================

    const userPool = new cognito.UserPool(this, 'PointGameUserPool', {
      userPoolName: 'PointGameUserPool',

      signInAliases: {
        username: true,
        email: true,
      },

      selfSignUpEnabled: true,

      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
        requireSymbols: false,
        requireUppercase: true,
      },

      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,

      autoVerify: {
        email: true,
      },

      standardAttributes: {
        preferredUsername: {
          required: false,
          mutable: true,
        },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient =
        new cognito.UserPoolClient(this, 'PointGameUserPoolClient', {
          userPool,
          userPoolClientName: 'PointGameWebClient',

          authFlows: {
            userSrp: true,
            userPassword: true,
          },

          accessTokenValidity: cdk.Duration.hours(2),
          idTokenValidity: cdk.Duration.hours(2),
          refreshTokenValidity: cdk.Duration.days(30),

          preventUserExistenceErrors: true,

          generateSecret: false,
        });

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

    const cognitoEnvVars = {
      COGNITO_USER_POOL_ID: userPool.userPoolId,
      COGNITO_CLIENT_ID: userPoolClient.userPoolClientId,
      COGNITO_REGION: this.region,
    };

    const authLambda = new lambda.Function(this, 'AuthLambda', {
      functionName: 'AuthLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/auth/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
    });

    const tableLambda = new lambda.Function(this, 'TableLambda', {
      functionName: 'TableLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/table/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
    });

    const gameLambda = new lambda.Function(this, 'GameLambda', {
      functionName: 'GameLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/game/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
    });

    // Invoked by EventBridge Scheduler when a turn's clock expires. Not wired
    // to any API - its only caller is the scheduler.
    const timeoutLambda = new lambda.Function(this, 'TimeoutLambda', {
      functionName: 'TimeoutLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/game/timeout/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
    });

    const connectLambda = new lambda.Function(this, 'ConnectLambda', {
      functionName: 'ConnectLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/websocket/connect/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
    });

    const disconnectLambda = new lambda.Function(this, 'DisconnectLambda', {
      functionName: 'DisconnectLambda',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'services/websocket/disconnect/index.handler',
      code: lambda.Code.fromAsset('../dist'),
      timeout: cdk.Duration.seconds(10),
      environment: cognitoEnvVars,
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

    // TimeoutLambda replays a normal player action, so it touches exactly the
    // same tables the game Lambda does.
    for (const fn of [gameLambda, timeoutLambda]) {
      gameStateTable.grantReadWriteData(fn);
      gameTables.grantReadWriteData(fn);
      actionLogTable.grantReadWriteData(fn);
      connectionStore.grantReadWriteData(fn);
      interRoundActionQueue.grantReadWriteData(fn);
      handSnapshotsTable.grantReadWriteData(fn);
      usersTable.grantReadWriteData(fn);
      timersTable.grantReadWriteData(fn);
    }

    connectionStore.grantReadWriteData(connectLambda);
    gameTables.grantReadWriteData(connectLambda);
    gameStateTable.grantReadData(connectLambda);
    connectionStore.grantReadWriteData(disconnectLambda);

    usersTable.grantReadWriteData(connectLambda);

    // ========================================
    // Turn Timers (EventBridge Scheduler)
    // ========================================

    // Built by hand rather than read off timeoutLambda.functionArn: the
    // scheduler role has to name the target, and both Lambdas need the ARN in
    // their environment - including TimeoutLambda itself. Going through the
    // construct would make TimeoutLambda depend on a role that depends on
    // TimeoutLambda, which CloudFormation rejects as a cycle. The function name
    // is pinned above, so the ARN is deterministic.
    const timeoutLambdaArn = `arn:${this.partition}:lambda:${this.region}:${
        this.account}:function:TimeoutLambda`;

    // The role EventBridge Scheduler assumes to invoke TimeoutLambda.
    const schedulerRole = new iam.Role(this, 'TurnTimerSchedulerRole', {
      assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com'),
      description: 'Assumed by EventBridge Scheduler to fire turn timeouts',
    });

    schedulerRole.addToPolicy(new iam.PolicyStatement({
      actions: ['lambda:InvokeFunction'],
      resources: [timeoutLambdaArn],
    }));

    // Both Lambdas create schedules: the game Lambda when a player action opens
    // a new turn, TimeoutLambda when a forced action does the same.
    for (const fn of [gameLambda, timeoutLambda]) {
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['scheduler:CreateSchedule'],
        resources: [`arn:${this.partition}:scheduler:${this.region}:${
            this.account}:schedule/default/*`],
      }));

      // Scoped to the one role, so neither Lambda can hand any other role to
      // the scheduler.
      fn.addToRolePolicy(new iam.PolicyStatement({
        actions: ['iam:PassRole'],
        resources: [schedulerRole.roleArn],
      }));

      fn.addEnvironment('TIMEOUT_LAMBDA_ARN', timeoutLambdaArn);
      fn.addEnvironment('SCHEDULER_ROLE_ARN', schedulerRole.roleArn);
    }

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

    // ========================================
    // Cognito Authorizer for API Gateway (NEW)
    // ========================================

    const cognitoAuthorizer =
        new apigateway.CognitoUserPoolsAuthorizer(this, 'PointGameAuthorizer', {
          cognitoUserPools: [userPool],
          authorizerName: 'PointGameCognitoAuthorizer',
          identitySource: 'method.request.header.Authorization',
        });

    // Helper for protected routes
    const protectedMethodOptions: apigateway.MethodOptions = {
      authorizer: cognitoAuthorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
    };


    const auth = api.root.addResource('auth');

    // POST /auth/sync - Create/sync user in DynamoDB after Cognito signup
    // Called by frontend after successful Cognito signup
    auth.addResource('sync').addMethod(
        'POST', new apigateway.LambdaIntegration(authLambda),
        protectedMethodOptions  // Requires valid Cognito token
    );

    // GET /me - Get current user profile (PROTECTED)
    api.root.addResource('me').addMethod(
        'GET', new apigateway.LambdaIntegration(authLambda),
        protectedMethodOptions  // Requires valid Cognito token
    );

    // Table routes
    const tables = api.root.addResource('tables');
    tables.addMethod(
        'GET', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tables.addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);

    const tableByID = tables.addResource('{tableID}');
    tableByID.addMethod(
        'GET', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);

    tableByID.addResource('leave').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tableByID.addResource('sit').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tableByID.addResource('pause_unpause')
        .addMethod(
            'POST', new apigateway.LambdaIntegration(tableLambda),
            protectedMethodOptions);
    tableByID.addResource('end').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tableByID.addResource('config').addMethod(
        'PATCH', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tableByID.addResource('start').addMethod(
        'POST', new apigateway.LambdaIntegration(tableLambda),
        protectedMethodOptions);
    tableByID.addResource('toggleAway')
        .addMethod(
            'POST', new apigateway.LambdaIntegration(tableLambda),
            protectedMethodOptions);

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
    webSocketApi.grantManageConnections(connectLambda);
    webSocketApi.grantManageConnections(gameLambda);
    webSocketApi.grantManageConnections(tableLambda);
    // TimeoutLambda broadcasts the forced action like any other.
    webSocketApi.grantManageConnections(timeoutLambda);

    const stage = new apigatewayv2.WebSocketStage(
        this, 'GameStage', {webSocketApi, stageName: 'prod', autoDeploy: true});

    gameLambda.addEnvironment(
        'WEBSOCKET_API_ENDPOINT',
        `https://${webSocketApi.apiId}.execute-api.${
            this.region}.amazonaws.com/${stage.stageName}`);

    tableLambda.addEnvironment(
        'WEBSOCKET_API_ENDPOINT',
        `https://${webSocketApi.apiId}.execute-api.${
            this.region}.amazonaws.com/${stage.stageName}`);

    timeoutLambda.addEnvironment(
        'WEBSOCKET_API_ENDPOINT',
        `https://${webSocketApi.apiId}.execute-api.${
            this.region}.amazonaws.com/${stage.stageName}`);

    // ========================================
    // Outputs
    // ========================================

    new cdk.CfnOutput(this, 'RestApiUrl', {
      value: api.url,
      description: 'REST API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebSocketUrl', {
      value: `wss://${webSocketApi.apiId}.execute-api.${
          this.region}.amazonaws.com/${stage.stageName}`,
      description: 'WebSocket API Gateway URL',
    });

    // NEW: Cognito outputs for frontend configuration
    new cdk.CfnOutput(this, 'CognitoUserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'CognitoUserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoRegion', {
      value: this.region,
      description: 'Cognito Region',
    });
  }
}