import { Hashira } from "@hashira/core";
import { bans } from "./bans";

export const moderation = new Hashira({ name: "moderation" }).use(bans);
