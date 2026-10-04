import { describe, expect, it } from "vitest"

import { commitMarkdownUseCase, commitTemplateUseCase } from "../../../../src/data"
import { BUILTIN_DOCS } from "../../../../src/shared/constants/commit/commitMarkdown"
import { EMPTY_FIELDS } from "../../../../src/shared/constants/commit/commitTemplate"
import type { CommitFields } from "../../../../src/domain/entities/commit/commit-template"

const auto = { branch: "feature/PROJ-123-x", author: "Dev", email: "dev@x.io" }

const states: [string, CommitFields][] = [
  ["vazio", { ...EMPTY_FIELDS }],
  ["so type", { ...EMPTY_FIELDS, type: "feat" }],
  ["type+subject", { ...EMPTY_FIELDS, type: "feat", subject: "abc" }],
  ["type+scope+subject", { ...EMPTY_FIELDS, type: "feat", scope: "api", subject: "abc" }],
  ["breaking", { ...EMPTY_FIELDS, type: "feat", subject: "abc", breaking: true }],
  ["body", { ...EMPTY_FIELDS, type: "feat", subject: "abc", body: "linha 1" }],
  ["footer", { ...EMPTY_FIELDS, type: "feat", subject: "abc", footer: "Refs: 1" }],
  ["coauthor", { ...EMPTY_FIELDS, type: "feat", subject: "abc", coauthor: "Dev" }],
]

const reparse = (template: (typeof BUILTIN_DOCS)[number], fields: CommitFields): string => {
  if (!template.pattern) return commitTemplateUseCase.formatCommit(fields)
  return commitMarkdownUseCase.renderTemplate(template.pattern, commitMarkdownUseCase.buildVars(fields, auto))
}

describe("format -> parse -> format converge", () => {
  it("o commit padrao nao muda a mensagem ao reparsear", () => {
    for (const [label, fields] of states) {
      const once = commitTemplateUseCase.formatCommit(fields)
      const twice = commitTemplateUseCase.formatCommit(commitTemplateUseCase.parseConventional(once))
      expect(`${label}: ${JSON.stringify(once)}`).toBe(`${label}: ${JSON.stringify(twice)}`)
    }
  })

  for (const template of BUILTIN_DOCS.filter((doc) => doc.id !== "builtin:jira")) {
    it(`o template ${template.id} nao muda a mensagem ao reparsear`, () => {
      for (const [label, fields] of states) {
        const once = reparse(template, fields)
        const twice = reparse(template, commitTemplateUseCase.parseConventional(once))
        expect(`${label}: ${JSON.stringify(once)}`).toBe(`${label}: ${JSON.stringify(twice)}`)
      }
    })
  }

  it("o BREAKING CHANGE no corpo vira flag e nao duplica", () => {
    const parsed = commitTemplateUseCase.parseConventional("feat!: abc\n\nBREAKING CHANGE")
    expect(parsed.breaking).toBe(true)
    expect(parsed.body).toBe("")
    expect(commitTemplateUseCase.formatCommit(parsed)).toBe("feat!: abc\n\nBREAKING CHANGE")
  })
})
