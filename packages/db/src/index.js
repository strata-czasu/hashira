"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabasePaginator = exports.redis = exports.prisma = void 0;
var env_1 = require("@hashira/env");
var client_1 = require("@prisma/client");
var client_2 = require("@redis/client");
exports.prisma = new client_1.PrismaClient();
exports.redis = await (0, client_2.createClient)({ url: env_1.default.REDIS_URL })
    .on("connect", function () { return console.log("Connected to Redis"); })
    .on("end", function () { return console.log("Disconnected from Redis"); })
    .on("error", function (err) { return console.error("Redis client error:", err); })
    .connect();
__exportStar(require("@prisma/client"), exports);
var paginate_1 = require("./paginate");
Object.defineProperty(exports, "DatabasePaginator", { enumerable: true, get: function () { return paginate_1.DatabasePaginator; } });
