import { describe, expect, it } from "bun:test";
import { PaginatorOrder, StaticPaginator } from "../src";

describe("StaticPaginator", () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const pageSize = 3;

  it("should initialize with default values", () => {
    const paginator = new StaticPaginator({ items, pageSize });

    expect(paginator.currentOffset).toBe(0);
    expect(paginator.displayPages).toBe("4");
    expect(paginator.displayCurrentPage).toBe("1");
    expect(paginator.canPrevious).toBe(false);
    expect(paginator.canNext).toBe(true);
  });

  it("should return the current page", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    const currentPage = await paginator.current();

    expect(currentPage).toEqual([1, 2, 3]);
  });

  it("should reorder the items in descending order", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    await paginator.reorder(PaginatorOrder.DESC);

    expect(await paginator.current()).toEqual([10, 9, 8]);
  });

  it("should toggle the ordering when not provided explicitly", async () => {
    const paginator = new StaticPaginator({
      items,
      pageSize,
      ordering: PaginatorOrder.DESC,
    });

    await paginator.reorder();

    expect(await paginator.current()).toEqual([1, 2, 3]);
  });

  it("should navigate to the next page", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    await paginator.next();

    expect(paginator.currentOffset).toBe(3);
    expect(paginator.displayCurrentPage).toBe("2");
    expect(await paginator.current()).toEqual([4, 5, 6]);
  });

  it("should navigate to the previous page", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    await paginator.next();
    await paginator.previous();

    expect(paginator.currentOffset).toBe(0);
    expect(paginator.displayCurrentPage).toBe("1");
    expect(await paginator.current()).toEqual([1, 2, 3]);
  });

  it("should not navigate to the next page if already on the last page", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    await paginator.next();
    await paginator.next();
    await paginator.next();
    await paginator.next();

    expect(paginator.currentOffset).toBe(9);
    expect(paginator.displayCurrentPage).toBe("4");
    expect(await paginator.next()).toEqual([]);
  });

  it("should not navigate to the previous page if already on the first page", async () => {
    const paginator = new StaticPaginator({ items, pageSize });

    expect(paginator.currentOffset).toBe(0);
    expect(paginator.displayCurrentPage).toBe("1");
    expect(await paginator.previous()).toEqual([]);
  });
});
