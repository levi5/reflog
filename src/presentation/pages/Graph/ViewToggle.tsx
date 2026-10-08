import { History, GitBranch, List } from "lucide-react"
import classnames from "classnames"
import { t } from "../../../i18n"
import type { Lang } from "../../../types"
import styles from "./style.module.scss"

export type GraphViewMode = "graph" | "log" | "reflog"

const VIEW_ITEMS: { mode: GraphViewMode; labelKey: "logView" | "graphView" | "reflog"; Icon: typeof List }[] = [
  { mode: "log", labelKey: "logView", Icon: List },
  { mode: "graph", labelKey: "graphView", Icon: GitBranch },
  { mode: "reflog", labelKey: "reflog", Icon: History },
]

interface ViewToggleProps {
  lang: Lang
  viewMode: GraphViewMode
  onChange: (mode: GraphViewMode) => void
}

export function ViewToggle({ lang, viewMode, onChange }: ViewToggleProps) {
  return (
    <div className={styles.viewToggle}>
      {VIEW_ITEMS.map(({ mode, labelKey, Icon }) => (
        <button
          key={mode}
          type="button"
          className={classnames(styles.toggleBtn, viewMode === mode && styles.active)}
          aria-pressed={viewMode === mode}
          onClick={() => onChange(mode)}
        >
          <Icon size={14} />
          <span>{t(lang, labelKey)}</span>
        </button>
      ))}
    </div>
  )
}
