import type { Intent } from "../../domain/entities/git/git-console"
import { commandSuggestionUseCase, gitCommandParserUseCase } from "../factories/use-cases/git-command-factory"

export const splitArgs = (input: string): string[] => gitCommandParserUseCase.splitArgs(input)
export const splitChain = (input: string): string[] => gitCommandParserUseCase.splitChain(input)
export const stripGitPrefix = (raw: string): string => gitCommandParserUseCase.stripGitPrefix(raw)
export const isDangerousCmd = (text: string): boolean => gitCommandParserUseCase.isDangerousCmd(text)
export const intentOf = (raw: string): Intent | null => gitCommandParserUseCase.intentOf(raw)

export const suggestCommands = (commandInput: string, commandHistory: string[]): string[] =>
  commandSuggestionUseCase.suggest(commandInput, commandHistory)
