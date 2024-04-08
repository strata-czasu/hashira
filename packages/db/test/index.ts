import env from "@hashira/env";
import { drizzle, type PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "../src";
import { faker } from "@faker-js/faker";
import { test } from "bun:test";
import { TransactionRollbackError, type ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";

const connection = postgres({
	host: env.POSTGRES_TEST_HOST,
	user: env.POSTGRES_USER,
	password: env.POSTGRES_PASSWORD,
	database: env.POSTGRES_DB,
});

export const db = drizzle(connection, { schema });

export const fakerSnowflake = () =>
	faker.string.numeric({ length: { min: 17, max: 20 }, allowLeadingZeros: false });

export const createUser = (): typeof schema.user.$inferInsert => ({
	id: fakerSnowflake(),
});

export const createGuild = (): typeof schema.guild.$inferInsert => ({
	id: fakerSnowflake(),
});

export const dbTest = (
	name: string,
	exec: (
		db: PgTransaction<
			PostgresJsQueryResultHKT,
			typeof schema,
			ExtractTablesWithRelations<typeof schema>
		>,
	) => void | Promise<void>,
) => {
	test(name, async () => {
		try {
			await db.transaction(async (tx) => {
				await exec(tx);
				tx.rollback();
			});
		} catch (e) {
			if (e instanceof TransactionRollbackError) {
				return;
			}
			throw e;
		}
	});
};
