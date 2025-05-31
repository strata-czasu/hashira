import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { addMinutes, hoursToSeconds, isAfter } from "date-fns";
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
import { STRATA_CZASU_CURRENCY } from "./specializedConstants";
import { ensureUserExists } from "./util/ensureUsersExist";
import { waitForButtonClick } from "./util/singleUseButton";

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

type FishRoll = { id: number; name: string; amount: number };

const getRandomFish = (): FishRoll => {
  const fishType = randomInt(1, 101);

  if (fishType === 1) {
    return { id: 1, name: "buta", amount: 1 };
  }
  if (fishType >= 2 && fishType <= 30) {
    return { id: 2, name: "karasia", amount: randomInt(30, 61) };
  }
  if (fishType >= 31 && fishType <= 49) {
    return { id: 3, name: "śledzia", amount: randomInt(50, 81) };
  }
  if (fishType === 50) {
    return { id: 10, name: "wonsza żecznego", amount: randomInt(-130, -70) };
  }
  if (fishType >= 51 && fishType <= 65) {
    return { id: 4, name: "dorsza", amount: randomInt(60, 91) };
  }
  if (fishType >= 66 && fishType <= 75) {
    return { id: 5, name: "pstrąga", amount: randomInt(80, 111) };
  }
  if (fishType >= 76 && fishType <= 85) {
    return { id: 6, name: "szczupaka :crown:", amount: randomInt(90, 111) };
  }
  if (fishType >= 86 && fishType <= 95) {
    return { id: 7, name: "suma", amount: randomInt(110, 131) };
  }
  if (fishType >= 96 && fishType <= 99) {
    return { id: 8, name: "rekina", amount: randomInt(150, 181) };
  }
  if (fishType === 100) {
    return { id: 9, name: "bombardiro crocodilo", amount: randomInt(900, 1101) };
  }

  throw new Error("Unreachable path, all variants should've been handled above");
};

export const fish = new Hashira({ name: "fish" })
  .use(base)
  .command("wedka", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Nielegalny połów ryb")
      .handle(async ({ prisma, messageQueue }, _, itx) => {
        if (!itx.inCachedGuild()) return;
        await ensureUserExists(prisma, itx.user);

        const [canFish, nextFishing] = await checkIfCanFish(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (!canFish) {
          await itx.reply({
            content: `Dalej masz PZW na karku. Następną rybę możesz wyłowić ${time(nextFishing, TimestampStyles.RelativeTime)}`,
            flags: "Ephemeral",
          });
          return;
        }

        const { id, name, amount } = getRandomFish();

        await addBalance({
          prisma,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: `Łowienie ${id}`,
          guildId: itx.guildId,
          toUserId: itx.user.id,
          amount,
        });

        await prisma.lastFishing.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });

        const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

        const reminderButton = new ButtonBuilder()
          .setCustomId("fish_reminder")
          .setLabel("Przypomnij mi za godzinę")
          .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder<ButtonBuilder>().addComponents(reminderButton);

        const response = await itx.reply({
          content: `Wyławiasz ${name} wartego ${balance}`,
          components: [row],
          withResponse: true,
        });

        if (!response.resource?.message) {
          throw new Error("Failed to receive response from interaction reply");
        }

        const clickInfo = await waitForButtonClick(
          response.resource.message,
          "fish_reminder",
          { minutes: 1 },
          (interaction) => interaction.user.id === itx.user.id,
        );

        await clickInfo.editButton((builder) => {
          builder.setDisabled(true);

          if (clickInfo.interaction) {
            builder.setLabel("Widzimy się za godzinę");
            builder.setStyle(ButtonStyle.Success);
          }

          return builder;
        });

        if (clickInfo.interaction) {
          await messageQueue.push(
            "reminder",
            {
              userId: itx.user.id,
              guildId: itx.guildId,
              text: `Możesz znowu łowić ryby! Udaj się nad wodę i spróbuj szczęścia! (${channelLink(itx.channelId, itx.guildId)})`,
            },
            hoursToSeconds(1),
          );
          // Any response is required to acknowledge the button click
          clickInfo.interaction.reply({
            content: "Przypomnę Ci o łowieniu za godzinę!",
            flags: "Ephemeral",
          });
        }
      }),
  );
