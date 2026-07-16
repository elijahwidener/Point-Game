import {DeleteItemCommand, GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {FIELDS} from './dynamo/fields';
import {TABLES} from './dynamo/tables';
import {Timer} from './types';


export async function loadTimer(
    tableID: string, timerSeq: number): Promise<Timer|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.TIMERS,
    Key: {
      [FIELDS.TIMERS.TABLE_ID]: {S: tableID},
      [FIELDS.TIMERS.TIMER_SEQ]: {N: timerSeq.toString()},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as Timer;
}


// How long a player gets to act, in ms. The server enforces slightly longer
// than the clock the client displays (30s) so that network latency and the
// client's own countdown rounding cannot fold a player who acted in time. The
// extra second is that grace window.
export const TURN_MS = 31000;

/**
 * Writes the timer record for a turn.
 *
 * @returns The deadline (epoch ms) the turn expires at
 */
export async function writeTimer(
    tableID: string, timerSeq: number, playerID: string): Promise<number> {
  const deadline = Date.now() + TURN_MS;
  const item: Timer = {tableID, timerSeq, playerID, deadline};

  await ddb.send(new PutItemCommand({
    TableName: TABLES.TIMERS,
    Item: marshall(item),
    ConditionExpression: `attribute_not_exists(${
        FIELDS.TIMERS.TABLE_ID}) AND attribute_not_exists(${
        FIELDS.TIMERS.TIMER_SEQ})`
  }));

  return deadline;
}

export async function deleteTimer(
    tableID: string, timerSeq: number): Promise<void> {
  await ddb.send(new DeleteItemCommand({
    TableName: TABLES.TIMERS,
    Key: {
      [FIELDS.TIMERS.TABLE_ID]: {S: tableID},
      [FIELDS.TIMERS.TIMER_SEQ]: {N: timerSeq.toString()},
    },
  }));
}