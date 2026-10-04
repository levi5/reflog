import classnames from "classnames"
import { useTranslation } from "../../../context"
import { formatElapsed, useElapsed } from "../../../hooks"
import styles from "./styles.module.scss"

export interface BusyBarProps {
  visible: boolean
  className?: string
  label?: string
  startedAt?: number | null
}

export function BusyBar({ visible, className, label, startedAt = null }: BusyBarProps) {
  const { t, formatNumber } = useTranslation()
  const elapsed = useElapsed(visible ? startedAt : null)
  const elapsedText = formatElapsed(elapsed)
  const description = label ? `${label} — ${elapsedText}` : t("loadingGeneric")

  return (
    <div
      className={classnames(styles.busyBar, visible && styles.active, className)}
      role="progressbar"
      aria-busy={visible}
      aria-live="polite"
      aria-label={description}
      aria-valuetext={visible ? elapsedText : undefined}
      data-elapsed={visible ? elapsedText : undefined}
    >
      {visible && startedAt !== null && (
        <span className={styles.busyReadout}>
          {label ? `${label} · ` : ""}
          {formatNumber(Math.round(elapsed / 1000))}s
        </span>
      )}
    </div>
  )
}
