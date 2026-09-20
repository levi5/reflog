import type { SVGProps } from "react"
import { Dot } from "./Dot"
import { _Maybe } from "funcio"

const NODE_RADIUS = 7

export interface CommitNodeClasses {
  halo?: string
  dot?: string
  label?: string
  subLabel?: string
}

interface CommitNodeProps extends SVGProps<SVGGElement> {
  cx: number
  cy: number
  color: string
  isSelected: boolean
  label: string
  subLabel: string
  classes?: CommitNodeClasses
}

export const CommitNode = ({ cx, cy, color, isSelected, label, subLabel, classes, ...gProps }: CommitNodeProps) => {
  const safeClasses = _Maybe.of<CommitNodeClasses | undefined>(classes).getOrElse({
    halo: "",
    dot: "",
    label: "",
    subLabel: "",
  }) as CommitNodeClasses

  return (
    <g {...gProps}>
      {isSelected && (
        <circle
          cx={cx}
          cy={cy}
          r={NODE_RADIUS + 5}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          opacity={0.35}
          className={safeClasses.halo}
        />
      )}
      <Dot
        cx={cx}
        cy={cy}
        r={NODE_RADIUS}
        fill={color}
        stroke={isSelected ? "#fff" : "none"}
        strokeWidth={isSelected ? 2 : 0}
        className={safeClasses.dot}
      />
      <text x={cx} y={cy - NODE_RADIUS - 6} textAnchor="middle" className={safeClasses.label}>
        {label}
      </text>
      <text x={cx} y={cy + NODE_RADIUS + 14} textAnchor="middle" className={safeClasses.subLabel}>
        {subLabel}
      </text>
    </g>
  )
}
