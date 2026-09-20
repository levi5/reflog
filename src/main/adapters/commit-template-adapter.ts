import type {
  CommitFields,
  CommitOpts,
  CommitPrefs,
  CommitPreset,
  LintCode,
} from "../../domain/entities/commit/commit-template"
import { commitTemplateUseCase } from "../factories/use-cases/commit-template-factory"

export const formatHeader = (f: CommitFields): string => commitTemplateUseCase.formatHeader(f)
export const formatCommit = (f: CommitFields): string => commitTemplateUseCase.formatCommit(f)
export const parseConventional = (msg: string): CommitFields => commitTemplateUseCase.parseConventional(msg)
export const parseCommitMessage = (msg: string): CommitFields => commitTemplateUseCase.parseCommitMessage(msg)
export const lintCommit = (f: CommitFields, prefs?: CommitPrefs): LintCode[] =>
  commitTemplateUseCase.lintCommit(f, prefs)
export const loadPrefs = (): CommitPrefs => commitTemplateUseCase.loadPrefs()
export const savePrefs = (p: CommitPrefs): void => commitTemplateUseCase.savePrefs(p)
export const loadPresets = (): CommitPreset[] => commitTemplateUseCase.loadPresets()
export const savePresets = (p: CommitPreset[]): void => commitTemplateUseCase.savePresets(p)
export const loadHistory = (): string[] => commitTemplateUseCase.loadHistory()
export const pushHistory = (msg: string): string[] => commitTemplateUseCase.pushHistory(msg)
export const clearHistory = (): void => commitTemplateUseCase.clearHistory()
export const setLastCommitOpts = (o: CommitOpts): void => commitTemplateUseCase.setLastCommitOpts(o)
export const getLastCommitOpts = (): CommitOpts => commitTemplateUseCase.getLastCommitOpts()
