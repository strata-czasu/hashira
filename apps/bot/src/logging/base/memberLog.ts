import { Hashira } from "@hashira/core";
import { type GuildMember, type Role, roleMention } from "discord.js";
import { Logger } from "./logger";
import { getLogMessageEmbed } from "./util";

type GuildMemberAddData = { member: GuildMember };
type GuildMemberRemoveData = { member: GuildMember; roles: Role[] };

const formatRole = (role: Role) => `${roleMention(role.id)} (${role.name})`;

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
              value: roles.map((r) => `- ${formatRole(r)}`).join("\n"),
            },
          ]);
        }

        return embed;
      },
    ),
);
