"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeAction = exports.loadActionLog = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadActionLog(handID, actionID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.ACTION_LOG,
        Key: {
            handID: { S: handID },
            actionID: { N: actionID.toString() },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
exports.loadActionLog = loadActionLog;
async function writeAction(entry) {
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.ACTION_LOG,
        Item: (0, util_dynamodb_1.marshall)(entry),
        ConditionExpression: 'attribute_not_exists(actionSeq)',
    }));
}
exports.writeAction = writeAction;
