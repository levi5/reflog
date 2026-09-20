import type { SVGProps } from "react"
import type { FigureLabels as Labels } from "../../../cms/docs"

interface MergeFlowProps extends SVGProps<SVGSVGElement> {
  l: Labels
}

export function MergeFlow({ l, ...svgProps }: MergeFlowProps) {
  return (
    <svg viewBox="0 0 560 132" role="img" aria-label={l.merge} className="docFigure" {...svgProps}>
      <rect x="8" y="14" width="104" height="30" rx="7" className="figBox" />
      <text x="60" y="33" textAnchor="middle" className="figText">
        main
      </text>
      <rect x="8" y="88" width="104" height="30" rx="7" className="figBox" />
      <text x="60" y="107" textAnchor="middle" className="figText">
        feature
      </text>
      <line x1="112" y1="29" x2="196" y2="57" className="figLine" />
      <line x1="112" y1="103" x2="196" y2="75" className="figLine" />
      <rect x="196" y="42" width="104" height="48" rx="7" className="figAccent" />
      <text x="248" y="61" textAnchor="middle" className="figText">
        {l.merge}
      </text>
      <text x="248" y="77" textAnchor="middle" className="figMuted">
        !!
      </text>
      <line x1="300" y1="66" x2="348" y2="66" className="figLine" />
      <polygon points="348,61 358,66 348,71" className="figArrow" />
      <rect x="358" y="42" width="92" height="48" rx="7" className="figBox" />
      <text x="404" y="61" textAnchor="middle" className="figText">
        {l.resolve}
      </text>
      <text x="404" y="77" textAnchor="middle" className="figMuted">
        ok
      </text>
      <line x1="450" y1="66" x2="494" y2="66" className="figLine" />
      <polygon points="494,61 504,66 494,71" className="figArrow" />
      <rect x="358" y="96" width="92" height="28" rx="7" className="figOk" />
      <text x="404" y="114" textAnchor="middle" className="figText">
        {l.done}
      </text>
    </svg>
  )
}
