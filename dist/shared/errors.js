"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictError = exports.UnauthorizedError = exports.NotFoundError = void 0;
class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 404;
        this.name = 'NotFoundError';
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 403;
        this.name = 'UnauthorizedError';
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ConflictError extends Error {
    constructor(message) {
        super(message);
        this.statusCode = 409;
        this.name = 'ConflictError';
    }
}
exports.ConflictError = ConflictError;
