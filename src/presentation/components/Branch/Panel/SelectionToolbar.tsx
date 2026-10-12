import { formatMessage, t } from "../../../../i18n"
import { useSettingsContext } from "../../../context"
import styles from "./style.module.scss"

interface BranchSelectionToolbarProps {
  count: number
  total: number
  onSelectAll: () => void
  onDelete: () => void
  onForceDelete: () => void
  onClear: () => void
  busy?: boolean
}

export function BranchSelectionToolbar({
  count,
  total,
  onSelectAll,
  onDelete,
  onForceDelete,
  onClear,
  busy = false,
}: BranchSelectionToolbarProps) {
  const { lang } = useSettingsContext()
  if (count === 0) return null
  return (
    <div className={styles.selBar} role="toolbar" aria-label={t(lang, "selectedBranches")}>
      <span className={styles.selCount}>{formatMessage(lang, "selectedBranchesCount", { count })}</span>
      <div className={styles.selActions}>
        <button type="button" className="mini-btn" disabled={busy} onClick={onSelectAll}>
          {t(lang, count === total ? "clearSelectionAll" : "selectAllBranches")}
        </button>
        <button type="button" className="mini-btn danger" disabled={busy} onClick={onDelete}>
          {t(lang, "deleteSelectedBranches")}
        </button>
        <button type="button" className="mini-btn danger" disabled={busy} onClick={onForceDelete}>
          {t(lang, "forceDeleteSelectedBranches")}
        </button>
        <button type="button" className="mini-btn" onClick={onClear} aria-label={t(lang, "clearSelection")}>
          ✕
        </button>
      </div>
    </div>
  )
}
