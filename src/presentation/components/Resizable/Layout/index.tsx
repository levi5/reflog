import type { CSSProperties, ReactNode } from "react"
import classNames from "classnames"

import { ResizeGrip } from "../../Resizable/Grip"
import { useResizable } from "../../../hooks"

import styles from "./style.module.scss"

interface ResizableSplitLayoutProps {
  sidebar: ReactNode
  main: ReactNode
  className?: string
  sidebarPosition?: "left" | "right"
  sidebarWidth?: {
    initial: number
    min: number
    max: number
    storageKey: string
  }
  mainMinHeight?: number
}

const DEFAULT_SIDEBAR_WIDTH = {
  initial: 300,
  min: 220,
  max: 560,
  storageKey: "split.sidebar",
}

export function ResizableSplitLayout({
  sidebar,
  main,
  className,
  sidebarPosition = "left",
  sidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  mainMinHeight = 0,
}: ResizableSplitLayoutProps) {
  const { size, grip } = useResizable({
    axis: "x",
    ...sidebarWidth,
  })

  const isLeft = sidebarPosition === "left"

  const Element = (
    <aside
      className={classNames(styles.sidebar, "resizable-layout-sideBar")}
      style={{ "--side-w": `${size}px`, flexShrink: 0 } as CSSProperties}
    >
      {!isLeft && <ResizeGrip axis="x" grip={grip} />}
      {sidebar}
      {isLeft && <ResizeGrip axis="x" grip={grip} />}
    </aside>
  )

  return (
    <div
      className={classNames(styles.layout, className)}
      style={{ minHeight: mainMinHeight }}
      data-sidebar-position={sidebarPosition}
    >
      {isLeft && Element}
      <main className={styles.main}>{main}</main>
      {!isLeft && Element}
    </div>
  )
}
