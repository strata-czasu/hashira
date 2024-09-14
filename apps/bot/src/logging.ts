import { Hashira } from "@hashira/core";
import { GuildMember } from "discord.js";
import { base } from "./base";

export const logging = new Hashira({ name: "logging" })
  .use(base)
  .handle("messageDelete", async ({ log }, message) => {
    if (!message.inGuild()) return;
    if (!log.isRegistered(message.guild)) return;
    if (message.author.bot) return;

    log.push("messageDelete", message.guild, { message });
  })
  .handle("messageUpdate", async ({ log }, oldMessage, newMessage) => {
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
  .handle("guildMemberAdd", async ({ log }, member) => {
    if (!log.isRegistered(member.guild)) return;
    log.push("guildMemberAdd", member.guild, { member });
  })
  .handle("guildMemberRemove", async ({ log }, member) => {
    // NOTE: We don't let partials through as events
    // FIXME: Support partial events
    if (!(member instanceof GuildMember)) return;
    if (!log.isRegistered(member.guild)) return;
    log.push("guildMemberRemove", member.guild, { member });
  })
  .handle("guildMemberUpdate", async ({ log }, oldMember, newMember) => {
    if (!log.isRegistered(oldMember.guild) || !log.isRegistered(newMember.guild))
      return;

    if (oldMember.nickname !== newMember.nickname) {
      log.push("guildMemberNicknameUpdate", newMember.guild, {
        member: newMember,
        oldNickname: oldMember.nickname,
        newNickname: newMember.nickname,
      });
    }
  })
  .handle("guildBanAdd", async ({ log }, ban) => {
    if (!log.isRegistered(ban.guild)) return;
    log.push("guildBanAdd", ban.guild, { ban });
  })
  .handle("guildBanRemove", async ({ log }, ban) => {
    if (!log.isRegistered(ban.guild)) return;
    log.push("guildBanRemove", ban.guild, { ban });
  });
