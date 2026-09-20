import { useCallback, useState } from "react"
import { _pipe } from "funcio"
import {
  clearStoredRecents,
  persistRecents,
  pushRecentEntry,
  readRecents,
  removeRecentEntry,
} from "../../../shared/utils/recents"

export function useRecents() {
  const [recents, setRecents] = useState<string[]>(readRecents)

  const pushRecent = useCallback((root: string) => {
    const cleanRoot = _pipe(root, (r: string) => r.trim())
    if (!cleanRoot) return
    setRecents((prev) => {
      const next = pushRecentEntry(prev, cleanRoot)
      persistRecents(next)
      return next
    })
  }, [])

  const clearRecents = useCallback(() => {
    setRecents([])
    clearStoredRecents()
  }, [])

  const removeRecent = useCallback((root: string) => {
    const cleanRoot = _pipe(root, (r: string) => r.trim())
    if (!cleanRoot) return
    setRecents((prev) => {
      const next = removeRecentEntry(prev, cleanRoot)
      persistRecents(next)
      return next
    })
  }, [])

  return { recents, pushRecent, clearRecents, removeRecent }
}
