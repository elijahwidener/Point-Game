import {Card, GameState} from '../../../shared/persistence/types';

export function createShuffledDeck(): Card[] {
  const ranks =
      ['A', '2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K'];
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({rank, suit});
    }
  }

  // Fisher-Yates shuffle
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

export function dealCards(deck: Card[], count: number): Card[] {
  return deck.splice(0, count);
}

export function findNextActiveSeat(
    state: GameState, startSeat: number): number {
  let seat = (startSeat + 1) % state.seats.length;
  let attempts = 0;

  while (attempts < state.seats.length) {
    const s = state.seats[seat];
    if (s.active && !s.folded && s.stack > 0) {
      return seat;
    }
    seat = (seat + 1) % state.seats.length;
    attempts++;
  }

  throw new Error('No active players found');
}

export function postBlinds(state: GameState): void {
  // Find small blind and big blind positions
  const sbSeat = findNextActiveSeat(state, state.button);
  const bbSeat = findNextActiveSeat(state, sbSeat);

  const sb = state.seats[sbSeat];
  const bb = state.seats[bbSeat];

  // Post small blind
  const sbAmount = Math.min(state.config.smallBlind, sb.stack);
  sb.stack -= sbAmount;
  sb.bet = sbAmount;

  // Post big blind
  const bbAmount = Math.min(state.config.bigBlind, bb.stack);
  bb.stack -= bbAmount;
  bb.bet = bbAmount;

  state.currentBet = bbAmount;
}

export function collectRoundContributions(state: GameState): void {
  // Check if there are any all-in players
  const allInPlayers =
      state.seats
          .filter(s => s.active && !s.folded && s.bet > 0 && s.stack === 0)
          .sort((a, b) => a.bet - b.bet);

  if (allInPlayers.length === 0) {
    // No new all-ins, just add everything to main pot
    const lastPot = state.pots[state.pots.length - 1];
    state.seats.forEach(seat => {
      if (seat.bet > 0) {
        lastPot.amount += seat.bet;
        seat.bet = 0;

        if (!seat.folded && !lastPot.eligibleSeats.includes(seat.seat)) {
          lastPot.eligibleSeats.push(seat.seat);
        }
      }
    });
    return;
  }

  // Handle side pots with all-ins
  for (const allInPlayer of allInPlayers) {
    const lastPot = state.pots[state.pots.length - 1];
    const capAmount = allInPlayer.bet;
    state.seats.forEach(seat => {
      if (seat.bet > 0) {
        const contribution = Math.min(seat.bet, capAmount);
        lastPot.amount += contribution;
        seat.bet -= contribution;

        if (!seat.folded && !lastPot.eligibleSeats.includes(seat.seat)) {
          lastPot.eligibleSeats.push(seat.seat);
        }
      }
    });
    const hasRemainingBets = state.seats.some(s => s.bet > 0);
    if (hasRemainingBets) {
      state.pots.push({amount: 0, eligibleSeats: []});
    }
  }

  // Collect any final remaining chips into the last pot
  const lastPot = state.pots[state.pots.length - 1];
  state.seats.forEach(seat => {
    if (seat.bet > 0) {
      lastPot.amount += seat.bet;
      seat.bet = 0;
      if (!seat.folded && !lastPot.eligibleSeats.includes(seat.seat)) {
        lastPot.eligibleSeats.push(seat.seat);
      }
    }
  })
}

export function forceDiscards(state: GameState): void {
  state.seats.forEach(seat => {
    if (seat.active && !seat.folded) {
      seat.holeCards = seat.holeCards.filter(card => {
        return !state.boardCards.some(
            boardCard => boardCard.rank === card.rank);
      });
    }
  });
}

export function resetActedFlags(state: GameState): void {
  state.seats.forEach(seat => {
    if (seat.active && !seat.folded && seat.stack > 0) {
      seat.acted = false;
    }
  });
  state.currentBet = 0;
  state.minRaise = state.config.bigBlind;
}