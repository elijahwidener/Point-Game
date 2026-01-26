import {AttributeValue, DeleteItemCommand, PutItemCommand, QueryCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {logger} from '../utils/logger';

import {ddb} from './dynamo/client';
import {FIELDS} from './dynamo/fields';
import {TABLES} from './dynamo/tables';
import {InterRoundAction, InterRoundActionType} from './types';

// loads all actions in queue
export async function loadInterRoundActions(tableID: string):
    Promise<InterRoundAction[]> {
  const log = logger.child({tableID, fn: 'loadInterRoundActions'});

  log.info('Loading interround actions');

  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    KeyConditionExpression:
        `${FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID} = :tableID`,
    ExpressionAttributeValues: {
      ':tableID': {S: tableID},
    },
    ScanIndexForward: true,
  }));

  const actions = (result.Items ?? [])
                      .map(
                          (item: Record<string, AttributeValue>) =>
                              unmarshall(item) as InterRoundAction);

  log.info('Loaded actions', {
    count: actions.length,
    actions: actions.map(
        a => ({type: a.type, actionSeq: a.actionSeq, userID: a.userID})),
  });

  return actions;
}

export async function enqueueInterRoundAction(
    tableID: string, actionSeq: number, userID: string,
    type: InterRoundActionType, payload: any[]): Promise<number> {
  const log = logger.child({tableID, fn: 'enqueueInterRoundAction'});

  const item: InterRoundAction = {
    tableID,
    actionSeq,
    userID,
    type,
    payload,
  };
  log.info('Enqueueing interround action', {type, userID, actionSeq, payload});

  try {
    await ddb.send(new PutItemCommand({
      TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
      Item: marshall(item),
      ConditionExpression: `attribute_not_exists(${
          FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID}) AND attribute_not_exists(${
          FIELDS.INTER_ROUND_ACTION_QUEUE.ACTION_SEQ})`,
    }));
    log.info('Action enqueued successfully', {actionSeq});
  } catch (error) {
    log.error('Failed to enqueue action', {
      error: (error as Error).message,
      name: (error as Error).name,
    });
    throw error;
  }

  return actionSeq;
}

// returns and removes the next action in queue
export async function popInterRoundAction(tableID: string):
    Promise<InterRoundAction|undefined> {
  const log = logger.child({tableID, fn: 'popInterRoundAction'});

  log.info('Popping next action from queue');

  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    KeyConditionExpression:
        `${FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID} = :tableID`,
    ExpressionAttributeValues: {
      ':tableID': {S: tableID},
    },
    ScanIndexForward: true,
    Limit: 1,
  }));

  if (!res.Items || res.Items.length == 0) {
    log.info('Queue is empty');
    return undefined;
  }

  const action = unmarshall(res.Items[0]) as InterRoundAction;
  log.info(
      'Found action to pop', {type: action.type, actionSeq: action.actionSeq});

  await ddb.send(new DeleteItemCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    Key: {
      [FIELDS.INTER_ROUND_ACTION_QUEUE.TABLE_ID]: {S: tableID},
      [FIELDS.INTER_ROUND_ACTION_QUEUE.ACTION_SEQ]:
          {N: action.actionSeq.toString()},
    },
  }));

  log.info(
      'Action deleted from queue',
      {type: action.type, actionSeq: action.actionSeq});
  return action;
}