import { describe, expect, it } from "vitest"
import {
  collectValidAliases,
  collectValidMonitors,
  collectValidRecipes,
  collectValidShortcuts,
  isImportableMonitor,
  isImportableRecipe,
  normalizeImportedBlock,
  normalizeImportedMonitor,
  normalizeImportedRecipe,
  normalizeImportedStep,
  parseAutomationTarget,
  parseCondition,
  parseImportPayload,
  parseMonitorTrigger,
  parseTomlPayload,
} from "./automation-codec"

const seqId = (prefix: string) => `${prefix}-test-1`

describe("parseAutomationTarget", () => {
  it("accepts repo and all-submodules", () => {
    expect(parseAutomationTarget("repo")).toBe("repo")
    expect(parseAutomationTarget("all-submodules")).toBe("all-submodules")
  })
  it("accepts submodule object", () => {
    expect(parseAutomationTarget({ submodule: "libs/a" })).toEqual({ submodule: "libs/a" })
  })
  it("falls back to repo", () => {
    expect(parseAutomationTarget("bogus")).toBe("repo")
    expect(parseAutomationTarget(undefined)).toBe("repo")
  })
})

describe("parseCondition", () => {
  it("parses kinds with arg", () => {
    expect(parseCondition({ kind: "branch-exists", arg: "main" })).toEqual({ kind: "branch-exists", arg: "main" })
    expect(parseCondition({ kind: "command-ok", arg: "status" })).toEqual({ kind: "command-ok", arg: "status" })
  })
  it("parses clean without arg", () => {
    expect(parseCondition({ kind: "clean", arg: "" })).toEqual({ kind: "clean" })
    expect(parseCondition({ kind: "submodule-ready", arg: "" })).toEqual({ kind: "submodule-ready" })
  })
  it("rejects unknown kinds", () => {
    expect(parseCondition({ kind: "nope", arg: "x" })).toBeNull()
    expect(parseCondition(null)).toBeNull()
  })
})

describe("parseMonitorTrigger", () => {
  it("parses manual and on-enter", () => {
    expect(parseMonitorTrigger({ kind: "manual" })).toEqual({ kind: "manual" })
    expect(parseMonitorTrigger({ kind: "on-enter", path: "src" })).toEqual({ kind: "on-enter", path: "src" })
  })
  it("uses default path", () => {
    expect(parseMonitorTrigger({ kind: "on-enter", path: "" }, "fallback")).toEqual({
      kind: "on-enter",
      path: "fallback",
    })
  })
  it("falls back to manual", () => {
    expect(parseMonitorTrigger("bogus")).toEqual({ kind: "manual" })
    expect(parseMonitorTrigger("manual")).toEqual({ kind: "manual" })
  })
})

describe("normalizeImportedStep", () => {
  it("creates default for non-record", () => {
    const step = normalizeImportedStep(null, seqId)
    expect(step.run).toEqual({ command: "", target: "repo" })
    expect(step.when).toBeNull()
  })
  it("supports top-level command and run.command", () => {
    expect(normalizeImportedStep({ command: "status" }, seqId).run.command).toBe("status")
    expect(normalizeImportedStep({ run: { command: "log", target: "repo" } }, seqId).run.command).toBe("log")
  })
  it("requires non-empty else command", () => {
    const withElse = normalizeImportedStep({ run: { command: "a", target: "repo" }, else: { command: "  " } }, seqId)
    expect(withElse.else).toBeUndefined()
  })
})

describe("normalizeImportedRecipe", () => {
  it("supports repo_path and step singular", () => {
    const recipe = normalizeImportedRecipe(
      { name: "r", repo_path: "/x", step: [{ run: { command: "status", target: "repo" } }] },
      seqId,
    )
    expect(recipe.repoPath).toBe("/x")
    expect(recipe.steps).toHaveLength(1)
  })
  it("supports repoPath and steps plural", () => {
    const recipe = normalizeImportedRecipe({ name: "r", repoPath: "/y", steps: [] }, seqId)
    expect(recipe.repoPath).toBe("/y")
  })
})

describe("normalizeImportedBlock/Monitor", () => {
  it("applies fallbacks", () => {
    const block = normalizeImportedBlock({}, seqId)
    expect(block.icon).toBeTruthy()
    expect(block.commands).toEqual([])
  })
  it("supports block singular", () => {
    const monitor = normalizeImportedMonitor({ name: "m", block: [{ label: "b", commands: ["status"] }] }, seqId)
    expect(monitor.blocks).toHaveLength(1)
  })
})

describe("guards and collectors", () => {
  it("isImportable checks name", () => {
    expect(isImportableRecipe({ name: "  " })).toBe(false)
    expect(isImportableRecipe({ name: "ok" })).toBe(true)
    expect(isImportableMonitor({ name: "" })).toBe(false)
  })
  it("collects only valid", () => {
    expect(collectValidRecipes([{ name: "a" }, { name: "" }], seqId)).toHaveLength(1)
    expect(collectValidMonitors([{ name: "m" }], seqId)).toHaveLength(1)
    expect(collectValidAliases([{ name: "a", expansion: "status" }, { name: "" }])).toHaveLength(1)
    expect(collectValidShortcuts([{ targetId: "x", targetType: "recipe" }], seqId)).toHaveLength(1)
  })
})

describe("payloads", () => {
  it("parseImportPayload handles array and singletons", () => {
    expect(parseImportPayload(JSON.stringify([{ name: "a" }]))).toEqual({
      recipes: [{ name: "a" }],
      aliases: [],
      monitors: [],
      shortcuts: [],
    })
    const single = parseImportPayload(JSON.stringify({ steps: [], name: "r" }))
    expect(single.recipes).toHaveLength(1)
  })
  it("parseTomlPayload handles single object vs array", () => {
    expect(parseTomlPayload({ recipe: { name: "a" } }).recipes).toHaveLength(1)
    expect(parseTomlPayload({ monitor: [{ name: "m" }] }).monitors).toHaveLength(1)
    expect(parseTomlPayload(null)).toEqual({ recipes: [], monitors: [] })
  })
})
