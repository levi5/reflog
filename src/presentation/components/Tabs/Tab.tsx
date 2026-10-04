import classnames from "classnames"
import type { TabProps } from "../../../types/components/tabs"

import { useTabsContext } from "./TabsContext"

import styles from "./style.module.scss"

export function Tab<T extends string = string>({
  value,
  icon,
  badge,
  count,
  alert = false,
  disabled = false,
  title,
  className,
  children,
  onClick,
}: TabProps<T>) {
  const { value: activeValue, onChange, baseId } = useTabsContext()
  const isSelected = activeValue === value

  const handleClick = () => {
    if (disabled) return
    onChange(value)
    onClick?.()
  }

  const hasBadge = badge !== undefined || (count !== undefined && count > 0)
  const badgeContent = badge ?? count

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-controls={`${baseId}-panel-${value}`}
      aria-selected={isSelected}
      aria-disabled={disabled}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      title={title}
      className={classnames(styles.tab, isSelected && styles.active, className)}
      onClick={handleClick}
    >
      {icon && <span className={styles.icon}>{icon}</span>}
      {children !== undefined && children !== null && <span className={styles.label}>{children}</span>}
      {hasBadge && <span className={classnames(styles.badge, alert && styles.badgeAlert)}>{badgeContent}</span>}
    </button>
  )
}
