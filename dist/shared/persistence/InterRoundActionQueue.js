"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadInterRoundActions = loadInterRoundActions;
exports.enqueueInterRoundAction = enqueueInterRoundAction;
exports.popInterRoundAction = popInterRoundAction;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const logger_1 = require("../utils/logger");
const client_1 = require("./dynamo/client");
const fields_1 = require("./dynamo/fields");
const tables_1 = require("./dynamo/tables");
// loads all actions in queue
async function loadInterRoundActions(tableID) {
    const log = logger_1.logger.child({ tableID, fn: 'loadInterRoundActions' });
    log.info('Loading interround actions');
    const result = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        KeyConditionExpression: `${fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID} = :tableID`,
        ExpressionAttributeValues: {
            ':tableID': { S: tableID },
        },
        ScanIndexForward: true,
    }));
    const actions = (result.Items ?? [])
        .map((item) => (0, util_dynamodb_1.unmarshall)(item));
    log.info('Loaded actions', {
        count: actions.length,
        actions: actions.map(a => ({ type: a.type, actionSeq: a.actionSeq, userID: a.userID })),
    });
    return actions;
}
async function enqueueInterRoundAction(tableID, actionSeq, userID, type, payload) {
    const log = logger_1.logger.child({ tableID, fn: 'enqueueInterRoundAction' });
    const item = {
        tableID,
        actionSeq,
        userID,
        type,
        payload,
    };
    log.info('Enqueueing interround action', { type, userID, actionSeq, payload });
    try {
        await client_1.ddb.send(new client_dynamodb_1.PutItemCommand({
            TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
            Item: (0, util_dynamodb_1.marshall)(item),
            ConditionExpression: `attribute_not_exists(${fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID}) AND attribute_not_exists(${fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.ACTION_SEQ})`,
        }));
        log.info('Action enqueued successfully', { actionSeq });
    }
    catch (error) {
        log.error('Failed to enqueue action', {
            error: error.message,
            name: error.name,
        });
        throw error;
    }
    return actionSeq;
}
// returns and removes the next action in queue
async function popInterRoundAction(tableID) {
    const log = logger_1.logger.child({ tableID, fn: 'popInterRoundAction' });
    log.info('Popping next action from queue');
    const res = await client_1.ddb.send(new client_dynamodb_1.QueryCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        KeyConditionExpression: `${fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID} = :tableID`,
        ExpressionAttributeValues: {
            ':tableID': { S: tableID },
        },
        ScanIndexForward: true,
        Limit: 1,
    }));
    if (!res.Items || res.Items.length == 0) {
        log.info('Queue is empty');
        return undefined;
    }
    const action = (0, util_dynamodb_1.unmarshall)(res.Items[0]);
    log.info('Found action to pop', { type: action.type, actionSeq: action.actionSeq });
    await client_1.ddb.send(new client_dynamodb_1.DeleteItemCommand({
        TableName: tables_1.TABLES.INTER_ROUND_ACTION_QUEUE,
        Key: {
            [fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID]: { S: tableID },
            [fields_1.FIELDS.INTER_ROUND_ACTION_QUEUE.ACTION_SEQ]: { N: action.actionSeq.toString() },
        },
    }));
    log.info('Action deleted from queue', { type: action.type, actionSeq: action.actionSeq });
    return action;
}
