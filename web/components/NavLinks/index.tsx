export interface NavItem {
  label: string
  href: string
}

export interface NavLinksProps {
  items: NavItem[]
}

export const NavLinks = ({ items }: NavLinksProps) => (
  <nav className="nav-links" aria-label="Primary">
    <ul className="nav-links__list">
      {items.map((item) => (
        <li key={item.href}>
          <a className="nav-links__link" href={item.href}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </nav>
)

import "./styles.css"
