"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConnection = loadConnection;
exports.loadConnectionByConnectionID = loadConnectionByConnectionID;
exports.loadTableConnections = loadTableConnections;
exports.registerConnection = registerConnection;
exports.removeConnection = removeConnection;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
async function loadConnection(tableID, connectionID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.CONNECTION_STORE,
        Key: {
            [fields_1.FIELDS.CONNECTION_STORE.TABLE_ID]: { S: tableID },
            [fields_1.FIELDS.CONNECTION_STORE.CONNECTION_ID]: { S: connectionID },
        },
    }));
    if (!result.Item) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Item);
}
async function loadConnectionByConnectionID(connectionID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.CONNECTION_STORE,
        IndexName: 'ConnectionIDIndex',
        KeyConditionExpression: `${fields_1.FIELDS.CONNECTION_STORE.CONNECTION_ID} = :ID`,
        ExpressionAttributeValues: { ':ID': { S: connectionID } }
    }));
    if (!result.Items || result.Items.length === 0) {
        return null;
    }
    return (0, util_dynamodb_1.unmarshall)(result.Items[0]);
}
async function loadTableConnections(tableID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.CONNECTION_STORE,
        KeyConditionExpression: `${fields_1.FIELDS.CONNECTION_STORE.TABLE_ID} = :tableID`,
        ExpressionAttributeValues: {
            ':tableID': { S: tableID },
        },
    }));
    if (!result.Items || result.Items.length === 0) {
        return [];
    }
    return result.Items.map(item => (0, util_dynamodb_1.unmarshall)(item));
}
async function registerConnection(tableID, connectionID, playerID) {
    const item = { tableID, connectionID, playerID };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.CONNECTION_STORE,
        Item: (0, util_dynamodb_1.marshall)(item),
        ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.CONNECTION_STORE.TABLE_ID}) AND attribute_not_exists(${fields_1.FIELDS.CONNECTION_STORE.CONNECTION_ID})`
    }));
}
async function removeConnection(tableID, connectionID) {
    await client_1.ddb.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: tables_1.TABLES.CONNECTION_STORE,
        Key: {
            [fields_1.FIELDS.CONNECTION_STORE.TABLE_ID]: { S: tableID },
            [fields_1.FIELDS.CONNECTION_STORE.CONNECTION_ID]: { S: connectionID },
        },
    }));
}
