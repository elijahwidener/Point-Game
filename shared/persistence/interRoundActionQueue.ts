import {AttributeValue, DeleteItemCommand, PutItemCommand, QueryCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {InterRoundAction, InterRoundActionType} from './types';

export async function loadInterRoundActions(tableID: string):
    Promise<InterRoundAction[]> {
  const result = await ddb.send(new QueryCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    KeyConditionExpression: 'tableID = :tableID',
    ExpressionAttributeValues: {
      ':tableID': {S: tableID},
    },
    ScanIndexForward: true,  // ascending actionSeq
  }));

  return (result.Items ?? [])
      .map(
          (item: Record<string, AttributeValue>) =>
              unmarshall(item) as InterRoundAction);
}

export async function enqueueInterRoundAction(
    tableID: string, actionSeq: number, userID: string,
    type: InterRoundActionType, payload: any[]): Promise<number> {
  const item: InterRoundAction = {
    tableID,
    actionSeq,
    userID,
    type,
    payload,
  };

  await ddb.send(new PutItemCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    Item: marshall(item),
    ConditionExpression:
        'attribute_not_exists(tableID) AND attribute_not_exists(actionSeq)',
  }));

  return actionSeq;
}

export async function popInterRoundAction(tableID: string):
    Promise<InterRoundAction|undefined> {
  const res = await ddb.send(new QueryCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    KeyConditionExpression: 'tableID = :tableID',
    ExpressionAttributeValues: {
      ':tableID': {S: tableID},
    },
    ScanIndexForward: true,  // lowest action first
    Limit: 1,
  }));

  if (!res.Items || res.Items.length == 0) {
    return undefined;
  }

  const action = unmarshall(res.Items[0]) as InterRoundAction;

  await ddb.send(new DeleteItemCommand({
    TableName: TABLES.INTER_ROUND_ACTION_QUEUE,
    Key: {
      tableID: {S: tableID},
      actionSeq: {N: action.actionSeq.toString()},
    },
  }));
}
