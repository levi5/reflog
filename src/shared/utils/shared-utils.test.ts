import { describe, expect, it } from "vitest"
import { newId } from "./id"
import { pushRecentEntry, removeRecentEntry } from "./recents"
import { mergeById, mergeByName } from "../../data/use-cases/automations/automations-use-case"

describe("newId", () => {
  it("prefixes and uniquifies", () => {
    const a = newId("recipe")
    const b = newId("recipe")
    expect(a.startsWith("recipe-")).toBe(true)
    expect(a).not.toBe(b)
  })
})

describe("recents", () => {
  it("pushes to front without duplicates", () => {
    expect(pushRecentEntry(["/b", "/a"], "/a")).toEqual(["/a", "/b"])
  })
  it("removes entries", () => {
    expect(removeRecentEntry(["/a", "/b"], "/a")).toEqual(["/b"])
  })
})

describe("merge helpers", () => {
  it("mergeById upserts", () => {
    expect(mergeById([{ id: "1", v: 1 }], [{ id: "1", v: 2 }])).toEqual([{ id: "1", v: 2 }])
  })
  it("mergeByName upserts", () => {
    expect(mergeByName([{ name: "a" }], [{ name: "a" }, { name: "b" }])).toHaveLength(2)
  })
})
