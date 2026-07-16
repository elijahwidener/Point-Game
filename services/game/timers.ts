// Turn timers.
//
// Lambda cannot wait, so each turn schedules a one-shot EventBridge Scheduler
// invocation of the TimeoutLambda. Schedules are NOT cancelled when a player
// acts - the timeout fires regardless and decides at fire time whether it is
// still relevant by comparing its timerSeq against the one in game state. That
// keeps the acting path cheap (no delete call on the hot path) and means a
// missed cancellation can never fold a player who acted.
//
// KNOWN LIMITATION: EventBridge Scheduler only guarantees delivery within
// ~1 minute of the target time, so a ~30s turn timer has minute-level jitter in
// practice. Accepted for this happy-path implementation; a tighter clock would
// need Step Functions or a self-scheduling poller.

import {CreateScheduleCommand, SchedulerClient} from '@aws-sdk/client-scheduler';

import {writeTimer} from '../../shared/persistence/timer';
import {GameSeat, GameState} from '../../shared/persistence/types';
import {logger} from '../../shared/utils/logger';

const scheduler = new SchedulerClient({});

// Only betting streets get a turn timer. Declare has no single "current actor"
// (every remaining player declares, in any order) so timing it out is a
// separate feature and is intentionally out of scope here.
const BETTING_STREETS = ['Preflop', 'Flop', 'Turn', 'River'];

/**
 * The seat whose turn it currently is, or null if nobody is on the clock.
 */
export function turnActor(state: GameState): GameSeat|null {
  if (!BETTING_STREETS.includes(state.street)) {
    return null;
  }
  const seat = state.seats[state.currentPlayerSeat];
  if (!seat || !seat.active || seat.folded) {
    return null;
  }
  return seat;
}

/**
 * Writes the timer record for a new turn and schedules its timeout.
 *
 * Call only AFTER the state carrying this timerSeq is durably committed -
 * otherwise a timeout could fire against a turn that never happened.
 *
 * @param tableID - The table
 * @param timerSeq - timerSeq of the turn being started (already in game state)
 * @param playerID - The player now on the clock
 */
export async function startTurnTimer(
    tableID: string, timerSeq: number, playerID: string): Promise<void> {
  const log = logger.child({tableID, timerSeq, fn: 'startTurnTimer'});

  const timeoutLambdaArn = process.env.TIMEOUT_LAMBDA_ARN;
  const schedulerRoleArn = process.env.SCHEDULER_ROLE_ARN;
  if (!timeoutLambdaArn || !schedulerRoleArn) {
    log.error('Turn timer not configured, skipping schedule');
    return;
  }

  const deadline = await writeTimer(tableID, timerSeq, playerID);

  // at() takes a timezone-less timestamp; pair it with UTC explicitly so the
  // schedule does not drift with the account's default timezone.
  const scheduleExpression =
      `at(${new Date(deadline).toISOString().slice(0, 19)})`;

  await scheduler.send(new CreateScheduleCommand({
    Name: scheduleName(tableID, timerSeq),
    ScheduleExpression: scheduleExpression,
    ScheduleExpressionTimezone: 'UTC',
    FlexibleTimeWindow: {Mode: 'OFF'},
    // Self-cleaning: the schedule deletes itself once it has fired, so nothing
    // has to sweep up one-shot schedules.
    ActionAfterCompletion: 'DELETE',
    Target: {
      Arn: timeoutLambdaArn,
      RoleArn: schedulerRoleArn,
      Input: JSON.stringify({tableID, timerSeq}),
    },
  }));

  log.info('Turn timer scheduled', {playerID, deadline, scheduleExpression});
}

/**
 * Schedule names allow [0-9a-zA-Z-_.] only, up to 64 chars.
 */
function scheduleName(tableID: string, timerSeq: number): string {
  const safeTableID = tableID.replace(/[^0-9a-zA-Z\-_.]/g, '-').slice(0, 40);
  return `turn-${safeTableID}-${timerSeq}`;
}
