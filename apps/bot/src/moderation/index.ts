import { Hashira } from "@hashira/core";
import { bans } from "./bans";
import { mutes } from "./mutes";
import { prune } from "./prune";
import { verification } from "./verification";
import { warns } from "./warns";

export const moderation = new Hashira({ name: "moderation" })
  .use(bans)
  .use(warns)
  .use(mutes)
  .use(prune)
  .use(verification);
export const BAN_APPEAL_URL = "https://bit.ly/unban_na_stracie";
