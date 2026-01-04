"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processInterRoundAction = processInterRoundAction;
const errors_1 = require("../../../shared/errors");
const types_1 = require("../../../shared/persistence/types");
const service_1 = require("../../user/service");
const index_1 = require("././index");
async function processInterRoundAction(state, action) {
    try {
        // Validate and process based on type
        switch (action.type) {
            case types_1.InterRoundActions.START:
                await (0, index_1.advanceGameState)(state.tableID, state);
                break;
            case types_1.InterRoundActions.END:
                await processEnd(state, action);
                break;
            case types_1.InterRoundActions.JOIN:
                await processJoin(state, action);
                break;
            case types_1.InterRoundActions.LEAVE:
                await processLeave(state, action);
                break;
            case types_1.InterRoundActions.STAND_UP:
                break;
            case types_1.InterRoundActions.SIT_DOWN:
                break;
            case types_1.InterRoundActions.CONFIG_UPDATE:
                await processConfigUpdate(state, action);
                break;
        }
    }
    catch (error) {
        console.error('Failed to process interround action:', error);
        throw error;
    }
}
async function processJoin(state, action) {
    const buyIn = action.payload;
    const userID = action.userID;
    if (!buyIn || buyIn <= 0) {
        throw new errors_1.ConflictError('Invalid buy-in amount');
    }
    const existingSeat = state.seats.find(s => s.playerID === userID);
    if (existingSeat) {
        throw new errors_1.ConflictError('Player already seated');
    }
    const emptySeatIndex = state.seats.findIndex(s => !s.active);
    if (emptySeatIndex === -1) {
        throw new errors_1.ConflictError('Table is full');
    }
    try {
        await (0, service_1.applyBalanceDelta)(userID, -buyIn);
    }
    catch (error) {
        throw new errors_1.ConflictError('Insufficient funds or balance update failed');
    }
    const seat = state.seats[emptySeatIndex];
    seat.playerID = userID;
    seat.stack = buyIn;
    seat.bet = 0;
    seat.holeCards = [];
    seat.folded = false;
    seat.acted = false;
    seat.active = true;
    seat.declaration = undefined;
    console.log(`Player ${userID} joined table ${state.tableID} at seat ${emptySeatIndex} with ${buyIn} chips`);
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
    console.log(`Player ${userID} left table ${state.tableID}, cashed out ${seat.stack} chips`);
}
async function processStandUp(state, action) {
    const userID = action.userID;
    const seat = state.seats.find(s => s.playerID === userID);
    if (!seat) {
        throw new errors_1.NotFoundError('Player not seated');
    }
    seat.active = false;
    console.log(`Player ${userID} is now sitting out at table ${state.tableID}`);
}
async function processSitDown(state, action) {
    const userID = action.userID;
    const seat = state.seats.find(s => s.playerID === userID && !s.active);
    if (!seat) {
        throw new errors_1.NotFoundError('Player not found or already active');
    }
    const minStack = state.config.ante;
    if (seat.stack < minStack) {
        throw new errors_1.ConflictError(`Insufficient stack to sit back down. Need at least ${minStack} chips.`);
    }
    seat.active = true;
    console.log(`Player ${userID} is back at table ${state.tableID}`);
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
    console.log(`Config updated for game ${state.tableID}:`, state.config);
}
async function processEnd(state, action) {
    // Cash out all seated players
    const cashoutPromises = state.seats.filter(seat => seat.active && seat.stack > 0)
        .map(async (seat) => {
        try {
            await (0, service_1.applyBalanceDelta)(seat.playerID, seat.stack);
            console.log(`Cashed out ${seat.playerID}: ${seat.stack} chips`);
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
