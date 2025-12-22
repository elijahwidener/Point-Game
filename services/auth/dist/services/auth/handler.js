"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = handler;
const service_1 = require("./service");
async function handler(event) {
    try {
        if (!event.body) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Missing request body' }),
            };
        }
        const { username, password } = JSON.parse(event.body);
        switch (event.path) {
            case 'auth/signup':
                const user = await (0, service_1.signup)(username, password);
                return {
                    statusCode: 201,
                    body: JSON.stringify({ user }),
                };
            case 'auth/login':
                const userID = await (0, service_1.login)(username, password);
                return {
                    statusCode: 200,
                    body: JSON.stringify({ userID }),
                };
            default:
                return {
                    statusCode: 404,
                    body: JSON.stringify({ message: 'Not Found' }),
                };
        }
    }
    catch (err) {
        return {
            statusCode: err.message === 'Invalid credentials' ? 401 : 400,
            body: JSON.stringify({ message: err.message }),
        };
    }
}
