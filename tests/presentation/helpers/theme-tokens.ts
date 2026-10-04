import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"

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

export const DARK_TOKENS = themeTokens(":root,\n[data-theme=dark] {")
export const LIGHT_TOKENS = themeTokens("[data-theme=light] {")

export function token(name: string, theme: "dark" | "light"): string {
  const value = theme === "dark" ? DARK_TOKENS[name] : LIGHT_TOKENS[name]
  if (!value) throw new Error(`token ausente em globals.scss: ${name} (${theme})`)
  return value
}
