"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.broadcastAction = exports.broadcastState = void 0;
const client_apigatewaymanagementapi_1 = require("@aws-sdk/client-apigatewaymanagementapi");
const connectionStore_1 = require("../../shared/persistence/connectionStore");
const gameState_1 = require("../../shared/persistence/gameState");
const apiGateway = new client_apigatewaymanagementapi_1.ApiGatewayManagementApiClient({ endpoint: process.env.WEBSOCKET_API_ENDPOINT });
async function broadcastState(tableID) {
    const state = await (0, gameState_1.loadGameState)(tableID);
    const connections = await (0, connectionStore_1.loadTableConnections)(tableID);
    if (!state || !connections)
        return;
    await Promise.allSettled(connections.map(conn => {
        const filteredState = applyPrivacyFiltering(state, conn.playerID);
        return postToConnection(tableID, conn.connectionID, filteredState);
    }));
}
exports.broadcastState = broadcastState;
async function broadcastAction(tableID, action) {
    const connections = await (0, connectionStore_1.loadTableConnections)(tableID);
    if (!connections)
        return;
    await Promise.allSettled(connections.map(conn => postToConnection(tableID, conn.connectionID, { type: 'action', action })));
}
exports.broadcastAction = broadcastAction;
function applyPrivacyFiltering(state, playerID) {
    // Filter out other players' hole cards
    const filtered = { ...state };
    filtered.seats = state.seats.map((seat) => {
        if (seat.playerID !== playerID) {
            return { ...seat, holeCards: null };
        }
        return seat;
    });
    return filtered;
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
            console.log('Stale connection:', connectionID);
        }
    }
}
