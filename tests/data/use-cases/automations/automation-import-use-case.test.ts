import { describe, expect, it } from "vitest"
import { readAutomationImport } from "../../../../src/data/use-cases/automations/automation-import-use-case"

describe("readAutomationImport", () => {
  const recipe = { id: "recipe-1", name: "Status", repo_path: "/repo", steps: [{ command: "status" }] }

  it("accepts a legacy JSON recipe list and normalizes its steps", () => {
    const result = readAutomationImport(JSON.stringify([recipe]), "recipes.json")
    expect(result.recipes[0]).toMatchObject({
      id: "recipe-1",
      repoPath: "/repo",
      steps: [{ run: { command: "status", target: "repo" } }],
    })
    expect(result.aliases).toEqual([])
    expect(result.monitors).toEqual([])
    expect(result.shortcuts).toEqual([])
  })

  it("preserves all supported JSON collections and filters invalid entries", () => {
    const result = readAutomationImport(
      JSON.stringify({
        recipes: [recipe, null],
        aliases: [{ name: "st", expansion: "status" }, null],
        monitors: [{ id: "monitor-1", name: "Status", blocks: [] }, null],
        shortcuts: [{ id: "shortcut-1", targetId: "recipe-1", targetType: "recipe", color: "#123456" }, null],
      }),
      "automations.json",
    )
    expect(result.recipes).toHaveLength(1)
    expect(result.aliases).toEqual([{ name: "st", expansion: "status" }])
    expect(result.monitors).toHaveLength(1)
    expect(result.shortcuts).toEqual([
      { id: "shortcut-1", targetId: "recipe-1", targetType: "recipe", color: "#123456" },
    ])
  })

  it("recognizes uppercase TOML extensions and imports recipes and monitors", () => {
    const result = readAutomationImport(
      `
[[recipe]]
id = "recipe-1"
name = "Status"
repo_path = "/repo"
[[recipe.step]]
[recipe.step.run]
command = "status"
target = "repo"

[[monitor]]
id = "monitor-1"
name = "Monitor"
blocks = []
`,
      "automations.TOML",
    )
    expect(result.recipes[0]).toMatchObject({ id: "recipe-1", repoPath: "/repo" })
    expect(result.recipes[0].steps[0].run.command).toBe("status")
    expect(result.monitors[0].id).toBe("monitor-1")
    expect(result.aliases).toEqual([])
    expect(result.shortcuts).toEqual([])
  })

  it("propagates malformed JSON so the UI can report an import error", () => {
    expect(() => readAutomationImport("{", "recipes.json")).toThrow()
  })
})
