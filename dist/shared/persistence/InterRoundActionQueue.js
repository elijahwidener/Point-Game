"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadInterRoundActions = loadInterRoundActions;
exports.enqueueInterRoundAction = enqueueInterRoundAction;
exports.popInterRoundAction = popInterRoundAction;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
// loads all actions in queue
async function loadInterRoundActions(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        KeyConditionExpression: 'tableID = :tableID',
        ExpressionAttributeValues: {
            ':tableID': { S: tableID },
        },
        ScanIndexForward: true, // ascending actionSeq
    }));
    return (result.Items ?? [])
        .map((item) => (0, util_dynamodb_1.unmarshall)(item));
}
async function enqueueInterRoundAction(tableID, actionSeq, userID, type, payload) {
    const item = {
        tableID,
        actionSeq,
        userID,
        type,
        payload,
    };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        Item: (0, util_dynamodb_1.marshall)(item),
        ConditionExpression: 'attribute_not_exists(tableID) AND attribute_not_exists(actionSeq)',
    }));
    return actionSeq;
}
// returns and removes the next action in queue
async function popInterRoundAction(tableID) {
    const res = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        KeyConditionExpression: 'tableID = :tableID',
        ExpressionAttributeValues: {
            ':tableID': { S: tableID },
        },
        ScanIndexForward: true, // lowest action first
        Limit: 1,
    }));
    if (!res.Items || res.Items.length == 0) {
        return undefined;
    }
    const action = (0, util_dynamodb_1.unmarshall)(res.Items[0]);
    await client_1.ddb.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        Key: {
            tableID: { S: tableID },
            actionSeq: { N: action.actionSeq.toString() },
        },
    }));
}
