import env from "@hashira/env";
import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { createClient } from "@redis/client";

export const prisma = new PrismaClient();
export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransaction = Omit<ExtendedPrismaClient, ITXClientDenyList>;

export const redis = createClient({ url: env.REDIS_URL })
  .on("connect", () => console.log("Connected to Redis"))
  .on("error", (err) => console.error("Redis client error:", err));
export type RedisClient = typeof redis;

export * from "@prisma/client";
export { DatabasePaginator } from "./paginate";
