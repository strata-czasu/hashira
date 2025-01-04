import { Hashira } from "@hashira/core";
import { GuildMember } from "discord.js";
import { base } from "../base";

// Logging for Discord events
export const discordEventLogging = new Hashira({ name: "discordEventLogging" })
  .use(base)
  .handle("messageDelete", async ({ messageLog: log }, message) => {
    if (!message.inGuild()) return;
    if (!log.isRegistered(message.guild)) return;
    if (message.author.bot) return;

    log.push("messageDelete", message.guild, { message });
  })
  .handle("messageUpdate", async ({ messageLog: log }, oldMessage, newMessage) => {
    if (!oldMessage.inGuild() || !newMessage.inGuild()) return;
    if (!log.isRegistered(oldMessage.guild) || !log.isRegistered(newMessage.guild))
      return;
    if (oldMessage.author.bot || newMessage.author.bot) return;

    log.push("messageUpdate", newMessage.guild, {
      oldMessage,
      newMessage,
      oldMessageContent: oldMessage.content,
      newMessageContent: newMessage.content,
    });
  })
  .handle("guildMemberAdd", async ({ memberLog: log }, member) => {
    if (!log.isRegistered(member.guild)) return;
    log.push("guildMemberAdd", member.guild, { member });
  })
  .handle("guildMemberRemove", async ({ memberLog: log }, member) => {
    // NOTE: We don't let partials through as events
    // FIXME: Support partial events
    if (!(member instanceof GuildMember)) return;
    if (!log.isRegistered(member.guild)) return;

    const roles = member.roles.cache
      .filter((r) => r !== member.guild.roles.everyone)
      .map((r) => r);
    log.push("guildMemberRemove", member.guild, { member, roles });
  })
  .handle("guildMemberUpdate", async ({ profileLog: log }, oldMember, newMember) => {
    if (!log.isRegistered(newMember.guild)) return;

    if (oldMember.nickname !== newMember.nickname) {
      log.push("guildMemberNicknameUpdate", newMember.guild, {
        member: newMember,
        oldNickname: oldMember.nickname,
        newNickname: newMember.nickname,
      });
    }
  })
  .handle("guildMemberUpdate", async ({ memberLog: log }, oldMember, newMember) => {
    if (!log.isRegistered(newMember.guild)) return;

    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      const removedRoles = oldMember.roles.cache
        .filter((r) => !newMember.roles.cache.has(r.id))
        .map((r) => r);
      log.push("guildMemberRoleRemove", newMember.guild, {
        member: newMember,
        removedRoles,
      });
    } else if (oldMember.roles.cache.size < newMember.roles.cache.size) {
      const addedRoles = newMember.roles.cache
        .filter((r) => !oldMember.roles.cache.has(r.id))
        .map((r) => r);
      log.push("guildMemberRoleAdd", newMember.guild, {
        member: newMember,
        addedRoles,
      });
    }
  })
  .handle("guildBanRemove", async ({ moderationLog: log }, ban) => {
    if (!log.isRegistered(ban.guild)) return;
    log.push("guildBanRemove", ban.guild, { ban });
  });
