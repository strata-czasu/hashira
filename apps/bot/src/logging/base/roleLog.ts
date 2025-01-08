import { Hashira } from "@hashira/core";
import { type GuildMember, type Role, roleMention } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type GuildMemberRoleAddData = { member: GuildMember; addedRoles: Role[] };
type GuildMemberRoleRemoveData = { member: GuildMember; removedRoles: Role[] };
type GuildMemberBulkRoleAddData = {
  moderator: GuildMember;
  members: GuildMember[];
  role: Role;
};
type GuildMemberBulkRoleRemoveData = {
  moderator: GuildMember;
  members: GuildMember[];
  role: Role;
};

const formatRole = (role: Role) => `${roleMention(role.id)} (${role.name})`;

export const roleLog = new Hashira({ name: "roleLog" }).const(
  "roleLog",
  new Logger()
    .addMessageType(
      "guildMemberRoleAdd",
      async ({ timestamp }, { member, addedRoles }: GuildMemberRoleAddData) => {
        const embed = getLogMessageEmbed(member, timestamp).setColor("Green");
        if (addedRoles.length === 1) {
          const addedRole = addedRoles[0] as Role;
          embed.setDescription(`**Otrzymuje rolę** ${formatRole(addedRole)}`);
        } else {
          embed.setDescription(
            `**Otrzymuje role** \n${addedRoles.map(formatRole).join(", ")}`,
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
          embed.setDescription(`**Traci rolę** ${formatRole(removedRole)}`);
        } else {
          embed.setDescription(
            `**Traci role** \n${removedRoles.map(formatRole).join(", ")}`,
          );
        }
        return embed;
      },
    )
    .addMessageType(
      "guildMemberBulkRoleAdd",
      async (
        { timestamp },
        { moderator, members, role }: GuildMemberBulkRoleAddData,
      ) => {
        const embed = getLogMessageEmbed(moderator, timestamp).setColor("Green");
        const lines = [
          `**Dodaje rolę ${formatRole(role)} ${members.length} użytkownikom**:`,
          members.map((m) => m.user.tag).join(", "),
        ];
        embed.setDescription(lines.join("\n"));
        return embed;
      },
    )
    .addMessageType(
      "guildMemberBulkRoleRemove",
      async (
        { timestamp },
        { moderator, members, role }: GuildMemberBulkRoleRemoveData,
      ) => {
        const embed = getLogMessageEmbed(moderator, timestamp).setColor("Red");
        const lines = [
          `**Zabiera rolę ${formatRole(role)} ${members.length} użytkownikom**:`,
          members.map((m) => m.user.tag).join(", "),
        ];
        embed.setDescription(lines.join("\n"));
        return embed;
      },
    ),
);
