import {GetItemCommand, PutItemCommand, ScanCommand, UpdateItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {GameTable, GameTableStatus, TableConfig, TableListFilter} from './types';


export async function loadGameTable(tableID: string): Promise<GameTable|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.GAME_TABLES,
    Key: {
      tableID: {S: tableID},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as GameTable;
}


export async function listTables(filter: TableListFilter = {}):
    Promise<GameTable[]> {
  const expressions: string[] = [];
  const names: Record<string, string> = {};
  const values: Record<string, any> = {};

  if (filter.status) {
    expressions.push('#status = :status');
    names['#status'] = 'status';
    values[':status'] = {S: filter.status};
  }

  const result = await ddb.send(new ScanCommand({
    TableName: TABLES.GAME_TABLES,
    FilterExpression: expressions.length ? expressions.join(' AND ') :
                                           undefined,
    ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
    ExpressionAttributeValues: Object.keys(values).length ? values : undefined,
  }));

  return (result.Items ?? []).map((item: any) => unmarshall(item) as GameTable);
}

export async function updateTableStatus(
    tableID: string, status: GameTableStatus): Promise<void> {
  await ddb.send(new UpdateItemCommand({
    TableName: TABLES.GAME_TABLES,
    Key: {
      tableID: {S: tableID},
    },
    UpdateExpression: 'SET #status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
    },
    ExpressionAttributeValues: {
      ':status': {S: status},
    },
  }));
}

export async function updateTableConfig(
    tableID: string, config: TableConfig): Promise<void> {
  await ddb.send(new UpdateItemCommand({
    TableName: TABLES.GAME_TABLES,
    Key: {
      tableID: {S: tableID},
    },
    UpdateExpression: 'SET #config = :config',
    ExpressionAttributeNames: {
      '#config': 'config',
    },
    ExpressionAttributeValues: {
      ':config': marshall(config),
    },
  }));
}

export async function updateCurrentInterroundActionSeq(
    tableID: string, expectedSeq: number, nextSeq: number): Promise<void> {
  await ddb.send(new UpdateItemCommand({
    TableName: TABLES.GAME_TABLES,
    Key: {
      tableID: {S: tableID},
    },
    UpdateExpression: 'SET currentInterroundActionSeq = :next',
    ConditionExpression: 'currentInterroundActionSeq = :expected',
    ExpressionAttributeValues: {
      ':expected': {N: expectedSeq.toString()},
      ':next': {N: nextSeq.toString()},
    },
  }));
}


export async function createTable(
    tableID: string, ownerID: string, config: TableConfig): Promise<string> {
  const table: GameTable = {
    tableID,
    ownerID,
    status: 'Waiting',
    config,
    interRoundActionSeq: 0,
    createdAt: Date.now(),
  };

  await ddb.send(new PutItemCommand({
    TableName: TABLES.GAME_TABLES,
    Item: marshall(table),
    ConditionExpression: 'attribute_not_exists(tableID)',

  }));
  return tableID;
}