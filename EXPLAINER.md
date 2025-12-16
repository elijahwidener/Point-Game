# Point Game Infrastructure - Low-Level Design (LLD)

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Technology Stack](#technology-stack)
3. [Component Deep Dive](#component-deep-dive)
4. [Data Flow](#data-flow)
5. [Resource Naming & Identification](#resource-naming--identification)
6. [Deployment Process](#deployment-process)
7. [Security & IAM](#security--iam)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         index.html (Single Page Application)              │  │
│  │  • WebSocket client                                       │  │
│  │  • Counter display UI                                     │  │
│  │  • Increment button                                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└───────────────────┬─────────────────────┬───────────────────────┘
                    │ HTTPS               │ WSS (WebSocket)
                    ▼                     ▼
        ┌───────────────────────┐  ┌─────────────────────────────┐
        │   CloudFront CDN      │  │  API Gateway WebSocket API  │
        │   (Distribution)      │  │  wss://xxxxx.execute-api... │
        └───────────┬───────────┘  └──────────────┬──────────────┘
                    │                             │
                    │ Origin Access Control       │ Routes: $connect
                    │ (OAC)                       │         $disconnect
                    ▼                             │         $default
        ┌───────────────────────┐                 │
        │   S3 Bucket           │                 │
        │   point-game-frontend │                 │
        │   • index.html        │                 │
        └───────────────────────┘                 │
                                                   ▼
                                        ┌──────────────────────┐
                                        │  Lambda Function     │
                                        │  TestCounterLambda   │
                                        │  • Node.js 20        │
                                        │  • WebSocket handler │
                                        │  • Counter logic     │
                                        └──────────┬───────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                                    ▼              ▼              ▼
                        ┌─────────────────┐  ┌──────────┐  ┌──────────────┐
                        │   DynamoDB      │  │ CloudWatch│  │ API Gateway  │
                        │   TestCounterDDB│  │   Logs    │  │ ManageConn   │
                        │   • Counter val │  │           │  │ (PostToConn) │
                        │   • Connections │  │           │  │              │
                        └─────────────────┘  └──────────┘  └──────────────┘
```

---

## Technology Stack

### Infrastructure as Code
- **AWS CDK v2.170.0** - Infrastructure definition using TypeScript
- **TypeScript 5.3.0** - Type-safe infrastructure code
- **esbuild 0.24.0** - Fast TypeScript bundling for Lambda functions

### Backend Services
- **AWS Lambda** - Serverless compute (Node.js 20)
- **API Gateway V2** - WebSocket API for real-time communication
- **DynamoDB** - NoSQL database (Pay-per-request billing)
- **IAM** - Identity and Access Management

### Frontend Services
- **Amazon S3** - Static website hosting
- **CloudFront** - Global CDN with HTTPS
- **Origin Access Control (OAC)** - Secure S3 access

### Lambda Runtime
- **Node.js 20.x** - JavaScript runtime
- **AWS SDK v3**
  - `@aws-sdk/client-dynamodb` - DynamoDB operations
  - `@aws-sdk/client-apigatewaymanagementapi` - WebSocket message broadcasting

---

## Component Deep Dive

### 1. CDK Application Entry Point
**File:** `packages/infra/bin/app.ts`

```typescript
const app = new cdk.App();

// Stack 1: API Stack (backend)
const apiStack = new ApiStack(app, "PointGameTestAPIStack", {
  env: { account, region }
});

// Stack 2: Frontend Stack (depends on API Stack)
new FrontendStack(app, "PointGameFrontendStack", {
  env: { account, region },
  websocketApiEndpoint: apiStack.websocketApiEndpoint  // Cross-stack reference
});
```

**What happens:**
1. Creates a CDK application
2. Instantiates two stacks in order:
   - `ApiStack` creates backend resources
   - `FrontendStack` creates frontend resources and receives WebSocket URL from ApiStack
3. CDK synthesizes CloudFormation templates
4. CloudFormation deploys resources to AWS

---

### 2. API Stack (Backend)
**File:** `packages/infra/lib/stacks/api-stack.ts`

#### 2.1 DynamoDB Table
```typescript
this.counterTable = new dynamodb.Table(this, "TestCounterDDB", {
  tableName: "TestCounterDDB",
  partitionKey: { name: "pk", type: STRING },
  billingMode: PAY_PER_REQUEST,
  removalPolicy: DESTROY
});
```

**Purpose:** Stores application state
**Schema:**
- **Partition Key:** `pk` (String)
- **Items stored:**
  - `pk = "GLOBAL_COUNTER"` → `{ counter: Number }`
  - `pk = "CONNECTIONS"` → `{ connections: StringSet }`

**Billing:** Pay-per-request (no fixed capacity, charged per read/write)

#### 2.2 Lambda Function
```typescript
this.counterLambda = new NodejsFunction(this, "TestCounterLambda", {
  functionName: "TestCounterLambda",
  runtime: Runtime.NODEJS_20_X,
  entry: path.join(__dirname, "../../src/lambdas/counter/index.ts"),
  handler: "handler",
  environment: {
    TABLE_NAME: this.counterTable.tableName
  },
  timeout: cdk.Duration.seconds(30),
  bundling: {
    minify: true,
    sourceMap: true,
    target: "node20"
  }
});
```

**What happens:**
1. CDK reads TypeScript source from `src/lambdas/counter/index.ts`
2. esbuild bundles the code:
   - Transpiles TypeScript → JavaScript
   - Minifies code
   - Generates source maps
   - Targets Node.js 20 runtime
3. CDK uploads bundled code to S3
4. Lambda function is created with:
   - Auto-generated IAM execution role
   - CloudWatch Logs access
   - Environment variable `TABLE_NAME` injected

**Lambda Execution Role:**
- Auto-created by CDK with name: `PointGameTestAPIStack-TestCounterLambdaServiceRole[HASH]-[ID]`
- Managed policy attached: `AWSLambdaBasicExecutionRole` (CloudWatch Logs)

#### 2.3 Permissions Grant
```typescript
this.counterTable.grantReadWriteData(this.counterLambda);
```

**What happens:**
- CDK adds an inline IAM policy to the Lambda's execution role
- Grants DynamoDB permissions:
  - `dynamodb:BatchGetItem`
  - `dynamodb:GetItem`
  - `dynamodb:BatchWriteItem`
  - `dynamodb:PutItem`
  - `dynamodb:UpdateItem`
  - `dynamodb:DeleteItem`
  - And more...
- Resource: ARN of `TestCounterDDB` table only

#### 2.4 WebSocket API
```typescript
const webSocketApi = new apigatewayv2.WebSocketApi(this, "IncrementTestCounterAPI", {
  apiName: "IncrementTestCounterAPI",
  connectRouteOptions: {
    integration: new WebSocketLambdaIntegration("ConnectIntegration", this.counterLambda)
  },
  disconnectRouteOptions: {
    integration: new WebSocketLambdaIntegration("DisconnectIntegration", this.counterLambda)
  },
  defaultRouteOptions: {
    integration: new WebSocketLambdaIntegration("DefaultIntegration", this.counterLambda)
  }
});
```

**Routes created:**
- **$connect** - Triggered when client connects
- **$disconnect** - Triggered when client disconnects
- **$default** - Triggered for all other messages (catch-all)

**All routes invoke the same Lambda function** which handles routing internally via `event.requestContext.routeKey`

#### 2.5 WebSocket Stage
```typescript
const webSocketStage = new apigatewayv2.WebSocketStage(this, "WebSocketStage", {
  webSocketApi,
  stageName: "prod",
  autoDeploy: true
});
```

**Purpose:** Deploys the API to a stage
- **Stage name:** `prod`
- **Auto-deploy:** Changes automatically deploy
- **Endpoint format:** `wss://{apiId}.execute-api.{region}.amazonaws.com/prod`

#### 2.6 WebSocket Management Permissions
```typescript
this.counterLambda.addToRolePolicy(
  new iam.PolicyStatement({
    effect: iam.Effect.ALLOW,
    actions: ["execute-api:ManageConnections"],
    resources: [
      `arn:aws:execute-api:${this.region}:${this.account}:${webSocketApi.apiId}/${webSocketStage.stageName}/*`
    ]
  })
);
```

**Why needed:**
- Lambda needs to send messages back to connected clients
- Uses `PostToConnectionCommand` from AWS SDK
- Requires `execute-api:ManageConnections` permission

#### 2.7 Environment Variables
```typescript
this.counterLambda.addEnvironment(
  "WEBSOCKET_ENDPOINT",
  `https://${webSocketApi.apiId}.execute-api.${this.region}.amazonaws.com/${webSocketStage.stageName}`
);
```

**Lambda environment variables:**
- `TABLE_NAME` = `TestCounterDDB` (set during creation)
- `WEBSOCKET_ENDPOINT` = `https://xxxxx.execute-api.us-east-1.amazonaws.com/prod` (added after)

---

### 3. Frontend Stack
**File:** `packages/infra/lib/stacks/frontend-stack.ts`

#### 3.1 S3 Bucket
```typescript
this.websiteBucket = new s3.Bucket(this, "WebsiteBucket", {
  bucketName: `point-game-frontend-${this.account}-${this.region}`,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL  // NOT publicly accessible
});
```

**Security:**
- All public access blocked
- Only CloudFront can access via Origin Access Control (OAC)
- Prevents direct S3 URL access

#### 3.2 CloudFront Distribution
```typescript
this.distribution = new cloudfront.Distribution(this, "Distribution", {
  defaultBehavior: {
    origin: origins.S3BucketOrigin.withOriginAccessControl(this.websiteBucket),
    viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
    cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
  },
  defaultRootObject: "index.html",
  errorResponses: [
    { httpStatus: 404, responseHttpStatus: 200, responsePagePath: "/index.html" },
    { httpStatus: 403, responseHttpStatus: 200, responsePagePath: "/index.html" }
  ]
});
```

**Features:**
- **OAC:** CloudFront has exclusive S3 access (secure, modern alternative to OAI)
- **HTTPS only:** HTTP requests redirect to HTTPS
- **SPA routing:** All 404/403 errors return `index.html` (for client-side routing)
- **Caching:** Optimized caching policy for static assets
- **Global CDN:** Content distributed to edge locations worldwide

#### 3.3 HTML Template Injection
```typescript
private generateIndexHtml(websocketApiEndpoint: string): string {
  const htmlTemplatePath = path.join(__dirname, "../../../src/frontend/index.html");
  const htmlTemplate = fs.readFileSync(htmlTemplatePath, "utf-8");
  return htmlTemplate.replace("{{WEBSOCKET_ENDPOINT}}", websocketApiEndpoint);
}
```

**What happens:**
1. Reads HTML template from `packages/src/frontend/index.html`
2. Finds placeholder `{{WEBSOCKET_ENDPOINT}}`
3. Replaces with actual WebSocket URL: `wss://xxxxx.execute-api.us-east-1.amazonaws.com/prod`
4. Returns final HTML with injected WebSocket URL

#### 3.4 S3 Deployment
```typescript
new s3deploy.BucketDeployment(this, "DeployWebsite", {
  sources: [
    s3deploy.Source.data("index.html", this.generateIndexHtml(props.websocketApiEndpoint))
  ],
  destinationBucket: this.websiteBucket,
  distribution: this.distribution,
  distributionPaths: ["/*"]  // Invalidates CloudFront cache
});
```

**Deployment process:**
1. Generates HTML with WebSocket URL injected
2. Uploads `index.html` to S3 bucket
3. Invalidates CloudFront cache at `/*` (ensures users get latest version)

---

### 4. Lambda Handler Logic
**File:** `packages/infra/src/lambdas/counter/index.ts`

#### 4.1 Event Structure
```typescript
interface WebSocketEvent {
  requestContext: {
    connectionId: string;      // Unique ID for this connection
    routeKey: string;          // "$connect" | "$disconnect" | "$default"
    domainName: string;        // API Gateway domain
    stage: string;             // "prod"
  };
  body?: string;               // JSON payload from client
}
```

#### 4.2 Route Handling
```typescript
switch (routeKey) {
  case "$connect":
    await addConnection(connectionId);  // Store in DynamoDB
    return { statusCode: 200, body: "Connected" };

  case "$disconnect":
    await removeConnection(connectionId);  // Remove from DynamoDB
    return { statusCode: 200, body: "Disconnected" };

  case "$default":
    const payload = JSON.parse(event.body);
    if (payload.action === "increment") {
      const newCounter = await incrementCounter();
      await broadcastToAll(apiClient, { counter: newCounter });
    }
    if (payload.action === "getCounter") {
      const counter = await getCounter();
      await sendToConnection(apiClient, connectionId, { counter });
    }
}
```

#### 4.3 DynamoDB Operations

**Connection Management:**
```typescript
async function addConnection(connectionId: string) {
  await dynamoClient.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: { pk: { S: "CONNECTIONS" } },
    UpdateExpression: "ADD #connections :connection",
    ExpressionAttributeNames: { "#connections": "connections" },
    ExpressionAttributeValues: { ":connection": { SS: [connectionId] } }
  }));
}
```
Adds connectionId to a StringSet in DynamoDB

**Counter Operations:**
```typescript
async function incrementCounter(): Promise<number> {
  const result = await dynamoClient.send(new UpdateItemCommand({
    TableName: TABLE_NAME,
    Key: { pk: { S: "GLOBAL_COUNTER" } },
    UpdateExpression: "SET #counter = if_not_exists(#counter, :zero) + :inc",
    ExpressionAttributeNames: { "#counter": "counter" },
    ExpressionAttributeValues: {
      ":inc": { N: "1" },
      ":zero": { N: "0" }
    },
    ReturnValues: "UPDATED_NEW"
  }));
  return parseInt(result.Attributes.counter.N, 10);
}
```
Atomically increments counter (initializes to 0 if doesn't exist)

#### 4.4 Broadcasting Messages
```typescript
async function broadcastToAll(apiClient: ApiGatewayManagementApiClient, message: object) {
  const connections = await getConnections();  // Get all active connections
  const messageData = JSON.stringify(message);

  const sendPromises = connections.map(async (connectionId) => {
    try {
      await apiClient.send(new PostToConnectionCommand({
        ConnectionId: connectionId,
        Data: Buffer.from(messageData)
      }));
    } catch (error) {
      if (error.statusCode === 410) {  // Connection is stale/closed
        await removeConnection(connectionId);  // Clean up
      }
    }
  });

  await Promise.all(sendPromises);  // Send to all connections in parallel
}
```

**API Gateway Management API Client:**
```typescript
const apiClient = new ApiGatewayManagementApiClient({
  endpoint: `https://${domainName}/${stage}`
});
```
Used to send messages back to WebSocket clients via `PostToConnectionCommand`

---

### 5. Frontend Application
**File:** `packages/src/frontend/index.html`

#### 5.1 WebSocket Connection
```javascript
const WEBSOCKET_URL = '{{WEBSOCKET_ENDPOINT}}';  // Replaced during deployment
let ws = new WebSocket(WEBSOCKET_URL);

ws.onopen = function() {
  console.log('WebSocket connected');
  ws.send(JSON.stringify({ action: 'getCounter' }));  // Request initial value
};

ws.onmessage = function(event) {
  const data = JSON.parse(event.data);
  if (data.counter !== undefined) {
    updateCounter(data.counter);  // Update UI
  }
};

ws.onclose = function() {
  // Exponential backoff reconnection logic
  setTimeout(connect, delay);
};
```

#### 5.2 User Actions
```javascript
function incrementCounter() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ action: 'increment' }));
  }
}
```

When user clicks button → sends JSON message → Lambda processes → broadcasts new value → all clients update UI

---

## Data Flow

### Scenario 1: User Loads Page
```
1. User visits CloudFront URL (https://xxxxx.cloudfront.net)
2. CloudFront checks cache
3. If miss: CloudFront fetches index.html from S3 via OAC
4. CloudFront serves HTML to user's browser
5. Browser parses HTML and executes JavaScript
6. JavaScript creates WebSocket connection to API Gateway
7. API Gateway invokes Lambda with $connect route
8. Lambda adds connectionId to DynamoDB CONNECTIONS set
9. Lambda returns 200 OK
10. API Gateway establishes WebSocket connection
11. JavaScript sends { action: 'getCounter' } message
12. API Gateway invokes Lambda with $default route
13. Lambda reads counter value from DynamoDB
14. Lambda sends counter value back to this connection only
15. Browser updates UI with counter value
```

### Scenario 2: User Clicks Increment Button
```
1. User clicks "Increment" button
2. JavaScript sends { action: 'increment' } via WebSocket
3. API Gateway receives message
4. API Gateway invokes Lambda with $default route
5. Lambda parses message and identifies 'increment' action
6. Lambda executes UpdateItemCommand on DynamoDB:
   - Atomically increments GLOBAL_COUNTER
   - Returns new value (e.g., 42)
7. Lambda reads all connectionIds from DynamoDB CONNECTIONS
8. Lambda creates API Gateway Management API client
9. Lambda loops through all connections and sends { counter: 42 }
   via PostToConnectionCommand
10. API Gateway pushes message to all connected WebSocket clients
11. All browsers receive message and update UI simultaneously
```

### Scenario 3: User Closes Tab
```
1. User closes browser tab
2. Browser closes WebSocket connection
3. API Gateway detects disconnect
4. API Gateway invokes Lambda with $disconnect route
5. Lambda removes connectionId from DynamoDB CONNECTIONS set
6. Lambda returns 200 OK
7. Connection cleanup complete
```

---

## Resource Naming & Identification

### CloudFormation Logical IDs vs Physical Names

**Logical IDs** (in CloudFormation template):
- Auto-generated by CDK with hash suffix
- Examples:
  - `TestCounterDDB92A6C991` (DynamoDB table)
  - `TestCounterLambdaServiceRole846E4539` (IAM role)
- **Purpose:** Unique identifiers within CloudFormation template
- **Visible in:** `cdk synth` output, CloudFormation console
- **User impact:** None (internal to CloudFormation)

**Physical Names** (actual AWS resources):
- Set explicitly in CDK code
- Examples:
  - DynamoDB table: `TestCounterDDB`
  - Lambda function: `TestCounterLambda`
  - S3 bucket: `point-game-frontend-{account}-{region}`
- **Purpose:** How resources appear in AWS Console
- **Visible in:** AWS Console, CLI, SDK calls

---

## Deployment Process

### Initial Deployment
```bash
# 1. Synthesize CloudFormation templates
npx cdk synth

# 2. Deploy both stacks
AWS_PROFILE=your_profile npx cdk deploy --all

# Behind the scenes:
# - CDK synthesizes TypeScript → CloudFormation YAML
# - CDK uploads Lambda code bundle to CDK asset bucket
# - CloudFormation creates resources in order:
#   a. ApiStack:
#      - DynamoDB table
#      - Lambda execution role
#      - Lambda function
#      - IAM policies
#      - API Gateway WebSocket API
#      - API Gateway stage
#   b. FrontendStack:
#      - S3 bucket
#      - CloudFront distribution (takes ~15 minutes)
#      - S3 deployment (uploads index.html)
#      - CloudFront cache invalidation
```

### Subsequent Updates
```bash
npx cdk deploy --all

# CDK performs differential updates:
# - Only changed resources are updated
# - CloudFormation calculates changeset
# - Some changes require replacement (e.g., partition key change)
# - Some changes update in-place (e.g., Lambda code)
```

### Destroy Infrastructure
```bash
npx cdk destroy --all

# - Deletes all resources
# - DynamoDB table deleted (DESTROY removal policy)
# - S3 bucket deleted with all objects (autoDeleteObjects: true)
# - CloudFront distribution deleted
```

---

## Security & IAM

### Lambda Execution Role Permissions

**Managed Policies:**
- `AWSLambdaBasicExecutionRole` (AWS managed)
  - `logs:CreateLogGroup`
  - `logs:CreateLogStream`
  - `logs:PutLogEvents`

**Inline Policies (auto-generated by CDK):**
1. **DynamoDB Access** (from `grantReadWriteData`):
   ```json
   {
     "Effect": "Allow",
     "Action": [
       "dynamodb:BatchGetItem",
       "dynamodb:GetRecords",
       "dynamodb:GetItem",
       "dynamodb:BatchWriteItem",
       "dynamodb:PutItem",
       "dynamodb:UpdateItem",
       "dynamodb:DeleteItem"
     ],
     "Resource": "arn:aws:dynamodb:us-east-1:123456789012:table/TestCounterDDB"
   }
   ```

2. **WebSocket Management** (from `addToRolePolicy`):
   ```json
   {
     "Effect": "Allow",
     "Action": "execute-api:ManageConnections",
     "Resource": "arn:aws:execute-api:us-east-1:123456789012:*/prod/*"
   }
   ```

### S3 Bucket Policy
```json
{
  "Effect": "Allow",
  "Principal": {
    "Service": "cloudfront.amazonaws.com"
  },
  "Action": "s3:GetObject",
  "Resource": "arn:aws:s3:::point-game-frontend-*/",
  "Condition": {
    "StringEquals": {
      "AWS:SourceArn": "arn:aws:cloudfront::123456789012:distribution/E1234567890ABC"
    }
  }
}
```
Only the specific CloudFront distribution can read from S3

---

## Cost Considerations

**Current costs (very low for testing):**
- **DynamoDB:** Pay-per-request (~$1.25 per million reads, ~$1.25 per million writes)
- **Lambda:** Free tier 1M requests/month + 400,000 GB-seconds compute
- **API Gateway WebSocket:** $1.00 per million messages (first 1B free tier)
- **S3:** $0.023 per GB storage + data transfer
- **CloudFront:** $0.085 per GB data transfer (first 1TB free tier for 12 months)

**For actual game deployment:**
- Enable DynamoDB point-in-time recovery
- Add CloudWatch alarms for cost monitoring
- Consider provisioned capacity for DynamoDB if traffic is predictable
- Add WAF rules to CloudFront for security

---

## Quick Reference

**Stack Names:**
- API: `PointGameTestAPIStack`
- Frontend: `PointGameFrontendStack`

**Resource Names:**
- DynamoDB: `TestCounterDDB`
- Lambda: `TestCounterLambda`
- S3: `point-game-frontend-{account}-{region}`
- API Gateway: `IncrementTestCounterAPI`

**Key Files:**
- Entry point: `packages/infra/bin/app.ts`
- API Stack: `packages/infra/lib/stacks/api-stack.ts`
- Frontend Stack: `packages/infra/lib/stacks/frontend-stack.ts`
- Lambda code: `packages/infra/src/lambdas/counter/index.ts`
- Frontend: `packages/src/frontend/index.html`

**CDK Commands:**
```bash
npm run synth    # Generate CloudFormation templates
npm run deploy   # Deploy to AWS
npm run destroy  # Delete all resources
```
