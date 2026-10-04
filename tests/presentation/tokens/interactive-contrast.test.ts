import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { contrastRatio, MIN_TEXT_CONTRAST } from "../../../src/shared/constants/accent"

const GLOBALS = readFileSync(fileURLToPath(new URL("../../../src/styles/globals.scss", import.meta.url)), "utf8")

function blockBody(selector: string): string {
  const start = GLOBALS.indexOf(selector)
  if (start === -1) throw new Error(`seletor nao encontrado: ${selector}`)
  const open = GLOBALS.indexOf("{", start)
  let depth = 0
  for (let index = open; index < GLOBALS.length; index++) {
    if (GLOBALS[index] === "{") depth++
    if (GLOBALS[index] === "}") {
      depth--
      if (depth === 0) return GLOBALS.slice(open + 1, index)
    }
  }
  throw new Error(`bloco nao fechado: ${selector}`)
}

function themeTokens(selector: string): Record<string, string> {
  const raw: Record<string, string> = {}
  for (const line of blockBody(selector).split("\n")) {
    const match = /^\s*(--[\w-]+):\s*(.+?);\s*$/.exec(line)
    if (match) raw[match[1]] = match[2]
  }
  const resolved: Record<string, string> = {}
  const resolve = (name: string): string => {
    if (resolved[name]) return resolved[name]
    const value = raw[name]
    if (value === undefined) return ""
    const ref = /^var\((--[\w-]+)\)$/.exec(value)
    resolved[name] = ref ? resolve(ref[1]) : value
    return resolved[name]
  }
  for (const name of Object.keys(raw)) resolve(name)
  return resolved
}

const DARK = themeTokens(":root,\n[data-theme=dark] {")
const LIGHT = themeTokens("[data-theme=light] {")

interface Rule {
  selectors: string[]
  body: string
  index: number
}

