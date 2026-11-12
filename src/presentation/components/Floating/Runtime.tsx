import { isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { useRepo } from "../../context"
import { useFloatingBridge } from "./useFloatingBridge"

// Always mounted in the retained main webview, even when its panel is hidden.
export function FloatingRuntime() {
  useFloatingBridge()
  const repo = useRepo()
  const current = useRef(repo.repo)
  current.current = repo.repo
  const navigate = useNavigate()
  useEffect(() => {
    if (!isTauri()) return
    const subscription = listen<string>("floating-action", ({ payload }) => {
      if (payload === "settings") void navigate("/settings")
      else if (payload === "graph" || payload === "compare") void navigate(current.current ? `/${payload}` : "/")
      else if (payload === "merge" || payload === "commit") {
        void navigate(current.current ? (payload === "merge" ? "/merge" : "/staging") : "/")
      }
    })
    return () => {
      void subscription.then((stop) => stop()).catch(console.error)
    }
  }, [navigate])
  return null
}
