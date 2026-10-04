import "./styles.css"

export type ButtonVariant = "primary" | "ghost" | "quiet"
export type ButtonSize = "sm" | "md" | "lg"

export interface ButtonProps {
  label: string
  href?: string
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
  className?: string
}

export const Button = ({ label, href, variant = "primary", size = "md", icon, className }: ButtonProps) => {
  const classes = ["button", `button--${variant}`, `button--${size}`, className].filter(Boolean).join(" ")
  const content = (
    <>
      {icon ? <span className="button__icon">{icon}</span> : null}
      <span>{label}</span>
    </>
  )

  return href ? (
    <a className={classes} href={href}>
      {content}
    </a>
  ) : (
    <button className={classes} type="button">
      {content}
    </button>
  )
}
