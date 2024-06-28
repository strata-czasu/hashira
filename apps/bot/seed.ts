import { connection, db, schema } from "@hashira/db";
import { GUILD_IDS, STRATA_CZASU_CURRENCY, USER_IDS } from "./src/specializedConstants";

const createGuild = (guildId: string) =>
  db.insert(schema.guild).values({ id: guildId }).onConflictDoNothing();

const createDefaultStrataCzasuCurrency = async (guildId: string) => {
  await createGuild(guildId);
  await db
    .insert(schema.currency)
    .values({
      guildId,
      name: STRATA_CZASU_CURRENCY.name,
      symbol: STRATA_CZASU_CURRENCY.symbol,
      createdBy: USER_IDS.Defous,
    })
    .onConflictDoNothing();
};

if (process.env.NODE_ENV === "production") {
  await createDefaultStrataCzasuCurrency(GUILD_IDS.StrataCzasu);
} else {
  const testingServers = [GUILD_IDS.Homik, GUILD_IDS.Piwnica];
  for (const guildId of testingServers) {
    await createDefaultStrataCzasuCurrency(guildId);
  }
}

await connection.end();
