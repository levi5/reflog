import type { SVGProps } from "react"
import type { FigureLabels as Labels } from "../../../cms/docs"

interface RebaseFlowProps extends SVGProps<SVGSVGElement> {
  l: Labels
}

export function RebaseFlow({ l, ...svgProps }: RebaseFlowProps) {
  return (
    <svg viewBox="0 0 560 112" role="img" aria-label={l.rebase} className="docFigure" {...svgProps}>
      <rect x="10" y="22" width="36" height="24" rx="5" className="figBox" />
      <text x="28" y="38" textAnchor="middle" className="figText">
        C1
      </text>
      <line x1="46" y1="34" x2="62" y2="34" className="figLine" />
      <polygon points="62,31 68,34 62,37" className="figArrow" />
      <rect x="68" y="22" width="36" height="24" rx="5" className="figBox" />
      <text x="86" y="38" textAnchor="middle" className="figText">
        C2
      </text>
      <line x1="104" y1="34" x2="120" y2="34" className="figLine" />
      <polygon points="120,31 126,34 120,37" className="figArrow" />
      <rect x="126" y="22" width="36" height="24" rx="5" className="figBox" />
      <text x="144" y="38" textAnchor="middle" className="figText">
        C3
      </text>
      <text x="168" y="38" className="figMuted">
        main
      </text>

      <path d="M 28 46 L 28 80 L 62 80" fill="none" className="figLine" />
      <polygon points="62,77 68,80 62,83" className="figArrow" />
      <rect x="68" y="68" width="36" height="24" rx="5" className="figAccent" />
      <text x="86" y="84" textAnchor="middle" className="figText">
        C4
      </text>
      <line x1="104" y1="80" x2="120" y2="80" className="figLine" />
      <polygon points="120,77 126,80 120,83" className="figArrow" />
      <rect x="126" y="68" width="36" height="24" rx="5" className="figAccent" />
      <text x="144" y="84" textAnchor="middle" className="figText">
        C5
      </text>
      <text x="168" y="84" className="figMuted">
        feature
      </text>

      <line x1="188" y1="56" x2="204" y2="56" className="figLine" />
      <rect x="204" y="42" width="90" height="28" rx="6" className="figAccent" />
      <text x="249" y="60" textAnchor="middle" className="figText">
        {l.rebase}
      </text>
      <line x1="294" y1="56" x2="314" y2="56" className="figLine" />
      <polygon points="314,53 320,56 314,59" className="figArrow" />
      <rect x="324" y="44" width="32" height="24" rx="5" className="figBox" />
      <text x="340" y="60" textAnchor="middle" className="figText">
        C1
      </text>
      <line x1="356" y1="56" x2="368" y2="56" className="figLine" />
      <polygon points="368,53 372,56 368,59" className="figArrow" />
      <rect x="372" y="44" width="32" height="24" rx="5" className="figBox" />
      <text x="388" y="60" textAnchor="middle" className="figText">
        C2
      </text>
      <line x1="404" y1="56" x2="416" y2="56" className="figLine" />
      <polygon points="416,53 420,56 416,59" className="figArrow" />
      <rect x="420" y="44" width="32" height="24" rx="5" className="figBox" />
      <text x="436" y="60" textAnchor="middle" className="figText">
        C3
      </text>
      <line x1="452" y1="56" x2="464" y2="56" className="figLine" />
      <polygon points="464,53 468,56 464,59" className="figArrow" />
      <rect x="468" y="44" width="34" height="24" rx="5" className="figAccent" />
      <text x="485" y="60" textAnchor="middle" className="figText">
        C4&apos;
      </text>
      <line x1="502" y1="56" x2="514" y2="56" className="figLine" />
      <polygon points="514,53 518,56 514,59" className="figArrow" />
      <rect x="518" y="44" width="34" height="24" rx="5" className="figOk" />
      <text x="535" y="60" textAnchor="middle" className="figText">
        C5&apos;
      </text>

      <text x="436" y="96" textAnchor="middle" className="figMuted">
        {l.linear}
      </text>
    </svg>
  )
}
