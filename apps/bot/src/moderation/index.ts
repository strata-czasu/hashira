import { Hashira } from "@hashira/core";
import { access } from "./access";
import { bans } from "./bans";
import { mutes } from "./mutes";
import { nick } from "./nick";
import { prune } from "./prune";
import { userRecord } from "./userRecord";
import { verification } from "./verification";
import { warns } from "./warns";

export const moderation = new Hashira({ name: "moderation" })
  .use(bans)
  .use(warns)
  .use(mutes)
  .use(prune)
  .use(verification)
  .use(userRecord)
  .use(access)
  .use(nick);
