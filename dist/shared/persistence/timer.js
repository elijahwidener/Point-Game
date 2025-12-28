"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTimer = exports.writeTimer = exports.loadTimer = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadTimer(tableID, timerSeq) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Key: {
            tableID: { S: tableID },
            timerSeq: { N: timerSeq.toString() },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
exports.loadTimer = loadTimer;
async function writeTimer(tableID, timerSeq, playerID) {
    const deadline = Date.now();
    const item = { tableID, timerSeq, playerID, deadline };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Item: (0, util_dynamodb_1.marshall)(item),
        ConditionExpression: 'attribute_not_exists(tableID) AND attribute_not_exists(timerSeq)'
    }));
}
exports.writeTimer = writeTimer;
async function deleteTimer(tableID, timerSeq) {
    await client_1.ddb.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Key: {
            tableID: { S: tableID },
            timerSeq: { N: timerSeq.toString() },
        },
    }));
}
exports.deleteTimer = deleteTimer;
