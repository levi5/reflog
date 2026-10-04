import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  ACCENT_OPTIONS,
  contrastRatio,
  ensureContrast,
  MIN_TEXT_CONTRAST,
  readableTextOn,
  resolveAccentHex,
} from "../../../src/shared/constants/accent"
import { DARK_TOKENS, LIGHT_TOKENS } from "../helpers/theme-tokens"

const THEMES = { dark: DARK_TOKENS, light: LIGHT_TOKENS } as const
const ACCENT_FILLED = ["--primary", "--blue"] as const
const ACCENT_TINTED = ["--link", "--primary-text", "--violet"] as const
const ACCENT_DEEP = ["--purple"] as const

describe("aliasesThatFollowTheAccent", () => {
  it("resolve to the accent fill instead of a fixed brand color", () => {
    for (const [theme, tokens] of Object.entries(THEMES)) {
      for (const name of ACCENT_FILLED) {
        expect(`${theme} ${name} -> ${tokens[name]}`).toBe(`${theme} ${name} -> ${tokens["--grape-btn"]}`)
      }
      for (const name of ACCENT_TINTED) {
        expect(`${theme} ${name} -> ${tokens[name]}`).toBe(`${theme} ${name} -> ${tokens["--grape"]}`)
      }
      for (const name of ACCENT_DEEP) {
        expect(`${theme} ${name} -> ${tokens[name]}`).toBe(`${theme} ${name} -> ${tokens["--grape-deep"]}`)
      }
    }
  })

  it("read the text color from the accent so labels stay readable", () => {
    for (const [theme, tokens] of Object.entries(THEMES)) {
      expect(`${theme} ${tokens["--on-primary"]}`).toBe(`${theme} ${tokens["--on-accent"]}`)
      expect(tokens["--violet-container"]).toBe(tokens["--grape-deep"])
      expect(tokens["--violet-dim"]).toBe(tokens["--grape-dim"])
    }
  })

  it("are never literal hex colors, so they cannot drift from the accent", () => {
    for (const [theme, tokens] of Object.entries(THEMES)) {
      for (const name of [...ACCENT_FILLED, ...ACCENT_TINTED, ...ACCENT_DEEP, "--on-primary"]) {
        expect(`${theme} ${name} = ${tokens[name]}`).not.toMatch(/^#[0-9a-f]{3,8}$/i)
      }
    }
  })
})

describe("accentFillForEveryAccent", () => {
  it("keeps --on-primary readable over the primary fill the tokens resolve to", () => {
    const failures: string[] = []
    for (const option of ACCENT_OPTIONS) {
      for (const theme of ["dark", "light"] as const) {
        const hex = resolveAccentHex(option.id, theme)
        const on = readableTextOn(hex)
        const fill = ensureContrast(hex, on, MIN_TEXT_CONTRAST)
        const ratio = contrastRatio(on, fill)
        if (ratio < MIN_TEXT_CONTRAST) {
          failures.push(`${option.id}/${theme}: ${ratio.toFixed(2)}:1`)
        }
      }
    }
    expect(failures).toEqual([])
  })
})

describe("nativeControlAccent", () => {
  const globals = readFileSync(fileURLToPath(new URL("../../../src/styles/globals.scss", import.meta.url)), "utf8")

  it("paints native inputs with the accent so unstyled checkboxes follow the theme", () => {
    const inputsBlock = /input,\s*\ntextarea,\s*\nselect\s*\{([^}]*)\}/.exec(globals)
    expect(inputsBlock).not.toBeNull()
    expect(inputsBlock?.[1]).toMatch(/accent-color:\s*var\(--accent\)/)
  })

  it("keeps the per-file checkbox rule on the same variable", () => {
    const fileStyles = readFileSync(
      fileURLToPath(new URL("../../../src/presentation/components/Status/File/style.module.scss", import.meta.url)),
      "utf8",
    )
    const rule = /\.fcheck\s*\{([^}]*)\}/.exec(fileStyles)
    expect(rule?.[1]).toMatch(/accent-color:\s*var\(--accent\)/)
  })
})
