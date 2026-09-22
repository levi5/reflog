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
    commits.forEach((c, i) => {
      if (!rowOf.has(c.hash)) rowOf.set(c.hash, i)
    })
    const laneOf = new Map<string, number>()
    const free: number[] = []
    let next = 0
    const alloc = (): number => (free.length > 0 ? (free.pop() as number) : next++)

    const nodes: GraphNode[] = []
    const edges: GraphEdge[] = []

    commits.forEach((c, i) => {
      const lane = laneOf.has(c.hash) ? (laneOf.get(c.hash) as number) : alloc()
      laneOf.delete(c.hash)
      nodes.push({ commit: c, row: i, lane })
      if (c.parents.length === 0) {
        if (!free.includes(lane)) free.push(lane)
        return
      }
      c.parents.forEach((p, pi) => {
        const toRow = rowOf.get(p)
        let target: number
        if (laneOf.has(p)) {
          target = laneOf.get(p) as number
        } else if (toRow !== undefined) {
          target = pi === 0 ? lane : alloc()
          laneOf.set(p, target)
        } else if (pi === 0) {
          target = lane
          laneOf.set(p, target)
        } else {
          return
        }
        edges.push({
          fromLane: lane,
          fromRow: i,
          toLane: target,
          toRow: toRow ?? i + 1,
          merge: c.parents.length > 1,
        })
      })
    })

    return { nodes, edges, lanes: Math.max(next, 1) }
  }
}
