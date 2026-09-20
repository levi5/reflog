import { useTranslation } from "../../../context"
import type { StringKey } from "../../../../i18n"
import styles from "./style.module.scss"

interface PageHeaderProps {
  icon?: React.ReactNode
  title: StringKey
  description?: StringKey
}

export function PageHeader({ icon, title, description }: PageHeaderProps) {
  const { t } = useTranslation()
  return (
    <div className={styles.pageHeader}>
      {icon && <span className={styles.pageIcon}>{icon}</span>}
      <div className={styles.pageInfo}>
        <h2>{t(title)}</h2>
        {description && <p>{t(description)}</p>}
      </div>
    </div>
  )
}
