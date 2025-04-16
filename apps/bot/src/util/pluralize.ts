const internalPluralize = (count: number, declinations: [number, string][]) => {
  for (const [key, value] of declinations) {
    if (count >= key) return value;
  }

  // biome-ignore lint/style/noNonNullAssertion: This will always be defined considering how the function is used
  return declinations.at(-1)![1];
};

const extractDeclinations = (
  declinations: Record<number, string>,
): [number, string][] => {
  const entries = Object.entries(declinations).map(
    ([key, value]) => [Number.parseInt(key, 10), value] as [number, string],
  );

  if (entries.length === 0) throw new Error("No possibilities provided");

  return entries.toSorted(([numA], [numB]) => numB - numA);
};

export const pluralize = (count: number, declinations: Record<number, string>) => {
  const declinationsArray = extractDeclinations(declinations);

  return internalPluralize(count, declinationsArray);
};

export const createPluralize = (declinations: Record<number, string>) => {
  const declinationsArray = extractDeclinations(declinations);

  return (count: number) => internalPluralize(count, declinationsArray);
};

export const pluralizers = {
  users: createPluralize({
    0: "użytkowników",
    1: "użytkownik",
    2: "użytkowników",
  }),
  messages: createPluralize({
    0: "wiadomości",
    1: "wiadomość",
    2: "wiadomości",
  }),
  days: createPluralize({
    0: "dni",
    1: "dzień",
    2: "dni",
  }),
  genitiveDays: createPluralize({
    0: "dni",
    1: "dnia",
    2: "dni",
  }),
};
