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
    log.push("guildMemberRemove", member.guild, { member });
  })
  .handle("guildMemberUpdate", async ({ profileLog: log }, oldMember, newMember) => {
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
  .handle("guildBanAdd", async ({ banLog: log }, ban) => {
    if (!log.isRegistered(ban.guild)) return;
    log.push("guildBanAdd", ban.guild, { ban });
  })
  .handle("guildBanRemove", async ({ banLog: log }, ban) => {
    if (!log.isRegistered(ban.guild)) return;
    log.push("guildBanRemove", ban.guild, { ban });
  });
