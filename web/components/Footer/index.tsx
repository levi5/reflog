import { Logo } from "../Logo"
import { footer, site } from "../../content/landing"

import "./styles.css"

export const Footer = () => (
  <footer className="footer">
    <div className="footer__inner shell">
      <div className="footer__brand">
        <Logo />
        <p className="footer__blurb">{footer.blurb}</p>
      </div>
      <nav className="footer__links" aria-label="Footer">
        {footer.links.map((link) => (
          <a key={link.href} className="footer__link" href={link.href}>
            {link.label}
          </a>
        ))}
      </nav>
      <p className="footer__legal">{footer.license} Built with Tauri, React and Rust.</p>
    </div>
    <p className="footer__version mono">{site.name} — open source, MIT</p>
  </footer>
)
