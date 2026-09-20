import type { Lang } from "../../../types"

export type FigureKind = "merge" | "commit" | "template" | "rebase"

export interface FigureLabels {
  merge: string
  resolve: string
  done: string
  type: string
  scope: string
  subject: string
  template: string
  message: string
  rebase: string
  linear: string
}

export interface DocSection {
  id: string
  title: string
  steps: string[]
  code?: string
  figure?: FigureKind
}

export interface DocsContent {
  intro: string
  sections: DocSection[]
}

export type DocsContentByLang = Record<Lang, DocsContent>
export type FigureLabelsByLang = Record<Lang, FigureLabels>
