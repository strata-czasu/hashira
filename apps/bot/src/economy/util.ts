import { type Transaction, schema } from "@hashira/db";
import { and, eq, isNull } from "@hashira/db/drizzle";

export type GetCurrencyConditionOptions =
  | { currencySymbol: string }
  | { currencyId: number };

export const getItem = async (tx: Transaction, id: number) => {
  const [item] = await tx
    .select()
    .from(schema.item)
    .where(and(eq(schema.item.id, id), isNull(schema.item.deletedAt)));
  return item;
};
