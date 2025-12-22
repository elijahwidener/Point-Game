"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ddb = void 0;
// dynamo client setup
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
exports.ddb = new client_dynamodb_1.DynamoDBClient({});
