"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastState = broadcastState;
exports.broadcastAction = broadcastAction;
exports.broadcastSystem = broadcastSystem;
exports.sendToConnection = sendToConnection;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const connectionStore_1 = require("../../shared/persistence/connectionStore");
const gameState_1 = require("../../shared/persistence/gameState");
const logger_1 = require("../../shared/utils/logger");
const privacyFilter_1 = require("../../shared/utils/privacyFilter");
const apiGateway = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_API_ENDPOINT });
/**
 * Broadcasts the full game state to all connected players.
 * Each player receives a filtered view based on privacy rules.
 */
async function broadcastState(tableID) {
    const state = await (0, gameState_1.loadGameState)(tableID);
    const connections = await (0, connectionStore_1.loadTableConnections)(tableID);
    const log = logger_1.logger.child({ tableID, fn: 'broadcastState' });
    if (!state || !connections)
        return;
    log.info('State to broadcast', {
        street: state.street,
        gameSeq: state.gameSeq,
        handSeq: state.handSeq,
        boardCards: state.boardCards,
        currentPlayerSeat: state.currentPlayerSeat,
    });
    await Promise.allSettled(connections.map(conn => {
        const filteredState = (0, privacyFilter_1.applyPrivacyFiltering)(state, conn.playerID);
        const message = { type: 'state', payload: filteredState };
        return postToConnection(tableID, conn.connectionID, message);
    }));
}
/**
 * Broadcasts a player action to all connected players.
 *
 * @param tableID - The table to broadcast to
 * @param action - The action details including playerID, action type, and
 *     payload
 * @param gameSeq - The game sequence number for ordering
 * @param currentStreet - Current game street for privacy filtering
 */
async function broadcastAction(tableID, action, gameSeq, currentStreet) {
    const connections = await (0, connectionStore_1.loadTableConnections)(tableID);
    if (!connections)
        return;
    let sanitizedAction = action;
    if (action.action === 'declare') {
        sanitizedAction = { ...action, payload: undefined };
    }
    const message = { type: 'action', payload: { ...sanitizedAction, gameSeq } };
    await Promise.allSettled(connections.map(conn => postToConnection(tableID, conn.connectionID, message)));
}
/**
 * Broadcasts a system message to all connected players.
 * System messages include things like:
 * - showdown_results: Winner announcements at start of next hand
 * - discards: Cards discarded by players
 * - street_change: When the game advances to a new street
 */
async function broadcastSystem(tableID, event, data) {
    const connections = await (0, connectionStore_1.loadTableConnections)(tableID);
    if (!connections)
        return;
    const message = { type: 'system', payload: { event, ...data } };
    await Promise.allSettled(connections.map(conn => postToConnection(tableID, conn.connectionID, message)));
}
async function postToConnection(tableID, connectionID, message) {
    try {
        await apiGateway.send(new client_apigatewaymanagementapi_1.PostToConnectionCommand({
            ConnectionId: connectionID,
            Data: Buffer.from(JSON.stringify(message))
        }));
    }
    catch (error) {
        if (error.statusCode === 410) {
            await (0, connectionStore_1.removeConnection)(tableID, connectionID);
            console.log(`Removed stale connection: ${connectionID}`);
        }
        else {
            console.error(`Failed to send to ${connectionID}: ${error.message}`);
        }
    }
}
/**
 * Sends a message directly to a specific connection.
 * Used for resync requests and targeted messages.
 */
async function sendToConnection(tableID, connectionID, message) {
    await postToConnection(tableID, connectionID, message);
}
