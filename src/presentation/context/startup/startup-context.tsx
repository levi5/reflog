import { _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import {
  debounce,
  readVersionedRaw,
  versionedKey,
  writeVersionedRaw,
} from "../../../infrastructure/storage/versioned-storage"

const REOPEN_LAST_KEY = "reopen-last"
export const REOPEN_LAST_STORAGE_KEY = versionedKey(REOPEN_LAST_KEY)
const DEFAULT_REOPEN_LAST = false

function readStoredReopenLast(): boolean {
  const stored = readVersionedRaw(REOPEN_LAST_KEY)
  return _Maybe
    .of(stored)
    .map((raw) => raw === "1")
    .getOrElse(DEFAULT_REOPEN_LAST)
}

const debouncedWriteReopenLast = debounce((reopenLast: boolean) => {
  writeVersionedRaw(REOPEN_LAST_KEY, reopenLast ? "1" : "0")
}, 300)

export interface StartupContextValue {
  reopenLastRepo: boolean
  setReopenLastRepo: (reopen: boolean) => void
}

const StartupContext = createContext<StartupContextValue | null>(null)

export function StartupProvider({ children }: { children: ReactNode }) {
  const [reopenLastRepo, setReopenLastRepoState] = useState<boolean>(readStoredReopenLast)

  const setReopenLastRepo = useCallback((reopen: boolean) => {
    setReopenLastRepoState(reopen)
  }, [])

  useEffect(() => {
    debouncedWriteReopenLast(reopenLastRepo)
  }, [reopenLastRepo])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== REOPEN_LAST_STORAGE_KEY) return
      setReopenLastRepoState(storageEvent.newValue === "1")
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = useMemo<StartupContextValue>(
    () => ({
      reopenLastRepo,
      setReopenLastRepo,
    }),
    [reopenLastRepo, setReopenLastRepo],
  )

  return <StartupContext.Provider value={value}>{children}</StartupContext.Provider>
}

export function useStartup(): StartupContextValue {
  const context = useContext(StartupContext)
  if (!context) {
    throw new Error("useStartup must be used within StartupProvider")
  }
  return context
}
