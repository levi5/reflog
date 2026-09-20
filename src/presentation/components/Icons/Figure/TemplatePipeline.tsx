import type { SVGProps } from "react"
import type { FigureLabels as Labels } from "../../../cms/docs"

interface TemplatePipelineProps extends SVGProps<SVGSVGElement> {
  l: Labels
}

export function TemplatePipeline({ l, ...svgProps }: TemplatePipelineProps) {
  return (
    <svg viewBox="0 0 560 96" role="img" aria-label={l.template} className="docFigure" {...svgProps}>
      <rect x="8" y="28" width="130" height="44" rx="7" className="figBox" />
      <text x="73" y="46" textAnchor="middle" className="figText">
        .md
      </text>
      <text x="73" y="62" textAnchor="middle" className="figMuted">
        {l.template}
      </text>
      <line x1="138" y1="50" x2="182" y2="50" className="figLine" />
      <polygon points="182,45 192,50 182,55" className="figArrow" />
      <rect x="192" y="28" width="150" height="44" rx="7" className="figAccent" />
      <text x="267" y="46" textAnchor="middle" className="figText">
        {"{{issue}}"}
      </text>
      <text x="267" y="62" textAnchor="middle" className="figText">
        {"{{branch}}"}
      </text>
      <line x1="342" y1="50" x2="386" y2="50" className="figLine" />
      <polygon points="386,45 396,50 386,55" className="figArrow" />
      <rect x="396" y="28" width="156" height="44" rx="7" className="figOk" />
      <text x="474" y="46" textAnchor="middle" className="figText">
        {l.message}
      </text>
      <text x="474" y="62" textAnchor="middle" className="figMuted">
        Jira: 123
      </text>
    </svg>
  )
}
