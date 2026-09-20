import { GitCommandParserUseCase } from "../../../data/use-cases/git/command-parser-use-case"
import { CommandSuggestionUseCase } from "../../../data/use-cases/git/command-suggestion-use-case"

export const makeGitCommandParserUseCase = (): GitCommandParserUseCase => {
  return new GitCommandParserUseCase()
}

export const makeCommandSuggestionUseCase = (): CommandSuggestionUseCase => {
  return new CommandSuggestionUseCase()
}

export const gitCommandParserUseCase = makeGitCommandParserUseCase()
export const commandSuggestionUseCase = makeCommandSuggestionUseCase()
