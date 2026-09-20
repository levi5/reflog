import { describe, expect, it } from "vitest"
import { SemverUseCase } from "../../../../src/data/use-cases/semver/semver-use-case"

describe("SemverUseCase", () => {
  const useCase = new SemverUseCase()

  it("returns null for empty tag list", () => {
    expect(useCase.suggestNextVersions([])).toBeNull()
  })

  it("returns null for invalid semver tags", () => {
    expect(useCase.suggestNextVersions(["latest", "beta-1", "random-text"])).toBeNull()
  })

  it("suggests next patch, minor, and major versions from standard semver", () => {
    const next = useCase.suggestNextVersions(["1.0.0", "1.2.3", "0.9.0"])
    expect(next).toEqual({
      base: "1.2.3",
      patch: "1.2.4",
      minor: "1.3.0",
      major: "2.0.0",
    })
  })

  it("preserves 'v' prefix when present on the highest version tag", () => {
    const next = useCase.suggestNextVersions(["v1.0.0", "v2.4.9", "v0.1.0"])
    expect(next).toEqual({
      base: "v2.4.9",
      patch: "v2.4.10",
      minor: "v2.5.0",
      major: "v3.0.0",
    })
  })

  it("correctly compares versions numerically rather than alphabetically", () => {
    const next = useCase.suggestNextVersions(["v1.9.0", "v1.10.0"])
    expect(next).not.toBeNull()
    expect(next?.base).toBe("v1.10.0")
    expect(next?.patch).toBe("v1.10.1")
    expect(next?.minor).toBe("v1.11.0")
    expect(next?.major).toBe("v2.0.0")
  })
})
