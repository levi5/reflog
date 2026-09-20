import type { SVGProps } from "react"
import type { CommitInfo } from "../../../../types"
import { CommitNode, type CommitNodeClasses } from "./Commit"

const NODE_RADIUS = 7
const NODE_SPACING = 80
const SVG_HEIGHT = 80
const SVG_PADDING_X = 40
const PARENT_COLOR = "var(--muted)"
const SELECTED_COLOR = "var(--grape)"

export interface MiniGraphClasses extends CommitNodeClasses {
  connectorClassName?: string
}

interface MiniGraphProps extends SVGProps<SVGSVGElement> {
  commit: CommitInfo
  parentShort: string
  classes?: MiniGraphClasses
}

export const MiniGraph = ({ commit, parentShort, classes, ...svgProps }: MiniGraphProps) => {
  const cy = SVG_HEIGHT / 2
  const parentCx = SVG_PADDING_X
  const selectedCx = SVG_PADDING_X + NODE_SPACING
  const selectedSubLabel = commit.refs[0] ?? "commit"

  return (
    <svg width="100%" height={SVG_HEIGHT} aria-hidden="true" {...svgProps}>
      <line
        x1={parentCx + NODE_RADIUS}
        y1={cy}
        x2={selectedCx - NODE_RADIUS}
        y2={cy}
        stroke={SELECTED_COLOR}
        strokeWidth={1.6}
        strokeDasharray="4 3"
        opacity={0.5}
        className={classes?.connectorClassName}
      />
      <CommitNode
        cx={parentCx}
        cy={cy}
        color={PARENT_COLOR}
        isSelected={false}
        label={parentShort}
        subLabel="parent"
        classes={classes}
      />
      <CommitNode
        cx={selectedCx}
        cy={cy}
        color={SELECTED_COLOR}
        isSelected={true}
        label={commit.short}
        subLabel={selectedSubLabel}
        classes={classes}
      />
    </svg>
  )
}
