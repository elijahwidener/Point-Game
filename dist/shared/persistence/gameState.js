"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGameState = loadGameState;
exports.createGameState = createGameState;
exports.updateGameState = updateGameState;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
async function loadGameState(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.GAME_STATE,
        Key: {
            [fields_1.FIELDS.GAME_STATE.TABLE_ID]: { S: tableID },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function createGameState(initialState) {
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.GAME_STATE,
        Item: (0, util_dynamodb_1.marshall)(initialState),
        ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.GAME_STATE.TABLE_ID})`,
    }));
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
        Item: (0, util_dynamodb_1.marshall)(nextState, { removeUndefinedValues: true }),
        ConditionExpression: `${fields_1.FIELDS.GAME_STATE.GAME_SEQ} = :expectedSeq`,
        ExpressionAttributeValues: {
            ':expectedSeq': { N: expectedGameSeq.toString() },
        },
    }));
    return expectedGameSeq + 1;
}
