import { Hashira } from "@hashira/core";
import type { GiveawayParticipant, GiveawayReward } from "@hashira/db";
import { type Duration, addSeconds } from "date-fns";
import {
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  ContainerBuilder,
  MessageFlags,
  SeparatorSpacingSize,
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
  endGiveaway,
  formatBanner,
  getStaticBanner,
  giveawayButtonRow,
  leaveButtonRow,
  parseRewards,
  updateGiveaway,
} from "./util";

export const giveaway = new Hashira({ name: "giveaway" })
  .use(base)
  .command("givek", (command) =>
    command
      .setDMPermission(false)
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
          .setDescription("Baner wyświetlany na górze giveawaya.")
          .setRequired(false),
      )
      .addNumber("format-baneru", (format) =>
        format
          .setDescription("Konwertuje baner do wybranego współczynnika proporcji.")
          .setRequired(false)
          .addChoices(
            { name: "Brak baneru", value: GiveawayBannerRatio.None },
            { name: "Bez zmian", value: GiveawayBannerRatio.Auto },
            { name: "Szeroki", value: GiveawayBannerRatio.Landscape },
            { name: "Wysoki", value: GiveawayBannerRatio.Portrait },
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
          if (banner && ratio !== GiveawayBannerRatio.None) {
            if (banner.size > 4_000_000) {
              return await errorFollowUp(
                itx,
                `Baner jest za duży (>4MB). Aktualny rozmiar pliku: ${round(banner.size / 1_000_000, 1)} MB.`,
              );
            }
            const buffer = await formatBanner(banner, ratio);
            if (!buffer) {
              return await errorFollowUp(
                itx,
                `Podano nieprawidłowy format baneru. (${banner.contentType})`,
              );
            }

            const attachment = new AttachmentBuilder(buffer).setName("banner.webp");
            attachment && files.push(attachment);
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
                  .setDescription("cool banner :like:")
                  .setURL(
                    banner
                      ? "attachment://banner.webp"
                      : getStaticBanner(title || "Giveaway"),
                  ),
              ),
            );
          }

          messageContainer
            .setAccentColor(0x0099ff)
            .addTextDisplayComponents((td) => td.setContent(`# ${title || "Giveaway"}`))
            .addTextDisplayComponents((td) => td.setContent(`-# Host: ${itx.user}`))
            .addSeparatorComponents((s) => s.setSpacing(SeparatorSpacingSize.Large))
            .addTextDisplayComponents((td) =>
              td.setContent(
                `${parsedRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}
            \nKoniec ${time(endTime, "R")}`,
              ),
            )
            .addSeparatorComponents((s) => s)
            .addTextDisplayComponents((td) =>
              td
                .setContent(`-# Uczestnicy: 0 | Łącznie nagród: ${totalRewards}`)
                .setId(1),
            )
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
              messageId: response.id,
              channelId: response.channelId,
              guildId: response.guildId,
              endAt: endTime,
              participants: { create: [] },
              rewards: {
                create: parsedRewards.map(({ amount, reward }) => ({ amount, reward })),
              },
              totalRewards: totalRewards,
            },
          });

          await messageQueue.push(
            "giveawayEnd",
            { giveawayId: giveaway.id },
            Math.floor((endTime.valueOf() - itx.createdAt.valueOf()) / 1000),
            giveaway.id.toString(),
          );
        },
      ),
  )
  .handle("ready", async ({ prisma, messageQueue }, client) => {
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
          content: "Ten giveaway już się zakończył!",
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
        await messageQueue.cancel("giveawayEnd", giveaway.id.toString());
        await endGiveaway(message, prisma);
        return;
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
