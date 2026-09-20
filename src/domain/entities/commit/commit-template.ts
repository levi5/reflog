export type CommitType =
  | "feat"
  | "fix"
  | "docs"
  | "style"
  | "refactor"
  | "perf"
  | "test"
  | "build"
  | "ci"
  | "chore"
  | "revert"

export interface CommitFields {
  type: string
  scope: string
  subject: string
  body: string
  footer: string
  breaking: boolean
  coauthor: string
  signoff: boolean
  sign: boolean
}

export interface CommitOpts {
  signoff: boolean
  sign: boolean
}

export interface CommitPrefs {
  strict: boolean
  useIcons: boolean
  templateId: string
}

export interface CommitPreset {
  id: string
  name: string
  type: string
  scope: string
  subject: string
  body: string
  footer: string
}

export type LintCode = "subjectEmpty" | "subjectTooLong" | "subjectPeriod" | "typeRequired"

export interface ICommitTemplateUseCase {
  formatHeader(f: CommitFields): string
  formatCommit(f: CommitFields): string
  parseConventional(msg: string): CommitFields
  parseCommitMessage(msg: string): CommitFields
  lintCommit(f: CommitFields, prefs?: CommitPrefs): LintCode[]
  loadPrefs(): CommitPrefs
  savePrefs(p: CommitPrefs): void
  loadPresets(): CommitPreset[]
  savePresets(p: CommitPreset[]): void
  loadHistory(): string[]
  pushHistory(msg: string): string[]
  clearHistory(): void
  setLastCommitOpts(o: CommitOpts): void
  getLastCommitOpts(): CommitOpts
}
