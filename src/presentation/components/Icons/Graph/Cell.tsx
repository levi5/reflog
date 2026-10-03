import type { SVGProps } from "react"
import type { GraphRow } from "../../../../domain/entities/graph/commit-graph"
import { laneColor } from "../../../../main/adapters"

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
  const x = (l: number) => l * laneWidth + laneWidth / 2
  const mid = rowHeight / 2
  const color = laneColor(row.lane)

  return (
    <svg width={width} height={rowHeight} aria-hidden="true" {...svgProps}>
      {row.top.map((h, j) => {
        if (h === null || h === undefined) return null
        const c = laneColor(j)
        if (j === row.lane) {
          return (
            <line
              key={`enter-${h}`}
              x1={x(j)}
              y1={0}
              x2={x(j)}
              y2={mid}
              stroke={c}
              strokeWidth={2}
              strokeLinecap="round"
            />
          )
        }
        const continues = row.bottom[j] === h
        return (
          <line
            key={`pass-${h}`}
            x1={x(j)}
            y1={0}
            x2={x(j)}
            y2={continues ? rowHeight : mid}
            stroke={c}
            strokeWidth={2}
            strokeLinecap="round"
            opacity={0.9}
          />
        )
      })}
      {row.links.map((l) =>
        l.toLane === l.fromLane ? (
          <line
            key={`link-${l.fromLane}-${l.toLane}`}
            x1={x(l.fromLane)}
            y1={mid}
            x2={x(l.toLane)}
            y2={rowHeight}
            stroke={laneColor(l.fromLane)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ) : (
          <path
            key={`link-${l.fromLane}-${l.toLane}`}
            d={`M ${x(l.fromLane)} ${mid} C ${x(l.fromLane)} ${mid + rowHeight / 4}, ${x(l.toLane)} ${rowHeight - rowHeight / 4}, ${x(l.toLane)} ${rowHeight}`}
            fill="none"
            stroke={laneColor(l.fromLane)}
            strokeWidth={2}
            strokeLinecap="round"
          />
        ),
      )}
      {row.isMerge ? (
        <>
          <circle cx={x(row.lane)} cy={mid} r={6} fill="var(--bg-win)" stroke={color} strokeWidth={2} />
          <circle cx={x(row.lane)} cy={mid} r={2} fill={color} />
        </>
      ) : (
        <circle cx={x(row.lane)} cy={mid} r={4.5} fill={color} stroke="var(--bg-win)" strokeWidth={1} />
      )}
    </svg>
  )
}
