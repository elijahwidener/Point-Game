"use strict";
// ASSUMPTIONS made while adding turn timers:
//
// 1. timerSeq is incremented here, in the engine, at the two points where a
//    turn actually begins: an action that leaves the betting round open and
//    passes play to another seat (processPlayerAction), and a street
//    transition that opens a new betting round (advanceGameState). It is NOT
//    bumped on every write - unlike gameSeq - so a timeout can tell "this turn
//    is still live" from "play has moved on".
// 2. The bump rides along in the same conditional write as the state it
//    describes, so timerSeq can never disagree with the state it came from.
// 3. Timers are started only after that write is durable. If the Lambda dies
//    in between, the turn simply has no timer rather than a phantom one.
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPlayerAction = processPlayerAction;
exports.advanceGameState = advanceGameState;
const errors_1 = require("../../../shared/errors");
const commit_1 = require("../../../shared/persistence/commit");
const gameState_1 = require("../../../shared/persistence/gameState");
const gameTable_1 = require("../../../shared/persistence/gameTable");
const logger_1 = require("../../../shared/utils/logger");
const broadcaster_1 = require("../broadcaster");
const timers_1 = require("../timers");
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
    // A new turn begins when this action left the round open and handed play to
    // a different seat. That turn gets a fresh timerSeq.
    const closed = (0, actions_1.isActionClosed)(newState);
    const nextActor = closed ? null : (0, timers_1.turnActor)(newState);
    const startsNewTurn = nextActor !== null &&
        newState.currentPlayerSeat !== state.currentPlayerSeat;
    const nextTimerSeq = startsNewTurn ? (state.timerSeq || 0) + 1 : undefined;
    // State + action log commit together; a conflict here throws ConflictError.
    const newGameSeq = await (0, commit_1.commitActionAtomic)(tableID, newState, state.gameSeq, {
        handID: `${tableID}#${state.handSeq || 0}`,
        actionSeq: state.gameSeq + 1,
        playerID,
        action,
        payload,
        timestamp: Date.now()
    }, nextTimerSeq);
    newState.gameSeq = newGameSeq;
    if (nextTimerSeq !== undefined) {
        newState.timerSeq = nextTimerSeq;
    }
    // Broadcasts are deliberately OUTSIDE the transaction: they are side effects
    // on the WebSocket API and cannot be rolled back, so they only run once the
    // write is durable.
    // Broadcast for action log display (TODO: and animations)
    await (0, broadcaster_1.broadcastAction)(tableID, { playerID, action, payload, username }, newGameSeq, newState.street);
    // TODO: possibly depreciate if broadcast action is enough (derive state)
    await (0, broadcaster_1.broadcastState)(tableID);
    if (closed) {
        log.info('Action closed, advancing game state');
        await advanceGameState(tableID, newState);
        return;
    }
    if (startsNewTurn) {
        await (0, timers_1.startTurnTimer)(tableID, nextTimerSeq, nextActor.playerID);
    }
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
        // A street transition that leaves someone to act starts a new turn, so it
        // needs a fresh timerSeq written alongside the state it belongs to.
        const nextActor = (0, actions_1.isActionClosed)(state) ? null : (0, timers_1.turnActor)(state);
        const nextTimerSeq = nextActor !== null ? (state.timerSeq || 0) + 1 : undefined;
        try {
            const newGameSeq = await (0, gameState_1.updateGameState)(tableID, state, state.gameSeq, nextTimerSeq);
            state.gameSeq = newGameSeq;
            if (nextTimerSeq !== undefined) {
                state.timerSeq = nextTimerSeq;
            }
        }
        catch (error) {
            log.error('State conflict during game action', { error: error.message });
            throw new errors_1.ConflictError('State conflict during game action');
        }
        await (0, broadcaster_1.broadcastState)(tableID);
        if (nextActor !== null) {
            await (0, timers_1.startTurnTimer)(tableID, nextTimerSeq, nextActor.playerID);
        }
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
            if (!(0, actions_1.isActionClosed)(state)) {
                break;
            }
            else {
                // action is already closed (everyone all-in), keep advancing
                continue;
            }
        }
    }
}
