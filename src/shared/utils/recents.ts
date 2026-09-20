import { MAX_RECENTS } from "../constants/limits"

export { MAX_RECENTS }
export const RECENTS_KEY = "forgegit.recents"

export function readRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => value !== "")
      .slice(0, MAX_RECENTS)
  } catch {
    return []
  }
}

export function pushRecentEntry(previous: string[], root: string): string[] {
  const trimmed = root.trim()
  if (!trimmed) return previous
  return [trimmed, ...previous.filter((path) => path !== trimmed)].slice(0, MAX_RECENTS)
}

export function removeRecentEntry(previous: string[], root: string): string[] {
  const trimmed = root.trim()
  if (!trimmed) return previous
  return previous.filter((path) => path !== trimmed)
}

export function persistRecents(recents: string[]): void {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(recents))
  } catch {
    return
  }
}

export function clearStoredRecents(): void {
  try {
    localStorage.removeItem(RECENTS_KEY)
  } catch {
    return
  }
}
