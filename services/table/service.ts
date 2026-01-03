import {randomUUID} from 'crypto';

import {ConflictError, NotFoundError, UnauthorizedError} from '../../shared/errors';
import {createGameState, loadGameState} from '../../shared/persistence/gameState'
import {createTable, listTables, loadGameTable, updateCurrentInterroundActionSeq, updateTableConfig, updateTableStatus} from '../../shared/persistence/gameTable';
import {enqueueInterRoundAction} from '../../shared/persistence/interRoundActionQueue';
import {GameState, GameTable, InterRoundActions, InterRoundActionType, TableConfig, TableListFilter} from '../../shared/persistence/types';
import {advanceGameState} from '../game/engine';
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
  await updateCurrentInterroundActionSeq(
      table.tableID, table.interRoundActionSeq, table.interRoundActionSeq + 1);

  //}
}

export async function createGameTable(
    ownerID: string, config: TableConfig): Promise<string> {
  const tableID = randomUUID();
  await createTable(tableID, ownerID, config);

  const initialState: GameState = {
    tableID,
    handSeq: 0,
    config,
    seats: Array.from({length: 8}, (_, i) => ({
                                     seat: i,
                                     playerID: '',
                                     stack: 0,
                                     bet: 0,
                                     holeCards: [],
                                     folded: false,
                                     active: false,
                                     acted: false
                                   })),
    deck: [],
    street: 'Interround',
    boardCards: [],
    button: 0,
    pots: [],
    currentPlayerSeat: 0,
    currentBet: 0,
    minRaise: config.bigBlind,
    timerSeq: 0,
    gameSeq: 0
  };

  await createGameState(initialState);
  return tableID;
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

export async function endGame(tableID: string, userID: string): Promise<void> {
  const table = await getTable(tableID);
  if (table.ownerID !== userID)
    throw new UnauthorizedError('Only table owner can end game');
  if (table.status === 'Ended')
    throw new ConflictError('Cannot end ended game');

  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.END, userID, []);
  await updateTableStatus(tableID, 'Ended');
}

export async function startGame(
    tableID: string, userID: string): Promise<void> {
  const table = await getTable(tableID);
  if (table.ownerID !== userID) {
    throw new UnauthorizedError('Only table owner can start game');
  }

  if (table.status !== 'Waiting') {
    throw new ConflictError('Game already started');
  }

  const state = await loadGameState(tableID);
  if (!state) throw new NotFoundError('Game state not found');

  const activePlayers = state.seats.filter(s => s.active).length;
  if (activePlayers < 3) {
    throw new ConflictError('Need at least 3 players to start');
  }

  await updateTableStatus(tableID, 'Running');
  await advanceGameState(tableID, state);
}