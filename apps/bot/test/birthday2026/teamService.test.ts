import { describe, expect, it } from "bun:test";
import { planBirthday2026TeamAssignments } from "../../src/events/birthday2026/teamService";

describe("Birthday 2026 team allocation", () => {
  it("balances high estimates first and uses headcount to break score ties", () => {
    const plan = planBirthday2026TeamAssignments(
      [1, 2],
      [
        { userId: "a", activityEstimate: 10 },
        { userId: "b", activityEstimate: 9 },
        { userId: "c", activityEstimate: 1 },
        { userId: "d", activityEstimate: 0 },
      ],
      () => 0,
    );

    expect(plan.teams).toEqual([
      { teamConfigId: 1, projectedActivity: 10, memberCount: 2 },
      { teamConfigId: 2, projectedActivity: 10, memberCount: 2 },
    ]);
    expect(plan.assignments).toHaveLength(4);
  });

  it("keeps fixed captain assignments while balancing other members", () => {
    const plan = planBirthday2026TeamAssignments(
      [1, 2, 3, 4],
      [
        { userId: "captain", activityEstimate: 100, fixedTeamConfigId: 1 },
        { userId: "a", activityEstimate: 80 },
        { userId: "b", activityEstimate: 70 },
        { userId: "c", activityEstimate: 60 },
        { userId: "d", activityEstimate: 10 },
      ],
      () => 0,
    );

    expect(
      plan.assignments.find((assignment) => assignment.userId === "captain")
        ?.teamConfigId,
    ).toBe(1);
    expect(plan.teams.map((team) => team.projectedActivity)).toEqual([100, 80, 70, 70]);
  });

  it("rejects invalid estimates and unknown fixed teams", () => {
    expect(() =>
      planBirthday2026TeamAssignments(
        [1],
        [{ userId: "a", activityEstimate: -1 }],
        () => 0,
      ),
    ).toThrow("Invalid activity estimate");

    expect(() =>
      planBirthday2026TeamAssignments(
        [1],
        [{ userId: "a", activityEstimate: 1, fixedTeamConfigId: 2 }],
        () => 0,
      ),
    ).toThrow("Unknown fixed team");
  });

  it("rejects duplicate members and duplicate team IDs", () => {
    expect(() =>
      planBirthday2026TeamAssignments(
        [1],
        [
          { userId: "a", activityEstimate: 1 },
          { userId: "a", activityEstimate: 2 },
        ],
        () => 0,
      ),
    ).toThrow("Duplicate Birthday 2026 member");

    expect(() => planBirthday2026TeamAssignments([1, 1], [], () => 0)).toThrow(
      "Duplicate Birthday 2026 team configuration IDs",
    );
  });

  it("rejects allocation without configured teams", () => {
    expect(() =>
      planBirthday2026TeamAssignments(
        [],
        [{ userId: "a", activityEstimate: 1 }],
        () => 0,
      ),
    ).toThrow("without teams");
  });
});
