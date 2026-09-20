export interface Intent {
  kind: string
  arg: string
}

export interface ConsoleLine {
  cmd: string
  out: string
  err: boolean
  at: number
}

export interface IGitCommandParserUseCase {
  splitArgs(input: string): string[]
  splitChain(input: string): string[]
  stripGitPrefix(raw: string): string
  isDangerousCmd(text: string): boolean
  intentOf(raw: string): Intent | null
}

export interface ICommandSuggestionUseCase {
  suggest(commandInput: string, commandHistory: string[]): string[]
}
