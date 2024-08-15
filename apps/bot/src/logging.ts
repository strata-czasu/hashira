import { Hashira } from "@hashira/core";
import { GuildMember } from "discord.js";
import { base } from "./base";
import { GUILD_IDS } from "./specializedConstants";

export const logging = new Hashira({ name: "logging" })
  .use(base)
  .handle("ready", async ({ log }, client) => {
    await log.consumeLoop(client);
  })
  .handle("messageDelete", async ({ log }, message) => {
    if (!message.inGuild()) return;
    // TODO)) Change to StrataCzasu
    if (message.guildId !== GUILD_IDS.Piwnica) return;
    if (message.author.bot) return;

    log.push("messageDelete", { message });
  })
  .handle("messageUpdate", async ({ log }, oldMessage, newMessage) => {
    if (!oldMessage.inGuild() || !newMessage.inGuild()) return;
    // TODO)) Change to StrataCzasu
    if (
      oldMessage.guildId !== GUILD_IDS.Piwnica ||
      newMessage.guildId !== GUILD_IDS.Piwnica
    )
      return;
    if (oldMessage.author.bot || newMessage.author.bot) return;

    log.push("messageUpdate", { oldMessage, newMessage });
  })
  .handle("guildMemberAdd", async ({ log }, member) => {
    // TODO)) Change to StrataCzasu
    if (member.guild.id !== GUILD_IDS.Piwnica) return;
    log.push("guildMemberAdd", { member });
  })
  .handle("guildMemberRemove", async ({ log }, member) => {
    // NOTE: We don't let partials through as events
    // FIXME: Support partial events
    if (!(member instanceof GuildMember)) return;
    // TODO)) Change to StrataCzasu
    if (member.guild.id !== GUILD_IDS.Piwnica) return;
    log.push("guildMemberRemove", { member });
  });
