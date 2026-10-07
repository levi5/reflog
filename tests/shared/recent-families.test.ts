import { describe, expect, it } from "vitest"
import { groupRecentsByFamily } from "../../src/shared/utils/recent-families"

describe("groupRecentsByFamily", () => {
  it("groups nested paths under the shortest root", () => {
    const families = groupRecentsByFamily(["/proj/libs/a", "/outro", "/proj"])
    expect(families).toHaveLength(2)
    expect(families[0]).toEqual({ root: "/proj", name: "proj", paths: ["/proj", "/proj/libs/a"] })
    expect(families[1]).toEqual({ root: "/outro", name: "outro", paths: ["/outro"] })
  })

  it("orders families by the newest member and root first inside", () => {
    const families = groupRecentsByFamily(["/proj/libs/b", "/solo", "/proj/libs/a", "/proj"])
    expect(families.map((family) => family.root)).toEqual(["/proj", "/solo"])
    expect(families[0].paths).toEqual(["/proj", "/proj/libs/a", "/proj/libs/b"])
  })

  it("does not group siblings sharing only a name prefix", () => {
    const families = groupRecentsByFamily(["/proj", "/proj-other"])
    expect(families).toHaveLength(2)
  })

  it("handles windows separators, trailing slashes and case", () => {
    const families = groupRecentsByFamily(["C:\\Proj\\libs\\a", "c:/proj/"])
    expect(families).toHaveLength(1)
    expect(families[0].paths).toEqual(["c:/proj/", "C:\\Proj\\libs\\a"])
  })

  it("dedupes and ignores blanks", () => {
    const families = groupRecentsByFamily(["/a", "  ", "/a", "/a/b"])
    expect(families).toEqual([{ root: "/a", name: "a", paths: ["/a", "/a/b"] }])
  })
})
