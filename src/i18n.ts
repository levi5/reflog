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
