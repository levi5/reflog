import type { ReactNode, SVGProps } from "react"

interface CanvasProps extends SVGProps<SVGSVGElement> {
  viewportX: number
  viewportY: number
  scale: number
  label: string
  children: ReactNode
}

export function Canvas({ viewportX, viewportY, scale, label, children, ...svgProps }: CanvasProps) {
  return (
    <svg role="img" {...svgProps}>
      <title>{label}</title>
      <g transform={`translate(${viewportX + 20},${viewportY + 20}) scale(${scale})`}>{children}</g>
    </svg>
  )
}
