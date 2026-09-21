import type { AccentId, AccentOption, Theme } from "../../types"

export const DEFAULT_ACCENT_ID: AccentId = "grape"

export const ACCENT_OPTIONS: AccentOption[] = [
  { id: "grape", dark: "#7c6cff", light: "#5b4ee0" },
  { id: "blue", dark: "#3b82f6", light: "#1d4ed8" },
  { id: "teal", dark: "#4cd7f6", light: "#0b7c6e" },
  { id: "green", dark: "#4edea3", light: "#0e9b66" },
  { id: "amber", dark: "#fbbf24", light: "#9a6200" },
  { id: "red", dark: "#ef4444", light: "#dc2626" },
  { id: "orange", dark: "#fb9234", light: "#ea580c" },
]

export function isAccentId(value: string): value is AccentId {
  return ACCENT_OPTIONS.some((option) => option.id === value)
}

export function isLightTheme(theme: Theme): boolean {
  return theme === "light" || theme === "glass-light"
}

export function resolveAccentHex(accent: AccentId, theme: Theme): string {
  const option = ACCENT_OPTIONS.find((entry) => entry.id === accent) ?? ACCENT_OPTIONS[0]
  return isLightTheme(theme) ? option.light : option.dark
}
