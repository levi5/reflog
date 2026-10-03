import type { FileStatus } from "../../../../types"
import { describe, expect, it } from "vitest"
import { groupBySection } from "./section-groups"

const file = (path: string, x: string, y: string): FileStatus => ({
  path,
  x,
  y,
  staged: x !== " " && x !== "?" && x !== "!",
  unmerged: x === "U" || y === "U" || (x === "A" && y === "A") || (x === "D" && y === "D"),
})

describe("groupBySection", () => {
  it("puts unmerged files only in conflicts", () => {
    const grouped = groupBySection([file("a.ts", "U", "U")])
    expect(grouped.conflicts.map((entry) => entry.path)).toEqual(["a.ts"])
    expect(grouped.staged).toEqual([])
    expect(grouped.changes).toEqual([])
  })

  it("separates staged-only from worktree-only changes", () => {
    const grouped = groupBySection([
      file("staged.ts", "M", " "),
      file("changed.ts", " ", "M"),
      file("new.ts", "?", "?"),
    ])
    expect(grouped.staged.map((entry) => entry.path)).toEqual(["staged.ts"])
    expect(grouped.changes.map((entry) => entry.path)).toEqual(["changed.ts", "new.ts"])
  })

  it("repeats partially staged files in both sections", () => {
    const grouped = groupBySection([file("both.ts", "M", "M")])
    expect(grouped.staged.map((entry) => entry.path)).toEqual(["both.ts"])
    expect(grouped.changes.map((entry) => entry.path)).toEqual(["both.ts"])
  })

  it("keeps the incoming order inside each section", () => {
    const grouped = groupBySection([file("b.ts", " ", "M"), file("a.ts", " ", "M"), file("c.ts", "A", " ")])
    expect(grouped.changes.map((entry) => entry.path)).toEqual(["b.ts", "a.ts"])
    expect(grouped.staged.map((entry) => entry.path)).toEqual(["c.ts"])
  })

  it("returns empty sections for a clean tree", () => {
    expect(groupBySection([])).toEqual({ conflicts: [], staged: [], changes: [] })
  })
})
