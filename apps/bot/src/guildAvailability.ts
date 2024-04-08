import { Hashira } from "@hashira/core";
import { guild } from "@hashira/db/schema";
import { base } from "./base";

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async ({ db }, client) => {
    const guilds = client.guilds.cache.map(
      (discordGuild) => ({ id: discordGuild.id }) as typeof guild.$inferInsert,
    );

    await db.insert(guild).values(guilds).onConflictDoNothing().returning();
  })
  .handle("guildCreate", async ({ db }, discordGuild) => {
    await db
      .insert(guild)
      .values({ id: discordGuild.id })
      .onConflictDoNothing()
      .execute();
  });
