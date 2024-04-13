import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, bold, roleMention } from "discord.js";
import { fetchMembers } from "./util/fetchMembers";
import { modifyMembers } from "./util/modifyMembers";
import { parseUserMentions } from "./util/parseUsers";

export const roles = new Hashira({ name: "roles" }).group("rola", (group) =>
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
        .handle(async (_, { role, users }, itx) => {
          if (!itx.inCachedGuild()) return;

          await itx.deferReply({ ephemeral: true });
          const members = await fetchMembers(itx.guild, parseUserMentions(users));
          const toAdd = members.filter((m) => !m.roles.cache.has(role.id));

          await itx.editReply(
            `Dodaję rolę ${bold(toAdd.size.toString())} użytkownikom....`,
          );
          const results = await modifyMembers(toAdd, (m) =>
            m.roles.add(role, `Dodano rolę przez ${itx.user.tag} (${itx.user.id})`),
          );
          const added = results.filter((r) => r).length;

          await itx.editReply(
            `Dodano rolę ${roleMention(role.id)} ${bold(
              added.toString(),
            )} użytkownikom. ${bold(
              (members.size - toAdd.size).toString(),
            )} użytkowników miało już rolę. ${bold(
              (toAdd.size - added).toString(),
            )} użytkowników ma za wysokie permisje.`,
          );
        }),
    )
    .addCommand("zabierz", (command) =>
      command
        .setDescription("Zabierz rolę")
        .addRole("role", (role) => role.setDescription("Rola do zabrania"))
        .addString("users", (users) =>
          users.setDescription("Użytkownicy do dodania roli (oddzielone spacjami)"),
        )
        .handle(async (_, { role, users }, itx) => {
          if (!itx.inCachedGuild()) return;

          await itx.deferReply({ ephemeral: true });
          const members = await fetchMembers(itx.guild, parseUserMentions(users));
          const toRemove = members.filter((m) => m.roles.cache.has(role.id));

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

          await itx.editReply(
            `Zabrano rolę ${roleMention(role.id)} ${bold(
              removed.toString(),
            )} użytkownikom. ${bold(
              (members.size - toRemove.size).toString(),
            )} użytkowników nie miało już roli. ${bold(
              (toRemove.size - removed).toString(),
            )} użytkowników ma za wysokie permisje.`,
          );
        }),
    ),
);
