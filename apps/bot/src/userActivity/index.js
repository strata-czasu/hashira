"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userActivity = void 0;
var core_1 = require("@hashira/core");
var userTextActivity_1 = require("./userTextActivity");
var userVoiceActivity_1 = require("./userVoiceActivity");
exports.userActivity = new core_1.Hashira({ name: "user-activity" })
    .use(userTextActivity_1.userTextActivity)
    .use(userVoiceActivity_1.userVoiceActivity);
