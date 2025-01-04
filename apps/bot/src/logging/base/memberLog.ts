import { Hashira } from "@hashira/core";
import { type GuildMember, type Role, roleMention } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type GuildMemberAddData = { member: GuildMember };
type GuildMemberRemoveData = { member: GuildMember; roles: Role[] };
type GuildMemberRoleAddData = { member: GuildMember; addedRoles: Role[] };
type GuildMemberRoleRemoveData = { member: GuildMember; removedRoles: Role[] };

export const memberLog = new Hashira({ name: "memberLog" }).const(
  "memberLog",
  new Logger()
    .addMessageType(
      "guildMemberAdd",
      async ({ timestamp }, { member }: GuildMemberAddData) => {
        const embed = getLogMessageEmbed(member, timestamp)
          .setDescription("**Dołącza do serwera**")
          .setColor("Green");
        return embed;
      },
    )
    .addMessageType(
      "guildMemberRemove",
      async ({ timestamp }, { member, roles }: GuildMemberRemoveData) => {
        const embed = getLogMessageEmbed(member, timestamp)
          .setDescription("**Opuszcza serwer**")
          .setColor("Red");

        if (roles.length > 0) {
          embed.addFields([
            {
              name: "Role",
              value: roles.map((r) => `- ${roleMention(r.id)} (${r.name})`).join("\n"),
            },
          ]);
        }

        return embed;
      },
    )
    .addMessageType(
      "guildMemberRoleAdd",
      async ({ timestamp }, { member, addedRoles }: GuildMemberRoleAddData) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Green");
        if (addedRoles.length === 1) {
          const addedRole = addedRoles[0] as Role;
          embed.setDescription(`**Otrzymuje rolę** ${roleMention(addedRole.id)}`);
        } else {
          embed.setDescription(
            `**Otrzymuje role** \n${addedRoles.map((r) => roleMention(r.id)).join(", ")}`,
          );
        }
        return embed;
      },
    )
    .addMessageType(
      "guildMemberRoleRemove",
      async ({ timestamp }, { member, removedRoles }: GuildMemberRoleRemoveData) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Red");
        if (removedRoles.length === 1) {
          const removedRole = removedRoles[0] as Role;
          embed.setDescription(`**Traci rolę** ${roleMention(removedRole.id)}`);
        } else {
          embed.setDescription(
            `**Traci role** \n${removedRoles.map((r) => roleMention(r.id)).join(", ")}`,
          );
        }
        return embed;
      },
    ),
);
