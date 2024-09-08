import { Hashira } from "@hashira/core";
import { GuildMember } from "discord.js";
import { base } from "./base";
import { GUILD_IDS } from "./specializedConstants";

// TODO)) Change to StrataCzasu
const LOG_GUILD_ID = GUILD_IDS.Piwnica;

export const logging = new Hashira({ name: "logging" })
  .use(base)
  .handle("ready", async ({ log }, client) => {
    await log.consumeLoop(client);
  })
  .handle("messageDelete", async ({ log }, message) => {
    if (!message.inGuild()) return;
    if (message.guildId !== LOG_GUILD_ID) return;
    if (message.author.bot) return;

    log.push("messageDelete", { message });
  })
  .handle("messageUpdate", async ({ log }, oldMessage, newMessage) => {
    if (!oldMessage.inGuild() || !newMessage.inGuild()) return;
    if (oldMessage.guildId !== LOG_GUILD_ID || newMessage.guildId !== LOG_GUILD_ID)
      return;
    if (oldMessage.author.bot || newMessage.author.bot) return;

    log.push("messageUpdate", { oldMessage, newMessage });
  })
  .handle("guildMemberAdd", async ({ log }, member) => {
    if (member.guild.id !== LOG_GUILD_ID) return;
    log.push("guildMemberAdd", { member });
  })
  .handle("guildMemberRemove", async ({ log }, member) => {
    // NOTE: We don't let partials through as events
    // FIXME: Support partial events
    if (!(member instanceof GuildMember)) return;
    if (member.guild.id !== LOG_GUILD_ID) return;
    log.push("guildMemberRemove", { member });
  })
  .handle("guildMemberUpdate", async ({ log }, oldMember, newMember) => {
    if (oldMember.guild.id !== LOG_GUILD_ID || newMember.guild.id !== LOG_GUILD_ID)
      return;

    if (oldMember.nickname !== newMember.nickname) {
      log.push("guildMemberNicknameUpdate", {
        member: newMember,
        oldNickname: oldMember.nickname,
        newNickname: newMember.nickname,
      });
    }
  })
  .handle("guildBanAdd", async ({ log }, ban) => {
    if (ban.guild.id !== LOG_GUILD_ID) return;
    log.push("guildBanAdd", { ban });
  })
  .handle("guildBanRemove", async ({ log }, ban) => {
    if (ban.guild.id !== LOG_GUILD_ID) return;
    log.push("guildBanRemove", { ban });
  });
