import { Hashira, waitForConfirmation } from "@hashira/core";
import { nestedTransaction } from "@hashira/db/transaction";
import {
  PermissionFlagsBits,
  bold,
  inlineCode,
  unorderedList,
  userMention,
} from "discord.js";
import { base } from "../base";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { TRANSFER_OPERATIONS, runOperations } from "./transfer";

export const userTransfer = new Hashira({ name: "user-transfer" })
  .use(base)
  .command("przenieś", (command) =>
    command
      .setDescription("Przenieś dane użytkownika")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .setDMPermission(false)
      .addUser("stary-user", (user) =>
        user.setDescription("Użytkownik, którego dane chcesz przenieść"),
      )
      .addUser("nowy-user", (user) =>
        user.setDescription("Użytkownik, do którego chcesz przenieść dane"),
      )
      .handle(
        async ({ prisma }, { "stary-user": oldUser, "nowy-user": newUser }, itx) => {
          if (!itx.inCachedGuild()) return;
          await itx.deferReply();

          const confirmationLines = [
            "Czy na pewno chcesz przenieść dane?",
            `Z ${bold(oldUser.tag)} (${inlineCode(oldUser.id)}) - ${userMention(oldUser.id)}`,
            `DO ${bold(newUser.tag)} (${inlineCode(newUser.id)}) - ${userMention(newUser.id)}`,
            "",
            `Dane, które zostaną przeniesione (${TRANSFER_OPERATIONS.length}):`,
            unorderedList(TRANSFER_OPERATIONS.map((op) => op.name)),
          ];
          const confirmation = await waitForConfirmation(
            { send: itx.editReply.bind(itx) },
            confirmationLines.join("\n"),
            "Tak",
            "Nie",
            (action) => action.user.id === itx.user.id,
          );
          if (!confirmation) {
            await itx.editReply({
              content: "Anulowano przenoszenie danych.",
              components: [],
            });
            return;
          }

          // TODO: Log transfers to the appropriate loggers

          const responses = await prisma.$transaction(
            async (tx) => {
              await ensureUsersExist(nestedTransaction(tx), [oldUser.id, newUser.id]);
              const oldDbUser = await tx.user.findUnique({
                where: { id: oldUser.id },
              });
              const newDbUser = await tx.user.findUnique({
                where: { id: newUser.id },
              });
              if (!oldDbUser || !newDbUser) return [];

              return await runOperations({
                prisma: nestedTransaction(tx),
                oldUser,
                newUser,
                oldDbUser,
                newDbUser,
                guild: itx.guild,
                moderator: itx.user,
              });
            },
            { timeout: 30_000 }, // 30 second timeout just to be safe
          );

          const lines: string[] = [];

          const okResponses = responses.filter((r) => r.type === "ok");
          if (okResponses.length > 0) {
            lines.push(
              "Wykonane operacje:",
              ...okResponses.map((r) => `- ${bold(r.name)}: ${r.message}`),
              "",
            );
          }

          const errorResponses = responses.filter((r) => r.type === "err");
          if (errorResponses.length > 0) {
            lines.push(
              "Operacje z błędem (sprawdź konsolę):",
              ...errorResponses.map((r) => `- ${bold(r.name)}`),
              "",
            );
          }

          const noopResponses = responses.filter((r) => r.type === "noop");
          if (noopResponses.length > 0) {
            lines.push(
              "Pominięte operacje:",
              ...noopResponses.map((r) => `- ${bold(r.name)}`),
            );
          }

          await itx.editReply({
            content: lines.join("\n"),
            components: [],
          });
        },
      ),
  );
