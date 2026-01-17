"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPlayerAction = processPlayerAction;
exports.advanceGameState = advanceGameState;
const errors_1 = require("../../../shared/errors");
const actionLog_1 = require("../../../shared/persistence/actionLog");
const gameState_1 = require("../../../shared/persistence/gameState");
const gameTable_1 = require("../../../shared/persistence/gameTable");
const broadcaster_1 = require("../broadcaster");
const actions_1 = require("./actions");
const transitions_1 = require("./transitions");
const validation_1 = require("./validation");
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
};
async function processPlayerAction(tableID, playerID, action, payload) {
    const state = await (0, gameState_1.loadGameState)(tableID);
    if (!state)
        throw new errors_1.NotFoundError('Game state not found');
    (0, validation_1.validateAction)(state, playerID, action, payload);
    let newState = (0, actions_1.applyPlayerAction)(state, playerID, action, payload);
    const newGameSeq = await (0, gameState_1.updateGameState)(tableID, newState, state.gameSeq);
    newState.gameSeq = newGameSeq;
    await (0, actionLog_1.writeAction)({
        handID: `${tableID}#${state.handSeq || 0}`,
        actionSeq: newState.gameSeq,
        playerID,
        action,
        payload,
        timestamp: Date.now()
    });
    // await broadcastAction(tableID, {playerID, action, payload}, newGameSeq);
    console.log(`Action applied. Broadcasting state...`);
    await (0, broadcaster_1.broadcastState)(tableID);
    const closed = (0, actions_1.isActionClosed)(newState);
    console.log(`isActionClosed: ${closed}, street: ${newState.street}`);
    if (closed) {
        console.log(`Advancing game state...`);
        await advanceGameState(tableID, newState);
    }
    // new turn timer (dont code this yet)
}
async function advanceGameState(tableID, currentState) {
    let state = currentState;
    // Keep processing until we hit a player action street
    while (true) {
        state = await (0, transitions_1.transitionToStreet)(state);
        try {
            const newGameSeq = await (0, gameState_1.updateGameState)(tableID, state, state.gameSeq);
            state.gameSeq = newGameSeq;
        }
        catch (error) {
            throw new errors_1.ConflictError('State conflict during game action');
        }
        await (0, broadcaster_1.broadcastState)(tableID);
        if (state.street === 'Interround') {
            // Check if we should continue to next hand
            const table = await (0, gameTable_1.loadGameTable)(tableID);
            if (!table)
                throw new errors_1.NotFoundError('Table not found');
            if (table?.status === 'Running') {
                continue; // Loop will transition to Preflop
            }
            else {
                break; // Paused, Waiting, or ended, stop here
            }
        }
        const actionStreets = ['Preflop', 'Flop', 'Turn', 'River', 'Declare'];
        if (actionStreets.includes(state.street)) {
            break;
        }
    }
}
