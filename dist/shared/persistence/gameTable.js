"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadGameTable = loadGameTable;
exports.listTables = listTables;
exports.updateTableStatus = updateTableStatus;
exports.updateTableConfig = updateTableConfig;
exports.updateCurrentInterroundActionSeq = updateCurrentInterroundActionSeq;
exports.createTable = createTable;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadGameTable(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Key: {
            tableID: { S: tableID },
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
        names['#status'] = 'status';
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
            tableID: { S: tableID },
        },
        UpdateExpression: 'SET #status = :status',
        ExpressionAttributeNames: {
            '#status': 'status',
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
            tableID: { S: tableID },
        },
        UpdateExpression: 'SET #config = :config',
        ExpressionAttributeNames: {
            '#config': 'config',
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
            tableID: { S: tableID },
        },
        UpdateExpression: 'SET currentInterroundActionSeq = :next',
        ConditionExpression: 'currentInterroundActionSeq = :expected',
        ExpressionAttributeValues: {
            ':expected': { N: expectedSeq.toString() },
            ':next': { N: nextSeq.toString() },
        },
    }));
}
async function createTable(tableID, ownerID, config) {
    const table = {
        tableID,
        ownerID,
        status: 'Waiting',
        config,
        interRoundActionSeq: 0,
        createdAt: Date.now(),
    };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.GAME_TABLES,
        Item: (0, util_dynamodb_1.marshall)(table),
        ConditionExpression: 'attribute_not_exists(tableID)',
    }));
    return tableID;
}
