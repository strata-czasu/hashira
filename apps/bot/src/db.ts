import { Hashira } from "@hashira/core";
import { VerificationStatus, prisma } from "@hashira/db";
import { MessageQueue } from "@hashira/db/tasks";
import type { Duration } from "date-fns";
import { type Client, RESTJSONErrorCodes, inlineCode, userMention } from "discord.js";
import { formatBanReason, sendVerificationFailedMessage } from "./moderation/util";
import { discordTry } from "./util/discordTry";
import { formatDuration } from "./util/duration";
import { sendDirectMessage } from "./util/sendDirectMessage";

// TODO: how to enable migrations of this data?
type MuteEndData = {
  muteId: number;
  guildId: string;
  userId: string;
};

// TODO: how to enable migrations of this data?
type VerificationEndData = {
  verificationId: number;
};

// TODO: how to enable migrations of this data?
type VerificationReminderData = {
  verificationId: number;
  elapsed: Duration;
  remaining: Duration;
};

export const database = new Hashira({ name: "database" })
  .const("prisma", prisma)
  .const((ctx) => {
    const prisma = ctx.prisma;
    return {
      ...ctx,
      messageQueue: new MessageQueue(ctx.prisma)
        .addArg<"client", Client>()
        .addHandler(
          "muteEnd",
          async ({ client }, { muteId, guildId, userId }: MuteEndData) => {
            // Don't remove the mute role if the user has a verification in progress
            const verificationInProgress = await prisma.verification.findFirst({
              where: { userId, guildId, status: VerificationStatus.in_progress },
            });

            if (verificationInProgress) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId },
            });

            if (!settings || !settings.muteRoleId) return;
            const muteRoleId = settings.muteRoleId;

            const guild = await discordTry(
              async () => client.guilds.fetch(guildId),
              [RESTJSONErrorCodes.UnknownGuild],
              async () => null,
            );
            if (!guild) return;

            const member = await discordTry(
              async () => guild.members.fetch(userId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );
            if (!member) return;

            await discordTry(
              async () => {
                await member.roles.remove(muteRoleId, `Koniec wyciszenia [${muteId}]`);
              },
              [RESTJSONErrorCodes.MissingPermissions],
              async () => {
                console.warn(
                  `Missing permissions to remove mute role ${settings.muteRoleId} from member ${userId} on guild ${guildId}`,
                );
              },
            );

            // NOTE: We could mention the user on the server if sending the DM fails
            await sendDirectMessage(
              member.user,
              `To znowu ja ${userMention(
                member.id,
              )}. Dostałem informację, że Twoje wyciszenie dobiegło końca. Do zobaczenia na czatach!`,
            );
          },
        )
        .addHandler(
          "verificationEnd",
          async ({ client }, { verificationId }: VerificationEndData) => {
            const verification = await prisma.verification.findFirst({
              where: { id: verificationId },
            });
            if (!verification) return;

            const moderator = await discordTry(
              async () => client.users.fetch(verification.moderatorId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );
            if (!moderator) return;

            // Automatically reject the verification and ban the user
            const rejectedAt = new Date();

            await prisma.verification.update({
              where: { id: verificationId },
              data: { status: VerificationStatus.rejected, rejectedAt },
            });

            const user = await client.users.fetch(verification.userId);
            const guild = await client.guilds.fetch(verification.guildId);
            const sentMessage = await sendVerificationFailedMessage(user);
            const banned = await discordTry(
              async () => {
                const reason = formatBanReason(
                  `Nieudana weryfikacja 16+ [${verificationId}]`,
                  moderator,
                  rejectedAt,
                );
                await guild.bans.create(user, { reason });
                return true;
              },
              [RESTJSONErrorCodes.MissingPermissions],
              () => false,
            );

            // Notify the moderator about the verification end
            let directMessageContent = `Weryfikacja 16+ ${userMention(verification.userId)} (${inlineCode(
              verification.userId,
            )}) [${inlineCode(verificationId.toString())}] dobiegła końca.`;
            if (banned) {
              directMessageContent += " Użytkownik został zbanowany.";
            } else {
              directMessageContent +=
                " Nie udało się zbanować użytkownika. Sprawdź permisje i zbanuj go ręcznie.";
            }
            if (!sentMessage) {
              directMessageContent +=
                " Nie udało się powiadomić użytkownika o nieudanej weryfikacji.";
            }
            await sendDirectMessage(moderator, directMessageContent);
          },
        )
        .addHandler(
          "verificationReminder",
          async (
            { client },
            { verificationId, elapsed, remaining }: VerificationReminderData,
          ) => {
            const verification = await prisma.verification.findFirst({
              where: { id: verificationId, status: VerificationStatus.in_progress },
            });

            if (!verification) return;

            const moderator = await discordTry(
              async () => client.users.fetch(verification.moderatorId),
              [RESTJSONErrorCodes.UnknownMember],
              async () => null,
            );
            if (!moderator) return;

            await sendDirectMessage(
              moderator,
              `Weryfikacja 16+ ${userMention(verification.userId)} (${inlineCode(
                verification.userId,
              )}) [${inlineCode(verificationId.toString())}] trwa już ${formatDuration(
                elapsed,
              )}. Pozostało ${formatDuration(remaining)}. Nie zapomnij o niej!`,
            );
          },
        ),
    };
  });
