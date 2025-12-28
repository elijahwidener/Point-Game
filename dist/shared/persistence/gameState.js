"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGameState = loadGameState;
exports.updateGameState = updateGameState;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadGameState(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.GAME_STATE,
        Key: {
            tableID: { S: tableID },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function updateGameState(tableID, mutatedState, expectedGameSeq, timerSeq) {
    const nextState = {
        ...mutatedState,
        tableID,
        gameSeq: expectedGameSeq + 1,
        ...(timerSeq !== undefined ? { timerSeq } : {}),
    };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.GAME_STATE,
        Item: (0, util_dynamodb_1.marshall)(nextState),
        ConditionExpression: 'gameSeq = :expectedSeq',
        ExpressionAttributeValues: {
            ':expectedSeq': { N: expectedGameSeq.toString() },
        },
    }));
    return expectedGameSeq + 1;
}
