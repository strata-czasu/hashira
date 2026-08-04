import env from "@hashira/env";
import { type Prisma, PrismaClient } from "@hashira/prisma-client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient } from "@redis/client";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma: PrismaClient = new PrismaClient({ adapter });
export type ExtendedPrismaClient = PrismaClient;
export type PrismaTransaction = Prisma.TransactionClient;

export const redis = await createClient({ url: env.REDIS_URL })
  .on("connect", () => console.log("Connected to Redis"))
  .on("end", () => console.log("Disconnected from Redis"))
  .on("error", (err) => console.error("Redis client error:", err))
  .connect();

export type RedisClient = typeof redis;

export * from "@hashira/prisma-client";
export { DatabasePaginator } from "./paginate";
export { isUniqueConstraintError } from "./util/isUniqueConstraintError";
