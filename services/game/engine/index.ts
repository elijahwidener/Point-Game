import {log} from 'console';

import {ConflictError, NotFoundError} from '../../../shared/errors';
import {writeAction} from '../../../shared/persistence/actionLog';
import {loadGameState, updateGameState} from '../../../shared/persistence/gameState';
import {loadGameTable} from '../../../shared/persistence/gameTable';
import {GameState} from '../../../shared/persistence/types';
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
  if (!state) throw new NotFoundError('Game state not found');

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
    console.log(`Advancing game state...`);
    await advanceGameState(tableID, newState);
  }
  // new turn timer (dont code this yet)
}

export async function advanceGameState(
    tableID: string, currentState: GameState): Promise<void> {
  let state = currentState;

  // Keep processing until we hit a player action street
  while (true) {
    state = await transitionToStreet(state);

    try {
      const newGameSeq = await updateGameState(tableID, state, state.gameSeq);
      state.gameSeq = newGameSeq;
    } catch (error) {
      throw new ConflictError('State conflict during game action');
    }
    await broadcastState(tableID);

    if (state.street === 'Interround') {
      // Check if we should continue to next hand
      const table = await loadGameTable(tableID);
      if (!table) throw new NotFoundError('Table not found');
      if (table?.status === 'Running') {
        continue;  // Loop will transition to Preflop
      } else {
        break;  // Paused, Waiting, or ended, stop here
      }
    }


    const actionStreets = ['Preflop', 'Flop', 'Turn', 'River', 'Declare'];
    if (actionStreets.includes(state.street)) {
      break;
    }
  }
}
