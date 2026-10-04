import { describe, expect, it } from "vitest"

import {
  contrastRatio,
  ensureContrast,
  MIN_TEXT_CONTRAST,
  readableTextOn,
  relativeLuminance,
} from "../../../src/shared/constants/accent"
import { ACCENT_OPTIONS } from "../../../src/shared/constants/accent"
import { DARK_PANEL, LIGHT_PANEL, panelBehind } from "../helpers/tokens"

describe("accent contrast", () => {
  it("relative luminance matches known values", () => {
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5)
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5)
    expect(relativeLuminance("#000")).toBeCloseTo(relativeLuminance("#000000"), 5)
  })

  it("contrast ratio is symmetric and follows WCAG", () => {
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 5)
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5)
  })

  it("every accent reads as body text on both panel backgrounds", () => {
    const failures: string[] = []
    for (const option of ACCENT_OPTIONS) {
      for (const [label, background] of [
        ["dark", DARK_PANEL],
        ["light", LIGHT_PANEL],
      ] as const) {
        const hex = option[label]
        const ratio = contrastRatio(hex, background)
        if (ratio < MIN_TEXT_CONTRAST) {
          failures.push(`${option.id}/${label}: ${ratio.toFixed(2)}:1`)
        }
      }
    }
    expect(failures).toEqual([])
  })

  it("pick the readable text color for each accent fill", () => {
    for (const option of ACCENT_OPTIONS) {
      for (const hex of [option.dark, option.light]) {
        const on = readableTextOn(hex)
        expect(contrastRatio(on, hex)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      }
    }
  })

  it("ensureContrast reaches AA even for a hostile input", () => {
    for (const bad of ["#ffff00", "#fefefe", "#00ff00", "#777777"]) {
      const on = readableTextOn(bad)
      const fixed = ensureContrast(bad, on, MIN_TEXT_CONTRAST)
      expect(contrastRatio(on, fixed)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("leaves an already-compliant color untouched", () => {
    expect(ensureContrast("#1c1c24", "#ffffff", MIN_TEXT_CONTRAST)).toBe("#1c1c24")
  })

  it("the panel colors the tokens are checked against are themselves sane", () => {
    expect(contrastRatio(panelBehind("#ffffff"), "#ffffff")).toBeLessThan(MIN_TEXT_CONTRAST)
  })
})
