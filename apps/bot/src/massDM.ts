import { Hashira } from "@hashira/core";
import { RESTJSONErrorCodes, bold, italic } from "discord.js";
import { partition } from "es-toolkit";
import { waitForConfirmation } from "../../../packages/core/src/confirmationDialog";
import { base } from "./base";
import { discordTry } from "./util/discordTry";
import { errorFollowUp } from "./util/errorFollowUp";
import { createPluralize } from "./util/pluralize";
import safeSendCode from "./util/safeSendCode";

const pluralizeUsers = createPluralize({
  1: "użytkownika",
  2: "użytkowników",
});

export const massDM = new Hashira({ name: "massDM" })
  .use(base)
  .group("massdm", (group) =>
    group
      .setDescription("Masowe wysyłanie wiadomości prywatnych")
      .setDMPermission(false)
      .setDefaultMemberPermissions(0)
      .addCommand("wyslij", (command) =>
        command
          .setDescription("Wyślij masową wiadomość do użytkowników z rolą")
          .addRole("rola", (role) =>
            role.setDescription("Rola, której użytkownicy otrzymają wiadomość"),
          )
          .addString("tresc", (content) =>
            content.setDescription("Treść wiadomości").setRequired(true),
          )
          .handle(async ({ strataCzasuLog }, { rola: role, tresc: content }, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const eligibleMembers = role.members;

            if (eligibleMembers.size === 0) {
              await errorFollowUp(itx, "Nie znaleziono użytkowników z podaną rolą.");
              return;
            }

            const confirmation = await waitForConfirmation(
              { send: itx.editReply.bind(itx) },
              `Czy na pewno chcesz wysłać wiadomość do ${bold(
                eligibleMembers.size.toString(),
              )} ${pluralizeUsers(eligibleMembers.size)}?\n\nTreść: ${italic(content)}`,
              "Tak",
              "Nie",
              (action) => action.user.id === itx.user.id,
            );

            if (!confirmation) {
              await itx.editReply({
                content: "Anulowano wysyłanie masowej wiadomości.",
                components: [],
              });
              return;
            }

            const start = new Date();

            strataCzasuLog.push("massdmStart", itx.guild, {
              user: itx.user,
              role,
              content,
              createdAt: new Date(),
            });

            await itx.editReply({
              content: `Rozpoczynam wysyłanie wiadomości do ${bold(eligibleMembers.size.toString())} użytkowników. To może zająć kilka minut...`,
              components: [],
            });

            const messageSendStatuses = await Promise.all(
              eligibleMembers.map(async (member) => {
                return await discordTry(
                  async () => {
                    await member.send({ content: content });

                    return { member, success: true } as const;
                  },
                  [RESTJSONErrorCodes.CannotSendMessagesToThisUser],
                  () => ({ member, success: false }) as const,
                );
              }),
            );

            const [successfulMessages, failedMessages] = partition(
              messageSendStatuses,
              (m) => m.success,
            );

            strataCzasuLog.push("massdmEnd", itx.guild, {
              user: itx.user,
              role,
              successfulMessages: successfulMessages.length,
              failedMessages: failedMessages.length,
              createdAt: start,
              endedAt: new Date(),
            });

            const lines = [
              `Wysłano wiadomości do ${bold(successfulMessages.length.toString())}/${bold(messageSendStatuses.length.toString())} użytkowników.`,
            ];

            if (failedMessages.length > 0) {
              lines.push(
                `Nie udało się wysłać wiadomości do ${bold(failedMessages.length.toString())} użytkowników.`,
              );

              const dmChannel = await itx.user.createDM();

              await dmChannel.send({
                content:
                  "Nie udało się wysłać wiadomości do następujących użytkowników:",
              });

              const failedMessagesReport = failedMessages
                .map(({ member }) => `- ${member.user.tag} (${member.user.id})`)
                .join("\n");

              await safeSendCode(
                dmChannel.send.bind(dmChannel),
                failedMessagesReport,
                "",
              );
            }

            await itx.editReply(lines.join("\n"));
          }),
      ),
  );
