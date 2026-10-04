import { graphLayoutUseCase } from "../../../../data"
import type { SVGProps } from "react"
import type { GraphRow } from "../../../../domain/entities/graph/commit-graph"

export const GITLENS_LANE_W = 14
export const GITLENS_ROW_H = 28

const LANE_W = GITLENS_LANE_W
const ROW_H = GITLENS_ROW_H

interface CellProps extends SVGProps<SVGSVGElement> {
  row: GraphRow
  lanes: number
  rowHeight?: number
  laneWidth?: number
}

export const Cell = ({ row, lanes, rowHeight = ROW_H, laneWidth = LANE_W, ...svgProps }: CellProps) => {
  const width = Math.max(lanes, 1) * laneWidth
  const laneCenterX = (lane: number) => lane * laneWidth + laneWidth / 2
  const mid = rowHeight / 2
  const color = graphLayoutUseCase.laneColor(row.lane)

  return (
    <svg width={width} height={rowHeight} aria-hidden="true" {...svgProps}>
      {row.top.map((hash, laneIndex) => {
        if (hash === null || hash === undefined) return null
        const laneColor = graphLayoutUseCase.laneColor(laneIndex)
        if (laneIndex === row.lane) {
          return (
            <line
              key={`enter-${hash}`}
              x1={laneCenterX(laneIndex)}
              y1={0}
              x2={laneCenterX(laneIndex)}
              y2={mid}
              stroke={laneColor}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )
        }
        const continues = row.bottom[laneIndex] === hash
        return (
          <line
            key={`pass-${hash}`}
            x1={laneCenterX(laneIndex)}
            y1={0}
            x2={laneCenterX(laneIndex)}
            y2={continues ? rowHeight : mid}
            stroke={laneColor}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
      {row.links.map((link) =>
        link.toLane === link.fromLane ? (
          <line
            key={`link-${link.fromLane}-${link.toLane}`}
            x1={laneCenterX(link.fromLane)}
            y1={mid}
            x2={laneCenterX(link.toLane)}
            y2={rowHeight}
            stroke={graphLayoutUseCase.laneColor(link.fromLane)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : (
          <path
            key={`link-${link.fromLane}-${link.toLane}`}
            d={`M ${laneCenterX(link.fromLane)} ${mid} C ${laneCenterX(link.fromLane)} ${mid + rowHeight / 4}, ${laneCenterX(link.toLane)} ${rowHeight - rowHeight / 4}, ${laneCenterX(link.toLane)} ${rowHeight}`}
            fill="none"
            stroke={graphLayoutUseCase.laneColor(link.fromLane)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ),
      )}
      {row.isMerge ? (
        <>
          <circle cx={laneCenterX(row.lane)} cy={mid} r={6} fill="var(--bg-win)" stroke={color} strokeWidth={2} />
          <circle cx={laneCenterX(row.lane)} cy={mid} r={2} fill={color} />
        </>
      ) : (
        <circle cx={laneCenterX(row.lane)} cy={mid} r={4.5} fill={color} stroke="var(--bg-win)" strokeWidth={1} />
      )}
    </svg>
  )
}
