import { Hashira } from "@hashira/core";
import { db, schema } from "@hashira/db";
import { MessageQueue } from "@hashira/db/tasks";
import { type Client, bold } from "discord.js";
import { eq } from "drizzle-orm";
import { sendDirectMessage } from "./util/sendDirectMessage";

type MuteEndData = {
  muteId: number;
  guildId: string;
  userId: string;
};

export const database = new Hashira({ name: "database" })
  .const("db", db)
  .const((ctx) => ({
    ...ctx,
    messageQueue: new MessageQueue(db)
      .addArg<"client", Client>()
      .addHandler(
        "muteEnd",
        async ({ client }, { muteId, guildId, userId }: MuteEndData) => {
          const settings = await ctx.db.query.guildSettings.findFirst({
            where: eq(schema.guildSettings.guildId, guildId),
          });
          if (!settings || !settings.muteRoleId) return;
          const guild = client.guilds.cache.get(guildId);
          if (!guild) return;
          const member = guild.members.cache.get(userId);
          if (!member) return;

          // FIXME: This could fail
          await member.roles.remove(
            settings.muteRoleId,
            `Koniec wyciszenia [${muteId}]`,
          );
          // NOTE: We could mention the user on the server if sending the DM fails
          await sendDirectMessage(
            member.user,
            `Skończyło się Twoje wyciszenie na ${bold(guild.name)}!`,
          );
        },
      ),
  }));