const RULES: Rule[] = (() => {
  const rules: Rule[] = []
  const withoutComments = GLOBALS.replace(/\/\*[\s\S]*?\*\//g, "")
  let index = 0
  while (index < withoutComments.length) {
    const open = withoutComments.indexOf("{", index)
    if (open === -1) break
    const selector = withoutComments.slice(index, open).replace(/\s+/g, " ").trim()
    let depth = 0
    let end = open
    for (; end < withoutComments.length; end++) {
      if (withoutComments[end] === "{") depth++
      if (withoutComments[end] === "}") {
        depth--
        if (depth === 0) break
      }
    }
    if (selector.startsWith("@")) {
      index = end + 1
      continue
    }
    rules.push({
      selectors: selector.split(",").map((part) => part.trim()),
      body: withoutComments.slice(open + 1, end),
      index: rules.length,
    })
    index = end + 1
  }
  return rules
})()

function specificity(selector: string): number[] {
  const flat = selector.replace(/:where\([^)]*\)/g, "").replace(/:(?:not|is|has)\(([^)]*)\)/g, " $1 ")
  const ids = (flat.match(/#[\w-]+/g) ?? []).length
  const classes = (flat.match(/\.[\w-]+/g) ?? []).length + (flat.match(/:(?!:)[\w-]+/g) ?? []).length
  const tags = (flat.replace(/[#.][\w-]+|::?[\w-]+(\([^)]*\))?/g, "").match(/[a-zA-Z][\w-]*/g) ?? []).length
  return [ids, classes, tags]
}

function beats(a: string, b: string): boolean {
  const left = specificity(a)
  const right = specificity(b)
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) return left[i] > right[i]
  }
  return false
}

const HOVER_RULES = RULES.flatMap((rule) =>
  rule.selectors
    .filter((selector) => selector.startsWith("button") && selector.includes(":hover"))
    .map((selector) => ({ selector, body: rule.body })),
)

const RESTING_RULES = RULES.flatMap((rule) =>
  rule.selectors
    .filter((selector) => /^button(\.[\w-]+)?$/.test(selector))
    .map((selector) => ({ selector, body: rule.body })),
)

function declaration(body: string, property: string): string | null {
  const match = new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+)`).exec(body)
  return match ? match[1].trim() : null
}

function hoverBackground(buttonClass: string): string | null {
  let winner: { selector: string; value: string; index: number } | null = null
  const consider = (selector: string, index: number) => {
    const rule = RULES.find((candidate) => candidate.selectors.includes(selector))
    if (!rule) return
    const value = declaration(rule.body, "background")
    if (value === null) return
    if (winner === null || beats(selector, winner.selector)) {
      winner = { selector, value, index }
    } else if (!beats(winner.selector, selector) && index > winner.index) {
      winner = { selector, value, index }
    }
  }
  for (const hover of HOVER_RULES) {
    if (hover.selector.startsWith(`button.${buttonClass}:`) || hover.selector === `button.${buttonClass}`) {
      const rule = RULES.find((candidate) => candidate.selectors.includes(hover.selector))
      if (rule) consider(hover.selector, rule.index)
    }
  }
  consider(
    "button",
    RULES.findIndex((rule) => rule.selectors.includes("button")),
  )
  for (const resting of RESTING_RULES) {
    if (resting.selector === `button.${buttonClass}`) {
      const rule = RULES.find((candidate) => candidate.selectors.includes(resting.selector))
      if (rule) consider(resting.selector, rule.index)
    }
  }
  return winner?.value ?? null
}

const ON_COLOR = ["primary", "push", "success", "complete-btn"]

describe("hover nao troca a cor dos botes", () => {
  it("todo bote com texto --on-primary continua sobre --primary no hover", () => {
    const withOnText = RULES.flatMap((rule) =>
      rule.selectors
        .filter(
          (selector) => /^button\.[\w-]+$/.test(selector) && declaration(rule.body, "color") === "var(--on-primary)",
        )
        .map((selector) => selector.replace("button.", "")),
    )
    expect(new Set(withOnText)).toEqual(new Set(ON_COLOR))
    for (const buttonClass of withOnText) {
      expect(`${buttonClass}: ${hoverBackground(buttonClass)}`, buttonClass).toBeTruthy()
      expect(hoverBackground(buttonClass)).toBe("var(--primary)")
    }
  })

  it("o hover generico nao vence a especificidade dos modificadores", () => {
    const generic = RULES.find((rule) => rule.selectors.includes("button:where(:hover):not(:disabled)"))
    expect(generic).toBeDefined()
    for (const buttonClass of ON_COLOR) {
      expect(beats("button:where(:hover):not(:disabled)", `button.${buttonClass}`)).toBe(false)
    }
  })

  it("push, success e primary clareiam a propria cor no hover", () => {
    for (const buttonClass of ["push", "success", "primary"]) {
      const selector = `button.${buttonClass}:hover:not(:disabled)`
      const rule = RULES.find((candidate) => candidate.selectors.includes(selector))
      expect(rule, selector).toBeDefined()
      expect(declaration(rule?.body ?? "", "filter")).toContain("brightness")
    }
  })

  it("danger usa o container no hover para manter o contraste", () => {
    expect(hoverBackground("danger")).toBe("var(--red-container)")
  })
})

describe("tokens de interacao com contraste AA", () => {
  const THEMES = { dark: DARK, light: LIGHT }

  it("--on-primary sobre --primary", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      const ratio = contrastRatio(tokens["--on-primary"], tokens["--primary"])
      expect(`${name} ${ratio.toFixed(2)}`).toBeTruthy()
      expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--red sobre --red-container e --red-dim", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(`${name} container`, true).toBeTruthy()
      expect(contrastRatio(tokens["--red"], tokens["--red-container"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(`${name} dim ${contrastRatio(tokens["--red"], tokens["--red-dim"]).toFixed(2)}`, true).toBeTruthy()
    }
  })

  it("--fg sobre as superficies de hover e de repouso", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(`${name} hover`, true).toBeTruthy()
      expect(contrastRatio(tokens["--fg"], tokens["--surface-hover"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(contrastRatio(tokens["--fg"], tokens["--surface"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--primary-text sobre as superficies clara e escura", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        `${name} ${contrastRatio(tokens["--primary-text"], tokens["--surface-hover"]).toFixed(2)}`,
        true,
      ).toBeTruthy()
      expect(contrastRatio(tokens["--primary-text"], tokens["--surface-hover"])).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      )
      expect(contrastRatio(tokens["--primary-text"], tokens["--surface"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--muted e --faint sobre --surface-hover", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(`${name} muted`, true).toBeTruthy()
      expect(contrastRatio(tokens["--muted"], tokens["--surface-hover"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(
        `${name} faint ${contrastRatio(tokens["--faint"], tokens["--surface-hover"]).toFixed(2)}`,
        true,
      ).toBeTruthy()
      expect(contrastRatio(tokens["--faint"], tokens["--surface-hover"])).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })
})
