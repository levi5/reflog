import { _Maybe } from "funcio"
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react"
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
import {
  debounce,
  readVersionedRaw,
  versionedKey,
  writeVersionedRaw,
} from "../../../infrastructure/storage/versioned-storage"
import type { Lang } from "../../../types"

const LANG_KEY = "lang"
export const LANG_STORAGE_KEY = versionedKey(LANG_KEY)
const DEFAULT_LANG: Lang = "pt"

const VALID_LANGS: Record<string, Lang> = {
  pt: "pt",
  en: "en",
}

function readStoredLang(): Lang {
  const stored = readVersionedRaw(LANG_KEY)
  if (stored !== null && VALID_LANGS[stored]) return VALID_LANGS[stored]
  const detected = detectLocale()
  return VALID_LANGS[detected] ?? DEFAULT_LANG
}

const debouncedWriteLang = debounce((lang: Lang) => {
  writeVersionedRaw(LANG_KEY, lang)
}, 300)

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
  const [lang, setLangState] = useState<Lang>(readStoredLang)

  const setLang = useCallback((nextLang: Lang) => {
    const resolved = VALID_LANGS[nextLang] ?? DEFAULT_LANG
    setLangState(resolved)
  }, [])

  useEffect(() => {
    debouncedWriteLang(lang)
    try {
      document.documentElement.lang = localeTag(lang)
    } catch {
      return
    }
  }, [lang])

  useEffect(() => {
    const onStorage = (storageEvent: StorageEvent) => {
      if (storageEvent.key !== LANG_STORAGE_KEY || storageEvent.newValue === null) return
      const next = VALID_LANGS[storageEvent.newValue] ?? DEFAULT_LANG
      setLangState(next)
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

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

export const useLang = useTranslation
export const LangProvider = TranslationProvider

export { _Maybe as _TranslationMaybe }
