import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@redis/client";

import env from "@hashira/env";
import { type Prisma, PrismaClient } from "@hashira/prisma-client";
import { persistent } from "@hashira/utils/persistent";

export const prisma: PrismaClient = persistent(
  "prisma",
  () => new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) }),
);
export type ExtendedPrismaClient = PrismaClient;
export type PrismaTransaction = Prisma.TransactionClient;

export const redis = await persistent("redis", () =>
  createClient({
    url: env.REDIS_URL,
    socket: {
      reconnectStrategy: (retries) =>
        retries > 20
          ? new Error("Could not connect to Redis. Is the server running and REDIS_URL correct?")
          : Math.min(retries * 50, 500),
    },
  })
    .on("connect", () => console.log("Connected to Redis"))
    .on("end", () => console.log("Disconnected from Redis"))
    .on("error", (err) => console.error("Redis client error:", err))
    .connect(),
);

export type RedisClient = typeof redis;

export * from "@hashira/prisma-client";
export { DatabasePaginator } from "./paginate";
export { isUniqueConstraintError } from "./util/isUniqueConstraintError";
