import { describe, expect, it } from "vitest"
import { fuzzyMatch } from "./fuzzy"

describe("fuzzyMatch", () => {
  it("matches empty query against anything", () => {
    expect(fuzzyMatch("", "staging")).toBe(true)
    expect(fuzzyMatch("   ", "staging")).toBe(true)
  })

  it("matches prefixes and substrings", () => {
    expect(fuzzyMatch("stag", "Stage all changes")).toBe(true)
    expect(fuzzyMatch("push", "Push changes")).toBe(true)
  })

  it("matches non-contiguous subsequences", () => {
    expect(fuzzyMatch("stl", "Stage all")).toBe(true)
    expect(fuzzyMatch("mrg", "Merge branch")).toBe(true)
  })

  it("is case-insensitive", () => {
    expect(fuzzyMatch("STAG", "staging")).toBe(true)
  })

  it("rejects out-of-order characters", () => {
    expect(fuzzyMatch("gats", "staging")).toBe(false)
    expect(fuzzyMatch("xyz", "staging")).toBe(false)
  })
})
