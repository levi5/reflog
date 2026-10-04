import { DARK_TOKENS, LIGHT_TOKENS, token } from "./theme-tokens"

export const DARK_PANEL = token("--bg-panel", "dark")
export const DARK_PANEL_2 = token("--bg-panel2", "dark")
export const LIGHT_PANEL = token("--bg-panel", "light")
export const LIGHT_PANEL_2 = token("--bg-panel2", "light")

export function panelBehind(hex: string): string {
  return hex === LIGHT_PANEL ? LIGHT_PANEL : DARK_PANEL_2
}

export const THEME_TOKENS = { dark: DARK_TOKENS, light: LIGHT_TOKENS }
