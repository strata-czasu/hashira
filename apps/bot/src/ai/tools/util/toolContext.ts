import type { Guild, User } from "discord.js";

export type ToolContext = {
  invokedBy: User;
  guild: Guild;
  reply: (content: string) => Promise<unknown>;
};
