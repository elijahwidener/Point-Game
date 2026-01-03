import {ConflictError, NotFoundError} from '../../../shared/errors';
import {writeAction} from '../../../shared/persistence/actionLog';
import {loadGameState, updateGameState} from '../../../shared/persistence/gameState';
import {loadGameTable} from '../../../shared/persistence/gameTable';
import {loadInterRoundActions, popInterRoundAction} from '../../../shared/persistence/interRoundActionQueue';
import {GameState, InterRoundAction, InterRoundActions} from '../../../shared/persistence/types';
import {endGame, startGame} from '../../table/service';
import {broadcastAction, broadcastState} from '../broadcaster';

import {applyPlayerAction, isActionClosed} from './actions';
import {collectRoundContributions, createShuffledDeck, dealCards, findNextActiveSeat, forceDiscards, postBlinds, resetActedFlags} from './helpers';
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

  let newState = applyPlayerAction(state, playerID, action, payload);


  newState.gameSeq = await updateGameState(tableID, newState, state.gameSeq);

  await writeAction({
    handID: `${tableID}#${state.handSeq || 0}`,
    actionID: newState.gameSeq,
    playerID,
    action,
    payload,
    timestamp: Date.now()
  });

  await broadcastAction(tableID, {playerID, action, payload});

  if (isActionClosed(newState)) {
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

    // Save the new state
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



async function transitionToStreet(state: GameState): Promise<GameState> {
  const newState = JSON.parse(JSON.stringify(state)) as GameState;
  const currentStreet = newState.street;

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


function transitionToPreflop(state: GameState): GameState {
  state.street = 'Preflop';
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

  if (activePlayers.length <= 3) {
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

function transitionToFlop(state: GameState): GameState {
  state.street = 'Flop';
  collectRoundContributions(state);

  const newCards = dealCards(state.deck, 2);
  state.boardCards.push(...newCards);

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

function transitionToTurn(state: GameState): GameState {
  state.street = 'Turn';
  collectRoundContributions(state);

  const cardsToDeal = Math.min(2, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealCards(state.deck, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);

  return state;
}

function transitionToRiver(state: GameState): GameState {
  state.street = 'River';
  collectRoundContributions(state);

  const cardsToDeal = Math.min(1, state.deck.length);
  if (cardsToDeal > 0) {
    const newCards = dealCards(state.deck, cardsToDeal);
    state.boardCards.push(...newCards);
  }

  forceDiscards(state);
  resetActedFlags(state);
  state.currentPlayerSeat = findNextActiveSeat(state, state.button);
  return state;
}

function transitionToDeclare(state: GameState): GameState {
  state.street = 'Declare';
  collectRoundContributions(state);

  // set a timer for declarations (dont code this yet)

  resetActedFlags(state);
  return state;
}

function transitionToShowdown(state: GameState): GameState {
  state.street = 'Showdown';
  // calculate
  // award
  return state;
}

async function transitionToInterround(state: GameState): Promise<GameState> {
  state.street = 'Interround';

  // load up the queue
  const queue = loadInterRoundActions(state.tableID);

  for (const action of queue) {
    await processInterRoundAction(state, action);
    await popInterRoundAction(state.tableID);
  }

  return state;
}


export async function processInterRoundAction(
    state: GameState, action: InterRoundAction): Promise<void> {
  try {
    // Validate and process based on type
    switch (action.type) {
      case InterRoundActions.START:
        await startGame(action.tableID, action.userID);
        break;
      case InterRoundActions.END:
        await endGame(action.tableID, action.userID);
        break;
      case InterRoundActions.JOIN:
        await processJoin(state, action);
        break;
      case InterRoundActions.LEAVE:
        await processLeave(state, action);
        break;
      case InterRoundActions.STAND_UP:
        break;
      case InterRoundActions.SIT_DOWN:
        break;
      case InterRoundActions.CONFIG_UPDATE:
        await processConfigUpdate(table, action);
        break;
    }

  } catch (error) {
    console.error('Failed to process interround action:', error);
  }
}
