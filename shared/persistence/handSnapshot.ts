import {GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {FIELDS} from './dynamo/fields';
import {TABLES} from './dynamo/tables';
import {GameState, HandSnapshot} from './types';


export async function loadHandSnapshot(
    tableId: string, handSeq: number): Promise<HandSnapshot|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.HAND_SNAPSHOTS,
    Key: {
      [FIELDS.HAND_SNAPSHOTS.TABLE_ID]: {S: tableId},
      [FIELDS.HAND_SNAPSHOTS.HAND_SEQ]: {N: handSeq.toString()},
    },
  }));

  return result.Item ? (unmarshall(result.Item) as HandSnapshot) : null;
}

export async function writeHandSnapshot(
    tableID: string, handSeq: number, gameState: GameState): Promise<void> {
  const item: HandSnapshot = {tableID, handSeq, gameState};

  await ddb.send(new PutItemCommand({
    TableName: TABLES.HAND_SNAPSHOTS,
    Item: marshall(item),
    ConditionExpression: `attribute_not_exists(${
        FIELDS.HAND_SNAPSHOTS.TABLE_ID}) AND attribute_not_exists(${
        FIELDS.HAND_SNAPSHOTS.HAND_SEQ})`
  }));
}