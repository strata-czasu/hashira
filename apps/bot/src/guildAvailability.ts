import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { base } from "./base";

export const guildAvailability = new Hashira({ name: "guild-availability" })
  .use(base)
  .handle("ready", async ({ db }, client) => {
    const guilds = client.guilds.cache.map(
      (guild) => ({ id: guild.id }) as typeof schema.guild.$inferInsert,
    );
    await db.insert(schema.guild).values(guilds).onConflictDoNothing().returning();

    const guildSettings = client.guilds.cache.map(
      (guild) => ({ guildId: guild.id }) as typeof schema.guildSettings.$inferInsert,
    );
    await db
      .insert(schema.guildSettings)
      .values(guildSettings)
      .onConflictDoNothing()
      .returning();
  })
  .handle("guildCreate", async ({ db }, guild) => {
    await db
      .insert(schema.guild)
      .values({ id: guild.id })
      .onConflictDoNothing()
      .execute();
    await db
      .insert(schema.guildSettings)
      .values({ guildId: guild.id })
      .onConflictDoNothing()
      .execute();
  });
