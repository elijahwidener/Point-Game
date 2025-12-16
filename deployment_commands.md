# How to Launch Point Game Infrastructure

These commands should be run inside `Point-Game/packages/infra`

## Prerequisites

- Node.js 18+ installed
- AWS CLI configured with credentials
- AWS CDK bootstrapped in your account (`npx cdk bootstrap`)

## Initial Setup

```bash
cd packages/infra
npm install
```

You can do 
```bash
npx cdk bootstrap
```
for one time setup.

and 

```bash
npx cdk synth
```
to view what CloudFormation you’re about to send to AWS

i.e. `npx cdk synth PointGameTestAPIStack`



## Deploy Commands

### Deploy All Stacks

```bash
npx cdk deploy --all
```

Or using npm script:
```bash
npm run deploy
```

### Deploy Individual Stacks

Deploy API stack (DynamoDB, Lambda, WebSocket API):
```bash
npx cdk deploy PointGameApiStack
```

Deploy Frontend stack (S3, CloudFront):
```bash
npx cdk deploy PointGameFrontendStack
```

**Note:** Frontend depends on API stack, so deploy API first if deploying individually.

## Other Useful Commands

### Preview Changes (Diff)

```bash
npx cdk diff
npx cdk diff PointGameApiStack
```

### Synthesize CloudFormation Templates

```bash
npx cdk synth
```

### Destroy All Stacks

```bash
npx cdk destroy --all
```

Or:
```bash
npm run destroy
```

### Destroy Individual Stack

```bash
npx cdk destroy PointGameFrontendStack
npx cdk destroy PointGameApiStack
```

## Stack Outputs

After deployment, CDK will output:
- **WebSocketApiEndpoint** - WebSocket URL for the counter API
- **DistributionUrl** - CloudFront URL for the website
- **DynamoDBTableName** - Name of the counter table
- **LambdaFunctionName** - Name of the counter Lambda
