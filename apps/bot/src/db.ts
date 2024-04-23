import { Hashira } from "@hashira/core";
import { db, schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { MessageQueue } from "@hashira/db/tasks";
import { type Client, RESTJSONErrorCodes, userMention } from "discord.js";
import { discordTry } from "./util/discordTry";
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
          const muteRoleId = settings.muteRoleId;
          const guild = client.guilds.cache.get(guildId);
          if (!guild) return;
          const member = guild.members.cache.get(userId);
          if (!member) return;

          await discordTry(
            async () => {
              await member.roles.remove(muteRoleId, `Koniec wyciszenia [${muteId}]`);
            },
            [RESTJSONErrorCodes.MissingPermissions],
            async () => {
              console.warn(
                `Missing permissions to remove mute role ${settings.muteRoleId} from member ${userId} on guild ${guildId}`,
              );
            },
          );

          // NOTE: We could mention the user on the server if sending the DM fails
          await sendDirectMessage(
            member.user,
            `To znowu ja ${userMention(
              member.id,
            )}. Dostałem informację, że Twoje wyciszenie dobiegło końca. Do zobaczenia na czatach!`,
          );
        },
      ),
  }));
