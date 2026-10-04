export interface SectionHeadingProps {
  eyebrow?: string
  title: string
  lede?: string
  align?: "start" | "center"
}

export const SectionHeading = ({ eyebrow, title, lede, align = "center" }: SectionHeadingProps) => (
  <header className={`section-heading section-heading--${align}`}>
    {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
    <h2 className="section-heading__title">{title}</h2>
    {lede ? <p className="lede">{lede}</p> : null}
  </header>
)

import "./styles.css"
