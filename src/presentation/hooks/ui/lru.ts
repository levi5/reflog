export function lruSet<T>(cache: Map<string, T>, key: string, value: T, limit: number): void {
  cache.delete(key)
  cache.set(key, value)
  while (cache.size > limit) {
    const oldestKey = cache.keys().next().value
    if (oldestKey === undefined) break
    cache.delete(oldestKey)
  }
}
