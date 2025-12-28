import {randomUUID} from 'crypto';

import {ConflictError, NotFoundError, UnauthorizedError} from '../../shared/errors';
import {loadGameState} from '../../shared/persistence/gameState'
import {createTable, listTables, loadGameTable, updateTableConfig, updateTableStatus} from '../../shared/persistence/gameTable';
import {enqueueInterRoundAction} from '../../shared/persistence/interRoundActionQueue';
import {GameTable, InterRoundActions, InterRoundActionType, TableConfig, TableListFilter} from '../../shared/persistence/types';
import {getMe} from '../user/service'

async function enqueueOrProcessInterRoundAction(
    table: GameTable, type: InterRoundActionType, userID: string,
    payload: any): Promise<void> {
  const gameState = await loadGameState(table.tableID);
  // if (gameState?.street === 'Interround') {
  //   await processInterRoundAction(table.tableID, type, payload);
  //  } else {
  await enqueueInterRoundAction(
      table.tableID, table.interRoundActionSeq + 1, userID, type, payload);
  //}
}

// DONE
export async function createGameTable(
    ownerID: string, config: TableConfig): Promise<string> {
  const tableID = randomUUID();
  return await createTable(tableID, ownerID, config);
}

export async function getTable(tableID: string): Promise<GameTable> {
  const table = await loadGameTable(tableID);
  if (!table) throw new NotFoundError('Table not found');
  return table;
}

export async function connectToTable(tableID: string): Promise<GameTable> {
  const table = await loadGameTable(tableID);
  if (!table) throw new NotFoundError('Table not found');
  // WebSocket connection happens separately via $connect route
  // This just validates access and returns table data

  // Any validation (banned users, private tables, etc.)

  return table;
}

// DONE
export async function listGameTables(filter?: TableListFilter):
    Promise<GameTable[]> {
  // anything else here?
  return listTables(filter);
}


export async function takeSeat(
    tableID: string, userID: string, buyIn: number): Promise<void> {
  // QUESTION: Should this be a call to the auth service, persistence
  // layer, or a user service inside table?
  const user = await getMe(userID);
  const table = await loadGameTable(tableID);

  if (user.balance < buyIn) throw new ConflictError('Insufficient funds');
  if (!table) throw new NotFoundError('Table not found');

  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.JOIN, userID, buyIn);
}

// DONE
export async function togglePause(
    tableID: string, userID: string): Promise<void> {
  const table = await getTable(tableID)

  if (table.ownerID !=
      userID) throw new UnauthorizedError('Only table owner can pause game');
  if (table.status === 'Running') {
    await updateTableStatus(tableID, 'Paused');
  } else if (table.status === 'Paused') {
    await updateTableStatus(tableID, 'Running');
  } else
    throw new ConflictError('INVALID: Game has not started or is ended');
}


// DONE
export async function updateConfig(
    tableID: string, userID: string, config: TableConfig): Promise<void> {
  const table = await loadGameTable(tableID);

  if (!table) throw new NotFoundError('Table not found');
  if (table.ownerID !== userID) throw new UnauthorizedError('Unauthorized');
  if (table.status === 'Ended')
    throw new ConflictError('Cannot update ended game');

  // Enqueue the config update
  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.CONFIG_UPDATE, userID, config);

  // Also update the table's config immediately (so new players see it)
  await updateTableConfig(tableID, config);
}

// DONE
export async function endGame(tableID: string, userID: string): Promise<void> {
  const table = await getTable(tableID);
  if (table.ownerID !== userID)
    throw new UnauthorizedError('Only table owner can end game');
  if (table.status === 'Ended')
    throw new ConflictError('Cannot end ended game');

  await updateTableStatus(tableID, 'Ended');
}