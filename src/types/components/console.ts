import type { KeyboardEvent, ReactNode } from "react"
import type { ConsoleLine, Intent } from "../../domain/entities/git/git-console"
import type { GraphChange } from "../../domain/entities/graph/graph-anim"
import type { CommandSuggestionList } from "./command"

export type ConsoleMode = "term" | "blocks"

export interface ConsoleSession {
  mode: ConsoleMode
  command: string
  lines: ConsoleLine[]
  changes: GraphChange[]
  freshHashes: string[]
  running: boolean
  intent: Intent | null
  suggestions: CommandSuggestionList
  pendingCommand: string | null
  onModeChange: (mode: ConsoleMode) => void
  onCommandChange: (value: string) => void
  onCommandFocus: () => void
  onCommandBlur: () => void
  onCommandKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onRequestRun: (command: string) => void
  onClear: () => void
  onCancelPendingCommand: () => void
  onConfirmPendingCommand: () => void
}

export interface GitConsoleProps {
  session: ConsoleSession
  blocksView?: ReactNode
}
