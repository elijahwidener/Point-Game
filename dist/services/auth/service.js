"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signup = signup;
exports.login = login;
const crypto_1 = require("crypto");
const users_1 = require("../../shared/persistence/users");
async function signup(username, password) {
    if (!username || !password) {
        throw new Error('Invalid input');
    }
    const existing = await (0, users_1.getAuthByUsername)(username);
    if (existing) {
        throw new Error('Username already exists');
    }
    const userID = (0, crypto_1.randomUUID)();
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(password);
    const hashedPassword = hash.digest('hex');
    await (0, users_1.createUser)(userID, username, hashedPassword, 1000);
    return userID;
}
async function login(username, password) {
    if (!username || !password) {
        throw new Error('Invalid input');
    }
    const credentials = await (0, users_1.getAuthByUsername)(username);
    if (!credentials) {
        throw new Error('Invalid input');
    }
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(password);
    const passwordHash = hash.digest('hex');
    if (credentials.passwordHash != passwordHash) {
        throw new Error('Username and Password do not match!');
    }
    return credentials.userID;
}
