import type { TemplateDoc, TemplateVars } from "../../domain/entities/commit/commit-markdown"
import type { CommitFields } from "../../domain/entities/commit/commit-template"
import { commitMarkdownUseCase } from "../factories/use-cases/commit-markdown-factory"

export const parseTemplateDoc = (id: string, name: string, source: TemplateDoc["source"], text: string): TemplateDoc =>
  commitMarkdownUseCase.parseTemplateDoc(id, name, source, text)

export const buildVars = (
  fields: CommitFields,
  auto: { branch: string; author: string; email: string },
): TemplateVars => commitMarkdownUseCase.buildVars(fields, auto)

export const renderTemplate = (pattern: string, vars: TemplateVars): string =>
  commitMarkdownUseCase.renderTemplate(pattern, vars)

export const inferFromBranch = (
  branch: string,
): {
  type: string
  scope: string
} => commitMarkdownUseCase.inferFromBranch(branch)
