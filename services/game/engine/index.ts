// ASSUMPTIONS made while adding turn timers:
//
// 1. timerSeq is incremented here, in the engine, at the two points where a
//    turn actually begins: an action that leaves the betting round open and
//    passes play to another seat (processPlayerAction), and a street
//    transition that opens a new betting round (advanceGameState). It is NOT
//    bumped on every write - unlike gameSeq - so a timeout can tell "this turn
//    is still live" from "play has moved on".
// 2. The bump rides along in the same conditional write as the state it
//    describes, so timerSeq can never disagree with the state it came from.
// 3. Timers are started only after that write is durable. If the Lambda dies
//    in between, the turn simply has no timer rather than a phantom one.

import {log} from 'console';

import {ConflictError, NotFoundError} from '../../../shared/errors';
import {commitActionAtomic} from '../../../shared/persistence/commit';
import {loadGameState, updateGameState} from '../../../shared/persistence/gameState';
import {loadGameTable} from '../../../shared/persistence/gameTable';
import {GameState} from '../../../shared/persistence/types';
import {logger} from '../../../shared/utils/logger';
import {broadcastAction, broadcastState} from '../broadcaster';
import {startTurnTimer, turnActor} from '../timers';

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

  // A new turn begins when this action left the round open and handed play to
  // a different seat. That turn gets a fresh timerSeq.
  const closed = isActionClosed(newState);
  const nextActor = closed ? null : turnActor(newState);
  const startsNewTurn = nextActor !== null &&
      newState.currentPlayerSeat !== state.currentPlayerSeat;
  const nextTimerSeq = startsNewTurn ? (state.timerSeq || 0) + 1 : undefined;

  // State + action log commit together; a conflict here throws ConflictError.
  const newGameSeq = await commitActionAtomic(
      tableID, newState, state.gameSeq, {
        handID: `${tableID}#${state.handSeq || 0}`,
        actionSeq: state.gameSeq + 1,
        playerID,
        action,
        payload,
        timestamp: Date.now()
      },
      nextTimerSeq);
  newState.gameSeq = newGameSeq;
  if (nextTimerSeq !== undefined) {
    newState.timerSeq = nextTimerSeq;
  }

  // Broadcasts are deliberately OUTSIDE the transaction: they are side effects
  // on the WebSocket API and cannot be rolled back, so they only run once the
  // write is durable.
  // Broadcast for action log display (TODO: and animations)
  await broadcastAction(
      tableID, {playerID, action, payload, username}, newGameSeq,
      newState.street);

  // TODO: possibly depreciate if broadcast action is enough (derive state)
  await broadcastState(tableID);

  if (closed) {
    log.info('Action closed, advancing game state');
    await advanceGameState(tableID, newState);
    return;
  }

  if (startsNewTurn) {
    await startTurnTimer(tableID, nextTimerSeq!, nextActor!.playerID);
  }
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

    // A street transition that leaves someone to act starts a new turn, so it
    // needs a fresh timerSeq written alongside the state it belongs to.
    const nextActor = isActionClosed(state) ? null : turnActor(state);
    const nextTimerSeq =
        nextActor !== null ? (state.timerSeq || 0) + 1 : undefined;

    try {
      const newGameSeq =
          await updateGameState(tableID, state, state.gameSeq, nextTimerSeq);
      state.gameSeq = newGameSeq;
      if (nextTimerSeq !== undefined) {
        state.timerSeq = nextTimerSeq;
      }
    } catch (error) {
      log.error(
          'State conflict during game action',
          {error: (error as Error).message});
      throw new ConflictError('State conflict during game action');
    }

    await broadcastState(tableID);

    if (nextActor !== null) {
      await startTurnTimer(tableID, nextTimerSeq!, nextActor.playerID);
    }

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
      if (!isActionClosed(state)) {
        break;
      } else {
        // action is already closed (everyone all-in), keep advancing
        continue;
      }
    }
  }
}
