import { formatMessage, t } from "../../../i18n"
import { useSettingsContext } from "../../context"
import styles from "./style.module.scss"

interface SelectionToolbarProps {
  count: number
  onStage: () => void
  onUnstage: () => void
  onDiscard: () => void
  onClear: () => void
}

export function SelectionToolbar({ count, onStage, onUnstage, onDiscard, onClear }: SelectionToolbarProps) {
  const { lang } = useSettingsContext()
  return count === 0 ? null : (
    <div className={styles.selBar} role="toolbar" aria-label={t(lang, "selectedFiles")}>
      <span className={styles.selCount}>{formatMessage(lang, "selectedFilesCount", { count })}</span>
      <div className={styles.selActions}>
        <button type="button" className="mini-btn" onClick={onStage}>
          {t(lang, "stageSelected")}
        </button>
        <button type="button" className="mini-btn" onClick={onUnstage}>
          {t(lang, "unstageSelected")}
        </button>
        <button type="button" className="mini-btn danger" onClick={onDiscard}>
          {t(lang, "discardSelected")}
        </button>
        <button type="button" className="mini-btn" onClick={onClear} aria-label={t(lang, "clearSelection")}>
          ✕
        </button>
      </div>
    </div>
  )
}
