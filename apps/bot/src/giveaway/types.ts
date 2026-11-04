import type { ButtonInteraction } from "discord.js";

import type { ExtractContext } from "@hashira/core";

import type { base } from "../base";

export type BaseContext = ExtractContext<typeof base>;

export type ButtonHandlerContext = Pick<
  BaseContext,
  "prisma" | "economyLog" | "messageQueue" | "moderationLog"
>;

export type GiveawayButtonHandlerOptions = ButtonHandlerContext & {
  itx: ButtonInteraction<"cached">;
};

export type { GiveawayButtonHandlerOptions as HandleGiveawayRewardButtonOptions };
export type { GiveawayButtonHandlerOptions as GiveawayJoinButtonContext };
