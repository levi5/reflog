import { invoke, isTauri } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import {
  Archive,
  ArrowLeft,
  Ellipsis,
  EyeOff,
  GitCommitHorizontal,
  GitCompareArrows,
  GitMerge,
  Grip,
  History,
  PanelsTopLeft,
  Settings,
} from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "../../context"
import styles from "./style.module.scss"
import { FloatingWorkspace } from "./Workspace"
import { useFloatingDrag } from "./useFloatingDrag"
import { radialSector } from "./radial-geometry"
import { useFloatingViewport } from "./useFloatingViewport"

type FloatingMode = "collapsed" | "expanded" | "commit" | "merge" | "stash"

export function FloatingMenu() {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState("")
  useFloatingViewport(setError)
  const [view, setView] = useState<"commit" | "merge" | "stash" | null>(null)
  const [menu, setMenu] = useState<"main" | "more">("main")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const resizing = useRef(Promise.resolve())
  const desired = useRef<FloatingMode>("collapsed")
  const applied = useRef<FloatingMode>("collapsed")
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const center = useRef<HTMLButtonElement>(null)
  const drag = useFloatingDrag(setError, () => resizing.current)

  function cancelLeave() {
    clearTimeout(leaveTimer.current)
  }

  const resize = useCallback((next: FloatingMode) => {
    if (desired.current === next) return
    desired.current = next
    // Radial hover changes visibility/input only; only workspaces resize natively.
    resizing.current = resizing.current
      .then(async () => {
        const panel = next === "commit" || next === "merge" || next === "stash"
        if (isTauri())
          await invoke(
            "resize_floating",
            panel ? { expanded: true, panel: true, workspace: next } : { expanded: next === "expanded" },
          )
        applied.current = next
        setExpanded(next === "expanded")
        setView(panel ? next : null)
        if (next === "collapsed") setMenu("main")
      })
      .catch((e) => {
        if (desired.current === next) desired.current = applied.current
        setError(String(e))
      })
  }, [])

  const expand = useCallback(
    (next: boolean) => {
      if (desired.current === "commit" || desired.current === "merge" || desired.current === "stash") return
      resize(next ? "expanded" : "collapsed")
    },
    [resize],
  )

  useEffect(() => {
    const subscriptions = isTauri()
      ? [
          listen("floating-hidden", () => resize("collapsed")),
          listen("floating-pointer-outside", () => {
            if (!drag.dragging.current) expand(false)
          }),
          listen<string>("floating-pointer-error", ({ payload }) => setError(payload)),
        ]
      : []
    return () => {
      clearTimeout(leaveTimer.current)
      for (const unlisten of subscriptions) void unlisten.then((stop) => stop()).catch((e) => setError(String(e)))
    }
  }, [resize, expand, drag.dragging])

  async function act(action: string) {
    cancelLeave()
    if (action === "more") {
      center.current?.focus()
      setMenu("more")
      return
    }
    if (action === "commit" || action === "merge" || action === "stash") {
      resize(action)
      return
    }
    try {
      expand(false)
      await resizing.current
      await invoke("floating_action", { action })
    } catch (e) {
      setError(String(e))
    }
  }

  const actions =
    menu === "main"
      ? [
          { id: "merge", label: "Merge", Icon: GitMerge },
          { id: "commit", label: "Commit", Icon: GitCommitHorizontal },
          { id: "panel", label: t("floatingPanel"), Icon: PanelsTopLeft },
          { id: "more", label: t("floatingMore"), Icon: Ellipsis },
        ]
      : [
          { id: "stash", label: "Stash", Icon: Archive },
          { id: "graph", label: t("floatingHistory"), Icon: History },
          { id: "compare", label: t("floatingCompare"), Icon: GitCompareArrows },
          { id: "settings", label: t("settings"), Icon: Settings },
          { id: "hide", label: t("floatingHide"), Icon: EyeOff },
        ]

  if (view)
    return (
      <FloatingWorkspace
        view={view === "stash" ? "commit" : view}
        initialFilter={view === "stash" ? "stash" : "all"}
        onBack={() => resize("collapsed")}
        drafts={drafts}
        onDraft={(path, value) => setDrafts((previous) => ({ ...previous, [path]: value }))}
      />
    )

  return (
    <section
      aria-label={t("floatingMode")}
      className={styles.host}
      onMouseEnter={(event) => {
        cancelLeave()
        drag.onMouseEnter(event)
      }}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
      onMouseLeave={() => {
        cancelLeave()
        if (drag.dragging.current) return
        leaveTimer.current = setTimeout(() => expand(false), 150)
      }}
      onBlur={(event) => {
        if (!drag.dragging.current && !event.currentTarget.contains(event.relatedTarget)) expand(false)
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          if (menu === "more") setMenu("main")
          else if (expanded) expand(false)
          else void act("hide")
        }
      }}
    >
      <button
        ref={center}
        type="button"
        className={styles.center}
        aria-label={t(menu === "more" ? "floatingMenuBack" : "floatingMode")}
        aria-expanded={expanded}
        aria-controls="floating-actions"
        aria-describedby="floating-drag-hint"
        onMouseEnter={() => {
          if (!drag.dragging.current) expand(true)
        }}
        onFocus={() => {
          if (!drag.dragging.current) expand(true)
        }}
        onClick={() => {
          if (!drag.dragging.current) {
            if (menu === "more") setMenu("main")
            else expand(true)
          }
        }}
        onPointerDown={drag.onPointerDown}
        title={t(menu === "more" ? "floatingMenuBack" : "floatingDrag")}
      >
        {menu === "more" ? <ArrowLeft size={26} /> : <Grip size={26} />}
      </button>
      <nav
        id="floating-actions"
        className={`${styles.disc} ${expanded ? styles.expanded : ""}`}
        aria-label={t(menu === "more" ? "floatingMore" : "floatingMode")}
        inert={!expanded}
        data-items={actions.length}
      >
        {actions.map(({ id, label, Icon }, index) => {
          const sector = radialSector(index, actions.length)
          return (
            <button
              type="button"
              key={id}
              className={styles.slice}
              style={{ clipPath: `path("${sector.path}")` }}
              onClick={() => void act(id)}
              aria-label={label}
              title={id === "hide" ? `${label} (Ctrl+Shift+Space)` : label}
            >
              <span style={{ left: sector.label.x, top: sector.label.y }}>
                <Icon size={26} />
              </span>
            </button>
          )
        })}
      </nav>
      <span id="floating-drag-hint" className={styles.srOnly}>
        {t("floatingDrag")}
      </span>
      {error && (
        <span role="alert" className={styles.error} title={error}>
          {t("floatingError")}: {error}
        </span>
      )}
    </section>
  )
}
