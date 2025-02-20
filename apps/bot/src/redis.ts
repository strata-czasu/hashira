import { Hashira } from "@hashira/core";
import { redis as redisClient } from "@hashira/db";

export const redis = new Hashira({ name: "redis" }).const("redis", redisClient);
