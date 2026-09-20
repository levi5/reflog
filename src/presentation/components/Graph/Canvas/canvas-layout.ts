import type { CanvasGraphLayout, GraphEdge, GraphNode } from "../../../../domain/entities/graph/graph-layout"
import type { CanvasGeometry, CanvasPoint, EdgeShape } from "../../../../types/components/graph"

export const CANVAS_PADDING = 16
export const LANE_WIDTH = 14
export const ROW_HEIGHT = 44
export const CANVAS_ORIGIN_OFFSET = 20
export const DEFAULT_OVERSCAN_ROWS = 10
const LABEL_GAP = 8
const LABEL_COLUMN_WIDTH = 640
const ROW_ANIMATION_STEP_MS = 20
const MAX_ANIMATION_DELAY_MS = 350

function pointAt(lane: number, row: number): CanvasPoint {
  return {
    x: CANVAS_PADDING + lane * LANE_WIDTH,
    y: CANVAS_PADDING + row * ROW_HEIGHT + ROW_HEIGHT / 2,
  }
}

function buildEdgePath(start: CanvasPoint, end: CanvasPoint): string {
  const controlX = (start.x + end.x) / 2
  return `M ${start.x} ${start.y} C ${controlX} ${start.y} ${controlX} ${end.y} ${end.x} ${end.y}`
}

export function computeCanvasGeometry(layout: CanvasGraphLayout): CanvasGeometry {
  const graphWidth = CANVAS_PADDING * 2 + layout.lanes * LANE_WIDTH
  return {
    labelOffsetX: graphWidth + LABEL_GAP,
    canvasWidth: graphWidth + LABEL_GAP + LABEL_COLUMN_WIDTH,
    canvasHeight: CANVAS_PADDING * 2 + layout.nodes.length * ROW_HEIGHT,
  }
}

export function nodePoint(node: GraphNode): CanvasPoint {
  return pointAt(node.lane, node.row)
}

export function edgeShape(edge: GraphEdge): EdgeShape {
  const start = pointAt(edge.fromLane, edge.fromRow)
  const end = pointAt(edge.toLane, edge.toRow)
  const firstRow = Math.min(edge.fromRow, edge.toRow)
  return {
    path: buildEdgePath(start, end),
    animationDelay: firstRow <= 15 ? Math.min(firstRow * ROW_ANIMATION_STEP_MS, MAX_ANIMATION_DELAY_MS) : 0,
  }
}

export interface VisibleRange {
  startRow: number
  endRow: number
}

export function computeVisibleRange(
  totalRows: number,
  viewportY: number,
  scale: number,
  containerHeight: number,
  overscanRows: number = DEFAULT_OVERSCAN_ROWS,
): VisibleRange {
  if (totalRows <= 0) {
    return { startRow: 0, endRow: -1 }
  }

  const safeScale = scale > 0 ? scale : 1
  const visibleTopY = (0 - (viewportY + CANVAS_ORIGIN_OFFSET)) / safeScale
  const visibleBottomY = (containerHeight - (viewportY + CANVAS_ORIGIN_OFFSET)) / safeScale

  const minY = visibleTopY - overscanRows * ROW_HEIGHT
  const maxY = visibleBottomY + overscanRows * ROW_HEIGHT

  const rawStartRow = Math.floor((minY - CANVAS_PADDING) / ROW_HEIGHT)
  const rawEndRow = Math.ceil((maxY - CANVAS_PADDING) / ROW_HEIGHT)

  if (rawStartRow >= totalRows || rawEndRow < 0) {
    return { startRow: 0, endRow: -1 }
  }

  const startRow = Math.max(0, rawStartRow)
  const endRow = Math.min(totalRows - 1, rawEndRow)

  if (startRow > endRow) {
    return { startRow: 0, endRow: -1 }
  }

  return { startRow, endRow }
}

export function isEdgeVisible(edge: GraphEdge, startRow: number, endRow: number): boolean {
  const minEdgeRow = Math.min(edge.fromRow, edge.toRow)
  const maxEdgeRow = Math.max(edge.fromRow, edge.toRow)
  return maxEdgeRow >= startRow && minEdgeRow <= endRow
}
