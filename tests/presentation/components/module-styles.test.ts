import { readFileSync, readdirSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const SRC_ROOT = path.resolve(import.meta.dirname ?? ".", "../../../src")

function collectModules(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry)
    return statSync(full).isDirectory() ? collectModules(full) : full.endsWith(".module.scss") ? [full] : []
  })
}

const MODULES = collectModules(SRC_ROOT)

describe("module stylesheets", () => {
  it("finds the module stylesheets to inspect", () => {
    expect(MODULES.length).toBeGreaterThan(40)
  })

  it("never glues a closing brace to the next selector", () => {
    const glued = MODULES.filter((file) => /\}\.[A-Za-z]/.test(readFileSync(file, "utf8"))).map((file) =>
      path.relative(SRC_ROOT, file),
    )
    expect(glued).toEqual([])
  })

  it("keeps two blank lines away and ends with a newline", () => {
    const messy = MODULES.filter((file) => {
      const css = readFileSync(file, "utf8")
      return /\n{3,}/.test(css) || !css.endsWith("\n")
    }).map((file) => path.relative(SRC_ROOT, file))
    expect(messy).toEqual([])
  })
})