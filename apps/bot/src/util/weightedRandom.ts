export function weightedRandom<T>(
  items: readonly [T, ...T[]],
  by: (item: T) => number,
): T {
  const totalWeight = items.reduce((sum, item) => sum + by(item), 0);
  let random = Math.random() * totalWeight;

  for (const item of items) {
    const weight = by(item);
    if (random < weight) {
      return item;
    }
    random -= weight;
  }

  // biome-ignore lint/style/noNonNullAssertion: type guarantees at least one item
  return items.at(-1)!;
}
