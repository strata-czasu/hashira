import { Hashira } from "@hashira/core";
import { bold, PermissionFlagsBits, roleMention } from "discord.js";
import { base } from "./base";
import { fetchMembers } from "./util/fetchMembers";
import { modifyMembers } from "./util/modifyMembers";
import { parseUserMentions } from "./util/parseUsers";
import { pluralizers } from "./util/pluralize";

export const roles = new Hashira({ name: "roles" }).use(base).group("rola", (group) =>
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
        .handle(async ({ roleLog: log }, { role, users }, itx) => {
          if (!itx.inCachedGuild()) return;

          await itx.deferReply({ flags: "Ephemeral" });
          const members = await fetchMembers(itx.guild, parseUserMentions(users));
          const toAdd = members.filter((m) => !m.roles.cache.has(role.id));

          await itx.editReply(
            `Dodaję rolę ${bold(toAdd.size.toString())} ${pluralizers.dativeUsers(toAdd.size)}...`,
          );
          log.push("guildMemberBulkRoleAdd", itx.guild, {
            moderator: itx.member,
            role: role,
            members: toAdd.map((m) => m),
          });

          const results = await modifyMembers(toAdd, (m) =>
            m.roles.add(role, `Dodano rolę przez ${itx.user.tag} (${itx.user.id})`),
          );
          const added = results.filter((r) => r).length;

          const reply = [
            `Dodano rolę ${roleMention(role.id)} ${bold(added.toString())} ${pluralizers.dativeUsers(added)}.`,
          ];
          const alreadyHadRole = members.size - toAdd.size;
          if (alreadyHadRole) {
            reply.push(
              `${bold(alreadyHadRole.toString())} ${pluralizers.users(alreadyHadRole)} ma już rolę.`,
            );
          }
          const tooHighPerms = toAdd.size - added;
          if (tooHighPerms) {
            reply.push(
              `${bold(tooHighPerms.toString())} ${pluralizers.users(tooHighPerms)} ma za wysokie permisje.`,
            );
          }

          await itx.editReply(reply.join(" "));
        }),
    )
    .addCommand("zabierz", (command) =>
      command
        .setDescription("Zabierz rolę")
        .addRole("role", (role) => role.setDescription("Rola do zabrania"))
        .addString("users", (users) =>
          users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)"),
        )
        .handle(async ({ roleLog: log }, { role, users }, itx) => {
          if (!itx.inCachedGuild()) return;

          await itx.deferReply({ flags: "Ephemeral" });
          const members = await fetchMembers(itx.guild, parseUserMentions(users));
          const toRemove = members.filter((m) => m.roles.cache.has(role.id));

          await itx.editReply(
            `Zabieram rolę ${bold(toRemove.size.toString())} ${pluralizers.dativeUsers(toRemove.size)}...`,
          );
          log.push("guildMemberBulkRoleRemove", itx.guild, {
            moderator: itx.member,
            role: role,
            members: toRemove.map((m) => m),
          });

          const results = await modifyMembers(toRemove, (m) =>
            m.roles.remove(
              role,
              `Usunięto rolę przez ${itx.user.tag} (${itx.user.id})`,
            ),
          );
          const removed = results.filter((r) => r).length;

          const reply = [
            `Zabrano rolę ${roleMention(role.id)} ${bold(removed.toString())} ${pluralizers.dativeUsers(removed)}.`,
          ];
          const alreadyHadRole = members.size - toRemove.size;
          if (alreadyHadRole) {
            reply.push(
              `${bold(alreadyHadRole.toString())} ${pluralizers.users(alreadyHadRole)} nie miało już roli.`,
            );
          }
          const tooHighPerms = toRemove.size - removed;
          if (tooHighPerms) {
            reply.push(
              `${bold(tooHighPerms.toString())} ${pluralizers.users(tooHighPerms)} ma za wysokie permisje.`,
            );
          }

          await itx.editReply(reply.join(" "));
        }),
    ),
);
