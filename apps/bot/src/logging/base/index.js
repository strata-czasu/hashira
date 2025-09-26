"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggingBase = void 0;
var core_1 = require("@hashira/core");
var economyLog_1 = require("./economyLog");
var memberLog_1 = require("./memberLog");
var messageLog_1 = require("./messageLog");
var moderationLog_1 = require("./moderationLog");
var profileLog_1 = require("./profileLog");
var roleLog_1 = require("./roleLog");
var strataCzasuLog_1 = require("./strataCzasuLog");
// Base definition of loggers and log message types
exports.loggingBase = new core_1.Hashira({ name: "loggingBase" })
    .use(messageLog_1.messageLog)
    .use(memberLog_1.memberLog)
    .use(profileLog_1.profileLog)
    .use(roleLog_1.roleLog)
    .use(moderationLog_1.moderationLog)
    .use(economyLog_1.economyLog)
    .use(strataCzasuLog_1.strataCzasuLog);
