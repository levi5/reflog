import { localStorageAdapter } from "../infrastructure/storage"
import {
  AutomationsTomlUseCase,
  AutomationsUseCase,
  BlameParserUseCase,
  CodeHighlightUseCase,
  CommandSuggestionUseCase,
  CommitGraphUseCase,
  CommitMarkdownUseCase,
  CommitTemplateUseCase,
  ConflictResolverUseCase,
  DiffParserUseCase,
  GitCommandParserUseCase,
  GraphAnimUseCase,
  GraphLayoutUseCase,
  MergeStatsUseCase,
  ProfileManagerUseCase,
  SemverUseCase,
} from "./use-cases"

export * from "./use-cases"

export const automationsUseCase = new AutomationsUseCase()
export const automationsTomlUseCase = new AutomationsTomlUseCase()
export const blameParserUseCase = new BlameParserUseCase()
export const codeHighlightUseCase = new CodeHighlightUseCase()
export const commitGraphUseCase = new CommitGraphUseCase()
export const commitMarkdownUseCase = new CommitMarkdownUseCase()
export const commitTemplateUseCase = new CommitTemplateUseCase(localStorageAdapter)
export const commandSuggestionUseCase = new CommandSuggestionUseCase()
export const conflictResolverUseCase = new ConflictResolverUseCase()
export const diffParserUseCase = new DiffParserUseCase()
export const gitCommandParserUseCase = new GitCommandParserUseCase()
export const graphAnimUseCase = new GraphAnimUseCase()
export const graphLayoutUseCase = new GraphLayoutUseCase()
export const mergeStatsUseCase = new MergeStatsUseCase()
export const profileManagerUseCase = new ProfileManagerUseCase(localStorageAdapter)
export const semverUseCase = new SemverUseCase()
