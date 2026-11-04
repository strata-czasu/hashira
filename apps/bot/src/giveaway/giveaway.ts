import { addSeconds, type Duration } from "date-fns";
import {
  type APIContainerComponent,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  time,
} from "discord.js";
import { round, shuffle } from "es-toolkit";

import { Hashira } from "@hashira/core";
import type { GiveawayParticipant } from "@hashira/db";

import { base } from "../base";
import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { waitForButtonClick } from "../util/singleUseButton";
import { handleGiveawayJoinButton } from "./handlers/joinHandler";
import { handleGiveawayRewardButton } from "./handlers/rewardHandler";
import { analyzeRewards, formatRewardPreview, toPersistedReward } from "./rewardAnalyzer";
import { distributeGiveawayEconomyRewards, distributeGiveawayMutes } from "./rewardHandout";
import { createRewardButtonRow } from "./rewardMenu";
import {
  autocompleteGiveawayId,
  autocompleteGiveawayIdForStaff,
  createGiveawayButtonRow,
  formatBanner,
  getStaticBanner,
  GiveawayBannerRatio,
  giveawayFooter,
  type ParsedReward,
  parseRewards,
  selectAndSaveWinners,
  updateGiveaway,
} from "./util";

export const giveaway = new Hashira({ name: "giveaway" })
  .use(base)
  .group("givek", (group) =>
    group
      .setDescription("Komendy do givków.")
      .setDMPermission(false)
      .addCommand("create", (command) =>
        command
          .setDescription("Tworzenie giveawayów z różnymi nagrodami")
          .addString("nagrody", (rewards) =>
            rewards.setDescription(
              "Nagrody do rozdania, oddzielone przecinkami, gdy nagród jest więcej to piszemy np. 2x200 punktów",
            ),
          )
          .addString("czas-trwania", (duration) =>
            duration.setDescription("Czas trwania givka, np. 1d (1 dzień) lub 2h (2 godziny)"),
          )
          .addString("tytul", (tytul) =>
            tytul.setDescription("Tytuł giveawaya, domyślnie 'Giveaway'").setRequired(false),
          )
          .addAttachment("baner", (baner) =>
            baner
              .setDescription(
                "Baner wyświetlany na górze giveawaya. Domyślny można wyłączyć ustawiając format na brak.",
              )
              .setRequired(false),
          )
          .addNumber("format-baneru", (format) =>
            format
              .setDescription(
                "Konwertuje baner do wybranego współczynnika proporcji, domyślnie 'Bez zmian'.",
              )
              .setRequired(false)
              .addChoices(
                { name: "Brak baneru", value: GiveawayBannerRatio.None },
                { name: "Bez zmian", value: GiveawayBannerRatio.Auto },
                { name: "Szeroki (3:1)", value: GiveawayBannerRatio.Landscape },
                { name: "Wysoki (2:3)", value: GiveawayBannerRatio.Portrait },
              ),
          )
          .addRole("wymagana-rola", (whitelist) =>
            whitelist.setDescription("Wymagana rola do wzięcia udziału.").setRequired(false),
          )
          .addRole("zakazana-rola", (blacklist) =>
            blacklist.setDescription("Zakazana rola do wzięcia udziału.").setRequired(false),
          )
          .handle(
            async (
              { prisma, messageQueue },
              {
                nagrody: rewards,
                "czas-trwania": duration,
                tytul: title,
                baner: banner,
                "format-baneru": format,
                "wymagana-rola": whitelist,
                "zakazana-rola": blacklist,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              await itx.deferReply({ flags: MessageFlags.Ephemeral });

              await ensureUserExists(prisma, itx.user);

              const ratio = (format as GiveawayBannerRatio) ?? GiveawayBannerRatio.Auto;

              const files: AttachmentBuilder[] = [];
              let imageURL: string;

              if (banner && ratio !== GiveawayBannerRatio.None) {
                if (banner.size > 4_000_000) {
                  return await errorFollowUp(
                    itx,
                    `Baner jest za duży (>4MB). Aktualny rozmiar pliku: ${round(banner.size / 1_000_000, 1)} MB.`,
                  );
                }

                const [buffer, ext] = await formatBanner(banner, ratio);
                if (!buffer) {
                  return await errorFollowUp(
                    itx,
                    `Podano baner z nieprawidłowym rozszerzeniem lub ten typ nie obsługuje formatowania. (${banner.contentType})`,
                  );
                }

                const attachment = new AttachmentBuilder(buffer).setName(`banner.${ext}`);
                files.push(attachment);
                imageURL = `attachment://banner.${ext}`;
              } else {
                imageURL = getStaticBanner(title || "Giveaway");
              }

              const parsedRewards: ParsedReward[] = parseRewards(rewards);

              const analyzedRewards = await analyzeRewards(parsedRewards, prisma, itx.guildId);

              const parsedTime: Duration | null = parseDuration(duration);

              if (parsedTime === null) {
                return await errorFollowUp(itx, "Podano nieprawidłowy czas");
              }

              const durationSeconds = durationToSeconds(parsedTime);

              const endTime = addSeconds(itx.createdAt, durationSeconds);

              const totalRewards = parsedRewards.reduce((sum, r) => sum + r.amount, 0);

              const confirmButton = new ButtonBuilder()
                .setCustomId("confirm")
                .setLabel("Potwierdź poprawność")
                .setStyle(ButtonStyle.Secondary);

              const confirmFixedButton = new ButtonBuilder()
                .setCustomId("confirm-fixed")
                .setLabel("Potwierdź z poprawkami")
                .setStyle(ButtonStyle.Secondary);

              const messageContainer = new ContainerBuilder();

              if (ratio !== GiveawayBannerRatio.None) {
                messageContainer.addMediaGalleryComponents((mg) =>
                  mg.addItems((mgi) =>
                    mgi
                      .setDescription(`Banner for giveaway: ${title || "Giveaway"}`)
                      .setURL(imageURL),
                  ),
                );
              }

              const roleRestriction: string[] = [];

              if (whitelist || blacklist) roleRestriction.push("### Restrykcje:");
              if (whitelist) roleRestriction.push(`-# Wymagane role: ${whitelist}`);
              if (blacklist) roleRestriction.push(`-# Zakazane role: ${blacklist}`);

              messageContainer
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((td) => td.setContent(`# ${title || "Giveaway"}`))
                .addTextDisplayComponents((td) =>
                  td.setContent(`-# Host: ${itx.user}\n${roleRestriction.join("\n")}`),
                )
                .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
                .addTextDisplayComponents((td) =>
                  td
                    .setContent(`${analyzedRewards.map(formatRewardPreview).join("\n")}\n`)
                    .setId(3),
                )
                .addTextDisplayComponents((td) =>
                  td.setContent(`Koniec ${time(endTime, "R")}`).setId(4),
                )
                .addSeparatorComponents((s) => s)
                .addTextDisplayComponents((td) =>
                  td
                    .setContent(`-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards} | Id: ?`)
                    .setId(1),
                )
                .addTextDisplayComponents((td) =>
                  td.setContent("Potwierdź jeśli wszystko się zgadza w giveawayu.").setId(99),
                )
                .addTextDisplayComponents((td) =>
                  td
                    .setContent(
                      "-# ✅ oznacza że nagroda zostanie nadana automatycznie po wpisaniu komendy `/givek-rozdaj-...`,\n-# ❌ oznacza że nagroda nie została rozpoznana i nie zostanie automatycznie rozdana",
                    )
                    .setId(98),
                )
                .addActionRowComponents((ar) =>
                  ar.setComponents([confirmButton, confirmFixedButton]),
                );

              const responseConfirm = await itx.editReply({
                components: [messageContainer],
                files: files,
                flags: [MessageFlags.IsComponentsV2],
              });

              // Removes confirmation components
              const confirmIndex = messageContainer.components.findIndex(
                (c) => c.data?.id === 99 && c.data?.type === ComponentType.TextDisplay,
              );
              messageContainer.spliceComponents(confirmIndex, 2);

              if (!responseConfirm) {
                throw new Error("Failed to receive response from interaction reply");
              }

              const confirmation = await waitForButtonClick(
                responseConfirm,
                ["confirm", "confirm-fixed"],
                { minutes: 1 },
                (interaction) => interaction.user.id === itx.user.id,
              );

              if (!confirmation.interaction) return;

              // Determine which button was clicked:
              // - "Potwierdź poprawność" (confirm): the moderator confirms the
              //   preview is correct — parse/structure the rewards but keep the
              //   original display text.
              // - "Potwierdź z poprawkami" (confirm-fixed): the moderator
              //   accepts the analyzer's corrected text (e.g. "1,5k pkt" →
              //   "1500 pkt" mute "3d").
              const useFixedText = confirmation.interaction.customId === "confirm-fixed";

              const paidRewards = analyzedRewards.map((reward) =>
                toPersistedReward(reward, useFixedText),
              );

              itx.deleteReply();

              // Remove confirmation UI: buttons, "Potwierdź" text, and
              // the checkmark explanation footer — they must not appear
              // on the published giveaway message.
              const removeById = (id: number) => {
                const idx = messageContainer.components.findIndex((c) => c.data?.id === id);
                if (idx !== -1) messageContainer.spliceComponents(idx, 1);
              };
              removeById(99); // "Potwierdź jeśli wszystko się zgadza"
              removeById(98); // checkmark explanation
              const actionRowIdx = messageContainer.components.findIndex(
                (c) => c.data?.type === ComponentType.ActionRow,
              );
              if (actionRowIdx !== -1) {
                messageContainer.spliceComponents(actionRowIdx, 1);
              }

              const rewardsIndex = messageContainer.components.findIndex(
                (c) => c.data?.id === 3 && c.data?.type === ComponentType.TextDisplay,
              );
              if (rewardsIndex !== -1) {
                messageContainer.components[rewardsIndex] = new TextDisplayBuilder().setContent(
                  `${paidRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}\n`,
                );
              }

              messageContainer.addActionRowComponents(createGiveawayButtonRow(false).setId(2));
              messageContainer.addActionRowComponents(createRewardButtonRow().setId(5));

              const response = await itx.followUp({
                components: [messageContainer],
                files: files,
                withResponse: true,
                flags: MessageFlags.IsComponentsV2,
              });

              if (!response) {
                throw new Error("Failed to receive response from interaction reply");
              }

              const giveaway = await prisma.giveaway.create({
                data: {
                  authorId: itx.user.id,
                  messageId: response.id,
                  channelId: response.channelId,
                  guildId: response.guildId,
                  endAt: endTime,
                  roleWhitelist: whitelist ? [whitelist.id] : [],
                  roleBlacklist: blacklist ? [blacklist.id] : [],
                  participants: { create: [] },
                  rewards: {
                    create: paidRewards.map(({ amount, reward, type, ...payout }) => ({
                      amount,
                      reward,
                      type,
                      ...payout,
                    })),
                  },
                  totalRewards: totalRewards,
                },
              });

              await messageQueue.push(
                "giveawayEnd",
                { giveawayId: giveaway.id },
                Math.floor((endTime.valueOf() - response.createdAt.valueOf()) / 1000),
                giveaway.id.toString(),
              );

              updateGiveaway(response, giveaway, prisma);
            },
          ),
      )
      .addCommand("time-add", (command) =>
        command
          .setDescription("Dodawanie czasu do istniejącego giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .addString("czas", (czas) =>
            czas.setDescription("Czas do dodania (np. 1d, 2h, 5m).").setRequired(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma, messageQueue }, { id, czas }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway || giveaway.endAt < itx.createdAt)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje lub się zakończył!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do edycji tego giveawaya!");

            const channel = await itx.client.channels.fetch(giveaway.channelId);
            if (!channel || !channel.isSendable()) {
              throw new Error(`Channel ${channel} is not sendable or not found.`);
            }

            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message || !message.components[0]) {
              throw new Error(`Message ${message} or it's component not found.`);
            }

            const parsedTime: Duration | null = parseDuration(czas);

            if (parsedTime === null) {
              return await errorFollowUp(itx, "Podano nieprawidłowy czas");
            }

            const durationSeconds = durationToSeconds(parsedTime);

            const newEndTime = addSeconds(giveaway.endAt, durationSeconds);

            const container = new ContainerBuilder(
              message.components[0].toJSON() as APIContainerComponent,
            );

            const timeIndex = container.components.findIndex(
              (c) => c.data?.id === 4 && c.data?.type === ComponentType.TextDisplay,
            );

            if (timeIndex === -1) return;

            container.components[timeIndex] = new TextDisplayBuilder().setContent(
              `Koniec ${time(newEndTime, "R")}`,
            );

            await message.edit({ components: [container] });

            await messageQueue.updateDelay("giveawayEnd", giveaway.id.toString(), newEndTime);

            await prisma.giveaway.update({
              where: {
                id: id,
              },
              data: {
                endAt: newEndTime,
              },
            });

            await itx.reply({
              content: `Pomyślnie dodano do czasu ${formatDuration(parsedTime)}, giveaway zakończy się ${time(newEndTime, "R")}.${giveawayFooter(giveaway)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("reroll", (command) =>
        command
          .setDescription("Losuje jednego użytkownika spośród tych którzy nie wygrali giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do rerollowania tego giveawaya!");

            const [participants, winners] = await prisma.$transaction([
              prisma.giveawayParticipant.findMany({
                where: { giveawayId: giveaway.id, isRemoved: false },
              }),
              prisma.giveawayWinner.findMany({
                where: { giveawayId: giveaway.id },
              }),
            ]);

            const filtered = participants.filter(
              (p) => !winners.some((w) => w.userId === p.userId),
            );

            const newWinner = filtered.length > 0 ? shuffle(filtered)[0] : null;

            if (!newWinner) {
              return await errorFollowUp(
                itx,
                `Brak dostępnych uczestników do rerollowania!${giveawayFooter(giveaway)}`,
              );
            }

            await itx.reply({
              content: `Wygrywa: <@${newWinner.userId}>${giveawayFooter(giveaway)}`,
              allowedMentions: { users: [newWinner.userId] },
            });
          }),
      )
      .addCommand("reroll-all", (command) =>
        command
          .setDescription("Losuje na nowo wszystkich zwycięzców giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
              include: {
                rewards: true,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do rerollowania tego giveawaya!");

            const [rewards, participants] = await prisma.$transaction([
              prisma.giveawayReward.findMany({
                where: { giveawayId: giveaway.id },
              }),
              prisma.giveawayParticipant.findMany({
                where: { giveawayId: giveaway.id, isRemoved: false },
              }),
            ]);

            if (participants.length === 0) {
              return await errorFollowUp(
                itx,
                `Brak uczestników w giveawayu!${giveawayFooter(giveaway)}`,
              );
            }

            await prisma.giveawayWinner.deleteMany({
              where: { giveawayId: giveaway.id },
            });

            const newWinners = await selectAndSaveWinners(
              giveaway.id,
              giveaway.rewards,
              participants,
              prisma,
            );

            const results = rewards.map(({ reward, id: rewardId }) => {
              const rewardWinners = newWinners.filter((w) => w.rewardId === rewardId);
              const mention =
                rewardWinners.length === 0
                  ? "nikt"
                  : rewardWinners.map((w) => `<@${w.userId}>`).join(" ");
              return `> ${reward} ${mention}`;
            });

            const resultContainer = new ContainerBuilder()
              .setAccentColor(0x00ff99)
              .addTextDisplayComponents((td) => td.setContent("# :tada: Nowi zwycięzcy:"))
              .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
              .addTextDisplayComponents((td) => td.setContent(results.join("\n")));

            await itx.reply({
              components: [resultContainer],
              allowedMentions: { users: participants.map((p) => p.userId) },
              flags: MessageFlags.IsComponentsV2,
            });
          }),
      )
      .addCommand("list-users", (command) =>
        command
          .setDescription("Pokazuje liste użytkowników w giveawayu, w razie gdy się zakończy.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .handle(async ({ prisma }, { id }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            const participants: GiveawayParticipant[] = await prisma.giveawayParticipant.findMany({
              where: { giveawayId: giveaway.id, isRemoved: false },
            });

            const fmtParticipants =
              participants.length > 0
                ? participants.map((user) => `<@${user.userId}>`).join(", ")
                : "Brak uczestników";

            await itx.reply({
              content: `Uczestnicy: ${fmtParticipants}${giveawayFooter(giveaway)}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("remove-user", (command) =>
        command
          .setDescription("Usuwa użytkownika z giveawaya.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveawaya.").setRequired(true).setAutocomplete(true),
          )
          .autocomplete(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;
            return autocompleteGiveawayId({ prisma, itx });
          })
          .addUser("user", (user) =>
            user.setDescription("Użytkownik do usunięcia.").setRequired(true),
          )
          .handle(async ({ prisma }, { id, user: userToRemove }, itx) => {
            const giveaway = await prisma.giveaway.findFirst({
              where: {
                id: id,
              },
            });

            if (!giveaway) return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(itx, "Nie masz uprawnień do edytowania tego giveawaya!");

            const participant = await prisma.giveawayParticipant.findFirst({
              where: { giveawayId: giveaway.id, userId: userToRemove.id },
            });

            if (!participant)
              return await errorFollowUp(itx, "Ten użytkownik nie bierze udziału w giveawayu!");

            await prisma.giveawayParticipant.update({
              where: { id: participant.id },
              data: { forcefullyRemoved: true, isRemoved: true },
            });

            await itx.reply({
              content: `Pomyślnie usunięto ${userToRemove} z giveawaya!`,
            });

            const channel = await itx.client.channels.fetch(giveaway.channelId);
            if (!channel || !channel.isSendable()) {
              throw new Error(`Channel ${channel} is not sendable or not found.`);
            }

            const message = await channel.messages.fetch(giveaway.messageId);
            if (!message) {
              throw new Error(`Message ${message} not found.`);
            }

            await updateGiveaway(message, giveaway, prisma);
          }),
      ),
  )
  .command("givek-rozdaj-punkty", (command) =>
    command
      .setDescription("Rozdaje zwycięzcom punkty z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, economyLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }
        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyłonieni.",
          );
        }

        await distributeGiveawayEconomyRewards({
          prisma,
          economyLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          rewardTypes: ["currency"],
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .command("givek-rozdaj-itemy", (command) =>
    command
      .setDescription("Rozdaje zwycięzcom przedmioty z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, economyLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }
        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyłonieni.",
          );
        }

        await distributeGiveawayEconomyRewards({
          prisma,
          economyLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          rewardTypes: ["item"],
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .command("givek-rozdaj-mute", (command) =>
    command
      .setDescription("Nakłada na zwycięzców nagrody (mute) z giveawayu")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addInteger("id", (id) =>
        id.setDescription("Id giveawaya").setRequired(true).setAutocomplete(true),
      )
      .autocomplete(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await autocompleteGiveawayIdForStaff({ prisma, itx });
      })
      .handle(async ({ prisma, messageQueue, moderationLog }, { id }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const giveaway = await prisma.giveaway.findFirst({
          where: { id, guildId: itx.guildId },
        });
        if (!giveaway) {
          return await errorFollowUp(itx, "Nie znaleziono giveawaya o takim id.");
        }
        if (giveaway.endAt > itx.createdAt) {
          return await errorFollowUp(
            itx,
            "Ten giveaway jeszcze się nie zakończył, zwycięzcy nie są jeszcze wyznaczeni.",
          );
        }

        await distributeGiveawayMutes({
          prisma,
          messageQueue,
          log: moderationLog,
          guild: itx.guild,
          moderator: itx.user,
          giveaway,
          reply: (content) => itx.editReply(content),
        });
      }),
  )
  .handle(
    "buttonInteractionCreate",
    async ({ prisma, economyLog, messageQueue, moderationLog }, itx) => {
      if (!itx.inCachedGuild()) return;

      // giveaway-reward -> ephemeral menu / distribution (handlers/rewardHandler.ts)
      if (itx.customId.startsWith("giveaway-reward")) {
        await handleGiveawayRewardButton({
          prisma,
          economyLog,
          messageQueue,
          moderationLog,
          itx,
        });
        return;
      }

      // giveaway-option:join / giveaway-option:list / leave_giveaway (handlers/joinHandler.ts)
      if (itx.customId.startsWith("giveaway-option:")) {
        await handleGiveawayJoinButton({ prisma, itx });
        return;
      }
    },
  );
