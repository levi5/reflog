import classnames from "classnames"
import { FolderOpen, RefreshCw } from "lucide-react"
import { useTranslation } from "../../../context"
import type { SubmoduleInfo } from "../../../../types"
import { EmptyState } from "../../Empty/State"
import styles from "./style.module.scss"

interface SubmodulePanelProps {
  submodules: SubmoduleInfo[]
  onUpdate: (submodulePath?: string) => void
  onOpen?: (path: string) => void
  busy?: boolean
}

export function SubmodulePanel({ submodules, onUpdate, onOpen, busy = false }: SubmodulePanelProps) {
  const { t } = useTranslation()

  const stateClass = (state: string) => {
    switch (state.trim()) {
      case "":
        return styles.stateOk
      case "+":
        return styles.stateDiverged
      case "-":
        return styles.stateUninitialized
      case "U":
        return styles.stateConflict
      default:
        return styles.stateOk
    }
  }

  const stateLabel = (state: string) => {
    switch (state.trim()) {
      case "":
        return t("subOk")
      case "+":
        return t("subDiverged")
      case "-":
        return t("subUninitialized")
      case "U":
        return t("subConflict")
      default:
        return state
    }
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
            onClick={() => onUpdate()}
            title={t("submoduleUpdate")}
          >
            <RefreshCw size={11} /> {t("submoduleUpdate")}
          </button>
        )}
      </div>

      <div className={styles.submoduleList}>
        {submodules.map((sub) => (
          <div key={sub.path} className={styles.submoduleCard}>
            <div className={styles.cardHead}>
              <span className={styles.name}>{sub.name || sub.path}</span>
              <span className={classnames(styles.stateBadge, stateClass(sub.state))}>{stateLabel(sub.state)}</span>
            </div>
            <div className={styles.submodulePath}>{sub.path}</div>
            <div className={styles.cardActions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => onUpdate(sub.path)}
                disabled={busy}
                title={t("submoduleUpdate")}
              >
                <RefreshCw size={11} /> {t("submoduleUpdate")}
              </button>
              {onOpen && (
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => onOpen(sub.path)}
                  title={t("openSubmodule")}
                >
                  <FolderOpen size={11} /> {t("openSubmodule")}
                </button>
              )}
            </div>
          </div>
        ))}
        {submodules.length === 0 && <EmptyState small message={t("noSubmodules")} />}
      </div>
    </div>
  )
}
