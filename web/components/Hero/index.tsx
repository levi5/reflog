import { Badge } from "../Badge"
import { Button } from "../Button"
import { hero } from "../../content/landing"

import "./styles.css"

export const Hero = () => (
  <section className="hero" id="top">
    <div className="hero__inner shell">
      <Badge label={hero.badge} tone="accent" />
      <h1 className="hero__title">{hero.title}</h1>
      <p className="hero__lede">{hero.lede}</p>
      <div className="hero__actions">
        <Button label={hero.primaryCta.label} href={hero.primaryCta.href} size="lg" />
        <Button label={hero.secondaryCta.label} href={hero.secondaryCta.href} variant="ghost" size="lg" />
      </div>
      <div className="hero__frame">
        <img src={hero.screenshot} alt="Reflog resolving a merge conflict" loading="eager" decoding="async" />
      </div>
    </div>
  </section>
)
