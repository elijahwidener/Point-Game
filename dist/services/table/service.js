"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGameTable = createGameTable;
exports.getTable = getTable;
exports.connectToTable = connectToTable;
exports.listGameTables = listGameTables;
exports.takeSeat = takeSeat;
exports.togglePause = togglePause;
exports.updateConfig = updateConfig;
exports.endGame = endGame;
const crypto_1 = require("crypto");
const errors_1 = require("../../shared/errors");
const gameState_1 = require("../../shared/persistence/gameState");
const gameTable_1 = require("../../shared/persistence/gameTable");
const interRoundActionQueue_1 = require("../../shared/persistence/interRoundActionQueue");
const types_1 = require("../../shared/persistence/types");
const service_1 = require("../user/service");
async function enqueueOrProcessInterRoundAction(table, type, userID, payload) {
    const gameState = await (0, gameState_1.loadGameState)(table.tableID);
    // if (gameState?.street === 'Interround') {
    //   await processInterRoundAction(table.tableID, type, payload);
    //  } else {
    await (0, interRoundActionQueue_1.enqueueInterRoundAction)(table.tableID, table.interRoundActionSeq + 1, userID, type, payload);
    //}
}
// DONE
async function createGameTable(ownerID, config) {
    const tableID = (0, crypto_1.randomUUID)();
    return await (0, gameTable_1.createTable)(tableID, ownerID, config);
}
async function getTable(tableID) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    return table;
}
async function connectToTable(tableID) {
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        throw new errors_1.NotFoundError('Table not found');
    // WebSocket connection happens separately via $connect route
    // This just validates access and returns table data
    // Any validation (banned users, private tables, etc.)
    return table;
}
// DONE
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
    await enqueueOrProcessInterRoundAction(table, types_1.InterRoundActions.JOIN, userID, buyIn);
}
// DONE
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
// DONE
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
// DONE
async function endGame(tableID, userID) {
    const table = await getTable(tableID);
    if (table.ownerID !== userID)
        throw new errors_1.UnauthorizedError('Only table owner can end game');
    if (table.status === 'Ended')
        throw new errors_1.ConflictError('Cannot end ended game');
    await (0, gameTable_1.updateTableStatus)(tableID, 'Ended');
}
