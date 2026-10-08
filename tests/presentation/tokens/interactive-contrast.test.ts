import { describe, expect, it } from "vitest"

import { contrastRatio, MIN_TEXT_CONTRAST } from "../../../src/shared/constants/accent"
import { flattenColor } from "../helpers/colors"
import { readGlobalStyles } from "../helpers/source-files"

const GLOBALS = readGlobalStyles()

function blockBody(selector: string): string {
  const start = GLOBALS.indexOf(selector)
  if (start === -1) throw new Error(`selector not found: ${selector}`)
  const open = GLOBALS.indexOf("{", start)
  let depth = 0
  for (let index = open; index < GLOBALS.length; index++) {
    if (GLOBALS[index] === "{") depth++
    if (GLOBALS[index] === "}") {
      depth--
      if (depth === 0) return GLOBALS.slice(open + 1, index)
    }
  }
  throw new Error(`unclosed block: ${selector}`)
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

interface HoverCandidate {
  selector: string
  value: string
  index: number
}

function hoverBackground(buttonClass: string): string | null {
  const winner: { current: HoverCandidate | null } = { current: null }
  const consider = (selector: string, index: number) => {
    const rule = RULES.find((candidate) => candidate.selectors.includes(selector))
    if (!rule) return
    const value = declaration(rule.body, "background")
    if (value === null) return
    const current = winner.current
    const wins =
      current === null ||
      beats(selector, current.selector) ||
      (!beats(current.selector, selector) && index > current.index)
    if (wins) winner.current = { selector, value, index }
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
  return winner.current?.value ?? null
}

const ON_COLOR = ["primary", "push", "success", "complete-btn"]

describe("hover does not change button color", () => {
  it("every button with --on-primary text stays on --primary on hover", () => {
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

  it("generic hover does not beat modifier specificity", () => {
    const generic = RULES.find((rule) => rule.selectors.includes("button:where(:hover):not(:disabled)"))
    expect(generic).toBeDefined()
    for (const buttonClass of ON_COLOR) {
      expect(beats("button:where(:hover):not(:disabled)", `button.${buttonClass}`)).toBe(false)
    }
  })

  it("push, success and primary lighten their own color on hover", () => {
    for (const buttonClass of ["push", "success", "primary"]) {
      const selector = `button.${buttonClass}:hover:not(:disabled)`
      const rule = RULES.find((candidate) => candidate.selectors.includes(selector))
      expect(rule, selector).toBeDefined()
      expect(declaration(rule?.body ?? "", "filter")).toContain("brightness")
    }
  })

  it("danger uses the container on hover to keep contrast", () => {
    expect(hoverBackground("danger")).toBe("var(--red-container)")
  })
})

describe("interaction tokens with AA contrast", () => {
  const THEMES = { dark: DARK, light: LIGHT }

  it("--on-primary on --primary", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        contrastRatio(tokens["--on-primary"], tokens["--primary"]),
        `${name} --on-primary on --primary`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--red on --red-container and --red-dim", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        contrastRatio(tokens["--red"], tokens["--red-container"]),
        `${name} --red on --red-container`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(
        contrastRatio(tokens["--red"], flattenColor(tokens["--red-dim"], tokens["--bg-panel"])),
        `${name} --red on --red-dim`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--fg on hover and resting surfaces", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        contrastRatio(tokens["--fg"], tokens["--surface-hover"]),
        `${name} --fg on --surface-hover`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(contrastRatio(tokens["--fg"], tokens["--surface"]), `${name} --fg on --surface`).toBeGreaterThanOrEqual(
        MIN_TEXT_CONTRAST,
      )
    }
  })

  it("--primary-text on light and dark surfaces", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        contrastRatio(tokens["--primary-text"], tokens["--surface-hover"]),
        `${name} --primary-text on --surface-hover`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(
        contrastRatio(tokens["--primary-text"], tokens["--surface"]),
        `${name} --primary-text on --surface`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })

  it("--muted and --faint on --surface-hover", () => {
    for (const [name, tokens] of Object.entries(THEMES)) {
      expect(
        contrastRatio(tokens["--muted"], tokens["--surface-hover"]),
        `${name} --muted on --surface-hover`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
      expect(
        contrastRatio(tokens["--faint"], tokens["--surface-hover"]),
        `${name} --faint on --surface-hover`,
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST)
    }
  })
})
