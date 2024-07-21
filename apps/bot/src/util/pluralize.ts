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
