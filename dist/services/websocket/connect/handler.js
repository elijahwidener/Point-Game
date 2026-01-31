"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const aws_jwt_verify_1 = require("aws-jwt-verify");
const connectionStore_1 = require("../../../shared/persistence/connectionStore");
const gameTable_1 = require("../../../shared/persistence/gameTable");
const verifier = aws_jwt_verify_1.CognitoJwtVerifier.create({
    userPoolId: process.env.COGNITO_USER_POOL_ID,
    clientId: process.env.COGNITO_CLIENT_ID,
    tokenUse: 'id',
});
async function handler(event) {
    const connectionID = event.requestContext.connectionId;
    const tableID = event.queryStringParameters?.tableID;
    const token = event.queryStringParameters?.token;
    if (!tableID) {
        console.log('WebSocket connect rejected: missing tableID');
        return { statusCode: 400, body: 'Missing tableID' };
    }
    if (!token) {
        console.log('WebSocket connect rejected: missing token');
        return { statusCode: 401, body: 'Missing token' };
    }
    try {
        const payload = await verifier.verify(token);
        const userID = payload.sub;
        const username = payload['cognito:username'];
        const table = await (0, gameTable_1.loadGameTable)(tableID);
        if (!table) {
            console.log(`WebSocket connect rejected: table ${tableID} not found`);
            return { statusCode: 404, body: 'Table not found' };
        }
        await (0, connectionStore_1.registerConnection)(tableID, connectionID, userID);
        console.log(`Connection ${connectionID} registered for table ${tableID}`);
        return { statusCode: 200, body: 'Connected' };
    }
    catch (err) {
        console.error(' Websocket connect failed:', err.message);
        if (err.name === 'JwtExpiredError') {
            return { statusCode: 401, body: 'Token expired' };
        }
        if (err.name === 'JwtInvalidSignatureError' ||
            err.name === 'JwtInvalidClaimError') {
            return { statusCode: 401, body: 'Invalid token' };
        }
        return { statusCode: 401, body: 'Authentication failed' };
    }
}
