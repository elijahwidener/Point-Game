"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
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
function getUserIDFromClaims(event) {
    const claims = event.requestContext.authorizer?.claims;
    return claims?.sub || null;
}
async function handler(event) {
    try {
        const route = `${event.httpMethod} ${event.resource}`;
        const userID = getUserIDFromClaims(event);
        if (!userID) {
            return error(401, 'Unauthorized - missing or invalid token');
        }
        switch (route) {
            case 'POST /tables': {
                if (!event.body)
                    throw new Error('Invalid');
                const { tableName, config } = JSON.parse(event.body);
                if (!config || !tableName) {
                    throw new Error('Invalid - missing tableName or config');
                }
                const tableID = await (0, service_1.createGameTable)(userID, tableName, config);
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
                if (!tableID) {
                    throw new Error('Invalid - missing tableID');
                }
                await (0, service_1.togglePause)(tableID, userID);
                return success(204);
            }
            case 'POST /tables/{tableID}/sit': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { buyIn } = JSON.parse(event.body);
                if (!buyIn) {
                    throw new Error('Invalid - missing buyIn');
                }
                await (0, service_1.takeSeat)(tableID, userID, buyIn);
                return success(204);
            }
            case 'POST /tables/{tableID}/leave': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                if (!tableID) {
                    throw new Error('Invalid - missing tableID');
                }
                await (0, service_1.leaveSeat)(tableID, userID);
                return success(204);
            }
            case 'POST /tables/{tableID}/end': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                if (!tableID) {
                    throw new Error('Invalid - missing tableID');
                }
                await (0, service_1.endGame)(tableID, userID); // finalizes ledger, removes game
                // state, sets table status to ended
                return success(204);
            }
            case 'PATCH /tables/{tableID}/update_config': {
                if (!event.body)
                    throw new Error('Invalid');
                const tableID = event.pathParameters?.tableID;
                const { config } = JSON.parse(event.body);
                if (!tableID || !config) {
                    throw new Error('Invalid - missing tableID or config');
                }
                await (0, service_1.updateConfig)(tableID, userID, config);
                return success(204);
            }
            case 'POST /tables/{tableID}/start': {
                const tableID = event.pathParameters?.tableID;
                if (!tableID) {
                    throw new Error('Invalid - missing tableID');
                }
                await (0, service_1.startGame)(tableID, userID);
                return success(204);
            }
            case 'POST /tables/{tableID}/toggleAway': {
                const tableID = event.pathParameters?.tableID;
                if (!tableID) {
                    throw new Error('Invalid - missing tableID');
                }
                await (0, service_1.toggleAway)(tableID, userID);
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
