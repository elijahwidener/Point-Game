"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isActionClosed = exports.advanceToNextPlayer = exports.applyPlayerAction = void 0;
function applyPlayerAction(state, playerID, action, payload) {
    // Deep clone state to avoid mutations
    const newState = JSON.parse(JSON.stringify(state));
    const seatIndex = newState.currentPlayerSeat;
    const seat = newState.seats[seatIndex];
    switch (action) {
        case 'check':
            applyCheck(newState, seat);
            break;
        case 'call':
            applyCall(newState, seat);
            break;
        case 'raise':
            applyRaise(newState, seat, payload.amount);
            break;
        case 'declare':
            applyDeclare(newState, seat, payload.declaration);
            break;
        case 'fold':
            applyFold(newState, seat);
            break;
    }
    if (action !== 'declare') {
        advanceToNextPlayer(newState);
    }
    return newState;
}
exports.applyPlayerAction = applyPlayerAction;
function applyCheck(state, seat) {
    seat.acted = true;
}
function applyCall(state, seat) {
    const delta = Math.min((state.currentBet - seat.bet), seat.stack);
    seat.stack -= delta;
    seat.bet += delta;
    seat.acted = true;
}
function applyRaise(state, seat, totalBet) {
    const amountToAdd = totalBet - seat.bet;
    seat.stack -= amountToAdd;
    seat.bet += amountToAdd;
    seat.acted = true;
    // min raise = amount raised + bet except when short all in
    const amountRaised = totalBet - state.currentBet;
    state.currentBet = totalBet;
    if (seat.stack > 0) {
        state.minRaise = state.currentBet + amountRaised;
    }
    // Reset acted for all other non-all-in players
    state.seats.forEach((s) => {
        if (s.seat !== seat.seat && s.active && !s.folded && s.stack > 0) {
            s.acted = false;
        }
    });
}
function applyFold(state, seat) {
    seat.folded = true;
    seat.acted = true;
    seat.holeCards = []; // muck cards
}
function applyDeclare(state, seat, declaration) {
    seat.declaration = declaration;
    seat.acted = true;
}
function advanceToNextPlayer(state) {
    const numSeats = state.seats.length;
    let nextSeat = (state.currentPlayerSeat + 1) % numSeats;
    let attempts = 0;
    while (attempts < numSeats) {
        const seat = state.seats[nextSeat];
        if (seat.active && !seat.folded && seat.stack > 0) {
            state.currentPlayerSeat = nextSeat;
            return;
        }
        nextSeat = (nextSeat + 1) % numSeats;
        attempts++;
    }
    // if we loop around and find no active players, isActionClosed will return
    // true
}
exports.advanceToNextPlayer = advanceToNextPlayer;
function isActionClosed(state) {
    // If not in betting street, action is closed
    const bettingStreets = ['Preflop', 'Flop', 'Turn', 'River'];
    if (!bettingStreets.includes(state.street)) {
        return true;
    }
    const relevantPlayers = state.seats.filter(seat => seat.active && !seat.folded && seat.stack > 0);
    if (relevantPlayers.length <= 1) {
        return true;
    }
    for (const seat of relevantPlayers) {
        if (!seat.acted) {
            return false;
        }
        if (seat.bet < state.currentBet) {
            return false;
        }
    }
    return true;
}
exports.isActionClosed = isActionClosed;
