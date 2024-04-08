import { type SQL } from "drizzle-orm";
import { type PgSelect, PgSelectBase } from "drizzle-orm/pg-core";
import type { JoinNullability } from "drizzle-orm/query-builders/select.types";

export type CountSelect = PgSelect<
	string,
	{ count: SQL<number> },
	"partial",
	Record<string, JoinNullability>
>;

interface PaginateConfig<T extends PgSelect, U extends CountSelect> {
	/**
	 * Query for fetching the count of selected rows
	 */
	count?: U;
	/**
	 * Query for fetching the selected rows
	 */
	select: T;
	/**
	 * Page number to start from, zero-based
	 * @default 0
	 */
	page?: number;
	/**
	 * Number of rows per page
	 * @default 10
	 */
	pageSize?: number;
}

export class Paginate<T extends PgSelect, U extends CountSelect> {
	private readonly qb: T;
	private readonly countQb: U | undefined = undefined;
	private page = 0;
	private readonly pageSize: number = 10;
	private count: number = Number.MAX_SAFE_INTEGER;

	constructor(config: T | PaginateConfig<T, U>) {
		if (config instanceof PgSelectBase) {
			this.qb = config;
		} else {
			this.qb = config.select;
			this.countQb = config.count;
			this.pageSize = config.pageSize ?? this.pageSize;
			this.page = config.page ?? this.page;
		}
	}

	private async fetchCount() {
		if (this.isCountUnknown && this.countQb) {
			const [row] = await this.countQb.execute();
			if (row) this.count = row.count;
			else this.count = 0;
		}
	}

	public get currentOffset() {
		return this.page * this.pageSize;
	}

	public get displayPages() {
		if (this.isCountUnknown) return "?";
		return Math.ceil(this.count / this.pageSize).toString();
	}

	public get displayCurrentPage() {
		return (this.page + 1).toString();
	}

	public get canPrevious() {
		return this.page > 0;
	}

	public get canNext() {
		return (this.page + 1) * this.pageSize < this.count;
	}

	public async current(): Promise<T["_"]["result"]> {
		await this.fetchCount();
		const limit = this.pageSize;
		const result = await this.qb.offset(this.currentOffset).limit(limit).execute();

		if (this.isCountUnknown && result.length < this.pageSize) {
			this.count = this.currentOffset + result.length;
		}

		return result;
	}

	public async next(): Promise<T["_"]["result"]> {
		if (!this.canNext) return [];
		this.page++;
		return await this.current();
	}

	public async previous(): Promise<T["_"]["result"]> {
		if (!this.canPrevious) return [];
		this.page--;
		return await this.current();
	}

	private get isCountUnknown() {
		return this.count === Number.MAX_SAFE_INTEGER;
	}
}
