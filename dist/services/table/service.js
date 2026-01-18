"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameTable = createGameTable;
exports.getTable = getTable;
exports.listGameTables = listGameTables;
exports.takeSeat = takeSeat;
exports.leaveSeat = leaveSeat;
exports.togglePause = togglePause;
exports.toggleAway = toggleAway;
exports.updateConfig = updateConfig;
exports.endGame = endGame;
exports.startGame = startGame;
const crypto_1 = require("crypto");
const errors_1 = require("../../shared/errors");
const gameState_1 = require("../../shared/persistence/gameState");
const gameTable_1 = require("../../shared/persistence/gameTable");
const interRoundActionQueue_1 = require("../../shared/persistence/interRoundActionQueue");
const types_1 = require("../../shared/persistence/types");
const engine_1 = require("../game/engine");
const interRoundActions_1 = require("../game/engine/interRoundActions");
const service_1 = require("../user/service");
async function enqueueOrProcessInterRoundAction(table, type, userID, payload) {
    const gameState = await (0, gameState_1.loadGameState)(table.tableID);
    if (!gameState)
        throw new errors_1.NotFoundError('GameState not found');
    if (gameState?.street === 'Interround') {
        const action = {
            tableID: table.tableID,
            actionSeq: table.interRoundActionSeq + 1,
            userID,
            type,
            payload
        };
        await (0, interRoundActions_1.processInterRoundAction)(gameState, action);
        await (0, gameState_1.updateGameState)(table.tableID, gameState, gameState.gameSeq);
    }
    else {
        await (0, interRoundActionQueue_1.enqueueInterRoundAction)(table.tableID, table.interRoundActionSeq + 1, userID, type, payload);
        await (0, gameTable_1.updateCurrentInterroundActionSeq)(table.tableID, table.interRoundActionSeq, table.interRoundActionSeq + 1);
    }
}
async function createGameTable(ownerID, tableName, config) {
    const tableID = (0, crypto_1.randomUUID)();
    const finalConfig = { ...config, maxPlayers: config.maxPlayers ?? 8 };
    await (0, gameTable_1.createTable)(tableID, ownerID, tableName, finalConfig);
    const initialState = {
        tableID,
        handSeq: 0,
        config: finalConfig,
        seats: Array.from({ length: 8 }, (_, i) => ({
            seat: i,
            playerID: '',
            username: '',
            stack: 0,
            bet: 0,
            holeCards: [],
            folded: false,
            active: false,
            acted: false
        })),
        deck: [],
        street: 'Interround',
        boardCards: [],
        button: 0,
        pots: [],
        currentPlayerSeat: 0,
        currentBet: 0,
        minRaise: config.bigBlind,
        timerSeq: 0,
        gameSeq: 0
    };
    await (0, gameState_1.createGameState)(initialState);
    return tableID;
}
async function getTable(tableID) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    return table;
}
async function listGameTables(filter) {
    // anything else here?
    return (0, gameTable_1.listTables)(filter);
}
async function takeSeat(tableID, userID, buyIn) {
    // QUESTION: Should this be a call to the auth service, persistence
    // layer, or a user service inside table?
    const user = await (0, service_1.getMe)(userID);
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (user.balance < buyIn)
        throw new errors_1.ConflictError('Insufficient funds');
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    if (table.status === 'Ended')
        throw new errors_1.ConflictError('Table has ended');
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.JOIN, userID, { buyIn, username: user.username });
}
async function leaveSeat(tableID, userID) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.LEAVE, userID, null);
}
async function togglePause(tableID, userID) {
    const table = await getTable(tableID);
    if (table.ownerID !=
        userID)
        throw new errors_1.UnauthorizedError('Only table owner can pause game');
    if (table.status === 'Running') {
        await (0, gameTable_1.updateTableStatus)(tableID, 'Paused');
    }
    else if (table.status === 'Paused') {
        await (0, gameTable_1.updateTableStatus)(tableID, 'Running');
    }
    else
        throw new errors_1.ConflictError('INVALID: Game has not started or is ended');
}
async function toggleAway(tableID, userID) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.TOGGLE_AWAY, userID, null);
}
async function updateConfig(tableID, userID, config) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    if (table.ownerID !== userID)
        throw new errors_1.UnauthorizedError('Unauthorized');
    if (table.status === 'Ended')
        throw new errors_1.ConflictError('Cannot update ended game');
    // Enqueue the config update
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.CONFIG_UPDATE, userID, config);
    // Also update the table's config immediately (so new players see it)
    await (0, gameTable_1.updateTableConfig)(tableID, config);
}
async function endGame(tableID, userID) {
    const table = await getTable(tableID);
    if (table.ownerID !== userID)
        throw new errors_1.UnauthorizedError('Only table owner can end game');
    if (table.status === 'Ended')
        throw new errors_1.ConflictError('Cannot end ended game');
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.END, userID, []);
    await (0, gameTable_1.updateTableStatus)(tableID, 'Ended');
}
async function startGame(tableID, userID) {
    const table = await getTable(tableID);
    if (table.ownerID !== userID) {
        throw new errors_1.UnauthorizedError('Only table owner can start game');
    }
    if (table.status === 'Running' || table.status === 'Ended') {
        throw new errors_1.ConflictError('Game already running or is ended');
    }
    const state = await (0, gameState_1.loadGameState)(tableID);
    if (!state)
        throw new errors_1.NotFoundError('Game state not found');
    const activePlayers = state.seats.filter(s => s.active).length;
    if (activePlayers < 3) {
        throw new errors_1.ConflictError('Need at least 3 players to start');
    }
    await (0, gameTable_1.updateTableStatus)(tableID, 'Running');
    await (0, engine_1.advanceGameState)(tableID, state);
}
