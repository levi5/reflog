import { getCurrentWindow } from "@tauri-apps/api/window"
import { type ReactNode, useEffect, useState } from "react"
import classnames from "classnames"

import { Windows } from ".."

import { useWindowDrag } from "../../../hooks"

import styles from "./style.module.scss"

interface Props {
  children: ReactNode
}

const MAXIMIZED_STORAGE_KEY = "reflog.window.maximized"

function readStoredMaximized(): boolean {
  try {
    return window.localStorage.getItem(MAXIMIZED_STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

function writeStoredMaximized(value: boolean) {
  try {
    window.localStorage.setItem(MAXIMIZED_STORAGE_KEY, value ? "1" : "0")
  } catch {
    return
  }
}

export function WindowFrame({ children }: Props) {
  const drag = useWindowDrag()
  const [maximized, setMaximized] = useState(true)

  useEffect(() => {
    const cleanups: (() => void)[] = []
    try {
      const win = getCurrentWindow()
      if (readStoredMaximized()) {
        win.maximize().catch(() => undefined)
      }
      const syncMaximized = () => {
        win
          .isMaximized()
          .then((value) => {
            setMaximized(value)
            writeStoredMaximized(value)
          })
          .catch(() => undefined)
      }
      syncMaximized()
      win
        .onResized(syncMaximized)
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

  useEffect(() => {
    document.documentElement.classList.toggle("is-maximized", maximized)
  }, [maximized])

  const handleResizeMouseDown = () => {
    try {
      getCurrentWindow()
        .startResizeDragging("SouthEast")
        .catch(() => undefined)
    } catch {
      return
    }
  }

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
        {!maximized && <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} aria-hidden />}
      </div>
    </div>
  )
}
