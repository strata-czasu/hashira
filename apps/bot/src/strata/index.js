"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.strataCzasu = void 0;
var core_1 = require("@hashira/core");
var colorRoles_1 = require("./colorRoles");
var misc_1 = require("./misc");
var propositions_1 = require("./propositions");
var ultimatum_1 = require("./ultimatum");
exports.strataCzasu = new core_1.Hashira({ name: "strata-czasu" })
    .use(colorRoles_1.colorRoles)
    .use(misc_1.misc)
    .use(propositions_1.propositions)
    .use(ultimatum_1.ultimatum);
