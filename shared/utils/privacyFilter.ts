import {GameSeat, GameState} from '../persistence/types';


export function applyPrivacyFiltering(state: GameState, playerID: string): any {
  const filtered = {...state};
  delete (filtered as any).deck;
  filtered.seats = state.seats.map((seat: GameSeat) => {
    if (seat.playerID !== playerID) {
      return {...seat, holeCards: seat.holeCards.map(() => null)};
    }
    return seat;
  });
  return {type: 'state', payload: filtered};
}