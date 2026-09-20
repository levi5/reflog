import type { ConsoleLine } from "../../../domain/entities/git/git-console"
import { COMMAND_HISTORY_LIMIT, CONSOLE_TAIL_LENGTH, EMPTY_OUTPUT_PLACEHOLDER } from "../../../shared/constants/limits"
import { BRANCH_LIST_FLAGS, READ_ONLY } from "../../../shared/constants/gitConsole"

export function appendConsoleLine(previousLines: ConsoleLine[], nextLine: ConsoleLine): ConsoleLine[] {
  return [...previousLines.slice(-CONSOLE_TAIL_LENGTH), nextLine]
}

export function buildConsoleLine(commandText: string, output: string, isError: boolean): ConsoleLine {
  return { cmd: commandText, out: output || EMPTY_OUTPUT_PLACEHOLDER, err: isError, at: Date.now() }
}

export function recordCommandHistory(previousHistory: string[], commandText: string): string[] {
  return [commandText, ...previousHistory.filter((entry) => entry !== commandText)].slice(0, COMMAND_HISTORY_LIMIT)
}

export function isReadOnlyCommand(args: string[]): boolean {
  const [verb = "", ...flags] = args
  if (READ_ONLY.has(verb)) return true
  if (verb !== "branch") return false
  return flags.length === 0 || flags.some((flag) => BRANCH_LIST_FLAGS.includes(flag))
}
