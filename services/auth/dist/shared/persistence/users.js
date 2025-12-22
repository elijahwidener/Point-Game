"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadUser = loadUser;
exports.getAuthByUsername = getAuthByUsername;
exports.createUser = createUser;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const client_1 = require("./dynamo/client");
const tables_1 = require("./dynamo/tables");
async function loadUser(userId) {
    const result = await client_1.ddb.send(new client_dynamodb_1.GetItemCommand({
        TableName: tables_1.TABLES.USERS,
        Key: {
            userId: { S: userId },
        },
    }));
    return result.Item ? (0, util_dynamodb_1.unmarshall)(result.Item) : null;
}
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
