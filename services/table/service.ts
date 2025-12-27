import {randomUUID} from 'crypto';

import {ConflictError, NotFoundError, UnauthorizedError} from '../../shared/errors';
import {loadGameState} from '../../shared/persistence/gameState'
import {createTable, loadGameTable, updateTableConfig, updateTableStatus} from '../../shared/persistence/gameTable';
import {enqueueInterRoundAction} from '../../shared/persistence/InterRoundActionQueue';
import {GameTable, InterRoundActionType, TableConfig} from '../../shared/persistence/types';


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


export async function listTables(filter?: TableListFilter):
    Promise<GameTable[]> {}
export async function sitDown(
    tableID: string, userID: string, stack: number): Promise<void> {}
export async function standUp(tableID: string, userID: string): Promise<void> {}

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


// PROESS INTEROUND NEEDS IMPLEMENT
export async function enqueueOrProcessInterRoundAction(
    tableID: string, type: InterRoundActionType, userID: string,
    payload: any): Promise<void> {
  const gameState = await loadGameState(tableID);
  const table = await getTable(tableID);

  // If we're in Interround phase, process immediately
  if (gameState?.street === 'Interround') {
    await processInterRoundAction(tableID, type, payload);
  } else {
    // Otherwise, queue it for later
    await enqueueInterRoundAction(
        tableID, table.interRoundActionSeq + 1, userID, type, payload);
  }
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
  await enqueueInterRoundAction(
      tableID, table.interRoundActionSeq + 1, userID, 'Config Update',
      [config]);

  // Also update the table's config immediately (so new players see it)
  await updateTableConfig(tableID, config);
}

// DONE
export async function endGame(tableID: string, userID: string): Promise<void> {
  const table = await getTable(tableID);
  if (table.ownerID != userID)
    throw new UnauthorizedError('Only table owner can end game');
  if (table.status === 'Ended')
    throw new ConflictError('Cannot end ended game');

  await updateTableStatus(tableID, 'Ended');
}