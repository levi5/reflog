import { _Either, _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { t, type StringKey } from "../../../i18n"
import type { Lang } from "../../../types"

const LANG_STORAGE_KEY = "forgegit.lang"
const DEFAULT_LANG: Lang = "pt"

const VALID_LANGS: Record<string, Lang> = {
  pt: "pt",
  en: "en",
}

function readStoredLang(): Lang {
  const result = _Either.try.sync(() => localStorage.getItem(LANG_STORAGE_KEY))
  const stored = result.isRight() ? (result.value as string | null) : null
  return _Maybe
    .of(stored)
    .map((val) => (val !== null ? (VALID_LANGS[val] ?? DEFAULT_LANG) : DEFAULT_LANG))
    .getOrElse(DEFAULT_LANG)
}

function writeStoredLang(lang: Lang): void {
  _Either.try.sync(() => {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  })
}

export interface TranslationContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = useCallback((nextLang: Lang) => {
    const resolved = VALID_LANGS[nextLang] ?? DEFAULT_LANG
    setLangState(resolved)
  }, [])

  useEffect(() => {
    writeStoredLang(lang)
  }, [lang])

  const translate = useCallback((key: StringKey): string => t(lang, key), [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: translate,
    }),
    [lang, setLang, translate],
  )

  return <TranslationContext.Provider value={value}>{children}</TranslationContext.Provider>
}

export function useTranslation(): TranslationContextValue {
  const context = useContext(TranslationContext)
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider")
  }
  return context
}

export const useLang = useTranslation
export const LangProvider = TranslationProvider
