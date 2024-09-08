import type { PrismaTransaction } from "@hashira/db";
import { CurrencyNotFoundError } from "../economyError";
import type { GetCurrencyConditionOptions } from "../util";

type GetCurrencyOptions = {
  prisma: PrismaTransaction;
  guildId: string;
} & GetCurrencyConditionOptions;

export const getCurrency = async ({
  prisma,
  guildId,
  ...options
}: GetCurrencyOptions) => {
  const currencyCondition =
    "currencySymbol" in options
      ? { symbol: options.currencySymbol }
      : { id: options.currencyId };

  const currency = await prisma.currency.findFirst({
    where: {
      ...currencyCondition,
      guildId,
    },
  });

  if (!currency) throw new CurrencyNotFoundError();

  return currency;
};
