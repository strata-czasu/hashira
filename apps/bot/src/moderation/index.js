"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.moderation = void 0;
var core_1 = require("@hashira/core");
var access_1 = require("./access");
var bans_1 = require("./bans");
var mutes_1 = require("./mutes");
var nick_1 = require("./nick");
var prune_1 = require("./prune");
var userRecord_1 = require("./userRecord");
var verification_1 = require("./verification");
var warns_1 = require("./warns");
exports.moderation = new core_1.Hashira({ name: "moderation" })
    .use(bans_1.bans)
    .use(warns_1.warns)
    .use(mutes_1.mutes)
    .use(prune_1.prune)
    .use(verification_1.verification)
    .use(userRecord_1.userRecord)
    .use(access_1.access)
    .use(nick_1.nick);
