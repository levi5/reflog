import classnames from "classnames"
import { memo, type SVGProps } from "react"

import { Dot } from "./Dot"

import type { GraphNode } from "../../../../domain/entities/graph/graph-layout"
import { laneColor } from "../../../../main/adapters"

export interface CanvasNodeClasses {
  group?: string
  node?: string
  halo?: string
  ripple?: string
  headGroup?: string
  headGroupPop?: string
  headPill?: string
  headText?: string
  dot?: string
  dotSelected?: string
  dotBlink?: string
  spotRing?: string
  spotBlink?: string
  shockwave?: string
  headAuraRing?: string
  msg?: string
  short?: string
  refs?: string
  refsBlink?: string
  refDeleting?: string
  selected?: string
}

interface CanvasNodeProps extends SVGProps<SVGGElement> {
  node: GraphNode
  x: number
  y: number
  labelX: number
  isSelected: boolean
  isDimmed: boolean
  isFresh: boolean
  isHead: boolean
  isMatch?: boolean
  isActiveMatch?: boolean
  isSpotlight?: boolean
  messagePreview: string
  deletingRefs?: Map<string, string>
  classes?: CanvasNodeClasses
  onSelectCommit: (commitHash: string) => void
}

export const CanvasNode = memo(function CanvasNode({
  node,
  x,
  y,
  labelX,
  isSelected,
  isDimmed,
  isFresh,
  isHead,
  isMatch = false,
  isActiveMatch = false,
  isSpotlight = false,
  messagePreview,
  deletingRefs,
  classes,
  onSelectCommit,
  ...gProps
}: CanvasNodeProps) {
  const commit = node.commit
  const nodeDelay = node.row <= 15 ? Math.min(node.row * 20, 300) : 0

  const deletingRefNames = deletingRefs
    ? Array.from(deletingRefs.entries())
        .filter(([, hash]) => hash === commit.hash)
        .map(([name]) => name)
    : []

  const activeRefs = commit.refs.filter((ref) => {
    const cleanRef = ref.replace(/^HEAD -> /, "").trim()
    return !deletingRefNames.some((name) => cleanRef === name || cleanRef.endsWith(`/${name}`))
  })
  const emphasized = isSelected || isFresh || isActiveMatch || isSpotlight
  const showFreshDecor = isFresh && !isSpotlight
  const waveDelay = `${nodeDelay}ms`
  const waveLateDelay = `${nodeDelay + 350}ms`

  return (
    <g
      opacity={isDimmed ? 0.22 : 1}
      className={classnames(classes?.group, isSelected && classes?.selected)}
      style={{ animationDelay: `${nodeDelay}ms` }}
      {...gProps}
    >
      <a
        href={`#${commit.hash}`}
        onPointerDown={(event) => {
          event.stopPropagation()
        }}
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSelectCommit(isSelected ? "" : commit.hash)
        }}
        aria-label={`${commit.short} ${commit.message}`}
        className={classes?.node}
      >
        <title>{`${commit.short} · ${commit.author} · ${commit.message}`}</title>
        {showFreshDecor && (
          <>
            <circle
              cx={x}
              cy={y}
              r={11}
              fill="none"
              stroke={laneColor(node.lane)}
              strokeWidth={2}
              className={classes?.halo}
            />
            <circle
              cx={x}
              cy={y}
              r={6}
              fill="none"
              stroke={laneColor(node.lane)}
              strokeWidth={2}
              className={classes?.ripple}
              style={{ animationDelay: waveDelay }}
            />
            <circle
              cx={x}
              cy={y}
              r={8}
              fill="none"
              stroke={laneColor(node.lane)}
              strokeWidth={3}
              className={classes?.shockwave}
              style={{ animationDelay: waveDelay }}
            />
            <circle
              cx={x}
              cy={y}
              r={8}
              fill="none"
              stroke={laneColor(node.lane)}
              strokeWidth={3}
              className={classes?.shockwave}
              style={{ animationDelay: waveLateDelay }}
            />
          </>
        )}
        {isSpotlight && (
          <circle
            cx={x}
            cy={y}
            r={13}
            fill="none"
            stroke="var(--teal)"
            strokeWidth={2}
            strokeDasharray="5 4"
            className={classes?.spotRing}
          />
        )}
        {isMatch && !isFresh && (
          <circle
            cx={x}
            cy={y}
            r={11}
            fill="none"
            stroke={laneColor(node.lane)}
            strokeWidth={2}
            className={classes?.halo}
          />
        )}
        {isHead && (
          <g className={classnames(classes?.headGroup, (isFresh || isSpotlight) && classes?.headGroupPop)}>
            <circle
              cx={x}
              cy={y}
              r={15}
              fill="none"
              stroke="var(--grape)"
              strokeWidth={2}
              className={classes?.headAuraRing}
            />
            <rect x={x - 24} y={y - 32} width={48} height={17} rx={8} className={classes?.headPill} />
            <text x={x} y={y - 19} textAnchor="middle" className={classes?.headText}>
              HEAD
            </text>
          </g>
        )}
        <Dot
          cx={x}
          cy={y}
          r={isSelected ? 8 : emphasized ? 7 : 5.5}
          fill={laneColor(node.lane)}
          stroke={emphasized ? "#fff" : "none"}
          strokeWidth={emphasized ? 2 : 0}
          className={classnames(
            classes?.dot,
            (isFresh || isActiveMatch) && !isSpotlight && classes?.dotBlink,
            isSpotlight && classes?.spotBlink,
          )}
        />
        <text x={labelX} y={y + 4} className={classes?.msg}>
          <tspan className={classes?.short}>{commit.short} </tspan>
          {activeRefs.length > 0 && (
            <tspan className={classnames(classes?.refs, showFreshDecor && classes?.refsBlink)}>
              {activeRefs.join(" ")}{" "}
            </tspan>
          )}
          {deletingRefNames.length > 0 && <tspan className={classes?.refDeleting}>{deletingRefNames.join(" ")} </tspan>}
          {messagePreview}
        </text>
      </a>
    </g>
  )
})
