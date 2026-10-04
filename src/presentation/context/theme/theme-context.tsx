import { createContext, type ReactNode, useContext, useMemo } from "react"
import type { Theme } from "../../../types"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"

const THEME_KEY = "theme"
export const THEME_STORAGE_KEY = versionedKey(THEME_KEY)
const DEFAULT_THEME: Theme = "dark"

const VALID_THEMES: Record<string, Theme> = {
  dark: "dark",
  light: "light",
}

function parseTheme(raw: string): Theme {
  return VALID_THEMES[raw] ?? DEFAULT_THEME
}

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = usePersistentSetting<Theme>(THEME_KEY, DEFAULT_THEME, {
    parse: parseTheme,
    normalize: parseTheme,
    apply: (nextTheme) => {
      document.documentElement.dataset.theme = nextTheme
    },
  })

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
