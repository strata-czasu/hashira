import { describe, expect, it } from "bun:test";
import { range, rangeObject } from "./range";

describe("range", () => {
  it("should create an array with numbers from start to end-1", () => {
    expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
    expect(range(2, 6)).toEqual([2, 3, 4, 5]);
  });

  it("should return empty array when start equals end", () => {
    expect(range(5, 5)).toEqual([]);
  });

  // Without this, TypeScript will suffer a stroke and it will tell you that maximum call stack size has been exceeded
  const rangeForNegatives = range as (start: number, end: number) => number[];

  it("should throw an error when start is negative", () => {
    expect(() => rangeForNegatives(-1, 5)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });

  it("should throw an error when end is negative", () => {
    expect(() => rangeForNegatives(0, -5)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });

  it("should throw an error when both start and end are negative", () => {
    expect(() => rangeForNegatives(-3, -1)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });
});

describe("rangeObject", () => {
  it("should create an object with keys from start to end-1 and mapped values", () => {
    const result = rangeObject(0, 3, (i) => i * 2);
    expect(result).toEqual({
      0: 0,
      1: 2,
      2: 4,
    });
  });

  it("should handle string values from mapper", () => {
    const result = rangeObject(1, 4, (i) => `value-${i}`);
    expect(result).toEqual({
      1: "value-1",
      2: "value-2",
      3: "value-3",
    });
  });

  it("should handle object values from mapper", () => {
    const result = rangeObject(0, 2, (i) => ({ id: i, name: `Item ${i}` }));
    expect(result).toEqual({
      0: { id: 0, name: "Item 0" },
      1: { id: 1, name: "Item 1" },
    });
  });

  it("should handle empty range", () => {
    const result = rangeObject(5, 5, (i) => i);
    expect(result).toEqual({});
  });

  // Without this, TypeScript will suffer a stroke and it will tell you that maximum call stack size has been exceeded
  const rangeObjectForNegatives = rangeObject as <T>(
    start: number,
    end: number,
    mapper: (i: number) => T,
  ) => Record<number, T>;

  it("should throw an error when start is negative", () => {
    expect(() => rangeObjectForNegatives(-1, 5, (i) => i)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });

  it("should throw an error when end is negative", () => {
    expect(() => rangeObjectForNegatives(0, -5, (i) => i)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });

  it("should throw an error when both start and end are negative", () => {
    expect(() => rangeObjectForNegatives(-3, -1, (i) => i)).toThrow(
      "Range bounds must be non-negative integers",
    );
  });
});
