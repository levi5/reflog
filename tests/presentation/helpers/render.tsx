import type { ReactElement } from "react"
import { renderToString } from "react-dom/server"
import { TranslationProvider } from "../../../src/presentation/context/translation/translation-context"

export interface RenderOptions {
  lang?: "pt" | "en"
  navigatorLanguages?: string[]
}

export function withProviders(node: ReactElement, options: RenderOptions = {}): ReactElement {
  const { lang = "en", navigatorLanguages = ["pt-BR"] } = options
  const previous = globalThis.navigator
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      ...previous,
      languages: [lang === "pt" ? "pt-BR" : "en-US", ...navigatorLanguages],
      language: lang === "pt" ? "pt-BR" : "en-US",
    },
  })
  return <TranslationProvider>{node}</TranslationProvider>
}

export function renderString(node: ReactElement, options: RenderOptions = {}): string {
  return renderToString(withProviders(node, options))
}
