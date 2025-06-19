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

  it("should return empty array when start is greater than end", () => {
    // Use type assertion for this edge case to avoid TypeScript recursion issues
    const rangeForInvalidRange = range as (start: number, end: number) => number[];
    expect(rangeForInvalidRange(10, 5)).toEqual([]);
  });

  it("should handle single element range", () => {
    expect(range(5, 6)).toEqual([5]);
  });

  it("should handle range starting from zero", () => {
    expect(range(0, 3)).toEqual([0, 1, 2]);
  });

  it("should handle larger ranges", () => {
    expect(range(10, 15)).toEqual([10, 11, 12, 13, 14]);
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

  it("should return empty object when start is greater than end", () => {
    // Use type assertion for this edge case to avoid TypeScript recursion issues
    const rangeObjectForInvalidRange = rangeObject as <T>(
      start: number,
      end: number,
      mapper: (i: number) => T,
    ) => Record<number, T>;
    const result = rangeObjectForInvalidRange(10, 5, (i) => i);
    expect(result).toEqual({});
  });

  it("should handle single element range", () => {
    const result = rangeObject(5, 6, (i) => i * 2);
    expect(result).toEqual({ 5: 10 });
  });

  it("should handle range starting from zero", () => {
    const result = rangeObject(0, 2, (i) => `item-${i}`);
    expect(result).toEqual({
      0: "item-0",
      1: "item-1",
    });
  });

  it("should work with custom keyMapper", () => {
    const result = rangeObject(
      0,
      3,
      (i) => i * 2,
      (i) => `key-${i}`,
    );
    expect(result).toEqual({
      "key-0": 0,
      "key-1": 2,
      "key-2": 4,
    });
  });

  it("should work with keyMapper returning numbers", () => {
    const result = rangeObject(
      0,
      3,
      (i) => `value-${i}`,
      (i) => i + 100,
    );
    expect(result).toEqual({
      100: "value-0",
      101: "value-1",
      102: "value-2",
    });
  });

  it("should handle larger ranges", () => {
    const result = rangeObject(10, 13, (i) => i * i);
    expect(result).toEqual({
      10: 100,
      11: 121,
      12: 144,
    });
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
