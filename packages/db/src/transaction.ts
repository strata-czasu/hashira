import type { TablesRelationalConfig } from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";

export type Transaction = PgTransaction<
  PgQueryResultHKT,
  Record<string, unknown>,
  TablesRelationalConfig
>;
