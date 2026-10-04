import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react"
import {
  detectLocale,
  formatCount,
  formatDate,
  formatDateTime,
  formatMessage,
  formatNumber,
  localeTag,
  plural,
  t,
  type MessageVars,
  type StringKey,
} from "../../../i18n"
import { usePersistentSetting, versionedKey } from "../../../infrastructure/storage/versioned-storage"
import type { Lang } from "../../../types"

const LANG_KEY = "lang"
export const LANG_STORAGE_KEY = versionedKey(LANG_KEY)
const DEFAULT_LANG: Lang = "pt"

const VALID_LANGS: Record<string, Lang> = {
  pt: "pt",
  en: "en",
}

function parseLang(raw: string): Lang {
  return VALID_LANGS[raw] ?? DEFAULT_LANG
}

function detectLang(): Lang {
  return VALID_LANGS[detectLocale()] ?? DEFAULT_LANG
}

export interface TranslationContextValue {
  lang: Lang
  locale: string
  setLang: (lang: Lang) => void
  t: (key: StringKey) => string
  format: (key: StringKey, vars?: MessageVars | (string | number)[]) => string
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
  formatDateTime: (value: Date | string | number) => string
  formatCount: (count: number, forms: { one: string; other: string }) => string
  plural: (count: number, forms: { one: string; other: string }) => string
}

const TranslationContext = createContext<TranslationContextValue | null>(null)

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [detectedLang] = useState(detectLang)
  const [lang, setLang] = usePersistentSetting<Lang>(LANG_KEY, detectedLang, {
    parse: parseLang,
    normalize: parseLang,
    apply: (nextLang) => {
      document.documentElement.lang = localeTag(nextLang)
    },
  })

  const translate = useCallback((key: StringKey): string => t(lang, key), [lang])
  const format = useCallback(
    (key: StringKey, vars?: MessageVars | (string | number)[]) => formatMessage(lang, key, vars),
    [lang],
  )
  const fmtNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) => formatNumber(lang, value, options),
    [lang],
  )
  const fmtDate = useCallback(
    (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => formatDate(lang, value, options),
    [lang],
  )
  const fmtDateTime = useCallback((value: Date | string | number) => formatDateTime(lang, value), [lang])
  const fmtCount = useCallback(
    (count: number, forms: { one: string; other: string }) => formatCount(lang, count, forms),
    [lang],
  )
  const pluralFn = useCallback(
    (count: number, forms: { one: string; other: string }) => plural(lang, count, forms),
    [lang],
  )

  const value = useMemo(
    () => ({
      lang,
      locale: localeTag(lang),
      setLang,
      t: translate,
      format,
      formatNumber: fmtNumber,
      formatDate: fmtDate,
      formatDateTime: fmtDateTime,
      formatCount: fmtCount,
      plural: pluralFn,
    }),
    [lang, setLang, translate, format, fmtNumber, fmtDate, fmtDateTime, fmtCount, pluralFn],
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
