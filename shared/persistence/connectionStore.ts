import {DeleteItemCommand, GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

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

export async function registerConnection(
    tableID: string, connectionID: string, playerID: string): Promise<void> {
  const item: ConnectionStore = {tableID, connectionID, playerID};

  await ddb.send(new PutItemCommand({
    TableName: TABLES.CONNECTION_STORE,
    Item: marshall(item),
    ConditionExpression:
        'attribute_not_exists(tableID) AND attribute_not_exists(connectionID)'
  }));
}

export async function removeConnection(
    tableID: string, connectionID: string): Promise<void> {
  await ddb.sent(new DeleteItemCommand({
    TableName: TABLES.CONNECTION_STORE,
    Key: {
      tableID: {S: tableID},
      connectionID: {S: connectionID},
    },
  }));
}
