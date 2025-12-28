"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const connectionStore_1 = require("../../shared/persistence/connectionStore");
const service_1 = require("./service");
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
};
function success(statusCode, body) {
    return {
        statusCode,
        headers: corsHeaders,
        body: body ? JSON.stringify(body) : '',
    };
}
function error(statusCode, message) {
    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify({ message }),
    };
}
async function handler(event) {
    try {
        const route = `${event.httpMethod} ${event.resource}`; // ✅ Use resource, not path
        switch (route) {
            case 'POST /tables': {
                if (!event.body)
                    throw new Error('Invalid');
                const { userID, config } = JSON.parse(event.body);
                if (!userID || !config) {
                    throw new Error('Invalid');
                }
                const tableID = await (0, service_1.createGameTable)(userID, config);
                return success(201, tableID);
            }
            case 'GET /tables': {
                const filter = event.queryStringParameters || {};
                const tables = await (0, service_1.listGameTables)(filter);
                return success(200, { tables });
            }
            case 'GET /tables/{tableID}': {
                const tableID = event.pathParameters?.tableID;
                if (!tableID)
                    return error(400, 'Missing tableID');
                const table = await (0, service_1.getTable)(tableID);
                return success(200, table);
            }
            // not going to stop gameplay, just stop hands from being dealt
            case 'POST /tables/{tableID}/pause_unpause': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID } = JSON.parse(event.body);
                if (!userID || !tableID) {
                    throw new Error('Invalid');
                }
                await (0, service_1.togglePause)(tableID, userID);
                return success(204);
            }
            case 'POST /tables/{tableID}/connect': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID } = JSON.parse(event.body);
                const table = await (0, service_1.connectToTable)(tableID);
                return success(200, table);
                // join needs to connect to websocket
                // then returns the user the table's game state...? or no... we return
                // the tableID or and a confirmation then the frontend receives the
                // web sockets thing...? need to think about how this works with
                // frontend especially if we want multi tables.
            }
            case 'POST /tables/{tableID}/sit': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID, buyIn } = JSON.parse(event.body);
                await (0, service_1.takeSeat)(tableID, userID, buyIn);
                return success(204);
            }
            case 'POST /tables/{tableID}/leave': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID } = JSON.parse(event.body);
                // disconnects the websocket
                await (0, connectionStore_1.removeConnection)(tableID, userID);
                return success(200, { message: 'Disconnected' });
            }
            // DONE
            case 'POST /tables/{tableID}/end': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID } = JSON.parse(event.body);
                if (!userID || !tableID) {
                    throw new Error('Invalid');
                }
                await (0, service_1.endGame)(tableID, userID); // finalizes ledger, removes game
                // state, sets table status to ended
                return success(204);
            }
            // DONE
            case 'PATCH /tables/{tableID}/update_config': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { userID, config } = JSON.parse(event.body);
                if (!userID || !tableID || !config) {
                    throw new Error('Invalid');
                }
                await (0, service_1.updateConfig)(tableID, userID, config);
                return success(204);
            }
            default:
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: 'Not Found' }),
                };
        }
    }
    catch (err) {
        return {
            statusCode: err.statusCode || 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: err.message }),
        };
    }
}
exports.handler = handler;
