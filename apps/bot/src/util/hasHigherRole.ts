import type { GuildMember } from "discord.js";

export const hasHigherRole = (member: GuildMember, target: GuildMember) =>
  member.roles.highest.position > target.roles.highest.position;
