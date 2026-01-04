"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const connectionStore_1 = require("../../../shared/persistence/connectionStore");
async function handler(event) {
    const connectionID = event.requestContext.connectionId;
    const conn = await (0, connectionStore_1.loadConnectionByConnectionID)(connectionID);
    if (conn) {
        await (0, connectionStore_1.removeConnection)(conn.tableID, connectionID);
    }
    return { statusCode: 200, body: 'Disconnected' };
}
exports.handler = handler;
