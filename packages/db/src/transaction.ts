import type { TablesRelationalConfig } from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import type { ExtendedPrismaClient, PrismaTransaction } from ".";

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  Record<string, unknown>,
  TablesRelationalConfig
>;

type TransactionFn = Parameters<ExtendedPrismaClient["$transaction"]>[0];

// TODO: ExtendedPrismaClient is a lie, it's actually a PrismaClient with a $transaction method, it should have more methods to be considered PrismaClient
export const nestedTransaction = (tx: PrismaTransaction) =>
  new Proxy(tx, {
    get(target, prop) {
      if (prop === "$transaction") return (fn: TransactionFn) => fn(tx);

      return target[prop as keyof PrismaTransaction];
    },
  }) as ExtendedPrismaClient;
