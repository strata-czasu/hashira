import * as v from "valibot";

const ID = v.pipe(v.string(), v.regex(/^\d{17,19}$/));

const Env = v.object({
  WORDLE_OAUTH_CLIENT_ID: ID,
  WORDLE_OAUTH_CLIENT_SECRET: v.string(),
  WORDLE_DATABASE_URL: v.pipe(v.string(), v.url()),
  TZ: v.optional(v.string()),
});

export default v.parse(Env, process.env);
