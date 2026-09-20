import { describe, expect, it } from "vitest"
import type { AutomationRecipe, MonitorAutomation } from "../../../../src/domain/entities/automations/automations"
import { AutomationsTomlUseCase } from "../../../../src/data/use-cases/automations/automations-toml-use-case"

describe("AutomationsTomlUseCase", () => {
  const useCase = new AutomationsTomlUseCase()

  const sampleRecipe: AutomationRecipe = {
    id: "rec-1",
    name: "Deploy Production",
    description: "Deploy current branch to prod",
    repoPath: "/path/to/repo",
    variables: ["ENV=prod"],
    steps: [
      {
        id: "step-1",
        when: null,
        run: { command: "git pull", target: "repo" },
      },
    ],
  }

  const sampleMonitor: MonitorAutomation = {
    id: "mon-1",
    name: "Repo Status",
    description: "Checks uncommitted changes",
    icon: "Activity",
    color: "#3b82f6",
    repoPath: "/path/to/repo",
    path: "/path/to/repo",
    trigger: {
      kind: "manual",
    },
    blocks: [
      {
        id: "blk-1",
        label: "Status",
        icon: "Terminal",
        color: "#10b981",
        commands: ["status -s"],
      },
    ],
  }

  it("serializes and deserializes recipes and monitors roundtrip", () => {
    const tomlString = useCase.serializeAutomationsToml([sampleRecipe], [sampleMonitor])
    expect(typeof tomlString).toBe("string")
    expect(tomlString).toContain("Deploy Production")
    expect(tomlString).toContain("Repo Status")

    const result = useCase.deserializeAutomationsToml(tomlString)
    expect(result.recipes).toHaveLength(1)
    expect(result.recipes[0].name).toBe("Deploy Production")
    expect(result.recipes[0].steps).toHaveLength(1)
    expect(result.recipes[0].steps[0].run.command).toBe("git pull")

    expect(result.monitors).toHaveLength(1)
    expect(result.monitors[0].name).toBe("Repo Status")
    expect(result.monitors[0].blocks).toHaveLength(1)
    expect(result.monitors[0].blocks[0].commands).toEqual(["status -s"])
  })

  it("handles invalid toml gracefully without crashing", () => {
    const result = useCase.deserializeAutomationsToml("this is not valid toml = = =")
    expect(result).toEqual({ recipes: [], monitors: [] })
  })

  it("handles empty string gracefully", () => {
    const result = useCase.deserializeAutomationsToml("")
    expect(result).toEqual({ recipes: [], monitors: [] })
  })
})
