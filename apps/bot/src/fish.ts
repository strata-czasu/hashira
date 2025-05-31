import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { addMinutes, isAfter } from "date-fns";
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TimestampStyles,
  channelLink,
  time,
} from "discord.js";
import { randomInt } from "es-toolkit";
import { base } from "./base";
import { addBalance } from "./economy/managers/transferManager";
import { formatBalance } from "./economy/util";
import { messageQueueBase } from "./messageQueueBase";
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";

const checkIfCanFish = async (
  prisma: ExtendedPrismaClient,
  userId: string,
  guildId: string,
): Promise<[boolean, Date]> => {
  const fishing = await prisma.lastFishing.findFirst({
    where: { userId, guildId },
    orderBy: { timestamp: "desc" },
  });

  const lastFishing = fishing?.timestamp ?? new Date(0);
  const nextFishing = addMinutes(lastFishing, 60);
  const canFish = isAfter(new Date(), nextFishing);

  return [canFish, nextFishing];
};

const getRandomFish = (): [string, number, number] => {
  const fishType = randomInt(1, 101);

  if (fishType === 1) {
    return ["buta", 1, 1];
  }
  if (fishType >= 1 && fishType <= 30) {
    return ["karasia", randomInt(30, 61), 2];
  }
  if (fishType >= 31 && fishType <= 49) {
    return ["śledzia", randomInt(50, 81), 3];
  }
  if (fishType >= 51 && fishType <= 65) {
    return ["dorsza", randomInt(60, 91), 4];
  }
  if (fishType >= 66 && fishType <= 75) {
    return ["pstrąga", randomInt(80, 111), 5];
  }
  if (fishType >= 76 && fishType <= 85) {
    return ["szczupaka :crown:", randomInt(90, 111), 6];
  }
  if (fishType >= 86 && fishType <= 95) {
    return ["suma", randomInt(110, 131), 7];
  }
  if (fishType >= 96 && fishType <= 99) {
    return ["rekina", randomInt(150, 181), 8];
  }
  if (fishType === 100) {
    return ["bombardiro crocodilo", randomInt(900, 1101), 9];
  }
  if (fishType === 50) {
    return ["wonsza żecznego", randomInt(-130, -70), 10];
  }

  throw new Error("Unreachable path, all variants should've been handled above");
};

export const fish = new Hashira({ name: "fish" })
  .use(base)
  .use(messageQueueBase)
  .command("wedka", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Nielegalny połów ryb")
      .handle(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;

        const [canFish, nextFishing] = await checkIfCanFish(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (canFish) {
          const [fish, amount, fishId] = getRandomFish();

          await addBalance({
            prisma,
            currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            reason: `Łowienie ${fishId}`,
            guildId: itx.guildId,
            toUserId: itx.user.id,
            amount: amount,
          });

          await prisma.lastFishing.create({
            data: { userId: itx.user.id, guildId: itx.guildId },
          });

          const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

          const reminderButton = new ButtonBuilder()
            .setCustomId("fish_reminder")
            .setLabel("Przypomnij mi za godzinę")
            .setStyle(ButtonStyle.Secondary);

          const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
            reminderButton,
          );

          await itx.reply({
            content: `Wyławiasz ${fish} wartego ${balance}`,
            components: [row],
          });
        } else {
          await itx.reply({
            content: `Dalej masz PZW na karku. Następną rybę możesz wyłowić ${time(nextFishing, TimestampStyles.RelativeTime)}`,
            flags: "Ephemeral",
          });
        }
      }),
  )
  .handle("interactionCreate", async ({ messageQueue }, itx) => {
    if (!itx.inCachedGuild()) return;
    if (!itx.isButton()) return;
    if (itx.customId !== "fish_reminder") return;
    if (itx.message.author.id !== itx.user.id) {
      await itx.reply({
        content: "To nie twoje łowisko!",
        flags: "Ephemeral",
      });
      return;
    }

    await messageQueue.push("reminder", {
      userId: itx.user.id,
      guildId: itx.guildId,
      text: `Możesz znowu łowić ryby! Udaj się nad wodę i spróbuj szczęścia! (${channelLink(itx.channelId, itx.guildId)})`,
    });

    await itx.reply({
      content: "Przypomnienie zostało ustawione!",
      flags: "Ephemeral",
    });

    await itx.message.edit({
      components: [],
    });
  });
