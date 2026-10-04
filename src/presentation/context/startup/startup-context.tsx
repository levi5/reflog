import { createContext, type ReactNode, useContext, useMemo } from "react"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"

const REOPEN_LAST_KEY = "reopen-last"
export const REOPEN_LAST_STORAGE_KEY = versionedKey(REOPEN_LAST_KEY)
const DEFAULT_REOPEN_LAST = false

function parseReopenLast(raw: string): boolean {
  return raw === "1"
}

export interface StartupContextValue {
  reopenLastRepo: boolean
  setReopenLastRepo: (reopen: boolean) => void
}

const StartupContext = createContext<StartupContextValue | null>(null)

export function StartupProvider({ children }: { children: ReactNode }) {
  const [reopenLastRepo, setReopenLastRepo] = usePersistentSetting<boolean>(REOPEN_LAST_KEY, DEFAULT_REOPEN_LAST, {
    parse: parseReopenLast,
    serialize: (reopen) => (reopen ? "1" : "0"),
  })

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
