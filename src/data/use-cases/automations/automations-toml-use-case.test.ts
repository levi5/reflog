import { describe, expect, it } from "vitest"
import { AutomationsTomlUseCase } from "./automations-toml-use-case"

const deterministicId = (prefix: string) => `${prefix}-fixed`

describe("AutomationsTomlUseCase", () => {
  it("round-trips serialize/deserialize", () => {
    const useCase = new AutomationsTomlUseCase(deterministicId)
    const recipes = [
      {
        id: "recipe-1",
        name: "demo",
        description: "d",
        repoPath: "/repo",
        variables: ["BRANCH"],
        steps: [{ id: "step-1", when: null, run: { command: "status", target: "repo" as const } }],
      },
    ]
    const monitors = [
      {
        id: "monitor-1",
        name: "mon",
        description: "",
        icon: "Layers",
        color: "var(--accent)",
        repoPath: "/repo",
        path: "",
        trigger: { kind: "manual" as const },
        blocks: [{ id: "block-1", label: "b", icon: "Terminal", color: "var(--accent)", commands: ["status"] }],
      },
    ]
    const toml = useCase.serializeAutomationsToml(recipes, monitors)
    expect(toml).toContain("demo")
    const parsed = useCase.deserializeAutomationsToml(toml)
    expect(parsed.recipes).toHaveLength(1)
    expect(parsed.recipes[0].repoPath).toBe("/repo")
    expect(parsed.monitors).toHaveLength(1)
  })

  it("returns empty on invalid toml", () => {
    const useCase = new AutomationsTomlUseCase(deterministicId)
    expect(useCase.deserializeAutomationsToml("[[[invalid")).toEqual({ recipes: [], monitors: [] })
  })
})
