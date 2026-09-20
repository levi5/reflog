import type { SVGProps } from "react"

interface DotProps extends SVGProps<SVGCircleElement> {
  cx: number
  cy: number
  r: number
}

export function Dot({ cx, cy, r, ...circleProps }: DotProps) {
  return <circle cx={cx} cy={cy} r={r} {...circleProps} />
}
