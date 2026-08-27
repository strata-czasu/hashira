import { describe, expect, test } from "bun:test";

import { numberToEmoji } from "../src/util/numberToEmoji";

describe("numberToEmoji", () => {
  test("converts number to emoji", () => {
    expect(numberToEmoji(123)).toBe("1️⃣2️⃣3️⃣");
  });

  test("converts 10 to emoji", () => {
    expect(numberToEmoji(10)).toBe("🔟");
  });

  test("throws for negative number", () => {
    expect(() => numberToEmoji(-1)).toThrow("Number must be positive");
  });
});
