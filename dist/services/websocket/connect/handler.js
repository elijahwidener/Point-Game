"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const connectionStore_1 = require("../../../shared/persistence/connectionStore");
const gameTable_1 = require("../../../shared/persistence/gameTable");
async function handler(event) {
    const connectionID = event.requestContext.connectionId;
    // Parse tableID and userID from query string (or custom headers)
    const tableID = event.queryStringParameters?.tableID;
    const userID = event.queryStringParameters?.userID;
    if (!tableID || !userID) {
        return { statusCode: 400, body: 'Missing tableID or userID' };
    }
    const table = await (0, gameTable_1.loadGameTable)(tableID);
    if (!table)
        return { statusCode: 404, body: 'Table not found' };
    await (0, connectionStore_1.registerConnection)(tableID, connectionID, userID);
    console.log(`Connection ${connectionID} registered for table ${tableID} and user ${userID}`);
    return { statusCode: 200, body: '' };
}
