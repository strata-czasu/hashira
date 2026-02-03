import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, RESTJSONErrorCodes, userMention } from "discord.js";
import { base } from "../base";
import { discordTry } from "../util/discordTry";
import { errorFollowUp } from "../util/errorFollowUp";

const BADGE_NAME = "100 poziom";
const ROLE_ID = "412358723802234881";

export const badgeRole = new Hashira({ name: "badgeRole" })
  .use(base)
  .command("poziom100", (command) =>
    command
      .setDescription("Odzyskaj rolę za odznakę 100 poziom")
      .setDMPermission(false)
      .addUser("user", (user) =>
        user
          .setDescription("Użytkownik któremu chcesz przypisać rolę")
          .setRequired(false),
      )
      .handle(async ({ prisma }, { user: targetUser }, itx) => {
        if (!itx.inCachedGuild()) return;
        await itx.deferReply();

        // Determine who we're checking - the target user or the command executor
        const userToCheck = targetUser ?? itx.user;
        const isCheckingOther = targetUser !== undefined;

        // If checking another user, verify the executor has ModerateMembers permission
        if (isCheckingOther) {
          if (!itx.memberPermissions.has(PermissionFlagsBits.ModerateMembers)) {
            return await errorFollowUp(
              itx,
              "Nie możesz wykonać tej komendy na kimś innym bez uprawnień moderatora!",
            );
          }
        }

        // Find the badge item by name
        const badgeItem = await prisma.item.findFirst({
          where: {
            name: BADGE_NAME,
            guildId: itx.guildId,
            deletedAt: null,
          },
        });

        if (!badgeItem) {
          return await errorFollowUp(
            itx,
            `Nie znaleziono odznaki "${BADGE_NAME}" na tym serwerze.`,
          );
        }

        // Check if the user has the badge in their inventory
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            itemId: badgeItem.id,
            userId: userToCheck.id,
            deletedAt: null,
          },
        });

        if (!inventoryItem) {
          const message = isCheckingOther
            ? `Użytkownik ${userMention(userToCheck.id)} nie posiada odznaki "${BADGE_NAME}".`
            : `Nie posiadasz odznaki "${BADGE_NAME}".`;
          return await errorFollowUp(itx, message);
        }

        // User has the badge, try to give them the role
        const member = await discordTry(
          async () => itx.guild.members.fetch(userToCheck.id),
          [RESTJSONErrorCodes.UnknownMember],
          () => null,
        );

        if (!member) {
          return await errorFollowUp(
            itx,
            `Nie można znaleźć użytkownika ${userMention(userToCheck.id)} na serwerze.`,
          );
        }

        // Check if member already has the role
        if (member.roles.cache.has(ROLE_ID)) {
          const message = isCheckingOther
            ? `Użytkownik ${userMention(userToCheck.id)} już posiada tę rolę.`
            : "Już posiadasz tę rolę.";
          return await itx.editReply(message);
        }

        // Add the role
        const roleAddResult = await discordTry(
          async () => member.roles.add(ROLE_ID, "Odznaka 100 poziom"),
          [],
          () => null,
        );

        if (!roleAddResult) {
          return await errorFollowUp(
            itx,
            "Nie udało się przypisać roli. Sprawdź, czy bot ma odpowiednie uprawnienia.",
          );
        }

        const message = isCheckingOther
          ? `Przypisano rolę użytkownikowi ${userMention(userToCheck.id)} za posiadanie odznaki "${BADGE_NAME}".`
          : `Przypisano ci rolę za posiadanie odznaki "${BADGE_NAME}"!`;
        await itx.editReply(message);
      }),
  );
