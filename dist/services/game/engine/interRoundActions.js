"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInterRoundAction = processInterRoundAction;
const errors_1 = require("../../../shared/errors");
const gameTable_1 = require("../../../shared/persistence/gameTable");
const types_1 = require("../../../shared/persistence/types");
const logger_1 = require("../../../shared/utils/logger");
const service_1 = require("../../user/service");
const index_1 = require("././index");
async function processInterRoundAction(state, action) {
    const log = logger_1.logger.child({
        tableID: state.tableID,
        fn: 'processInterRoundAction',
        actionType: action.type,
        actionSeq: action.actionSeq,
        userID: action.userID,
    });
    try {
        switch (action.type) {
            case types_1.InterRoundActions.START:
                log.info('Processing START action');
                await (0, index_1.advanceGameState)(state.tableID, state);
                break;
            case types_1.InterRoundActions.END:
                log.info('Processing END action');
                await processEnd(state, action);
                break;
            case types_1.InterRoundActions.JOIN:
                log.info('Processing JOIN action');
                await processJoin(state, action);
                break;
            case types_1.InterRoundActions.LEAVE:
                log.info('Processing LEAVE action');
                await processLeave(state, action);
                break;
            case types_1.InterRoundActions.TOGGLE_AWAY:
                log.info('Processing TOGGLE_AWAY action');
                await processToggleAway(state, action);
                break;
            case types_1.InterRoundActions.CONFIG_UPDATE:
                log.info('Processing CONFIG_UPDATE action');
                await processConfigUpdate(state, action);
                break;
            default:
                log.error('Unknown interround action type', { type: action.type });
        }
        log.info('Interround action completed successfully');
    }
    catch (error) {
        log.error('Failed to process interround action', {
            error: error.message,
            stack: error.stack,
        });
        throw error;
    }
}
async function processJoin(state, action) {
    const log = logger_1.logger.child({
        tableID: state.tableID,
        fn: 'processJoin',
        userID: action.userID,
    });
    const { buyIn, username } = action.payload;
    const userID = action.userID;
    const existingSeat = state.seats.find(s => s.playerID === userID);
    if (existingSeat) {
        log.warn('Player already seated, skipping duplicate join action');
        return;
    }
    if (!buyIn || buyIn <= 0) {
        log.warn('Invalid buy-in amount, skipping');
        return;
    }
    const emptySeatIndex = state.seats.findIndex(s => !s.active);
    if (emptySeatIndex === -1 || emptySeatIndex >= state.config.maxPlayers) {
        log.warn('No empty seat available, skipping join');
        return;
    }
    try {
        await (0, service_1.applyBalanceDelta)(userID, -buyIn);
    }
    catch (error) {
        log.error('Failed to deduct balance for join', { error: error.message });
        return;
    }
    const seat = state.seats[emptySeatIndex];
    seat.playerID = userID;
    seat.username = username;
    seat.stack = buyIn;
    seat.bet = 0;
    seat.holeCards = [];
    seat.folded = false;
    seat.acted = false;
    seat.active = true;
    seat.declaration = undefined;
    await (0, gameTable_1.updatePlayerCount)(state.tableID, 1);
    log.info('Player joined successfully', { seat: emptySeatIndex, stack: buyIn });
}
async function processLeave(state, action) {
    const userID = action.userID;
    const seat = state.seats.find(s => s.playerID === userID && s.active);
    if (!seat) {
        throw new errors_1.NotFoundError('Player not seated');
    }
    if (seat.stack > 0) {
        try {
            await (0, service_1.applyBalanceDelta)(userID, seat.stack);
        }
        catch (error) {
            console.error(`Failed to return stack to player ${userID}:`, error);
            throw new errors_1.ConflictError('Balance update failed');
        }
    }
    seat.playerID = '';
    seat.stack = 0;
    seat.bet = 0;
    seat.holeCards = [];
    seat.folded = false;
    seat.acted = false;
    seat.active = false;
    seat.declaration = undefined;
    await (0, gameTable_1.updatePlayerCount)(state.tableID, -1);
}
async function processToggleAway(state, action) {
    const userID = action.userID;
    const seat = state.seats.find(s => s.playerID === userID);
    if (!seat) {
        throw new errors_1.NotFoundError('Player not seated');
    }
    seat.active = !seat.active;
}
// config update for the table is handled already
async function processConfigUpdate(state, action) {
    const newConfig = action.payload;
    if (!newConfig || typeof newConfig !== 'object') {
        throw new errors_1.ConflictError('Invalid config payload');
    }
    // Validate config values
    if (newConfig.ante !== undefined && newConfig.ante < 0) {
        throw new errors_1.ConflictError('Ante must be non-negative');
    }
    if (newConfig.smallBlind !== undefined && newConfig.smallBlind <= 0) {
        throw new errors_1.ConflictError('Small blind must be positive');
    }
    if (newConfig.bigBlind !== undefined && newConfig.bigBlind <= 0) {
        throw new errors_1.ConflictError('Big blind must be positive');
    }
    if (newConfig.smallBlind && newConfig.bigBlind &&
        newConfig.smallBlind >= newConfig.bigBlind) {
        throw new errors_1.ConflictError('Small blind must be less than big blind');
    }
    // Apply config to game state
    state.config = { ...state.config, ...newConfig };
    // Also update the table record (already done in table service, but we update
    // state here)
}
async function processEnd(state, action) {
    // Cash out all seated players
    const cashoutPromises = state.seats.filter(seat => seat.active && seat.stack > 0)
        .map(async (seat) => {
        try {
            await (0, service_1.applyBalanceDelta)(seat.playerID, seat.stack);
            // Clear the seat
            seat.stack = 0;
            seat.active = false;
        }
        catch (error) {
            console.error(`Failed to cash out player ${seat.playerID}:`, error);
            // Continue with other players even if one fails
        }
    });
    await Promise.all(cashoutPromises);
    // Table service has already updated table.status to 'Ended'
    console.log(`Game ended at table ${state.tableID}, all players cashed out`);
}
