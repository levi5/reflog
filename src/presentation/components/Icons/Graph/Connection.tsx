import type { CSSProperties, SVGProps } from "react"

interface ConnectionProps extends SVGProps<SVGPathElement> {
  d: string
  color: string
  style?: CSSProperties & { d?: string }
}

export function Connection({ d, color, strokeWidth = 2, ...pathProps }: ConnectionProps) {
  return <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} {...pathProps} />
}
