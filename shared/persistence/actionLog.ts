import {GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {FIELDS} from './dynamo/fields';
import {TABLES} from './dynamo/tables';
import {ActionLog} from './types';

export async function loadActionLog(
    handID: string, actionID: number): Promise<ActionLog|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.ACTION_LOG,
    Key: {
      [FIELDS.ACTION_LOG.HAND_ID]: {S: handID},
      [FIELDS.ACTION_LOG.ACTION_ID]: {N: actionID.toString()},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as ActionLog;
}

export async function writeAction(entry: ActionLog): Promise<void> {
  await ddb.send(new PutItemCommand({
    TableName: TABLES.ACTION_LOG,
    Item: marshall(entry),
    ConditionExpression: `attribute_not_exists(${FIELDS.ACTION_LOG.ACTION_ID})`,
  }));
}