"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = getMe;
exports.applyBalanceDelta = applyBalanceDelta;
const errors_1 = require("../../shared/errors");
const users_1 = require("../../shared/persistence/users");
async function getMe(userID) {
    const user = await (0, users_1.loadUser)(userID);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    return user;
}
// INTERNAL ONLY — not exposed via HTTP
async function applyBalanceDelta(userID, delta) {
    return (0, users_1.applyBalanceUpdate)(userID, delta);
}
