import type { CommitFields, CommitPrefs, CommitType } from "../../../domain/entities/commit/commit-template"
export { DEFAULT_PRESETS } from "../../../infrastructure/templates"
import { STANDARD_ID } from "./commitMarkdown"

export const COMMIT_TYPES: readonly CommitType[] = [
  "feat",
  "fix",
  "docs",
  "style",
  "refactor",
  "perf",
  "test",
  "build",
  "ci",
  "chore",
  "revert",
] as const

export const DEFAULT_PREFS: CommitPrefs = {
  strict: false,
  useIcons: true,
  templateId: STANDARD_ID,
}

export const EMPTY_FIELDS: CommitFields = {
  type: "",
  scope: "",
  subject: "",
  body: "",
  footer: "",
  breaking: false,
  coauthor: "",
  signoff: false,
  sign: false,
}

export const PREFS_KEY = "forgegit.commit.prefs"
export const PRESETS_KEY = "forgegit.commit.presets"
export const HISTORY_KEY = "forgegit.commit.history"
export const MAX_HISTORY = 20
export const SUBJECT_LIMIT = 72

export const CONVENTIONAL_HEADER_PATTERN = /^(?:([a-zA-Z]+)(?:\(([^)]*)\))?(!)?:\s*)?(.*)$/
