import { type db, schema } from "@hashira/db";
import { and, eq } from "@hashira/db/drizzle";
import { CurrencyNotFoundError } from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";

type GetCurrencyOptions = {
  db: typeof db;
  guildId: string;
} & GetCurrencyConditionOptions;

export const getCurrency = async ({ db, guildId, ...options }: GetCurrencyOptions) => {
  const currencyCondition =
    "currencySymbol" in options
      ? eq(schema.currency.symbol, options.currencySymbol)
      : eq(schema.currency.id, options.currencyId);

  const currency = await db.query.currency.findFirst({
    where: and(eq(schema.currency.guildId, guildId), currencyCondition),
  });

  if (!currency) throw new CurrencyNotFoundError();

  return currency;
};
