export function fuzzyMatch(query: string, text: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  const target = text.toLowerCase()
  let qi = 0
  for (const ch of target) {
    if (ch === normalizedQuery[qi]) {
      qi += 1
      if (qi === normalizedQuery.length) return true
    }
  }
  return false
}
