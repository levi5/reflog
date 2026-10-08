import { describe, expect, it } from "vitest"

import { contrastRatio, MIN_TEXT_CONTRAST } from "../../../src/shared/constants/accent"
import { DARK_PANEL_2, LIGHT_PANEL_2, THEME_TOKENS } from "../helpers/tokens"

const THEMES = {
  dark: {
    faint: THEME_TOKENS.dark["--faint"],
    muted: THEME_TOKENS.dark["--muted"],
    green: THEME_TOKENS.dark["--green"],
    grapeBtn: THEME_TOKENS.dark["--grape-btn"],
    onAccent: THEME_TOKENS.dark["--on-accent"],
    borderInput: THEME_TOKENS.dark["--border-input"],
    panel: THEME_TOKENS.dark["--bg-panel"],
    panel2: THEME_TOKENS.dark["--bg-panel2"],
  },
  light: {
    faint: THEME_TOKENS.light["--faint"],
    muted: THEME_TOKENS.light["--muted"],
    green: THEME_TOKENS.light["--green"],
    grapeBtn: THEME_TOKENS.light["--grape-btn"],
    onAccent: THEME_TOKENS.light["--on-accent"],
    borderInput: THEME_TOKENS.light["--border-input"],
    panel: THEME_TOKENS.light["--bg-panel"],
    panel2: THEME_TOKENS.light["--bg-panel2"],
  },
} as const

const WHITE = "#ffffff"

describe("theme text tokens", () => {
  it("--faint reaches AA on both panel surfaces in every theme", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const surface of [theme.panel, theme.panel2]) {
        expect(contrastRatio(theme.faint, surface), `${name} --faint on ${surface}`).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        )
      }
    }
  })

  it("--muted reaches AA on both panel surfaces in every theme", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const surface of [theme.panel, theme.panel2]) {
        expect(contrastRatio(theme.muted, surface), `${name} --muted on ${surface}`).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        )
      }
    }
  })

  it("--green reaches AA on both panel surfaces in every theme", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      for (const surface of [theme.panel, theme.panel2]) {
        expect(contrastRatio(theme.green, surface), `${name} --green on ${surface}`).toBeGreaterThanOrEqual(
          MIN_TEXT_CONTRAST,
        )
      }
    }
  })

  it("primary button labels reach AA on the accent fill", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      expect(
        contrastRatio(theme.onAccent, theme.grapeBtn),
        `${name} --on-accent on --grape-btn`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("form borders are visible against the panel (UI contrast)", () => {
    for (const [name, theme] of Object.entries(THEMES)) {
      expect(
        contrastRatio(theme.borderInput, theme.panel),
        `${name} --border-input on --bg-panel`,
      ).toBeGreaterThanOrEqual(1.5)
    }
  })

  it("keeps the dark panel surfaces distinct from the light ones", () => {
    expect(DARK_PANEL_2).not.toBe(LIGHT_PANEL_2)
    expect(contrastRatio(WHITE, DARK_PANEL_2)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    expect(contrastRatio(WHITE, LIGHT_PANEL_2)).toBeLessThan(MIN_TEXT_CONTRAST)
  })
})
