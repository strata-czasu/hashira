import { Hashira } from "@hashira/core";
import env from "@hashira/env";
import { captureException } from "@sentry/bun";
import { database } from "./db";

export const base = new Hashira({ name: "base" })
  .use(database)
  .addExceptionHandler((e) => {
    if (env.SENTRY_DSN) captureException(e);
    console.error(e);
  });
