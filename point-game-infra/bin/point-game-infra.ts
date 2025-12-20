#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import {PointGameInfraStack} from '../lib/point-game-infra-stack';

const app = new cdk.App();
new PointGameInfraStack(app, 'PointGameInfraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
