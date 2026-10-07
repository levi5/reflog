import { describe, expect, it } from "vitest"
import { buildFileTree, filterTree } from "../../../src/presentation/components/Explorer/build-file-tree"

describe("buildFileTree", () => {
  it("groups tracked files into folders with dirs first", () => {
    const tree = buildFileTree(["src/a.ts", "src/b.ts", "README.md"], [])
    expect(tree.map((node) => node.name)).toEqual(["src", "README.md"])
    const src = tree[0]
    expect(src.isDir).toBe(true)
    expect(src.children.map((child) => child.name)).toEqual(["a.ts", "b.ts"])
  })

  it("attaches status badges for changed files including untracked", () => {
    const tree = buildFileTree(
      ["src/a.ts"],
      [
        { path: "src/a.ts", x: "M", y: " ", staged: true, unmerged: false },
        { path: "new.txt", x: "?", y: "?", staged: false, unmerged: false },
      ],
    )
    const flat: string[] = []
    const walk = (nodes: typeof tree) => {
      for (const node of nodes) {
        flat.push(node.path)
        if (node.isDir) walk(node.children)
      }
    }
    walk(tree)
    expect(flat).toContain("new.txt")
    expect(flat).toContain("src/a.ts")
  })

  it("filters by query keeping parent dirs", () => {
    const tree = buildFileTree(["src/a.ts", "src/b.ts"], [])
    const filtered = filterTree(tree, "b.ts")
    expect(filtered).toHaveLength(1)
    expect(filtered[0].name).toBe("src")
    expect(filtered[0].children.map((child) => child.name)).toEqual(["b.ts"])
  })
})
