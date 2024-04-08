import {
	add,
	endOfMonth,
	endOfToday,
	endOfTomorrow,
	endOfYear,
	endOfYesterday,
	isValid,
	parse as parse_,
	startOfMonth,
	startOfToday,
	startOfTomorrow,
	startOfYear,
	startOfYesterday,
	sub,
} from "date-fns";

type DateAlignment = "start" | "end" | "now";
type Parser = (date: string, alignment: DateAlignment) => Date | null;

const parse = (...args: Parameters<typeof parse_>) => {
	const date = parse_(...args);
	if (!isValid(date)) return null;
	return date;
};

const alignmentTable: Record<DateAlignment, Record<string, () => Date>> = {
	start: {
		month: () => startOfMonth(new Date()),
		year: () => startOfYear(new Date()),
		yesterday: startOfYesterday,
		today: startOfToday,
		tomorrow: startOfTomorrow,
		now: () => new Date(),
	},
	end: {
		month: () => endOfMonth(new Date()),
		year: () => endOfYear(new Date()),
		yesterday: endOfYesterday,
		today: endOfToday,
		tomorrow: endOfTomorrow,
		now: () => new Date(),
	},
	now: {
		month: () => new Date(),
		year: () => new Date(),
		yesterday: () => sub(new Date(), { days: 1 }),
		today: () => new Date(),
		tomorrow: () => add(new Date(), { days: 1 }),
		now: () => new Date(),
	},
};

const parseNaturalDate: Parser = (date: string, alignment: DateAlignment) =>
	alignmentTable[alignment][date]?.() ?? null;

const any: (...args: Parser[]) => Parser =
	(...parsers) =>
	(date, alignment) => {
		for (const parser of parsers) {
			const parsed = parser(date, alignment);
			if (parsed) return parsed;
		}
		return null;
	};

const parseMonthNumber = (month: string) => parse(month, "MM", new Date());
const parseMonthName = (month: string) => parse(month, "MMMM", new Date());
const parseMonthDay = (monthDay: string) => parse(monthDay, "MM-dd", new Date());
const parseYearNumber = (year: string) => parse(year, "yyyy", new Date());
const parseYearMonth = (yearMonth: string) => parse(yearMonth, "yyyy-MM", new Date());
const parseYearMonthDay = (yearMonthDay: string) =>
	parse(yearMonthDay, "yyyy-MM-dd", new Date());

const parsers = [
	parseNaturalDate,
	parseMonthNumber,
	parseMonthName,
	parseMonthDay,
	parseYearNumber,
	parseYearMonth,
	parseYearMonthDay,
];

const resolveDefault = <T>(orDefault: T | (() => T)) =>
	orDefault instanceof Function ? orDefault() : orDefault;

export const parseDate = <T = null>(
	date: string | null | undefined,
	alignment: DateAlignment,
	orDefault: T | (() => T),
): Date | T => {
	if (!date) return resolveDefault(orDefault);
	return any(...parsers)(date, alignment) ?? resolveDefault(orDefault);
};
