import classnames from "classnames"
import { Check, FolderOpen, RefreshCw } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { useTranslation } from "../../../context"
import type { SubmoduleInfo } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"
import { hasOutdated, isKnownSubmoduleState, isOutdated, submoduleStateView, submodulesChanged } from "./state"

const ALL_SUBMODULES = "*"
const CONFIRMATION_MS = 1500

interface SubmodulePanelProps {
  submodules: SubmoduleInfo[]
  onUpdate: (submodulePath?: string) => void
  onOpen?: (path: string) => void
  busy?: boolean
}

export function SubmodulePanel({ submodules, onUpdate, onOpen, busy = false }: SubmodulePanelProps) {
  const { t } = useTranslation()
  const [updatedTarget, setUpdatedTarget] = useState<string | null>(null)
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

  return (
    <div className={styles.submoduleContainer}>
      <div className={styles.topBar}>
        <span className={styles.title}>{t("submodules")}</span>
        {submodules.length > 0 && (
          <button
            type="button"
            className={styles.updateAllBtn}
            disabled={busy}
            onClick={() => requestUpdate(ALL_SUBMODULES)}
            title={t("submoduleUpdate")}
            aria-label={t("submoduleUpdate")}
          >
            {updateIcon(ALL_SUBMODULES, outdatedAll)} {t("submoduleUpdate")}
          </button>
        )}
      </div>

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
                <button
                  type="button"
                  className={styles.actionBtn}
                  disabled={busy}
                  onClick={() => requestUpdate(sub.path, sub.path)}
                  title={t("submoduleUpdate")}
                  aria-label={`${t("submoduleUpdate")} ${sub.path}`}
                >
                  {updateIcon(sub.path, isOutdated(sub))} {t("submoduleUpdate")}
                </button>
                {onOpen && (
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() => onOpen(sub.path)}
                    title={t("openSubmodule")}
                    aria-label={`${t("openSubmodule")} ${sub.path}`}
                  >
                    <FolderOpen size={11} /> {t("openSubmodule")}
                  </button>
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
