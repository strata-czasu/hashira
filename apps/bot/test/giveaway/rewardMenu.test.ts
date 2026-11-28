import { describe, expect, it } from "bun:test";
import { ButtonBuilder, ButtonStyle } from "discord.js";

import { render } from "@hashira/jsx";

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

const rowComponents = (row: ReturnType<typeof render>["components"]) => row.map((c) => c.toJSON());

describe("createRewardButtonRow", () => {
  it("creates the reward menu button", () => {
    const components = rowComponents(render(createRewardButtonRow()).components);
    const actionRow = components[0] as { components: unknown[] };
    const [rawButton] = actionRow.components as [unknown];
    const button = toCustomIdButton(rawButton as ApiButton);

    expect(button.custom_id).toBe(GIVEAWAY_REWARD_BUTTON_CUSTOM_ID);
    expect(button.label).toBe("Rozdaj nagrody");
  });
});

describe("buildRewardMenuContent", () => {
  const displayText = (components: ReturnType<typeof render>["components"]) =>
    components
      .map((c) => {
        const json = c.toJSON() as { content?: string };
        return json.content ?? "";
      })
      .join("\n");

  it("lists pending rewards split by type", () => {
    const content = render(
      buildRewardMenuContent({
        currency: [pendingReward("500 pkt", ["user-1"]), pendingReward("3m pkt", ["user-2"])],
        items: [],
        mutes: [pendingReward("24h", ["user-3"])],
      }),
    );

    const text = displayText(content.components);
    expect(text).toBe(
      [
        "### Punkty do rozdania:",
        "500 pkt -> <@user-1>",
        "3m pkt -> <@user-2>",
        "",
        "### Mute do rozdania:",
        "24h -> <@user-3>",
      ].join("\n"),
    );
  });

  it("omits sections with no pending rewards", () => {
    const content = render(
      buildRewardMenuContent({
        currency: [pendingReward("500 pkt", ["user-1"])],
        items: [],
        mutes: [],
      }),
    );

    const text = displayText(content.components);
    expect(text).toBe("### Punkty do rozdania:\n500 pkt -> <@user-1>");
    expect(text).not.toContain("Itemy");
    expect(text).not.toContain("Mute");
  });

  it("mentions every pending winner of a reward", () => {
    const content = render(
      buildRewardMenuContent({
        ...emptyPending(),
        currency: [pendingReward("500 pkt", ["user-1", "user-2"])],
      }),
    );

    const text = displayText(content.components);
    expect(text).toBe("### Punkty do rozdania:\n500 pkt -> <@user-1> <@user-2>");
  });

  it("reports when all rewards were already handed out", () => {
    const content = render(buildRewardMenuContent(emptyPending()));
    const text = displayText(content.components);
    expect(text).toBe("Wszystkie nagrody zostały już rozdane.");
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

    const components = rowComponents(render(row).components);
    const actionRow = components[0] as { components: unknown[] };
    const [rawButton] = actionRow.components as [unknown];
    const button = toCustomIdButton(rawButton as ApiButton);
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

    const components = rowComponents(render(row).components);
    const actionRow = components[0] as { components: { custom_id?: string }[] };
    const customIds = actionRow.components.map((b) => b.custom_id).filter(Boolean);
    expect(customIds.some((id) => id?.includes("-items:"))).toBe(false);
    expect(customIds.some((id) => id?.includes("-mute:"))).toBe(true);
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

    const components = rowComponents(render(row).components);
    const actionRow = components[0] as { components: unknown[] };
    expect(actionRow.components).toHaveLength(1);
    const button = toCustomIdButton(actionRow.components[0] as ApiButton);
    expect(button.custom_id).toBe(`${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:7`);
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

    const components = rowComponents(render(row).components);
    const actionRow = components[0] as {
      components: { custom_id?: string; style?: ButtonStyle }[];
    };
    const buttons = actionRow.components;
    expect(buttons.map((b) => b.custom_id)).toEqual([
      `${GIVEAWAY_REWARD_CURRENCY_BUTTON_PREFIX}:42`,
      `${GIVEAWAY_REWARD_ITEMS_BUTTON_PREFIX}:42`,
      `${GIVEAWAY_REWARD_MUTE_BUTTON_PREFIX}:42`,
    ]);
    expect(buttons.map((b) => b.style)).toEqual([
      ButtonStyle.Primary,
      ButtonStyle.Secondary,
      ButtonStyle.Danger,
    ]);
  });
});
