import { Hashira, PaginatedView } from "@hashira/core";
import { base } from "./base";
import { eq, count } from "drizzle-orm";
import { Paginate, schema } from "@hashira/db";
import { PermissionFlagsBits } from "discord.js";

export const autoRole = new Hashira({ name: "auto-role" })
	.use(base)
	.handle("guildMemberAdd", async ({ db }, member) => {
		const autoRoles = await db
			.select({ roleId: schema.autoRole.roleId })
			.from(schema.autoRole)
			.where(eq(schema.autoRole.guildId, member.guild.id));
		await member.roles.add(
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
					.handle(async ({ db }, { role }, itx) => {
						const added = await db
							.insert(schema.autoRole)
							.values({ guildId: role.guild.id, roleId: role.id })
							.onConflictDoNothing()
							.returning();
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
					.handle(async ({ db }, { role }, itx) => {
						const removed = await db
							.delete(schema.autoRole)
							.where(eq(schema.autoRole.roleId, role.id))
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
				command.setDescription("List all autoroles").handle(async ({ db }, _, itx) => {
					if (!itx.guildId) return;

					const paginate = new Paginate({
						select: db
							.select({ roleId: schema.autoRole.roleId })
							.from(schema.autoRole)
							.where(eq(schema.autoRole.guildId, itx.guildId))
							.$dynamic(),
						count: db
							.select({ count: count() })
							.from(schema.autoRole)
							.where(eq(schema.autoRole.guildId, itx.guildId))
							.$dynamic(),
					});
					const paginatedView = new PaginatedView(
						itx,
						paginate,
						(item, idx) => `${idx}. <@&${item.roleId}>`,
					);
					await paginatedView.render();
				}),
			),
	);
