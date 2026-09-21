import en from "./message/en.json"
import pt from "./message/pt.json"
import type { Lang } from "./types/main"

export type StringKey = keyof typeof pt

const strings: Record<Lang, Record<StringKey, string>> = {
  pt,
  en,
}

export function t(lang: Lang, key: StringKey): string {
  return strings[lang]?.[key] ?? strings.pt?.[key] ?? key
}

export type MessageVars = Record<string, string | number | boolean | null | undefined>

const PLACEHOLDER_RE = /\{(\w+)\}/g

export function formatMessage(lang: Lang, key: StringKey, vars?: MessageVars | (string | number)[]): string {
  let template = t(lang, key)
  if (!vars) return template
  if (Array.isArray(vars)) {
    let replacementIndex = 0
    template = template.replace(/%s/g, () => String(vars[replacementIndex++] ?? ""))
    vars.forEach((value, index) => {
      template = template.split(`{${index}}`).join(String(value ?? ""))
    })
    return template
  }
  return template.replace(PLACEHOLDER_RE, (_match, name: string) => {
    const value = vars[name]
    return value === null || value === undefined ? "" : String(value)
  })
}

const LOCALE_TAG: Record<Lang, string> = {
  pt: "pt-BR",
  en: "en-US",
}

export function localeTag(lang: Lang): string {
  return LOCALE_TAG[lang] ?? "pt-BR"
}

export function detectLocale(): Lang {
  try {
    const candidates: string[] =
      typeof navigator !== "undefined" ? [...(navigator.languages ?? []), navigator.language ?? ""] : []
    for (const raw of candidates) {
      const tag = raw.toLowerCase()
      if (!tag) continue
      if (tag.startsWith("pt")) return "pt"
      if (tag.startsWith("en")) return "en"
    }
  } catch {
    return "pt"
  }
  return "pt"
}

export function formatNumber(lang: Lang, value: number, options?: Intl.NumberFormatOptions): string {
  try {
    return new Intl.NumberFormat(localeTag(lang), options).format(value)
  } catch {
    return String(value)
  }
}

export function formatDate(
  lang: Lang,
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
): string {
  try {
    const date = value instanceof Date ? value : new Date(value)
    return new Intl.DateTimeFormat(localeTag(lang), options).format(date)
  } catch {
    return String(value)
  }
}

export function formatDateTime(lang: Lang, value: Date | string | number): string {
  return formatDate(lang, value, { dateStyle: "medium", timeStyle: "short" })
}

export function plural(lang: Lang, count: number, forms: { one: string; other: string }): string {
  try {
    const rule = new Intl.PluralRules(localeTag(lang)).select(count)
    return rule === "one" ? forms.one : forms.other
  } catch {
    return count === 1 ? forms.one : forms.other
  }
}

export function formatCount(lang: Lang, count: number, forms: { one: string; other: string }): string {
  const formattedCount = formatNumber(lang, count)
  const word = plural(lang, count, forms)
  return `${formattedCount} ${word}`
}
