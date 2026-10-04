import { Screenshot } from "../Screenshot"
import { SectionHeading } from "../SectionHeading"
import { showcase } from "../../content/landing"

import "./styles.css"

export const Showcase = () => (
  <section className="showcase" id="screenshots">
    <div className="shell">
      <SectionHeading
        eyebrow="Screenshots"
        title="Built dark, because your terminal is"
        lede="Real screens from the app, running against a repository with three unresolved conflicts."
      />
      <div className="showcase__grid">
        {showcase.map((item) => (
          <Screenshot key={item.src} src={item.src} alt={item.alt} caption={item.caption} span={item.span} />
        ))}
      </div>
    </div>
  </section>
)
