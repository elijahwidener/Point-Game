"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transitionToShowdown = exports.transitionToDeclare = exports.transitionToRiver = exports.transitionToTurn = exports.transitionToFlop = exports.transitionToPreflop = exports.transitionToStreet = void 0;
const interRoundActionQueue_1 = require("../../../shared/persistence/interRoundActionQueue");
const helpers_1 = require("./helpers");
const interRoundActions_1 = require("./interRoundActions");
const showdown_1 = require("./showdown");
async function transitionToStreet(state) {
    const newState = JSON.parse(JSON.stringify(state));
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
exports.transitionToStreet = transitionToStreet;
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
    state.button = (0, helpers_1.findNextActiveSeat)(state, state.button);
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
            seat.holeCards = (0, helpers_1.dealCards)(state.deck, 5); // Deal 5 cards
        }
    });
    (0, helpers_1.postBlinds)(state);
    const bbSeat = (0, helpers_1.findNextActiveSeat)(state, (0, helpers_1.findNextActiveSeat)(state, state.button));
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, bbSeat);
    return state;
}
exports.transitionToPreflop = transitionToPreflop;
function transitionToFlop(state) {
    state.street = 'Flop';
    (0, helpers_1.collectRoundContributions)(state);
    const newCards = (0, helpers_1.dealCards)(state.deck, 2);
    state.boardCards.push(...newCards);
    (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
exports.transitionToFlop = transitionToFlop;
function transitionToTurn(state) {
    state.street = 'Turn';
    (0, helpers_1.collectRoundContributions)(state);
    const cardsToDeal = Math.min(2, state.deck.length);
    if (cardsToDeal > 0) {
        const newCards = (0, helpers_1.dealCards)(state.deck, cardsToDeal);
        state.boardCards.push(...newCards);
    }
    (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
exports.transitionToTurn = transitionToTurn;
function transitionToRiver(state) {
    state.street = 'River';
    (0, helpers_1.collectRoundContributions)(state);
    const cardsToDeal = Math.min(1, state.deck.length);
    if (cardsToDeal > 0) {
        const newCards = (0, helpers_1.dealCards)(state.deck, cardsToDeal);
        state.boardCards.push(...newCards);
    }
    (0, helpers_1.forceDiscards)(state);
    (0, helpers_1.resetActedFlags)(state);
    state.currentPlayerSeat = (0, helpers_1.findNextActiveSeat)(state, state.button);
    return state;
}
exports.transitionToRiver = transitionToRiver;
function transitionToDeclare(state) {
    state.street = 'Declare';
    (0, helpers_1.collectRoundContributions)(state);
    // set a timer for declarations (do not code this yet)
    (0, helpers_1.resetActedFlags)(state);
    return state;
}
exports.transitionToDeclare = transitionToDeclare;
function transitionToShowdown(state) {
    state.street = 'Showdown';
    return (0, showdown_1.resolveShowdown)(state);
}
exports.transitionToShowdown = transitionToShowdown;
async function transitionToInterround(state) {
    state.street = 'Interround';
    // load up the queue
    const queue = await (0, interRoundActionQueue_1.loadInterRoundActions)(state.tableID);
    for (const action of queue) {
        await (0, interRoundActions_1.processInterRoundAction)(state, action);
        await (0, interRoundActionQueue_1.popInterRoundAction)(state.tableID);
    }
    return state;
}
