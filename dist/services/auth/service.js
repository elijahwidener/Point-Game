"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncUser = syncUser;
exports.getMe = getMe;
const users_1 = require("../../shared/persistence/users");
const DEFAULT_STARTING_BALANCE = 1000;
/**
 * Syncs a Cognito user to DynamoDB. Called after successful Cognito signup
 * or on first authenticated request if user doesn't exist yet.
 *
 * Returns the user record (existing or newly created).
 */
async function syncUser(userID, username) {
    // Check if user already exists
    const existing = await (0, users_1.loadUser)(userID);
    if (existing) {
        return existing;
    }
    // Create new user with starting balance
    await (0, users_1.createUser)(userID, username, DEFAULT_STARTING_BALANCE);
    return {
        userID,
        username,
        balance: DEFAULT_STARTING_BALANCE,
    };
}
/**
 * Gets user profile. Throws if user doesn't exist.
 */
async function getMe(userID) {
    const user = await (0, users_1.loadUser)(userID);
    if (!user) {
        throw new Error('User not found');
    }
    return user;
}
