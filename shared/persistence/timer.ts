import {GetItemCommand} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';

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