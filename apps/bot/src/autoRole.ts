import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator, schema } from "@hashira/db";
import { count, eq } from "@hashira/db/drizzle";
import { PaginatorOrder } from "@hashira/paginate";
import { PermissionFlagsBits } from "discord.js";
import { base } from "./base";

export const autoRole = new Hashira({ name: "auto-role" })
  .use(base)
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const autoRoles = await prisma.autoRole.findMany({
      where: { guildId: member.guild.id },
    });

    // TODO: This is a workaround for a race condition where multiple bots try to add roles to a member
    await Bun.sleep(1000);
    const updatedMember = await member.fetch(true);
    await updatedMember.roles.add(
      autoRoles.map(({ roleId }) => roleId),
      "Auto role on join",
    );
  })
  .group("autorole", (group) =>
    group
      .setDescription("Manage autoroles")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .setDMPermission(false)
      .addCommand("add", (command) =>
        command
          .setDescription("Add an autorole")
          .addRole("role", (role) =>
            role
              .setDescription("Role that will be added to new users")
              .setRequired(true),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            const added = await prisma.autoRole.createManyAndReturn({
              data: { guildId: role.guild.id, roleId: role.id },
              skipDuplicates: true,
            });

            if (added.length === 0) {
              await itx.reply({
                content: `${role.name} is already in the autorole list`,
                ephemeral: true,
              });
            } else {
              await itx.reply({
                content: `Added ${role.name} to autorole list`,
                ephemeral: true,
              });
            }
          }),
      )
      .addCommand("remove", (command) =>
        command
          .setDescription("Remove a role from the autorole list")
          .addRole("role", (role) =>
            role.setDescription("Role to remove from autorole list").setRequired(true),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            const removed = await prisma.$drizzle
              .delete(schema.AutoRole)
              .where(eq(schema.AutoRole.roleId, role.id))
              .returning();
            if (removed.length === 0) {
              await itx.reply({
                content: `${role.name} is not in the autorole list`,
                ephemeral: true,
              });
            } else {
              await itx.reply({
                content: `Removed ${role.name} from autorole list`,
                ephemeral: true,
              });
            }
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("List all autoroles")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.guildId) return;

            const paginate = new DatabasePaginator({
              orderBy: schema.AutoRole.roleId,
              ordering: PaginatorOrder.ASC,
              select: prisma.$drizzle
                .select({ roleId: schema.AutoRole.roleId })
                .from(schema.AutoRole)
                .where(eq(schema.AutoRole.guildId, itx.guildId))
                .$dynamic(),
              count: prisma.$drizzle
                .select({ count: count() })
                .from(schema.AutoRole)
                .where(eq(schema.AutoRole.guildId, itx.guildId))
                .$dynamic(),
            });
            const paginatedView = new PaginatedView(
              paginate,
              "Auto roles",
              (item, idx) => `${idx}. <@&${item.roleId}>`,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
