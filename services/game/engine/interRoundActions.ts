import {ConflictError, NotFoundError, UnauthorizedError} from '../../../shared/errors';
import {updatePlayerCount} from '../../../shared/persistence/gameTable';
import {GameState, InterRoundAction, InterRoundActions, TableConfig} from '../../../shared/persistence/types';
import {logger} from '../../../shared/utils/logger';
import {applyBalanceDelta} from '../../user/service';

import {advanceGameState} from '././index';


export async function processInterRoundAction(
    state: GameState, action: InterRoundAction): Promise<void> {
  const log = logger.child({
    tableID: state.tableID,
    fn: 'processInterRoundAction',
    actionType: action.type,
    actionSeq: action.actionSeq,
    userID: action.userID,
  });

  try {
    switch (action.type) {
      case InterRoundActions.START:
        log.info('Processing START action');
        await advanceGameState(state.tableID, state);
        break;
      case InterRoundActions.END:
        log.info('Processing END action');
        await processEnd(state, action);
        break;
      case InterRoundActions.JOIN:
        log.info('Processing JOIN action');
        await processJoin(state, action);
        break;
      case InterRoundActions.LEAVE:
        log.info('Processing LEAVE action');
        await processLeave(state, action);
        break;
      case InterRoundActions.TOGGLE_AWAY:
        log.info('Processing TOGGLE_AWAY action');
        await processToggleAway(state, action);
        break;
      case InterRoundActions.CONFIG_UPDATE:
        log.info('Processing CONFIG_UPDATE action');
        await processConfigUpdate(state, action);
        break;
      default:
        log.error('Unknown interround action type', {type: action.type});
    }
    log.info('Interround action completed successfully');
  } catch (error) {
    log.error('Failed to process interround action', {
      error: (error as Error).message,
      stack: (error as Error).stack,
    });
    throw error;
  }
}

async function processJoin(
    state: GameState, action: InterRoundAction): Promise<void> {
  const log = logger.child({
    tableID: state.tableID,
    fn: 'processJoin',
    userID: action.userID,
  });

  const {buyIn, username} = action.payload as unknown as {
    buyIn: number;
    username: string
  };
  const userID = action.userID;

  const existingSeat = state.seats.find(s => s.playerID === userID);
  if (existingSeat) {
    log.warn('Player already seated, skipping duplicate join action');
    return;
  }

  if (!buyIn || buyIn <= 0) {
    log.warn('Invalid buy-in amount, skipping');
    return;
  }

  const emptySeatIndex = state.seats.findIndex(s => !s.active);
  if (emptySeatIndex === -1 || emptySeatIndex >= state.config.maxPlayers) {
    log.warn('No empty seat available, skipping join');
    return;
  }

  try {
    await applyBalanceDelta(userID, -buyIn);
  } catch (error) {
    log.error(
        'Failed to deduct balance for join', {error: (error as Error).message});
    return;
  }

  const seat = state.seats[emptySeatIndex];
  seat.playerID = userID;
  seat.username = username;
  seat.stack = buyIn;
  seat.bet = 0;
  seat.holeCards = [];
  seat.folded = false;
  seat.acted = false;
  seat.active = true;
  seat.declaration = undefined;

  await updatePlayerCount(state.tableID, 1);

  log.info('Player joined successfully', {seat: emptySeatIndex, stack: buyIn});
}

async function processLeave(
    state: GameState, action: InterRoundAction): Promise<void> {
  const userID = action.userID;

  const seat = state.seats.find(s => s.playerID === userID && s.active);
  if (!seat) {
    throw new NotFoundError('Player not seated');
  }

  if (seat.stack > 0) {
    try {
      await applyBalanceDelta(userID, seat.stack);
    } catch (error) {
      console.error(`Failed to return stack to player ${userID}:`, error);
      throw new ConflictError('Balance update failed');
    }
  }

  seat.playerID = '';
  seat.stack = 0;
  seat.bet = 0;
  seat.holeCards = [];
  seat.folded = false;
  seat.acted = false;
  seat.active = false;
  seat.declaration = undefined;

  await updatePlayerCount(state.tableID, -1);
}

async function processToggleAway(
    state: GameState, action: InterRoundAction): Promise<void> {
  const userID = action.userID;

  const seat = state.seats.find(s => s.playerID === userID);
  if (!seat) {
    throw new NotFoundError('Player not seated');
  }

  seat.active = !seat.active;
}

// config update for the table is handled already
async function processConfigUpdate(
    state: GameState, action: InterRoundAction): Promise<void> {
  const newConfig = action.payload as unknown as TableConfig;

  if (!newConfig || typeof newConfig !== 'object') {
    throw new ConflictError('Invalid config payload');
  }

  // Validate config values
  if (newConfig.ante !== undefined && newConfig.ante < 0) {
    throw new ConflictError('Ante must be non-negative');
  }
  if (newConfig.smallBlind !== undefined && newConfig.smallBlind <= 0) {
    throw new ConflictError('Small blind must be positive');
  }
  if (newConfig.bigBlind !== undefined && newConfig.bigBlind <= 0) {
    throw new ConflictError('Big blind must be positive');
  }
  if (newConfig.smallBlind && newConfig.bigBlind &&
      newConfig.smallBlind >= newConfig.bigBlind) {
    throw new ConflictError('Small blind must be less than big blind');
  }

  // Apply config to game state
  state.config = {...state.config, ...newConfig};

  // Also update the table record (already done in table service, but we update
  // state here)
}

async function processEnd(
    state: GameState, action: InterRoundAction): Promise<void> {
  // Cash out all seated players
  const cashoutPromises =
      state.seats.filter(seat => seat.active && seat.stack > 0)
          .map(async (seat) => {
            try {
              await applyBalanceDelta(seat.playerID, seat.stack);

              // Clear the seat
              seat.stack = 0;
              seat.active = false;
            } catch (error) {
              console.error(
                  `Failed to cash out player ${seat.playerID}:`, error);
              // Continue with other players even if one fails
            }
          });

  await Promise.all(cashoutPromises);

  // Table service has already updated table.status to 'Ended'
  console.log(`Game ended at table ${state.tableID}, all players cashed out`);
}