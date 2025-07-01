"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.base = void 0;
var core_1 = require("@hashira/core");
var env_1 = require("@hashira/env");
var Sentry = require("@sentry/bun");
var db_1 = require("./db");
var emojiCountingBase_1 = require("./emojiCounting/emojiCountingBase");
var lock_1 = require("./lock");
var base_1 = require("./logging/base");
var messageQueueBase_1 = require("./messageQueueBase");
var redis_1 = require("./redis");
var userActivityBase_1 = require("./userActivity/userActivityBase");
exports.base = new core_1.Hashira({ name: "base" })
    .use(db_1.database)
    .use(redis_1.redis)
    .use(base_1.loggingBase)
    .use(messageQueueBase_1.messageQueueBase)
    .use(userActivityBase_1.userActivityBase)
    .use(emojiCountingBase_1.emojiCountingBase)
    .addExceptionHandler("default", function (e, itx) {
    if (env_1.default.SENTRY_DSN) {
        Sentry.withScope(function (scope) {
            if (itx) {
                scope.setUser({ id: itx.user.id, username: itx.user.username });
                scope.setTag("interaction_type", itx.type);
                if (itx.channel) {
                    scope.setTag("channel.id", itx.channel.id);
                    scope.setTag("channel.type", itx.channel.type);
                    if (itx.inGuild()) {
                        scope.setExtra("channel.name", itx.channel.name);
                    }
                }
                if (itx.isCommand()) {
                    scope.setTag("command.name", itx.commandName);
                    scope.setTag("command.type", itx.commandType);
                    scope.setTag("command.id", itx.commandId);
                    scope.setExtra("command_deferred", itx.deferred);
                    scope.setExtra("command_ephemeral", itx.ephemeral);
                    scope.setExtra("command_replied", itx.replied);
                }
                if (itx.isChatInputCommand()) {
                    scope.setExtra("command", itx.toString());
                }
                if (itx.isUserContextMenuCommand()) {
                    scope.setExtra("context_menu_target_user_id", itx.targetUser.id);
                }
                if (itx.isMessageContextMenuCommand()) {
                    scope.setExtra("context_menu_target_message_id", itx.targetMessage.id);
                }
            }
            Sentry.captureException(e);
        });
    }
    console.error(e);
})
    .const("lock", new lock_1.LockManager());
