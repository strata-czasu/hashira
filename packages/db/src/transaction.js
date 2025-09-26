"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nestedTransaction = void 0;
// TODO: ExtendedPrismaClient is a lie, it's actually a PrismaClient with a $transaction method, it should have more methods to be considered PrismaClient
var nestedTransaction = function (tx) {
    return new Proxy(tx, {
        get: function (target, prop) {
            if (prop === "$transaction")
                return function (fn) { return fn(tx); };
            return target[prop];
        },
    });
};
exports.nestedTransaction = nestedTransaction;
