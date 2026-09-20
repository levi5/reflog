import type { SVGProps } from "react"
import type { GraphRow } from "../../../../domain/entities/graph/commit-graph"
import { laneColor } from "../../../../main/adapters"

const LANE_W = 14
const ROW_H = 44

interface CellProps extends SVGProps<SVGSVGElement> {
  row: GraphRow
  lanes: number
}

export const Cell = ({ row, lanes, ...svgProps }: CellProps) => {
  const width = lanes * LANE_W
  const x = (l: number) => l * LANE_W + LANE_W / 2
  const mid = ROW_H / 2

  return (
    <svg width={width} height={ROW_H} aria-hidden="true" {...svgProps}>
      {row.top.map((h, j) => {
        if (h === null || h === undefined) return null
        const color = laneColor(j)
        if (j === row.lane) {
          return <line key={`enter-${h}`} x1={x(j)} y1={0} x2={x(j)} y2={mid} stroke={color} strokeWidth={2} />
        }
        const continues = row.bottom[j] === h
        return (
          <line
            key={`pass-${h}`}
            x1={x(j)}
            y1={0}
            x2={x(j)}
            y2={continues ? ROW_H : mid}
            stroke={color}
            strokeWidth={2}
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
            y2={ROW_H}
            stroke={laneColor(l.fromLane)}
            strokeWidth={2}
          />
        ) : (
          <path
            key={`link-${l.fromLane}-${l.toLane}`}
            d={`M ${x(l.fromLane)} ${mid} C ${x(l.fromLane)} ${mid + 11}, ${x(l.toLane)} ${ROW_H - 11}, ${x(l.toLane)} ${ROW_H}`}
            fill="none"
            stroke={laneColor(l.fromLane)}
            strokeWidth={2}
          />
        ),
      )}
      <circle
        cx={x(row.lane)}
        cy={mid}
        r={row.isMerge ? 5.5 : 4.5}
        fill={laneColor(row.lane)}
        stroke="var(--bg-win)"
        strokeWidth={1.5}
      />
    </svg>
  )
}
