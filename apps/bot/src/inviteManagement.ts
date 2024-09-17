import { ConfirmationDialog, Hashira } from "@hashira/core";
import { differenceInWeeks } from "date-fns";
import {
  AttachmentBuilder,
  type Collection,
  type Invite,
  PermissionFlagsBits,
} from "discord.js";
import { base } from "./base";

const invitesToAttachment = (invites: Collection<string, Invite>) =>
  new AttachmentBuilder(
    Buffer.from(
      invites.map((invite) => `${invite.inviterId},${invite.code}`).join("\n"),
    ),
    {
      name: "invites.csv",
    },
  );

export const inviteManagement = new Hashira({ name: "invite-management" })
  .use(base)
  .group("invites", (group) =>
    group
      .setDescription("Manage invites")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("cleanup", (command) =>
        command
          .setDescription("Remove unused invites older than 2 weeks")
          .handle(async ({ prisma }, __, itx) => {
            if (!itx.inCachedGuild()) return;
            await itx.deferReply();

            const invites = await itx.guild.invites.fetch();
            const now = Date.now();

            const protectedInvites = await prisma.protectedInvite.findMany({
              where: { guildId: itx.guildId },
            });

            const protectedInviteCodes = protectedInvites.map((invite) => invite.code);

            const excludedInvites = invites.filter(
              (invite) => !protectedInviteCodes.includes(invite.code),
            );

            const invitesWithoutMetadata = excludedInvites.filter(
              (invite) => !invite.createdAt,
            );

            if (invitesWithoutMetadata.size > 0) {
              await itx.editReply(
                `Found ${invitesWithoutMetadata.size} invites without metadata. Sending them for manual inspection.`,
              );

              await itx.editReply({
                files: [invitesToAttachment(invitesWithoutMetadata)],
              });
            }

            const oldInvitesToRemove = excludedInvites.filter(
              (invite) =>
                // biome-ignore lint/style/noNonNullAssertion: We ensure createdAt is set above
                differenceInWeeks(now, invite.createdAt!) > 2 && invite.uses === 0,
            );

            await itx.editReply({ files: [invitesToAttachment(oldInvitesToRemove)] });

            const dialog = new ConfirmationDialog(
              "Do you want to delete these invites?",
              "Yes",
              "No",
              async () => {
                await Promise.all(
                  oldInvitesToRemove.map((invite) =>
                    itx.guild.invites
                      .delete(invite.code, `Cleanup by ${itx.user.id}`)
                      .then((inv) => itx.channel?.send(`Deleted invite ${inv.code}`)),
                  ),
                );
              },
              () => Promise.resolve(),
              (buttonItx) => buttonItx.user.id === itx.user.id,
            );

            await dialog.render(itx);
          }),
      ),
  );
