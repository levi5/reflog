import { FeatureCard } from "../FeatureCard"
import { SectionHeading } from "../SectionHeading"
import { features } from "../../content/landing"

import "./styles.css"

export const Features = () => (
  <section className="features" id="features">
    <div className="shell">
      <SectionHeading
        eyebrow="What it does"
        title="Every workflow that usually sends you back to the terminal"
        lede="Reflog covers the full daily loop, with the parts that break under pressure built as first-class views."
      />
      <div className="features__grid">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={<FeatureGlyph name={feature.icon} />}
          />
        ))}
      </div>
    </div>
  </section>
)

export const FeatureGlyph = ({ name }: { name: string }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {name === "merge" ? (
      <>
        <circle cx="6" cy="5" r="2.2" />
        <circle cx="6" cy="19" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M6 7.2v9.6" />
        <path d="M8.2 5h4.3A3.5 3.5 0 0 1 16 8.5v1.3" />
        <path d="M8.2 19h4.3A3.5 3.5 0 0 0 16 15.5v-1.3" />
      </>
    ) : null}
    {name === "staging" ? (
      <>
        <path d="M4 7h10" />
        <path d="M4 12h7" />
        <path d="M4 17h5" />
        <path d="M17 4v12" />
        <path d="M14 13l3 3 3-3" />
      </>
    ) : null}
    {name === "rebase" ? (
      <>
        <path d="M4 7h9" />
        <path d="M4 12h13" />
        <path d="M4 17h6" />
        <path d="M18 4v6" />
        <path d="M15.5 7.5L18 10l2.5-2.5" />
      </>
    ) : null}
    {name === "graph" ? (
      <>
        <circle cx="6" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="9" r="2" />
        <path d="M6 8v8" />
        <path d="M8 6h5a5 5 0 0 1 5 5" />
      </>
    ) : null}
    {name === "compare" ? (
      <>
        <path d="M6 4v16" />
        <path d="M18 4v16" />
        <path d="M3 8h3" />
        <path d="M3 12h3" />
        <path d="M3 16h3" />
        <path d="M18 8h3" />
        <path d="M18 16h3" />
      </>
    ) : null}
    {name === "blame" ? (
      <>
        <path d="M4 6h16" />
        <path d="M4 11h10" />
        <path d="M4 16h13" />
        <path d="M4 21h7" />
        <circle cx="18.5" cy="16" r="2.5" />
        <path d="M18.5 13.2V11" />
      </>
    ) : null}
    {name === "automation" ? (
      <>
        <path d="M12 3v3" />
        <path d="M12 18v3" />
        <path d="M3 12h3" />
        <path d="M18 12h3" />
        <circle cx="12" cy="12" r="4.2" />
      </>
    ) : null}
    {name === "undo" ? (
      <>
        <path d="M4 10h9a5 5 0 0 1 0 10h-3" />
        <path d="M8 6l-4 4 4 4" />
      </>
    ) : null}
    {name === "sync" ? (
      <>
        <path d="M20 7h-5V2" />
        <path d="M4 17h5v5" />
        <path d="M19 12a7 7 0 0 0-12-5l-3 3" />
        <path d="M5 12a7 7 0 0 0 12 5l3-3" />
      </>
    ) : null}
  </svg>
)
