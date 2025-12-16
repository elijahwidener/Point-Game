import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as apigatewayv2Integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as path from "path";

export class ApiStack extends cdk.Stack {
  public readonly websocketApiEndpoint: string;
  public readonly counterTable: dynamodb.Table;
  public readonly counterLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table - TestCounterDDB
    this.counterTable = new dynamodb.Table(this, "TestCounterDDB", {
      tableName: "TestCounterDDB",
      partitionKey: {
        name: "pk",
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function - TestCounterLambda (using NodejsFunction for TypeScript bundling)
    this.counterLambda = new NodejsFunction(this, "TestCounterLambda", {
      functionName: "TestCounterLambda",
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, "../../src/lambdas/counter/index.ts"),
      handler: "handler",
      environment: {
        TABLE_NAME: this.counterTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: true,
        sourceMap: true,
        target: "node20",
      },
    });

    // Grant Lambda permissions to DynamoDB
    this.counterTable.grantReadWriteData(this.counterLambda);

    // WebSocket API - IncrementTestCounterAPI
    const webSocketApi = new apigatewayv2.WebSocketApi(
      this,
      "IncrementTestCounterAPI",
      {
        apiName: "IncrementTestCounterAPI",
        connectRouteOptions: {
          integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
            "ConnectIntegration",
            this.counterLambda
          ),
        },
        disconnectRouteOptions: {
          integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
            "DisconnectIntegration",
            this.counterLambda
          ),
        },
        defaultRouteOptions: {
          integration: new apigatewayv2Integrations.WebSocketLambdaIntegration(
            "DefaultIntegration",
            this.counterLambda
          ),
        },
      }
    );

    // WebSocket Stage
    const webSocketStage = new apigatewayv2.WebSocketStage(
      this,
      "WebSocketStage",
      {
        webSocketApi,
        stageName: "prod",
        autoDeploy: true,
      }
    );

    // Grant Lambda permission to manage WebSocket connections
    this.counterLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["execute-api:ManageConnections"],
        resources: [
          `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/*`,
        ],
      })
    );

    // Add WebSocket API endpoint to Lambda environment
    this.counterLambda.addEnvironment(
      "WEBSOCKET_ENDPOINT",
      `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`
    );

    // Store the WebSocket endpoint for frontend stack
    this.websocketApiEndpoint = `wss://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`;

    // Outputs
    new cdk.CfnOutput(this, "WebSocketApiEndpoint", {
      value: this.websocketApiEndpoint,
      description: "WebSocket API Endpoint",
    });

    new cdk.CfnOutput(this, "DynamoDBTableName", {
      value: this.counterTable.tableName,
      description: "DynamoDB Table Name",
    });

    new cdk.CfnOutput(this, "LambdaFunctionName", {
      value: this.counterLambda.functionName,
      description: "Lambda Function Name",
    });
  }
}
