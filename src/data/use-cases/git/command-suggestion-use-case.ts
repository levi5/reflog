import { TEMPLATES } from "../../../shared/constants/gitConsole"
import type { ICommandSuggestionUseCase } from "../../../domain/entities/git/git-console"
import { stripGitPrefix } from "../../../shared/utils/git"

const SUGGESTION_LIMIT = 8

function normalizeCommandInput(commandInput: string): string {
  return stripGitPrefix(commandInput.toLowerCase())
}

function includesQuery(candidate: string, query: string): boolean {
  return candidate.toLowerCase().includes(query)
}

export class CommandSuggestionUseCase implements ICommandSuggestionUseCase {
  suggest(commandInput: string, commandHistory: string[]): string[] {
    const query = normalizeCommandInput(commandInput)
    if (!query) return commandHistory.slice(0, SUGGESTION_LIMIT)

    const matchingTemplates = TEMPLATES.filter((template) => includesQuery(template, query))
    const templateNames = new Set(matchingTemplates.map((template) => template.toLowerCase()))
    const matchingHistory = commandHistory.filter(
      (historyEntry) => includesQuery(historyEntry, query) && !templateNames.has(historyEntry.toLowerCase()),
    )

    return [...matchingTemplates, ...matchingHistory].slice(0, SUGGESTION_LIMIT)
  }
}
