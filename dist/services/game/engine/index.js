"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPlayerAction = processPlayerAction;
exports.advanceGameState = advanceGameState;
const errors_1 = require("../../../shared/errors");
const actionLog_1 = require("../../../shared/persistence/actionLog");
const gameState_1 = require("../../../shared/persistence/gameState");
const gameTable_1 = require("../../../shared/persistence/gameTable");
const logger_1 = require("../../../shared/utils/logger");
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
    const log = logger_1.logger.child({ tableID, fn: 'processPlayerAction' });
    if (!state) {
        log.error('Game state not found');
        throw new errors_1.NotFoundError('Game not found');
    }
    (0, validation_1.validateAction)(state, playerID, action, payload);
    const seat = state.seats.find(s => s.playerID === playerID);
    const username = seat?.username || playerID;
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
    // Broadcast for action log display (TODO: and animations)
    await (0, broadcaster_1.broadcastAction)(tableID, { playerID, action, payload, username }, newGameSeq, newState.street);
    // TODO: possibly depreciate if broadcast action is enough (derive state)
    await (0, broadcaster_1.broadcastState)(tableID);
    const closed = (0, actions_1.isActionClosed)(newState);
    if (closed) {
        log.info('Action closed, advancing game state');
        await advanceGameState(tableID, newState);
    }
    // new turn timer (dont code this yet)
}
async function advanceGameState(tableID, currentState) {
    let state = currentState;
    const log = logger_1.logger.child({ tableID, fn: 'advanceGameState' });
    // Keep processing until we hit a player action street
    while (true) {
        const prevStreet = state.street;
        state = await (0, transitions_1.transitionToStreet)(state);
        log.info('Street transition completed', {
            from: prevStreet,
            to: state.street,
            gameSeq: state.gameSeq,
            boardCards: state.boardCards.length,
            potsCount: state.pots.length,
        });
        try {
            const newGameSeq = await (0, gameState_1.updateGameState)(tableID, state, state.gameSeq);
            state.gameSeq = newGameSeq;
        }
        catch (error) {
            log.error('State conflict during game action', { error: error.message });
            throw new errors_1.ConflictError('State conflict during game action');
        }
        await (0, broadcaster_1.broadcastState)(tableID);
        if (state.street === 'Interround') {
            const table = await (0, gameTable_1.loadGameTable)(tableID);
            log.info('At Interround, checking table status', { tableStatus: table?.status });
            if (table?.status === 'Running') {
                log.info('Table running, continuing to next hand');
                continue;
            }
            else {
                log.info('Table not running, stopping advancement');
                break;
            }
        }
        const actionStreets = ['Preflop', 'Flop', 'Turn', 'River', 'Declare'];
        if (actionStreets.includes(state.street)) {
            break;
        }
    }
}
