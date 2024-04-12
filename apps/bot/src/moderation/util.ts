import { type User, bold, inlineCode } from "discord.js";

export const formatUserWithId = (user: User) =>
  `${bold(user.tag)} (${inlineCode(user.id)})`;
