import classnames from "classnames"
import { useCallback, useId, useMemo, useState } from "react"
import type { TabsContextValue, TabsProps } from "../../../types/components/tabs"
import styles from "./style.module.scss"
import { Tab } from "./Tab"
import { TabPanel } from "./TabPanel"
import { TabsContext } from "./TabsContext"
import { TabsList } from "./TabsList"

function BaseTabs<T extends string = string>({
  value: controlledValue,
  defaultValue,
  onChange,
  items,
  variant = "segmented",
  size = "md",
  orientation = "horizontal",
  fullWidth = false,
  className,
  listClassName,
  ariaLabel,
  children,
}: TabsProps<T>) {
  const initialValue = defaultValue ?? items?.[0]?.id ?? ("" as T)
  const [uncontrolledValue, setUncontrolledValue] = useState<T>(initialValue)

  const isControlled = controlledValue !== undefined
  const activeValue = isControlled ? controlledValue : uncontrolledValue
  const baseId = useId()

  const handleTabChange = useCallback(
    (nextVal: string) => {
      const typedValue = nextVal as T
      if (!isControlled) {
        setUncontrolledValue(typedValue)
      }
      onChange?.(typedValue)
    },
    [isControlled, onChange],
  )

  const contextValue = useMemo<TabsContextValue>(
    () => ({
      value: activeValue,
      onChange: handleTabChange,
      variant,
      size,
      orientation,
      fullWidth,
      baseId,
    }),
    [activeValue, handleTabChange, variant, size, orientation, fullWidth, baseId],
  )

  const hasItems = items !== undefined && items.length > 0

  return (
    <TabsContext.Provider value={contextValue}>
      <div
        className={classnames(
          styles.root,
          orientation === "vertical" && styles.vertical,
          fullWidth && styles.fullWidth,
          className,
        )}
      >
        {hasItems && (
          <TabsList className={listClassName} ariaLabel={ariaLabel}>
            {items.map((item) => (
              <Tab
                key={item.id}
                value={item.id}
                icon={item.icon}
                badge={item.badge}
                count={item.count}
                alert={item.alert}
                disabled={item.disabled}
                title={item.title}
                className={item.className}
              >
                {item.label}
              </Tab>
            ))}
          </TabsList>
        )}
        {children}
      </div>
    </TabsContext.Provider>
  )
}

export const Tabs = Object.assign(BaseTabs, {
  List: TabsList,
  Tab,
  Trigger: Tab,
  Panel: TabPanel,
  Content: TabPanel,
})
