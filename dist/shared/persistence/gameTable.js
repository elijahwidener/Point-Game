"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGameTable = loadGameTable;
exports.listTables = listTables;
exports.updateTableStatus = updateTableStatus;
exports.updateTableConfig = updateTableConfig;
exports.updateCurrentInterroundActionSeq = updateCurrentInterroundActionSeq;
exports.createTable = createTable;
exports.updatePlayerCount = updatePlayerCount;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
async function loadGameTable(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            [fields_1.FIELDS.GAME_TABLES.TABLE_ID]: { S: tableID },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function listTables(filter = {}) {
    const expressions = [];
    const names = {};
    const values = {};
    if (filter.status) {
        expressions.push('#status = :status');
        names['#status'] = fields_1.FIELDS.GAME_TABLES.STATUS;
        values[':status'] = { S: filter.status };
    }
    const result = await client_1.ddb.send(new client_dynamodb_1.ScanCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        FilterExpression: expressions.length ? expressions.join(' AND ') :
            undefined,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
    }));
    return (result.Items ?? []).map((item) => (0, util_dynamodb_1.unmarshall)(item));
}
async function updateTableStatus(tableID, status) {
    await client_1.ddb.send(new client_dynamodb_1.UpdateItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            [fields_1.FIELDS.GAME_TABLES.TABLE_ID]: { S: tableID },
        },
        UpdateExpression: `SET #status = :status`,
        ExpressionAttributeNames: {
            '#status': fields_1.FIELDS.GAME_TABLES.STATUS,
        },
        ExpressionAttributeValues: {
            ':status': { S: status },
        },
    }));
}
async function updateTableConfig(tableID, config) {
    await client_1.ddb.send(new client_dynamodb_1.UpdateItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            [fields_1.FIELDS.GAME_TABLES.TABLE_ID]: { S: tableID },
        },
        UpdateExpression: `SET #config = :config`,
        ExpressionAttributeNames: {
            '#config': fields_1.FIELDS.GAME_TABLES.CONFIG,
        },
        ExpressionAttributeValues: {
            ':config': { M: (0, util_dynamodb_1.marshall)(config) },
        },
    }));
}
async function updateCurrentInterroundActionSeq(tableID, expectedSeq, nextSeq) {
    await client_1.ddb.send(new client_dynamodb_1.UpdateItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            [fields_1.FIELDS.GAME_TABLES.TABLE_ID]: { S: tableID },
        },
        UpdateExpression: `SET ${fields_1.FIELDS.GAME_TABLES.INTER_ROUND_ACTION_SEQ} = :next`,
        ConditionExpression: `${fields_1.FIELDS.GAME_TABLES.INTER_ROUND_ACTION_SEQ} = :expected`,
        ExpressionAttributeValues: {
            ':expected': { N: expectedSeq.toString() },
            ':next': { N: nextSeq.toString() },
        },
    }));
}
async function createTable(tableID, ownerID, tableName, config) {
    const table = {
        tableID,
        ownerID,
        name: tableName,
        status: 'Waiting',
        playerCount: 0,
        config,
        interRoundActionSeq: 0,
        createdAt: Date.now(),
    };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Item: (0, util_dynamodb_1.marshall)(table),
        ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.GAME_TABLES.TABLE_ID})`,
    }));
    return tableID;
}
async function updatePlayerCount(tableID, delta) {
    await client_1.ddb.send(new client_dynamodb_1.UpdateItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            [fields_1.FIELDS.GAME_TABLES.TABLE_ID]: { S: tableID },
        },
        UpdateExpression: `SET ${fields_1.FIELDS.GAME_TABLES.PLAYER_COUNT} = ${fields_1.FIELDS.GAME_TABLES.PLAYER_COUNT} + :delta`,
        ExpressionAttributeValues: {
            ':delta': { N: delta.toString() },
        },
    }));
}
