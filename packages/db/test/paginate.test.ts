import { afterEach, expect } from "bun:test";
import { faker } from "@faker-js/faker";
import { schema } from "../src";
import { Paginate } from "../src/paginate";
import { createUser, dbTest } from "./";
import { count } from "drizzle-orm";

afterEach(async () => {
	faker.seed();
});

dbTest("paginate unknown size", async (tx) => {
	const users = faker.helpers.multiple(createUser, { count: 100 });
	await tx.insert(schema.user).values(users);
	const paginator = new Paginate({
		select: tx.select().from(schema.user).$dynamic(),
		pageSize: 10,
	});
	expect(await paginator.current()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("1");
	expect(await paginator.prev()).toHaveLength(0);
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("2");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("3");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("4");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("5");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("6");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("7");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("8");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("9");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("?");
	expect(paginator.displayCurrentPage).toBe("10");

	expect(await paginator.next()).toHaveLength(0);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("10");

	expect(await paginator.next()).toHaveLength(0);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("10");
});


dbTest("paginate known size", async (tx) => {
	const users = faker.helpers.multiple(createUser, { count: 100 });
	await tx.insert(schema.user).values(users);
	const paginator = new Paginate({
		select: tx.select().from(schema.user).$dynamic(),
		count: tx.select({ count: count() }).from(schema.user).$dynamic(),
		pageSize: 10,
	});
	expect(await paginator.current()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("1");
	expect(await paginator.prev()).toHaveLength(0);
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("2");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("3");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("4");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("5");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("6");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("7");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("8");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("9");
	expect(await paginator.next()).toHaveLength(10);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("10");

	expect(await paginator.next()).toHaveLength(0);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("10");

	expect(await paginator.next()).toHaveLength(0);
	expect(paginator.displayPages).toBe("10");
	expect(paginator.displayCurrentPage).toBe("10");
});