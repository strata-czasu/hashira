import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import { database } from "./db";
import { LockManager } from "./lock";
import { loggingBase } from "./logging/loggingBase";

export const base = new Hashira({ name: "base" })
  .use(database)
  .use(loggingBase)
  .addExceptionHandler("default", (e) => {
    if (env.SENTRY_DSN) captureException(e);
    console.error(e);
  })
  .const("lock", new LockManager());
