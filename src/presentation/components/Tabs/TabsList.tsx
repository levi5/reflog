import classnames from "classnames"
import { type KeyboardEvent, useRef } from "react"
import type { TabsListProps } from "../../../types/components/tabs"
import styles from "./style.module.scss"
import { useTabsContext } from "./TabsContext"

export function TabsList({ className, ariaLabel, children }: TabsListProps) {
  const { variant, size, orientation, fullWidth } = useTabsContext()
  const listRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const list = listRef.current
    if (!list) return

    const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'))
    if (tabs.length === 0) return

    const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement)
    if (currentIndex === -1) return

    const isHorizontal = orientation === "horizontal"
    const nextKey = isHorizontal ? "ArrowRight" : "ArrowDown"
    const prevKey = isHorizontal ? "ArrowLeft" : "ArrowUp"

    let targetIndex = -1

    if (event.key === nextKey) {
      targetIndex = (currentIndex + 1) % tabs.length
    } else if (event.key === prevKey) {
      targetIndex = (currentIndex - 1 + tabs.length) % tabs.length
    } else if (event.key === "Home") {
      targetIndex = 0
    } else if (event.key === "End") {
      targetIndex = tabs.length - 1
    }

    if (targetIndex !== -1) {
      event.preventDefault()
      const targetTab = tabs[targetIndex]
      targetTab?.focus()
      targetTab?.click()
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      tabIndex={-1}
      className={classnames(
        styles.list,
        styles[variant],
        styles[size],
        orientation === "vertical" && styles.vertical,
        fullWidth && styles.fullWidth,
        className,
      )}
      onKeyDown={handleKeyDown}
    >
      {children}
    </div>
  )
}
