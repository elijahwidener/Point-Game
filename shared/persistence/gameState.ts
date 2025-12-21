import {GetItemCommand, PutItemCommand} from '@aws-sdk/client-dynamodb';
import {marshall, unmarshall} from '@aws-sdk/util-dynamodb';

import {ddb} from './dynamo/client';
import {TABLES} from './dynamo/tables';
import {GameState} from './types';

export async function loadGameState(tableID: string): Promise<GameState|null> {
  const result = await ddb.send(new GetItemCommand({
    TableName: TABLES.GAME_STATE,
    Key: {
      tableID: {S: tableID},
    },
  }));
  if (!result.Item) {
    return null;
  }
  return unmarshall(result.Item) as GameState;
}


export async function updateGameState(
    tableID: string, mutatedState: GameState, expectedGameSeq: number,
    timerSeq?: number): Promise<number> {
  const nextState = {
    ...mutatedState,
    tableID,
    gameSeq: expectedGameSeq + 1,
    ...GetItemCommand(timerSeq !== undefined ? {timerSeq} : {}),
  };

  await ddb.send(new PutItemCommand({
    TableName: TABLES.GAME_STATE,
    Item: marshall(nextState),
    ConditionalExpression: 'gameSeq = :expectedSeq',
    ExpressionAttributeValues: {
      ':expectedSeq': {N: expectedGameSeq.toString()},
    },
  }));

  return expectedGameSeq + 1;
}