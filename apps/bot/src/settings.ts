import { Hashira } from "@hashira/core";
import {
  ChannelType,
  PermissionFlagsBits,
  channelMention,
  roleMention,
} from "discord.js";
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
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { logChannelId: channel.id },
            });

            if (log.isRegistered(itx.guild)) {
              log.updateGuild(itx.guild, channel);
            } else {
              log.addGuild(itx.guild, channel);
              log.consumeLoop(itx.client, itx.guild);
            }

            await itx.reply({
              content: `Kanał do wysyłania logów został ustawiony na ${channelMention(channel.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("ban-log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów związanych z banami")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, banLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { banLogChannelId: channel.id },
            });

            if (log.isRegistered(itx.guild)) {
              log.updateGuild(itx.guild, channel);
            } else {
              log.addGuild(itx.guild, channel);
              log.consumeLoop(itx.client, itx.guild);
            }

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z banami został ustawiony na ${channelMention(channel.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("profile-log-channel", (command) =>
        command
          .setDescription(
            "Ustaw kanał do wysyłania logów związanych z profilami użytkowników",
          )
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, profileLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { profileLogChannelId: channel.id },
            });

            if (log.isRegistered(itx.guild)) {
              log.updateGuild(itx.guild, channel);
            } else {
              log.addGuild(itx.guild, channel);
              log.consumeLoop(itx.client, itx.guild);
            }

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z profilami użytkowników został ustawiony na ${channelMention(channel.id)}`,
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
              formatChannelSetting("Kanał do logów (bany)", settings.banLogChannelId),
              formatChannelSetting(
                "Kanał do logów (profile)",
                settings.profileLogChannelId,
              ),
            ];
            await itx.reply({
              content: entries.join("\n"),
              ephemeral: true,
            });
          }),
      ),
  );
