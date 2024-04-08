export const mergeMap = <K, V>(
  onConflict: (a: V, b: V, key: K) => V,
  ...maps: Map<K, V>[]
): Map<K, V> => {
  const result = new Map<K, V>();
  for (const map of maps) {
    for (const [key, value] of map) {
      const existing = result.get(key);
      if (existing !== undefined) {
        result.set(key, onConflict(existing, value, key));
      } else {
        result.set(key, value);
      }
    }
  }
  return result;
};
