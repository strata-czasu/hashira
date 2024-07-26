import { Hashira } from "@hashira/core";
import { strikethrough } from "discord.js";
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

    log.push(
      "messageDelete",
      `Deleted message by ${message.author.tag}: ${message.content}`,
    );
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

    log.push(
      "messageUpdate",
      `Edited message by ${oldMessage.author.tag}: ${strikethrough(
        oldMessage.content,
      )} -> ${newMessage.content}`,
    );
  });
