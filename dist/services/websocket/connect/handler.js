"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const connectionStore_1 = require("../../../shared/persistence/connectionStore");
const gameTable_1 = require("../../../shared/persistence/gameTable");
async function handler(event) {
    const connectionID = event.requestContext.connectionId;
    const { tableID, userID } = JSON.parse(event.body || '{}');
    try {
        const table = await (0, gameTable_1.loadGameTable)(tableID);
        if (!table) {
            return { statusCode: 404, body: 'Table not found' };
        }
        await (0, connectionStore_1.registerConnection)(tableID, connectionID, userID);
        return { statusCode: 200, body: 'Connected' };
    }
    catch (error) {
        return { statusCode: 500, body: error.message };
    }
}
exports.handler = handler;
