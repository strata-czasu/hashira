import { Hashira } from "@hashira/core";
import { bans } from "./bans";
import { warns } from "./warns";

export const moderation = new Hashira({ name: "moderation" }).use(bans).use(warns);
