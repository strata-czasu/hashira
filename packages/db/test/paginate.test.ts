// TODO: Fix tests after prisma migration

/*
import { afterEach, expect } from "bun:test";
import { faker } from "@faker-js/faker";
import { count } from "drizzle-orm";
import { schema } from "../src";
import { DatabasePaginator } from "../src/paginate";
import { createUser, dbTest } from "./";

afterEach(async () => {
  faker.seed();
});

dbTest("paginate unknown size", async (tx) => {
  const users = faker.helpers.multiple(createUser, { count: 100 });
  await tx.insert(schema.User).values(users);
  const paginator = new DatabasePaginator({
    orderBy: schema.User.id,
    select: tx.select().from(schema.User).$dynamic(),
    pageSize: 10,
  });
  expect(await paginator.current()).toHaveLength(10);
  expect(paginator.displayPages).toBe("?");
  expect(paginator.displayCurrentPage).toBe("1");
  expect(await paginator.previous()).toHaveLength(0);
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
  await tx.insert(schema.User).values(users);
  const paginator = new DatabasePaginator({
    orderBy: schema.User.id,
    select: tx.select().from(schema.User).$dynamic(),
    count: tx.select({ count: count() }).from(schema.User).$dynamic(),
    pageSize: 10,
  });
  expect(await paginator.current()).toHaveLength(10);
  expect(paginator.displayPages).toBe("10");
  expect(paginator.displayCurrentPage).toBe("1");
  expect(await paginator.previous()).toHaveLength(0);
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
*/
