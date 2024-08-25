import { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";

export const prisma = new PrismaClient();
export type ExtendedPrismaClient = typeof prisma;
export type PrismaTransaction = Omit<ExtendedPrismaClient, ITXClientDenyList>;

export * from "@prisma/client";
export { DatabasePaginator } from "./paginate";
