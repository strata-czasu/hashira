import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import { database } from "./db";
import { LockManager } from "./lock";
import { loggingBase } from "./logging/base";
import { messageQueueBase } from "./messageQueueBase";

export const base = new Hashira({ name: "base" })
  .use(database)
  .use(loggingBase)
  .use(messageQueueBase)
  .addExceptionHandler("default", (e, itx) => {
    if (env.SENTRY_DSN) {
      const user = itx ? { id: itx.user.id, username: itx.user.username } : {};
      captureException(e, { user });
    }
    console.error(e);
  })
  .const("lock", new LockManager());
