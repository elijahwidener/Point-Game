
import {loadInterRoundActions, popInterRoundAction} from '../../../shared/persistence/interRoundActionQueue';
import {GameState} from '../../../shared/persistence/types';
import {logger} from '../../../shared/utils/logger';
import {broadcastSystem} from '../broadcaster';

import {collectRoundContributions, createShuffledDeck, dealCards, dealUniqueCards, findNextActiveSeat, forceDiscards, postBlinds, resetActedFlags} from './helpers';
import {processInterRoundAction} from './interRoundActions';
import {resolveShowdown} from './showdown';

export async function transitionToStreet(state: GameState): Promise<GameState> {
  const log = logger.child({
    tableID: state.tableID,
    fn: 'transitionToStreet',
    fromStreet: state.street,
    handSeq: state.handSeq,
  });

  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const currentStreet = newState.street;

  const skipCheckStreets = ['Showdown', 'Interround'];
  if (!skipCheckStreets.includes(currentStreet) &&
      isSinglePlayerRemaining(newState)) {
    log.info('Single player remaining, awarding pot');
    return await awardPotToLastPlayer(newState);
  }

  log.info('Transitioning street', {currentStreet});

  switch (currentStreet) {
    case 'Preflop':
      return await transitionToFlop(newState);
    case 'Flop':
      return await transitionToTurn(newState);
    case 'Turn':
      return await transitionToRiver(newState);
    case 'River':
      return transitionToDeclare(newState);
    case 'Declare':
      return await transitionToShowdown(newState);
    case 'Showdown':
      return await transitionToInterround(newState);
    case 'Interround':
      return transitionToPreflop(newState);
    default:
      log.error('Unknown street', {currentStreet});
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
    if (seat.active && seat.stack <= ante) {
      seat.playerID = '';
      seat.username = '';
      seat.stack = 0;
      seat.active = false;
      seat.folded = false;
      seat.holeCards = [];
      seat.bet = 0;
      seat.bet = 0;
      seat.declaration = undefined;
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

export async function transitionToFlop(state: GameState): Promise<GameState> {
  state.street = 'Flop';
  collectRoundContributions(state);

  const newCards = dealUniqueCards(state.deck, state.boardCards, 2);
  state.boardCards.push(...newCards);

  await forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

export async function transitionToTurn(state: GameState): Promise<GameState> {
  state.street = 'Turn';
  collectRoundContributions(state);

  const cardsToDeal = Math.min(2, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealUniqueCards(state.deck, state.boardCards, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  await forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

export async function transitionToRiver(state: GameState): Promise<GameState> {
  state.street = 'River';
  collectRoundContributions(state);



  const cardsToDeal = Math.min(1, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealUniqueCards(state.deck, state.boardCards, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  await forceDiscards(state);
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

export async function transitionToShowdown(state: GameState):
    Promise<GameState> {
  state.street = 'Showdown';
  const {state: updatedState, showdownResults} = resolveShowdown(state);
  await broadcastSystem(state.tableID, 'showdown_results', showdownResults);
  return updatedState;
}


async function transitionToInterround(state: GameState): Promise<GameState> {
  const log = logger.child({
    tableID: state.tableID,
    fn: 'transitionToInterround',
    handSeq: state.handSeq,
  });
  state.street = 'Interround';
  log.info('Entering Interround, loading action queue');

  // load up the queue
  const queue = await loadInterRoundActions(state.tableID);
  log.info('Loaded interround actions', {
    queueLength: queue.length,
    actions: queue.map(
        a => ({type: a.type, userID: a.userID, actionSeq: a.actionSeq})),
  });

  for (const action of queue) {
    log.info('Processing interround action', {
      type: action.type,
      userID: action.userID,
      actionSeq: action.actionSeq,
      payload: action.payload,
    });
    try {
      await processInterRoundAction(state, action);
      log.info('Action processed successfully', {type: action.type});
    } catch (error) {
      log.error('Failed to process interround action', {
        type: action.type,
        userID: action.userID,
        actionSeq: action.actionSeq,
        error: (error as Error).message,
      });
    }
    await popInterRoundAction(state.tableID);
    log.info('Action popped from queue', {type: action.type});
  }

  log.info('Interround processing complete');
  return state;
}