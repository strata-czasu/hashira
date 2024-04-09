import { Hashira } from "@hashira/core";
import { formatDate } from "date-fns";
import { DiscordAPIError, PermissionFlagsBits, User } from "discord.js";

const formatBanReason = (reason: string, moderator: User, createdAt: Date) =>
  `${reason} (banujący: ${moderator.tag} (${moderator.id}), \
data: ${formatDate(createdAt, "yyyy-MM-dd HH:mm:ss")})`;

const formatUserWithId = (user: User) => `**${user.tag}** (\`${user.id}\`)`;

export const moderation = new Hashira({ name: "moderation" })
  .newCommand("ban", (command) =>
    command
      .setDescription("Zbanuj użytkownika")
      .addUser("user", (user) => user.setDescription("Użytkownik"))
      .addString("reason", (reason) => reason.setDescription("Powód bana"))
      // TODO: Add dynamic delete time ranges
      //       https://discord.js.org/docs/packages/discord.js/main/BanOptions:Interface#deleteMessageDays
      .handle(async (_, { user, reason }, itx) => {
        // TODO: Don't allow in DMs
        if (!itx.guild || !itx.member) return;
        // TODO: Use default permissions on the slash command
        if (!itx.memberPermissions?.has(PermissionFlagsBits.BanMembers)) return;

        const banReason = formatBanReason(reason, itx.user, itx.createdAt);
        await itx.guild.members.ban(user, { reason: banReason });

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
        if (!itx.guild || !itx.member) return;
        // TODO: Use default permissions on the slash command
        if (!itx.memberPermissions?.has(PermissionFlagsBits.BanMembers)) return;

        try {
          await itx.guild.members.unban(user, reason ?? undefined);
        } catch (e) {
          // "Unknown Ban"
          if (e instanceof DiscordAPIError && e.code === 10026) {
            await itx.reply({
              content: `Użytkownik ${formatUserWithId(user)} nie ma bana.`,
              ephemeral: true,
            });
            return;
          }
        }

        const message = reason
          ? `Odbanowano ${formatUserWithId(user)}. Powód: *${reason}*`
          : `Odbanowano ${formatUserWithId(user)}`;
        await itx.reply(message);
      }),
  );
