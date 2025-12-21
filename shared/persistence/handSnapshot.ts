import {GetItemCommand} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {HandSnapshot} from './types';


export async function loadHandSnapshot(
    tableId: string, handSeq: number): Promise<HandSnapshot|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.HAND_SNAPSHOTS,
    Key: {
      tableId: {S: tableId},
      handSeq: {N: handSeq.toString()},
    },
  }));

  return result.Item ? (unmarshall(result.Item) as HandSnapshot) : null;
}
