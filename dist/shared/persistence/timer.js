"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadTimer = loadTimer;
exports.writeTimer = writeTimer;
exports.deleteTimer = deleteTimer;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
async function loadTimer(tableID, timerSeq) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Key: {
            [fields_1.FIELDS.TIMERS.TABLE_ID]: { S: tableID },
            [fields_1.FIELDS.TIMERS.TIMER_SEQ]: { N: timerSeq.toString() },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function writeTimer(tableID, timerSeq, playerID) {
    const deadline = Date.now();
    const item = { tableID, timerSeq, playerID, deadline };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Item: (0, util_dynamodb_1.marshall)(item),
        ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.TIMERS.TABLE_ID}) AND attribute_not_exists(${fields_1.FIELDS.TIMERS.TIMER_SEQ})`
    }));
}
async function deleteTimer(tableID, timerSeq) {
    await client_1.ddb.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: tables_1.TABLES.TIMERS,
        Key: {
            [fields_1.FIELDS.TIMERS.TABLE_ID]: { S: tableID },
            [fields_1.FIELDS.TIMERS.TIMER_SEQ]: { N: timerSeq.toString() },
        },
    }));
}
