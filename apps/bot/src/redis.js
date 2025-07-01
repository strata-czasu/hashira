"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
exports.redis = new core_1.Hashira({ name: "redis" }).const("redis", db_1.redis);
