import { Hashira } from "@hashira/core";
import { schema } from "@hashira/db";
import { eq } from "@hashira/db/drizzle";
import { PermissionFlagsBits, roleMention } from "discord.js";
import { base } from "./base";

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
          .handle(async ({ db }, { role }, itx) => {
            if (!itx.inCachedGuild()) return;

            await db
              .update(schema.guildSettings)
              .set({ muteRoleId: role.id })
              .where(eq(schema.guildSettings.guildId, itx.guildId));
            // TODO: Update the role on currently muted users
            await itx.reply({
              content: `Rola do wyciszeń została ustawiona na ${roleMention(role.id)}`,
              ephemeral: true,
            });
          }),
      )
      .addCommand("list", (command) =>
        command
          .setDescription("Wyświetl ustawienia serwera")
          .handle(async ({ db }, _, itx) => {
            if (!itx.inCachedGuild()) return;

            const settings = await db.query.guildSettings.findFirst({
              where: eq(schema.guildSettings.guildId, itx.guildId),
            });
            if (!settings) throw new Error("Guild settings not found");

            await itx.reply({
              content: `Rola do wyciszeń: ${
                settings.muteRoleId ? roleMention(settings.muteRoleId) : "Nie ustawiono"
              }`,
              ephemeral: true,
            });
          }),
      ),
  );
