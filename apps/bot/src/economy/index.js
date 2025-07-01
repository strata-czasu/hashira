"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.economy = void 0;
var core_1 = require("@hashira/core");
var inventory_1 = require("./inventory");
var items_1 = require("./items");
var shop_1 = require("./shop");
var strata_1 = require("./strata");
exports.economy = new core_1.Hashira({ name: "economy" })
    .use(strata_1.strataEconomy)
    .use(items_1.items)
    .use(shop_1.shop)
    .use(inventory_1.inventory);
