import { Hashira } from "@hashira/core";
import type { GiveawayParticipant, GiveawayReward } from "@hashira/db";
import { type Duration, addSeconds, formatDuration } from "date-fns";
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
import { round } from "es-toolkit";
import { base } from "../base";
import { durationToSeconds, parseDuration } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { waitForButtonClick } from "../util/singleUseButton";
import {
  GiveawayBannerRatio,
  formatBanner,
  getStaticBanner,
  giveawayButtonRow,
  giveawayFooter,
  leaveButtonRow,
  parseRewards,
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
              .setDescription("Tytuł giveaway'a, domyślnie 'Giveaway'")
              .setRequired(false),
          )
          .addAttachment("baner", (baner) =>
            baner
              .setDescription(
                "Baner wyświetlany na górze giveaway'a. Domyślny można wyłączyć ustawiając format na brak.",
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
          .handle(
            async (
              { prisma, messageQueue },
              {
                nagrody: rewards,
                "czas-trwania": duration,
                tytul: title,
                baner: banner,
                "format-baneru": format,
              },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;
              await ensureUserExists(prisma, itx.user);

              await itx.deferReply({
                flags: MessageFlags.Ephemeral,
              });

              const ratio: GiveawayBannerRatio =
                format !== null
                  ? (format as GiveawayBannerRatio)
                  : GiveawayBannerRatio.Auto;

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

              messageContainer
                .setAccentColor(0x0099ff)
                .addTextDisplayComponents((td) =>
                  td.setContent(`# ${title || "Giveaway"}`),
                )
                .addTextDisplayComponents((td) => td.setContent(`-# Host: ${itx.user}`))
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
                    .setContent(`-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards}`)
                    .setId(1),
                )
                .addTextDisplayComponents((td) => td.setContent("-# Id: ?").setId(3))
                .addTextDisplayComponents((td) =>
                  td
                    .setContent("Potwierdź jeśli wszystko się zgadza w giveawayu.")
                    .setId(99),
                )
                .addActionRowComponents((ar) => ar.addComponents([confirmButton]));

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

              messageContainer.addActionRowComponents(giveawayButtonRow.setId(2));

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

              const giveawayIdIndex = messageContainer.components.findIndex(
                (c) => c.data?.id === 3 && c.data?.type === ComponentType.TextDisplay,
              );

              messageContainer.components[giveawayIdIndex] =
                new TextDisplayBuilder().setContent(`-# Id: ${giveaway.id}`);

              await response.edit({
                components: [messageContainer],
                flags: MessageFlags.IsComponentsV2,
              });
            },
          ),
      )
      .addCommand("time-add", (command) =>
        command
          .setDescription("Dodawanie czasu do istniejącego giveaway'a.")
          .addInteger("id", (id) =>
            id.setDescription("Id giveaway'a.").setRequired(true),
          )
          .addString("czas", (czas) =>
            czas.setDescription("Czas do dodania (np. 1d, 2h, 5m).").setRequired(true),
          )
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
                "Nie masz uprawnień do edycji tego giveaway'a!",
              );

            const channel = await itx.client.channels.cache.get(giveaway.channelId);
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
              content: `Pomyślnie dodano do czasu ${formatDuration(parsedTime)}, giveaway zakończy się ${time(newEndTime, "R")}.\n-# Id: ${giveaway.id}`,
              flags: "Ephemeral",
            });
          }),
      )
      .addCommand("reroll", (command) =>
        command
          .setDescription(
            "Losuje jednego użytkownika spośród tych którzy nie wygrali giveaway'a.",
          )
          .addInteger("id", (id) =>
            id.setDescription("Id giveaway'a.").setRequired(true),
          )
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
                "Nie masz uprawnień do rerollowania tego giveaway'a!",
              );

            const [participants, winners] = await prisma.$transaction([
              prisma.giveawayParticipant.findMany({
                where: { giveawayId: giveaway.id, isRemoved: false },
              }),
              prisma.giveawayWinner.findMany({
                where: { giveawayId: giveaway.id },
              }),
            ]);

            const newWinner = participants.find(
              (p) => !winners.some((w) => w.userId === p.userId),
            );

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
      .addCommand("list-users", (command) =>
        command
          .setDescription(
            "Pokazuje liste użytkowników w giveaway'u, w razie gdy się zakończy.",
          )
          .addInteger("id", (id) =>
            id.setDescription("Id giveaway'a.").setRequired(true),
          )
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
      ),
  )
  .handle("ready", async ({ prisma }, client) => {
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

      const channel = await client.channels.cache.get(giveaway.channelId);
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

      if (!existing || existing.isRemoved) {
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
        updateGiveaway(itx, giveaway, prisma);
      }

      const joinResponse = await itx.followUp({
        content: returnMsg,
        components: [leaveButtonRow],
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
      updateGiveaway(itx, giveaway, prisma);

      await itx.followUp({
        content: "Opuściłxś giveaway.",
        flags: "Ephemeral",
      });
      return;
    });
  });
