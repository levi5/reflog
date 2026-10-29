import { invoke, isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { FloatingWorkspace } from "./Workspace"
import { useFloatingViewport } from "./useFloatingViewport"

type WorkspaceKind = "commit" | "merge" | "stash"

export function FloatingQuickWorkspace() {
  const { kind } = useParams()
  const [view, setView] = useState<WorkspaceKind>(kind === "merge" || kind === "stash" ? kind : "commit")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [error, setError] = useState("")
  useFloatingViewport(setError)

  useEffect(() => {
    if (!isTauri()) return
    const subscription = listen<WorkspaceKind>("floating-workspace-changed", ({ payload }) => setView(payload))
    return () => {
      void subscription.then((stop) => stop()).catch((e) => setError(String(e)))
    }
  }, [])

  return (
    <>
      <FloatingWorkspace
        key={view}
        view={view === "stash" ? "commit" : view}
        initialFilter={view === "stash" ? "stash" : "all"}
        onBack={() => void invoke("close_floating_workspace").catch((e) => setError(String(e)))}
        drafts={drafts}
        onDraft={(path, value) => setDrafts((previous) => ({ ...previous, [path]: value }))}
      />
      {error && <span role="alert">{error}</span>}
    </>
  )
}
