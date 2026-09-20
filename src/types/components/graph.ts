import type { PointerEvent as ReactPointerEvent, RefObject, WheelEvent as ReactWheelEvent } from "react"
import type { CanvasGraphLayout } from "../../domain/entities/graph/graph-layout"
import type { CommitFileChange, CommitInfo } from "../../types"

export interface CanvasPoint {
  x: number
  y: number
}

export interface CanvasGeometry {
  labelOffsetX: number
  canvasWidth: number
  canvasHeight: number
}

export interface EdgeShape {
  path: string
  animationDelay: number
}

export interface GraphViewport {
  scale: number
  position: CanvasPoint
  containerRef: RefObject<HTMLDivElement | null>
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  centerOn: (point: CanvasPoint) => void
  onWheel: (event: ReactWheelEvent<HTMLElement>) => void
  onPanStart: (event: ReactPointerEvent<HTMLElement>) => void
  onPanMove: (event: ReactPointerEvent<HTMLElement>) => void
  onPanEnd: () => void
}

export interface HeadTravel {
  fromHash: string
  toHash: string
  key: string
}

export interface GraphCanvasProps {
  layout: CanvasGraphLayout
  geometry: CanvasGeometry
  viewport: GraphViewport
  headHash: string
  freshHashes: string[]
  dimmedHashes: ReadonlySet<string>
  matchedHashes: ReadonlySet<string>
  activeMatchHash: string
  spotlightHashes: ReadonlySet<string>
  headTravel: HeadTravel | null
  isRunning: boolean
  selectedHash: string
  onSelectCommit: (commitHash: string) => void
}

export interface VisualizeGraph {
  layout: CanvasGraphLayout
  geometry: CanvasGeometry
  headHash: string
  dimmedHashes: ReadonlySet<string>
  matchedHashes: string[]
  selectedCommit: CommitInfo | null
}

export interface GraphViewerProps {
  graph: VisualizeGraph
  viewport: GraphViewport
  freshHashes: string[]
  matchedHashes: ReadonlySet<string>
  activeMatchHash: string
  spotlightHashes: ReadonlySet<string>
  headTravel: HeadTravel | null
  isRunning: boolean
  errorKey: number
  selectedHash: string
  onSelectCommit: (commitHash: string) => void
  onCherryPick?: (hash: string) => void
  onRevert?: (hash: string) => void
  onReset?: (hash: string, mode: "soft" | "mixed" | "hard") => void
  onCheckout?: (hash: string) => void
  loadFiles?: (hash: string) => Promise<CommitFileChange[]>
  loadDiff?: (hash: string, file?: string) => Promise<string>
  isLoading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
}
