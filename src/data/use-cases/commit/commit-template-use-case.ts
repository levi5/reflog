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

function stripBreakingMarkers(body: string): { body: string; found: boolean } {
  const kept = body.split("\n").filter((line) => !/^\s*BREAKING[ -]CHANGE\s*:?/i.test(line))
  return { body: kept.join("\n").trim(), found: kept.length !== body.split("\n").length }
}

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
        .map((entry) => entry.trim())
        .filter(Boolean)
        .map((name) => `Co-authored-by: ${name}`)
      if (lines.length > 0) parts.push(lines.join("\n"))
    }
    return parts.join("\n\n")
  }

  parseConventional(msg: string): CommitFields {
    if (!msg.trim()) return { ...EMPTY_FIELDS }
    const noEmoji = msg.replace(/^[^\w(]+\s+/, (leading) =>
      /^[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u.test(leading.trim()) ? "" : leading,
    )
    const [head = "", ...rest] = noEmoji.split(/\n\n+/)
    const header = CONVENTIONAL_HEADER_PATTERN.exec(head.trim())
    if (!header) return { ...EMPTY_FIELDS, subject: msg.trim() }
    const [, rawType = "", rawScope = "", bang = "", restSubject = ""] = header
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
    const withoutBreaking = stripBreakingMarkers(split.body)
    return {
      type: rawType,
      scope: (rawScope ?? "").trim(),
      subject: (restSubject ?? "").trim(),
      body: withoutBreaking.body,
      footer: "",
      breaking: bang === "!" || withoutBreaking.found,
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
    const storedPrefs = this.storage.get<Record<string, unknown>>(PREFS_KEY, {})
    const strict = storedPrefs.strict === true
    const useIcons = storedPrefs.useIcons === undefined ? storedPrefs.useEmoji !== false : storedPrefs.useIcons === true
    const storedTemplateId = storedPrefs.templateId
    const templateId =
      typeof storedTemplateId === "string" && storedTemplateId && storedTemplateId !== "default"
        ? storedTemplateId
        : DEFAULT_PREFS.templateId
    return { strict, useIcons, templateId }
  }

  savePrefs(prefs: CommitPrefs): void {
    this.storage.set(PREFS_KEY, prefs)
  }

  loadPresets(): CommitPreset[] {
    const storedPresets = this.storage.get<unknown>(PRESETS_KEY, null)
    if (!Array.isArray(storedPresets)) return [...DEFAULT_PRESETS]

    const validPresets = storedPresets.filter(
      (candidate): candidate is CommitPreset =>
        typeof candidate === "object" &&
        candidate !== null &&
        typeof (candidate as CommitPreset).id === "string" &&
        typeof (candidate as CommitPreset).name === "string",
    )

    return validPresets.length > 0 ? validPresets : [...DEFAULT_PRESETS]
  }

  savePresets(presets: CommitPreset[]): void {
    this.storage.set(PRESETS_KEY, presets)
  }

  loadHistory(): string[] {
    const storedHistory = this.storage.get<unknown>(HISTORY_KEY, [])
    if (!Array.isArray(storedHistory)) return []
    return storedHistory.filter((entry): entry is string => typeof entry === "string").slice(0, MAX_HISTORY)
  }

  pushHistory(msg: string): string[] {
    const input = msg.trim()
    if (!input) return this.loadHistory()
    const next = [input, ...this.loadHistory().filter((entry) => entry !== input)].slice(0, MAX_HISTORY)
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
