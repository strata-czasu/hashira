import type { TablesRelationalConfig } from "drizzle-orm";
import type { PgTransaction, QueryResultHKT } from "drizzle-orm/pg-core";

export type Transaction = PgTransaction<
  QueryResultHKT,
  Record<string, unknown>,
  TablesRelationalConfig
>;
