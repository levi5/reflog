import type { SVGProps } from "react"
import type { FigureLabels as Labels } from "../../../cms/docs"

interface CommitAnatomyProps extends SVGProps<SVGSVGElement> {
  l: Labels
}

export function CommitAnatomy({ l, ...svgProps }: CommitAnatomyProps) {
  return (
    <svg viewBox="0 0 560 128" role="img" aria-label={l.subject} className="docFigure" {...svgProps}>
      <rect x="8" y="8" width="72" height="30" rx="7" className="figType" />
      <text x="44" y="27" textAnchor="middle" className="figText">
        feat
      </text>
      <rect x="86" y="8" width="72" height="30" rx="7" className="figScope" />
      <text x="122" y="27" textAnchor="middle" className="figText">
        (api)
      </text>
      <rect x="164" y="8" width="388" height="30" rx="7" className="figBox" />
      <text x="180" y="27" className="figText">
        add conflict resolver
      </text>
      <text x="44" y="56" textAnchor="middle" className="figMuted">
        {l.type}
      </text>
      <text x="122" y="56" textAnchor="middle" className="figMuted">
        {l.scope}
      </text>
      <text x="180" y="56" className="figMuted">
        {l.subject}
      </text>
      <rect x="8" y="66" width="544" height="24" rx="6" className="figGhost" />
      <rect x="8" y="96" width="380" height="24" rx="6" className="figGhost" />
    </svg>
  )
}
