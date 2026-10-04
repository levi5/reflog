import { ArrowDown, ArrowDownUp, ArrowUp, MoreHorizontal, Tag, Trash2, Zap } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "../../../context"
import { Switch } from "../../Switch"
import styles from "./style.module.scss"

export interface SyncActionsProps {
  busy: boolean
  behindCount: number
  onFetch: (prune: boolean) => void
  onPull: () => void
  onPush: () => void
  onForcePush: () => void
  onPushTags: () => void
  onDeleteRemoteBranch: (remoteBranch: string) => void
}

const REMOTE_BRANCH_HINT = "origin/"

export function SyncActions({
  busy,
  behindCount,
  onFetch,
  onPull,
  onPush,
  onForcePush,
  onPushTags,
  onDeleteRemoteBranch,
}: SyncActionsProps) {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [prune, setPrune] = useState(true)
  const [remoteBranch, setRemoteBranch] = useState("")
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [menuOpen])

  const submitDelete = () => {
    const value = remoteBranch.trim()
    const full = value.includes("/") ? value : `${REMOTE_BRANCH_HINT}${value}`
    if (value) onDeleteRemoteBranch(full)
    setRemoteBranch("")
    setMenuOpen(false)
  }

  return (
    <>
      <button
        type="button"
        className="ghost"
        onClick={() => onFetch(prune)}
        disabled={busy}
        title={prune ? t("fetchPruneLabel") : t("fetchWithoutPrune")}
      >
        <ArrowDownUp size={14} /> {t("fetch")}
      </button>
      <button type="button" className="ghost" onClick={onPull} disabled={busy} title={t("pull")}>
        <ArrowDown size={14} /> {t("pull")}
        {behindCount > 0 ? ` ${behindCount}` : ""}
      </button>
      <button type="button" className="push" onClick={onPush} disabled={busy} title={t("push")}>
        <ArrowUp size={14} /> {t("push")}
      </button>

      <div ref={menuRef} className={styles.syncMenu}>
        <button
          ref={triggerRef}
          type="button"
          className="ghost"
          disabled={busy}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title={t("pushMoreActions")}
          aria-label={t("pushMoreActions")}
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreHorizontal size={14} />
        </button>
        {menuOpen && (
          <div className={styles.syncMenuPanel}>
            <Switch checked={prune} onChange={setPrune} label={t("fetchPruneLabel")} ariaLabel={t("fetchPruneLabel")} />
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onForcePush()
                setMenuOpen(false)
              }}
            >
              <Zap size={13} /> {t("pushForce")}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onPushTags()
                setMenuOpen(false)
              }}
            >
              <Tag size={13} /> {t("pushTags")}
            </button>
            <div className={styles.syncMenuDel}>
              <label className={styles.syncMenuLabel} htmlFor="delete-remote-branch">
                {t("deleteRemoteBranchAction")}
              </label>
              <div className={styles.syncMenuDelRow}>
                <input
                  id="delete-remote-branch"
                  value={remoteBranch}
                  placeholder="origin/feature"
                  onChange={(event) => setRemoteBranch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && remoteBranch.trim()) submitDelete()
                  }}
                />
                <button type="button" disabled={busy || remoteBranch.trim() === ""} onClick={submitDelete}>
                  <Trash2 size={13} /> {t("deleteRemoteBranchAction")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
