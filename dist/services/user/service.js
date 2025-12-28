"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBalanceDelta = exports.getMe = void 0;
const errors_1 = require("../../shared/errors");
const users_1 = require("../../shared/persistence/users");
async function getMe(userID) {
    const user = await (0, users_1.loadUser)(userID);
    if (!user) {
        throw new errors_1.NotFoundError('User not found');
    }
    return user;
}
exports.getMe = getMe;
// INTERNAL ONLY — not exposed via HTTP
async function applyBalanceDelta(userID, delta) {
    return (0, users_1.applyBalanceUpdate)(userID, delta);
}
exports.applyBalanceDelta = applyBalanceDelta;
