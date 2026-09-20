import { describe, expect, it } from "vitest"
import { ConflictResolverUseCase } from "../../../../src/data/use-cases/conflict/conflict-resolver-use-case"

describe("ConflictResolverUseCase", () => {
  const useCase = new ConflictResolverUseCase()

  const sampleConflict = [
    "line 1",
    "<<<<<<< HEAD",
    "feature change",
    "=======",
    "main change",
    ">>>>>>> main",
    "line 2",
  ].join("\n")

  const diff3Conflict = [
    "top",
    "<<<<<<< HEAD",
    "current change",
    "||||||| base",
    "ancestor content",
    "=======",
    "incoming change",
    ">>>>>>> feat",
    "bottom",
  ].join("\n")

  it("parses 2-way conflict blocks correctly", () => {
    const blocks = useCase.parseConflicts(sampleConflict)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].current_label).toBe("HEAD")
    expect(blocks[0].incoming_label).toBe("main")
    expect(blocks[0].current).toEqual(["feature change"])
    expect(blocks[0].incoming).toEqual(["main change"])
    expect(blocks[0].is_diff3).toBe(false)
  })

  it("parses diff3 3-way conflict blocks with base", () => {
    const blocks = useCase.parseConflicts(diff3Conflict)
    expect(blocks).toHaveLength(1)
    expect(blocks[0].is_diff3).toBe(true)
    expect(blocks[0].base).toEqual(["ancestor content"])
    expect(blocks[0].current).toEqual(["current change"])
    expect(blocks[0].incoming).toEqual(["incoming change"])
  })

  it("applies 'current' choice correctly", () => {
    const blocks = useCase.parseConflicts(sampleConflict)
    const result = useCase.applyChoiceToContent(sampleConflict, blocks[0], "current")
    expect(result).toBe(["line 1", "feature change", "line 2"].join("\n"))
  })

  it("applies 'incoming' choice correctly", () => {
    const blocks = useCase.parseConflicts(sampleConflict)
    const result = useCase.applyChoiceToContent(sampleConflict, blocks[0], "incoming")
    expect(result).toBe(["line 1", "main change", "line 2"].join("\n"))
  })

  it("applies 'both' choice correctly", () => {
    const blocks = useCase.parseConflicts(sampleConflict)
    const result = useCase.applyChoiceToContent(sampleConflict, blocks[0], "both")
    expect(result).toBe(["line 1", "feature change", "main change", "line 2"].join("\n"))
  })

  it("applies 'neither' choice correctly", () => {
    const blocks = useCase.parseConflicts(sampleConflict)
    const result = useCase.applyChoiceToContent(sampleConflict, blocks[0], "neither")
    expect(result).toBe(["line 1", "line 2"].join("\n"))
  })

  it("blockChoices resolves by block id", () => {
    const resolved = useCase.blockChoices(sampleConflict, 0, "incoming")
    expect(resolved).toBe(["line 1", "main change", "line 2"].join("\n"))
  })

  it("returns clean content unchanged if no conflicts exist", () => {
    const clean = "hello world\nall good"
    expect(useCase.parseConflicts(clean)).toEqual([])
  })
})
