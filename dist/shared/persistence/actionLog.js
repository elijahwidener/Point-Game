"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadActionLog = loadActionLog;
exports.writeAction = writeAction;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
async function loadActionLog(handID, actionID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.ACTION_LOG,
        Key: {
            [fields_1.FIELDS.ACTION_LOG.HAND_ID]: { S: handID },
            [fields_1.FIELDS.ACTION_LOG.ACTION_ID]: { N: actionID.toString() },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function writeAction(entry) {
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.ACTION_LOG,
        Item: (0, util_dynamodb_1.marshall)(entry),
        ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.ACTION_LOG.ACTION_ID})`,
    }));
}
