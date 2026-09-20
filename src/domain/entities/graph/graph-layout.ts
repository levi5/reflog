import type { CommitInfo } from "../../../types"

export interface GraphNode {
  commit: CommitInfo
  row: number
  lane: number
}

export interface GraphEdge {
  fromLane: number
  fromRow: number
  toLane: number
  toRow: number
  merge: boolean
}

export interface CanvasGraphLayout {
  nodes: GraphNode[]
  edges: GraphEdge[]
  lanes: number
}

export interface IGraphLayoutUseCase {
  laneColor(lane: number): string
  layoutGraph(commits: CommitInfo[]): CanvasGraphLayout
}
