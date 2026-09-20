import classnames from "classnames"
import styles from "./styles.module.scss"

export interface BusyBarProps {
  visible: boolean
  className?: string
}

export function BusyBar({ visible, className }: BusyBarProps) {
  return (
    <div
      className={classnames(styles.busyBar, visible && styles.active, className)}
      role="progressbar"
      aria-busy={visible}
      aria-label="Loading"
    />
  )
}
