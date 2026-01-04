"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const service_1 = require("../user/service");
const service_2 = require("./service");
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
};
async function handler(event) {
    try {
        switch (event.path) {
            case '/auth/signup': {
                if (!event.body)
                    throw new Error('Invalid');
                const { username, password } = JSON.parse(event.body);
                if (!username || !password) {
                    throw new Error('Invalid');
                }
                const user = await (0, service_2.signup)(username, password);
                return {
                    statusCode: 201,
                    headers: corsHeaders,
                    body: JSON.stringify({ user }),
                };
            }
            case '/auth/login': {
                if (!event.body)
                    throw new Error('Invalid');
                const { username, password } = JSON.parse(event.body);
                if (!username || !password) {
                    throw new Error('Invalid');
                }
                const userID = await (0, service_2.login)(username, password);
                return {
                    statusCode: 200,
                    headers: corsHeaders,
                    body: JSON.stringify({ userID }),
                };
            }
            case '/me': {
                if (event.httpMethod !== 'GET') {
                    return {
                        statusCode: 405,
                        headers: corsHeaders,
                        body: 'Method Not Allowed',
                    };
                }
                const userID = event.queryStringParameters?.userID;
                if (!userID) {
                    return {
                        statusCode: 400,
                        headers: corsHeaders,
                        body: 'Missing userID',
                    };
                }
                const me = await (0, service_1.getMe)(userID);
                return {
                    statusCode: 200, body: JSON.stringify(me), headers: corsHeaders,
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
        return {
            statusCode: err.message === 'Invalid' ? 401 : 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: err.message }),
        };
    }
}
