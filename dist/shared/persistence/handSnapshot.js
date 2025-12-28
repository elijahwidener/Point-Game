"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadHandSnapshot = loadHandSnapshot;
exports.writeHandSnapshot = writeHandSnapshot;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadHandSnapshot(tableId, handSeq) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.HAND_SNAPSHOTS,
        Key: {
            tableId: { S: tableId },
            handSeq: { N: handSeq.toString() },
        },
    }));
    return result.Item ? (0, util_dynamodb_1.unmarshall)(result.Item) : null;
}
async function writeHandSnapshot(tableID, handSeq, gameState) {
    const item = { tableID, handSeq, gameState };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.HAND_SNAPSHOTS,
        Item: (0, util_dynamodb_1.marshall)(item),
        ConditionExpression: 'attribute_not_exists(tableID) AND attribute_not_exists(handSeq)'
    }));
}
