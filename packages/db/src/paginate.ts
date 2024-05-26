import { type Paginator, PaginatorOrder } from "@hashira/paginate";
import { type SQL, asc, desc } from "drizzle-orm";
import type { PgColumn, PgSelect } from "drizzle-orm/pg-core";
import type { JoinNullability } from "drizzle-orm/query-builders/select.types";

export type CountSelect = PgSelect<
  string,
  { count: SQL<number> },
  "partial",
  Record<string, JoinNullability>
>;

interface DatabasePaginatorConfig<T extends PgSelect, U extends CountSelect> {
  /**
   * Query for fetching the count of selected rows
   */
  count?: U;
  /**
   * Query for fetching the selected rows
   */
  select: T;
  /**
   * Column or columns to order by
   */
  orderBy: (PgColumn | SQL | SQL.Aliased) | (PgColumn | SQL | SQL.Aliased)[];
  /**
   * Page number to start from, zero-based
   * @default 0
   */
  page?: number;
  /**
   * Default odering direction
   * @default {PaginatorOrder.ASC}
   */
  ordering?: PaginatorOrder;
  /**
   * Number of rows per page
   * @default 10
   */
  pageSize?: number;
}

export class DatabasePaginator<T extends PgSelect, U extends CountSelect>
  implements Paginator<T["_"]["result"][number]>
{
  readonly #qb: T;
  readonly #orderBy: (PgColumn | SQL | SQL.Aliased)[];
  readonly #countQb: U | undefined = undefined;
  readonly #pageSize: number = 10;
  #ordering: PaginatorOrder = PaginatorOrder.ASC;
  #page = 0;
  #count: number = Number.MAX_SAFE_INTEGER;

  constructor(config: DatabasePaginatorConfig<T, U>) {
    this.#qb = config.select;
    this.#orderBy = Array.isArray(config.orderBy) ? config.orderBy : [config.orderBy];
    this.#countQb = config.count;
    this.#ordering = config.ordering ?? this.#ordering;
    this.#pageSize = config.pageSize ?? this.#pageSize;
    this.#page = config.page ?? this.#page;
  }

  private async fetchCount() {
    if (!this.isCountUnknown || !this.#countQb) return;
    const [row] = await this.#countQb.execute();
    if (row) this.#count = row.count;
    else this.#count = 0;
  }

  public get count() {
    if (this.isCountUnknown) return null;
    return this.#count;
  }

  public get currentOffset() {
    return this.#page * this.#pageSize;
  }

  public get displayPages() {
    if (this.isCountUnknown) return "?";
    return Math.ceil(this.#count / this.#pageSize).toString();
  }

  public get displayCurrentPage() {
    return (this.#page + 1).toString();
  }

  public get canPrevious() {
    return this.#page > 0;
  }

  public get canNext() {
    return (this.#page + 1) * this.#pageSize < this.#count;
  }

  private get qb() {
    const op = this.#ordering === "ASC" ? asc : desc;
    return this.#qb
      .orderBy(...this.#orderBy.map(op))
      .limit(this.#pageSize)
      .offset(this.currentOffset);
  }

  public async current(): Promise<T["_"]["result"]> {
    await this.fetchCount();
    const result = await this.qb.execute();

    if (this.isCountUnknown && result.length < this.#pageSize) {
      this.#count = this.currentOffset + result.length;
      this.#page--;
    }

    return result;
  }

  public async reorder(orderBy: PaginatorOrder) {
    this.#ordering = orderBy;
    this.#page = 0;
    return await this.current();
  }

  public async next() {
    if (!this.canNext) return [];
    this.#page++;
    return await this.current();
  }

  public async previous() {
    if (!this.canPrevious) return [];
    this.#page--;
    return await this.current();
  }

  private get isCountUnknown() {
    return this.#count === Number.MAX_SAFE_INTEGER;
  }
}
