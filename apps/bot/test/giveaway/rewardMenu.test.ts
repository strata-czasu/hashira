import { describe, expect, it } from "bun:test";
import { ButtonBuilder, ButtonStyle } from "discord.js";

import type { PendingReward, PendingRewards } from "../../src/giveaway/rewardHandout";
import {
  buildRewardMenuContent,
  createRewardButtonRow,
  createRewardMenuRow,
  GIVEAWAY_REWARD_BUTTON_CUSTOM_ID,
  GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX,
  GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX,
  GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX,
} from "../../src/giveaway/rewardMenu";

type ApiButton = ReturnType<ButtonBuilder["toJSON"]>;

/** `APIButtonComponent` is a union (custom id / url / sku); narrow it by style. */
const toCustomIdButton = (button: ApiButton) => {
  if (button.style === ButtonStyle.Link || button.style === ButtonStyle.Premium) {
    throw new Error("expected a button with a custom id");
  }
  return button;
};

const pendingReward = (reward: string, pendingWinnerIds: string[]): PendingReward => ({
  reward: { reward } as never,
  pendingWinnerIds,
});

const emptyPending = (): PendingRewards => ({ currency: [], items: [], mutes: [] });

describe("createRewardButtonRow", () => {
  it("creates the reward menu button", () => {
    const [rawButton] = createRewardButtonRow().toJSON().components;
    if (!rawButton) throw new Error("expected a button");
    const button = toCustomIdButton(rawButton);

    expect(button.custom_id).toBe(GIVEAWAY_REWARD_BUTTON_CUSTOM_ID);
    expect(button.label).toBe("Rozdaj nagrody");
  });
});

describe("buildRewardMenuContent", () => {
  it("lists pending rewards split by type", () => {
    const content = buildRewardMenuContent({
      currency: [pendingReward("500 pkt", ["user-1"]), pendingReward("3m pkt", ["user-2"])],
      items: [],
      mutes: [pendingReward("24h", ["user-3"])],
    });

    expect(content).toBe(
      [
        "Punkty do rozdania:",
        "500 pkt -> <@user-1>",
        "3m pkt -> <@user-2>",
        "",
        "Mute do rozdania:",
        "24h -> <@user-3>",
      ].join("\n"),
    );
  });

  it("omits sections with no pending rewards", () => {
    const content = buildRewardMenuContent({
      currency: [pendingReward("500 pkt", ["user-1"])],
      items: [],
      mutes: [],
    });

    expect(content).toBe("Punkty do rozdania:\n500 pkt -> <@user-1>");
    expect(content).not.toContain("Itemy");
    expect(content).not.toContain("Mute");
  });

  it("mentions every pending winner of a reward", () => {
    const content = buildRewardMenuContent({
      ...emptyPending(),
      currency: [pendingReward("500 pkt", ["user-1", "user-2"])],
    });

    expect(content).toBe("Punkty do rozdania:\n500 pkt -> <@user-1> <@user-2>");
  });

  it("reports when all rewards were already handed out", () => {
    expect(buildRewardMenuContent(emptyPending())).toBe("Wszystkie nagrody zostały już rozdane.");
  });
});
describe("createRewardMenuRow", () => {
  const allPermissions = {
    canDistributeCurrency: true,
    canDistributeItems: true,
    canDistributeMutes: true,
  };

  it("returns null when the user has no permissions", () => {
    expect(
      createRewardMenuRow({
        canDistributeCurrency: false,
        canDistributeItems: false,
        canDistributeMutes: false,
        hasCurrencyRewards: true,
        hasItemRewards: true,
        hasMuteRewards: true,
        giveawayId: 7,
      }),
    ).toBeNull();
  });

  it("returns null when there are no pending rewards at all", () => {
    expect(
      createRewardMenuRow({
        ...allPermissions,
        hasCurrencyRewards: false,
        hasItemRewards: false,
        hasMuteRewards: false,
        giveawayId: 7,
      }),
    ).toBeNull();
  });

  it("only offers the punkty button when only currency rewards are pending", () => {
    const row = createRewardMenuRow({
      ...allPermissions,
      hasCurrencyRewards: true,
      hasItemRewards: false,
      hasMuteRewards: false,
      giveawayId: 7,
    });
    if (!row) throw new Error("expected a menu row");

    const [rawButton] = row.toJSON().components;
    if (!rawButton) throw new Error("expected a button");
    const button = toCustomIdButton(rawButton);
    expect(button.custom_id).toBe(`${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:7`);
    expect(button.label).toBe("Rozdaj punkty");
    expect(button.style).toBe(ButtonStyle.Primary);
  });

  it("hides the itemy button when there are no item rewards", () => {
    const row = createRewardMenuRow({
      ...allPermissions,
      hasCurrencyRewards: true,
      hasItemRewards: false,
      hasMuteRewards: true,
      giveawayId: 7,
    });
    if (!row) throw new Error("expected a menu row");

    const buttons = row.toJSON().components;
    expect(toCustomIdButton(buttons[0] ?? buttons[1] ?? buttons[2]!).custom_id).toBe(
      `${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:7`,
    );
    expect(buttons.some((button) => toCustomIdButton(button).custom_id.includes("-items:"))).toBe(
      false,
    );
    expect(buttons.some((button) => toCustomIdButton(button).custom_id.includes("-mute:"))).toBe(
      true,
    );
  });

  it("hides actions the user is not allowed to run", () => {
    const row = createRewardMenuRow({
      canDistributeCurrency: true,
      canDistributeItems: false,
      canDistributeMutes: true,
      hasCurrencyRewards: true,
      hasItemRewards: true,
      hasMuteRewards: false,
      giveawayId: 7,
    });
    if (!row) throw new Error("expected a menu row");

    const buttons = row.toJSON().components;
    expect(buttons).toHaveLength(1);
    expect(toCustomIdButton(buttons[0] ?? buttons[1] ?? buttons[2]!).custom_id).toBe(
      `${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:7`,
    );
  });

  it("offers all three actions when pending rewards and permissions allow it", () => {
    const row = createRewardMenuRow({
      ...allPermissions,
      hasCurrencyRewards: true,
      hasItemRewards: true,
      hasMuteRewards: true,
      giveawayId: 42,
    });
    if (!row) throw new Error("expected a menu row");

    const buttons = row.toJSON().components;
    expect(buttons.map((button) => toCustomIdButton(button).custom_id)).toEqual([
      `${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:42`,
      `${GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX}:42`,
      `${GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX}:42`,
    ]);
    expect(buttons.map((button) => button.style)).toEqual([
      ButtonStyle.Primary,
      ButtonStyle.Secondary,
      ButtonStyle.Danger,
    ]);
  });
});
