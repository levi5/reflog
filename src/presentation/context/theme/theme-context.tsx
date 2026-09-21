import { _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { Theme } from "../../../types"
import {
  debounce,
  readVersionedRaw,
  versionedKey,
  writeVersionedRaw,
} from "../../../infrastructure/storage/versioned-storage"

const THEME_KEY = "theme"
export const THEME_STORAGE_KEY = versionedKey(THEME_KEY)
const DEFAULT_THEME: Theme = "dark"

const VALID_THEMES: Record<string, Theme> = {
  dark: "dark",
  light: "light",
  "glass-dark": "glass-dark",
  "glass-light": "glass-light",
}

function readThemeStorage(): Theme {
  const stored = readVersionedRaw(THEME_KEY)
  return _Maybe
    .of(stored)
    .map((val) => (val !== null ? (VALID_THEMES[val] ?? DEFAULT_THEME) : DEFAULT_THEME))
    .getOrElse(DEFAULT_THEME)
}

const debouncedWriteTheme = debounce((theme: Theme) => {
  writeVersionedRaw(THEME_KEY, theme)
}, 300)

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readThemeStorage)
  const first = useRef(true)

  const setTheme = useCallback((nextTheme: Theme) => {
    const resolved = VALID_THEMES[nextTheme] ?? DEFAULT_THEME
    setThemeState(resolved)
  }, [])

  useEffect(() => {
    if (first.current) {
      first.current = false
      writeVersionedRaw(THEME_KEY, theme)
    } else {
      debouncedWriteTheme(theme)
    }
    document.documentElement.dataset.theme = theme
  }, [theme])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== THEME_STORAGE_KEY || storageEvent.newValue === null) return
      const next = VALID_THEMES[storageEvent.newValue] ?? DEFAULT_THEME
      setThemeState(next)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}
