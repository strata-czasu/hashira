import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { PermissionFlagsBits, inlineCode } from "discord.js";
import { base } from "../base";
import { GUILD_IDS, STRATA_CZASU_CURRENCY, USER_IDS } from "../specializedConstants";
import { errorFollowUp } from "../util/errorFollowUp";
import { fetchMembers } from "../util/fetchMembers";
import { parseUserMentions } from "../util/parseUsers";
import { addBalance, getDefaultWallet, transferBalance } from "./util";

const formatBalance = (balance: number, currencySymbol: string) =>
  inlineCode(`${balance}${currencySymbol}`);

export const strataEconomy = new Hashira({ name: "strata-economy" })
  .use(base)
  .handle("ready", async ({ db }) => {
    await db
      .insert(schema.currency)
      .values({
        guildId: GUILD_IDS.StrataCzasu,
        name: STRATA_CZASU_CURRENCY.name,
        symbol: STRATA_CZASU_CURRENCY.symbol,
        createdBy: USER_IDS.Defous,
      })
      .onConflictDoNothing();
  })
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

            const wallet = await getDefaultWallet(
              db,
              userId,
              itx.guildId,
              STRATA_CZASU_CURRENCY.symbol,
            );
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

            await Promise.all(
              members.map(async (member) => {
                // TODO: Error handling instead of crashing the command
                await addBalance({
                  db,
                  fromUserId: itx.user.id,
                  toUserId: member.id,
                  guildId: itx.guildId,
                  currencySymbol: STRATA_CZASU_CURRENCY.symbol,
                  amount,
                });
              }),
            );

            const amountFormatted = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply(`Dodano ${amountFormatted} ${members.size} użytkownikom`);
          }),
      )
      .addCommand("przekaz", (command) =>
        command
          .setDescription("Przekaż punkty użytkownikowi")
          .addUser("użytkownik", (option) =>
            option.setDescription("Użytkownik, któremu chcesz przekazać punkty"),
          )
          .addInteger("ilość", (option) =>
            option.setDescription("Ilość punktów do przekazania"),
          )
          .handle(async ({ db }, { użytkownik: user, ilość: amount }, itx) => {
            if (!itx.inCachedGuild()) return;

            // TODO: Error handling instead of crashing the command
            await transferBalance({
              db,
              fromUserId: itx.user.id,
              toUserId: user.id,
              guildId: itx.guildId,
              currencySymbol: STRATA_CZASU_CURRENCY.symbol,
              amount,
            });

            const amountFormatted = formatBalance(amount, STRATA_CZASU_CURRENCY.symbol);

            await itx.reply(`Przekazano ${amountFormatted} użytkownikowi ${user}`);
          }),
      ),
  );
