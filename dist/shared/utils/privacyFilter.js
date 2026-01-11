"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyPrivacyFiltering = applyPrivacyFiltering;
function applyPrivacyFiltering(state, playerID) {
    const filtered = { ...state };
    delete filtered.deck;
    filtered.seats = state.seats.map((seat) => {
        if (seat.playerID !== playerID) {
            return { ...seat, holeCards: seat.holeCards.map(() => null) };
        }
        return seat;
    });
    return { type: 'state', payload: filtered };
}
