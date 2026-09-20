export type { ViewTab } from "../../../types/components/templates"

export const TEMPLATES_PER_PAGE = 10

export const TEMPLATE_VARIABLES = [
  { token: "{{header}}", label: "header" },
  { token: "{{type}}", label: "type" },
  { token: "{{scope}}", label: "scope" },
  { token: "{{subject}}", label: "subject" },
  { token: "{{body}}", label: "body" },
  { token: "{{footer}}", label: "footer" },
  { token: "{{breaking}}", label: "breaking (!)" },
  { token: "{{issue}}", label: "issue" },
  { token: "{{coauthor}}", label: "coauthor" },
  { token: "{{branch}}", label: "branch" },
  { token: "{{date}}", label: "date" },
  { token: "{{author}}", label: "author" },
  { token: "{{email}}", label: "email" },
  { token: "{{#body}}{{body}}{{/body}}", label: "#body block" },
  { token: "{{#issue}}Refs: {{issue}}{{/issue}}", label: "#issue block" },
  { token: "{{#footer}}{{footer}}{{/footer}}", label: "#footer block" },
] as const

export function cleanTemplateFileName(rawName: string): string {
  const normalized = rawName.trim().replace(/[^a-zA-Z0-9._-]/g, "-")
  if (normalized.endsWith(".md")) return normalized
  return `${normalized}.md`
}

export function serializeTemplateDoc(name: string, type: string, scope: string, pattern: string): string {
  const headers: string[] = []
  if (name.trim()) headers.push(`name: ${name.trim()}`)
  if (type.trim()) headers.push(`type: ${type.trim()}`)
  if (scope.trim()) headers.push(`scope: ${scope.trim()}`)

  if (headers.length === 0) return pattern
  return `---\n${headers.join("\n")}\n---\n\n${pattern}`
}
