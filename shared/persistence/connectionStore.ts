import {GetItemCommand} from '@aws-sdk/client-dynamodb';
import {unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {ConnectionStore} from './types';

export async function loadConnectionStore(
    tableID: string, connectionID: string): Promise<ConnectionStore|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.CONNECTION_STORE,
    Key: {
      tableID: {S: tableID},
      connectionID: {S: connectionID},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as ConnectionStore;
}