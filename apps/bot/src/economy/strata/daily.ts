import { Hashira } from "@hashira/core";
import { type db, schema } from "@hashira/db";
import { desc, eq } from "@hashira/db/drizzle";
import { isSameDay, subDays } from "date-fns";
import { bold } from "discord.js";
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

const calculateDailyStreak = async (database: typeof db, userId: string) => {
  const redeems = await database.query.dailyPointsRedeems.findMany({
    where: eq(schema.dailyPointsRedeems.userId, userId),
    orderBy: desc(schema.dailyPointsRedeems.timestamp),
    columns: { timestamp: true },
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
      .handle(async ({ db }, { użytkownik: user }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        const targetUser = user ?? itx.user;
        await ensureUsersExist(db, [itx.user.id, targetUser.id]);

        const invokerMarriage = await db.query.user.findFirst({
          where: eq(schema.user.id, itx.user.id),
          columns: { marriedTo: true },
        });

        const dailyStreak = await calculateDailyStreak(db, itx.user.id);

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
          db,
          currencySymbol: STRATA_CZASU_CURRENCY.symbol,
          reason: "Daily",
          guildId: itx.guildId,
          toUserId: targetUser.id,
          amount: totalAmount,
        });

        await db.insert(schema.dailyPointsRedeems).values({
          userId: itx.user.id,
          guildId: itx.guildId,
        });

        const giveOrReceive = shouldApplyTargetNotSelf ? "Przekazujesz" : "Otrzymujesz";

        const lines = [
          bold("Twoje codzienne punkty!"),
          `${giveOrReceive} ${formatBalance(totalAmount, STRATA_CZASU_CURRENCY.symbol)}!`,
          `Twój obecny streak: ${dailyStreak + 1}`,
        ];

        await itx.editReply(lines.join("\n"));
      }),
  );
