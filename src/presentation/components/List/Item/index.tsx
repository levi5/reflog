import classnames from "classnames"
import type { CSSProperties, ReactNode } from "react"
import styles from "./style.module.scss"

interface ListItemProps {
  title: ReactNode
  description?: string
  actions?: ReactNode
  active?: boolean
  className?: string
  style?: CSSProperties
}

export function ListItem({ title, description, actions, active = false, className, style }: ListItemProps) {
  return (
    <div className={classnames(styles.item, active && styles.active, className)} style={style}>
      <div className={styles.content}>
        <span className={styles.title}>{title}</span>
        {description && (
          <span className={styles.description} title={description}>
            {description}
          </span>
        )}
      </div>
      {actions}
    </div>
  )
}
