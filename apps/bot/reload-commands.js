"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var db_1 = require("@hashira/db");
var env_1 = require("@hashira/env");
var src_1 = require("./src");
await src_1.bot.registerCommands(env_1.default.BOT_TOKEN, env_1.default.BOT_DEVELOPER_GUILD_IDS, env_1.default.BOT_CLIENT_ID);
await db_1.prisma.$disconnect();
await db_1.redis.disconnect();
