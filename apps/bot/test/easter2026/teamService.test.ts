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
    expect(pickLeastPopulatedTeam([], () => 0)).toBeUndefined();
  });

  it("should pick the single team when only one exists", () => {
    const teams = [createTestTeam(1, "Team A", 5)];
    expect(pickLeastPopulatedTeam(teams, () => 0)?.id).toBe(1);
  });

  it("should pick the team with fewest members", () => {
    const teams = [
      createTestTeam(1, "Team A", 10),
      createTestTeam(2, "Team B", 2),
      createTestTeam(3, "Team C", 7),
    ];
    expect(pickLeastPopulatedTeam(teams, () => 0)?.id).toBe(2);
  });

  it("should choose among equally populated teams based on random", () => {
    const teams = [createTestTeam(1, "Team A", 5), createTestTeam(2, "Team B", 5)];

    expect(pickLeastPopulatedTeam(teams, () => 0)?.id).toBe(1);
    expect(pickLeastPopulatedTeam(teams, () => 0.99)?.id).toBe(2);
  });

  it("should pick from the smallest group when sizes vary", () => {
    const teams = [
      createTestTeam(1, "Team A", 10),
      createTestTeam(2, "Team B", 3),
      createTestTeam(3, "Team C", 3),
      createTestTeam(4, "Team D", 7),
    ];

    expect(pickLeastPopulatedTeam(teams, () => 0)?.id).toBe(2);
    expect(pickLeastPopulatedTeam(teams, () => 0.99)?.id).toBe(3);
  });
});
