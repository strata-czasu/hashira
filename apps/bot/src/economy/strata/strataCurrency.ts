import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, inlineCode } from "discord.js";
import { base } from "../../base";
import { STRATA_CZASU_CURRENCY } from "../../specializedConstants";
import { ensureUserExists, ensureUsersExist } from "../../util/ensureUsersExist";
import { errorFollowUp } from "../../util/errorFollowUp";
import { fetchMembers } from "../../util/fetchMembers";
import { parseUserMentions } from "../../util/parseUsers";
import { createPluralize } from "../../util/pluralize";
import { EconomyError } from "../economyError";
import { addBalances, transferBalances } from "../managers/transferManager";
import { getDefaultWallet } from "../managers/walletManager";

const pluralizeUsers = createPluralize({
  // FIXME: Keys should be sorted automatically
  2: "użytkownikom",
  1: "użytkownikowi",
});

export const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance}${currencySymbol}`);

export const strataCurrency = new Hashira({ name: "strata-currency" })
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

            await ensureUserExists(db, userId);

            const wallet = await getDefaultWallet({
              db,
              userId,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
            });

            const self = itx.user.id === userId;
            const balance = formatBalance(wallet.balance, STRATA_CZASU_CURRENCY.symbol);
            if (self) {
              await itx.reply(`Masz na swoim koncie: ${balance}`);
            } else {
              await itx.reply(`Użytkownik ${user} ma na swoim koncie: ${balance}`);
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
          .addString("powód", (option) =>
            option.setDescription("Powód dodania punktów").setRequired(false),
          )
          .handle(
            async (
              { db },
              { ilość: amount, użytkownicy: rawMembers, powód: reason },
              itx,
            ) => {
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

              await ensureUsersExist(db, [...members.keys(), itx.user.id]);

              try {
                await addBalances({
                  db,
                  fromUserId: itx.user.id,
                  guildId: itx.guildId,
                  currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                  toUserIds: [...members.keys()],
                  amount,
                  reason,
                });
              } catch (error) {
                if (error instanceof EconomyError) {
                  return await errorFollowUp(itx, error.message);
                }
                throw error;
              }

              const amountFormatted = formatBalance(
                amount,
                STRATA_CZASU_CURRENCY.symbol,
              );

              await itx.reply(
                `Dodano ${amountFormatted} ${members.size} ${pluralizeUsers(members.size)}.`,
              );
            },
          ),
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
          .addString("powód", (option) =>
            option.setDescription("Powód przekazania punktów").setRequired(false),
          )
          .handle(
            async (
              { db },
              { użytkownicy: rawMembers, ilość: amount, powód: reason },
              itx,
            ) => {
              if (!itx.inCachedGuild()) return;

              const members = await fetchMembers(
                itx.guild,
                parseUserMentions(rawMembers),
              );

              await ensureUsersExist(db, [...members.keys(), itx.user.id]);

              try {
                await transferBalances({
                  db,
                  fromUserId: itx.user.id,
                  guildId: itx.guildId,
                  currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                  toUserIds: [...members.keys()],
                  amount,
                  reason,
                });
              } catch (error) {
                if (error instanceof EconomyError) {
                  return await errorFollowUp(itx, error.message);
                }
                throw error;
              }

              const amountFormatted = formatBalance(
                amount,
                STRATA_CZASU_CURRENCY.symbol,
              );

              await itx.reply(
                `Przekazano ${amountFormatted} ${members.size} ${pluralizeUsers(members.size)}.`,
              );
            },
          ),
      ),
  );
