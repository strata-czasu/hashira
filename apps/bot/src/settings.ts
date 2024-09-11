import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, channelMention, roleMention } from "discord.js";
import { base } from "./base";

const formatRoleSetting = (name: string, roleId: string | null) =>
  `${name}: ${roleId ? roleMention(roleId) : "Nie ustawiono"}`;

const formatChannelSetting = (name: string, channelId: string | null) =>
  `${name}: ${channelId ? channelMention(channelId) : "Nie ustawiono"}`;

export const settings = new Hashira({ name: "settings" })
  .use(base)
  .group("settings", (group) =>
    group
      .setDescription("Zarządzaj ustawieniami serwera")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("mute-role", (command) =>
        command
          .setDescription("Ustaw rolę do wyciszeń")
          .addRole("role", (role) =>
            role.setDescription("Rola, która ma być nadawana wyciszonym użytkownikom"),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { muteRoleId: role.id },
            });

            // TODO: Update the role on currently muted users
            await itx.reply({
              content: `Rola do wyciszeń została ustawiona na ${roleMention(role.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("18-plus-role", (command) =>
        command
          .setDescription("Ustaw rolę 18+")
          .addRole("role", (role) =>
            role.setDescription("Rola, która ma być nadawana po weryfikacji 18+"),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { plus18RoleId: role.id },
            });

            await itx.reply({
              content: `Rola 18+ została ustawiona na ${roleMention(role.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów")
          .addChannel("channel", (channel) =>
            channel.setDescription("Kanał, na który mają być wysyłane logi"),
          )
          .handle(async ({ prisma }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { logChannelId: channel.id },
            });

            await itx.reply({
              content: `Kanał do wysyłania logów został ustawiony na ${channelMention(channel.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("Wyświetl ustawienia serwera")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId: itx.guildId },
            });

            if (!settings) throw new Error("Guild settings not found");

            const entries = [
              formatRoleSetting("Rola do wyciszeń", settings.muteRoleId),
              formatRoleSetting("Rola 18+", settings.plus18RoleId),
              formatChannelSetting("Kanał do logów", settings.logChannelId),
            ];
            await itx.reply({
              content: entries.join("\n"),
              ephemeral: true,
            });
          }),
      ),
  );
