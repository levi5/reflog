import { Button } from "../Button"
import { Logo } from "../Logo"
import { NavLinks } from "../NavLinks"
import { nav, site } from "../../content/landing"

import "./styles.css"

export const Header = () => (
  <header className="header">
    <div className="header__inner shell">
      <a className="header__brand" href="#top" aria-label={`${site.name} home`}>
        <Logo />
      </a>
      <NavLinks items={nav} />
      <div className="header__actions">
        <Button label="GitHub" href={site.repository} variant="quiet" size="sm" />
        <Button label="Download" href="#install" size="sm" />
      </div>
    </div>
  </header>
)
