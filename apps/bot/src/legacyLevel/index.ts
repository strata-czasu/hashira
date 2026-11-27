import { channelMention, PermissionFlagsBits, roleMention, userMention } from "discord.js";
import { Effect } from "effect";
import { uniq } from "es-toolkit";

import { Hashira, PaginatedView } from "@hashira/core";
import { StaticPaginator } from "@hashira/paginate";

import { base } from "../base";
import { errorFollowUp } from "../util/errorFollowUp";
import { parseChannelMentions } from "../util/parseChannels";
import { createPluralize } from "../util/pluralize";
import { PRIVILEGED_FEATURES_DISABLED_MESSAGE } from "../util/privilegedIntents";
import { legacyLevelBase } from "./base";
import { tierFor } from "./curve";
import { LegacyLevel } from "./legacyLevel";
import { TierSync } from "./tierSync";

const pluralizeIgnoredChannels = createPluralize({
  one: "ignorowany kanał",
  few: "ignorowane kanały",
  many: "ignorowanych kanałów",
});

export const legacyLevel = new Hashira({ name: "legacyLevel" })
  .use(base)
  .use(legacyLevelBase)
  .handle("clientReady", async ({ legacyLevel }, client) => {
    await legacyLevel.runPromise(TierSync.use((tierSync) => tierSync.start(client)));
  })
  .handle("guildMessageCreate", async ({ legacyLevel }, message) => {
    if (message.author.bot) return;
    legacyLevel.runFork(
      TierSync.use((tierSync) => tierSync.mark(message.guildId, [message.author.id])),
    );
  })
  .handle("voiceStateUpdate", async ({ legacyLevel }, oldState, newState) => {
    // A voice session is stored when the member leaves or moves away from a channel
    if (
      !oldState.channelId ||
      oldState.channelId === newState.channelId ||
      oldState.member?.user.bot
    ) {
      return;
    }
    legacyLevel.runFork(
      TierSync.use((tierSync) => tierSync.mark(oldState.guild.id, [oldState.id])),
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
                if (role.id === itx.guildId || role.managed || !role.editable) {
                  return errorFollowUp(itx, "Nie można użyć tej roli jako roli za poziom");
                }
                await prisma.$transaction([
                  prisma.legacyLevelRole.deleteMany({
                    where: { guildId: itx.guildId, roleId: role.id },
                  }),
                  prisma.legacyLevelRole.upsert({
                    where: { guildId_minLevel: { guildId: itx.guildId, minLevel: level } },
                    create: { guildId: itx.guildId, minLevel: level, roleId: role.id },
                    update: { roleId: role.id },
                  }),
                ]);
                await itx.reply({
                  content: `Od poziomu ${level}: ${roleMention(role.id)}`,
                  allowedMentions: { roles: [] },
                });
              }),
          )
          .addCommand("remove", (command) =>
            command
              .setDescription("Usuń rolę od danego poziomu")
              .addInteger("level", (level) => level.setDescription("Poziom").setMinValue(1))
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
                const channelIds = uniq(parseChannelMentions(channels));
                if (channelIds.length === 0) {
                  return errorFollowUp(itx, "Nie podano poprawnych kanałów");
                }
                const { count } = await prisma.legacyLevelIgnoredChannel.createMany({
                  data: channelIds.map((channelId) => ({ guildId: itx.guildId, channelId })),
                  skipDuplicates: true,
                });
                await itx.reply(`Dodano ${count} ${pluralizeIgnoredChannels(count)}`);
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
                const channelIds = uniq(parseChannelMentions(channels));
                if (channelIds.length === 0) {
                  return errorFollowUp(itx, "Nie podano poprawnych kanałów");
                }
                const { count } = await prisma.legacyLevelIgnoredChannel.deleteMany({
                  where: { guildId: itx.guildId, channelId: { in: channelIds } },
                });
                await itx.reply(`Usunięto ${count} ${pluralizeIgnoredChannels(count)}`);
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
                if (channels.length === 0) {
                  await itx.reply("Brak ignorowanych kanałów");
                  return;
                }
                const paginator = new StaticPaginator({ items: channels, pageSize: 20 });
                await new PaginatedView(
                  paginator,
                  "Ignorowane kanały",
                  (c) => `${channelMention(c.channelId)} (${c.channelId})`,
                  false,
                ).render(itx);
              }),
          ),
      )
      .addCommand("inspect", (command) =>
        command
          .setDescription("Pokaż, skąd bierze się poziom użytkownika")
          .addUser("user", (user) => user.setDescription("Użytkownik"))
          .handle(async ({ legacyLevel }, { user }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();
            const [userProgress, tiers] = await legacyLevel.runPromise(
              LegacyLevel.use((service) =>
                Effect.all(
                  [service.userProgress(itx.guildId, user.id), service.tiers(itx.guildId)],
                  { concurrency: "unbounded" },
                ),
              ),
            );
            const tier = tierFor(userProgress.level, tiers);
            await itx.editReply({
              content: [
                `${userMention(user.id)}: poziom ${userProgress.level} (${userProgress.exp} exp)`,
                `Ze starego bota: ${userProgress.importedExp} exp`,
                `Od tego czasu: ${userProgress.exp - userProgress.importedExp} exp`,
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
            const userIds = members.filter((member) => !member.user.bot).map((member) => member.id);
            const changed = await legacyLevel.runPromise(
              TierSync.use((tierSync) => tierSync.syncMembers(itx.guild, userIds)),
            );
            await itx.editReply(`Zmieniono role ${changed} z ${userIds.length} członków`);
          }),
      ),
  );
