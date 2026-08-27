import { describe, expect, it } from "bun:test";

import { getColor } from "../src/util/getColor";

describe("getColor", () => {
  it("accepts six-digit hex colors with or without a hash", () => {
    expect(getColor("#ff8800")).toBe(0xff8800);
    expect(getColor("000000")).toBe(0);
  });

  it("returns null for invalid colors", () => {
    expect(getColor("#fff")).toBeNull();
    expect(getColor("#ff880000")).toBeNull();
  });
});
