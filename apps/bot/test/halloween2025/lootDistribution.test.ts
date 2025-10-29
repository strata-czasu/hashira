import { describe, expect, test } from "bun:test";
import type { CombatEvent } from "../../src/events/halloween2025/combatLog";
import {
  calculatePlayerDamage,
  getLootDropCount,
  selectLootRecipients,
} from "../../src/events/halloween2025/lootDistribution";

describe("calculatePlayerDamage", () => {
  test("should calculate damage from attack events", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 10,
        message: "test",
      },
      {
        turn: 2,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 15,
        message: "test",
      },
      {
        turn: 3,
        type: "attack",
        actor: "player2",
        target: "monster",
        value: 20,
        message: "test",
      },
    ];

    const damageMap = calculatePlayerDamage(events);

    expect(damageMap.get("player1")).toBe(25);
    expect(damageMap.get("player2")).toBe(20);
  });

  test("should include critical hits", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "critical",
        actor: "player1",
        target: "monster",
        value: 30,
        message: "test",
      },
    ];

    const damageMap = calculatePlayerDamage(events);

    expect(damageMap.get("player1")).toBe(30);
  });

  test("should ignore monster attacks", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "monster",
        target: "player1",
        value: 10,
        message: "test",
      },
    ];

    const damageMap = calculatePlayerDamage(events);

    expect(damageMap.size).toBe(0);
  });

  test("should ignore attacks on players", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "player2",
        value: 10,
        message: "test",
      },
    ];

    const damageMap = calculatePlayerDamage(events);

    expect(damageMap.size).toBe(0);
  });

  test("should ignore non-attack events", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "heal",
        actor: "player1",
        target: "player1",
        value: 10,
        message: "test",
      },
    ];

    const damageMap = calculatePlayerDamage(events);

    expect(damageMap.size).toBe(0);
  });
});

describe("getLootDropCount", () => {
  test("should return 1 drop for 1-2 participants", () => {
    expect(getLootDropCount(1)).toBe(1);
    expect(getLootDropCount(2)).toBe(1);
  });

  test("should return 2 drops for 3-5 participants", () => {
    expect(getLootDropCount(3)).toBe(2);
    expect(getLootDropCount(4)).toBe(2);
    expect(getLootDropCount(5)).toBe(2);
  });

  test("should return 3 drops for 6-10 participants", () => {
    expect(getLootDropCount(6)).toBe(3);
    expect(getLootDropCount(10)).toBe(3);
  });

  test("should return 5 drops for 11+ participants", () => {
    expect(getLootDropCount(11)).toBe(5);
    expect(getLootDropCount(20)).toBe(5);
    expect(getLootDropCount(100)).toBe(5);
  });
});

describe("selectLootRecipients", () => {
  test("should select top damage dealers", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 10,
        message: "test",
      },
      {
        turn: 2,
        type: "attack",
        actor: "player2",
        target: "monster",
        value: 30,
        message: "test",
      },
      {
        turn: 3,
        type: "attack",
        actor: "player3",
        target: "monster",
        value: 20,
        message: "test",
      },
    ];

    const recipients = selectLootRecipients(events, 3);

    expect(recipients).toHaveLength(2); // 3 participants = 2 drops
    expect(recipients[0]).toEqual({
      userId: "player2",
      damageDealt: 30,
      rank: 1,
    });
    expect(recipients[1]).toEqual({
      userId: "player3",
      damageDealt: 20,
      rank: 2,
    });
  });

  test("should limit drops based on participant count", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 10,
        message: "test",
      },
      {
        turn: 2,
        type: "attack",
        actor: "player2",
        target: "monster",
        value: 20,
        message: "test",
      },
    ];

    const recipients = selectLootRecipients(events, 2);

    expect(recipients).toHaveLength(1); // 2 participants = 1 drop
    expect(recipients[0]?.userId).toBe("player2");
  });

  test("should handle ties in damage", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 20,
        message: "test",
      },
      {
        turn: 2,
        type: "attack",
        actor: "player2",
        target: "monster",
        value: 20,
        message: "test",
      },
    ];

    const recipients = selectLootRecipients(events, 2);

    expect(recipients).toHaveLength(1);
    // One of them will be selected (stable sort)
    expect(recipients[0]?.damageDealt).toBe(20);
  });

  test("should assign correct ranks", () => {
    const events: CombatEvent[] = [
      {
        turn: 1,
        type: "attack",
        actor: "player1",
        target: "monster",
        value: 100,
        message: "test",
      },
      {
        turn: 2,
        type: "attack",
        actor: "player2",
        target: "monster",
        value: 80,
        message: "test",
      },
      {
        turn: 3,
        type: "attack",
        actor: "player3",
        target: "monster",
        value: 60,
        message: "test",
      },
      {
        turn: 4,
        type: "attack",
        actor: "player4",
        target: "monster",
        value: 40,
        message: "test",
      },
      {
        turn: 5,
        type: "attack",
        actor: "player5",
        target: "monster",
        value: 20,
        message: "test",
      },
      {
        turn: 6,
        type: "attack",
        actor: "player6",
        target: "monster",
        value: 10,
        message: "test",
      },
    ];

    const recipients = selectLootRecipients(events, 6);

    expect(recipients).toHaveLength(3); // 6 participants = 3 drops
    expect(recipients[0]?.rank).toBe(1);
    expect(recipients[1]?.rank).toBe(2);
    expect(recipients[2]?.rank).toBe(3);
  });
});
