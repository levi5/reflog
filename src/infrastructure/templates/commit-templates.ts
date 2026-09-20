import type { TemplateDoc } from "../../domain/entities/commit/commit-markdown"
import type { CommitPreset } from "../../domain/entities/commit/commit-template"

export const CONVENTIONAL_ID = "builtin:conventional"
export const JIRA_ID = "builtin:jira"
export const STANDARD_ID = CONVENTIONAL_ID

export const BUILTIN_DOCS: TemplateDoc[] = [
  {
    id: CONVENTIONAL_ID,
    name: "conventional",
    source: "builtin",
    defaults: { type: "feat", scope: "" },
    pattern: "{{header}}\n\n{{#body}}{{body}}\n\n{{/body}}{{#footer}}{{footer}}{{/footer}}",
  },
  {
    id: JIRA_ID,
    name: "jira",
    source: "builtin",
    defaults: { type: "feat", scope: "" },
    pattern:
      "{{header}}\n\n{{#body}}{{body}}\n\n{{/body}}{{#footer}}{{footer}}\n\n{{/footer}}{{#issue}}Jira: {{issue}}{{/issue}}",
  },
]

export const EXAMPLE_TEMPLATE = `---
name: jira-issue
type: feat
scope: core
---

{{header}}

{{#body}}{{body}}

{{/body}}{{#issue}}Jira: {{issue}}
{{/issue}}{{#footer}}{{footer}}{{/footer}}
`

export const DEFAULT_PRESETS: CommitPreset[] = [
  {
    id: "feat",
    name: "Feature",
    type: "feat",
    scope: "",
    subject: "",
    body: "",
    footer: "",
  },
  {
    id: "fix",
    name: "Bug Fix",
    type: "fix",
    scope: "",
    subject: "",
    body: "",
    footer: "",
  },
  {
    id: "docs",
    name: "Documentation",
    type: "docs",
    scope: "",
    subject: "",
    body: "",
    footer: "",
  },
  {
    id: "refactor",
    name: "Refactor",
    type: "refactor",
    scope: "",
    subject: "",
    body: "",
    footer: "",
  },
  {
    id: "chore",
    name: "Maintenance",
    type: "chore",
    scope: "",
    subject: "",
    body: "",
    footer: "",
  },
]
