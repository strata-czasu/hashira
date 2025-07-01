import { Hashira } from "@hashira/core";
import type { GiveawayParticipant, GiveawayReward } from "@hashira/db";
import { type Duration, addSeconds } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  time,
} from "discord.js";
import { base } from "../base";
import { durationToSeconds, parseDuration } from "../util/duration";
import { ensureUserExists } from "../util/ensureUsersExist";
import { errorFollowUp } from "../util/errorFollowUp";
import { waitForButtonClick } from "../util/singleUseButton";
import {
  endGiveaway,
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
      .handle(
        async (
          { prisma, messageQueue },
          { nagrody: rewards, "czas-trwania": duration, tytul: title },
          itx,
        ) => {
          if (!itx.inCachedGuild()) return;
          await ensureUserExists(prisma, itx.user);

          const parsedRewards: GiveawayReward[] = parseRewards(rewards);

          const parsedTime: Duration | null = parseDuration(duration);

          if (parsedTime === null) {
            return await errorFollowUp(itx, "Podano nieprawidłowy czas");
          }

          const durationSeconds = durationToSeconds(parsedTime);

          const endTime = addSeconds(itx.createdAt, durationSeconds);

          const totalRewards = parsedRewards.reduce((sum, r) => sum + r.amount, 0);

          const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle(title || "Giveaway")
            .setAuthor({
              name: `${itx.user.username}`,
              iconURL: itx.user.avatarURL() || "",
            })
            .setDescription(
              `${parsedRewards.map((r) => `${r.amount}x ${r.reward}`).join("\n")}
            \nKoniec ${time(endTime, "R")}`,
            )
            .setFooter({ text: `Uczestnicy: 0 | Łącznie nagród: ${totalRewards}` });

          const confirmButton = new ButtonBuilder()
            .setCustomId("giveaway-option:confirm")
            .setLabel("Potwierdź poprawność")
            .setStyle(ButtonStyle.Secondary);

          const responseConfirm = await itx.reply({
            content: "Potwierdź jeśli wszystko się zgadza w giveawayu.",
            embeds: [embed],
            components: [
              new ActionRowBuilder<ButtonBuilder>().addComponents(confirmButton),
            ],
            withResponse: true,
            flags: "Ephemeral",
          });

          if (!responseConfirm.resource?.message) {
            throw new Error("Failed to receive response from interaction reply");
          }

          const confirmation = await waitForButtonClick(
            responseConfirm.resource.message,
            "giveaway-option:confirm",
            { minutes: 1 },
            (interaction) => interaction.user.id === itx.user.id,
          );

          if (!confirmation.interaction) return;

          itx.deleteReply();

          const response = await itx.followUp({
            embeds: [embed],
            components: [giveawayButtonRow],
            withResponse: true,
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

      let returnMsg = "Już dołączyłxś do tego giveaway!";

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

        returnMsg = `${itx.user} dołączyłx do giveaway!`;
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
