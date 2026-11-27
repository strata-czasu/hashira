import { channelMention, PermissionFlagsBits, roleMention, userMention } from "discord.js";
import { Effect } from "effect";

import { Hashira } from "@hashira/core";

import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import { PRIVILEGED_FEATURES_DISABLED_MESSAGE } from "../util/privilegedIntents";
import { legacyLevelBase } from "./base";
import { tierFor } from "./curve";
import { LegacyLevel } from "./legacyLevel";
import { TierSync } from "./tierSync";

const parseChannelIds = (input: string) => [...new Set(input.match(/\d{17,20}/g) ?? [])];

export const legacyLevel = new Hashira({ name: "legacyLevel" })
  .use(base)
  .use(legacyLevelBase)
  .handle("clientReady", async ({ legacyLevel }, client) => {
    legacyLevel.runFork(Effect.flatMap(TierSync, (tierSync) => tierSync.run(client)));
  })
  .handle("guildMessageCreate", async ({ legacyLevel }, message) => {
    if (message.author.bot) return;
    legacyLevel.runFork(
      Effect.flatMap(TierSync, (tierSync) => tierSync.mark(message.guildId, [message.author.id])),
    );
  })
  .handle("voiceStateUpdate", async ({ legacyLevel }, oldState) => {
    // A voice session is stored when the member leaves or moves away from a channel
    if (!oldState.channelId || oldState.member?.user.bot) return;
    legacyLevel.runFork(
      Effect.flatMap(TierSync, (tierSync) => tierSync.mark(oldState.guild.id, [oldState.id])),
    );
  })
  .group("legacy-level", (group) =>
    group
      .setDescription("Poziomy ze starego bota")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addGroup("tier", (tier) =>
        tier
          .setDescription("Role za poziomy")
          .addCommand("set", (command) =>
            command
              .setDescription("Ustaw rolę od danego poziomu")
              .addInteger("level", (level) =>
                level.setDescription("Najniższy poziom z tą rolą").setMinValue(1),
              )
              .addRole("role", (role) => role.setDescription("Rola"))
              .handle(async ({ prisma }, { level, role }, itx) => {
                if (!itx.inCachedGuild()) return;
                await prisma.legacyLevelRole.deleteMany({
                  where: { guildId: itx.guildId, roleId: role.id },
                });
                await prisma.legacyLevelRole.upsert({
                  where: { guildId_minLevel: { guildId: itx.guildId, minLevel: level } },
                  create: { guildId: itx.guildId, minLevel: level, roleId: role.id },
                  update: { roleId: role.id },
                });
                await itx.reply(`Od poziomu ${level}: ${roleMention(role.id)}`);
              }),
          )
          .addCommand("remove", (command) =>
            command
              .setDescription("Usuń rolę od danego poziomu")
              .addInteger("level", (level) => level.setDescription("Poziom"))
              .handle(async ({ prisma }, { level }, itx) => {
                if (!itx.inCachedGuild()) return;
                const { count } = await prisma.legacyLevelRole.deleteMany({
                  where: { guildId: itx.guildId, minLevel: level },
                });
                await itx.reply(count ? `Usunięto rolę od poziomu ${level}` : "Nie ma takiej roli");
              }),
          )
          .addCommand("list", (command) =>
            command
              .setDescription("Wyświetl role za poziomy")
              .handle(async ({ prisma }, _, itx) => {
                if (!itx.inCachedGuild()) return;
                const tiers = await prisma.legacyLevelRole.findMany({
                  where: { guildId: itx.guildId },
                  orderBy: { minLevel: "asc" },
                });
                await itx.reply({
                  content:
                    tiers.map((t) => `${t.minLevel}+: ${roleMention(t.roleId)}`).join("\n") ||
                    "Brak ról",
                  allowedMentions: { roles: [] },
                });
              }),
          ),
      )
      .addGroup("ignored-channel", (ignored) =>
        ignored
          .setDescription("Kanały, które nie dają doświadczenia")
          .addCommand("add", (command) =>
            command
              .setDescription("Wyłącz zdobywanie doświadczenia na kanałach")
              .addString("channels", (channels) =>
                channels.setDescription("ID lub wzmianki kanałów oddzielone spacjami"),
              )
              .handle(async ({ prisma }, { channels }, itx) => {
                if (!itx.inCachedGuild()) return;
                const channelIds = parseChannelIds(channels);
                const { count } = await prisma.legacyLevelIgnoredChannel.createMany({
                  data: channelIds.map((channelId) => ({ guildId: itx.guildId, channelId })),
                  skipDuplicates: true,
                });
                await itx.reply(`Dodano ${count} ignorowanych kanałów`);
              }),
          )
          .addCommand("remove", (command) =>
            command
              .setDescription("Włącz zdobywanie doświadczenia na kanałach")
              .addString("channels", (channels) =>
                channels.setDescription("ID lub wzmianki kanałów oddzielone spacjami"),
              )
              .handle(async ({ prisma }, { channels }, itx) => {
                if (!itx.inCachedGuild()) return;
                const { count } = await prisma.legacyLevelIgnoredChannel.deleteMany({
                  where: { guildId: itx.guildId, channelId: { in: parseChannelIds(channels) } },
                });
                await itx.reply(`Usunięto ${count} ignorowanych kanałów`);
              }),
          )
          .addCommand("list", (command) =>
            command
              .setDescription("Wyświetl ignorowane kanały")
              .handle(async ({ prisma }, _, itx) => {
                if (!itx.inCachedGuild()) return;
                const channels = await prisma.legacyLevelIgnoredChannel.findMany({
                  where: { guildId: itx.guildId },
                });
                await itx.reply(
                  channels
                    .map((c) => `${channelMention(c.channelId)} (${c.channelId})`)
                    .join("\n") || "Brak ignorowanych kanałów",
                );
              }),
          ),
      )
      .addCommand("inspect", (command) =>
        command
          .setDescription("Pokaż, skąd bierze się poziom użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ legacyLevel, prisma }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const [progress, tiers] = await legacyLevel.runPromise(
              Effect.gen(function* () {
                const service = yield* LegacyLevel;
                return yield* Effect.all([
                  service.progress(itx.guildId, [user.id]),
                  service.tiers(itx.guildId),
                ]);
              }),
            );
            const imported = await prisma.legacyExperience.findUnique({
              where: { guildId_userId: { guildId: itx.guildId, userId: user.id } },
            });
            const userProgress = progress.get(user.id);
            if (!userProgress) return;
            const tier = tierFor(userProgress.level, tiers);
            await itx.editReply({
              content: [
                `${userMention(user.id)}: poziom ${userProgress.level} (${userProgress.exp} exp)`,
                `Ze starego bota: ${imported?.importedExp ?? 0} exp`,
                `Od tego czasu: ${userProgress.exp - (imported?.importedExp ?? 0)} exp`,
                `Postęp: ${userProgress.current}/${userProgress.target}`,
                `Rola: ${tier ? roleMention(tier.roleId) : "brak"}`,
              ].join("\n"),
              allowedMentions: { users: [], roles: [] },
            });
          }),
      )
      .addCommand("sync-roles", (command) =>
        command
          .setDescription("Ustaw role za poziomy wszystkim członkom serwera")
          .handle(async ({ legacyLevel, privilegedIntentsEnabled }, _, itx) => {
            if (!privilegedIntentsEnabled) {
              return errorFollowUp(itx, PRIVILEGED_FEATURES_DISABLED_MESSAGE);
            }
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const members = await itx.guild.members.fetch();
            const changed = await legacyLevel.runPromise(
              Effect.flatMap(TierSync, (tierSync) =>
                tierSync.syncMembers(
                  itx.guild,
                  members.filter((member) => !member.user.bot).map((member) => member.id),
                ),
              ),
            );
            await itx.editReply(`Zmieniono role ${changed} z ${members.size} członków`);
          }),
      ),
  );
