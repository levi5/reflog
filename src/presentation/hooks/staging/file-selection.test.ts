import { describe, expect, it } from "vitest"
import { applyRange, pruneChecked, rangeBetween, toggleChecked } from "./file-selection"

describe("toggleChecked", () => {
  it("adds a missing path and removes a present one", () => {
    expect([...toggleChecked(new Set(), "a")]).toEqual(["a"])
    expect([...toggleChecked(new Set(["a", "b"]), "a")]).toEqual(["b"])
  })

  it("does not mutate the input set", () => {
    const current = new Set(["a"])
    toggleChecked(current, "b")
    expect([...current]).toEqual(["a"])
  })
})

describe("rangeBetween", () => {
  const ordered = ["a", "b", "c", "d"]

  it("returns the inclusive slice in either direction", () => {
    expect(rangeBetween(ordered, "b", "d")).toEqual(["b", "c", "d"])
    expect(rangeBetween(ordered, "d", "b")).toEqual(["b", "c", "d"])
    expect(rangeBetween(ordered, "c", "c")).toEqual(["c"])
  })

  it("returns empty when an endpoint is unknown", () => {
    expect(rangeBetween(ordered, "a", "z")).toEqual([])
    expect(rangeBetween(ordered, "z", "a")).toEqual([])
  })
})

describe("applyRange", () => {
  it("adds or removes a batch", () => {
    expect([...applyRange(new Set(["a"]), ["b", "c"], true)]).toEqual(["a", "b", "c"])
    expect([...applyRange(new Set(["a", "b"]), ["a", "b"], false)]).toEqual([])
  })
})

describe("pruneChecked", () => {
  it("drops paths that no longer exist", () => {
    expect([...pruneChecked(new Set(["a", "gone"]), ["a", "b"])]).toEqual(["a"])
  })
})
