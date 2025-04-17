import { Hashira } from "@hashira/core";
import { randomInt } from "es-toolkit";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { addBalance } from "./managers/transferManager";
import { formatBalance } from "./util";
import type { ExtendedPrismaClient } from "@hashira/db";
import { isAfter, addMinutes } from "date-fns";

const checkIfRedeemable = async (
  prisma: ExtendedPrismaClient,
  userId: string,
  guildId: string,
) => {
  const redeems = await prisma.lastFishing.findmany({
    where: { userId, guildId },
    orderBy: { timestamp: "desc" },
  });

    const lastRedeem = redeems[0].timestamp ?? new Date(0);

    const nextRedeem = addMinutes(lastRedeem, 60);

    return [isAfter(new Date(), addMinutes(lastRedeem, 60)), nextRedeem.valueOf()];
}

const calculateFishPrice = (): [string, number] => {
  const fishType = randomInt(1, 101);

  if(fishType>=1 && fishType<=30){
    return ["karasia", randomInt(30-61)];
  }
  if(fishType>=31 && fishType<=50){
    return ["śledzia", randomInt(50-81)];
  }
  if(fishType>=51 && fishType<=65){
    return ["dorsza", randomInt(60-91)];
  }
  if(fishType>=66 && fishType<=75){
    return ["pstrąga", randomInt(80-111)];
  }
  if(fishType>=76 && fishType<=85){
    return ["szczupaka:crown:", randomInt(90-111)];
  }
  if(fishType>=86 && fishType<=95){
    return ["suma", randomInt(110-131)];
  }
  if(fishType>=96 && fishType<=99){
    return ["rekina", randomInt(150-181)];
  }
  if(fishType==100){
    return ["bombardino croccodilo", randomInt(900-1101)];
  }
  if(fishType>100 || fishType<1){
    return ["gówno", 0];
  }
  throw new Error("Zamiast ryby wyłowiłeś śmieci");
};

export const wedka = new Hashira({ name: "wedka" })
  .use(base)
  .command("wedka", (command) =>
    command
      .setDMPermission(false)
      .setDescription("Nielegalny połów ryb")
      .handle(async ({ prisma }, _, itx) => {
        if (!itx.inCachedGuild()) return;

        const [redeemable, nextRedeem] = await checkIfRedeemable(prisma, itx.user.id, itx.guildId)

        if(redeemable){
          const [fish, amount] = calculateFishPrice();

          await addBalance({
            prisma,
            currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            reason: "Łowienie",
            guildId: itx.guildId,
            toUserId: itx.user.id,
            amount: amount,
          });
          
          await prisma.lastFishing.create({
            data: { userId: itx.user.id, guildId: itx.guildId },
          });

          const balance = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

          await itx.reply(`Wyłowiłeś ${fish} wartego ${balance}`);
        }else{
          await itx.reply(`Dalej masz PZW na karku. Następny rybę możesz złowić <t:${nextRedeem}:R>`);
        }
      }),
  );