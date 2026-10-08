import { useEffect } from "react"
import { listen } from "@tauri-apps/api/event"
import { gitApi } from "../../../infrastructure/git"

interface CliOpenPathOptions {
  openPath: (path: string) => Promise<boolean>
  onOpened: () => void
}

export function useCliOpenPath({ openPath, onOpened }: CliOpenPathOptions) {
  useEffect(() => {
    let disposed = false
    let unlisten: (() => void) | undefined
    const handle = async (path: string) => {
      if (!path.trim()) return
      const opened = await openPath(path)
      if (opened && !disposed) onOpened()
    }

    void listen<string>("cli-open-path", ({ payload }) => void handle(payload))
      .then((stop) => {
        if (disposed) stop()
        else unlisten = stop
      })
      .catch(() => undefined)
    void gitApi
      .takeCliPath()
      .then((path) => {
        if (!disposed && path) void handle(path)
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [openPath, onOpened])
}
