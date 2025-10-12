import { Hashira } from "@hashira/core";
import type { LogSettings } from "@hashira/db";
import {
  ChannelType,
  channelMention,
  PermissionFlagsBits,
  roleMention,
  userMention,
} from "discord.js";
import { base } from "./base";

const formatUserSetting = (name: string, userId: string | null) =>
  `${name}: ${userId ? `${userMention(userId)}` : "Nie ustawiono"}`;

const formatRoleSetting = (name: string, roleId: string | null) =>
  `${name}: ${roleId ? roleMention(roleId) : "Nie ustawiono"}`;

const formatLogSettings = (settings: LogSettings | null) => {
  if (!settings) return "Logi: Nie ustawiono żadnych kanałów";

  return [
    formatChannelSetting("Kanał do logów (wiadomości)", settings.messageLogChannelId),
    formatChannelSetting("Kanał do logów (użytkownicy)", settings.memberLogChannelId),
    formatChannelSetting("Kanał do logów (role)", settings.roleLogChannelId),
    formatChannelSetting("Kanał do logów (moderacja)", settings.moderationLogChannelId),
    formatChannelSetting("Kanał do logów (profile)", settings.profileLogChannelId),
    formatChannelSetting("Kanał do logów (ekonomia)", settings.economyLogChannelId),
  ].join("\n");
};

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
              flags: "Ephemeral",
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
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("urlop-role", (command) =>
        command
          .setDescription("Ustaw rolę Urlop")
          .addRole("role", (role) =>
            role.setDescription("Rola, która ma być nadawana moderatorom na urlopie"),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { moderatorLeaveRoleId: role.id },
            });

            await itx.reply({
              content: `Rola Urlop została ustawiona na ${roleMention(role.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("urlop-manager", (command) =>
        command
          .setDescription("Ustaw managera urlopów")
          .addUser("user", (user) =>
            user.setDescription("Użytkownik, który ma być managerem urlopów"),
          )
          .handle(async ({ prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { moderatorLeaveManagerId: user.id },
            });

            await itx.reply({
              content: `Manager urlopów został ustawiony na ${userMention(user.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("message-log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów związanych z wiadomościami")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, messageLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              data: {
                logSettings: {
                  upsert: {
                    create: { messageLogChannelId: channel.id },
                    update: { messageLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);
            await itx.reply({
              content: `Kanał do wysyłania logów związanych z wiadomościami został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("member-log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów związanych z użytkownikami")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, memberLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              data: {
                logSettings: {
                  upsert: {
                    create: { memberLogChannelId: channel.id },
                    update: { memberLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z użytkownikami został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("role-log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów związanych z rolami")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, roleLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              data: {
                logSettings: {
                  upsert: {
                    create: { roleLogChannelId: channel.id },
                    update: { roleLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z rolami został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("moderation-log-channel", (command) =>
        command
          .setDescription(
            "Ustaw kanał do wysyłania logów związanych z mutami, warnami i banami",
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
          .handle(async ({ prisma, moderationLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              data: {
                logSettings: {
                  upsert: {
                    create: { moderationLogChannelId: channel.id },
                    update: { moderationLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z banami został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
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
              data: {
                logSettings: {
                  upsert: {
                    create: { profileLogChannelId: channel.id },
                    update: { profileLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z profilami użytkowników został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("economy-log-channel", (command) =>
        command
          .setDescription("Ustaw kanał do wysyłania logów związanych z ekonomią")
          .addChannel("channel", (channel) =>
            channel
              .setDescription("Kanał, na który mają być wysyłane logi")
              .setChannelType(
                ChannelType.GuildText,
                ChannelType.PrivateThread,
                ChannelType.PublicThread,
              ),
          )
          .handle(async ({ prisma, economyLog: log }, { channel }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              data: {
                logSettings: {
                  upsert: {
                    create: { economyLogChannelId: channel.id },
                    update: { economyLogChannelId: channel.id },
                  },
                },
              },
              where: { guildId: itx.guildId },
            });

            log.updateGuild(itx.guild, channel);

            await itx.reply({
              content: `Kanał do wysyłania logów związanych z ekonomią został ustawiony na ${channelMention(channel.id)}`,
              flags: "Ephemeral",
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
              include: { logSettings: true },
            });

            if (!settings) throw new Error("Guild settings not found");

            const entries = [
              formatRoleSetting("Rola do wyciszeń", settings.muteRoleId),
              formatRoleSetting("Rola 18+", settings.plus18RoleId),
              formatRoleSetting("Rola urlop", settings.moderatorLeaveRoleId),
              formatUserSetting("Manager urlopów", settings.moderatorLeaveManagerId),
              formatLogSettings(settings.logSettings),
            ];

            await itx.reply({
              content: entries.join("\n"),
              flags: "Ephemeral",
            });
          }),
      ),
  );
