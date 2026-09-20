import {
  COMMIT_TYPES,
  CONVENTIONAL_HEADER_PATTERN,
  DEFAULT_PRESETS,
  DEFAULT_PREFS,
  EMPTY_FIELDS,
  HISTORY_KEY,
  MAX_HISTORY,
  PREFS_KEY,
  PRESETS_KEY,
  SUBJECT_LIMIT,
} from "../../../shared/constants/commit/commitTemplate"
import type {
  CommitFields,
  CommitOpts,
  CommitPrefs,
  CommitPreset,
  ICommitTemplateUseCase,
  LintCode,
} from "../../../domain/entities/commit/commit-template"
import type { IStorage } from "../../protocols/storage"
import { localStorageAdapter } from "../../../infrastructure/storage"

export class CommitTemplateUseCase implements ICommitTemplateUseCase {
  private lastOpts: CommitOpts = { signoff: false, sign: false }

  constructor(private readonly storage: IStorage = localStorageAdapter) {}

  private splitCoauthors(body: string): { body: string; coauthor: string } {
    const found: string[] = []
    const rest = body
      .split("\n")
      .filter((line) => {
        const match = /^co-authored-by:\s*(.+)\s*$/i.exec(line.trim())
        if (match) {
          found.push(match[1]?.trim() ?? "")
          return false
        }
        return true
      })
      .join("\n")
      .trim()
    return { body: rest, coauthor: found.filter(Boolean).join(", ") }
  }

  formatHeader(f: CommitFields): string {
    const subject = f.subject.trim()
    const scope = f.scope.trim().replace(/[()]/g, "")
    const type = f.type.trim()
    if (type) {
      return `${type}${scope ? `(${scope})` : ""}${f.breaking ? "!" : ""}: ${subject}`
    }
    if (scope && subject) {
      return `${scope}: ${subject}`
    }
    return subject
  }

  formatCommit(f: CommitFields): string {
    const parts = [this.formatHeader(f)]
    const body = f.body.trim()
    if (body) parts.push(body)
    let footer = f.footer.trim()
    if (f.breaking && !/breaking change:/i.test(footer)) {
      footer = footer ? `BREAKING CHANGE: ${footer}` : "BREAKING CHANGE"
    }
    if (footer) parts.push(footer)
    if (f.coauthor.trim()) {
      const lines = f.coauthor
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((name) => `Co-authored-by: ${name}`)
      if (lines.length > 0) parts.push(lines.join("\n"))
    }
    return parts.join("\n\n")
  }

  parseConventional(msg: string): CommitFields {
    if (!msg.trim()) return { ...EMPTY_FIELDS }
    const noEmoji = msg.replace(/^[^\w(]+\s+/, (m) =>
      /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(m.trim()) ? "" : m,
    )
    const [head = "", ...rest] = noEmoji.split(/\n\n+/)
    const m = CONVENTIONAL_HEADER_PATTERN.exec(head.trim())
    if (!m) return { ...EMPTY_FIELDS, subject: msg.trim() }
    const [, rawType = "", rawScope = "", bang = "", restSubject = ""] = m
    const known = (COMMIT_TYPES as readonly string[]).includes(rawType)
    if (!rawType || !known) {
      const split = this.splitCoauthors(rest.join("\n\n").trim())
      return {
        ...EMPTY_FIELDS,
        subject: head.trim(),
        body: split.body,
        coauthor: split.coauthor,
      }
    }
    const split = this.splitCoauthors(rest.join("\n\n").trim())
    return {
      type: rawType,
      scope: (rawScope ?? "").trim(),
      subject: (restSubject ?? "").trim(),
      body: split.body,
      footer: "",
      breaking: bang === "!",
      coauthor: split.coauthor,
      signoff: false,
      sign: false,
    }
  }

  parseCommitMessage(msg: string): CommitFields {
    return this.parseConventional(msg)
  }

  lintCommit(f: CommitFields, prefs?: CommitPrefs): LintCode[] {
    const out: LintCode[] = []
    if (!f.subject.trim()) out.push("subjectEmpty")
    if (f.subject.trim().length > SUBJECT_LIMIT) out.push("subjectTooLong")
    if (/\.\s*$/.test(f.subject.trim())) out.push("subjectPeriod")
    if (prefs?.strict && !f.type.trim()) out.push("typeRequired")
    return out
  }

  loadPrefs(): CommitPrefs {
    const p = this.storage.get<Record<string, unknown>>(PREFS_KEY, {})
    const strict = p.strict === true
    const useIcons = p.useIcons === undefined ? p.useEmoji !== false : p.useIcons === true
    const templateId =
      typeof p.templateId === "string" && p.templateId && p.templateId !== "default"
        ? p.templateId
        : DEFAULT_PREFS.templateId
    return { strict, useIcons, templateId }
  }

  savePrefs(p: CommitPrefs): void {
    this.storage.set(PREFS_KEY, p)
  }

  loadPresets(): CommitPreset[] {
    const arr = this.storage.get<unknown>(PRESETS_KEY, null)
    if (!Array.isArray(arr)) return [...DEFAULT_PRESETS]

    const validPresets = arr.filter(
      (v): v is CommitPreset =>
        typeof v === "object" &&
        v !== null &&
        typeof (v as CommitPreset).id === "string" &&
        typeof (v as CommitPreset).name === "string",
    )

    return validPresets.length > 0 ? validPresets : [...DEFAULT_PRESETS]
  }

  savePresets(p: CommitPreset[]): void {
    this.storage.set(PRESETS_KEY, p)
  }

  loadHistory(): string[] {
    const arr = this.storage.get<unknown>(HISTORY_KEY, [])
    if (!Array.isArray(arr)) return []
    return arr.filter((v): v is string => typeof v === "string").slice(0, MAX_HISTORY)
  }

  pushHistory(msg: string): string[] {
    const input = msg.trim()
    if (!input) return this.loadHistory()
    const next = [input, ...this.loadHistory().filter((h) => h !== input)].slice(0, MAX_HISTORY)
    this.storage.set(HISTORY_KEY, next)
    return next
  }

  clearHistory(): void {
    this.storage.remove(HISTORY_KEY)
  }

  setLastCommitOpts(o: CommitOpts): void {
    this.lastOpts.signoff = o.signoff
    this.lastOpts.sign = o.sign
  }

  getLastCommitOpts(): CommitOpts {
    return { ...this.lastOpts }
  }
}
