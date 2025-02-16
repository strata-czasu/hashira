import { Hashira } from "@hashira/core";
import { nestedTransaction } from "@hashira/db/transaction";
import { PermissionFlagsBits } from "discord.js";
import { base } from "../base";
import { ensureUsersExist } from "../util/ensureUsersExist";
import { TRANSFER_OPERATIONS } from "./transfer";

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

          // TODO: Log transfers to the appropriate loggers

          const responses = await prisma.$transaction(async (tx) => {
            await ensureUsersExist(nestedTransaction(tx), [oldUser.id, newUser.id]);
            const oldDbUser = await tx.user.findUnique({
              where: { id: oldUser.id },
            });
            const newDbUser = await tx.user.findUnique({
              where: { id: newUser.id },
            });
            if (!oldDbUser || !newDbUser) return [];

            return await Promise.all(
              TRANSFER_OPERATIONS.map((op) =>
                op({
                  prisma: nestedTransaction(tx),
                  oldUser,
                  newUser,
                  oldDbUser,
                  newDbUser,
                  guild: itx.guild,
                  moderator: itx.user,
                }),
              ),
            );
          });

          const lines = ["Przeniesiono dane użytkownika:"];
          lines.push(...responses.filter((r) => r !== null).map((r) => `- ${r}`));
          await itx.editReply(lines.join("\n"));
        },
      ),
  );
