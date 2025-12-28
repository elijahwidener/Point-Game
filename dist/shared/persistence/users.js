"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBalanceUpdate = exports.createUser = exports.getAuthByUsername = exports.loadUser = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadUser(userID) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.USERS,
        Key: {
            userID: { S: userID },
        },
    }));
    if (!result.Item)
        return null;
    const user = (0, util_dynamodb_1.unmarshall)(result.Item);
    return {
        userID: user.userID,
        username: user.username,
        balance: user.balance,
    };
}
exports.loadUser = loadUser;
async function getAuthByUsername(username) {
    const result = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.USERS,
        IndexName: 'UsernameIndex',
        KeyConditionExpression: 'username = :u',
        ExpressionAttributeValues: {
            ':u': { S: username },
        },
        Limit: 1,
    }));
    if (!result.Items || result.Items.length === 0) {
        return null;
    }
    const user = (0, util_dynamodb_1.unmarshall)(result.Items[0]);
    return {
        userID: user.userID,
        passwordHash: user.passwordHash,
    };
}
exports.getAuthByUsername = getAuthByUsername;
async function createUser(userID, username, passwordHash, balance) {
    const user = {
        userID,
        username,
        passwordHash,
        balance,
    };
    await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
        TableName: tables_1.TABLES.USERS,
        Item: (0, util_dynamodb_1.marshall)(user),
        ConditionExpression: 'attribute_not_exists(userID)',
    }));
    return userID;
}
exports.createUser = createUser;
async function applyBalanceUpdate(userID, delta) {
    const result = await client_1.ddb.send(new client_dynamodb_1.UpdateItemCommand({
        TableName: tables_1.TABLES.USERS,
        Key: {
            userID: { S: userID },
        },
        UpdateExpression: 'ADD balance :delta',
        ConditionExpression: 'attribute_exists(userID) AND balance >= :min',
        ExpressionAttributeValues: {
            ':delta': { N: delta.toString() },
            ':min': { N: '0' },
        },
        ReturnValues: 'UPDATED_NEW',
    }));
    const newBalance = result.Attributes?.balance?.N;
    if (newBalance === undefined) {
        throw new Error('Balance update failed');
    }
    return Number(newBalance);
}
exports.applyBalanceUpdate = applyBalanceUpdate;
