import { Hashira } from "@hashira/core";
import { bans } from "./bans";
import { mutes } from "./mutes";
import { prune } from "./prune";
import { warns } from "./warns";

export const moderation = new Hashira({ name: "moderation" })
  .use(bans)
  .use(warns)
  .use(mutes)
  .use(prune);
