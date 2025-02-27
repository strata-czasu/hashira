import { Hashira, PaginatedView } from "@hashira/core";
import { DatabasePaginator } from "@hashira/db";
import { PermissionFlagsBits } from "discord.js";
import { base } from "./base";

export const autoRole = new Hashira({ name: "auto-role" })
  .use(base)
  .handle("guildMemberAdd", async ({ prisma }, member) => {
    const autoRoles = await prisma.autoRole.findMany({
      where: { guildId: member.guild.id },
    });

    const rolePromises = autoRoles.map(({ roleId }) =>
      member.roles.add(roleId, "Auto role on join"),
    );

    await Promise.all(rolePromises);
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
                flags: "Ephemeral",
              });
            } else {
              await itx.reply({
                content: `Added ${role.name} to autorole list`,
                flags: "Ephemeral",
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
            const removed = await prisma.autoRole.deleteMany({
              where: { roleId: role.id },
            });
            if (removed.count === 0) {
              await itx.reply({
                content: `${role.name} is not in the autorole list`,
                flags: "Ephemeral",
              });
            } else {
              await itx.reply({
                content: `Removed ${role.name} from autorole list`,
                flags: "Ephemeral",
              });
            }
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("List all autoroles")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.guildId) return;
            const where = { guildId: itx.guildId };

            const paginate = new DatabasePaginator(
              (props, roleId) =>
                prisma.autoRole.findMany({ ...props, where, orderBy: { roleId } }),
              () => prisma.autoRole.count({ where }),
            );

            const paginatedView = new PaginatedView(
              paginate,
              "Auto roles",
              (item, idx) => `${idx}. <@&${item.roleId}>`,
            );
            await paginatedView.render(itx);
          }),
      ),
  );
