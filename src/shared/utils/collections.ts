export function upsertBy<T>(items: T[], item: T, keyOf: (entry: T) => string): T[] {
  const key = keyOf(item)
  const index = items.findIndex((entry) => keyOf(entry) === key)

  if (index < 0) return [...items, item]

  return items.map((entry, entryIndex) => (entryIndex === index ? item : entry))
}

export function removeBy<T>(items: T[], keyOf: (entry: T) => string, key: string): T[] {
  return items.filter((entry) => keyOf(entry) !== key)
}
