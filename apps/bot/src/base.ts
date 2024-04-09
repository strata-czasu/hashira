import { Hashira } from "@hashira/core";
import { captureException } from "@sentry/bun";
import { database } from "./db";

export const base = new Hashira({ name: "base" })
  .use(database)
  .addExceptionHandler(captureException);
