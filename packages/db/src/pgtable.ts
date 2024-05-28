import { pgTableCreator } from "drizzle-orm/pg-core";

export const pgTable = pgTableCreator((name) => `core_${name}`);

export const strataPgTable = pgTableCreator((name) => `strata_${name}`);
