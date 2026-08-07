/** @jsxImportSource @hashira/jsx */
import { describe, expect, it } from "bun:test";
import { render } from "@hashira/jsx";
import type { Birthday2026PlayerSnapshot } from "../../src/events/birthday2026/playerService";
import {
  BIRTHDAY_2026_FEED_ALL_CUSTOM_ID,
  buildBirthday2026BalanceView,
  buildBirthday2026FeedResultView,
  buildBirthday2026InfoView,
  buildBirthday2026RankingView,
  buildBirthday2026StatusView,
} from "../../src/events/birthday2026/playerView";

const snapshot: Birthday2026PlayerSnapshot = {
  balance: 12,
  contributedPasza: 5,
  currencySymbol: "P",
  eventEndAt: new Date("2026-08-10T18:00:00Z"),
  eventStartAt: new Date("2026-08-03T18:00:00Z"),
  eventState: "open",
  history: [
    {
      amount: 5,
      createdAt: new Date("2026-08-03T18:05:00Z"),
      entryType: "debit",
      reason: "Player feed",
      source: "feed",
    },
    {
      amount: 17,
      createdAt: new Date("2026-08-03T18:00:00Z"),
      entryType: "credit",
      reason: "Text activity",
      source: "textActivity",
    },
  ],
  registered: false,
  registrationState: "closed",
  membership: {
    joinedAt: new Date("2026-08-02T18:00:00Z"),
    teamConfigId: 1,
  },
  teams: [
    {
      captainUserId: "captain-1",
      color: 0xff0000,
      contributorCount: 4,
      id: 1,
      name: "Czerwoni",
      pendingPasza: 15,
      permanentWeight: 30,
      roleId: "role-1",
      tucznikUserId: "tucznik-1",
    },
    {
      captainUserId: "captain-2",
      color: 0x00ff00,
      contributorCount: 3,
      id: 2,
      name: "Zieloni",
      pendingPasza: 10,
      permanentWeight: 30,
      roleId: "role-2",
      tucznikUserId: "tucznik-2",
    },
    {
      captainUserId: "captain-3",
      color: 0x0000ff,
      contributorCount: 2,
      id: 3,
      name: "Niebiescy",
      pendingPasza: 8,
      permanentWeight: 20,
      roleId: "role-3",
      tucznikUserId: "tucznik-3",
    },
    {
      captainUserId: "captain-4",
      color: 0xffff00,
      contributorCount: 1,
      id: 4,
      name: "Żółci",
      pendingPasza: 2,
      permanentWeight: 10,
      roleId: "role-4",
      tucznikUserId: "tucznik-4",
    },
  ],
  timezone: "Europe/Warsaw",
};

const renderJson = (element: Parameters<typeof render>[0]) => {
  const rendered = render(element);
  expect(rendered.flags).toBe("IsComponentsV2");
  return JSON.stringify(rendered.components);
};

describe("Birthday 2026 player JSX views", () => {
  it("renders event info and all public team status", () => {
    const info = renderJson(buildBirthday2026InfoView(snapshot));
    expect(info).toContain("Nakarm Tucznika");
    expect(info).toContain("/tucznik nakarm");
    expect(info).toContain("tucznik-1");

    const status = renderJson(buildBirthday2026StatusView(snapshot));
    for (const team of snapshot.teams) {
      expect(status).toContain(team.name);
      expect(status).toContain(team.tucznikUserId);
      expect(status).toContain(team.captainUserId);
    }
  });

  it("renders private balance, history, and an enabled feed-all button", () => {
    const balance = renderJson(buildBirthday2026BalanceView(snapshot));
    expect(balance).toContain("Twoja Pasza");
    expect(balance).toContain("−5 P");
    expect(balance).toContain("+17 P");
    expect(balance).toContain(BIRTHDAY_2026_FEED_ALL_CUSTOM_ID);
    expect(balance).not.toContain('"disabled":true');
  });

  it("disables feeding outside the open event window", () => {
    const balance = renderJson(
      buildBirthday2026BalanceView({ ...snapshot, eventState: "finished" }),
    );
    expect(balance).toContain('"disabled":true');
  });

  it("renders tied rankings and feed confirmation", () => {
    const ranking = renderJson(buildBirthday2026RankingView(snapshot));
    expect(ranking).toContain("1. <@&role-1>");
    expect(ranking).toContain("1. <@&role-2>");
    expect(ranking).toContain("3. <@&role-3>");

    const result = renderJson(
      buildBirthday2026FeedResultView(
        { ...snapshot, balance: 7 },
        5,
        new Date("2026-08-03T22:05:00Z"),
        snapshot.membership?.teamConfigId ?? 0,
      ),
    );
    expect(result).toContain("Tucznik nakarmiony");
    expect(result).toContain("Pozostałe saldo");
    expect(result).toContain(BIRTHDAY_2026_FEED_ALL_CUSTOM_ID);
  });

  it("shows a playful message when feeding another team", () => {
    const cross = renderJson(
      buildBirthday2026FeedResultView(
        { ...snapshot, balance: 7 },
        5,
        new Date("2026-08-03T22:05:00Z"),
        2,
      ),
    );
    expect(cross).toContain("Oops, pomyłka!");
    expect(cross).toContain("<@&role-2>");
    expect(cross).toContain("Pozostałe saldo");
    expect(cross).toContain(BIRTHDAY_2026_FEED_ALL_CUSTOM_ID);
  });
});
