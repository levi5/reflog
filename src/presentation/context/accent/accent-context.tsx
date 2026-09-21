import { _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { AccentId, Theme } from "../../../types"
import { DEFAULT_ACCENT_ID, isAccentId, resolveAccentHex } from "../../../shared/constants/accent"
import {
  debounce,
  readVersionedRaw,
  versionedKey,
  writeVersionedRaw,
} from "../../../infrastructure/storage/versioned-storage"
import { useTheme } from "../theme/theme-context"

const ACCENT_KEY = "accent"
export const ACCENT_STORAGE_KEY = versionedKey(ACCENT_KEY)

function readAccentStorage(): AccentId {
  const stored = readVersionedRaw(ACCENT_KEY)
  return _Maybe
    .of(stored)
    .map((val) => (val !== null && isAccentId(val) ? val : DEFAULT_ACCENT_ID))
    .getOrElse(DEFAULT_ACCENT_ID)
}

const debouncedWriteAccent = debounce((accent: AccentId) => {
  writeVersionedRaw(ACCENT_KEY, accent)
}, 300)

function applyAccentVars(accent: AccentId, theme: Theme): void {
  const hex = resolveAccentHex(accent, theme)
  const root = document.documentElement
  root.style.setProperty("--accent", hex)
  root.style.setProperty("--grape", hex)
  root.style.setProperty("--grape-deep", `color-mix(in srgb, ${hex} 82%, black)`)
  root.style.setProperty("--grape-dim", `color-mix(in srgb, ${hex} 16%, transparent)`)
  if (theme === "glass-dark" || theme === "glass-light") {
    root.style.setProperty("--aurora-1", `color-mix(in srgb, ${hex} 22%, transparent)`)
  }
}

export interface AccentContextValue {
  accent: AccentId
  setAccent: (accent: AccentId) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

export function AccentProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [accent, setAccentState] = useState<AccentId>(readAccentStorage)

  const setAccent = useCallback((nextAccent: AccentId) => {
    setAccentState(isAccentId(nextAccent) ? nextAccent : DEFAULT_ACCENT_ID)
  }, [])

  useEffect(() => {
    debouncedWriteAccent(accent)
    applyAccentVars(accent, theme)
  }, [accent, theme])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== ACCENT_STORAGE_KEY || storageEvent.newValue === null) return
      if (isAccentId(storageEvent.newValue)) setAccentState(storageEvent.newValue)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = useMemo(() => ({ accent, setAccent }), [accent, setAccent])

  return <AccentContext.Provider value={value}>{children}</AccentContext.Provider>
}

export function useAccent(): AccentContextValue {
  const context = useContext(AccentContext)
  if (!context) {
    throw new Error("useAccent must be used within AccentProvider")
  }
  return context
}
