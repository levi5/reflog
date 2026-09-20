import { docsEnContent, docsEnFigureLabels } from "./en"
import { docsPtContent, docsPtFigureLabels } from "./pt"
import type { DocsContentByLang, FigureLabelsByLang } from "./types"

export * from "./types"
export * from "./pt"
export * from "./en"

export const DOCS_FIGURE_LABELS: FigureLabelsByLang = {
  pt: docsPtFigureLabels,
  en: docsEnFigureLabels,
}

export const DOCS_CONTENT: DocsContentByLang = {
  pt: docsPtContent,
  en: docsEnContent,
}

export const FIG_LABELS = DOCS_FIGURE_LABELS
export const CONTENT = DOCS_CONTENT
