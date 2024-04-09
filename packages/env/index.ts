import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

export const Env = Type.Object({
  BOT_CLIENT_ID: Type.String(),
  BOT_DEVELOPER_GUILD_ID: Type.String(),
  BOT_TOKEN: Type.String(),
  POSTGRES_DB: Type.String(),
  POSTGRES_HOST: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_TEST_HOST: Type.String(),
  SENTRY_DSN: Type.String(),
});

export type Env = Static<typeof Env>;

const env = Value.Clean(Env, process.env);

const errors = [...Value.Errors(Env, env)];

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  throw new Error("Invalid environment variables");
}

export default Value.Cast(Env, env);
