import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const SpaceSeparatedArray = (defaultValue: string) =>
  Type.Transform(Type.String({ default: defaultValue }))
    .Decode((value) => value.split(" "))
    .Encode((value) => value.join(" "));

export const Env = Type.Object({
  BOT_CLIENT_ID: Type.String(),
  BOT_DEVELOPER_GUILD_IDS: SpaceSeparatedArray(""),
  BOT_TOKEN: Type.String(),
  POSTGRES_DB: Type.String(),
  POSTGRES_HOST: Type.String(),
  POSTGRES_PASSWORD: Type.String(),
  POSTGRES_USER: Type.String(),
  POSTGRES_TEST_HOST: Type.String(),
  SENTRY_DSN: Type.Optional(Type.String()),
  USE_SSL: Type.Optional(Type.Boolean()),
});

export type Env = Static<typeof Env>;

const cleanedEnv = Value.Clean(Env, process.env);

const env = Value.Convert(Env, Value.Default(Env, cleanedEnv));

const errors = [...Value.Errors(Env, env)];

if (errors.length > 0) {
  for (const error of errors) {
    console.error(error);
  }
  throw new Error("Invalid environment variables");
}

export default Value.Decode(Env, env);
