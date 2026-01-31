import {log} from 'console';

import {ConflictError, NotFoundError} from '../../../shared/errors';
import {writeAction} from '../../../shared/persistence/actionLog';
import {loadGameState, updateGameState} from '../../../shared/persistence/gameState';
import {loadGameTable} from '../../../shared/persistence/gameTable';
import {GameState} from '../../../shared/persistence/types';
import {logger} from '../../../shared/utils/logger';
import {broadcastAction, broadcastState} from '../broadcaster';

import {applyPlayerAction, isActionClosed} from './actions';
import {transitionToStreet} from './transitions';
import {validateAction} from './validation';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function processPlayerAction(
    tableID: string, playerID: string, action: string,
    payload: any): Promise<void> {
  const state = await loadGameState(tableID);
  const log = logger.child({tableID, fn: 'processPlayerAction'});

  if (!state) {
    log.error('Game state not found');
    throw new NotFoundError('Game not found');
  }

  validateAction(state, playerID, action, payload);

  const seat = state.seats.find(s => s.playerID === playerID);
  const username = (seat as any)?.username || playerID;

  let newState = applyPlayerAction(state, playerID, action, payload);
  const newGameSeq = await updateGameState(tableID, newState, state.gameSeq);
  newState.gameSeq = newGameSeq;

  await writeAction({
    handID: `${tableID}#${state.handSeq || 0}`,
    actionSeq: newState.gameSeq,
    playerID,
    action,
    payload,
    timestamp: Date.now()
  });

  // Broadcast for action log display (TODO: and animations)
  await broadcastAction(
      tableID, {playerID, action, payload, username}, newGameSeq,
      newState.street);

  // TODO: possibly depreciate if broadcast action is enough (derive state)
  await broadcastState(tableID);

  const closed = isActionClosed(newState);
  if (closed) {
    log.info('Action closed, advancing game state');
    await advanceGameState(tableID, newState);
  }
  // new turn timer (dont code this yet)
}

export async function advanceGameState(
    tableID: string, currentState: GameState): Promise<void> {
  let state = currentState;
  const log = logger.child({tableID, fn: 'advanceGameState'});

  // Keep processing until we hit a player action street
  while (true) {
    const prevStreet = state.street;

    state = await transitionToStreet(state);

    log.info('Street transition completed', {
      from: prevStreet,
      to: state.street,
      gameSeq: state.gameSeq,
      boardCards: state.boardCards.length,
      potsCount: state.pots.length,
    });

    try {
      const newGameSeq = await updateGameState(tableID, state, state.gameSeq);
      state.gameSeq = newGameSeq;
    } catch (error) {
      log.error(
          'State conflict during game action',
          {error: (error as Error).message});
      throw new ConflictError('State conflict during game action');
    }

    await broadcastState(tableID);

    if (state.street === 'Interround') {
      const table = await loadGameTable(tableID);
      log.info(
          'At Interround, checking table status', {tableStatus: table?.status});

      if (table?.status === 'Running') {
        log.info('Table running, continuing to next hand');
        continue;
      } else {
        log.info('Table not running, stopping advancement');
        break;
      }
    }


    const actionStreets = ['Preflop', 'Flop', 'Turn', 'River', 'Declare'];
    if (actionStreets.includes(state.street)) {
      break;
    }
  }
}
