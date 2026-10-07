export interface RecentFamily {
  root: string
  name: string
  paths: string[]
}

function normalizeForCompare(path: string): string {
  const unified = path.replace(/\\/g, "/").replace(/\/+$/, "") || "/"
  const windowsLike = /^[a-zA-Z]:\//.test(unified) || path.includes("\\")
  return windowsLike ? unified.toLowerCase() : unified
}

function baseName(path: string): string {
  const unified = path.replace(/\\/g, "/").replace(/\/+$/, "")
  const segment = unified.split("/").pop() ?? path
  return segment || path
}

export function groupRecentsByFamily(recents: string[]): RecentFamily[] {
  const cleaned = recents.map((entry) => entry.trim()).filter((entry) => entry !== "")
  const seen = new Set<string>()
  const unique = cleaned.filter((entry) => {
    if (seen.has(entry)) return false
    seen.add(entry)
    return true
  })
  const normalized = unique.map(normalizeForCompare)

  const familyRootOf = (index: number, all: string[]): number => {
    let best = -1
    for (let candidate = 0; candidate < all.length; candidate += 1) {
      if (candidate === index) continue
      const prefix = all[candidate]
      if (all[index].startsWith(`${prefix}/`) && (best === -1 || prefix.length < all[best].length)) {
        best = candidate
      }
    }
    return best === -1 ? index : familyRootOf(best, all)
  }

  const groups = new Map<number, number[]>()
  unique.forEach((_, index) => {
    const root = familyRootOf(index, normalized)
    const members = groups.get(root) ?? []
    members.push(index)
    groups.set(root, members)
  })

  return [...groups.entries()]
    .map(([rootIndex, members]) => {
      const ordered = [...members].sort((a, b) => {
        if (a === rootIndex) return -1
        if (b === rootIndex) return 1
        return normalized[a].localeCompare(normalized[b])
      })
      return {
        root: unique[rootIndex],
        name: baseName(unique[rootIndex]),
        order: Math.min(...members),
        paths: ordered.map((member) => unique[member]),
      }
    })
    .sort((a, b) => a.order - b.order)
    .map(({ root, name, paths }) => ({ root, name, paths }))
}
