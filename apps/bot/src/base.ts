import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import * as Sentry from "@sentry/bun";
import { database } from "./db";
import { LockManager } from "./lock";
import { loggingBase } from "./logging/base";
import { messageQueueBase } from "./messageQueueBase";
import { userActivityBase } from "./userActivity/userActivityBase";

export const base = new Hashira({ name: "base" })
  .use(database)
  .use(loggingBase)
  .use(messageQueueBase)
  .use(userActivityBase)
  .addExceptionHandler("default", (e, itx) => {
    if (env.SENTRY_DSN) {
      Sentry.withScope((scope) => {
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
  .const("lock", new LockManager());
