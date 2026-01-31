"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const connectionStore_1 = require("../../shared/persistence/connectionStore");
const gameState_1 = require("../../shared/persistence/gameState");
const logger_1 = require("../../shared/utils/logger");
const privacyFilter_1 = require("../../shared/utils/privacyFilter");
const broadcaster_1 = require("./broadcaster");
const engine_1 = require("./engine");
async function handler(event) {
    const connectionID = event.requestContext.connectionId;
    const message = JSON.parse(event.body || '{}');
    try {
        switch (message.type) {
            case 'player_action':
                await (0, engine_1.processPlayerAction)(message.tableID, message.userID, message.action, message.payload);
                break;
            case 'resync':
                await handleResync(connectionID, message.tableID);
                break;
            default:
                console.warn(`Unknown message type: ${message.type}`);
                return { statusCode: 400, body: 'Unknown message type' };
        }
        return { statusCode: 200, body: 'OK' };
    }
    catch (error) {
        console.error('Game handler error:', error);
        try {
            const conn = await (0, connectionStore_1.loadConnectionByConnectionID)(connectionID);
            if (conn) {
                await (0, broadcaster_1.sendToConnection)(conn.tableID, connectionID, {
                    type: 'error',
                    payload: {
                        code: error.statusCode || 500,
                        message: error.message || 'Internal server error'
                    }
                });
            }
        }
        catch (sendError) {
            console.error('Failed to send error to client:', sendError);
        }
        return { statusCode: error.statusCode || 500, body: error.message };
    }
}
async function handleResync(connectionID, tableID) {
    const log = logger_1.logger.child({ tableID, connectionID, fn: 'handleResync' });
    const conn = await (0, connectionStore_1.loadConnectionByConnectionID)(connectionID);
    if (!conn) {
        log.error('Resync requested but connection not found');
        return;
    }
    const state = await (0, gameState_1.loadGameState)(tableID);
    if (!state) {
        await (0, broadcaster_1.sendToConnection)(tableID, connectionID, {
            type: 'system',
            payload: { event: 'no_game', message: 'No active game at this table' }
        });
        return;
    }
    const displayState = (0, privacyFilter_1.applyPrivacyFiltering)(state, conn.playerID);
    await (0, broadcaster_1.sendToConnection)(tableID, connectionID, { type: 'state', payload: displayState });
    log.info('Resync sent', { playerID: conn.playerID });
}
