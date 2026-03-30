import { describe, expect, it } from "bun:test";
import {
  pickLeastPopulatedTeam,
  type TeamWithConfig,
} from "../../src/events/easter2026/teamService";

const createTestTeam = (
  id: number,
  name: string,
  memberCount: number,
  guildId = "guild1",
): TeamWithConfig => ({
  id,
  name,
  guildId,
  easter2026TeamConfig: {
    id,
    teamId: id,
    roleId: `role-${id}`,
    color: 0xff0000 + id,
    statusChannelId: `channel-${id}`,
    statusLastMessageId: null,
    captainUserId: null,
  },
  _count: { members: memberCount },
});

describe("pickLeastPopulatedTeam", () => {
  it("should return undefined for empty array", () => {
    const result = pickLeastPopulatedTeam([]);
    expect(result).toBeUndefined();
  });

  it("should pick the single team when only one exists", () => {
    const teams = [createTestTeam(1, "Team A", 5)];
    const result = pickLeastPopulatedTeam(teams);
    expect(result?.id).toBe(1);
  });

  it("should pick the team with fewest members", () => {
    const teams = [
      createTestTeam(1, "Team A", 10),
      createTestTeam(2, "Team B", 2),
      createTestTeam(3, "Team C", 7),
    ];
    const result = pickLeastPopulatedTeam(teams);
    expect(result?.id).toBe(2);
  });

  it("should choose randomly among equally populated teams", () => {
    const teams = [createTestTeam(1, "Team A", 5), createTestTeam(2, "Team B", 5)];

    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const result = pickLeastPopulatedTeam(teams);
      if (result) results.add(result.id);
    }

    // Both teams should have been selected at least once
    expect(results.size).toBe(2);
  });

  it("should pick from the smallest group when sizes vary", () => {
    const teams = [
      createTestTeam(1, "Team A", 10),
      createTestTeam(2, "Team B", 3),
      createTestTeam(3, "Team C", 3),
      createTestTeam(4, "Team D", 7),
    ];

    const results = new Set<number>();
    for (let i = 0; i < 50; i++) {
      const result = pickLeastPopulatedTeam(teams);
      if (result) results.add(result.id);
    }

    // Only teams 2 and 3 should be selected (fewest members)
    expect(results.has(1)).toBe(false);
    expect(results.has(4)).toBe(false);
    expect(results.has(2)).toBe(true);
    expect(results.has(3)).toBe(true);
  });
});
