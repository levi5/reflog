export function fuzzyMatch(query: string, text: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const target = text.toLowerCase()
  let qi = 0
  for (const ch of target) {
    if (ch === q[qi]) {
      qi += 1
      if (qi === q.length) return true
    }
  }
  return false
}
