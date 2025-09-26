"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strataEconomy = void 0;
var core_1 = require("@hashira/core");
var daily_1 = require("./daily");
var strataCurrency_1 = require("./strataCurrency");
exports.strataEconomy = new core_1.Hashira({ name: "strata-economy" })
    .use(strataCurrency_1.strataCurrency)
    .use(daily_1.strataDaily);
