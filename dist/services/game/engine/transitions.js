"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionToStreet = transitionToStreet;
exports.transitionToPreflop = transitionToPreflop;
exports.transitionToFlop = transitionToFlop;
exports.transitionToTurn = transitionToTurn;
exports.transitionToRiver = transitionToRiver;
exports.transitionToDeclare = transitionToDeclare;
exports.transitionToShowdown = transitionToShowdown;
const interRoundActionQueue_1 = require("../../../shared/persistence/interRoundActionQueue");
const logger_1 = require("../../../shared/utils/logger");
const broadcaster_1 = require("../broadcaster");
const helpers_1 = require("./helpers");
const interRoundActions_1 = require("./interRoundActions");
const showdown_1 = require("./showdown");
async function transitionToStreet(state) {
    const log = logger_1.logger.child({
        tableID: state.tableID,
        fn: 'transitionToStreet',
        fromStreet: state.street,
        handSeq: state.handSeq,
    });
    const newState = JSON.parse(JSON.stringify(state));
    const currentStreet = newState.street;
    const skipCheckStreets = ['Showdown', 'Interround'];
    if (!skipCheckStreets.includes(currentStreet) &&
        isSinglePlayerRemaining(newState)) {
        log.info('Single player remaining, awarding pot');
        return await awardPotToLastPlayer(newState);
    }
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
            log.error('Unknown street', { currentStreet });
            throw new Error(`Unknown street: ${currentStreet}`);
    }
}
function isSinglePlayerRemaining(state) {
    const activePlayers = state.seats.filter(s => s.active && !s.folded);
    return activePlayers.length === 1;
}
async function awardPotToLastPlayer(state) {
    // First collect any outstanding bets into the pot
    (0, helpers_1.collectRoundContributions)(state);
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
function transitionToPreflop(state) {
    state.street = 'Preflop';
    state.handSeq++;
    const ante = state.config.ante;
    // Reset
    state.deck = (0, helpers_1.createShuffledDeck)();
    state.boardCards = [];
    state.pots = [{ amount: 0, eligibleSeats: [] }];
    state.currentBet = 0;
    state.minRaise = state.config.bigBlind;
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
    state.seats.forEach(seat => {
        if (seat.active && seat.stack > 0) {
            seat.stack -= ante;
            state.pots[0].amount += ante;
            state.pots[0].eligibleSeats.push(seat.seat);
            seat.bet = 0;
            seat.folded = false;
            seat.acted = false;
            seat.declaration = undefined;
            seat.holeCards = (0, helpers_1.dealCards)(state.deck, 5); // Deal 5 cards
        }
    });
    state.button = (0, helpers_1.findNextActiveSeat)(state, state.button);
    const activePlayers = state.seats.filter(s => s.active && s.stack >= ante);
    if (activePlayers.length < 3) {
        state.street = 'Interround';
        return state;
    }
    (0, helpers_1.postBlinds)(state);
    const bbSeat = (0, helpers_1.findNextActiveSeat)(state, (0, helpers_1.findNextActiveSeat)(state, state.button));
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, bbSeat);
    return state;
}
async function transitionToFlop(state) {
    state.street = 'Flop';
    (0, helpers_1.collectRoundContributions)(state);
    const newCards = (0, helpers_1.dealUniqueCards)(state.deck, state.boardCards, 2);
    state.boardCards.push(...newCards);
    await (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
async function transitionToTurn(state) {
    state.street = 'Turn';
    (0, helpers_1.collectRoundContributions)(state);
    const cardsToDeal = Math.min(2, state.deck.length);
    if (cardsToDeal > 0) {
        const newCards = (0, helpers_1.dealUniqueCards)(state.deck, state.boardCards, cardsToDeal);
        state.boardCards.push(...newCards);
    }
    await (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
async function transitionToRiver(state) {
    state.street = 'River';
    (0, helpers_1.collectRoundContributions)(state);
    const cardsToDeal = Math.min(1, state.deck.length);
    if (cardsToDeal > 0) {
        const newCards = (0, helpers_1.dealUniqueCards)(state.deck, state.boardCards, cardsToDeal);
        state.boardCards.push(...newCards);
    }
    await (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
function transitionToDeclare(state) {
    state.street = 'Declare';
    (0, helpers_1.collectRoundContributions)(state);
    // set a timer for declarations (do not code this yet)
    (0, helpers_1.resetActedFlags)(state);
    return state;
}
async function transitionToShowdown(state) {
    state.street = 'Showdown';
    const { state: updatedState, showdownResults } = (0, showdown_1.resolveShowdown)(state);
    await (0, broadcaster_1.broadcastSystem)(state.tableID, 'showdown_results', showdownResults);
    return updatedState;
}
async function transitionToInterround(state) {
    const log = logger_1.logger.child({
        tableID: state.tableID,
        fn: 'transitionToInterround',
        handSeq: state.handSeq,
    });
    state.street = 'Interround';
    log.info('Entering Interround, loading action queue');
    // load up the queue
    const queue = await (0, interRoundActionQueue_1.loadInterRoundActions)(state.tableID);
    log.info('Loaded interround actions', {
        queueLength: queue.length,
        actions: queue.map(a => ({ type: a.type, userID: a.userID, actionSeq: a.actionSeq })),
    });
    for (const action of queue) {
        try {
            await (0, interRoundActions_1.processInterRoundAction)(state, action);
        }
        catch (error) {
            log.error('Failed to process interround action', {
                type: action.type,
                userID: action.userID,
                actionSeq: action.actionSeq,
                error: error.message,
            });
        }
        await (0, interRoundActionQueue_1.popInterRoundAction)(state.tableID);
        log.info('Action popped from queue', { type: action.type });
    }
    return state;
}
