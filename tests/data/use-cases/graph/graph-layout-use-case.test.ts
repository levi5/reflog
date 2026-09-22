import { describe, expect, it } from "vitest"
import { GraphLayoutUseCase } from "../../../../src/data/use-cases/graph/graph-layout-use-case"
import type { CommitInfo } from "../../../../src/types"

function commit(hash: string, parents: string[] = []): CommitInfo {
  return { hash, short: hash.slice(0, 7), author: "dev", date: "2026-09-19", message: hash, parents, refs: [] }
}

describe("GraphLayoutUseCase", () => {
  const useCase = new GraphLayoutUseCase()

  it("lays out a linear chain on a single lane", () => {
    const layout = useCase.layoutGraph([commit("a", ["b"]), commit("b", ["c"]), commit("c")])
    expect(layout.lanes).toBe(1)
    expect(layout.nodes.map((n) => n.lane)).toEqual([0, 0, 0])
    expect(layout.edges).toHaveLength(2)
  })

  it("draws a stub edge when the parent is outside the loaded window", () => {
    const layout = useCase.layoutGraph([commit("a", ["missing"])])
    expect(layout.lanes).toBe(1)
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0]).toMatchObject({ fromLane: 0, fromRow: 0, toLane: 0, toRow: 1 })
  })

  it("does not leak a lane for a merge parent outside the loaded window", () => {
    const layout = useCase.layoutGraph([commit("m", ["a", "missing"]), commit("a")])
    expect(layout.lanes).toBe(1)
    expect(layout.edges).toHaveLength(1)
    expect(layout.edges[0]).toMatchObject({ fromRow: 0, toRow: 1 })
  })

  it("keeps both lanes for a merge with all parents loaded", () => {
    const layout = useCase.layoutGraph([commit("m", ["a", "b"]), commit("a"), commit("b")])
    expect(layout.lanes).toBe(2)
    expect(layout.edges).toHaveLength(2)
  })
})
