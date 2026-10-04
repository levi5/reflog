import { createContext, type ReactNode, useContext, useEffect, useMemo } from "react"
import type { AccentId, Theme } from "../../../types"
import {
  DEFAULT_ACCENT_ID,
  ensureContrast,
  isAccentId,
  MIN_TEXT_CONTRAST,
  readableTextOn,
  resolveAccentHex,
} from "../../../shared/constants/accent"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"
import { useTheme } from "../theme/theme-context"

const ACCENT_KEY = "accent"
export const ACCENT_STORAGE_KEY = versionedKey(ACCENT_KEY)

function parseAccent(raw: string): AccentId {
  return isAccentId(raw) ? raw : DEFAULT_ACCENT_ID
}

function applyAccentVars(accent: AccentId, theme: Theme): void {
  const hex = resolveAccentHex(accent, theme)
  const onAccent = readableTextOn(hex)
  const fill = ensureContrast(hex, onAccent, MIN_TEXT_CONTRAST)
  const root = document.documentElement
  root.style.setProperty("--accent", hex)
  root.style.setProperty("--grape", hex)
  root.style.setProperty("--grape-btn", fill)
  root.style.setProperty("--on-accent", onAccent)
  root.style.setProperty("--grape-deep", `color-mix(in srgb, ${fill} 84%, black)`)
  root.style.setProperty("--grape-dim", `color-mix(in srgb, ${hex} 16%, transparent)`)
}

export interface AccentContextValue {
  accent: AccentId
  setAccent: (accent: AccentId) => void
}

const AccentContext = createContext<AccentContextValue | null>(null)

export function AccentProvider({ children }: { children: ReactNode }) {
  const { theme } = useTheme()
  const [accent, setAccent] = usePersistentSetting<AccentId>(ACCENT_KEY, DEFAULT_ACCENT_ID, {
    parse: parseAccent,
    normalize: parseAccent,
  })

  useEffect(() => {
    applyAccentVars(accent, theme)
  }, [accent, theme])

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
