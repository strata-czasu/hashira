import { describe, expect, it } from "bun:test";
import {
  applyCap,
  type DailyActivity,
  sumWithCap,
} from "../../src/events/easter2026/pointsService";

const createActivity = (
  userId: string,
  dayStr: string,
  rawCount: number,
  weightedCount?: number,
): DailyActivity => ({
  userId,
  day: new Date(dayStr),
  rawCount,
  weightedCount: weightedCount ?? rawCount,
});

describe("sumWithCap", () => {
  it("should sum all activity under cap", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 200),
      createActivity("user1", "2026-04-06", 300),
      createActivity("user2", "2026-04-05", 150),
    ];
    expect(sumWithCap(activities, 1000)).toBe(650);
  });

  it("should apply daily cap per user per day", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 1500), // capped to 1000
      createActivity("user1", "2026-04-06", 800), // under cap
      createActivity("user2", "2026-04-05", 500), // under cap
    ];
    expect(sumWithCap(activities, 1000)).toBe(2300); // 1000 + 800 + 500
  });

  it("should apply cap to weighted count (bonus channel)", () => {
    const activities = [createActivity("user1", "2026-04-05", 500, 1000)];
    expect(sumWithCap(activities, 1000)).toBe(1000);
  });

  it("should cap weighted count that exceeds limit", () => {
    const activities = [createActivity("user1", "2026-04-05", 600, 1200)];
    expect(sumWithCap(activities, 1000)).toBe(1000);
  });

  it("should handle zero messages", () => {
    expect(sumWithCap([], 1000)).toBe(0);
  });

  it("should handle exactly at cap", () => {
    const activities = [createActivity("user1", "2026-04-05", 1000)];
    expect(sumWithCap(activities, 1000)).toBe(1000);
  });

  it("should apply cap independently per day for the same user", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 1500), // capped to 1000
      createActivity("user1", "2026-04-06", 1200), // capped to 1000
      createActivity("user1", "2026-04-07", 500), // under cap
    ];
    expect(sumWithCap(activities, 1000)).toBe(2500); // 1000 + 1000 + 500
  });
});

describe("applyCap", () => {
  it("should return users sorted by total capped points descending", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 500),
      createActivity("user1", "2026-04-06", 300),
      createActivity("user2", "2026-04-05", 900),
      createActivity("user3", "2026-04-05", 100),
    ];

    const ranking = applyCap(activities, 1000);

    expect(ranking).toHaveLength(3);
    expect(ranking[0]?.userId).toBe("user2");
    expect(ranking[0]?.totalPoints).toBe(900);
    expect(ranking[1]?.userId).toBe("user1");
    expect(ranking[1]?.totalPoints).toBe(800);
    expect(ranking[2]?.userId).toBe("user3");
    expect(ranking[2]?.totalPoints).toBe(100);
  });

  it("should apply daily cap per user in ranking", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 2000), // capped to 1000
      createActivity("user2", "2026-04-05", 800), // under cap
    ];

    const ranking = applyCap(activities, 1000);

    expect(ranking).toHaveLength(2);
    expect(ranking[0]?.userId).toBe("user1");
    expect(ranking[0]?.totalPoints).toBe(1000);
    expect(ranking[1]?.userId).toBe("user2");
    expect(ranking[1]?.totalPoints).toBe(800);
  });

  it("should return empty array when no activity", () => {
    expect(applyCap([], 1000)).toHaveLength(0);
  });

  it("should aggregate multiple days per user with per-day caps", () => {
    const activities = [
      createActivity("user1", "2026-04-05", 800), // capped to 500
      createActivity("user1", "2026-04-06", 300), // under cap
      createActivity("user1", "2026-04-07", 1000), // capped to 500
    ];

    const ranking = applyCap(activities, 500);

    expect(ranking).toHaveLength(1);
    expect(ranking[0]?.totalPoints).toBe(1300); // 500 + 300 + 500
  });
});
