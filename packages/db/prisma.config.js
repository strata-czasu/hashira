"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_path_1 = require("node:path");
var config_1 = require("prisma/config");
exports.default = (0, config_1.defineConfig)({
    earlyAccess: true,
    schema: (0, node_path_1.join)("prisma"),
});
