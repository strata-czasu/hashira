const PLURAL_RULES = new Intl.PluralRules("pl-PL");

export type PluralDeclinations = {
  one: string;
  few: string;
  many: string;
};

const selectDeclination = (count: number, declinations: PluralDeclinations): string => {
  const form = PLURAL_RULES.select(count);
  if (form === "one") return declinations.one;
  if (form === "few") return declinations.few;
  return declinations.many;
};

export const pluralize = (count: number, declinations: PluralDeclinations) =>
  selectDeclination(count, declinations);

export const createPluralize = (declinations: PluralDeclinations) => {
  return (count: number) => selectDeclination(count, declinations);
};

export const pluralizers = {
  users: createPluralize({
    one: "użytkownik",
    few: "użytkownicy",
    many: "użytkowników",
  }),
  dativeUsers: createPluralize({
    one: "użytkownikowi",
    few: "użytkownikom",
    many: "użytkownikom",
  }),
  messages: createPluralize({
    one: "wiadomość",
    few: "wiadomości",
    many: "wiadomości",
  }),
  points: createPluralize({
    one: "punkt",
    few: "punkty",
    many: "punktów",
  }),
  days: createPluralize({
    one: "dzień",
    few: "dni",
    many: "dni",
  }),
  genitiveDays: createPluralize({
    one: "dnia",
    few: "dni",
    many: "dni",
  }),
  warns: createPluralize({
    one: "ostrzeżenie",
    few: "ostrzeżenia",
    many: "ostrzeżeń",
  }),
};
