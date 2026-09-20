import type { KeyboardEvent } from "react"
import { suggestCommands } from "../../../main/adapters"
import { NO_ACTIVE_SUGGESTION } from "../../../shared/constants/limits"

export interface SuggestionState {
  items: string[]
  activeIndex: number
  isOpen: boolean
}

export function buildSuggestions(
  command: string,
  history: string[],
  isFocused: boolean,
  running: boolean,
): SuggestionState {
  const items = suggestCommands(command, history)
  const activeIndex = NO_ACTIVE_SUGGESTION
  return { items, activeIndex, isOpen: isFocused && items.length > 0 && !running }
}

export function moveSuggestionIndex(current: number, length: number, direction: 1 | -1): number {
  if (length === 0) return NO_ACTIVE_SUGGESTION
  if (direction === 1) return Math.min(current + 1, length - 1)
  return current <= 0 ? length - 1 : current - 1
}

export type KeyAction = "down" | "up" | "enter" | "tab" | "escape" | null

export function keyToAction(key: string): KeyAction {
  switch (key) {
    case "ArrowDown":
      return "down"
    case "ArrowUp":
      return "up"
    case "Enter":
      return "enter"
    case "Tab":
      return "tab"
    case "Escape":
      return "escape"
    default:
      return null
  }
}

export function shouldPreventDefault(key: string): boolean {
  return key === "ArrowDown" || key === "ArrowUp" || key === "Tab"
}

export type { KeyboardEvent }
