import {DeleteItemCommand, GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {Timer} from './types';


export async function loadTimer(
    tableID: string, timerSeq: number): Promise<Timer|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.TIMERS,
    Key: {
      tableID: {S: tableID},
      timerSeq: {N: timerSeq.toString()},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as Timer;
}


export async function writeTimer(
    tableID: string, timerSeq: number, playerID: string): Promise<void> {
  const deadline = Date.now();
  const item: Timer = {tableID, timerSeq, playerID, deadline};

  await ddb.send(new PutItemCommand({
    TableName: TABLES.TIMERS,
    Item: marshall(item),
    ConditionExpression:
        'attribute_not_exists(tableID) AND attribute_not_exists(timerSeq)'
  }));
}

export async function deleteTimer(
    tableID: string, timerSeq: number): Promise<void> {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLES.TIMERS,
    Key: {
      tableID: {S: tableID},
      timerSeq: {N: timerSeq.toString()},
    },
  }));
}