import { isSameDay } from "date-fns";
import { userMention } from "discord.js";

import { Hashira } from "@hashira/core";
import { nestedTransaction } from "@hashira/db/transaction";

import { base } from "../../base";
import { REP_CURRENCY } from "../../specializedConstants";
import { ensureUsersExist } from "../../util/ensureUsersExist";
import { addBalance } from "../managers/transferManager";

export const strataRep = new Hashira({ name: "strata-rep" }).use(base).command("rep", (command) =>
  command
    .setDescription("Nadaj punkt reputacji (1 raz dziennie)")
    .setDMPermission(false)
    .addUser("użytkownik", (user) => user.setDescription("Komu chcesz nadać reputację"))
    .handle(async ({ prisma }, { użytkownik: user }, itx) => {
      if (!itx.inCachedGuild()) return;
      await itx.deferReply();

      if (itx.user.id === user.id) {
        await itx.editReply("Nie możesz nadać sobie reputacji!");
        return;
      }

      await ensureUsersExist(prisma, [itx.user.id, user.id]);

      const result = await prisma.$transaction(async (tx) => {
        const redeem = await tx.dailyRepRedeem.findFirst({
          where: { userId: itx.user.id, guildId: itx.guildId },
          orderBy: { timestamp: "desc" },
        });
        if (redeem && isSameDay(redeem.timestamp, new Date())) {
          return "alreadyRedeemed";
        }

        await addBalance({
          prisma: nestedTransaction(tx),
          currencySymbol: REP_CURRENCY.symbol,
          reason: "Rep",
          guildId: itx.guildId,
          toUserId: user.id,
          amount: 1,
        });
        await tx.dailyRepRedeem.create({
          data: { userId: itx.user.id, guildId: itx.guildId },
        });
        return "success";
      });

      if (result === "alreadyRedeemed") {
        await itx.editReply("Twój dzisiejszy punkt reputacji został już nadany!");
        return;
      }

      await itx.editReply(`Nadajesz punkt reputacji dla ${userMention(user.id)}!`);
    }),
);
