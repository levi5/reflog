import { Button } from "../Button"
import { SectionHeading } from "../SectionHeading"
import { install } from "../../content/landing"

import "./styles.css"

export const Install = () => (
  <section className="install" id="install">
    <div className="shell">
      <SectionHeading
        eyebrow={install.eyebrow}
        title={install.title}
        lede={install.lede}
      />
      <div className="install__panel">
        <ul className="install__list">
          {install.entries.map((entry) => (
            <li key={entry.label} className="install__row">
              <span className="install__label">{entry.label}</span>
              <span className="install__value mono">{entry.command}</span>
              <a className="install__link" href={entry.href}>
                Get
              </a>
            </li>
          ))}
        </ul>
        <div className="install__primary">
          <code className="install__command mono">{install.primary.command}</code>
          <Button label={install.primary.label} href={install.primary.href} />
        </div>
        <div className="install__source">
          <p className="install__source-label">{install.sourceTitle}</p>
          <code className="install__command mono">{install.sourceCommand}</code>
        </div>
      </div>
    </div>
  </section>
)
