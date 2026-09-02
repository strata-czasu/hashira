import { expect, test } from "bun:test";

import { pluralize, pluralizers } from "../src/util/pluralize";

const forms = { one: "SINGULAR", few: "PAUCAL", many: "PLURAL" };

test.each([
  [0, "PLURAL"],
  [1, "SINGULAR"],
  [2, "PAUCAL"],
  [3, "PAUCAL"],
  [4, "PAUCAL"],
  [5, "PLURAL"],
  [12, "PLURAL"],
  [14, "PLURAL"],
  [22, "PAUCAL"],
  [112, "PLURAL"],
  [122, "PAUCAL"],
])("pluralize(%i) -> %s", (count, expected) => {
  expect(pluralize(count, forms)).toBe(expected);
});

test.each([
  ["users", 1, "użytkownik"],
  ["users", 2, "użytkownicy"],
  ["genitiveUsers", 1, "użytkownika"],
  ["genitiveUsers", 2, "użytkowników"],
  ["genitiveUsers", 5, "użytkowników"],
  ["dativeUsers", 2, "użytkownikom"],
  ["messages", 2, "wiadomości"],
  ["points", 22, "punkty"],
  ["days", 2, "dni"],
  ["warns", 23, "ostrzeżenia"],
] as const)("%s(%i) -> %s", (name, count, expected) => {
  expect(pluralizers[name](count)).toBe(expected);
});
