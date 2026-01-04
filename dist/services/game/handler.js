"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
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
                // TODO: Handle resync request
                break;
            default:
                return { statusCode: 400, body: 'Unknown message type' };
        }
        return { statusCode: 200, body: 'OK' };
    }
    catch (error) {
        console.error('Game handler error:', error);
        return { statusCode: 500, body: error.message };
    }
}
