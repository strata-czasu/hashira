import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";
import { drizzle } from "drizzle-orm/prisma/pg";

export const prisma = new PrismaClient().$extends(drizzle());
export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransaction = Omit<ExtendedPrismaClient, ITXClientDenyList>;

export * as schema from "./drizzle/schema";
export * from "@prisma/client";
export { DatabasePaginator } from "./paginate";
export type { CountSelect } from "./paginate";
export type { Transaction } from "./transaction";
