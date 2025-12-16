#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { ApiStack } from "../lib/stacks/api-stack";
import { FrontendStack } from "../lib/stacks/frontend-stack";

const app = new cdk.App();

// Create API stack first (contains DynamoDB, Lambda, WebSocket API)
const apiStack = new ApiStack(app, "PointGameTestAPIStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: "PointGameTestAPIStack API Stack - DynamoDB, Lambda, micro-WebSocket API",
});

// Create Frontend stack (depends on API stack for WebSocket endpoint)
new FrontendStack(app, "PointGameFrontendStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: "Point Game Frontend Stack - S3, CloudFront",
  websocketApiEndpoint: apiStack.websocketApiEndpoint,
});
