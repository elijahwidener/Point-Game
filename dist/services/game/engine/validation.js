"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAction = validateAction;
const errors_1 = require("../../../shared/errors");
function validateAction(state, playerID, action, payload) {
    if (state.street === 'Declare') {
        if (action !== 'declare') {
            throw new errors_1.BadRequestError('Can only declare during Declare phase');
        }
        validateDeclare(state, playerID, payload);
        return;
    }
    // 1. Check game can accept player actions
    const bettingStreets = ['Preflop', 'Flop', 'Turn', 'River'];
    if (!bettingStreets.includes(state.street))
        throw new errors_1.ConflictError(`Cannot preform actions during ${state.street}`);
    // 2. Check if its the players turn
    const currentSeat = state.seats[state.currentPlayerSeat];
    if (!currentSeat || currentSeat.playerID !== playerID)
        throw new errors_1.ConflictError('Not your turn');
    // 3. Check player is active
    if (!currentSeat.active || currentSeat.folded) {
        throw new errors_1.ConflictError('Player is not active');
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
            throw new errors_1.BadRequestError(`Unknown action: ${action}`);
    }
}
function validateDeclare(state, playerID, payload) {
    const seat = state.seats.find(s => s.playerID === playerID);
    if (!seat) {
        throw new errors_1.ConflictError('Player not found at table');
    }
    if (!seat.active || seat.folded) {
        throw new errors_1.ConflictError('Player is not active');
    }
    if (seat.declaration) {
        throw new errors_1.ConflictError('Already declared');
    }
    const validDeclarations = ['high', 'low', 'both'];
    if (!payload?.declaration ||
        !validDeclarations.includes(payload.declaration)) {
        throw new errors_1.BadRequestError('Invalid declaration - must be high, low, or both');
    }
}
function validateCheck(state, seat) {
    if (seat.bet !== state.currentBet)
        throw new errors_1.BadRequestError('Cannot check - must call or raise');
}
function validateCall(state, seat) {
    if (seat.bet === state.currentBet)
        throw new errors_1.BadRequestError('Cannot call - should check instead');
}
function validateRaise(state, seat, payload) {
    const raiseAmount = payload.amount;
    if (!raiseAmount || raiseAmount <= 0) {
        throw new errors_1.BadRequestError('Invalid raise amount');
    }
    const totalBet = seat.bet + raiseAmount;
    if (totalBet <= state.currentBet) {
        throw new errors_1.BadRequestError('Raise must be higher than current bet');
    }
    if (raiseAmount < state.minRaise && raiseAmount < seat.stack) {
        throw new errors_1.BadRequestError('Raise must be at least ${state.minRaise}');
    }
    if (raiseAmount > seat.stack) {
        throw new errors_1.BadRequestError('Insufficient chips');
    }
}
