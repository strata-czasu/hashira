import { expect, test } from "bun:test";
import { createPluralize } from "../src/util/pluralize";

test("returns correct pluralized string for count 0", () => {
  const declinations = {
    0: "apple",
    1: "apples",
    2: "apples",
  };

  const pluralize = createPluralize(declinations);
  const result = pluralize(0);

  expect(result).toBe("apple");
});

test("returns correct pluralized string for count 1", () => {
  const declinations = {
    0: "apple",
    1: "apples",
    2: "apples",
  };

  const pluralize = createPluralize(declinations);
  const result = pluralize(1);

  expect(result).toBe("apples");
});

test("returns correct pluralized string for count 2", () => {
  const declinations = {
    0: "apple",
    1: "apples",
    2: "applebees",
  };

  const pluralize = createPluralize(declinations);
  const result = pluralize(2);

  expect(result).toBe("applebees");
});

test("returns correct pluralized string for count 3", () => {
  const declinations = {
    0: "apple",
    1: "apples",
    2: "apples",
  };

  const pluralize = createPluralize(declinations);
  const result = pluralize(3);

  expect(result).toBe("apples");
});
