import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, bold, roleMention } from "discord.js";
import { base } from "./base";
import { fetchMembers } from "./util/fetchMembers";
import { modifyMembers } from "./util/modifyMembers";
import { parseUserMentions } from "./util/parseUsers";

type GuildId = string;
type RoleId = string;
type UserId = string;
class RoleCommandsState {
  activeAddTasks: Map<GuildId, Map<RoleId, UserId[]>>;
  activeRemoveTasks: Map<GuildId, Map<RoleId, UserId[]>>;

  constructor() {
    this.activeAddTasks = new Map();
    this.activeRemoveTasks = new Map();
  }

  addAddTask(guildId: GuildId, roleId: RoleId, userIds: UserId[]) {
    const tasks = this.activeAddTasks.get(guildId) ?? new Map<RoleId, UserId[]>();
    tasks.set(roleId, userIds);
    this.activeAddTasks.set(guildId, tasks);
  }

  removeAddTask(guildId: GuildId, roleId: RoleId) {
    const tasks = this.activeAddTasks.get(guildId);
    if (tasks) tasks.delete(roleId);
  }

  getAddTask(guildId: GuildId, roleId: RoleId) {
    return this.activeAddTasks.get(guildId)?.get(roleId) ?? null;
  }

  addRemoveTask(guildId: GuildId, roleId: RoleId, userIds: UserId[]) {
    const tasks = this.activeRemoveTasks.get(guildId) ?? new Map<RoleId, UserId[]>();
    tasks.set(roleId, userIds);
    this.activeRemoveTasks.set(guildId, tasks);
  }

  removeRemoveTask(guildId: GuildId, roleId: RoleId) {
    const tasks = this.activeRemoveTasks.get(guildId);
    if (tasks) tasks.delete(roleId);
  }

  getRemoveTask(guildId: GuildId, roleId: RoleId) {
    return this.activeRemoveTasks.get(guildId)?.get(roleId) ?? null;
  }
}

export const roleCommandsState = new Hashira({ name: "roleCommandsState" }).const(
  "roleCommandsState",
  new RoleCommandsState(),
);

export const roles = new Hashira({ name: "roles" })
  .use(base)
  .use(roleCommandsState)
  .group("rola", (group) =>
    group
      .setDescription("Zarządzaj rolami użytkowników")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .setDMPermission(false)
      .addCommand("dodaj", (command) =>
        command
          .setDescription("Dodaj rolę")
          .addRole("role", (role) => role.setDescription("Rola do dodania"))
          .addString("users", (users) =>
            users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)"),
          )
          .handle(
            async ({ roleCommandsState, memberLog: log }, { role, users }, itx) => {
              if (!itx.inCachedGuild()) return;

              await itx.deferReply({ ephemeral: true });
              const members = await fetchMembers(itx.guild, parseUserMentions(users));
              const toAdd = members.filter((m) => !m.roles.cache.has(role.id));

              try {
                roleCommandsState.addAddTask(
                  itx.guild.id,
                  role.id,
                  toAdd.map((m) => m.id),
                );

                await itx.editReply(
                  `Dodaję rolę ${bold(toAdd.size.toString())} użytkownikom....`,
                );
                const results = await modifyMembers(toAdd, (m) =>
                  m.roles.add(
                    role,
                    `Dodano rolę przez ${itx.user.tag} (${itx.user.id})`,
                  ),
                );
                const added = results.filter((r) => r).length;

                log.push("guildMemberBulkRoleAdd", itx.guild, {
                  moderator: itx.member,
                  role: role,
                  // TODO)) Log only members with successful role addition
                  members: toAdd.map((m) => m),
                });
                await itx.editReply(
                  `Dodano rolę ${roleMention(role.id)} ${bold(
                    added.toString(),
                  )} użytkownikom. ${bold(
                    (members.size - toAdd.size).toString(),
                  )} użytkowników miało już rolę. ${bold(
                    (toAdd.size - added).toString(),
                  )} użytkowników ma za wysokie permisje.`,
                );
              } finally {
                roleCommandsState.removeAddTask(itx.guild.id, role.id);
              }
            },
          ),
      )
      .addCommand("zabierz", (command) =>
        command
          .setDescription("Zabierz rolę")
          .addRole("role", (role) => role.setDescription("Rola do zabrania"))
          .addString("users", (users) =>
            users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)"),
          )
          .handle(
            async ({ roleCommandsState, memberLog: log }, { role, users }, itx) => {
              if (!itx.inCachedGuild()) return;

              await itx.deferReply({ ephemeral: true });
              const members = await fetchMembers(itx.guild, parseUserMentions(users));
              const toRemove = members.filter((m) => m.roles.cache.has(role.id));

              try {
                roleCommandsState.addRemoveTask(
                  itx.guild.id,
                  role.id,
                  toRemove.map((m) => m.id),
                );

                await itx.editReply(
                  `Zabieram rolę ${bold(toRemove.size.toString())} użytkownikom....`,
                );
                const results = await modifyMembers(toRemove, (m) =>
                  m.roles.remove(
                    role,
                    `Usunięto rolę przez ${itx.user.tag} (${itx.user.id})`,
                  ),
                );
                const removed = results.filter((r) => r).length;

                log.push("guildMemberBulkRoleRemove", itx.guild, {
                  moderator: itx.member,
                  role: role,
                  // TODO)) Log only members with successful role removal
                  members: toRemove.map((m) => m),
                });
                await itx.editReply(
                  `Zabrano rolę ${roleMention(role.id)} ${bold(
                    removed.toString(),
                  )} użytkownikom. ${bold(
                    (members.size - toRemove.size).toString(),
                  )} użytkowników nie miało już roli. ${bold(
                    (toRemove.size - removed).toString(),
                  )} użytkowników ma za wysokie permisje.`,
                );
              } finally {
                roleCommandsState.removeRemoveTask(itx.guild.id, role.id);
              }
            },
          ),
      ),
  );
