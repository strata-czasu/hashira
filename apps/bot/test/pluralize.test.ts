import { describe, expect, it } from "bun:test";
import { createPluralize, pluralize, pluralizers } from "../src/util/pluralize";

describe("pluralize", () => {
  const declinations = {
    one: "singular",
    few: "paucal",
    many: "plural",
  };

  it("selects the singular form for count 1", () => {
    expect(pluralize(1, declinations)).toBe("singular");
  });

  it("selects the paucal form for counts 2-4", () => {
    for (const count of [2, 3, 4]) {
      expect(pluralize(count, declinations)).toBe("paucal");
    }
  });

  it("selects the plural form for count 0", () => {
    expect(pluralize(0, declinations)).toBe("plural");
  });

  it("selects the plural form for counts 5 and above", () => {
    for (const count of [5, 11, 21]) {
      expect(pluralize(count, declinations)).toBe("plural");
    }
  });

  it("selects the plural form for teen numbers 12-14", () => {
    for (const count of [12, 13, 14]) {
      expect(pluralize(count, declinations)).toBe("plural");
    }
  });

  it("selects the paucal form for numbers ending in 2-4 outside teens", () => {
    for (const count of [22, 23, 24, 32, 103, 122]) {
      expect(pluralize(count, declinations)).toBe("paucal");
    }
  });
});

describe("createPluralize", () => {
  it("returns a function that pluralizes based on the provided declinations", () => {
    const pluralizePoints = createPluralize({
      one: "punkt",
      few: "punkty",
      many: "punktów",
    });

    expect(pluralizePoints(1)).toBe("punkt");
    expect(pluralizePoints(2)).toBe("punkty");
    expect(pluralizePoints(5)).toBe("punktów");
  });
});

describe("pluralizers", () => {
  it.each([
    ["users", { 1: "użytkownik", 2: "użytkownicy", 5: "użytkowników" }],
    ["dativeUsers", { 1: "użytkownikowi", 2: "użytkownikom", 5: "użytkownikom" }],
    ["messages", { 1: "wiadomość", 2: "wiadomości", 5: "wiadomości" }],
    ["points", { 1: "punkt", 2: "punkty", 5: "punktów" }],
    ["days", { 1: "dzień", 2: "dni", 5: "dni" }],
    ["genitiveDays", { 1: "dnia", 2: "dni", 5: "dni" }],
    ["warns", { 1: "ostrzeżenie", 2: "ostrzeżenia", 5: "ostrzeżeń" }],
  ] as const)("%s declines correctly", (name, expected) => {
    const pluralizer = pluralizers[name];
    for (const [count, word] of Object.entries(expected)) {
      expect(pluralizer(Number.parseInt(count, 10))).toBe(word);
    }
  });

  it("declines teen numbers with the many form", () => {
    expect(pluralizers.points(12)).toBe("punktów");
    expect(pluralizers.warns(14)).toBe("ostrzeżeń");
    expect(pluralizers.users(112)).toBe("użytkowników");
  });

  it("declines numbers ending in 2-4 with the few form", () => {
    expect(pluralizers.points(22)).toBe("punkty");
    expect(pluralizers.warns(23)).toBe("ostrzeżenia");
    expect(pluralizers.users(124)).toBe("użytkownicy");
  });
});
