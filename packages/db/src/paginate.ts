import { type Paginator, PaginatorOrder, toggleOrder } from "@hashira/paginate";
import type { Prisma } from "@prisma/client";

type PaginateProps = {
  skip: number;
  take: number;
};

type FindFn<T> = (props: PaginateProps, orderBy: Prisma.SortOrder) => Promise<T[]>;
type CountFn = () => Promise<number>;

interface DatabasePaginatorOptions {
  pageSize?: number;
  defaultOrder?: PaginatorOrder;
}

export class DatabasePaginator<T> implements Paginator<T> {
  readonly #findFn: FindFn<T>;
  readonly #countFn: CountFn;
  readonly #pageSize: number = 10;
  #ordering = PaginatorOrder.ASC;
  #page = 0;
  #count: number = Number.MAX_SAFE_INTEGER;

  constructor(find: FindFn<T>, count: CountFn, options?: DatabasePaginatorOptions) {
    this.#findFn = find;
    this.#countFn = count;
    if (options) {
      const { pageSize = 10, defaultOrder = PaginatorOrder.ASC } = options;
      this.#pageSize = pageSize;
      this.#ordering = defaultOrder;
    }
  }

  private async fetchCount() {
    if (!this.isCountUnknown) return;
    this.#count = await this.#countFn();
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

  private get prismaOrdering() {
    if (this.#ordering === PaginatorOrder.ASC) return "asc";
    return "desc";
  }

  public async current() {
    await this.fetchCount();
    const result = await this.#findFn(
      {
        skip: this.currentOffset,
        take: this.#pageSize,
      },
      this.prismaOrdering,
    );

    if (this.isCountUnknown && result.length < this.#pageSize) {
      this.#count = this.currentOffset + result.length;
      this.#page--;
    }

    return result;
  }

  public async reorder(orderBy?: PaginatorOrder) {
    if (orderBy) this.#ordering = orderBy;
    else this.#ordering = toggleOrder(this.#ordering);
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
