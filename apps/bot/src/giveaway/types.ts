import type { ButtonInteraction } from "discord.js";

import type { ExtractContext } from "@hashira/core";

import type { base } from "../base";

export type BaseContext = ExtractContext<typeof base>;

export type GiveawayButtonHandlerOptions = {
  prisma: BaseContext["prisma"];
  economyLog: BaseContext["economyLog"];
  messageQueue: BaseContext["messageQueue"];
  moderationLog: BaseContext["moderationLog"];
  itx: ButtonInteraction<"cached">;
};
