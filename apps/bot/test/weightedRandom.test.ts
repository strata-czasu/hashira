import { describe, expect, test } from "bun:test";
import { Effect, Random } from "effect";

import { weightedRandom } from "../src/util/weightedRandom";

const seededRandom = (seed: number) => {
  const rng = Effect.runSync(Random.Random.pipe(Random.withSeed(seed)));
  return () => rng.nextDoubleUnsafe();
};

describe("weightedRandom", () => {
  test("returns single item with weight", () => {
    const items = [{ value: "a", weight: 1 }] as const;
    const result = weightedRandom(
      items,
      (item) => item.weight,
      () => 0.5,
    );
    expect(result).toEqual({ value: "a", weight: 1 });
  });

  test("returns null for empty array", () => {
    const items: { value: string; weight: number }[] = [];
    const result = weightedRandom(
      items,
      (item) => item.weight,
      () => 0.5,
    );
    expect(result).toBe(null);
  });

  test("selects items based on weight boundaries", () => {
    const items = [
      { value: "rare", weight: 2 },
      { value: "common", weight: 98 },
    ];

    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0,
      )?.value,
    ).toBe("rare");
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0.019,
      )?.value,
    ).toBe("rare");
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0.02,
      )?.value,
    ).toBe("common");
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0.999,
      )?.value,
    ).toBe("common");
  });

  test("handles zero weights", () => {
    const items = [
      { value: "zero", weight: 0 },
      { value: "nonzero", weight: 1 },
    ];
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0,
      )?.value,
    ).toBe("nonzero");
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0.5,
      )?.value,
    ).toBe("nonzero");
  });

  test("handles all zero weights", () => {
    const items = [
      { value: "a", weight: 0 },
      { value: "b", weight: 0 },
      { value: "c", weight: 0 },
    ];
    // Should return the last item when total weight is 0
    expect(
      weightedRandom(
        items,
        (item) => item.weight,
        () => 0.5,
      )?.value,
    ).toBe("c");
  });

  test("works with different types and custom weight functions", () => {
    const numbers = [1, 2, 3, 4, 5] as const;
    expect(numbers).toContain(
      weightedRandom(
        numbers,
        (n) => n,
        () => 0.5,
      ),
    );

    const strings = ["apple", "banana", "cherry"] as const;
    expect(
      weightedRandom(
        strings,
        () => 1,
        () => 0,
      ),
    ).toBe("apple");
    expect(
      weightedRandom(
        strings,
        () => 1,
        () => 0.5,
      ),
    ).toBe("banana");
    expect(
      weightedRandom(
        strings,
        () => 1,
        () => 0.99,
      ),
    ).toBe("cherry");

    const sized = [
      { name: "small", size: 10 },
      { name: "large", size: 90 },
    ];
    expect(
      weightedRandom(
        sized,
        (item) => item.size,
        () => 0.05,
      )?.name,
    ).toBe("small");
    expect(
      weightedRandom(
        sized,
        (item) => item.size,
        () => 0.15,
      )?.name,
    ).toBe("large");
  });

  test("uses Math.random by default", () => {
    const items = [1, 2, 3, 4, 5] as const;
    expect(items).toContain(weightedRandom(items, () => 1));
  });

  test("handles equal weights uniformly with Effect Random.withSeed", () => {
    const items = ["a", "b", "c", "d", "e"];
    const testRandom = seededRandom(555);

    const counts = new Map<string, number>();
    for (let i = 0; i < 500; i++) {
      const result = weightedRandom(items, () => 1, testRandom);
      if (result) counts.set(result, (counts.get(result) ?? 0) + 1);
    }

    for (const count of counts.values()) {
      expect(count).toBeGreaterThan(50);
      expect(count).toBeLessThan(150);
    }
  });

  test("handles fractional, large, and negative weights", () => {
    const fractional = [
      { value: "a", weight: 0.1 },
      { value: "b", weight: 0.2 },
      { value: "c", weight: 0.7 },
    ];
    expect(
      weightedRandom(
        fractional,
        (item) => item.weight,
        () => 0.05,
      )?.value,
    ).toBe("a");
    expect(
      weightedRandom(
        fractional,
        (item) => item.weight,
        () => 0.25,
      )?.value,
    ).toBe("b");
    expect(
      weightedRandom(
        fractional,
        (item) => item.weight,
        () => 0.5,
      )?.value,
    ).toBe("c");

    const large = [
      { value: "a", weight: 1_000_000 },
      { value: "b", weight: 1 },
    ];
    expect(
      weightedRandom(
        large,
        (item) => item.weight,
        () => 0.5,
      )?.value,
    ).toBe("a");

    const withNegative = [
      { value: "negative", weight: -10 },
      { value: "positive", weight: 10 },
    ];
    expect(
      weightedRandom(
        withNegative,
        (item) => item.weight,
        () => 0.5,
      ),
    ).toBeTruthy();
  });

  test("type safety: preserves tuple non-nullability and array nullability", () => {
    const tuple = [1, 2, 3] as const;
    const nonNullResult: number = weightedRandom(
      tuple,
      () => 1,
      () => 0.5,
    );
    expect(nonNullResult).toBe(2);

    const arr: number[] = [1, 2, 3];
    const nullableResult: number | null = weightedRandom(
      arr,
      () => 1,
      () => 0.5,
    );
    expect(nullableResult).toBe(2);
  });
});
