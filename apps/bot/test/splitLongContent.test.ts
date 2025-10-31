import { describe, expect, test } from "bun:test";
import { splitLongContent } from "../src/util/splitLongContent";

describe("splitLongContent", () => {
  test("should return single chunk for short content", () => {
    const content = "This is a short message.";
    const result = splitLongContent(content, 4000);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe(content);
  });

  test("should split content that exceeds limit", () => {
    const lines = Array.from(
      { length: 100 },
      (_, i) => `Line ${i + 1}: Some content here`,
    );
    const content = lines.join("\n");
    const result = splitLongContent(content, 500);

    for (const chunk of result) {
      expect(chunk.length).toBeLessThanOrEqual(500);
    }

    const rejoinedLines = result.join("\n").split("\n");
    expect(rejoinedLines).toEqual(lines);
  });

  test("should not break lines in the middle when splitting", () => {
    const content = [
      "First complete line",
      "Second complete line",
      "Third complete line",
    ].join("\n");

    const result = splitLongContent(content, 50);

    expect(result).toMatchInlineSnapshot(`
      [
        
      "First complete line
      Second complete line"
      ,
        "Third complete line",
      ]
    `);
  });

  test("should handle combat log without breaking sentences", () => {
    const events = Array.from(
      { length: 50 },
      (_, i) => `**Player** attacks **Monster** dealing ${10 + i} damage!`,
    );
    const content = events.join("\n");
    const result = splitLongContent(content, 2000);

    expect(result.length).toBeGreaterThan(1);

    for (const chunk of result) {
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.includes("attacks")) {
          expect(line).toMatch(/damage!$/);
        }
      }
    }
  });
});
