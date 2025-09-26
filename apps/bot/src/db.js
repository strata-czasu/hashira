"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
var core_1 = require("@hashira/core");
var db_1 = require("@hashira/db");
exports.database = new core_1.Hashira({ name: "database" }).const("prisma", db_1.prisma);
