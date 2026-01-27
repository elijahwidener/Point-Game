import {randomUUID} from 'crypto';

import {ConflictError, NotFoundError, UnauthorizedError} from '../../shared/errors';
import {createGameState, loadGameState, updateGameState} from '../../shared/persistence/gameState'
import {createTable, listTables, loadGameTable, updateCurrentInterroundActionSeq, updateTableConfig, updateTableStatus} from '../../shared/persistence/gameTable';
import {enqueueInterRoundAction} from '../../shared/persistence/interRoundActionQueue';
import {GameState, GameTable, InterRoundAction, InterRoundActions, InterRoundActionType, TableConfig, TableListFilter} from '../../shared/persistence/types';
import {logger} from '../../shared/utils/logger';
import {broadcastState} from '../game/broadcaster';
import {advanceGameState} from '../game/engine';
import {processInterRoundAction} from '../game/engine/interRoundActions';
import {getMe} from '../user/service';


async function enqueueOrProcessInterRoundAction(
    table: GameTable, type: InterRoundActionType, userID: string,
    payload: any): Promise<void> {
  const tableID = table.tableID
  const gameState = await loadGameState(tableID);
  const log = logger.child({tableID, fn: 'takeSeat'});

  if (!gameState) throw new NotFoundError('GameState not found');

  if (gameState?.street === 'Interround') {
    const action: InterRoundAction = {
      tableID: tableID,
      actionSeq: table.interRoundActionSeq + 1,
      userID,
      type,
      payload
    };
    log.info('No game or at Interround, processing join immediately');
    await processInterRoundAction(gameState, action);
    await updateGameState(tableID, gameState, gameState.gameSeq);
    await broadcastState(tableID);
  } else {
    log.info('Game in progress, enqueueing join action', {
      currentStreet: gameState.street,
    });
    await enqueueInterRoundAction(
        tableID, table.interRoundActionSeq + 1, userID, type, payload);
    await updateCurrentInterroundActionSeq(
        tableID, table.interRoundActionSeq, table.interRoundActionSeq + 1);
  }
}

export async function createGameTable(
    ownerID: string, tableName: string, config: TableConfig): Promise<string> {
  const tableID = randomUUID();
  const finalConfig = {...config, maxPlayers: config.maxPlayers ?? 8};
  await createTable(tableID, ownerID, tableName, finalConfig);

  const initialState: GameState = {
    tableID,
    handSeq: 0,
    config: finalConfig,
    seats: Array.from({length: 8}, (_, i) => ({
                                     seat: i,
                                     playerID: '',
                                     username: '',
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
  if (table.status === 'Ended') throw new ConflictError('Table has ended');

  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.JOIN, userID, {buyIn, username: user.username});
}

export async function leaveSeat(
    tableID: string, userID: string): Promise<void> {
  const table = await loadGameTable(tableID);
  if (!table) throw new NotFoundError('Table not found');

  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.LEAVE, userID, null);
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
    const state = await loadGameState(tableID);
    if (state && state.street === 'Interround') {
      await advanceGameState(tableID, state);
    }
  } else
    throw new ConflictError('INVALID: Game has not started or is ended');
}

export async function toggleAway(
    tableID: string, userID: string): Promise<void> {
  const table = await loadGameTable(tableID);
  if (!table) throw new NotFoundError('Table not found');
  await enqueueOrProcessInterRoundAction(
      table, InterRoundActions.TOGGLE_AWAY, userID, null)
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

  if (table.status === 'Running' || table.status === 'Ended') {
    throw new ConflictError('Game already running or is ended');
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