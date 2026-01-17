
import {loadInterRoundActions, popInterRoundAction} from '../../../shared/persistence/interRoundActionQueue';
import {GameState} from '../../../shared/persistence/types';

import {collectRoundContributions, createShuffledDeck, dealCards, dealUniqueCards, findNextActiveSeat, forceDiscards, postBlinds, resetActedFlags} from './helpers';
import {processInterRoundAction} from './interRoundActions';
import {resolveShowdown} from './showdown';

export async function transitionToStreet(state: GameState): Promise<GameState> {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const currentStreet = newState.street;

  const skipCheckStreets = ['Showdown', 'Interround'];
  if (!skipCheckStreets.includes(currentStreet) &&
      isSinglePlayerRemaining(newState)) {
    return await awardPotToLastPlayer(newState);
  }

  switch (currentStreet) {
    case 'Preflop':
      return transitionToFlop(newState);
    case 'Flop':
      return transitionToTurn(newState);
    case 'Turn':
      return transitionToRiver(newState);
    case 'River':
      return transitionToDeclare(newState);
    case 'Declare':
      return transitionToShowdown(newState);
    case 'Showdown':
      return await transitionToInterround(newState);
    case 'Interround':
      return transitionToPreflop(newState);
    default:
      throw new Error(`Unknown street: ${currentStreet}`);
  }
}

function isSinglePlayerRemaining(state: GameState): boolean {
  const activePlayers = state.seats.filter(s => s.active && !s.folded);
  return activePlayers.length === 1;
}


async function awardPotToLastPlayer(state: GameState): Promise<GameState> {
  // First collect any outstanding bets into the pot
  collectRoundContributions(state);

  const winner = state.seats.find(s => s.active && !s.folded);
  if (!winner) {
    console.error('No winner found in awardPotToLastPlayer');
    return state;
  }

  let totalWon = 0;
  for (const pot of state.pots) {
    totalWon += pot.amount;
    pot.amount = 0;
  }
  winner.stack += totalWon;

  console.log(`Seat ${winner.seat} (${winner.playerID}) wins ${
      totalWon} chips (everyone else folded)`);

  // Hand is over
  return await transitionToInterround(state);
}


export function transitionToPreflop(state: GameState): GameState {
  state.street = 'Preflop';
  state.handSeq++;
  const ante = state.config.ante;
  // Reset
  state.deck = createShuffledDeck();
  state.boardCards = [];
  state.pots = [{amount: 0, eligibleSeats: []}];
  state.currentBet = 0;
  state.minRaise = state.config.bigBlind;
  state.button = findNextActiveSeat(state, state.button);


  // Sit out players with insufficient stack
  state.seats.forEach(seat => {
    if (seat.active && seat.stack < ante) {
      seat.active = false;
    }
  });

  const activePlayers = state.seats.filter(s => s.active && s.stack >= ante);

  if (activePlayers.length < 3) {
    state.street = 'Interround';
    return state;
  }

  state.seats.forEach(seat => {
    if (seat.active && seat.stack > 0) {
      seat.stack -= ante;
      state.pots[0].amount += ante;
      state.pots[0].eligibleSeats.push(seat.seat);
      seat.bet = 0;
      seat.folded = false;
      seat.acted = false;
      seat.declaration = undefined;
      seat.holeCards = dealCards(state.deck, 5);  // Deal 5 cards
    }
  });

  postBlinds(state);
  const bbSeat =
      findNextActiveSeat(state, findNextActiveSeat(state, state.button));
  state.currentPlayerSeat = findNextActiveSeat(state, bbSeat);

  return state;
}

export function transitionToFlop(state: GameState): GameState {
  state.street = 'Flop';
  collectRoundContributions(state);

  const newCards = dealUniqueCards(state.deck, state.boardCards, 2);
  state.boardCards.push(...newCards);

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

export function transitionToTurn(state: GameState): GameState {
  state.street = 'Turn';
  collectRoundContributions(state);

  const cardsToDeal = Math.min(2, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealUniqueCards(state.deck, state.boardCards, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

export function transitionToRiver(state: GameState): GameState {
  state.street = 'River';
  collectRoundContributions(state);

  const cardsToDeal = Math.min(1, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealUniqueCards(state.deck, state.boardCards, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);
  return state;
}

export function transitionToDeclare(state: GameState): GameState {
  state.street = 'Declare';
  collectRoundContributions(state);

  // set a timer for declarations (do not code this yet)

  resetActedFlags(state);
  return state;
}

export function transitionToShowdown(state: GameState): GameState {
  state.street = 'Showdown';
  return resolveShowdown(state);
}

async function transitionToInterround(state: GameState): Promise<GameState> {
  state.street = 'Interround';

  // load up the queue
  const queue = await loadInterRoundActions(state.tableID);

  for (const action of queue) {
    await processInterRoundAction(state, action);
    await popInterRoundAction(state.tableID);
  }

  return state;
}