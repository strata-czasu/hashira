export function weightedRandom<T>(
  items: readonly [T, ...T[]],
  by: (item: T) => number,
  random?: () => number,
): T;
export function weightedRandom<T>(
  items: readonly T[],
  by: (item: T) => number,
  random?: () => number,
): T | null;
export function weightedRandom<T>(
  items: readonly T[],
  by: (item: T) => number,
  random: () => number = Math.random,
): T | null {
  const totalWeight = items.reduce((sum, item) => sum + by(item), 0);
  let randomValue = random() * totalWeight;

  for (const item of items) {
    const weight = by(item);
    if (randomValue < weight) {
      return item;
    }
    randomValue -= weight;
  }

  return items.at(-1) ?? null;
}
