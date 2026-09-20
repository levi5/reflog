import classnames from "classnames"
import type { ReactNode } from "react"
import styles from "./style.module.scss"

export type SectionHeadingProps = {
  icon: ReactNode
  title: string
}

export type WideCardProps = {
  icon: ReactNode
  title: string
  hint: string
  children: ReactNode
}

export type SettingCardProps = {
  icon: ReactNode
  title: string
  hint: string
  children: ReactNode
}

export function SectionHeading({ icon, title }: SectionHeadingProps) {
  return (
    <h3 className={styles.groupTitle}>
      {icon}
      {title}
    </h3>
  )
}

export function SettingCard({ icon, title, hint, children }: SettingCardProps) {
  return (
    <div className={styles.settingsCard}>
      <span className={classnames(styles.settingsIcon, styles.sm)}>{icon}</span>
      <div className={styles.settingsMeta}>
        <strong>{title}</strong>
        <p>{hint}</p>
      </div>
      <div className={styles.settingsControl}>{children}</div>
    </div>
  )
}

export function WideCard({ icon, title, hint, children }: WideCardProps) {
  return (
    <div className={classnames(styles.settingsCard, styles.wide)}>
      <div className={styles.wideHead}>
        <span className={classnames(styles.settingsIcon, styles.sm)}>{icon}</span>
        <div className={styles.settingsMeta}>
          <strong>{title}</strong>
          <p>{hint}</p>
        </div>
      </div>
      <div className={styles.wideBody}>{children}</div>
    </div>
  )
}
