import { _Either, _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import type { Theme } from "../../../types"

const THEME_STORAGE_KEY = "forgegit.theme"
const DEFAULT_THEME: Theme = "dark"

const VALID_THEMES: Record<string, Theme> = {
  dark: "dark",
  light: "light",
  "glass-dark": "glass-dark",
  "glass-light": "glass-light",
}

function readThemeStorage(): Theme {
  const result = _Either.try.sync(() => localStorage.getItem(THEME_STORAGE_KEY))
  const stored = result.isRight() ? (result.value as string | null) : null
  return _Maybe
    .of(stored)
    .map((val) => (val !== null ? (VALID_THEMES[val] ?? DEFAULT_THEME) : DEFAULT_THEME))
    .getOrElse(DEFAULT_THEME)
}

function writeThemeStorage(theme: Theme): void {
  _Either.try.sync(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  })
}

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readThemeStorage)

  const setTheme = useCallback((nextTheme: Theme) => {
    const resolved = VALID_THEMES[nextTheme] ?? DEFAULT_THEME
    setThemeState(resolved)
  }, [])

  useEffect(() => {
    writeThemeStorage(theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

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
