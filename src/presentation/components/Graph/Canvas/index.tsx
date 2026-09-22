import classnames from "classnames"
import { useEffect, useMemo, useState } from "react"
import { Icon } from "../../Icons"
import { laneColor } from "../../../../main/adapters"
import type { GraphCanvasProps } from "../../../../types/components/graph"
import type { GraphNode } from "../../../../domain/entities/graph/graph-layout"
import { useTranslation } from "../../../context"
import { computeVisibleRange, edgeShape, isEdgeVisible, nodePoint } from "./canvas-layout"
import styles from "./style.module.scss"

const COMMIT_MESSAGE_PREVIEW_LENGTH = 72
const EDGE_OPACITY = 0.75
const MERGE_EDGE_STROKE_WIDTH = 2.4
const DEFAULT_EDGE_STROKE_WIDTH = 1.6
const LOAD_MORE_BUFFER_ROWS = 10

const NODE_CLASSES = {
  group: styles.nodeGroup,
  selected: styles.nodeGroupSelected,
  node: styles.node,
  halo: styles.halo,
  ripple: styles.ripple,
  shockwave: styles.shockwave,
  spotRing: styles.spotRing,
  spotBlink: styles.spotBlink,
  headAuraRing: styles.headAuraRing,
  headGroup: styles.headGroup,
  headGroupPop: styles.headGroupPop,
  headPill: styles.headPill,
  headText: styles.headText,
  dot: styles.dot,
  dotBlink: styles.dotBlink,
  msg: styles.msg,
  short: styles.short,
  refs: styles.refs,
  refsBlink: styles.refsBlink,
}

function truncateCommitMessage(message: string): string {
  if (message.length <= COMMIT_MESSAGE_PREVIEW_LENGTH) return message
  return `${message.slice(0, COMMIT_MESSAGE_PREVIEW_LENGTH)}…`
}

interface GraphLegendProps {
  titleNew: string
  titleMerge: string
}

function GraphLegend({ titleNew, titleMerge }: GraphLegendProps) {
  return (
    <div className={styles.legend}>
      <span>
        <i className={styles.lgDot} />
        {titleNew}
      </span>
      <span>
        <i className={styles.lgHead}>HEAD</i>
      </span>
      <span>
        <i className={styles.lgEdge} />
        {titleMerge}
      </span>
    </div>
  )
}

