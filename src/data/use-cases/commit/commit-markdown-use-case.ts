import type { CommitFields } from "../../../domain/entities/commit/commit-template"
import type { ICommitMarkdownUseCase, TemplateDoc, TemplateVars } from "../../../domain/entities/commit/commit-markdown"
import { TYPE_FROM_BRANCH } from "../../../shared/constants/commit/commitMarkdown"

const SECTION_RE = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g

export class CommitMarkdownUseCase implements ICommitMarkdownUseCase {
  constructor(
    private readonly formatHeaderFn: (fields: CommitFields) => string = (fieldsToFormat) => {
      const subject = fieldsToFormat.subject.trim()
      const scope = fieldsToFormat.scope.trim().replace(/[()]/g, "")
      const type = fieldsToFormat.type.trim()
      if (type) {
        return `${type}${scope ? `(${scope})` : ""}${fieldsToFormat.breaking ? "!" : ""}: ${subject}`
      }
      if (scope && subject) return `${scope}: ${subject}`
      return subject
    },
  ) {}
  parseTemplateDoc(id: string, name: string, source: TemplateDoc["source"], text: string): TemplateDoc {
    const defaults = { type: "", scope: "" }
    let pattern = text
    if (text.startsWith("---")) {
      const end = text.indexOf("\n---", 3)
      if (end > 0) {
        const head = text.slice(3, end)
        pattern = text.slice(end + 4).replace(/^\n/, "")
        for (const line of head.split("\n")) {
          const sep = line.indexOf(":")
          if (sep < 0) continue
          const key = line.slice(0, sep).trim().toLowerCase()
          const value = line.slice(sep + 1).trim()
          if (key === "name" && value) name = value
          if (key === "type") defaults.type = value
          if (key === "scope") defaults.scope = value
        }
      }
    }
    return { id, name, source, defaults, pattern }
  }

  renderTemplate(pattern: string, vars: TemplateVars): string {
    const withSections = pattern.replace(SECTION_RE, (_sectionMatch, key: string, inner: string) => {
      const sectionValue = vars[key as keyof TemplateVars] ?? ""
      return sectionValue.trim() ? inner : ""
    })
    const filled = withSections.replace(
      /\{\{(\w+)\}\}/g,
      (_placeholder, key: string) => vars[key as keyof TemplateVars] ?? "",
    )
    return filled
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  }

  extractIssue(branch: string): string {
    if (!branch) return ""
    const jira = /([A-Za-z]+-\d+)/.exec(branch)
    if (jira) return jira[1]?.toUpperCase() ?? ""
    const num = /(?:^|[/_-])(\d{2,})(?:[/_-]|$)/.exec(branch)
    return num ? (num[1] ?? "") : ""
  }

  buildVars(fields: CommitFields, auto: { branch: string; author: string; email: string }): TemplateVars {
    return {
      type: fields.type.trim(),
      scope: fields.scope.trim(),
      subject: fields.subject.trim(),
      body: fields.body.trim(),
      footer: fields.footer.trim(),
      breaking: fields.breaking ? "!" : "",
      header: this.formatHeaderFn(fields),
      coauthor: fields.coauthor.trim(),
      branch: auto.branch,
      date: new Date().toISOString().slice(0, 10),
      author: auto.author,
      email: auto.email,
      issue: this.extractIssue(auto.branch),
    }
  }

  inferFromBranch(branch: string): {
    type: string
    scope: string
  } {
    const parts = branch
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)
    const type = parts.find((part) => TYPE_FROM_BRANCH.includes(part.toLowerCase().replace(/[^a-z]/g, "")))
    const norm = type ? type.toLowerCase().replace(/[^a-z]/g, "") : ""
    let scope = ""
    if (parts.length > 1) {
      const idx = type ? parts.indexOf(type) : -1
      const after = idx >= 0 ? parts[idx + 1] : parts[0]
      if (after && after !== type) {
        scope = after
          .replace(/^\d+[-_]?/, "")
          .trim()
          .slice(0, 24)
      }
    }
    return { type: norm, scope }
  }
}
