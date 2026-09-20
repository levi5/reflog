import { getCurrentWindow } from "@tauri-apps/api/window"
import { type ReactNode, useEffect, useState } from "react"
import classnames from "classnames"

import { Windows } from ".."

import { useWindowDrag } from "../../../hooks"

import styles from "./style.module.scss"

interface Props {
  children: ReactNode
}

export function WindowFrame({ children }: Props) {
  const drag = useWindowDrag()
  const [maximized, setMaximized] = useState(true)

  useEffect(() => {
    const cleanups: (() => void)[] = []
    try {
      const win = getCurrentWindow()
      win
        .isMaximized()
        .then(setMaximized)
        .catch(() => undefined)
      win
        .onResized(() =>
          win
            .isMaximized()
            .then(setMaximized)
            .catch(() => undefined),
        )
        .then((unListen) => cleanups.push(unListen))
        .catch(() => undefined)
    } catch {
      return
    }
    return () => {
      cleanups.forEach((fn) => {
        fn()
      })
    }
  }, [])

  return (
    <div className={styles.backdrop}>
      <div className={classnames(styles.window, maximized && styles.maximized)}>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window drag region, mouse-only window management */}
        <div
          className={styles.titlebar}
          data-tauri-drag-region
          onMouseDown={drag.onMouseDown}
          onDoubleClick={drag.onDoubleClick}
        >
          <Windows.Controls />
        </div>
        {children}
      </div>
    </div>
  )
}
