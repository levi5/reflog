import { describe, expect, it } from "vitest"

import { lruSet } from "../../../src/presentation/hooks/ui/lru"

describe("lruSet", () => {
  it("stores the value under the key", () => {
    const cache = new Map<string, string>()
    lruSet(cache, "a", "1", 3)
    expect(cache.get("a")).toBe("1")
    expect(cache.size).toBe(1)
  })

  it("evicts the oldest entry past the limit", () => {
    const cache = new Map<string, string>()
    lruSet(cache, "a", "1", 2)
    lruSet(cache, "b", "2", 2)
    lruSet(cache, "c", "3", 2)
    expect(cache.has("a")).toBe(false)
    expect([...cache.keys()]).toEqual(["b", "c"])
  })

  it("moves a rewritten key to the end without growing", () => {
    const cache = new Map<string, string>()
    lruSet(cache, "a", "1", 2)
    lruSet(cache, "b", "2", 2)
    lruSet(cache, "a", "9", 2)
    expect([...cache.keys()]).toEqual(["b", "a"])
    expect(cache.get("a")).toBe("9")
  })

  it("keeps the newest entry when the limit is one", () => {
    const cache = new Map<string, string>()
    lruSet(cache, "a", "1", 1)
    lruSet(cache, "b", "2", 1)
    expect([...cache.keys()]).toEqual(["b"])
  })
})
