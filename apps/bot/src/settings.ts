import { Hashira } from "@hashira/core";
import { PermissionFlagsBits, roleMention } from "discord.js";
import { base } from "./base";

const formatRoleSetting = (name: string, roleId: string | null) =>
  `${name}: ${roleId ? roleMention(roleId) : "Nie ustawiono"}`;

export const settings = new Hashira({ name: "settings" })
  .use(base)
  .group("settings", (group) =>
    group
      .setDescription("Zarządzaj ustawieniami serwera")
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addCommand("mute-role", (command) =>
        command
          .setDescription("Ustaw rolę do wyciszeń")
          .addRole("role", (role) =>
            role.setDescription("Rola, która ma być nadawana wyciszonym użytkownikom"),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { muteRoleId: role.id },
            });

            // TODO: Update the role on currently muted users
            await itx.reply({
              content: `Rola do wyciszeń została ustawiona na ${roleMention(role.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("18-plus-role", (command) =>
        command
          .setDescription("Ustaw rolę 18+")
          .addRole("role", (role) =>
            role.setDescription("Rola, która ma być nadawana po weryfikacji 18+"),
          )
          .handle(async ({ prisma }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await prisma.guildSettings.update({
              where: { guildId: itx.guildId },
              data: { plus18RoleId: role.id },
            });

            await itx.reply({
              content: `Rola 18+ została ustawiona na ${roleMention(role.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("Wyświetl ustawienia serwera")
          .handle(async ({ prisma }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const settings = await prisma.guildSettings.findFirst({
              where: { guildId: itx.guildId },
            });

            if (!settings) throw new Error("Guild settings not found");

            await itx.reply({
              content: `${formatRoleSetting(
                "Rola do wyciszeń",
                settings.muteRoleId,
              )}\n${formatRoleSetting("Rola 18+", settings.plus18RoleId)}`,
              ephemeral: true,
            });
          }),
      ),
  );
