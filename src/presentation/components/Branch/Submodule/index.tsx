import classnames from "classnames"
import { Check, FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "../../../context"
import type { SubmoduleInfo } from "../../../../types"
import { ActionButton } from "../../Button"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"
import { hasOutdated, isKnownSubmoduleState, isOutdated, submoduleStateView, submodulesChanged } from "./state"

const ALL_SUBMODULES = "*"
const CONFIRMATION_MS = 1500

interface SubmodulePanelProps {
  submodules: SubmoduleInfo[]
  onUpdate: (submodulePath?: string) => void
  onSync?: () => void
  onAdd?: (url: string, path: string) => void
  onRemove?: (path: string) => void
  onOpen?: (path: string) => void
  busy?: boolean
}

export function SubmodulePanel({
  submodules,
  onUpdate,
  onSync,
  onAdd,
  onRemove,
  onOpen,
  busy = false,
}: SubmodulePanelProps) {
  const { t } = useTranslation()
  const [updatedTarget, setUpdatedTarget] = useState<string | null>(null)
  const [addUrl, setAddUrl] = useState("")
  const [addPath, setAddPath] = useState("")
  const requestRef = useRef<{ modules: SubmoduleInfo[]; target: string } | null>(null)

  useEffect(() => {
    const request = requestRef.current
    requestRef.current = null
    if (!request || !submodulesChanged(request.modules, submodules)) return
    setUpdatedTarget(request.target)
    const timer = window.setTimeout(() => setUpdatedTarget(null), CONFIRMATION_MS)
    return () => window.clearTimeout(timer)
  }, [submodules])

  const requestUpdate = (target: string, submodulePath?: string) => {
    requestRef.current = { modules: submodules, target }
    setUpdatedTarget(null)
    onUpdate(submodulePath)
  }

  const outdatedAll = hasOutdated(submodules)

  const updateIcon = (target: string, outdated: boolean) => {
    if (updatedTarget === target) return <Check size={11} className={styles.updatedIcon} />
    return <RefreshCw size={11} className={outdated ? styles.targetOutdated : undefined} />
  }

  const submitAdd = () => {
    if (!addUrl.trim() || !addPath.trim()) return
    onAdd?.(addUrl.trim(), addPath.trim())
    setAddUrl("")
    setAddPath("")
  }

  return (
    <div className={styles.submoduleContainer}>
      <div className={styles.topBar}>
        <span className={styles.title}>{t("submodules")}</span>
        {onSync && (
          <ActionButton
            size="md"
            icon={<RefreshCw size={11} />}
            disabled={busy}
            onClick={onSync}
            title={t("submoduleSyncHint")}
            ariaLabel={t("submoduleSync")}
          >
            {t("submoduleSync")}
          </ActionButton>
        )}
        {submodules.length > 0 && (
          <ActionButton
            size="md"
            icon={updateIcon(ALL_SUBMODULES, outdatedAll)}
            disabled={busy}
            onClick={() => requestUpdate(ALL_SUBMODULES)}
            title={t("submoduleUpdate")}
            ariaLabel={t("submoduleUpdate")}
          >
            {t("submoduleUpdate")}
          </ActionButton>
        )}
      </div>
      {onAdd && (
        <div className={styles.addRow}>
          <input
            value={addUrl}
            onChange={(event) => setAddUrl(event.target.value)}
            placeholder={t("submoduleUrlPh")}
            aria-label={t("submoduleUrlPh")}
            onKeyDown={(event) => event.key === "Enter" && submitAdd()}
          />
          <input
            value={addPath}
            onChange={(event) => setAddPath(event.target.value)}
            placeholder={t("submodulePathPh")}
            aria-label={t("submodulePathPh")}
            onKeyDown={(event) => event.key === "Enter" && submitAdd()}
          />
          <ActionButton
            size="md"
            icon={<Plus size={11} />}
            disabled={busy || !addUrl.trim() || !addPath.trim()}
            onClick={submitAdd}
            title={t("submoduleAdd")}
          >
            {t("submoduleAdd")}
          </ActionButton>
        </div>
      )}

      <div className={styles.submoduleList}>
        {submodules.map((sub) => {
          const view = submoduleStateView(sub.state)
          const stateTip = isKnownSubmoduleState(sub.state) ? t(view.label) : sub.state.trim()
          return (
            <div key={sub.path} className={styles.submoduleCard}>
              <div className={styles.cardHead}>
                <span className={styles.name}>{sub.name || sub.path}</span>
                <span
                  className={classnames(styles.stateBadge, view.className)}
                  role="img"
                  aria-label={stateTip}
                  title={stateTip}
                >
                  <view.Icon size={12} aria-hidden="true" />
                </span>
              </div>
              <div className={styles.submodulePath}>{sub.path}</div>
              <div className={styles.cardActions}>
                <ActionButton
                  icon={updateIcon(sub.path, isOutdated(sub))}
                  disabled={busy}
                  onClick={() => requestUpdate(sub.path, sub.path)}
                  title={t("submoduleUpdate")}
                  ariaLabel={`${t("submoduleUpdate")} ${sub.path}`}
                >
                  {t("submoduleUpdate")}
                </ActionButton>
                {onOpen && (
                  <ActionButton
                    icon={<FolderOpen size={11} />}
                    onClick={() => onOpen(sub.path)}
                    title={t("openSubmodule")}
                    ariaLabel={`${t("openSubmodule")} ${sub.path}`}
                  >
                    {t("openSubmodule")}
                  </ActionButton>
                )}
                {onRemove && (
                  <ActionButton
                    icon={<Trash2 size={11} />}
                    disabled={busy}
                    onClick={() => onRemove(sub.path)}
                    title={t("submoduleRemove")}
                    ariaLabel={`${t("submoduleRemove")} ${sub.path}`}
                    tone="danger"
                  >
                    {t("submoduleRemove")}
                  </ActionButton>
                )}
              </div>
            </div>
          )
        })}
        {submodules.length === 0 && <EmptyState small message={t("noSubmodules")} />}
      </div>
    </div>
  )
}
