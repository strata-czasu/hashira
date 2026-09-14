import type { Currency, ExtendedPrismaClient, PrismaTransaction } from "@hashira/db";

export const KAPSLE_CURRENCY = {
  name: "Kapsle",
  symbol: " kapsli",
} as const;

export type CurrencyCutoverPreview = {
  oldCurrency: Currency;
  walletCount: number;
  preservedBalance: number;
  shopListingCount: number;
};

const findKapsle = (prisma: PrismaTransaction, guildId: string) =>
  prisma.currency.findFirst({
    where: {
      guildId,
      OR: [{ name: KAPSLE_CURRENCY.name }, { symbol: KAPSLE_CURRENCY.symbol }],
    },
  });

export const getCurrencyCutoverPreview = async (
  prisma: PrismaTransaction,
  guildId: string,
  oldCurrencyId: number,
): Promise<CurrencyCutoverPreview> => {
  const [settings, oldCurrency, kapsleCurrency] = await Promise.all([
    prisma.guildSettings.findUniqueOrThrow({ where: { guildId } }),
    prisma.currency.findFirstOrThrow({ where: { id: oldCurrencyId, guildId } }),
    findKapsle(prisma, guildId),
  ]);

  if (settings.defaultCurrencyId !== oldCurrency.id) {
    throw new Error("Wybrana waluta nie jest obecną domyślną walutą serwera.");
  }
  if (oldCurrency.retiredAt) throw new Error("Wybrana waluta jest już zarchiwizowana.");
  if (kapsleCurrency) throw new Error("Waluta Kapsle już istnieje.");

  const [wallets, shopListingCount] = await Promise.all([
    prisma.wallet.aggregate({
      where: { guildId, currencyId: oldCurrency.id },
      _count: { _all: true },
      _sum: { balance: true },
    }),
    prisma.shopItem.count({
      where: { currencyId: oldCurrency.id, deletedAt: null, item: { guildId } },
    }),
  ]);

  return {
    oldCurrency,
    walletCount: wallets._count._all,
    preservedBalance: wallets._sum.balance ?? 0,
    shopListingCount,
  };
};

export const cutoverGuildCurrency = async ({
  prisma,
  guildId,
  oldCurrencyId,
  createdBy,
}: {
  prisma: ExtendedPrismaClient;
  guildId: string;
  oldCurrencyId: number;
  createdBy: string;
}) =>
  prisma.$transaction(async (tx) => {
    const [settings] = await tx.$queryRaw<{ id: number; defaultCurrencyId: number | null }[]>`
      SELECT id, "defaultCurrencyId"
      FROM "guildSettings"
      WHERE "guildId" = ${guildId}
      FOR UPDATE
    `;
    if (!settings) throw new Error("Nie znaleziono ustawień serwera.");

    const [oldCurrency, kapsleCurrency] = await Promise.all([
      tx.currency.findFirstOrThrow({ where: { id: oldCurrencyId, guildId } }),
      findKapsle(tx, guildId),
    ]);

    if (settings.defaultCurrencyId !== oldCurrency.id) {
      throw new Error("Wybrana waluta nie jest już domyślną walutą serwera.");
    }
    if (oldCurrency.retiredAt) throw new Error("Wybrana waluta jest już zarchiwizowana.");
    if (kapsleCurrency) throw new Error("Waluta Kapsle już istnieje.");

    const newCurrency = await tx.currency.create({
      data: { ...KAPSLE_CURRENCY, guildId, createdBy },
    });
    const retiredAt = new Date();
    const retiredCurrency = await tx.currency.update({
      where: { id: oldCurrency.id },
      data: { retiredAt },
    });
    await tx.guildSettings.update({
      where: { id: settings.id },
      data: { defaultCurrencyId: newCurrency.id },
    });
    const disabledListings = await tx.shopItem.updateMany({
      where: { currencyId: oldCurrency.id, deletedAt: null, item: { guildId } },
      data: { deletedAt: retiredAt },
    });

    return {
      oldCurrency: retiredCurrency,
      newCurrency,
      disabledShopListingCount: disabledListings.count,
    };
  });
