import {BadRequestError, ConflictError, NotFoundError} from '../../../shared/errors';
import {GameState} from '../../../shared/persistence/types';

export function validateAction(
    state: GameState, playerID: string, action: string, payload: any): void {
  // 1. Check game can accept player actions
  const bettinStreets = ['Preflop', 'Flop', 'Turn', 'River'];
  if (!bettinStreets.includes(state.street))
    throw new ConflictError('Cannot preform actions during ${state.street}');


  // 2. Check if its the players turn
  const currentSeat = state.seats[state.currentPlayerSeat];
  if (!currentSeat || currentSeat.playerID !== playerID)
    throw new ConflictError('Not your turn');

  // 3. Check player is active
  if (!currentSeat.active || currentSeat.folded) {
    throw new ConflictError('Player is not active');
  }

  // 4. Validate agaisnt game
  switch (action) {
    case 'check':
      validateCheck(state, currentSeat);
      break;
    case 'call':
      validateCall(state, currentSeat);
      break;
    case 'raise':
      validateRaise(state, currentSeat, payload);
      break;
    case 'fold':
      break;
    default:
      throw new BadRequestError(`Unknown action: ${action}`);
  }
}

function validateCheck(state: GameState, seat: any): void {
  if (seat.bet !== state.currentBet)
    throw new BadRequestError('Cannot check - must call or raise');
}

function validateCall(state: GameState, seat: any): void {
  if (seat.bet === state.currentBet)
    throw new BadRequestError('Cannot call - should check instead');
}

function validateRaise(state: GameState, seat: any, payload: any): void {
  const raiseAmount = payload.raiseAmount;
  if (!raiseAmount || raiseAmount <= 0) {
    throw new BadRequestError('Invalid raise amount');
  }

  const totalBet = seat.bet + raiseAmount;

  if (totalBet <= state.currentBet) {
    throw new BadRequestError('Raise must be higher than current bet');
  }

  if (raiseAmount < state.minRaise && raiseAmount < seat.stack) {
    throw new BadRequestError('Raise must be at least ${state.minRaise}');
  }

  if (raiseAmount > seat.stack) {
    throw new BadRequestError('Insufficient chips');
  }
}
