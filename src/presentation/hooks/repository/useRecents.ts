import { useCallback, useEffect, useState } from "react"
import { _pipe } from "funcio"
import {
  clearStoredRecents,
  persistRecents,
  pushRecentEntry,
  readRecents,
  RECENTS_KEY,
  removeRecentEntry,
} from "../../../shared/utils/recents"
import { debounce } from "../../../infrastructure/storage/versioned-storage"

export function useRecents() {
  const [recents, setRecents] = useState<string[]>(readRecents)

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== RECENTS_KEY && storageEvent.key !== "forgegit.recents") return
      setRecents(readRecents())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const debouncedPersist = useCallback(
    debounce((next: string[]) => persistRecents(next), 300),
    [],
  )

  const pushRecent = useCallback(
    (root: string) => {
      const cleanRoot = _pipe(root, (r: string) => r.trim())
      if (!cleanRoot) return
      setRecents((prev) => {
        const next = pushRecentEntry(prev, cleanRoot)
        debouncedPersist(next)
        return next
      })
    },
    [debouncedPersist],
  )

  const clearRecents = useCallback(() => {
    setRecents([])
    clearStoredRecents()
  }, [])

  const removeRecent = useCallback(
    (root: string) => {
      const cleanRoot = _pipe(root, (r: string) => r.trim())
      if (!cleanRoot) return
      setRecents((prev) => {
        const next = removeRecentEntry(prev, cleanRoot)
        debouncedPersist(next)
        return next
      })
    },
    [debouncedPersist],
  )

  return { recents, pushRecent, clearRecents, removeRecent }
}
