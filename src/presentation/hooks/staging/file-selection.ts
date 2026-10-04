export function toggleChecked(current: ReadonlySet<string>, path: string): Set<string> {
  const next = new Set(current)
  next.has(path) ? next.delete(path) : next.add(path)
  return next
}

export function rangeBetween(ordered: readonly string[], from: string, to: string): string[] {
  const fromIndex = ordered.indexOf(from)
  const toIndex = ordered.indexOf(to)
  if (fromIndex === -1 || toIndex === -1) return []
  return ordered.slice(Math.min(fromIndex, toIndex), Math.max(fromIndex, toIndex) + 1)
}

export function applyRange(current: ReadonlySet<string>, paths: readonly string[], select: boolean): Set<string> {
  const next = new Set(current)
  for (const path of paths) {
    select ? next.add(path) : next.delete(path)
  }
  return next
}

export function pruneChecked(current: ReadonlySet<string>, existing: readonly string[]): Set<string> {
  const keep = new Set(existing)
  return new Set([...current].filter((path) => keep.has(path)))
}
