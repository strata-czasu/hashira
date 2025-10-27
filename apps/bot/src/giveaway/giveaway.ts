import { Hashira } from "@hashira/core";
import type { GiveawayParticipant, GiveawayReward } from "@hashira/db";
import { addSeconds, type Duration } from "date-fns";
import {
  type APIContainerComponent,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  time,
} from "discord.js";
import { round, shuffle } from "es-toolkit";
import { base } from "../base";
import { durationToSeconds, formatDuration, parseDuration } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { waitForButtonClick } from "../util/singleUseButton";
import {
  autocompleteGiveawayId,
  createGiveawayButtonRow,
  createLeaveButtonRow,
  formatBanner,
  GiveawayBannerRatio,
  getStaticBanner,
  giveawayFooter,
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
            duration.setDescription(
              "Czas trwania givka, np. 1d (1 dzień) lub 2h (2 godziny)",
            ),
          )
          .addString("tytul", (tytul) =>
            tytul
              .setDescription("Tytuł giveawaya, domyślnie 'Giveaway'")
              .setRequired(false),
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
            whitelist
              .setDescription("Wymagana rola do wzięcia udziału.")
              .setRequired(false),
          )
          .addRole("zakazana-rola", (blacklist) =>
            blacklist
              .setDescription("Zakazana rola do wzięcia udziału.")
              .setRequired(false),
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
                    `Podano nieprawidłowy format baneru. (${banner.contentType})`,
                  );
                }

                const attachment = new AttachmentBuilder(buffer).setName(
                  `banner.${ext}`,
                );
                files.push(attachment);
                imageURL = `attachment://banner.${ext}`;
              } else {
                imageURL = getStaticBanner(title || "Giveaway");
              }

              const parsedRewards: GiveawayReward[] = parseRewards(rewards);

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
                .addTextDisplayComponents((td) =>
                  td.setContent(`# ${title || "Giveaway"}`),
                )
                .addTextDisplayComponents((td) =>
                  td.setContent(`-# Host: ${itx.user}\n${roleRestriction.join("\n")}`),
                )
                .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
                .addTextDisplayComponents((td) =>
                  td.setContent(
                    `${parsedRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}\n`,
                  ),
                )
                .addTextDisplayComponents((td) =>
                  td.setContent(`Koniec ${time(endTime, "R")}`).setId(4),
                )
                .addSeparatorComponents((s) => s)
                .addTextDisplayComponents((td) =>
                  td
                    .setContent(
                      `-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards} | Id: ?`,
                    )
                    .setId(1),
                )
                .addTextDisplayComponents((td) =>
                  td
                    .setContent("Potwierdź jeśli wszystko się zgadza w giveawayu.")
                    .setId(99),
                )
                .addActionRowComponents((ar) => ar.setComponents([confirmButton]));

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
                "confirm",
                { minutes: 1 },
                (interaction) => interaction.user.id === itx.user.id,
              );

              if (!confirmation.interaction) return;

              itx.deleteReply();

              messageContainer.addActionRowComponents(
                createGiveawayButtonRow().setId(2),
              );

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
                    create: parsedRewards.map(({ amount, reward }) => ({
                      amount,
                      reward,
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
              return await errorFollowUp(
                itx,
                "Ten giveaway nie istnieje lub się zakończył!",
              );

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(
                itx,
                "Nie masz uprawnień do edycji tego giveawaya!",
              );

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

            await messageQueue.updateDelay(
              "giveawayEnd",
              giveaway.id.toString(),
              newEndTime,
            );

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
          .setDescription(
            "Losuje jednego użytkownika spośród tych którzy nie wygrali giveawaya.",
          )
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

            if (!giveaway)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(
                itx,
                "Nie masz uprawnień do rerollowania tego giveawaya!",
              );

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
              content: `Nowy wygrany: <@${newWinner.userId}>${giveawayFooter(giveaway)}`,
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

            if (!giveaway)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(
                itx,
                "Nie masz uprawnień do rerollowania tego giveawaya!",
              );

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
              .addTextDisplayComponents((td) =>
                td.setContent("# :tada: Nowi zwycięzcy:"),
              )
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
          .setDescription(
            "Pokazuje liste użytkowników w giveawayu, w razie gdy się zakończy.",
          )
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

            if (!giveaway)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            const participants: GiveawayParticipant[] =
              await prisma.giveawayParticipant.findMany({
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

            if (!giveaway)
              return await errorFollowUp(itx, "Ten giveaway nie istnieje!");

            if (itx.user.id !== giveaway.authorId)
              return await errorFollowUp(
                itx,
                "Nie masz uprawnień do edytowania tego giveawaya!",
              );

            const participant = await prisma.giveawayParticipant.findFirst({
              where: { giveawayId: giveaway.id, userId: userToRemove.id },
            });

            if (!participant)
              return await errorFollowUp(
                itx,
                "Ten użytkownik nie bierze udziału w giveawayu!",
              );

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
  .handle("clientReady", async ({ prisma }, client) => {
    client.on("interactionCreate", async (itx) => {
      if (!itx.isButton()) return;
      // giveaway-option:optionId
      if (!itx.customId.startsWith("giveaway-option:")) return;
      if (!itx.inCachedGuild()) return;

      // To ensure user exists before trying to join to giveaway
      await ensureUserExists(prisma, itx.user);

      await itx.deferReply({ flags: "Ephemeral" });

      const giveaway = await prisma.giveaway.findFirst({
        where: {
          guildId: itx.message.guildId,
          channelId: itx.message.channelId,
          messageId: itx.message.id,
        },
      });

      if (!giveaway)
        return await itx.followUp({
          content: "Ten giveaway nie istnieje!",
          flags: "Ephemeral",
        });

      const channel = await client.channels.fetch(giveaway.channelId);
      if (!channel || !channel.isSendable()) {
        throw new Error(`Channel ${channel} is not sendable or not found.`);
      }

      const message = await channel.messages.fetch(giveaway.messageId);
      if (!message) {
        throw new Error(`Message ${message} not found.`);
      }

      if (giveaway.endAt <= itx.createdAt) {
        return await itx.followUp({
          content: "Ten giveaway już się zakończył!",
          flags: "Ephemeral",
        });
      }

      if (itx.customId.endsWith("list")) {
        const participants: GiveawayParticipant[] =
          await prisma.giveawayParticipant.findMany({
            where: { giveawayId: giveaway.id, isRemoved: false },
          });

        const fmtParticipants =
          participants.length > 0
            ? participants.map((user) => `<@${user.userId}>`).join(", ")
            : "Brak uczestników";

        await itx.followUp({
          content: `Uczestnicy: ${fmtParticipants}`,
          flags: "Ephemeral",
        });
        return;
      }

      if (!itx.customId.endsWith("join")) {
        await itx.followUp({
          content: `unexpected road: ${giveaway.messageId}`,
          flags: "Ephemeral",
        });
        return;
      }

      let returnMsg = "Już jesteś uczestnikiem do tego giveaway!";

      const existing = await prisma.giveawayParticipant.findFirst({
        where: { userId: itx.user.id, giveawayId: giveaway.id },
      });

      if (existing?.forcefullyRemoved) {
        await itx.followUp({
          content: "Usunięto cię z giveawayu i nie możesz już do niego dołączyć.",
          flags: "Ephemeral",
        });
        return;
      }

      if (!existing || existing.isRemoved) {
        // check if user has required roles and doesn't have banned roles
        for (const roleId of giveaway.roleWhitelist) {
          if (!itx.member.roles.cache.has(roleId)) {
            await itx.followUp({
              content: `Musisz posiadać rolę <@&${roleId}>, aby wziąć udział w giveawayu.`,
              flags: "Ephemeral",
            });
            return;
          }
        }

        for (const roleId of giveaway.roleBlacklist) {
          if (itx.member.roles.cache.has(roleId)) {
            await itx.followUp({
              content: `Nie możesz posiadać roli <@&${roleId}>, aby wziąć udział w giveawayu.`,
              flags: "Ephemeral",
            });
            return;
          }
        }

        if (!existing) {
          await prisma.giveawayParticipant.create({
            data: {
              userId: itx.user.id,
              giveawayId: giveaway.id,
            },
          });
        } else {
          await prisma.giveawayParticipant.update({
            where: { id: existing.id },
            data: { isRemoved: false },
          });
        }

        returnMsg = `${itx.user} dołączyłxś do giveaway!`;
        await updateGiveaway(itx.message, giveaway, prisma);
      }

      const joinResponse = await itx.followUp({
        content: returnMsg,
        components: [createLeaveButtonRow()],
      });

      if (!joinResponse) {
        throw new Error("Failed to receive response from interaction reply");
      }

      const leaveButtonClick = await waitForButtonClick(
        joinResponse,
        "leave_giveaway",
        { minutes: 1 },
        (interaction) => interaction.user.id === itx.user.id,
      );

      if (!leaveButtonClick.interaction) return;

      if (giveaway.endAt <= itx.createdAt) {
        await itx.followUp({
          content: "Ten giveaway już się zakończył!",
          flags: "Ephemeral",
        });
        return;
      }

      // replying to original giveaway so user can jump to it instead of reply > reply > giveaway
      await leaveButtonClick.interaction.deferReply({ flags: "Ephemeral" });
      await leaveButtonClick.interaction.deleteReply();

      await prisma.giveawayParticipant.updateMany({
        where: { userId: itx.user.id, giveawayId: giveaway.id, isRemoved: false },
        data: { isRemoved: true },
      });
      await updateGiveaway(itx.message, giveaway, prisma);

      await itx.followUp({
        content: "Opuściłxś giveaway.",
        flags: "Ephemeral",
      });
      return;
    });
  });
