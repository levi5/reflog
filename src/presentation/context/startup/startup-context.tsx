import { _Either, _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"

const REOPEN_LAST_STORAGE_KEY = "forgegit.reopenLast"
const DEFAULT_REOPEN_LAST = false

function readStoredReopenLast(): boolean {
  const result = _Either.try.sync(() => localStorage.getItem(REOPEN_LAST_STORAGE_KEY))
  const stored = result.isRight() ? (result.value as string | null) : null
  return _Maybe
    .of(stored)
    .map((raw) => raw === "1")
    .getOrElse(DEFAULT_REOPEN_LAST)
}

function writeStoredReopenLast(reopenLast: boolean): void {
  _Either.try.sync(() => {
    localStorage.setItem(REOPEN_LAST_STORAGE_KEY, reopenLast ? "1" : "0")
  })
}

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
    writeStoredReopenLast(reopenLastRepo)
  }, [reopenLastRepo])

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
