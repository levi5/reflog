import type { CommitInfo } from "../../../types"
import type {
  CanvasGraphLayout,
  GraphEdge,
  GraphNode,
  IGraphLayoutUseCase,
} from "../../../domain/entities/graph/graph-layout"
import { CANVAS_LANE_COLORS } from "../../../shared/constants/graphLayout"

export class GraphLayoutUseCase implements IGraphLayoutUseCase {
  laneColor(lane: number): string {
    return CANVAS_LANE_COLORS[lane % CANVAS_LANE_COLORS.length] ?? "var(--grape)"
  }

  layoutGraph(commits: CommitInfo[]): CanvasGraphLayout {
    const rowOf = new Map<string, number>()
    commits.forEach((commit, commitIndex) => {
      if (!rowOf.has(commit.hash)) rowOf.set(commit.hash, commitIndex)
    })
    const laneOf = new Map<string, number>()
    const free: number[] = []
    let next = 0
    const alloc = (): number => (free.length > 0 ? (free.pop() as number) : next++)

    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    commits.forEach((commit, commitIndex) => {
      const lane = laneOf.has(commit.hash) ? (laneOf.get(commit.hash) as number) : alloc()
      laneOf.delete(commit.hash)
      nodes.push({ commit, row: commitIndex, lane })
      if (commit.parents.length === 0) {
        if (!free.includes(lane)) free.push(lane)
        return
      }
      commit.parents.forEach((parentHash, parentIndex) => {
        const toRow = rowOf.get(parentHash)
        let target: number
        if (laneOf.has(parentHash)) {
          target = laneOf.get(parentHash) as number
        } else if (toRow !== undefined) {
          target = parentIndex === 0 ? lane : alloc()
          laneOf.set(parentHash, target)
        } else if (parentIndex === 0) {
          target = lane
          laneOf.set(parentHash, target)
        } else {
          return
        }
        edges.push({
          fromLane: lane,
          fromRow: commitIndex,
          toLane: target,
          toRow: toRow ?? commitIndex + 1,
          merge: commit.parents.length > 1,
        })
      })
    })

    return { nodes, edges, lanes: Math.max(next, 1) }
  }
}
