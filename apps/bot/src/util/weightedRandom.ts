export function weightedRandom<T>(
  items: readonly [T, ...T[]],
  by: (item: T) => number,
): T;
export function weightedRandom<T>(
  items: readonly T[],
  by: (item: T) => number,
): T | null;
export function weightedRandom<T>(
  items: readonly T[],
  by: (item: T) => number,
): T | null {
  const totalWeight = items.reduce((sum, item) => sum + by(item), 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    const weight = by(item);
    if (random < weight) {
      return item;
    }
    random -= weight;
  }

  return items.at(-1) ?? null;
}
