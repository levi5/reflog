export interface FeatureCardProps {
  title: string
  description: string
  icon?: React.ReactNode
  span?: "half" | "third"
}

export const FeatureCard = ({ title, description, icon, span = "third" }: FeatureCardProps) => (
  <article className={`feature-card feature-card--${span}`}>
    {icon ? <span className="feature-card__icon">{icon}</span> : null}
    <h3 className="feature-card__title">{title}</h3>
    <p className="feature-card__description">{description}</p>
  </article>
)

import "./styles.css"
