import {ConflictError} from '../../../shared/errors';
import {loadGameState} from '../../../shared/persistence/gameState';
import {logger} from '../../../shared/utils/logger';
import {processPlayerAction} from '../engine';
import {turnActor} from '../timers';

/**
 * Payload EventBridge Scheduler delivers, as written by startTurnTimer.
 */
interface TurnTimeoutEvent {
  tableID: string;
  timerSeq: number;
}

/**
 * Fires when a turn's clock expires.
 *
 * Schedules are never cancelled, so most invocations are expected to be
 * no-ops: the player acted, the turn moved on, and this event is stale. The
 * timerSeq comparison is what tells the two cases apart.
 */
export async function handler(event: TurnTimeoutEvent): Promise<void> {
  const {tableID, timerSeq} = event;
  const log = logger.child({tableID, timerSeq, fn: 'turnTimeoutHandler'});

  const state = await loadGameState(tableID);
  if (!state) {
    log.info('Timeout fired but no game state, ignoring');
    return;
  }

  if ((state.timerSeq || 0) !== timerSeq) {
    log.info(
        'Stale timeout, turn already advanced',
        {currentTimerSeq: state.timerSeq});
    return;
  }

  const seat = turnActor(state);
  if (!seat) {
    log.info('Timeout fired but nobody is on the clock, ignoring');
    return;
  }

  // Default action: check when it costs nothing, otherwise fold. Mirrors what
  // validateCheck considers legal.
  const action = seat.bet === state.currentBet ? 'check' : 'fold';

  try {
    // Deliberately routed through processPlayerAction rather than writing
    // state directly: the timeout gets the same validation and the same
    // conditional write every player action gets, so if the player acted
    // between the staleness check above and this write, the OCC guard rejects
    // the timeout instead of clobbering their action. It also broadcasts the
    // result like any normal action.
    await processPlayerAction(tableID, seat.playerID, action, {});
    log.info(
        'Forced default action on timeout',
        {playerID: seat.playerID, action});
  } catch (error) {
    if (error instanceof ConflictError) {
      // The player beat us to it. Nothing to do.
      log.info(
          'Timeout lost race with player action, ignoring',
          {error: (error as Error).message});
      return;
    }
    throw error;
  }
}
