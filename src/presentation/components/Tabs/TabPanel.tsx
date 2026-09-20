import classnames from "classnames"
import type { TabPanelProps } from "../../../types/components/tabs"
import styles from "./style.module.scss"
import { useTabsContext } from "./TabsContext"

export function TabPanel<T extends string = string>({
  value,
  className,
  children,
  keepMounted = false,
}: TabPanelProps<T>) {
  const { value: activeValue, baseId } = useTabsContext()
  const isSelected = activeValue === value

  if (!isSelected && !keepMounted) {
    return null
  }

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!isSelected}
      className={classnames(styles.panel, className)}
    >
      {children}
    </div>
  )
}
