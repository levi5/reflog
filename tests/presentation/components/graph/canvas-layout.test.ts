import { describe, expect, it } from "vitest"
import {
  CANVAS_ORIGIN_OFFSET,
  CANVAS_PADDING,
  ROW_HEIGHT,
  computeCanvasGeometry,
  computeVisibleRange,
  edgeShape,
  isEdgeVisible,
  nodePoint,
} from "../../../../src/presentation/components/Graph/Canvas/canvas-layout"
import type { CanvasGraphLayout, GraphEdge, GraphNode } from "../../../../src/domain/entities/graph/graph-layout"
import type { CommitInfo } from "../../../../src/types"

function makeDummyCommit(hash: string, message: string): CommitInfo {
  return {
    hash,
    short: hash.slice(0, 7),
    author: "Developer <dev@example.com>",
    date: "2026-09-19",
    message,
    parents: [],
    refs: [],
  }
}

describe("canvas-layout on-demand rendering", () => {
  it("computes canvas geometry correctly", () => {
    const layout: CanvasGraphLayout = {
      nodes: [
        { commit: makeDummyCommit("c1", "Initial"), row: 0, lane: 0 },
        { commit: makeDummyCommit("c2", "Second"), row: 1, lane: 1 },
      ],
      edges: [],
      lanes: 2,
    }

    const geometry = computeCanvasGeometry(layout)
    expect(geometry.canvasHeight).toBe(CANVAS_PADDING * 2 + 2 * ROW_HEIGHT)
    expect(geometry.canvasWidth).toBeGreaterThan(geometry.labelOffsetX)
  })

  it("calculates node points and edge shapes", () => {
    const node: GraphNode = {
      commit: makeDummyCommit("c1", "Initial"),
      row: 2,
      lane: 1,
    }
    const point = nodePoint(node)
    expect(point.y).toBe(CANVAS_PADDING + 2 * ROW_HEIGHT + ROW_HEIGHT / 2)

    const edge: GraphEdge = {
      fromLane: 0,
      fromRow: 0,
      toLane: 0,
      toRow: 1,
    }
    const shape = edgeShape(edge)
    expect(shape.path).toContain("M")
    expect(shape.path).toContain("C")
    expect(shape.animationDelay).toBeGreaterThanOrEqual(0)
  })

  it("handles empty layout gracefully in computeVisibleRange", () => {
    const range = computeVisibleRange(0, 0, 1, 800)
    expect(range.startRow).toBe(0)
    expect(range.endRow).toBe(-1)
  })

  it("computes viable visible row slice at the top (initial position)", () => {
    const totalRows = 100
    const viewportY = 0
    const scale = 1
    const containerHeight = 800
    const overscan = 10

    const range = computeVisibleRange(totalRows, viewportY, scale, containerHeight, overscan)
    expect(range.startRow).toBe(0)
    expect(range.endRow).toBeGreaterThan(0)
    expect(range.endRow).toBeLessThan(totalRows)
  })

  it("shifts visible range as the user scrolls down the canvas", () => {
    const totalRows = 100
    const scale = 1
    const containerHeight = 800
    const overscan = 10

    const topRange = computeVisibleRange(totalRows, 0, scale, containerHeight, overscan)
    const scrolledRange = computeVisibleRange(totalRows, -2000, scale, containerHeight, overscan)

    expect(scrolledRange.startRow).toBeGreaterThan(topRange.startRow)
    expect(scrolledRange.endRow).toBeGreaterThan(topRange.endRow)
    expect(scrolledRange.startRow).toBeGreaterThanOrEqual(30)
    expect(scrolledRange.endRow).toBeLessThanOrEqual(totalRows - 1)
  })

  it("adapts range when zoomed in or zoomed out", () => {
    const totalRows = 200
    const viewportY = -1000
    const containerHeight = 800
    const overscan = 5

    const normal = computeVisibleRange(totalRows, viewportY, 1, containerHeight, overscan)
    const zoomedIn = computeVisibleRange(totalRows, viewportY, 2, containerHeight, overscan)
    const zoomedOut = computeVisibleRange(totalRows, viewportY, 0.5, containerHeight, overscan)

    const normalCount = normal.endRow - normal.startRow + 1
    const zoomedInCount = zoomedIn.endRow - zoomedIn.startRow + 1
    const zoomedOutCount = zoomedOut.endRow - zoomedOut.startRow + 1

    expect(zoomedInCount).toBeLessThan(normalCount)
    expect(zoomedOutCount).toBeGreaterThan(normalCount)
  })

  it("clamps row bounds within [0, totalRows - 1] and returns empty range when out of bounds", () => {
    const totalRows = 50
    const pastBottom = computeVisibleRange(totalRows, -100000, 1, 800, 10)
    expect(pastBottom.endRow).toBe(-1)
    expect(pastBottom.startRow).toBe(0)

    const aboveTop = computeVisibleRange(totalRows, 100000, 1, 800, 10)
    expect(aboveTop.endRow).toBe(-1)
    expect(aboveTop.startRow).toBe(0)

    const nearBottom = computeVisibleRange(totalRows, -2200, 1, 800, 10)
    expect(nearBottom.endRow).toBe(totalRows - 1)
    expect(nearBottom.startRow).toBeLessThanOrEqual(nearBottom.endRow)
  })

  it("checks edge visibility against visible row range", () => {
    const startRow = 20
    const endRow = 40

    const aboveEdge: GraphEdge = { fromLane: 0, fromRow: 5, toLane: 0, toRow: 10 }
    expect(isEdgeVisible(aboveEdge, startRow, endRow)).toBe(false)

    const belowEdge: GraphEdge = { fromLane: 0, fromRow: 45, toLane: 0, toRow: 50 }
    expect(isEdgeVisible(belowEdge, startRow, endRow)).toBe(false)

    const insideEdge: GraphEdge = { fromLane: 0, fromRow: 25, toLane: 1, toRow: 30 }
    expect(isEdgeVisible(insideEdge, startRow, endRow)).toBe(true)

    const crossingEdge: GraphEdge = { fromLane: 0, fromRow: 10, toLane: 0, toRow: 50 }
    expect(isEdgeVisible(crossingEdge, startRow, endRow)).toBe(true)

    const enteringEdge: GraphEdge = { fromLane: 0, fromRow: 35, toLane: 0, toRow: 45 }
    expect(isEdgeVisible(enteringEdge, startRow, endRow)).toBe(true)
  })
})
