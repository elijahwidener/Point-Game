"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const service_1 = require("./service");
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
};
/**
 * Extracts user info from Cognito claims (set by API Gateway Cognito
 * Authorizer)
 */
function getUserFromClaims(event) {
    const claims = event.requestContext.authorizer?.claims;
    if (!claims?.sub)
        return null;
    return {
        userID: claims.sub,
        username: claims['cognito:username'] || claims.sub,
    };
}
async function handler(event) {
    try {
        // All routes require valid Cognito token (enforced by API Gateway
        // authorizer)
        const user = getUserFromClaims(event);
        if (!user) {
            return {
                statusCode: 401,
                headers: corsHeaders,
                body: JSON.stringify({ message: 'Unauthorized' }),
            };
        }
        switch (event.path) {
            case '/auth/sync': {
                // POST /auth/sync - Create/sync user in DynamoDB after Cognito signup
                if (event.httpMethod !== 'POST') {
                    return {
                        statusCode: 405,
                        headers: corsHeaders,
                        body: 'Method Not Allowed',
                    };
                }
                const syncedUser = await (0, service_1.syncUser)(user.userID, user.username);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify(syncedUser),
                };
            }
            case '/me': {
                // GET /me - Get current user profile
                if (event.httpMethod !== 'GET') {
                    return {
                        statusCode: 405,
                        headers: corsHeaders,
                        body: 'Method Not Allowed',
                    };
                }
                // Try to get user, sync if doesn't exist (handles first-time login)
                let profile;
                try {
                    profile = await (0, service_1.getMe)(user.userID);
                }
                catch {
                    // User doesn't exist in DynamoDB yet - sync them
                    profile = await (0, service_1.syncUser)(user.userID, user.username);
                }
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify(profile),
                };
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
        console.error('Auth handler error:', err);
        return {
            statusCode: err.statusCode || 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: err.message }),
        };
    }
}
