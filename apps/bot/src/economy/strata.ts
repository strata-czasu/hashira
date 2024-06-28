import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, inlineCode } from "discord.js";
import { base } from "../base";
import { STRATA_CZASU_CURRENCY } from "../specializedConstants";
import { errorFollowUp } from "../util/errorFollowUp";
import { fetchMembers } from "../util/fetchMembers";
import { parseUserMentions } from "../util/parseUsers";
import { addBalances, getDefaultWallet, transferBalances } from "./util";

const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance}${currencySymbol}`);

export const strataEconomy = new Hashira({ name: "strata-economy" })
  .use(base)
  .group("punkty", (group) =>
    group
      .setDescription("Komendy do punktów")
      .addCommand("sprawdz", (command) =>
        command
          .setDescription("Sprawdź swoje punkty")
          .addUser("użytkownik", (option) =>
            option
              .setDescription("Użytkownik, którego punkty chcesz sprawdzić")
              .setRequired(false),
          )
          .handle(async ({ db }, { użytkownik: user }, itx) => {
            if (!itx.inCachedGuild()) return;

            const userId = user?.id ?? itx.user.id;

            const wallet = await getDefaultWallet({
              db,
              userId,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            });

            const self = itx.user.id === userId;
            const balance = formatBalance(wallet.balance, STRATA_CZASU_CURRENCY.symbol);
            if (self) {
              await itx.reply(`Masz ${balance}`);
            } else {
              await itx.reply(`Użytkownik ${user} ma ${balance}`);
            }
          }),
      )
      .addCommand("dodaj", (command) =>
        command
          .setDescription("[KADRA] Dodaj punkty użytkownikowi")
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość punktów do dodania"),
          )
          .addString("użytkownicy", (option) =>
            option.setDescription("Użytkownicy, którym chcesz dodać punkty"),
          )
          .handle(async ({ db }, { ilość: amount, użytkownicy: rawMembers }, itx) => {
            if (!itx.inCachedGuild()) return;
            // Check if the user has moderate members permission
            if (!itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
              return await errorFollowUp(
                itx,
                "Nie masz uprawnień do dodawania punktów",
              );
            }

            const members = await fetchMembers(
              itx.guild,
              parseUserMentions(rawMembers),
            );

            await addBalances({
              db,
              fromUserId: itx.user.id,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              toUserIds: [...members.keys()],
              amount,
            });

            const amountFormatted = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply(`Dodano ${amountFormatted} ${members.size} użytkownikom`);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż punkty użytkownikowi")
          .addString("użytkownicy", (option) =>
            option.setDescription("Użytkownicy, którym chcesz przekazać punkty"),
          )
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość punktów do przekazania"),
          )
          .handle(async ({ db }, { użytkownicy: rawMembers, ilość: amount }, itx) => {
            if (!itx.inCachedGuild()) return;

            const members = await fetchMembers(
              itx.guild,
              parseUserMentions(rawMembers),
            );

            await transferBalances({
              db,
              fromUserId: itx.user.id,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              toUserIds: [...members.keys()],
              amount,
            });

            const amountFormatted = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply(
              `Przekazano ${amountFormatted} dla każdego z ${members.size} użytkownikowów.`,
            );
          }),
      ),
  );