export function GraphCanvas({
  layout,
  geometry,
  viewport,
  headHash,
  freshHashes,
  dimmedHashes,
  matchedHashes,
  activeMatchHash,
  spotlightHashes,
  headTravel,
  isRunning,
  selectedHash,
  onSelectCommit,
  hasMore,
  loading,
  onLoadMore,
}: GraphCanvasProps) {
  const { t } = useTranslation()
  const canvasLabel = t("visualize")

  const [containerHeight, setContainerHeight] = useState<number>(() => {
    return viewport.containerRef.current?.clientHeight || (typeof window !== "undefined" ? window.innerHeight : 800)
  })

  useEffect(() => {
    const container = viewport.containerRef.current
    if (!container) return

    setContainerHeight(container.clientHeight)

    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setContainerHeight(entry.contentRect.height)
      }
    })

    observer.observe(container)
    return () => observer.disconnect()
  }, [viewport.containerRef])

  const { startRow, endRow } = useMemo(() => {
    return computeVisibleRange(layout.nodes.length, viewport.position.y, viewport.scale, containerHeight)
  }, [layout.nodes.length, viewport.position.y, viewport.scale, containerHeight])

  useEffect(() => {
    if (!hasMore || loading || !onLoadMore) return
    if (endRow >= layout.nodes.length - LOAD_MORE_BUFFER_ROWS) onLoadMore()
  }, [endRow, hasMore, layout.nodes.length, loading, onLoadMore])

  const visibleNodes = useMemo(() => {
    if (startRow > endRow || endRow < 0 || startRow >= layout.nodes.length) {
      return []
    }
    const nodes = layout.nodes.slice(startRow, endRow + 1)
    if (!headTravel) return nodes

    const extra: GraphNode[] = []
    if (headTravel.fromHash && !nodes.some((n) => n.commit.hash === headTravel.fromHash)) {
      const fromNode = layout.nodes.find((n) => n.commit.hash === headTravel.fromHash)
      if (fromNode) extra.push(fromNode)
    }
    if (headTravel.toHash && !nodes.some((n) => n.commit.hash === headTravel.toHash)) {
      const toNode = layout.nodes.find((n) => n.commit.hash === headTravel.toHash)
      if (toNode) extra.push(toNode)
    }
    return extra.length > 0 ? [...nodes, ...extra] : nodes
  }, [layout.nodes, startRow, endRow, headTravel])

  const visibleEdges = useMemo(() => {
    if (startRow > endRow || endRow < 0 || layout.edges.length === 0) {
      return []
    }
    return layout.edges.filter((edge) => {
      if (isEdgeVisible(edge, startRow, endRow)) return true

      if (headTravel) {
        const fromNode = layout.nodes.find((n) => n.commit.hash === headTravel.fromHash)
        const toNode = layout.nodes.find((n) => n.commit.hash === headTravel.toHash)
        if (fromNode && toNode) {
          if (
            (edge.fromRow === fromNode.row && edge.toRow === toNode.row) ||
            (edge.fromRow === toNode.row && edge.toRow === fromNode.row)
          ) {
            return true
          }
        }
      }
      return false
    })
  }, [layout.edges, layout.nodes, startRow, endRow, headTravel])

  const freshRows = useMemo(() => {
    if (freshHashes.length === 0) return new Set<number>()
    return new Set(layout.nodes.filter((node) => freshHashes.includes(node.commit.hash)).map((node) => node.row))
  }, [layout.nodes, freshHashes])

  const travel = useMemo(() => {
    if (!headTravel) return null
    const fromNode = layout.nodes.find((node) => node.commit.hash === headTravel.fromHash)
    const toNode = layout.nodes.find((node) => node.commit.hash === headTravel.toHash)
    if (!fromNode || !toNode) return null
    const from = nodePoint(fromNode)
    const to = nodePoint(toNode)
    const edge = layout.edges.find(
      (candidate) =>
        (candidate.fromRow === fromNode.row && candidate.toRow === toNode.row) ||
        (candidate.fromRow === toNode.row && candidate.toRow === fromNode.row),
    )
    return {
      key: headTravel.key,
      from,
      path: edge ? edgeShape(edge).path : `M ${from.x} ${from.y} L ${to.x} ${to.y}`,
    }
  }, [headTravel, layout])

  return (
    <main
      className={classnames(styles.canvasWrap, "canvasWrap")}
      onWheel={viewport.onWheel}
      onPointerDown={viewport.onPanStart}
      onPointerMove={viewport.onPanMove}
      onPointerUp={viewport.onPanEnd}
    >
      <Icon.Graph.Canvas
        width="100%"
        height="100%"
        className={classnames(styles.canvas, isRunning && styles.canvasRunning)}
        aria-label={canvasLabel}
        label={canvasLabel}
        viewportX={viewport.position.x}
        viewportY={viewport.position.y}
        scale={viewport.scale}
      >
        {visibleEdges.map((edge) => {
          const { path, animationDelay } = edgeShape(edge)
          const isConnectedToFresh = freshRows.has(edge.fromRow) || freshRows.has(edge.toRow)
          return (
            <Icon.Graph.Connection
              key={`${edge.fromLane}-${edge.fromRow}-${edge.toLane}-${edge.toRow}`}
              d={path}
              color={laneColor(edge.fromLane)}
              strokeWidth={edge.merge ? MERGE_EDGE_STROKE_WIDTH : DEFAULT_EDGE_STROKE_WIDTH}
              opacity={isConnectedToFresh ? 1 : EDGE_OPACITY}
              className={classnames(styles.edge, isConnectedToFresh && styles.freshEdge)}
              style={{
                d: `path("${path}")`,
                animationDelay: `${animationDelay}ms`,
              }}
            />
          )
        })}
        {visibleNodes.map((node) => {
          const point = nodePoint(node)
          return (
            <Icon.Node.CanvasNode
              key={node.commit.hash}
              node={node}
              x={point.x}
              y={point.y}
              labelX={geometry.labelOffsetX}
              isSelected={selectedHash === node.commit.hash}
              isDimmed={dimmedHashes.has(node.commit.hash)}
              isFresh={freshHashes.includes(node.commit.hash)}
              isHead={headHash !== "" && node.commit.hash === headHash}
              isMatch={matchedHashes.has(node.commit.hash)}
              isActiveMatch={activeMatchHash !== "" && node.commit.hash === activeMatchHash}
              isSpotlight={spotlightHashes.has(node.commit.hash)}
              messagePreview={truncateCommitMessage(node.commit.message)}
              onSelectCommit={onSelectCommit}
              classes={NODE_CLASSES}
            />
          )
        })}
        {travel && (
          <g key={travel.key} className={styles.travelWrap}>
            <circle cx={travel.from.x} cy={travel.from.y} r={6} fill="var(--grape)" className={styles.travelPulse}>
              <animateMotion dur="0.9s" repeatCount="1" path={travel.path} />
            </circle>
          </g>
        )}
      </Icon.Graph.Canvas>
      <GraphLegend titleNew={t("legendNew")} titleMerge={t("legendMerge")} />
    </main>
  )
}
