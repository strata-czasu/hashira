import env from "@hashira/env";
import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { createClient } from "@redis/client";

export const prisma = new PrismaClient();
export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransaction = Omit<ExtendedPrismaClient, ITXClientDenyList>;

export const redis = await createClient({ url: env.REDIS_URL })
  .on("connect", () => console.log("Connected to Redis"))
  .on("end", () => console.log("Disconnected from Redis"))
  .on("error", (err) => console.error("Redis client error:", err))
  .connect();

export type RedisClient = typeof redis;

export * from "@prisma/client";
export * from "@prisma/client/sql";
export { DatabasePaginator } from "./paginate";
