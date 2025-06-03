export enum PaginatorOrder {
  ASC = "asc",
  DESC = "desc",
}

export const toggleOrder = (order: PaginatorOrder) =>
  order === PaginatorOrder.ASC ? PaginatorOrder.DESC : PaginatorOrder.ASC;

export interface Paginator<T> {
  count: number | null;
  currentOffset: number;
  displayPages: string;
  displayCurrentPage: string;
  canPrevious: boolean;
  canNext: boolean;

  current(): Promise<T[]>;
  reorder(orderBy?: PaginatorOrder): Promise<T[]>;
  next(): Promise<T[]>;
  previous(): Promise<T[]>;
}

const defaultCompare = <T>(_a: T, _b: T) => 0;

interface StaticPaginatorOptions<T> {
  items: T[];
  pageSize: number;
  compare?: ((a: T, b: T) => number) | undefined;
  ordering?: PaginatorOrder | undefined;
}

export class StaticPaginator<T> implements Paginator<T> {
  readonly #items: T[];
  readonly #pageSize: number;
  #page = 0;
  #ordering: PaginatorOrder = PaginatorOrder.ASC;

  constructor({ items, pageSize, compare, ordering }: StaticPaginatorOptions<T>) {
    this.#items = [...items];
    this.#items.sort(compare ?? defaultCompare);
    this.#pageSize = pageSize;
    this.#ordering = ordering ?? PaginatorOrder.ASC;

    if (this.#ordering === PaginatorOrder.DESC) this.#items.reverse();
  }

  get count(): number | null {
    return this.#items.length;
  }

  get currentOffset(): number {
    return this.#page * this.#pageSize;
  }

  get displayPages(): string {
    return Math.ceil(this.#items.length / this.#pageSize).toString();
  }

  get displayCurrentPage(): string {
    return (this.#page + 1).toString();
  }

  get canPrevious(): boolean {
    return this.#page > 0;
  }

  get canNext(): boolean {
    return (this.#page + 1) * this.#pageSize < this.#items.length;
  }

  async current(): Promise<T[]> {
    const end = this.currentOffset + this.#pageSize;
    return this.#items.slice(this.currentOffset, end);
  }

  async reorder(orderBy?: PaginatorOrder): Promise<T[]> {
    const nextOrder = orderBy ?? toggleOrder(this.#ordering);
    if (nextOrder !== this.#ordering) {
      this.#items.reverse();
    }
    this.#ordering = nextOrder;
    this.#page = 0;
    return await this.current();
  }

  async next(): Promise<T[]> {
    if (!this.canNext) return [];
    this.#page++;
    return await this.current();
  }

  async previous(): Promise<T[]> {
    if (!this.canPrevious) return [];
    this.#page--;
    return await this.current();
  }
}
