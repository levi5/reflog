import type { CommitFields } from "./commit-template"

export interface TemplateDefaults {
  type: string
  scope: string
}

export interface TemplateDoc {
  id: string
  name: string
  source: "builtin" | "repo"
  defaults: TemplateDefaults
  pattern: string
}

export interface TemplateVars {
  type: string
  scope: string
  subject: string
  body: string
  footer: string
  breaking: string
  header: string
  coauthor: string
  branch: string
  date: string
  author: string
  email: string
  issue: string
}

export interface ICommitMarkdownUseCase {
  parseTemplateDoc(id: string, name: string, source: TemplateDoc["source"], text: string): TemplateDoc
  renderTemplate(pattern: string, vars: TemplateVars): string
  buildVars(fields: CommitFields, auto: { branch: string; author: string; email: string }): TemplateVars
  extractIssue(branch: string): string
  inferFromBranch(branch: string): { type: string; scope: string }
}
