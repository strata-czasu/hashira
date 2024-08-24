import { Hashira } from "@hashira/core";
import type { ExtendedPrismaClient } from "@hashira/db";
import { isSameDay, subDays } from "date-fns";
import { bold, userMention } from "discord.js";
import { randomInt } from "es-toolkit";
import { base } from "../../base";
import { STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { ensureUsersExist } from "../../util/ensureUsersExist";
import { addBalance } from "../managers/transferManager";
import { formatBalance } from "./strataCurrency";

const calculateDailyAmount = (marriageBonus: boolean, targetNotSelf: boolean) => {
  if (!targetNotSelf) {
    return randomInt(10, 100);
  }

  if (marriageBonus) {
    const amount = randomInt(30, 150);
    return randomInt(0, 100) < 5 ? -amount : amount;
  }

  return randomInt(30, 100);
};

const calculateDailyStreak = async (
  prisma: ExtendedPrismaClient,
  userId: string,
  guildId: string,
) => {
  const redeems = await prisma.dailyPointsRedeems.findMany({
    where: { userId, guildId },
    orderBy: { timestamp: "desc" },
  });

  let streak = 0;
  let lastTimestamp = new Date();

  // Ensure that the user hasn't redeemed today
  if (redeems[0] && isSameDay(redeems[0].timestamp, new Date())) {
    return -1;
  }

  for (const redeem of redeems) {
    if (isSameDay(redeem.timestamp, subDays(lastTimestamp, 1))) {
      streak++;
    } else {
      break;
    }
    lastTimestamp = redeem.timestamp;
  }
  return streak;
};

export const strataDaily = new Hashira({ name: "strata-daily" })
  .use(base)
  .command("daily", (command) =>
    command
      .setDefaultMemberPermissions(0)
      .setDescription("Odbierz lub przekaż swoje codzienne punkty")
      .addUser("użytkownik", (option) =>
        option
          .setDescription("Użytkownik, któremu chcesz przekazać punkty")
          .setRequired(false),
      )
      .handle(async ({ prisma }, { użytkownik: user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const targetUser = user ?? itx.user;
        await ensureUsersExist(prisma, [itx.user.id, targetUser.id]);

        const invokerMarriage = await prisma.user.findFirst({
          where: { id: itx.user.id },
          select: { marriedTo: true },
        });

        const dailyStreak = await calculateDailyStreak(
          prisma,
          itx.user.id,
          itx.guildId,
        );

        if (dailyStreak === -1) {
          await itx.editReply("Twoje dzisiejsze punkty zostały już odebrane!");
          return;
        }

        const shouldApplyMarriageBonus = invokerMarriage?.marriedTo === targetUser.id;
        const shouldApplyTargetNotSelf = itx.user.id !== targetUser.id;

        const amount = calculateDailyAmount(
          shouldApplyMarriageBonus,
          shouldApplyTargetNotSelf,
        );

        const streakBonus = Math.min(dailyStreak, 20) / 100;
        const totalAmount = Math.floor(amount * (1 + streakBonus));

        await addBalance({
          prisma,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: "Daily",
          guildId: itx.guildId,
          toUserId: targetUser.id,
          amount: totalAmount,
        });

        await prisma.dailyPointsRedeems.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });

        const giveOrReceive = shouldApplyTargetNotSelf
          ? `Przekazujesz dla ${userMention(targetUser.id)}`
          : "Otrzymujesz";

        const lines = [
          bold("Twoje codzienne punkty!"),
          `${giveOrReceive} ${formatBalance(totalAmount, STRATA_CZASU_CURRENCY.symbol)}!`,
          `Twój obecny streak: ${dailyStreak + 1}`,
        ];

        await itx.editReply(lines.join("\n"));
      }),
  );
