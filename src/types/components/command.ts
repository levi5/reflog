import type { KeyboardEvent } from "react"
import type { ConsoleLine, Intent } from "../../domain/entities/git/git-console"

export interface CommandSuggestionList {
  items: string[]
  activeIndex: number
  isOpen: boolean
  onChoose: (item: string) => void
}

export interface CommandInputProps {
  value: string
  running: boolean
  intent: Intent | null
  suggestions: CommandSuggestionList
  onChange: (value: string) => void
  onFocus: () => void
  onBlur: () => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onRequestRun: (command: string) => void
}

export interface CommandSuggestionsProps {
  query: string
  suggestions: CommandSuggestionList
}

export interface CommandIntentHintProps {
  intent: Intent | null
}

export interface CommandLogProps {
  lines: ConsoleLine[]
  onClear: () => void
}

export interface CommandConfirmDialogProps {
  command: string | null
  onCancel: () => void
  onConfirm: () => void
}
