import { Hashira } from "@hashira/core";
import { formatDate } from "date-fns";
import {
  DiscordAPIError,
  PermissionFlagsBits,
  RESTJSONErrorCodes,
  User,
} from "discord.js";

const formatBanReason = (reason: string, moderator: User, createdAt: Date) =>
  `${reason} (banujący: ${moderator.tag} (${moderator.id}), \
data: ${formatDate(createdAt, "yyyy-MM-dd HH:mm:ss")})`;

const formatUserWithId = (user: User) => `**${user.tag}** (\`${user.id}\`)`;

enum BanDeleteInterval {
  None = 0,
  OneHour = 1,
  SixHours = 6,
  TwelveHours = 12,
  OneDay = 24,
  ThreeDays = 24 * 3,
  SevenDays = 24 * 7,
}

const getBanDeleteSeconds = (deleteInterval: BanDeleteInterval) => {
  return deleteInterval * 3600;
};

export const moderation = new Hashira({ name: "moderation" })
  .newCommand("ban", (command) =>
    command
      .setDescription("Zbanuj użytkownika")
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .addString("reason", (reason) => reason.setDescription("Powód bana"))
      .addNumber("delete-interval", (deleteInterval) =>
        deleteInterval
          .setDescription("Przedział czasowy usuwania wiadomości")
          .setRequired(false)
          .addChoices(
            { name: "Brak", value: BanDeleteInterval.None },
            { name: "1 godzina", value: BanDeleteInterval.OneHour },
            { name: "6 godzin", value: BanDeleteInterval.SixHours },
            { name: "12 godzin", value: BanDeleteInterval.TwelveHours },
            { name: "1 dzień", value: BanDeleteInterval.OneDay },
            { name: "3 dni", value: BanDeleteInterval.ThreeDays },
            { name: "7 dni", value: BanDeleteInterval.SevenDays },
          ),
      )
      .handle(async (_, { user, reason, "delete-interval": deleteInterval }, itx) => {
        // TODO: Don't allow in DMs
        if (!itx.inCachedGuild()) return;
        // TODO: Use default permissions on the slash command
        if (!itx.memberPermissions.has(PermissionFlagsBits.BanMembers)) return;

        const banReason = formatBanReason(reason, itx.user, itx.createdAt);
        if (!deleteInterval) {
          await itx.guild.members.ban(user, { reason: banReason });
        } else {
          await itx.guild.members.ban(user, {
            reason: banReason,
            deleteMessageSeconds: getBanDeleteSeconds(deleteInterval),
          });
        }

        const message = `Zbanowano ${formatUserWithId(user)}. Powód: *${reason}*`;
        await itx.reply(message);
      }),
  )
  .newCommand("unban", (command) =>
    command
      .setDescription("Odbanuj użytkownika")
      .addUser("user", (user) => user.setDescription("Użytkownik").setRequired(true))
      .addString("reason", (reason) =>
        reason.setDescription("Powód zdjęcia bana").setRequired(false),
      )
      .handle(async (_, { user, reason }, itx) => {
        // TODO: Don't allow in DMs
        if (!itx.inCachedGuild()) return;
        // TODO: Use default permissions on the slash command
        if (!itx.memberPermissions?.has(PermissionFlagsBits.BanMembers)) return;

        try {
          await itx.guild.members.unban(user, reason ?? undefined);
        } catch (e) {
          if (
            e instanceof DiscordAPIError &&
            e.code === RESTJSONErrorCodes.UnknownBan
          ) {
            await itx.reply({
              content: `Użytkownik ${formatUserWithId(user)} nie ma bana.`,
              ephemeral: true,
            });
            return;
          }
          throw e;
        }

        const message = reason
          ? `Odbanowano ${formatUserWithId(user)}. Powód: *${reason}*`
          : `Odbanowano ${formatUserWithId(user)}`;
        await itx.reply(message);
      }),
  );
