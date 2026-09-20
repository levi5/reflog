import { createContext, type ReactNode, useContext, useMemo } from "react"
import type { FontSize, Lang, Theme } from "../../../types"
import { ThemeProvider, useTheme } from "../theme/theme-context"
import { TranslationProvider, useTranslation } from "../translation/translation-context"
import { UiProvider, useUi } from "../ui/ui-context"
import { StartupProvider, useStartup } from "../startup/startup-context"

export interface SettingsContextValue {
  lang: Lang
  setLang: (l: Lang) => void
  theme: Theme
  setTheme: (t: Theme) => void
  fontSize: FontSize
  setFontSize: (s: FontSize) => void
  reopenLastRepo: boolean
  setReopenLastRepo: (reopen: boolean) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function SettingsBridge({ children }: { children: ReactNode }) {
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useUi()
  const { lang, setLang } = useTranslation()
  const { reopenLastRepo, setReopenLastRepo } = useStartup()

  const value = useMemo<SettingsContextValue>(
    () => ({
      lang,
      setLang,
      theme,
      setTheme,
      fontSize,
      setFontSize,
      reopenLastRepo,
      setReopenLastRepo,
    }),
    [lang, setLang, theme, setTheme, fontSize, setFontSize, reopenLastRepo, setReopenLastRepo],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  return (
    <TranslationProvider>
      <ThemeProvider>
        <UiProvider>
          <StartupProvider>
            <SettingsBridge>{children}</SettingsBridge>
          </StartupProvider>
        </UiProvider>
      </ThemeProvider>
    </TranslationProvider>
  )
}

export function useSettingsContext(): SettingsContextValue {
  const ctx = useContext(SettingsContext)
  if (!ctx) {
    throw new Error("useSettingsContext must be used within SettingsProvider")
  }
  return ctx
}
