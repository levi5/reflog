import type { SelectOption } from "../../Select"

export type ResetMode = "soft" | "mixed" | "hard"
export type ResetLabelKey = "resetSoft" | "resetMixed" | "resetHard"

const RESET_MODE_LABELS: Record<ResetMode, ResetLabelKey> = {
  soft: "resetSoft",
  mixed: "resetMixed",
  hard: "resetHard",
}

export const RESET_MODES = Object.keys(RESET_MODE_LABELS) as ResetMode[]

export function resetLabelKey(mode: ResetMode): ResetLabelKey {
  return RESET_MODE_LABELS[mode]
}

export function buildResetModeOptions(translate: (key: ResetLabelKey) => string): SelectOption[] {
  return RESET_MODES.map((mode) => ({ value: mode, label: translate(RESET_MODE_LABELS[mode]) }))
}
