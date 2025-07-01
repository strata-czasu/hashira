"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var v = require("valibot");
var ID = v.pipe(v.string(), v.regex(/^\d{17,19}$/));
var SpaceSeparatedArray = function (matcher) {
    return v.pipe(v.string(), v.transform(function (value) { return value.split(" "); }), v.array(matcher));
};
var Env = v.object({
    BOT_CLIENT_ID: ID,
    BOT_DEVELOPER_GUILD_IDS: SpaceSeparatedArray(ID),
    BOT_TOKEN: v.string(),
    SENTRY_DSN: v.optional(v.string()),
    DATABASE_URL: v.pipe(v.string(), v.url()),
    DATABASE_TEST_URL: v.pipe(v.string(), v.url()),
    REDIS_URL: v.pipe(v.string(), v.url()),
    OPENAI_KEY: v.optional(v.string()),
    SHLINK_API_KEY: v.optional(v.string()),
    SHLINK_API_URL: v.optional(v.pipe(v.string(), v.url())),
    UNBELIEVABOAT_TOKEN: v.optional(v.string()),
});
exports.default = v.parse(Env, process.env);
